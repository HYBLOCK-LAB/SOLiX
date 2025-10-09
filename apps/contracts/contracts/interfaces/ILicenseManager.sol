// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ILicenseManager is IERC165 {
    /* ========= 상태 조회 ========= */

    // code를 조회하는 함수
    function code(
        uint256 codeId
    ) external view returns (bytes32, string memory, bool, bool);

    // 코드 소유자 조회
    function codeOwner(uint256 codeId) external view returns (address);

    // 계정별 라이선스 만료시간 조회
    function licenseExpiry(
        address account,
        uint256 codeId
    ) external view returns (uint256);

    // 다음에 등록할 코드 ID 조회
    function nextCodeId() external view returns (uint256);

    /* ========= 이벤트 ========= */

    // 코드 등록
    event CodeRegistered(
        uint256 indexed codeId,
        bytes32 codeHash,
        string cipherCid,
        address indexed publisher
    );

    // 코드 메타데이터 갱신
    event CodeUpdated(
        uint256 indexed codeId,
        bytes32 codeHash,
        string cipherCid,
        address indexed publisher
    );

    // 라이선스 발급
    event LicenseIssued(
        uint256 indexed codeId,
        address indexed to,
        uint256 runs,
        uint256 expiry
    );

    // 라이선스 취소
    event LicenseRevoked(
        uint256 indexed codeId,
        address indexed account,
        uint256 burned
    );

    // 코드 일시정지
    event CodePaused(uint256 indexed codeId);

    // 코드 일시정지 해제
    event CodeUnpaused(uint256 indexed codeId);

    // 코드 실행 요청
    event RunRequested(
        uint256 indexed codeId,
        address indexed user,
        bytes recipientPubKey,
        uint256 blockTimestamp
    );

    // ERC165 통합 오버라이드
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    /* ========= 함수 정의 ========= */
    // 코드 등록
    function registerCode(
        bytes32 codeHash,
        string calldata cipherCid
    ) external returns (uint256 codeId);

    // 코드 메타데이터 갱신
    function updateCodeMetadata(
        uint256 codeId,
        bytes32 newCodeHash,
        string calldata newCipherCid
    ) external;

    // 코드 실행 일시정지
    function pauseCodeExecution(uint256 codeId) external;

    // 코드 실행 일시정지 해제
    function unpauseCodeExecution(uint256 codeId) external;

    // 라이센스 발급
    function issueLicense(
        uint256 codeId,
        address to,
        uint256 runs,
        uint256 expiryTimestamp
    ) external;

    // 라이센스 취소
    function revokeUserLicense(address account, uint256 codeId) external;

    // 코드 실행 요청
    function requestCodeExecution(
        uint256 codeId,
        bytes calldata recipientPubKey
    ) external;

    // 소유자 혹은 사용자 대신 실행
    // function requestOnBehalf(
    //     uint256 codeId,
    //     address user,
    //     bytes calldata recipientPubKey,
    //     uint256 runNonce,
    //     bytes calldata sig
    // ) external;

    /* ========= View Helper ========= */

    function checkCodeActive(uint256 codeId) external view returns (bool);

    function checkCodeExists(uint256 codeId) external view returns (bool);

    function uri(uint256 id) external view returns (string memory);
}
