// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract CommitteeManager is AccessControl {
    /* ========= Errors ========= */

    error InvalidThreshold();
    error NotAuthorized();
    error RunAlreadyRegistered(uint256 codeId, bytes32 runNonce);
    error RunNotRegistered(uint256 codeId, bytes32 runNonce);
    error DuplicateShard(uint256 codeId, bytes32 runNonce, address committee);

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
        bytes32 indexed runNonce,
        uint256 threshold
    );

    event RunCleared(uint256 indexed codeId, bytes32 indexed runNonce);

    event ShardSubmitted(
        uint256 indexed codeId,
        bytes32 indexed runNonce,
        address indexed committee,
        string shardCid,
        uint256 approvals,
        uint256 threshold
    );

    event ExecutionApproved(
        uint256 indexed codeId,
        bytes32 indexed runNonce,
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
        bytes32 runNonce,
        uint256 threshold
    ) external onlyAdminOrLicenseManager {
        require(licenseManager.checkCodeExists(codeId), "code !exist");
        require(licenseManager.checkCodeActive(codeId), "code paused");

        bytes32 runKey = _runKey(codeId, runNonce);
        if (runStates[runKey].exists) {
            revert RunAlreadyRegistered(codeId, runNonce);
        }

        _createRun(runKey, codeId, runNonce, threshold);
    }

    function clearRun(
        uint256 codeId,
        bytes32 runNonce
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 runKey = _runKey(codeId, runNonce);
        RunState storage state = runStates[runKey];
        if (!state.exists) {
            revert RunNotRegistered(codeId, runNonce);
        }
        delete runStates[runKey];
        emit RunCleared(codeId, runNonce);
    }

    function getRunState(
        uint256 codeId,
        bytes32 runNonce
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
        RunState storage state = runStates[_runKey(codeId, runNonce)];
        return (state.threshold, state.approvals, state.approved, state.exists);
    }

    function hasCommitteeSubmitted(
        uint256 codeId,
        bytes32 runNonce,
        address committee
    ) external view returns (bool) {
        return hasSubmitted[_runKey(codeId, runNonce)][committee];
    }

    // 위원회가 shard CID(IPFS)를 제출. 온체인에는 카운트만 저장, CID는 이벤트로 공개
    function submitShard(
        uint256 codeId,
        bytes32 runNonce,
        string calldata shardCid
    ) external onlyRole(COMMITTEE_ROLE) {
        require(licenseManager.checkCodeExists(codeId), "code !exist");
        require(licenseManager.checkCodeActive(codeId), "code paused");

        (bytes32 runKey, RunState storage state) = _ensureRun(codeId, runNonce);

        if (hasSubmitted[runKey][msg.sender]) {
            revert DuplicateShard(codeId, runNonce, msg.sender);
        }
        hasSubmitted[runKey][msg.sender] = true;

        uint256 newCount = ++state.approvals;

        emit ShardSubmitted(
            codeId,
            runNonce,
            msg.sender,
            shardCid,
            newCount,
            state.threshold
        );

        if (!state.approved && newCount >= state.threshold) {
            state.approved = true;
            emit ExecutionApproved(codeId, runNonce, state.threshold, newCount);
        }
    }

    function _ensureRun(
        uint256 codeId,
        bytes32 runNonce
    ) private returns (bytes32 runKey, RunState storage state) {
        runKey = _runKey(codeId, runNonce);
        state = runStates[runKey];
        if (!state.exists) {
            state = _createRun(runKey, codeId, runNonce, committeeThreshold);
        }
        return (runKey, state);
    }

    function _createRun(
        bytes32 runKey,
        uint256 codeId,
        bytes32 runNonce,
        uint256 threshold
    ) private returns (RunState storage state) {
        if (threshold == 0 || threshold > type(uint32).max) {
            revert InvalidThreshold();
        }
        state = runStates[runKey];
        if (state.exists) {
            revert RunAlreadyRegistered(codeId, runNonce);
        }
        state.threshold = uint32(threshold);
        state.approvals = 0;
        state.approved = false;
        state.exists = true;

        emit RunRegistered(codeId, runNonce, threshold);
        return state;
    }

    function _runKey(
        uint256 codeId,
        bytes32 runNonce
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(codeId, runNonce));
    }
}
