// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract CommitteeManager is AccessControl {
    /* ========= Errors ========= */

    error InvalidThreshold();
    error NotAuthorized();
    error RunAlreadyRegistered(uint256 codeId, address requester);
    error RunNotRegistered(uint256 codeId, address requester);
    error DuplicateShard(uint256 codeId, address requester, address committee);

    /* ========= 전역 변수 ========= */

    bytes32 public constant COMMITTEE_ROLE = keccak256("COMMITTEE_ROLE");

    ILicenseManager public immutable licenseManager;

    constructor(address licenseManager_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        licenseManager = ILicenseManager(licenseManager_);
    }

    /* ========= 상태 ========= */

    struct RunState {
        uint32 threshold;
        uint32 approvals;
        bool approved;
        bool exists;
    }

    mapping(bytes32 => RunState) private runStates;
    mapping(bytes32 => mapping(address => bool)) private hasSubmitted;
    uint256 public committeeThreshold = 2;

    /* ========= 이벤트 ========= */

    event RunRegistered(
        uint256 indexed codeId,
        address indexed requester,
        uint256 threshold
    );

    event RunCleared(uint256 indexed codeId, address indexed requester);

    event ShardSubmitted(
        uint256 indexed codeId,
        address indexed requester,
        address indexed committee,
        string shardCid,
        uint256 approvals,
        uint256 threshold
    );

    event ExecutionApproved(
        uint256 indexed codeId,
        address indexed requester,
        uint256 threshold,
        uint256 approvals
    );

    /* ========= 관리자 기능 ========= */

    // 위원회 임계치 설정. 관리자만 가능
    function setCommitteeThreshold(
        uint256 newThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newThreshold > 0, "threshold=0");
        require(newThreshold <= type(uint32).max, "threshold too large");
        committeeThreshold = newThreshold;
    }

    // 위원회 멤버 추가. 관리자만 가능
    function addCommittee(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(COMMITTEE_ROLE, who);
    }

    // 위원회 멤버 제거. 관리자만 가능
    function removeCommittee(
        address who
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(COMMITTEE_ROLE, who);
    }

    modifier onlyAdminOrLicenseManager() {
        if (
            msg.sender != address(licenseManager) &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
        ) {
            revert NotAuthorized();
        }
        _;
    }

    function registerRun(
        uint256 codeId,
        address requester,
        uint256 threshold
    ) external onlyAdminOrLicenseManager {
        require(licenseManager.checkCodeExists(codeId), "code !exist");
        require(licenseManager.checkCodeActive(codeId), "code paused");

        bytes32 runKey = _runKey(codeId, requester);
        if (runStates[runKey].exists) {
            revert RunAlreadyRegistered(codeId, requester);
        }

        _createRun(runKey, codeId, requester, threshold);
    }

    function clearRun(
        uint256 codeId,
        address requester
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 runKey = _runKey(codeId, requester);
        RunState storage state = runStates[runKey];
        if (!state.exists) {
            revert RunNotRegistered(codeId, requester);
        }
        delete runStates[runKey];
        emit RunCleared(codeId, requester);
    }

    function getRunState(
        uint256 codeId,
        address requester
    )
        external
        view
        returns (
            uint256 threshold,
            uint256 approvals,
            bool approved,
            bool exists
        )
    {
        RunState storage state = runStates[_runKey(codeId, requester)];
        return (state.threshold, state.approvals, state.approved, state.exists);
    }

    function hasCommitteeSubmitted(
        uint256 codeId,
        address requester,
        address committee
    ) external view returns (bool) {
        return hasSubmitted[_runKey(codeId, requester)][committee];
    }

    // 위원회가 shard CID(IPFS)를 제출. 온체인에는 카운트만 저장, CID는 이벤트로 공개
    function submitShard(
        uint256 codeId,
        address requester,
        string calldata shardCid
    ) external onlyRole(COMMITTEE_ROLE) {
        require(licenseManager.checkCodeExists(codeId), "code !exist");
        require(licenseManager.checkCodeActive(codeId), "code paused");

        (bytes32 runKey, RunState storage state) = _ensureRun(
            codeId,
            requester
        );

        if (hasSubmitted[runKey][msg.sender]) {
            revert DuplicateShard(codeId, requester, msg.sender);
        }
        hasSubmitted[runKey][msg.sender] = true;

        uint256 newCount = ++state.approvals;

        emit ShardSubmitted(
            codeId,
            requester,
            msg.sender,
            shardCid,
            newCount,
            state.threshold
        );

        if (!state.approved && newCount >= state.threshold) {
            state.approved = true;
            emit ExecutionApproved(
                codeId,
                requester,
                state.threshold,
                newCount
            );
        }
    }

    function _ensureRun(
        uint256 codeId,
        address requester
    ) private returns (bytes32 runKey, RunState storage state) {
        runKey = _runKey(codeId, requester);
        state = runStates[runKey];
        if (!state.exists) {
            state = _createRun(runKey, codeId, requester, committeeThreshold);
        }
        return (runKey, state);
    }

    function _createRun(
        bytes32 runKey,
        uint256 codeId,
        address requester,
        uint256 threshold
    ) private returns (RunState storage state) {
        if (threshold == 0 || threshold > type(uint32).max) {
            revert InvalidThreshold();
        }
        state = runStates[runKey];
        if (state.exists) {
            revert RunAlreadyRegistered(codeId, requester);
        }
        state.threshold = uint32(threshold);
        state.approvals = 0;
        state.approved = false;
        state.exists = true;

        emit RunRegistered(codeId, requester, threshold);
        return state;
    }

    function _runKey(
        uint256 codeId,
        address requester
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(codeId, requester));
    }
}
