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

#### 4. IPFS 사용법 익히기

IPFS에 대해 알아보고 사용법을 익힙니다. 이를 바탕으로 파일 업로드/다운로드기능을 구현합니다.

#### 5. 위원회 동작 방식의 이해

사전에 작성되어 있는 코드를 참고하여 위원회 서버의 동작 방식을 이해합니다.

## 요구사항 정리

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
- 실행은 오프체인 환경(안전한 장소)에서 이루어지며, 실행 후 민감한 데이터는 즉시 삭제합니다.(낮은 우선 순위)
- 위원회 응답이 부족해도 서비스가 중단되지 않도록 여유 있게 구성합니다.(낮은 우선 순위)

## 코드 뼈대 작성

본격적으로 코드를 작성해봅시다. 앞서 살펴보았던 기능을 구현하기 위해 Contract뿐만 아니라 코드를 배포하고 실행하기 위한 UI, key를 관리하기 위한 위원회 server등 다양한 요소가 필요합니다. Contract에 집중하기 위해 Contract를 제외한 부분의 코드는 사전에 작성되어 있습니다. 사전에 작성된 코드를 받아주도록 합시다.

```bash
git clone https://github.com/HYBLOCK-LAB/Revoka.git
```

git이 설치가 안되어 있다면 [여기](https://github.com/HYBLOCK-LAB/Revoka)를 방문하여 zip파일로 다운받아주세요.

프로젝트는 모노레포로 구성되어 있으며 폴더 구조는 다음과 같습니다.

```text
├── apps/ # 핵심 애플리케이션 모음
│ ├── committee/
│ │ └── ... # 키 관리를 위한 위원회 서버(off-chain)와 관련된 코드
│ ├── contracts/ # 프로젝트의 핵심 규칙과 데이터를 담은 On-chain 코드
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

프로젝트의 `apps/contracts/contracts`를 확인해주세요. `interfaces`폴더와 `CommitteeManager.sol`, `LicenseManager.sol`파일을 확인할 수 있을 겁니다.

**Interface**는 특정 스마트 컨트랙트와 상호작용하기 위한 함수들의 명세서 또는 설계도입니다. 컨트랙트가 어떤 함수들을 가지고 있는지 알려주지만, 실제 코드는 포함하지 않습니다.
interface는 이미 On-chain에 배포된 다른 컨트랙트의 함수를 내 컨트랙트에서 호출하고 싶을 때 사용합니다. 상대방 컨트랙트의 전체 소스코드를 다 가져올 필요 없이, 인터페이스만 가지고 있으면 해당 컨트랙트의 함수를 안전하고 효율적으로 호출할 수 있습니다. 이는 코드의 크기를 줄여 가스비를 절약할 수 있습니다. 또한, Interface에 맞게 Contract가 구성되므로 Contract에 어떤 기능이 있는지 쉽게 확인이 가능합니다.

기능을 구현하기 위해서 크게 두가지 기능이 필요합니다. 먼저, License를 실제로 발급하고 소비하는 License를 관리하는 Contract가 필요합니다. 두 번째로, 위원회에서 사용자에 대한 승인을 하고 분할된 키를 IPFS에 배포하기 위해 워원회를 관리하는 Contract가 필요합니다. 두 개의 Contract를 분리해서 작성할 예정입니다.

#### Contract에 필요한 사항들

Contract를 구현하기 위해 필요한 사항을 정리해봅시다.

- contract는 code에 대한 정보를 알아야 합니다.
  - 등록된 code의 메타데이터와 등록된 code의 개수(다음에 등록할 코드에 대한 번호 부여 용도)
  - code의 owner는 누구인지
- code를 등록할 수 있어야 합니다. 등록을 하면 owner로 설정되어야 합니다.
- owner는 라이센스 토큰 발급할 수 있어야 합니다.
- owner는 모든 코드 실행 요청을 중단, 허용할 수 있어야 합니다.
- 라이센스 토큰으로 code실행을 위한 key를 요청할 수 있어야합니다. 이 요청을 위원회에 이벤트로 전달해야 합니다.

이를 바탕으로 LincenseManager의 interface를 작성해줍시니다. 아래의 코드를 `ILicenseManager.sol`에 붙여넣어 주세요.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

interface ILicenseManager is IERC1155, IAccessControl {
    /**
     * 상태 조회
     *
     */

    // code를 조회하는 함수 (codeHash, cipherCid, paused, exists)
    function getCode(
        uint256 codeId
    ) external view returns (bytes32, string memory, bool, bool);

    // 코드 소유자 조회
    function getCodeOwner(uint256 codeId) external view returns (address);

    // 계정별 라이선스 만료시간 조회
    function getLicenseExpiry(
        address account,
        uint256 codeId
    ) external view returns (uint256);

    // 다음에 등록할 코드 ID 조회
    function getNextCodeId() external view returns (uint256);

    /**
     * Event
     *
     */

    // 코드 등록
    event CodeRegistered(
        uint256 indexed codeId,
        bytes32 codeHash,
        string cipherCid,
        address indexed publisher
    );

    // 코드 갱신
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
        bytes32 indexed runNonce,
        bytes recipientPubKey,
        uint256 blockTimestamp
    );

    /**
     * 외부 로직
     */

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

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
        bytes calldata recipientPubKey,
        bytes32 runNonce
    ) external;

    /**
     * View Helper
     *
     */

    function checkCodeActive(uint256 codeId) external view returns (bool);

    function checkCodeExists(uint256 codeId) external view returns (bool);

    function getCodeInfo(
        uint256 codeId
    ) external view returns (bytes32, string memory, bool, bool);

    function uri(uint256 id) external view returns (string memory);
}
```

#### 상태 조회

**code**

code를 조회하는 함수입니다. contract 내부에서 관리되는 `codeId`를 통해 조회할 수 있습니다.
반환값

- codeHash: 코드를 keccak256로 해시값.
- cipherCid: 암호화된 코드의 IPFS CID.
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
하지만 다른 컨트랙트는 해당 변수가 public인지 아닌지 알 방법이 없습니다. 이를 <strong>interface</strong>를 통해서 알 수 있습니다. 따라서 함수의 이름, 파라미터, 반환값을 동일하게 interface에 명시해주어야 합니다.</p></aside>

#### 이벤트

함수와 구분짓기 위해 이벤트 명은 **명사 + 과거분사** 형태로 작성하였습니다. 이는 (Coinbase의 스타일 컨벤션)[https://github.com/coinbase/solidity-style-guide]이기도 합니다.

**CodeRegistered**

새로운 코드가 등록되었을 때 발생하는 이벤트입니다. 이 시점부터 codeId가 유효해집니다.

파라미터

- codeId: 새롭게 부여된 코드 id.
- codeHash: 암호화된 코드의 keccak256 해시값.
- cipherCid: 암호화된 코드 바이너리의 IPFS CID.
- publisher: 배포자의 주소.

**CodeUpdated**

기존 코드나 메타데이터(CID)가 갱신되었을 때 발생하는 이벤트입니다. 핫픽스, 새 빌드 배포 시 기록됩니다.

파라미터

- codeId: 새롭게 부여된 코드 id.
- codeHash: 암호화된 코드의 keccak256 해시값.
- cipherCid: 암호화된 코드 바이너리의 IPFS CID.
- publisher: 배포자의 주소.

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

#### 외부 로직

`supportsInterface(bytes4 interfaceId) → bool`

이 컨트랙트가 특정 인터페이스를 지원하는지 반환합니다.

`registerCode(bytes32 codeHash, string cipherCid) → uint256 codeId`

신규 코드를 등록하고, 호출자를 해당 코드의 소유자로 설정합니다.

`updateCodeMetadata(uint256 codeId, bytes32 newCodeHash, string newCipherCid)`

코드의 해시/CID를 갱신합니다.

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

1.  AccessControl

AccessControl은 스마트 컨트랙트의 함수 호출 권한을 “역할(Role)” 단위로 관리할 수 있게 해주는 모듈입니다. 역할은 bytes32 식별자(e.g. keccak256("MINTER_ROLE"))로 정의하며, 해당 역할을 가진 주소만 특정 함수(또는 로직)를 실행할 수 있도록 제한합니다. 이를 통해 관리자, 민터, 버너 등 업무/권한 분리가 명확해지며, 권한 변경이 필요할 때도 역할 부여/회수만으로 안전하게 운용할 수 있습니다.

2. ERC1155

EIP-1155 멀티 토큰 표준의 OpenZeppelin 기본 컨트랙트 구현을 가져옵니다. 하나의 컨트랙트에서 여러 토큰 ID를 관리하며, 각 ID는 “대체 가능(FT)처럼 수량형” 또는 “대체 불가능(NFT)처럼 1개”로 사용할 수 있습니다. EIP-1155에 대해서는 밑에서 알아봅시다.

### 토큰(Token)

스마트 컨트랙트에서 토큰(Token)은 블록체인 위에서 자산이나 권리를 표현하는 기본적인 단위입니다. 이를 통해 화폐, 포인트, 게임 아이템, 예술 작품 등 다양한 가치를 디지털화할 수 있습니다. 이더리움에서는 토큰의 규격을 표준으로 정의해 두었으며, 이를 ERC라고 부릅니다. ERC는 "Ethereum Request for Comment"의 약자로, 누구나 같은 규칙에 맞춰 토큰을 만들고 사용할 수 있도록 합니다. 가장 널리 알려진 표준은 ERC-20, ERC-721, 그리고 ERC-1155입니다.

#### ERC-20

ERC-20은 **대체 가능 토큰(fungible token)**, 즉 서로 동일한 가치를 가진 토큰을 정의한 표준입니다. 예를 들어, 1개의 ERC-20 토큰은 다른 1개의 ERC-20 토큰과 완전히 같은 가치를 가집니다. 이러한 특성 때문에 ERC-20은 주로 **교환 가능하고 분할 가능한 자산**을 표현하는 데에 사용됩니다. 예를 들어 10개의 토큰이 있다면 이를 5개와 5개로 나누거나 3개와 7개로 나눌 수 있으며, 서로 교환해도 가치에 차이가 없습니다. 실제로 USDT, USDC와 같은 스테이블 코인들이 ERC-20을 기반으로 만들어졌습니다. 이 표준을 따르면 잔액을 확인하거나 전송을 요청하는 등의 기본적인 기능을 동일하게 구현할 수 있기 때문에, 다양한 지갑이나 거래소에서 호환성이 보장됩니다.

#### ERC-721

ERC-721은 **대체 불가능 토큰,** 즉 NFT(Non-fungible token)를 정의한 표준입니다. ERC-20과 달리 ERC-721 토큰은 각각 고유한 식별자를 가지며, 동일한 가치를 가질 수 없습니다. 예를 들어, 하나의 그림 파일을 나타내는 NFT와 또 다른 그림 파일을 나타내는 NFT는 서로 다르고 교환 불가능합니다. 따라서 ERC-721은 디지털 예술품, 수집품, 게임 아이템, 부동산 토큰화 등 **개별 자산의 고유성을 표현해야** 하는 경우에 활용됩니다. 대표적으로 CryptoKitties와 같은 게임의 아이템, 그리고 Bored Ape Yacht Club과 같은 예술 NFT 프로젝트들이 ERC-721 표준을 따릅니다. 이 표준에서는 누가 특정 NFT를 소유하고 있는지 확인하거나, NFT의 소유권을 다른 사람에게 이전하거나, 토큰에 연결된 메타데이터(이미지, 설명 등)에 접근하는 기능을 제공합니다.

#### ERC-1155

ERC-1155는 ERC-20과 ERC-721의 장점을 결합한 멀티 토큰 표준입니다. 하나의 컨트랙트에서 여러 종류의 토큰을 동시에 관리할 수 있으며, 대체 가능 토큰과 대체 불가능 토큰을 모두 발행할 수 있습니다. 예를 들어 게임에서 흔히 사용되는 구조를 생각해 보면, 일반적인 소비형 아이템인 ‘물약’은 ERC-20처럼 동일한 성격을 가진 대체 가능 토큰으로 표현할 수 있고, 유일한 전설 무기는 ERC-721처럼 고유한 NFT로 표현할 수 있습니다. ERC-1155를 이용하면 이 모든 자산을 하나의 컨트랙트에서 관리할 수 있고, 여러 개의 토큰을 한 번에 전송할 수도 있기 때문에 가스 비용을 절감할 수 있습니다. 이러한 효율성 때문에 메타버스, 게임, 복합 자산 플랫폼에서 널리 사용되고 있습니다. 이번에 만들 라이센스 토큰도 ERC-1155 기반으로 만듭니다.

### contructor와 전역변수

작성된 contract에 contructor와 전역변수를 정의해봅시다.

### 기능에 따른 함수

작성된 contract에 함수의 뼈대를 작성해봅시다. 함수명, 파라미터, 반환값 등은 ILicenseManager와 동일하게 작성하면 됩니다.

## 스마트 컨트랙트 작성

## IPFS 사용법 익히기

## 축하합니다
