id: html
summary: 프로젝트 요구사항에 알맞게 Smart Contract를 개발한다.
categories: Solidity
status: Published
feedback email: sinphi03@gmail.com
tags: Solidity, Blockchain, Smart Contracts
authors: Jiseop Shin
duration: 110

# Week 2: Smart Contract 개발

## 세션 소개

Duration: 5

이번 세션은 Solidity를 사용하여 Smart Contract 개발에 대해 이해하는 것이 목적입니다. 여러분은 단순히 문법을 배우는 것을 넘어, 이더리움 생태계의 핵심 원리를 이해하고, 스마트 컨트랙트를 작성하여 블록체인 상에 배포하는 개발 과정을 경험하게 됩니다.

### 목차

#### 1. 요구사항 정리

프로젝트의 요구사항을 정리하여 개발 계획을 세웁니다. 앞으로 어떤 기능을 구현해야하는지 알아봅시다.

#### 2. 코드 뼈대 작성

코드 폴더 구조를 살펴보아 전체적인 프로젝트의 틀을 마련합니다. 스마트 컨트랙트의 들어가 함수 목록과 함수의 반환값, 파라미터를 설정하여 코드의 전체적인 뼈대를 작성합니다.

#### 3. 스마트 컨트랙트 작성

코드 배포, 토큰 매매, 다운로드 요청 등 스마트 컨트랙트에 들어가야 할 기능을 구현합니다.

#### 4. 배포 및 테스트

작성한 스마트 컨트랙트를 Sepolia Testnet에 배포해보고 정상적으로 동작하는지 확인합니다.

#### 5. IPFS 사용법 익히기

IPFS에 대해 알아보고 사용법을 익힙니다.

## 요구사항 정리

Duration: 15

### User flow

User flow는 다음과 같습니다. 특히, 이번 세션에는 License 관련 Contract를 구현합니다.

![architecture](./images/architecture.png)

1. **코드 등록:**

   - 배포자가 자신의 코드를 준비합니다.
   - 코드를 난독화하고 AES-GCM으로 암호화합니다.
   - 또한 코드를 keccak256로 암호화합니다. 온체인 데이터의 무결성 검증을 위해 사용되고, 이를 codeHash라고 부르겠습니다.
   - AES-GCM로 암호화한 것은 IPFS에 업로드하여 위치를 나타내는 cipherCid를 얻습니다.
   - AES 비밀키 키를 분할하여 n개 생성한 후, 각 조각을 서로 다른 위원회 멤버에게 분배합니다.
   - codeHash, cipherCid 등의 정보를 포함해 온체인에 코드 배포에 대한 기록을 합니다.

2. **라이선스 발급:**

   - 배포자가 실행권 토큰(ERC-1155)을 발급하고 사용자에게 판매합니다. 이번 세션에서는 바로 사용자에게 발급하는 기능을 구현하겠습니다.

3. **실행 요청:**

   - 사용자가 트랜잭션을 통해 위원회에 실행 요청을 보냅니다.
   - 이때 임시 공개키(recipientPubKey)를 새로 생성해 같이 보냅니다.
   - 컨트랙트를 통해 실행 횟수가 1 소진 됩니다.
   - 컨트랙트에서 누가, 언제, 어떤 키로 실행했는지 기록했는지에 대한 이벤트를 발생시켜 위원회에 알립니다.

4. **위원회 승인:**

   - 승인을 위해 위원회 자신이 보관하고 있는 암호화 키 조각을 사용자의 recipientPubKey로 암호화합니다.
   - 이를 IPFS로 올려 사용자가 접근할 수 있도록 합니다.
   - 위원회 N명 중 M명이 라이센스에 대해 승인합니다.

5. **복원 및 실행:**

   - 사용자는 IPFS에서 키 조각을 가져와, 자신의 임시 개인키로 복호화합니다.
   - M개 이상의 키 조각을 합쳐서 원본 데이터 키(DEK)를 복원합니다.
   - 해시값을 비교하여 무결성을 확보합니다. (keccak256(code.zip) == codeHash)
   - 복호화하여 code를 획득해 실행합니다.

6. **취소:**
   - 특정 사용자의 라이센스를 취소하고 싶으면 컨트랙트로 실행권 토큰을 무효화합니다.
   - 전체 라이센스를 취소하기 위해 컨트랙트로 라이선스 자체를 완전히 폐기합니다.

### 요구사항

아래의 요구사항은 저번 세션에 살펴보았던 요구사항들입니다.

#### 기능 요구사항

- User는 배포자, 위원회, 사용자로 구분됩니다.
  - 배포자: 코드를 배포한 사람
  - 위원회: 라이센스를 검증하는 사람
  - 사용자: 코드를 사용하는 사람
- 배포자는 codeHash, cipherCid의 정보를 포함하여 코드를 등록할 수 있습니다.
- 배포자는 만료일과 실행 횟수를 지정하여 라이선스 토큰을 발급합니다.
- 사용자는 코드를 실행할 때마다 권한을 소진합니다. (잔여 횟수가 줄어듭니다)
- 위원회는 실행 건마다 암호화된 조각을 제출합니다.
- 배포자는 본인의 라이선스나 모든 코드 실행 요청을 중단, 허용할 수 있어야 합니다.
- 모든 동작은 이벤트로 기록되어 누구나 확인할 수 있습니다.
- 사용자는 오프체인 서명을 이용해 가스 없이 실행을 위임할 수 있습니다.(낮은 우선 순위)
- 위원회는 멤버를 관리하고 임계치(threshold)를 설정합니다.(낮은 우선 순위)

#### 비기능 요구사항

- Hardhat, Remix, Metamask 등을 활용해 개발 환경을 구성합니다.
- 보안성: 키를 여러 위원에게 분산하여 보안을 강화합니다.
- 실행 전에는 로컬에서 코드 해시를 검증하여 무결성을 확인합니다.
- 저장 공간과 가스를 절약하기 위해 필요한 정보만 온체인에 기록합니다.
- 표준 토큰(ERC-1155/721) 규격을 사용하여 호환성을 확보합니다.
- 온체인에는 평문 코드를 저장하지 않고, 암호화된 파일만 IPFS에 저장합니다.
- 실행은 오프체인 환경(안전한 장소)에서 이루어지며, 실행 후 민감한 데이터는 즉시 삭제합니다. (낮은 우선 순위)
- 위원회 응답이 부족해도 서비스가 중단되지 않도록 여유 있게 구성합니다. (낮은 우선 순위)

## 코드 뼈대 작성

Duration: 20

본격적으로 코드를 작성해봅시다. 앞서 살펴보았던 기능을 구현하기 위해 Contract뿐만 아니라 코드를 배포하고 실행하기 위한 UI, key를 관리하기 위한 위원회 server등 다양한 요소가 필요합니다. Contract에 집중하기 위해 Contract를 제외한 부분의 코드는 사전에 작성되어 있습니다. 사전에 작성된 코드를 받아주도록 합시다.

```bash
git clone https://github.com/HYBLOCK-LAB/SOLiX.git
```

git을 사용할 수 없는 환경이라면 [여기](https://github.com/HYBLOCK-LAB/SOLiX)를 방문하여 zip파일로 다운받아주세요.

프로젝트는 모노레포로 구성되어 있으며 폴더 구조는 다음과 같습니다.

```text
├── apps/ # 핵심 애플리케이션 모음
│ ├── committee/
│ │ └── ... # 키 관리를 위한 위원회 서버(off-chain)와 관련된 코드
│ ├── on-chain/ # 프로젝트의 핵심 규칙과 데이터를 담은 On-chain 코드
│ │    ├── contracts/ # 실제 Smart Contract 소스 코드
│ │    ├── ignition/ # 실제 Smart Contract 소스 코드
│ │    ├── test/ # 테스트 코드
│ │    └── hardhat.config.ts/ # Hardhat 설정 파일. Solidity 버전이나 네트워크 설정 관리
│ └─── web/
│   └── ... # UI를 제공하는 코드
├── docker/
│ └── ... # 다양한 서비스들을 격리된 환경(Container)에서 실행할 수 있도록 도와주는 설정 파일
├── docs/
│ └── ... # git page로 제공되는 html 파일
├── session/
│ └── ... # docs를 만들기 위한 codelab 파일
├── README.md
└── Makefile # 프로젝트에 필요한 명령어. 단순한 단축키처럼 만들어놓은 파일

```

#### 실행하는 법 적기

### Contract 구조

프로젝트의 `apps/on-chain/contracts`를 확인해주세요. `interfaces`폴더와 `LicenseManager.sol`파일을 확인할 수 있을 겁니다.

**Interface**는 특정 스마트 컨트랙트와 상호작용하기 위한 함수들의 명세서 또는 설계도입니다. 컨트랙트가 어떤 함수들을 가지고 있는지 알려주지만, 실제 코드는 포함하지 않습니다.
interface는 이미 On-chain에 배포된 다른 컨트랙트의 함수를 내 컨트랙트에서 호출하고 싶을 때 사용합니다. 상대방 컨트랙트의 전체 소스코드를 다 가져올 필요 없이, 인터페이스만 가지고 있으면 해당 컨트랙트의 함수를 안전하고 효율적으로 호출할 수 있습니다. 이는 코드의 크기를 줄여 가스비를 절약할 수 있습니다. 또한, Interface에 맞게 Contract가 구성되므로 Contract에 어떤 기능이 있는지 쉽게 확인이 가능합니다.

기능을 구현하기 위해서 크게 두가지 기능이 필요합니다. 먼저, License를 실제로 발급하고 소비하는 License를 관리하는 Contract가 필요합니다. 두 번째로, 위원회에서 사용자에 대한 승인을 하고 분할된 키를 IPFS에 배포하기 위해 워원회를 관리하는 Contract가 필요합니다. 두 개의 Contract를 분리해서 작성할 예정입니다.

#### Contract에 필요한 사항들

Contract를 구현하기 위해 필요한 사항을 정리해봅시다.

- contract는 code에 대한 정보를 알아야 합니다.
  - 등록된 code의 메타데이터와 등록된 code의 개수(다음에 등록할 코드에 대한 번호 부여 용도)
  - code의 owner는 누구인지 알아야합니다.
- code를 등록할 수 있어야 합니다. 등록을 하면 owner로 설정되어야 합니다.
- owner는 라이센스 토큰 발급할 수 있어야 합니다.
- owner는 모든 코드 실행 요청을 중단, 허용할 수 있어야 합니다.
- 라이센스 토큰으로 code실행을 위한 key를 요청할 수 있어야합니다. 이 요청을 위원회에 이벤트로 전달해야 합니다.

이를 바탕으로 LincenseManager의 interface를 작성해줍시니다. 아래의 코드를 `ILicenseManager.sol`에 붙여넣어 주세요.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ILicenseManager is IERC165 {
    /* ========= 상태 조회 ========= */

    // code 조회
    function code(
        uint256 codeId
    )
        external
        view
        returns (
            bytes32,
            string memory,
            string memory,
            string memory,
            bool,
            bool
        );

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
        string name,
        string version,
        address indexed publisher
    );

    // 코드 이름 갱신
    event CodeNameUpdated(
        uint256 indexed codeId,
        string name,
        address indexed publisher
    );

    // 코드 메타데이터 갱신
    event CodeUpdated(
        uint256 indexed codeId,
        bytes32 codeHash,
        string cipherCid,
        string version,
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
        string calldata newName
    ) external;

    // 코드 버전 및 소스 갱신
    function updateCode(
        uint256 codeId,
        bytes32 newCodeHash,
        string calldata newCipherCid,
        string calldata newVersion
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

    /* ========= View Helper ========= */

    function checkCodeActive(uint256 codeId) external view returns (bool);

    function checkCodeExists(uint256 codeId) external view returns (bool);

    function uri(uint256 id) external view returns (string memory);
}
```

#### 상태 조회

**code**

code를 조회하는 함수입니다. contract 내부에서 관리되는 `codeId`를 통해 조회할 수 있습니다.
반환값

- codeHash: 코드를 keccak256로 해시값.
- cipherCid: 암호화된 코드의 IPFS CID.
- name: 코드 표시용 이름.
- version: 코드 버전 정보.
- paused: 코드 실행 요청 일시정지 여부.
- exists: 코드 등록 여부.

**codeOwner**

code에 대한 소유자를 조회하는 함수입니다. `codeId`를 통해 조회할 수 있습니다.

반환값

- owner: 해당 codeId의 등록 계정

**licenseExpiry**

계정별 코드의 라이선스 만료 타임스탬프(초)를 조회합니다. 사용자의 `account`와 `codeId`를 통해 조회할 수 있습니다.

반환값

- expiryTimestamp: 블록의 타임스탬프. 0이면 미설정/만료 상태입니다.

**nextCodeId**

다음에 등록할 코드 ID를 조회합니다. 코드를 등록할 때 내부적으로 코드 ID를 부여하기 위해 사용됩니다. getter함수를 만들었지만 실제로 사용되진 않습니다. nextCodeId는 현재 등록된 코드의 수와 동일합니다.

<aside class="positive"><p><strong>Tip: </strong>getter 함수</p><p>public 상태 변수는 컴파일러가 자동으로 getter함수를 생성준다는 점에서 internal 변수와 다릅니다. 이 getter함수 덕분에 다른 contract에서도 해당 변수의 값을 읽을 수 있습니다. </p><p>
하지만 다른 컨트랙트는 ABI를 알고 있지 않는 이상 해당 변수가 public인지 아닌지 알 방법이 없습니다. 이를 <strong>interface</strong>를 통해서 알 수 있습니다. 따라서 함수의 이름, 파라미터, 반환값을 동일하게 interface에 명시해주어야 합니다.</p></aside>

#### 이벤트

함수와 구분짓기 위해 이벤트 명은 **명사 + 과거분사** 형태로 작성하였습니다. 이는 (Coinbase의 스타일 컨벤션)[https://github.com/coinbase/solidity-style-guide]이기도 합니다.

**CodeRegistered**

새로운 코드가 등록되었을 때 발생하는 이벤트입니다. 이 시점부터 codeId가 유효해집니다.

파라미터

- codeId: 새롭게 부여된 코드 id.
- codeHash: 암호화된 코드의 keccak256 해시값.
- cipherCid: 암호화된 코드 바이너리의 IPFS CID.
- name: 사용자가 지정할 수 있는 코드 이름. 기본값은 ""
- version: 코드 버전 문자열. 기본값은 `1.0.0`
- publisher: 배포자의 주소.

**CodeUpdated**

기존 코드가 갱신되었을 때 발생하는 이벤트입니다. 핫픽스, 새 빌드 배포 시 기록됩니다.

파라미터

- codeId: 새롭게 부여된 코드 id.
- codeHash: 암호화된 코드의 keccak256 해시값.
- cipherCid: 암호화된 코드 바이너리의 IPFS CID.
- version: 갱신 후 적용된 코드 버전.
- publisher: 배포자의 주소.

**CodeNameUpdated**

코드의 이름이 바뀌면 발생하는 이벤트입니다. 링크나 UI에서 보여줄 이름을 추적할 때 사용합니다.

파라미터

- codeId: 이름을 수정한 코드 id.
- name: 새롭게 설정한 코드 명칭.
- publisher: 실제 이름을 수정한 호출자(소유자) 주소.

**LicenseIssued**

라이센스 토큰를 발행할 때 발생하는 이벤트입니다.

파라미터

- codeId: 라이센스 토큰 발급 대상의 코드 ID.
- to: 수령자 계정.
- runs: 부여된 실행 가능 횟수
- expiry: 만료 타임스탬프. 더 미래 값이면 갱신.

**LicenseRevoked**

소유자가 특정 계정에 대한 라이센스를 강제 소각할 때 발생합니다.

파라미터

- codeId: 라이센스 토큰 취소 대상의 코드 ID.
- account: 소각 대상 계정.
- burned: 소각된 실행 가능 횟수.

**CodePaused**

해당 코드의 온체인 실행이 일시정지할 때 발생합니다. 이후 사용자는 실행을 요청할 수 없습니다.

파라미터

- codeId: 일시 정지된 코드 ID.

**CodeUnpaused**

정지되었던 코드의 온체인 실행이 재개할 때 발생합니다.

파라미터

- codeId: 재개한 코드 ID.

**RunRequested**

사용자가 코드 실행(다운)을 요청할 때 발생합니다. 이 이벤트는 오프체인 실행 파이프라인(위원회/키조합/복호화/전달)을 트리거합니다.

파라미터

- codeId: 실행 대상 코드의 ID.
- user: 실행을 요청한 사용자의 주소.
- recipientPubKey: 코드를 복호화할 수 있도록 하는 키 조각를 받기 위해 사용되는 공개키.
- blockTimestamp: 이벤트 발생 시점의 블록 타임스탬프.

#### 함수

`supportsInterface(bytes4 interfaceId) → bool`

이 컨트랙트가 특정 인터페이스를 지원하는지 반환합니다. ERC165에서 정의된 함수로 이 컨트랙트가 특정 인터페이스를 구현했는지”를 온체인에서 표준적으로 물어보는 함수입니다.

`registerCode(bytes32 codeHash, string cipherCid) → uint256 codeId`

신규 코드를 등록하고, 호출자를 해당 코드의 소유자로 설정합니다.

`updateCodeMetadata(uint256 codeId, string newName)`

코드의 이름을 변경합니다.

`updateCode(uint256 codeId, bytes32 newCodeHash, string newCipherCid, string newVersion)`

코드의 해시/CID/버전을 함께 갱신합니다.

`pauseCodeExecution(uint256 codeId)`

해당 코드의 실행을 일시정지합니다.

`unpauseCodeExecution(uint256 codeId)`

정지 상태의 코드를 재개합니다.

`issueLicense(uint256 codeId, address to, uint256 runs, uint256 expiryTimestamp)`

특정 계정에 **라이센스 토큰(ERC-1155)**을 발급합니다.

`revokeUserLicense(address account, uint256 codeId)`

대상 계정의 라이선스 토큰을 전량 소각합니다.

`requestCodeExecution(uint256 codeId, bytes recipientPubKey)`

1회 실행을 요청하고 요청자의 실행권을 1 소각합니다. 오프체인 파이프라인이 이 이벤트를 구독해 결과를 처리/전달합니다.

#### View Helper

읽기 전용으로 코드 상태/메타데이터를 빠르게 확인하는 헬퍼들입니다.트랜잭션 제출 전에 가용성 판단이나 UI 표시에 활용할 예정입니다.

**checkCodeActive(uint256 codeId) → bool**

해당 코드가 활성화 상태(존재하며 일시정지 상태가 아님)인지 확인합니다.

**checkCodeExists(uint256 codeId) → bool**

해당 코드가 등록되어 있는지 여부를 확인합니다.

**uri(uint256 id) → string**

ERC-1155 표준 메타데이터 URI를 반환합니다.

이제 `LicenseManager.sol`을 작성해봅시다.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract LicenseManager is ERC1155, AccessControl, ILicenseManager {

}
```

먼저 외부 라이브러리를 살펴봅시다.

1. AccessControl
   AccessControl은 스마트 컨트랙트의 함수 호출 권한을 “역할(Role)” 단위로 관리할 수 있게 해주는 모듈입니다. 역할은 bytes32 식별자(e.g. keccak256("MINTER_ROLE"))로 정의하며, 해당 역할을 가진 주소만 특정 함수(또는 로직)를 실행할 수 있도록 제한합니다. 이를 통해 관리자, 민터, 버너 등 업무/권한 분리가 명확해지며, 권한 변경이 필요할 때도 역할 부여/회수만으로 안전하게 운용할 수 있습니다.

2. ERC1155
   EIP-1155 멀티 토큰 표준의 OpenZeppelin 기본 컨트랙트 구현을 가져옵니다. 하나의 컨트랙트에서 여러 토큰 ID를 관리하며, 각 ID는 “대체 가능(FT)처럼 수량형” 또는 “대체 불가능(NFT)처럼 1개”로 사용할 수 있습니다. EIP-1155에 대해서는 밑에서 알아봅시다.

3. ERC165
   ERC-165는 스마트 컨트랙트가 자신이 어떤 표준 인터페이스를 구현했는지 외부에서 확인할 수 있도록 정의한 **인터페이스 탐지 규약입니다.** `supportsInterface(bytes4 interfaceId)` 함수를 통해 특정 인터페이스 식별자(interfaceId)를 지원하는지 true 또는 false로 응답하며, 이를 통해 다른 컨트랙트가 상호운용성을 안전하게 판단할 수 있습니다. 인터페이스 식별자는 인터페이스의 모든 function selectors를 XOR 연산해 계산하며, ERC165 자체의 식별자는 **0x01ffc9a7로** 고정되어 있습니다. OpenZeppelin이 정의한 표준 IERC165 인터페이스에 따라 `supportsInterface` 함수를 구현함으로써 컨트랙트가 ERC-721, ERC-1155 등 다양한 표준과의 호환성을 명확히 선언하고, 외부에서 이를 검증 가능하게 만들 수 있습니다.

<aside class="positive"><p><strong>토큰(Token)</strong></p>
<p>스마트 컨트랙트에서 토큰(Token)은 블록체인 위에서 자산이나 권리를 표현하는 기본적인 단위입니다. 이를 통해 화폐, 포인트, 게임 아이템, 예술 작품 등 다양한 가치를 디지털화할 수 있습니다. 이더리움에서는 토큰의 규격을 표준으로 정의해 두었으며, 이를 ERC라고 부릅니다. ERC는 "Ethereum Request for Comment"의 약자로, 누구나 같은 규칙에 맞춰 토큰을 만들고 사용할 수 있도록 합니다. 가장 널리 알려진 표준은 ERC-20, ERC-721, 그리고 ERC-1155입니다.</p>
<br/>
<p><strong>ERC-20</strong></p><p>ERC-20은 <strong>대체 가능 토큰(fungible token)</strong>, 즉 서로 동일한 가치를 가진 토큰을 정의한 표준입니다. 예를 들어, 1개의 ERC-20 토큰은 다른 1개의 ERC-20 토큰과 완전히 같은 가치를 가집니다. 이러한 특성 때문에 ERC-20은 주로 <strong>교환 가능하고 분할 가능한 자산</strong>을 표현하는 데에 사용됩니다. 예를 들어 10개의 토큰이 있다면 이를 5개와 5개로 나누거나 3개와 7개로 나눌 수 있으며, 서로 교환해도 가치에 차이가 없습니다. 실제로 USDT, USDC와 같은 스테이블 코인들이 ERC-20을 기반으로 만들어졌습니다. 이 표준을 따르면 잔액을 확인하거나 전송을 요청하는 등의 기본적인 기능을 동일하게 구현할 수 있기 때문에, 다양한 지갑이나 거래소에서 호환성이 보장됩니다.</p>
<br/>
<p><strong>ERC-721</strong></p><p>ERC-721은 <strong>대체 불가능 토큰</strong>, 즉 NFT(Non-fungible token)를 정의한 표준입니다. ERC-20과 달리 ERC-721 토큰은 각각 고유한 식별자를 가지며, 동일한 가치를 가질 수 없습니다. 예를 들어, 하나의 그림 파일을 나타내는 NFT와 또 다른 그림 파일을 나타내는 NFT는 서로 다르고 교환 불가능합니다. 따라서 ERC-721은 디지털 예술품, 수집품, 게임 아이템, 부동산 토큰화 등 <strong>개별 자산의 고유성을 표현해야</strong> 하는 경우에 활용됩니다. 대표적으로 CryptoKitties와 같은 게임의 아이템, 그리고 Bored Ape Yacht Club과 같은 예술 NFT 프로젝트들이 ERC-721 표준을 따릅니다. 이 표준에서는 누가 특정 NFT를 소유하고 있는지 확인하거나, NFT의 소유권을 다른 사람에게 이전하거나, 토큰에 연결된 메타데이터(이미지, 설명 등)에 접근하는 기능을 제공합니다.</p>
<br/>
<p><strong>ERC-1155</strong></p><p>ERC-1155는 ERC-20과 ERC-721의 장점을 결합한 멀티 토큰 표준입니다. 하나의 컨트랙트에서 여러 종류의 토큰을 동시에 관리할 수 있으며, 대체 가능 토큰과 대체 불가능 토큰을 모두 발행할 수 있습니다. 예를 들어 게임에서 흔히 사용되는 구조를 생각해 보면, 일반적인 소비형 아이템인 ‘물약’은 ERC-20처럼 동일한 성격을 가진 대체 가능 토큰으로 표현할 수 있고, 유일한 전설 무기는 ERC-721처럼 고유한 NFT로 표현할 수 있습니다. ERC-1155를 이용하면 이 모든 자산을 하나의 컨트랙트에서 관리할 수 있고, 여러 개의 토큰을 한 번에 전송할 수도 있기 때문에 가스 비용을 절감할 수 있습니다. 이러한 효율성 때문에 메타버스, 게임, 복합 자산 플랫폼에서 널리 사용되고 있습니다. 이번에 만들 라이센스 토큰도 ERC-1155 기반으로 만듭니다.</p>
</aside>

### contructor와 전역변수

작성된 contract에 contructor와 전역변수를 정의해봅시다.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

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
}
```

`ADMIN_ROLE`는 AccessControl의 `DEFAULT_ADMIN_ROLE`을 그대로 이용합니다. 컨트랙트의 모든 관리 권한을 가진 주체를 구분하기 위해 사용됩니다.

`CodeInfo` 구조체는 코드의 메타데이터를 저장하는 틀로, 코드의 해시(codeHash), 암호화된 파일의 IPFS 주소(cipherCid), 코드에 붙일 이름(name), 버전 문자열(version), 실행 일시정지 여부(paused), 등록 여부(exists), 그리고 코드 소유자 주소(owner)를 포함합니다.
`_codes`는 각 코드 ID(codeId)에 대응하는 CodeInfo를 저장해 코드를 개별적으로 관리하며, `_expiry`는 사용자 주소와 코드 ID를 키로 하여 해당 라이선스의 만료 시점을 기록합니다. `_nextCodeId`는 새 코드를 등록할 때 부여할 다음 코드 ID를 추적하는 카운터입니다.

constructor는 배포 시점에 한 번 실행되며, 상속받은 ERC1155의 생성자에 baseUri를 전달해 토큰 메타데이터의 기본 경로를 설정합니다. 또한 `_grantRole(ADMIN_ROLE, msg.sender)`를 호출하여 배포자에게 관리자 권한을 부여함합니다.

`supportsInterface`는 ERC-165 인터페이스 탐지 규약을 따름을 보여주기 위한 함수입니다. 먼저 interfaceId == type(ILicenseManager).interfaceId를 검사해 이 컨트랙트가 커스텀 인터페이스인 ILicenseManager 를 직접 지원함을 명시합니다. 그 외의 경우에는 `super.supportsInterface(interfaceId)`를 호출해 상위 클래스(ERC1155, AccessControl)가 이미 지원을 선언한 표준들에 대한 판정을 체이닝으로 위임합니다.

### 기능에 따른 함수

작성된 contract에 함수의 뼈대를 작성해봅시다. 함수명, 파라미터, 반환값 등은 ILicenseManager와 동일하게 작성하면 됩니다.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

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
    ) external view override returns (
        bytes32,
        string memory,
        string memory,
        string memory,
        bool,
        bool
    ) {
        // TODO implement code getter
    }

    // 코드 소유자 조회
    function codeOwner(
        uint256 codeId
    ) external view override returns (address) {
        // TODO implement owner getter
    }

    // 계정별 라이선스 만료시간 조회
    function licenseExpiry(
        address account,
        uint256 codeId
    ) external view override returns (uint256) {
        // TODO implement expiry getter
    }

    // 다음에 등록할 코드 ID 조회
    function nextCodeId() external view override returns (uint256) {
        // TODO implement nextCodeId getter
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
        // TODO implement code registration
    }

    // 코드 메타데이터 갱신. 소유자만 갱신 가능
    function updateCodeMetadata(
        uint256 codeId,
        string calldata newName
    ) external override {
        // TODO implement updating code metadata
    }

    // 코드 버전 및 소스 갱신. 소유자만 갱신 가능
    function updateCode(
        uint256 codeId,
        bytes32 newCodeHash,
        string calldata newCipherCid,
        string calldata newVersion
    ) external override {
        // TODO implement updating code
    }

    // 코드 일시정지. 소유자 또는 관리자만 가능
    function pauseCodeExecution(uint256 codeId) external override {
        // TODO implement pausing code execution
    }

    // 코드 일시정지 해제. 소유자 또는 관리자만 가능
    function unpauseCodeExecution(uint256 codeId) external override {
        // TODO implement unpausing code execution
    }

    // 특정 사용자에게 라이선스 발급. 소유자만 가능
    function issueLicense(
        uint256 codeId,
        address to,
        uint256 runs,
        uint256 expiryTimestamp
    ) external override {
        // TODO implement issuing license
    }

    // 특정 사용자의 라이선스 전량 취소(소각). 소유자만 가능
    function revokeUserLicense(
        address account,
        uint256 codeId
    ) external override {
        // TODO implement revoking license
    }

    // 실행 요청. 1회 소진 + 이벤트 발생
    function requestCodeExecution(
        uint256 codeId,
        bytes calldata recipientPubKey
    ) external override {
        // TODO implement requestCodeExecution
    }

    /* ========= 뷰 헬퍼 ========= */

    // 코드가 존재하고 정지 상태가 아닌지 여부
    function checkCodeActive(
        uint256 codeId
    ) external view override returns (bool) {
        // TODO implement to get checkCodeActive
    }

    // 코드 존재 여부 확인
    function checkCodeExists(
        uint256 codeId
    ) external view override returns (bool) {
        // TODO implement to get checkCodeExists
    }

    // ERC1155의 메타데이터 URI를 code별로 반환
    function uri(
        uint256 id
    ) public view override(ERC1155, ILicenseManager) returns (string memory) {
        // TODO implement to uri
    }
}
```

## 스마트 컨트랙트 작성

Duration: 30

앞서 구현한 코드 뼈대를 토대로 함수를 구현하겠습니다. 먼저 상태 조회하는 함수입니다.

Solidity에서 public 상태 변수는 컴파일 시 자동으로 해당 변수명에 대한 getter가 생성됩니다. 외부 컨트랙트나 오프체인 클라이언트는 이 함수를 호출해 스토리지 값을 읽을 수 있고, internal 변수는 당연히 이렇게 노출되지 않습니다. 우리는 getter를 interface에서 명시적으로 정의해놓았기 때문에 getter를 구현하겠습니다. getter는 상태 변수의 값을 그대로 반환하면 됩니다.

### code

```solidity
// code 조회
function code(
    uint256 codeId
) external view override returns (
    bytes32,
    string memory,
    string memory,
    string memory,
    bool,
    bool
) {
    CodeInfo storage c = _codes[codeId];
    return (c.codeHash, c.cipherCid, c.name, c.version, c.paused, c.exists);
}
```

codeId로 storage에 저장된 code를 조회하고 관련 정보를 반환하는 함수입니다. 순서대로 codeHash, cipherCid, name, version, paused, exists를 튜플로 반환하니, 클라이언트에서는 필요한 조각만 골라 사용하면 됩니다.

### codeOwner

```solidity
// 코드 소유자 조회
function codeOwner(
uint256 codeId
) external view override returns (address) {
return _codes[codeId].owner;
}
```

codeId에 해당하는 코드 엔트리의 소유자 주소를 저장소에서 읽어 반환하는 함수입니다.

### licenseExpiry

```solidity
// 계정별 라이선스 만료시간 조회
function licenseExpiry(
address account,
uint256 codeId
) external view override returns (uint256) {
return _expiry[account][codeId];
}
```

특정 account가 codeId에 대해 보유한 라이선스 만료 타임스탬프를 반환합니다.
값이 0이면 무기한(만료 없음)을 의미합니다.

### nextCodeId

```solidity
// 다음에 등록할 코드 ID 조회
function nextCodeId() external view override returns (uint256) {
return _nextCodeId;
}
```

다음 registerCode 호출 시 부여될 다음 코드 ID 값을 조회하여 반환합니다. 내부 카운터로 관리되며 등록 시 1씩 증가합니다.

### registerCode

```solidity
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
```

이제 본격적으로 기능을 위한 함수를 작성해봅시다. `registerCode`는 새 code를 등록하는 함수입니다. 하는 일은 크게 3가지입니다. 먼저, code에 대한 정보를 저장합니다. codeHash와 cipherCid를 받아 그대로 사용하고 exists는 true, paused는 false로 하여 storage에 저장합니다. 새롭게 이름(name)과 버전(version) 필드를 도입했기 때문에, 등록 시 기본 이름은 비워두고 버전은 `1.0.0`으로 초기화해 이후 갱신 시 기준 버전을 명확히 합니다. 또한 이 함수를 호출한 주소(`msg.sender`)를 소유자로 설정합니다. 두 번째로 다음번에 호출되었을 때 저장할 위치를 변경하기 위해서 `_nextCodeId`를 증가시킵니다. 마지막으로 이벤트 `CodeRegistered`를 발행해 신규 코드 등록을 추적할 수 있게 합니다.

### updateCodeMetadata

```solidity
// 코드 이름 갱신. 소유자만 가능
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
```

`updateCodeMetadata`는 코드의 메타데이터를 수정하는 함수입니다. 현재는 이름만 수정합니다. 다른 메타데이터를 건드리지 않고 문자열만 교체한 뒤 `CodeNameUpdated` 이벤트로 변경 사실을 알립니다.

### updateCode

```solidity
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
```

새로운 `updateCode` 함수는 코드 변경할 때 사용합니다. 코드에 관한 정보인 해시와 암호화 CID를 교체하고 버전 문자열을 함께 기록해 배포 이력을 명확히 추적합니다. 기존과 동일하게 `CodeUpdated` 이벤트와 ERC-1155 `URI` 이벤트를 발행해 외부 시스템이 즉시 변화를 감지하도록 했습니다.

### 유틸 함수

code가 존재하는지 여부와 code의 소유자인지 판단, 소유자 혹은 관리자인지 판단하는 로직은 앞으로 자주 쓰이게 될 기능이므로 함수로 만들도록 합니다. 컨트랙트 하단에 다음의 코드를 붙여넣어 주세요.

```solidity
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
```

### pauseCodeExecution & unpauseCodeExecution

```solidity
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
```

특정 코드에 대한 실행 요청 기능만 일시정지/해제합니다. 소유자 또는 관리자만 호출할 수 있도록 구현합니다. 실행 요청시 정지되어 있으면 기능을 사용하지 못하도록 막아 라이센스 발급(issuing)은 허용합니다.

### issueLicense

```solidity
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
```

소유자가 사용자에게 **라이센스 토큰(ERC-1155)**을 발급하는 함수입니다. 코드가 존재하고 정지 상태가 아님을 보장합니다. 발행하려는 토큰의 실행횟수나 만료시각이 유효한지 역시 검사해야 합니다. 만료 시각은 더 긴 값 우선 정책으로 갱신합니다(기존 만료가 더 길면 유지). 권한을 `_mint(to, codeId, runs, "")`로 부여하고 LicenseIssued 이벤트를 발행합니다.

<aside class="positive"><p><strong>_mint(address to, uint256 id, uint256 amount, bytes data)</strong></p><p>
<code>_mint</code>는 <strong>OpenZeppelin ERC-1155</strong>에서 토큰을 새로 발행해 수신자 to의 잔고에 id 토큰을 amount만큼 추가하는 내부 함수입니다. 가시성은 internal이라 내부 로직에서만 호출할 수 있습니다. 호출 시 to가 영(0)주소면 즉시 되돌리고, 전처리 훅(<code>_beforeTokenTransfer</code>)을 호출한 뒤 스토리지의 잔고를 증가시키고 <code>TransferSingle(operator, address(0), to, id, amount)</code> 이벤트로 minting되었음을 알립니다. 이어서 수신자가 컨트랙트 주소인 경우 ERC-1155 수신 인터페이스인 IERC1155Receiver.onERC1155Received를 호출해 정상 수신 셀렉터를 반환하는지 확인하며, 그렇지 않으면 되돌립니다. 마지막으로 후처리 훅(<code>_afterTokenTransfer</code>)이 호출되어 확장 포인트를 제공합니다.</p></aside>

### revokeUserLicense

```solidity
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
```

특정 사용자의 해당 코드에 대한 실행권을 전량 회수합니다. 소유자만 호출 가능하며, 잔고가 있으면 `_burn(account, codeId, balance)`로 소각하고 만료도 0으로 초기화합니다. LicenseRevoked 이벤트를 통해 회수된 수량을 전파합니다.

<aside class="positive"><p><strong>_burn(account, codeId, balance)</strong></p><p>
<code>_burn</code>는 <strong>OpenZeppelin ERC-1155</strong>에서 주소 <code>from</code>이 보유한 <code>id</code> 토큰을 <code>amount</code>만큼 영구 소각하는 내부 함수입니다. <code>_mint</code>와 동일하게 가시성은 internal이고 권한 검증을 끝낸 뒤 내부적으로 호출하는 게 일반적입니다. 실행 흐름은 대체로 다음과 같습니다:</p>
<p>먼저 <code>from != address(0)</code>를 확인하고, 전처리 훅 <code>_beforeTokenTransfer</code>을 호출합니다. 이어서 <code>from</code>의 잔고가 <code>amount</code> 이상인지 확인한 후(부족하면 revert) 잔고를 감소시키고, <code>TransferSingle(operator, from, address(0), id, amount)</code> 이벤트를 내보냅니다. 마지막으로 후처리 훅 <code>_afterTokenTransfer</code>가 호출되어 확장 포인트를 제공합니다.</p></aside>

<aside class="negative"><p><strong>Warning</strong></p><p>안전성 측면에서 <code>_burn</code>은 수신 컨트랙트 콜백을 호출하지 않습니다. 따라서 권한과 전제조건 검증은 반드시 호출하는 쪽에서 해야 합니다.</p></aside>

### requestCodeExecution

```solidity
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
```

사용자가 라이센스의 실행권을 1회 소모하여 실행을 요청하는 함수입니다. 코드가 존재하며 정지되지 않았고, 호출자가 해당 codeId 실행권 잔고를 보유하고 있으며, 만료되지 않았음을 검증합니다. 그 후 `_burn(msg.sender, codeId, 1)`로 1회를 소모하고, RunRequested 이벤트에 recipientPubKey와 timestamp를 담아 발행합니다. 위원회는 이 이벤트를 구독해 실제 실행 절차를 진행하게 됩니다.

### View Helper

View Helper는 컨트랙트의 상태를 읽기(read-only)위해 사용하는 함수입니다. 오프체인이나 다른 컨트랙트에서 안전하게 상태를 확인하고 결과만 받기 위해 돕습니다. 트랙잭션 없이 `eth_call`로 부르면 가스가 들지 않고, 트랜잭션 내부에서 호출할 때만 가스가 필요합니다. 구현할 view helper는 code가 active(존재하고 정지 상태가 아님)인지 판단하는 함수, code가 존재하는지에 판단하는 함수, ERC1155의 메타데이터 URI를 가져오는 함수입니다.

```solidity
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
```

### 마무리

이제 LicenseManager 컨트랙트 작성을 완료했습니다. 전체 코드는 다음과 같습니다.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

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
```

## 배포 및 테스트

Duration: 25

### 배포

`LicenseManager` 컨트랙트는 `apps/on-chain` 폴더 안에서 Hardhat으로 관리합니다. 배포 전에 의존성을 설치하고 네트워크 설정을 준비해 주세요.

#### 1. 의존성 설치 및 환경 변수 설정

```bash
cd apps/on-chain
npm install # 또는 pnpm/yarn 사용 가능
```

#### 2. 컴파일

```bash
npx hardhat compile --profile production

```

`production` 프로필은 최적화 옵션을 켠 상태로 컴파일합니다. `--profile production` 플래그를 생략해도 됩니다.

#### 3. 로컬 네트워크 배포

먼저, Hardhat이 제공하는 로컬 네트워크에 컨트랙트를 올려봅시다. Ignition 모듈을 실행합니다.

```bash
npx hardhat ignition deploy ignition/modules/LicenseManager.ts
```

- 기본 `baseUri` 파라미터는 `ipfs://base/{id}.json`입니다. 커스터마이징이 필요하면 `--parameters LicenseManagerModule.baseUri="ipfs://.../{id}.json"` 옵션을 덧붙이세요.

#### 4. Sepolia 테스트넷 배포

Sepolia로 배포할 땐 .env에 입력한 RPC와 프라이빗키가 사용됩니다. `.env` 파일을 만들어주고 `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY` 값을 채워주세요. 지난 세션때 넣은 것과 동일하게, `SEPOLIA_RPC_URL`는 **Infura에서 발급받은 RPC URL이고** `SEPOLIA_PRIVATE_KEY`는 **metamask에서 생성한 계정의 개인 키** 입니다.

```bash
cp .env.example .env
```

배포하기 전에 프라이빗키가 담긴 계정에 충분한 sepolia ETH가 있는지 꼭 확인하세요.

```bash
npx hardhat ignition deploy ignition/modules/LicenseManager.ts --network sepolia

```

<aside class="negative"><p>hardhat은 deployment-id를 기준으로 배포를 실행합니다. 즉, 동일한 deployment-id로 같은 모듈/파라미터를 가진다면 재실행하지 않습니다. 재배포가 필요한 경우 <code> --deployment-id license-manager-$(date +%s)</code> 옵션을 붙여서 재배포해주세요.</p></aside>

![deployment sepolia](./images/deployment_sepolia.png)

배포 후 콘솔에 출력되는 `licenseManager` 주소를 따로 기록해 두세요. 프론트엔드 연동 및 이후 트랜잭션 검증에 사용합니다.

#### 5. Etherscan에서 contract verifying

스마트 컨트랙트를 배포하면 주소로는 바이트코드만 확인할 수 있습니다. Etherscan에서 소스 코드를 검증(verify)해 두면 누구나 원본 코드를 열람하고 ABI를 재활용할 수 있어 서비스 신뢰도가 크게 높아집니다.

- 투명성 확보: 코드 내용과 컴파일 설정이 공개되어 사용자와 감사자가 동작을 직접 확인할 수 있습니다.
- 신뢰도 향상: 서드파티 툴과 지갑이 컨트랙트를 `verified` 상태로 인식해 경고 없이 호출할 수 있습니다.
- 개발 편의: Etherscan이 ABI를 자동 생성해주므로 프론트엔드나 스크립트에서 재사용하기 쉽습니다.

검증은 [Etherscan](https://sepolia.etherscan.io/)에서 컨트랙트 주소를 열고 `Contract` 탭 → `Verify & Publish` 버튼을 눌러 진행합니다. 다음과 같이 ㄴ배포에 사용한 컴파일러 버전, 최적화 설정, constructor 인자를 그대로 입력해 주세요.

![etherscan verifying web0](./images/etherscan_verifying_web_1.png)

완료가 되면 컴파일 옵션을 json 파일로 넘겨줘야합니다. json파일을 하나 만들어 넣어주세요. 안에 Standard JSON Input 붙여넣습니다. 컴파일 시 생성된 json 파일(`artifacts/build-info/<hash>.json`)에서 "input" 객체 전체를 통째로 복사해 붙여넣어주세요. 이제 Etherscan의 입력 박스에 붙여넣기 하세요.

![etherscan verifying web0](./images/etherscan_verifying_web_2.png)

<aside class="negative"><p>이 settings 안의 optimizer.enabled, runs, evmVersion 등이 실제 컴파일 설정이므로 반드시 원본 그대로 유지돼야 검증이 성공합니다.</p></aside>

동일한 과정을 CLI로 자동화할 수도 있습니다. Hardhat 프로젝트 루트에서 다음 명령을 실행하면 Etherscan API를 통해 검증이 제출됩니다. `"ipfs://base/{id}.json"`는 컨트랙트로 전달할 argument입니다.

```bash
npx hardhat verify --build-profile production --network sepolia <DEPLOYED_ADDRESS> "ipfs://base/{id}.json"
```

검증이 완료되면 Etherscan의 `Contract` 탭에 Verified 뱃지가 표시되고, 코드/ABI가 공개됩니다.

![etherscan verifying web0](./images/etherscan_verifying_web_3.png)

### 테스트

#### 1. 컨트랙트 테스트 실행

```bash
cd apps/on-chain
npx hardhat test
```

- 테스트는 `apps/on-chain/test/*.test.ts`에 정의되어 있으며, 컨트랙트 배포, 기능 호출, 이벤트 검증까지 한 번에 진행합니다.
- 에러 메시지를 확인하거나 특정 함수만 빠르게 검증하려면 `--grep` 옵션을 이용해 필터링 할 수 있습니다.

```bash
npx hardhat test test/LicenseManager.test.ts --grep "function_name"
```

#### 2. 웹 환경 변수 세팅

License관리를 위한 대시보드는 `apps/web`에 위치합니다. 먼저 환경 변수를 설정합시다. 특히, 배포된 컨트랙트 주소와 RPC 정보를 공유해야 dApp에서 호출할 수 있습니다.

```bash
cd ../web
cp .env.example .env
```

`.env`에서 아래 값을 필수로 갱신합니다.

- `NEXT_PUBLIC_CHAIN_ID`: 로컬은 31337, Sepolia는 11155111입니다.
- `NEXT_PUBLIC_CHAIN_NAME`: UI에 표시될 Chain 명입니다.
- `NEXT_PUBLIC_CHAIN_RPC_URL`: dApp이 사용할 RPC Url입니다. 로컬 Hardhat에 연결하려면 `http://127.0.0.1:8545` 처럼 변경합니다.
- `NEXT_PUBLIC_CHAIN_SYMBOL`: UI에 표시될 Chain 심볼입니다.
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: 앞서 배포한 LicenseManager 컨트랙트 주소입니다.
- `NEXT_PUBLIC_WALLETCONNECT_ID`: WalletConnect 프로젝트를 사용하면 고유 ID로 교체해주세요.
- `NEXT_PUBLIC_STORAGE_MODE`: IPFS 스토리지 모드입니다. `local`로 설정하면 `Helia`만 사용하고 `production`으로 설정하면 `Helia` + `Pinata`를 사용합니다.
- `PINATA_JWT`: Pinata에서 발급한 JWT토큰입니다. 선택 옵션입니다.

설정을 마치면 `npm run dev`로 웹 UI를 실행하고, 지갑을 연결해 트랜잭션 흐름을 검증합니다. 로컬 네트워크를 띄운 상태에서 웹 UI를 실행하고, 메타마스크/지갑 연결 후 `registerCode`, `issueLicense`, `requestCodeExecution` 플로우를 직접 수행합니다. 트랜잭션이 실패하면 Hardhat 콘솔과 브라우저 개발자 도구에서 에러 로그를 확인하고, 컨트랙트 이벤트(`RunRequested`, `CodeRegistered` 등)를 통해 상태 변화를 검증하세요.

#### 3. 웹에서 테스트

웹에서 code를 등록하고 라이센스를 발행하고 발행된 라이센스를 확인해보세요.

![web code registered](./images/web_code_registered.png)
![web license issued](./images/web_license_issued.png)
![web licenses](./images/web_licenses.png)

웹에서 실행한 결과를 etherscans에서 확인해보세요.

![result transactions](./images/result_transactions.png)
![result events](./images/result_events.png)
![result tokens](./images/result_tokens.png)

## IPFS 사용법 익히기

Duration: 14

[IPFS(InterPlanetary File System)](https://ipfs.tech/)는 콘텐츠 주소화(content addressing), 분산 P2P 네트워크(libp2p), DHT 기반 라우팅(BitSwap), IPLD(Merkle-DAG) 데이터 모델로 이루어진 분산 파일 시스템입니다. 핵심은 파일의 위치가 아니라 내용(CID) 으로 식별하고, 여러 피어가 데이터를 교환한다는 점입니다.

### IPFS 구조 및 동작 원리

#### 콘텐츠 주소화 & CID(Content Identifier)

IPFS는 파일이나 디렉터리를 저장할 때 먼저 데이터를 **여러 블록으로** 분할하고, 각 블록을 해시하여 **고유한 식별자(CID)를** 만듭니다. 해시를 통해 만들어졌으므로 같은 내용은 언제 어디서 저장되든 동일한 CID를 갖습니다. CID는 크기와 무관하게 짧고, 위치가 아닌 내용을 가리키는 주소입니다.

#### IPLD(Merkle-DAG) & UnixFS

IPFS에서 Merkle DAG를 통해 내용 그 자체로 구분하고, 여러 조각(블록)들이 서로 연결된 형태로 저장되도록 만들고, UnixFS는 이 위에 파일/디렉터리 구조를 얹어 실질적인 파일 저장, 탐색이 가능하도록 만든 포맷입니다. 이 두 가지가 결합됨으로써 IPFS는 파일 단위 저장의 유연성과 블록 단위 저장의 효율성을 동시에 확보할 수 있습니다.

데이터를 분할한 블록들 사이에 Merkle DAG(Directed Acyclic Graph) 구조를 구성하는데, 각 노드는 자신의 데이터(payload)와 자식 블록의 CID 리스트(links)를 포함하며, 이 두 정보를 해시한 값이 그 노드의 식별자가 됩니다. 이러한 방식 덕분에 중복되는 데이터 블록은 여러 위치에 저장되더라도 해시가 동일하기 때문에 자연스럽게 **중복 제거(deduplication)가** 이루어집니다.

![ipfs dag](./images/ipfs_dag.svg)

IPFS 내 파일·디렉터리 저장을 위해 설계된 계층이 UnixFS입니다. UnixFS는 이 Merkle DAG 위에 **파일 시스템처럼 보이도록** 청크(chunk) 분할, 링크 구조, 디렉터리 계층 등 메타데이터를 더해 구현된 데이터 포맷입니다.

정리하자면, 크기가 큰 파일은 여러 블록으로 나뉘고 이 블록들은 Merkle DAG의 자식 노드로 연결되어 루트 노드가 전체 파일을 대표하게 됩니다. 이렇게 구성되면 파일의 각 부분을 개별적으로 검증하고, 블록 중 일부만 변경되어도 전체 CID가 변경되므로 변경 감지 및 무결성 관리가 수월해집니다.

#### Bitswap

노드들은 **원하는 블록의 CID 리스트**를 브로드캐스트하고, 연결된 피어로부터 직접 블록을 받습니다. 다수의 피어와 동시 교환이 가능합니다. 교환 전략은 기본적으로 tit-for-tat 정책을 사용합니다.

IPFS의 노드들은 자신이 필요로 하는 데이터 블록의 CID(Content Identifier) 목록(want-list)를 주변 피어들에게 브로드캐스트합니다. 이 목록을 받은 피어들은 자신이 해당 블록을 보유하고 있을 경우 이를 제공하며, 요청한 노드는 동시에 여러 피어로부터 데이터를 전송받을 수 있습니다. 이러한 병렬 교환 구조 덕분에 전송 속도와 네트워크 활용 효율이 크게 향상됩니다. **BitTorrent**와 유사하게 **tit-for-tat** 전략을 사용하여, 네트워크 참여자들이 공정하게 자원을 교환하도록 유도하고, 결과적으로 IPFS 전체의 데이터 가용성과 신뢰성을 높여 줍니다.

#### DHT

DHT(Distributed Hash Table)는 분산 네트워크 환경에서 데이터를 효율적으로 저장하고 검색하기 위한 해시 테이블 구조입니다. 네트워크 내의 특정 자원(resource)을 저장할 때, 해시 함수를 통해 자원의 정보를 암호화하여 고유한 키(key) 를 생성하고, 이 키를 담당할 노드를 일정한 규칙에 따라 선택하여 데이터를 분산 저장합니다. 즉, 각 노드는 전체 키 공간의 일부를 담당하며, 특정 키를 기반으로 **어느 노드가 해당 데이터를 갖고 있는지**를 계산할 수 있습니다.
이때 탐색 효율을 높이기 위해 각 노드는 다른 피어의 정보를 일정 부분만 알고 있으며, 대표적으로 Kademlia와 같은 알고리즘을 사용하여 O(log N) 단계 안에 원하는 데이터를 찾을 수 있습니다.
IPFS에서는 Kademlia 기반 DHT를 사용하고 Content Routing을 위한 지도 역할이고, 실제 데이터 전송은 Bitswap으로 이루어집니다.

IPFS에서 사용하는 DHT에 대해서는 [공식 문서](https://docs.ipfs.tech/concepts/dht/#kademlia)에 잘 정리돼 있습니다.

### IPFS 사용하기

#### 실행과정

IPFS 실행하는 과정은 다음과 같습니다.

1. IPFS 노드 설치: 먼저 사용할 컴퓨터 또는 장치에 IPFS 노드를 설치해야 합니다. CLI 환경이라면 [Kubo](https://docs.ipfs.tech/install/command-line/)를, Desktop 환경에서 사용하고 싶으면 [Desktop App](https://docs.ipfs.tech/install/ipfs-desktop)을 OS에 맞게 설치합니다.

2. IPFS 노드 실행: `ipfs init`으로 로컬 리포를 만들고, `ipfs daemon`으로 노드를 실행해 네트워크에 참여합니다. 브라우저용 대시보드와 로컬 게이트웨이도 확인할 수 있습니다.

3. 파일 추가: 파일을 IPFS에 추가하기 위해 `ipfs add` 명령을 사용합니다. 이 명령을 사용하면 지정된 파일을 IPFS 네트워크에 추가하고 해당 파일의 해시 값을 반환합니다. 예를 들어, ipfs add example.txt 명령을 사용하여 “example.txt”라는 파일을 추가할 수 있습니다.

4. 해시 값 확인: 출력된 CID가 곧 파일의 식별자입니다. 같은 내용이면 CID가 동일합니다. `ipfs cat <CID>` 으로 내용 조회가 가능합니다.

5. 파일 공유: CID만 알면 전 세계 어디서든 접속 가능하며, 게이트웨이를 통해 `https://ipfs.io/ipfs/<CID>` 같은 URL로도 접근할 수 있습니다. 영구 보존을 원하면 pin 하거나 핀닝 서비스(web3.storage 등)를 사용합니다.

#### IPFS Desktop

[IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop)을 설치하면 다음과 같은 기본 대시보드를 볼 수 있습니다. 아래 사진처럼 로컬 Kubo 노드의 상태(Status), 피어 연결 수, 데이터 사용량, 게이트웨이 주소 등을 한눈에 확인할 수 있습니다.

![ipfs desktop status](./images/ipfs_desktop_status.png)

Settings 화면의 맨 하단에는 `Kubo Config` 항목이 있습니다.
이는 로컬 IPFS 노드의 설정 파일(`~/.ipfs/config`)을 GUI 형태로 편집할 수 있는 영역입니다.

![ipfs desktop config](./images/ipfs_desktop_config.png)

여기에서 Bootstrap이 `auto`로 되어 있으면 Kubo가 내장된 `공식 부트스트랩 피어 목록을` 자동으로 사용합니다. 이 피어들은 전 세계적으로 배포된 IPFS의 초기 진입 노드로, 노드가 처음 실행될 때 DHT 네트워크에 연결되도록 도와줍니다. 직접 네트워크(프라이빗 IPFS 클러스터 등)를 운영할 때는 여기에 커스텀 피어 리스트를 넣어주면 됩니다.

```text
"Bootstrap": [
  "/ip4/203.0.113.12/tcp/4001/p2p/QmExamplePeer"
]
```

이렇게 하면 Kubo가 공용 네트워크 대신 지정된 피어를 우선 연결 대상으로 사용합니다. 즉, 특정 조직·프로젝트 내에서만 콘텐츠를 공유하는 **폐쇄형 IPFS 네트워크를** 구성할 수 있습니다.

IPFS Desktop의 `Files` 탭에서는 로컬에서 업로드한 파일을 IPFS 네트워크에 추가하고 관리할 수 있습니다. 파일을 업로드하면 내부적으로 다음 과정이 일어납니다:

- 파일이 여러 블록(block)으로 분할합니다.
- 각 블록에 대해 CID가 계산됩니다.
- 블록들이 Merkle DAG 형태로 연결되어 파일 전체를 표현합니다.
- 루트 노드의 CID가 파일의 고유 주소가 됩니다.

이 구조를 시각적으로 보고 싶다면, 파일을 선택한 후 `Inspect` 버튼을 클릭하면 됩니다.

![ipfs desktop explore](./images/ipfs_desktop_explore.png)

#### Kubo

Kubo는 Go로 작성된 IPFS의 가장 널리 쓰이는 구현체이며, CLI/RPC API/게이트웨이를 제공합니다. 과거 이름은 go-ipfs입니다.

1. 저장소 초기화

ipfsKubo는 모든 설정과 내부 데이터를 저장소라는 디렉터리에 저장합니다. Kubo를 처음 사용하기 전에 저장소를 초기화해야 합니다.

```bash
ipfs init
```

다음과 같은 형태로 출력되면 됩니다.

![ipfs cli init](./images/ipfs_cli_init.png)

2. 노드를 온라인으로 전환

노드를 온라인으로 전환하고 IPFS 네트워크와 상호 작용합니다. 다른 터미널 창을 열어 IPFS 데몬을 시작합니다.

```bash
ipfs daemon
```

원래 터미널 창으로 돌아가 ipfs swarm peers피어의 IPFS 주소를 확인합니다.

```bash
ipfs swarm peers
```

3. 파일 가져오기

다음의 명령어를 입력하여 우주선 발사 사진을 가져옵니다. `QmSgvgwxZGaBLqkGyWemEDqikCqU52XxsYLKtdy3vGZ8uq`는 [공식 문서](https://docs.ipfs.tech/how-to/command-line-quick-start/#take-your-node-online)에서 소개된 CID입니다.

```bash
 ipfs cat /ipfs/QmSgvgwxZGaBLqkGyWemEDqikCqU52XxsYLKtdy3vGZ8uq > ~/Desktop/spaceship-launch.jpg
```

4. 파일 업로드

원하는 파일을 다음의 명령어를 통해 업로드합니다.

```bash
ipfs add spaceship-launch.jpg
```

다음과 같이 추가됩니다.

![ipfs cli added](./images/ipfs_cli_added.png)

#### web3.storage

web3.storage는 IPFS이나 Filecoin을 쉽게 사용할 수 있는 서비스입니다.
업로드 시 자동으로 CAR(내용 주소 가능 아카이브)로 패킹하고, IPFS에 배포하며 Filecoin 백업을 제공합니다. JS/Go/HTTP API를 지원합니다. 우리는 자체 노드를 운영하지 않고 암호화된 소스코드(데이터)를 보관하기 위해 사용할 예정입니다.

HTTP/Go 클라이언트 예시와 상세 API는 [레퍼런스 문서](https://staging.web3.storage/docs/reference/http-api/)에서 확인할 수 있습니다.

#### Helia

[Helia](https://helia.io/)는 브라우저/Node.js 환경을 위한 모던 JS IPFS 구현체입니다.
모듈화가 잘 되어 있고, `@helia/*` 패키지와 `js-kubo-rpc-client` 등과 함께 사용할 수 있습니다. 공식 JS 레퍼런스는 Helia와 연동 도구들을 소개합니다.

#### Pinata

[Pinata](https://pinata.cloud/)는 IPFS 상에서 파일을 손쉽게 업로드하고 영구적으로 **고정(pin)** 시킬 수 있도록 도와주는 클라우드 기반의 IPFS 핀 서비스입니다. IPFS는 탈중앙화된 파일 저장 네트워크이기 때문에, 기본적으로 특정 노드가 파일을 보관하지 않으면 데이터가 사라질 수 있습니다. Pinata는 사용자가 업로드한 콘텐츠를 자사 노드에 고정해 두어 언제나 접근 가능하도록 유지해 주는 역할을 합니다.

현재 웹 데모는 로컬 환경이거나 Pinata를 사용 불가능한 환경에서는 Helia를 이용해 브라우저에 파일을 저장하고, Pinata를 사용 가능한 환경에서 Helia로 업로드된 파일을 Pinata 스토리지에 다시 한 번 저장합니다. 이를 사용하려면 회원가입 후 [API Key](https://app.pinata.cloud/developers/api-keys)를 받아주세요.

## 축하합니다

Duration: 1

축하합니다! 성공적으로 License 관련 컨트랙트를 작성하고 IPFS에 대해 익혔습니다. 다음 시간에는 위원회 관련 컨트랙트 개발과 기존 컨트랙트에서 보안할 점을 확인하도록 하겠습니다.

### 도움이 될 만한 자료

1. [Lit Protocol](https://www.litprotocol.com/): Lit Protocol은 key와 secrets을 관리하기 위한 탈중앙화 네트워크 프로토콜입니다. 본 프로젝트는 이러한 Lit Protocol에서 영감을 받아, DKG(Distributed Key Generation) 개념을 기반으로 이를 솔리디티로 구현하였습니다. Lit Protocol에 대한 보다 자세한 내용은 [공식 백서](https://github.com/LIT-Protocol/whitepaper)를 참고하시기 바랍니다.
2. [IPFS Concepts](https://docs.ipfs.tech/concepts/): [IPFS](https://github.com/ipfs)는 Web3 생태계에서는 중대형 오픈소스 프로젝트입니다. 또한, 이에 대한 구현 원리를 이해하기 위해서 Merkle DAG, UnixFS, DHT, Pub/Sub 모델(Gossip), BitSwap 등 Computer Sicence 관련 배경지식을 많이 요구합니다.
3. [proto school](https://proto.school/tutorials): IPFS나 filecoin과 같은 분산형 웹 스토리지 시스템에 관한 기술 튜토리얼입니다.

### 참고 자료

1. [openzeppelin의 contract관련 개발 문서](https://docs.openzeppelin.com/contracts)
2. [EIP-20: ERC-20(Token Standard)](https://eips.ethereum.org/EIPS/eip-20)
3. [EIP-165: ERC-165(Standard Interface Detection)](https://eips.ethereum.org/EIPS/eip-165)
4. [EIP-721: ERC-721(Non-Fungible Token Standard)](https://eips.ethereum.org/EIPS/eip-721)
5. [EIP-1155: ERC-1155(Multi Token Standa)](https://eips.ethereum.org/EIPS/eip-1155)
