// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

// import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// using ECDSA for bytes32;
// using MessageHashUtils for bytes32;

contract LicenseManager is ERC1155, AccessControl, ILicenseManager {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    /* ========= 구조/상태 ========= */

    struct CodeInfo {
        bytes32 codeHash; // code를 keccak256로 암호화한 값
        string cipherCid; // 암호화 파일의 IPFS CID
        string name; // 코드 표시용 이름
        string version; // 코드 버전 정보
        bool paused; // 실행 일시정지 여부
        bool exists; // 존재 플래그
        address owner; // 소유자 주소
    }

    // codeId => CodeInfo
    mapping(uint256 => CodeInfo) private _codes;

    // account => codeId => expiry
    // 계정별 만료시간: expiry[user][codeId] = timestamp
    mapping(address => mapping(uint256 => uint256)) private _expiry;

    uint256 private _nextCodeId = 1;

    /* ========= 생성자/기본 설정 ========= */
    constructor(string memory baseUri) ERC1155(baseUri) {
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /* ========= 상태 조회 ========= */

    // code 조회
    function code(
        uint256 codeId
    )
        external
        view
        override
        returns (
            bytes32,
            string memory,
            string memory,
            string memory,
            bool,
            bool
        )
    {
        CodeInfo storage c = _codes[codeId];
        return (c.codeHash, c.cipherCid, c.name, c.version, c.paused, c.exists);
    }

    // 코드 소유자 조회
    function codeOwner(
        uint256 codeId
    ) external view override returns (address) {
        return _codes[codeId].owner;
    }

    // 계정별 라이선스 만료시간 조회
    function licenseExpiry(
        address account,
        uint256 codeId
    ) external view override returns (uint256) {
        return _expiry[account][codeId];
    }

    // 다음에 등록할 코드 ID 조회
    function nextCodeId() external view override returns (uint256) {
        return _nextCodeId;
    }

    // ERC165 통합 오버라이드: ERC1155, AccessControl, ILicenseManager에 대한 선언을 모두 해결
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC1155, AccessControl, ILicenseManager)
        returns (bool)
    {
        return
            interfaceId == type(ILicenseManager).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /* ========= 함수 정의 ========= */

    // 코드 등록
    function registerCode(
        bytes32 codeHash,
        string calldata cipherCid
    ) external override returns (uint256 codeId) {
        require(codeHash != bytes32(0), "Invalid codeHash");

        codeId = _nextCodeId++;
        _codes[codeId] = CodeInfo({
            codeHash: codeHash,
            cipherCid: cipherCid,
            name: "",
            version: "1.0.0",
            paused: false,
            exists: true,
            owner: msg.sender
        });

        emit CodeRegistered(
            codeId,
            codeHash,
            cipherCid,
            "",
            "1.0.0",
            msg.sender
        );
    }

    // 코드 메타데이터 갱신. 소유자만 갱신 가능
    function updateCodeMetadata(
        uint256 codeId,
        string calldata newName
    ) external override {
        _requireCodeExists(codeId);
        _requireCodeOwner(codeId);

        CodeInfo storage c = _codes[codeId];
        c.name = newName;

        emit CodeNameUpdated(codeId, newName, msg.sender);
    }

    // 코드 버전 및 소스 갱신. 소유자만 갱신 가능
    function updateCode(
        uint256 codeId,
        bytes32 newCodeHash,
        string calldata newCipherCid,
        string calldata newVersion
    ) external override {
        _requireCodeExists(codeId);
        _requireCodeOwner(codeId);

        CodeInfo storage c = _codes[codeId];
        c.codeHash = newCodeHash;
        c.cipherCid = newCipherCid;
        c.version = newVersion;

        emit CodeUpdated(
            codeId,
            newCodeHash,
            newCipherCid,
            newVersion,
            msg.sender
        );
        // ERC1155
        emit URI(newCipherCid, codeId);
    }

    // 코드 일시정지. 소유자 또는 관리자만 가능
    function pauseCodeExecution(uint256 codeId) external override {
        _requireCodeExists(codeId);
        _requireCodeOwnerOrAdmin(codeId);
        require(!_codes[codeId].paused, "Code already paused");

        _codes[codeId].paused = true;
        emit CodePaused(codeId);
    }

    // 코드 일시정지 해제. 소유자 또는 관리자만 가능
    function unpauseCodeExecution(uint256 codeId) external override {
        _requireCodeExists(codeId);
        _requireCodeOwnerOrAdmin(codeId);
        require(_codes[codeId].paused, "Code not paused");

        _codes[codeId].paused = false;
        emit CodeUnpaused(codeId);
    }

    // 특정 사용자에게 라이선스 발급. 소유자만 가능
    function issueLicense(
        uint256 codeId,
        address to,
        uint256 runs,
        uint256 expiryTimestamp
    ) external override {
        _requireCodeExists(codeId);
        _requireCodeOwner(codeId);
        require(!_codes[codeId].paused, "Code is paused");
        require(to != address(0), "Invalid recipient");
        require(runs > 0, "Runs must be greater than 0");
        require(
            expiryTimestamp == 0 || expiryTimestamp > block.timestamp,
            "Invalid expiry"
        );

        // 만료 갱신: 더 긴 쪽으로 확장(기존 만료가 더 길면 유지)
        uint256 prevTimestamp = _expiry[to][codeId];
        if (expiryTimestamp > prevTimestamp) {
            _expiry[to][codeId] = expiryTimestamp;
        }

        _mint(to, codeId, runs, "");
        emit LicenseIssued(codeId, to, runs, _expiry[to][codeId]);
    }

    // 특정 사용자의 라이선스 전량 취소(소각). 소유자만 가능
    function revokeUserLicense(
        address account,
        uint256 codeId
    ) external override {
        _requireCodeExists(codeId);
        _requireCodeOwner(codeId);
        uint256 bal = balanceOf(account, codeId);
        require(
            bal > 0 || _expiry[account][codeId] > 0,
            "No license to revoke"
        );

        if (bal > 0) {
            _burn(account, codeId, bal);
        }
        _expiry[account][codeId] = 0;

        emit LicenseRevoked(codeId, account, bal);
    }

    // 실행 요청. 1회 소진 + 이벤트 발생
    function requestCodeExecution(
        uint256 codeId,
        bytes calldata recipientPubKey
    ) external override {
        _requireCodeExists(codeId);
        require(!_codes[codeId].paused, "Code is paused");
        require(balanceOf(msg.sender, codeId) > 0, "Insufficient runs");
        uint256 expiry = _expiry[msg.sender][codeId];
        require(expiry == 0 || block.timestamp <= expiry, "License expired");

        // 1회 소진
        _burn(msg.sender, codeId, 1);

        emit RunRequested(codeId, msg.sender, recipientPubKey, block.timestamp);
    }

    // 소유자 혹은 사용자 대신 실행
    // function requestOnBehalf(
    //     uint256 codeId,
    //     address user,
    //     bytes calldata recipientPubKey,
    //     uint256 runNonce,
    //     bytes calldata sig
    // ) external {
    //     _requireCodeExists(codeId);

    //     // 서명 검증
    //     bytes32 h = keccak256(
    //         abi.encodePacked(
    //             "EXEC",
    //             address(this),
    //             codeId,
    //             user,
    //             recipientPubKey,
    //             runNonce
    //         )
    //     );
    //     address signer = h.toEthSignedMessageHash().recover(sig);
    //     require(signer == _codes[codeId].owner || signer == user, "bad sig");

    //     require(!_codes[codeId].paused, "paused");
    //     require(balanceOf(user, codeId) > 0, "no runs");

    //     uint256 expiry = _expiry[user][codeId];
    //     require(expiry == 0 || block.timestamp <= expiry, "expired");

    //     // 사용자의 실행권 소진(대리 실행)
    //     _burn(user, codeId, 1);
    //     emit RunRequested(codeId, user, recipientPubKey, block.timestamp);
    // }

    /* ========= 뷰 헬퍼 ========= */

    // 코드가 존재하고 정지 상태가 아닌지 여부
    function checkCodeActive(
        uint256 codeId
    ) external view override returns (bool) {
        return _codes[codeId].exists && !_codes[codeId].paused;
    }

    // 코드 존재 여부 확인
    function checkCodeExists(
        uint256 codeId
    ) external view override returns (bool) {
        return _codes[codeId].exists;
    }

    // ERC1155의 메타데이터 URI를 code별로 반환
    function uri(
        uint256 id
    ) public view override(ERC1155, ILicenseManager) returns (string memory) {
        CodeInfo storage c = _codes[id];
        if (bytes(c.cipherCid).length > 0) {
            return c.cipherCid;
        }
        // fallback: ERC1155 기본 동작
        return super.uri(id);
    }

    /* ========= 내부 유틸 ========= */
    function _requireCodeExists(uint256 codeId) internal view {
        require(_codes[codeId].exists, "Code not found");
    }

    function _requireCodeOwner(uint256 codeId) internal view {
        require(
            _codes[codeId].owner == msg.sender,
            "Caller is not the code owner"
        );
    }

    function _requireCodeOwnerOrAdmin(uint256 codeId) internal view {
        if (hasRole(ADMIN_ROLE, msg.sender)) return;
        require(
            _codes[codeId].owner == msg.sender,
            "Caller is neither code owner nor admin"
        );
    }
}
