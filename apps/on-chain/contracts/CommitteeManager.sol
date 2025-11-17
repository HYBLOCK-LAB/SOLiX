// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract CommitteeManager is AccessControl {
    /* ========= Errors ========= */

    error DuplicateShard(uint256 codeId, address requester, address committee);

    /* ========= 전역 변수 ========= */
    bytes32 public constant COMMITTEE_ROLE = keccak256("COMMITTEE_ROLE");

    /* ========= 상태 ========= */

    mapping(bytes32 => uint256) public shardCountForRun;
    mapping(bytes32 => mapping(address => bool)) private hasSubmitted;
    mapping(bytes32 => uint256) private runStateVersion;
    uint256 public committeeThreshold = 3;

    //  라이선스 컨트랙트 읽기용
    ILicenseManager public immutable licenseManager;

    constructor(address licenseManager_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        licenseManager = ILicenseManager(licenseManager_);
    }

    /* ========= 이벤트 ========= */

    // 위원회 멤버가 shard CID(IPFS)를 제출했음을 알리는 이벤트
    event ShardSubmitted(
        uint256 indexed codeId,
        address indexed requester,
        bytes32 indexed runNonce,
        address committee,
        string shardCid,
        uint256 countAfter,
        uint256 threshold
    );

    // 모든 위원회의 승인이 완료되었음을 알리는 이벤트
    event ExecutionApproved(
        uint256 indexed codeId,
        address indexed requester,
        bytes32 indexed runNonce,
        uint256 threshold,
        uint256 count
    );

    event RunStateReset(
        uint256 indexed codeId,
        address indexed requester,
        bytes32 indexed runNonce,
        uint256 newVersion
    );

    /* ========= 관리자 기능 ========= */

    // 위원회 임계치 설정. 관리자만 가능
    function setCommitteeThreshold(
        uint256 newThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newThreshold > 0, "threshold must be more then 0");
        require(newThreshold <= type(uint32).max, "threshold too large");
        committeeThreshold = newThreshold;
    }

    // 위원회 멤버 추가. 관리자만 가능
    function addCommittee(
        address newCommittee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(COMMITTEE_ROLE, newCommittee);
    }

    // 위원회 멤버 제거. 관리자만 가능
    function removeCommittee(
        address removalCommittee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(COMMITTEE_ROLE, removalCommittee);
    }

    // 위원회가 shard CID(IPFS)를 제출. 온체인에는 카운트만 저장, CID는 이벤트로 공개
    function submitShard(
        uint256 codeId,
        address requester,
        bytes32 runNonce,
        string calldata shardCid
    ) external onlyRole(COMMITTEE_ROLE) {
        require(licenseManager.checkCodeExists(codeId), "code is not exist");
        require(licenseManager.checkCodeActive(codeId), "code is not active");
        require(
            licenseManager.hasRunRequest(codeId, requester, runNonce),
            "run not requested"
        );

        bytes32 baseKey = _baseRunKey(codeId, requester, runNonce);
        bytes32 runKey = _versionedRunKey(baseKey);
        if (hasSubmitted[runKey][msg.sender]) {
            revert DuplicateShard(codeId, requester, msg.sender);
        }
        hasSubmitted[runKey][msg.sender] = true;
        uint256 newCount = ++shardCountForRun[runKey];

        emit ShardSubmitted(
            codeId,
            requester,
            runNonce,
            msg.sender,
            shardCid,
            newCount,
            committeeThreshold
        );

        if (newCount >= committeeThreshold) {
            emit ExecutionApproved(
                codeId,
                requester,
                runNonce,
                committeeThreshold,
                newCount
            );
        }
    }

    function resetRunState(
        uint256 codeId,
        address requester,
        bytes32 runNonce
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 baseKey = _baseRunKey(codeId, requester, runNonce);
        uint256 newVersion = ++runStateVersion[baseKey];
        bytes32 newKey = _versionedRunKey(baseKey);
        shardCountForRun[newKey] = 0;
        emit RunStateReset(codeId, requester, runNonce, newVersion);
    }

    function _baseRunKey(
        uint256 codeId,
        address requester,
        bytes32 runNonce
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(codeId, requester, runNonce));
    }

    function _versionedRunKey(
        bytes32 baseKey
    ) private view returns (bytes32) {
        uint256 version = runStateVersion[baseKey];
        return keccak256(abi.encodePacked(baseKey, version));
    }
}
