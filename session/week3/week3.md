id: html
summary: 프로젝트 요구사항에 알맞게 Smart Contract를 개발한다.
categories: Solidity
status: Published
feedback email: sinphi03@gmail.com
tags: Solidity, Blockchain, Smart Contracts
authors: Jiseop Shin
duration: 110

# Week 3: Smart Contract 개발 및 보안 사항 수정

## 세션 소개

Duration: 5

이번 세션에서는 Committee와 관련된 Smart Contract를 작성하고 이 과정에서 발생하는 온체인&오프체인 흐름을 이해합니다. 또한, Smart Contract 보안 취약점과 대응 전략을 학습을 진행합니다.

### 목차

#### 1. IPFS 구조 및 동작 원리

IPFS의 핵심 컴포넌트를 살펴보고 파일 추가, 조회 등의 동작 흐름과 주요 사용법을 실습합니다.

#### 2. Shamir's Secret Sharing(SSS) Algorithm

샤미르 비밀 공유의 수학적 원리를 다루고, Committee 환경에서 비밀 분할, 복원 절차와 안전성 고려사항을 확인합니다.

#### 3. Committee Manager 구현

Shard 제출, 위원회 관리 등 `CommitteeManager`에 필요한 기능을 설계하고 Smart Contract를 구현합니다.

#### 4. 테스트 및 배포

수정한 내용을 바탕으로 테스트 및 배포를 진행합니다.

#### 5. Ethernaut로 취약점 학습

Ethernaut 레벨을 직접 플레이하면서 자주 등장하는 온체인 취약점 패턴을 익히고, 이를 현재 프로젝트 컨트랙트에 어떻게 적용할지 정리합니다.

## IPFS 구조 및 동작 원리

Duration: 20

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

DHT(Distributed Hash Table)는 분산 네트워크 환경에서 데이터를 효율적으로 저장하고 검색하기 위한 해시 테이블 구조입니다. libp2p에서 구현한 Kademlia 변형을 사용하며, 각 노드는 특정 CID 또는 피어 ID의 프리픽스를 기반으로 라우팅 테이블(bucket)을 유지합니다. 노드는 자신이 보유한 블록의 `provider record`를 DHT에 등록하고, 다른 노드는 이 테이블을 순회하여 해당 CID를 제공할 수 있는 피어를 발견합니다.

라우팅은 두 단계로 진행됩니다.

1. **탐색:** 질의 노드는 CID를 해시한 키와 XOR 거리가 가까운 피어를 재귀적으로 찾으며 라우팅 테이블을 최신 상태로 유지합니다.
2. **제공자 조회:** 탐색된 피어에게 `FIND_PROVIDERS` 메시지를 보내 원하는 CID를 제공할 수 있는 피어 리스트와 주소를 받습니다.

IPFS에서 사용하는 DHT에 대해서는 [공식 문서](https://docs.ipfs.tech/concepts/dht/#kademlia)에 잘 정리돼 있습니다.

### IPFS 사용하기

#### 실행과정

IPFS 실행하는 과정은 다음과 같습니다.

1. IPFS 노드 설치: 먼저 사용할 컴퓨터 또는 장치에 IPFS 노드를 설치해야 합니다. CLI 환경이라면 [Kubo](https://docs.ipfs.tech/install/command-line/)를, Desktop 환경에서 사용하고 싶으면 [Desktop App](https://docs.ipfs.tech/install/ipfs-desktop)을 OS에 맞게 설치합니다.

2. IPFS 노드 실행: `ipfs init`으로 로컬 리포를 만들고, `ipfs daemon`으로 노드를 실행해 네트워크에 참여합니다. 브라우저용 대시보드와 로컬 게이트웨이도 확인할 수 있습니다.

3. 파일 추가: 파일을 IPFS에 추가하기 위해 `ipfs add` 명령을 사용합니다. 이 명령을 사용하면 지정된 파일을 IPFS 네트워크에 추가하고 해당 파일의 해시 값을 반환합니다. 예를 들어, ipfs add example.txt 명령을 사용하여 “example.txt”라는 파일을 추가할 수 있습니다.

4. 해시 값 확인: 출력된 CID가 곧 파일의 식별자입니다. 같은 내용이면 CID가 동일합니다. `ipfs cat <CID>` 으로 내용 조회가 가능합니다.

5. 파일 공유: CID만 알면 전 세계 어디서든 접속 가능하며, 게이트웨이를 통해 `https://ipfs.io/ipfs/<CID>` 같은 URL로도 접근할 수 있습니다. 영구 보존을 원하면 pin 하거나 핀닝 서비스(web3.storage 등)를 사용합니다.

<aside class="positive"><p><strong>TIP</strong>
CLI에서는 <code>ipfs dht findpeer {PeerID}</code> 또는 <code>ipfs dht findprovs {CID}</code> 명령으로 같은 과정을 추적할 수 있습니다. provider record에는 TTL이 있어 주기적으로 재등록(refresh)을 해야 하며, 프라이빗 네트워크를 구성할 때는 부트스트랩 노드 리스트를 고정해 라우팅을 안정화시키는 것이 중요합니다.</p></aside>

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

Kubo는 Go로 작성된 IPFS의 가장 널리 쓰이는 구현체이며, CLI/RPC API/게이트웨이를 제공합니다. 과거 이름은 **go-ipfs**입니다.

**저장소 초기화**

Kubo는 모든 설정과 내부 데이터를 저장소라는 디렉터리에 저장합니다. Kubo를 처음 사용하기 전에 저장소를 초기화해야 합니다.

```bash
ipfs init
```

다음과 같은 형태로 출력되면 됩니다.

![ipfs cli init](./images/ipfs_cli_init.png)

**노드를 온라인으로 전환**

노드를 온라인으로 전환하고 IPFS 네트워크와 상호 작용합니다. 다른 터미널 창을 열어 IPFS 데몬을 시작합니다.

```bash
ipfs daemon
```

원래 터미널 창으로 돌아가 ipfs swarm peers피어의 IPFS 주소를 확인합니다.

```bash
ipfs swarm peers
```

**파일 가져오기**

다음의 명령어를 입력하여 우주선 발사 사진을 가져옵니다. `QmSgvgwxZGaBLqkGyWemEDqikCqU52XxsYLKtdy3vGZ8uq`는 [공식 문서](https://docs.ipfs.tech/how-to/command-line-quick-start/#take-your-node-online)에서 소개된 CID입니다.

```bash
 ipfs cat /ipfs/QmSgvgwxZGaBLqkGyWemEDqikCqU52XxsYLKtdy3vGZ8uq > ~/Desktop/spaceship-launch.jpg
```

**파일 업로드**

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

## Shamir's Secret Sharing Algorithm

Duration: 15

샤미르 비밀 공유는 1979년 Adi Shamir의 논문 [How to Share a Secret](https://dl.acm.org/doi/pdf/10.1145/359168.359176)에서 제안된 `(k, n)` 임계값 기반 분산 방법(threshold Scheme)입니다. “k개 이상이면 비밀을 복원하고, k-1개 이하로는 아무 정보도 얻지 못한다”는 목표를 수학적으로 보장합니다.

### 왜 SSS가 필요한가

- 단일 노드가 DEK를 보관하면 단일 장애 지점(Single Point of Failure)이 되지만, 단순 복제는 유출 가능성을 높입니다.
- 논문에서 제시한 대로 `n = 2k - 1`로 구성하면 최대 `k-1`개의 조각이 파괴돼도 복원이 가능하며, 공격자가 `k-1`개를 탈취해도 비밀은 완전히 무작위로 남습니다.
- 기업 서명·위원회 의사결정처럼 **안전성과 편의를** 동시에 확보해야 하는 환경에서 다수결 규칙을 자연스럽게 구현할 수 있습니다.

### 알고리즘

1. **유한체 선택:** 비밀 `S`와 조각 수 `n`보다 큰 소수 `p`를 골라 Fₚ(정수 모듈러 p)를 작업 공간으로 사용합니다.
2. **다항식 구성:** 무작위 계수 `a₁ … a_{k-1}`을 균등 분포에서 뽑고 `f(x) = S + a₁x + a₂x² + … + a_{k-1}x^{k-1}`을 정의합니다. 상수항이 곧 S입니다.
3. **조각 생성:** 서로 다른 인덱스 `xᵢ ∈ {1,…,n}`에 대해 `yᵢ = f(xᵢ) mod p`를 계산합니다. 조각은 `(xᵢ, yᵢ)` 쌍이며 인덱스가 반드시 포함됩니다.
4. **복원:** 임의의 `k`개 조각으로 라그랑주 보간을 수행해 `f(0)`을 계산하면 원래 비밀 `S`를 얻습니다.

### 정보 이론적 안전성

- `k-1`개의 조각을 알고 있어도 가능한 비밀 후보 `S'`(0 ≤ `S'` < `p`)마다 정확히 하나의 차수 `k-1` 다항식이 존재합니다.
- 계수는 균등 난수이므로 모든 다항식이 같은 확률로 생성됩니다. 공격자가 관찰한 조각은 어떤 `S'`에도 동일하게 부합하기 때문에 비밀은 완전히 무작위로 남습니다.

### 구현과 관련된 이슈

- `p ≥ n + 1`이어야 서로 다른 인덱스를 안전하게 할당할 수 있습니다.
- 긴 비밀은 블록 단위로 나누어 각각 SSS를 적용하면 Multi Precision 연산 부담을 줄일 수 있습니다.
- 다항식 평가/보간은 O(n log² n) 알고리즘도 있지만, 일반적인 환경에서는 O(n²) 구현으로도 충분합니다.

### Committee 환경에서의 분할 & 복원 절차

1. `n`, `k`, `p`를 결정하고 무작위 다항식을 생성합니다. 이번 세션에서는 n은 5, k는 3으로 잡습니다.
2. 각 `(xᵢ, yᵢ)` 조각에 `runNonce`, 만료 시간, codeId 같은 메타데이터를 붙여 JSON/CBOR로 직렬화합니다.
3. 조각을 각 위원회 멤버의 공개키로 암호화한 뒤 IPFS에 업로드하고 CID를 확보합니다.
4. 온체인에서는 조각 본문 대신 `runNonce`, CID, 제출자 주소만 기록합니다(`ShardSubmitted` 이벤트 참고).
5. 복원 시에는 동일 `runNonce`를 가진 `k`개 이상 조각을 모아 아래의 식으로 `f(0)`을 계산한 뒤, 복호화 및 `codeHash` 검증을 수행합니다.

![lagrange](./images/lagrange.png)

#### TypeScript 보는 흐름

아래의 코드는 SSS를 적용하고 IPFS를 이용해 SSS를 적용한 코드입니다.

```ts
import { randomBytes, createHash } from "crypto";
import { split, combine } from "shamirs-secret-sharing";
import { create as createIpfsClient } from "ipfs-http-client";

const ipfs = createIpfsClient({ url: "https://storacha.network/" });

type ShardEnvelope = {
  runNonce: `0x${string}`;
  committeeId: string;
  expiresAt: number;
  cid?: string;
  data: Buffer;
};

const dek = randomBytes(32); // 실행 1회에 사용될 AES-256 키
const quorum = { shares: 5, threshold: 3 };
const runNonce = `0x${createHash("sha256")
  .update(randomBytes(32))
  .digest("hex")}`;

// 분할 + 메타데이터 부착 + IPFS 업로드
const shards: ShardEnvelope[] = split(dek, quorum).map((raw, idx) => ({
  runNonce,
  committeeId: `committee-${idx + 1}`,
  expiresAt: Math.floor(Date.now() / 1000) + 60 * 30,
  data: Buffer.from(raw),
}));

for (const shard of shards) {
  const payload = JSON.stringify({
    runNonce: shard.runNonce,
    committeeId: shard.committeeId,
    expiresAt: shard.expiresAt,
    data: shard.data.toString("base64"),
  });
  const { cid } = await ipfs.add(payload);
  shard.cid = cid.toString(); // ShardSubmitted 이벤트로 온체인에 기록
}

// 복원: threshold 개수의 CID만 가져와도 복호화 가능
const shardsForRecovery = await Promise.all(
  shards.slice(0, quorum.threshold).map(async (shard) => {
    const file = await ipfs.cat(shard.cid!);
    const parsed = JSON.parse(Buffer.from(file).toString("utf8"));
    return Buffer.from(parsed.data, "base64");
  })
);

const recoveredDek = combine(shardsForRecovery);
console.assert(dek.equals(recoveredDek), "복원 실패 시 위원회 응답 재요청");
```

## Committee Manager 구현

Duration: 25

Shard 제출, 위원회 관리 등 `CommitteeManager`에 필요한 기능을 설계하고 Smart Contract를 구현합니다. 프로젝트의 `apps/on-chain/contracts/CommitteeManager.sol`을 확인해주세요.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract CommitteeManager is AccessControl {

}
```

### 컨트랙트 뼈대 작성하기

`CommitteeManager.sol`는 위원회가 Shard를 제출하고 위원회 임계치 설정, 위원회 멤버 추가/삭제 등의 기능이 필요합니다. 또한, 이를 위해 역할 기반으로 권한을 관리합니다. 아래와 같이 Contract을 작성해주세요.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract CommitteeManager is AccessControl {

    /* ========= 전역 변수 ========= */
    bytes32 public constant COMMITTEE_ROLE = keccak256("COMMITTEE_ROLE");

    // TODO Implement status

    constructor(address licenseManager_) {
        // TODO Implement constructor
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

    /* ========= 관리자 기능 ========= */

    // 위원회 임계치 설정. 관리자만 가능
    function setCommitteeThreshold(
        uint256 newThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO Implement committee threshold setter
    }

    // 위원회 멤버 추가. 관리자만 가능
    function addCommittee(
        address newCommittee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO Implement committee adder
    }

    // 위원회 멤버 제거. 관리자만 가능
    function removeCommittee(
        address removalCommittee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // TODO Implement committee remover
    }

    // 위원회가 shard CID(IPFS)를 제출. 온체인에는 카운트만 저장, CID는 이벤트로 공개
    function submitShard(
        uint256 codeId,
        address requester,
        bytes32 runNonce,
        string calldata shardCid
    ) external onlyRole(COMMITTEE_ROLE) {
        // TODO Implement Shard Submission Logic
    }
}

```

#### 역할 기반 관리

`CommitteeManager`는 `AccessControl`을 상속해 역할 기반 권한 관리를 사용합니다. `COMMITTEE_ROLE`이라는 역할을 추가해 위원회 여부를 확인할 수 있도록 합니다.

#### 사용자 정의 오류(Error)

[Solidity 0.8.4 이후에 추가된 기능](https://www.soliditylang.org/blog/2021/04/21/custom-errors/)으로, require, revert 구문과 함께 가스 효율적으로 오류를 발생시키는 방법입니다. error는 이름과 파라미터를 명시해서 더 구조적으로 에러를 처리합니다. 이번 세션에서는 `DuplicateShard`라는 에러를 정의해서 중복된 Shard를 제출하는 것을 방지하는데 사용합니다.

#### 이벤트

`ShardSubmitted`와 `ExecutionApproved`를 지원합니다. `ShardSubmitted`는 각 위원회가 Shard를 제출했을 때 발생하는 이벤트로 요청자가 오프체인에서 Shard제출 여부를 확인하기 위해 사용됩니다. `ExecutionApproved`는 모든 위원회에서 Shard를 제출했을 때 발생합니다. Shard는 `codeId`, `requester`로 구별됩니다. `runNonce`은 중복 실행 방지 및 상관관계 추적을 위한 용도입니다.

### 상태 및 생성자

상태 관련 변수와 생성자를 구현해봅시다.

#### 상태

필요한 상태는 다음과 같습니다.

```solidity
/* ========= 상태 ========= */

mapping(bytes32 => uint256) public shardCountForRun;
mapping(bytes32 => mapping(address => bool)) private hasSubmitted;
uint256 public committeeThreshold = 3;

//  라이선스 컨트랙트 읽기용
ILicenseManager public immutable licenseManager;
```

- `shardCountForRun`은 `(codeId, requester, runNonce)` 조합을 해시한 키 별로 제출된 shard 개수를 카운트합니다.
- `hasSubmitted`는 동일 위원이 중복 shard를 제출하지 않도록 추적합니다.
- `committeeThreshold`는 실행 승인을 위해 필요한 최소 위원 수입니다. 이번 세션에서는 5개의 위원회 중 3개의 위원회가 승인하면 복원할 수 있도록 구성하기 위해, 기본값은 3으로 설정했으며 관리자만 변경할 수 있습니다.
- `licenseManager`는 `LicenseManager`에 대한 읽기 전용 포인터로, 코드 존재 여부와 일시정지 상태를 검증합니다.

#### 생성자

```solidity
constructor(address licenseManager_) {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    licenseManager = ILicenseManager(licenseManager_);
}
```

생성자에서 `DEFAULT_ADMIN_ROLE`을 배포자에게 부여하고, 외부에서 전달 받은 `licenseManager` 주소를 immutable 변수에 저장합니다. 관리자 권한은 다음과 같은 기능에 적용됩니다.

- `setCommitteeThreshold`: 위원회 합의 임계값을 업데이트합니다. 0은 허용하지 않습니다.
- `addCommittee` / `removeCommittee`: 특정 주소에 `COMMITTEE_ROLE`을 부여하거나 회수합니다.

운영환경에서 최초 배포 후 다음 순서를 따라야 합니다.

1. `LicenseManager` 주소를 인자로 넘겨 `CommitteeManager`를 배포합니다.
2. `DEFAULT_ADMIN_ROLE` 보유자가 멤버 주소를 등록합니다.
3. 필요 시 `setCommitteeThreshold`를 호출해 요구 합의 인원 수를 설정합니다.

### 위원회 관리 함수

#### setCommitteeThreshold

```solidity
// 위원회 임계치 설정. 관리자만 가능
function setCommitteeThreshold(
    uint256 newThreshold
) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(newThreshold > 0, "threshold must be more then 0");
    require(newThreshold <= type(uint32).max, "threshold too large");
    committeeThreshold = newThreshold;
}
```

새로 설정할 임계치가 부절절한 값인지 확인하고 적절하다고 판단되면 설정합니다.

#### addCommittee

```solidity
// 위원회 멤버 추가. 관리자만 가능
function addCommittee(
    address newCommittee
) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(COMMITTEE_ROLE, newCommittee);
}
```

위원회 멤버에 추가하기 위해서 `COMMITTEE_ROLE`을 부여합니다. 요청한 사용자가 관리자인지 확인 후 부여합니다.

#### removeCommittee

```solidity
// 위원회 멤버 제거. 관리자만 가능
function removeCommittee(
    address removalCommittee
) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _revokeRole(COMMITTEE_ROLE, removalCommittee);
}
```

위원회 멤버를 제거하기 위해서 `COMMITTEE_ROLE`을 제거합니다. 요청한 사용자가 관리자인지 확인 후 부여합니다. 제거하려는 대상이 role이 부여되어 있는지 확인하는 로직은 `_revokeRole`내부에 구현되어 있습니다.

### Shard 제출 흐름

`submitShard`를 구현합니다. 아래와 같이 작성해주세요.

```solidity
// 위원회가 shard CID(IPFS)를 제출. 온체인에는 카운트만 저장, CID는 이벤트로 공개
function submitShard(
    uint256 codeId,
    address requester,
    bytes32 runNonce,
    string calldata shardCid
) external onlyRole(COMMITTEE_ROLE) {
    require(licenseManager.checkCodeExists(codeId), "code is not exist");
    require(licenseManager.checkCodeActive(codeId), "code is not active");

    bytes32 runKey = keccak256(
        abi.encodePacked(codeId, requester, runNonce)
    );
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
```

1. `COMMITTEE_ROLE`을 가진 계정만 호출이 가능합니다.
2. `LicenseManager`에 위임해 코드 존재 여부와 정지 상태를 검증합니다.
3. `(codeId, requester, runNonce)` 조합을 해시해 `runkey`를 만들고 제출 횟수를 1 증가시킵니다.
4. `hasSubmitted`를 먼저 확인해 위원이 동일 실행에 두 번 이상 제출하지 못하도록 합니다.
5. `ShardSubmitted` 이벤트에는 committee 주소, shard CID, 현재 카운트, 임계치가 함께 기록됩니다.
6. 카운트가 `committeeThreshold` 이상이 되면 `ExecutionApproved` 이벤트로 승인 상태를 알립니다.

<aside class="positive"><p><strong>오프체인 연동</strong></p>
<p><code>ShardSubmitted</code> 이벤트를 인덱싱하면 특정 실행 요청(runNonce)에 대해 누가 몇 번째로 shard를 업로드했는지 추적할 수 있습니다.</p>
<p><code>ExecutionApproved</code> 이벤트는 클라이언트가 shard 다운로드를 시작해도 된다는 신호로 활용합니다. 오프체인 서비스는 이벤트를 수신한 뒤 IPFS에서 shard를 내려받고, 위원회 멤버 서명을 검증한 뒤 복호화 절차를 진행합니다.</p>
<p>중복 제출 방지를 위해 Off-chain 레이어에서 <code>(committee, runNonce)</code> 중복 여부를 체크합니다.</p></aside>

### LicenseManager

실행 요청의 중복을 막기 위해 `RunRequested`에 runNonce를 추가해햐합니다. 다음과 같이 변경해주세요.

`LicenseManager.sol`의 `requestCodeExecution`

```solidity
// 실행 요청. 1회 소진 + 이벤트 발생
function requestCodeExecution(
    uint256 codeId,
    bytes32 runNonce,
    bytes calldata recipientPubKey
) external override {
    _requireCodeExists(codeId);
    require(!_codes[codeId].paused, "Code is paused");
    require(balanceOf(msg.sender, codeId) > 0, "Insufficient runs");
    uint256 expiry = _expiry[msg.sender][codeId];
    require(expiry == 0 || block.timestamp <= expiry, "License expired");

    // 1회 소진
    _burn(msg.sender, codeId, 1);

    emit RunRequested(
        codeId,
        msg.sender,
        runNonce,
        recipientPubKey,
        block.timestamp
    );
}
```

`ILicenseManager.sol`의 `RunRequested`와 `requestCodeExecution`

```solidity
// 코드 실행 요청
event RunRequested(
    uint256 indexed codeId,
    address indexed user,
    bytes32 indexed runNonce,
    bytes recipientPubKey,
    uint256 blockTimestamp
);

```

```solidity
    // 코드 실행 요청
    function requestCodeExecution(
        uint256 codeId,
        bytes32 runNonce,
        bytes calldata recipientPubKey
    ) external;
```

### 마무리

이제 CommitteeManager 컨트랙트 작성을 완료했습니다. 전체 코드는 다음과 같습니다.

```solidity
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

        bytes32 runKey = keccak256(
            abi.encodePacked(codeId, requester, runNonce)
        );
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
}
```

## 테스트 및 배포

Duration: 15

#### 1. `apps/on-chain` 디렉터리에서 종속성을 설치

```bash
cd apps/on-chain
npm install
```

#### 2. 테스트 스크립트 실행

`CommitteeManager.test.ts`에 테스트 스크립트가 작성되어 있습니다. 테스트 항목은 다음과 같습니다.

- 관리자만이 임계치와 위원회 구성을 변경할 수 있는지 확인
- `licenseManager.pauseCodeExecution` 이후 shard 제출이 거부되는지 확인
- 동일 runNonce에 대해 threshold 이상 shard가 모였을 때 `ExecutionApproved` 이벤트가 발생하는지 확인

테스트를 위해 다음의 명령어를 실행합니다.

```bash
npx hardhat test test/CommitteeManager.test.ts
```

#### 3. Sepolia 네트워크에 배포

Sepolia 네트워크에 배포하려면 아래 Ignition 명령을 순서대로 실행합니다. 반드시 `LicenseManager` 배포 후 `CommitteeManager`를 배포해야 합니다.

```bash
npx hardhat ignition deploy ignition/modules/LicenseManager.ts \
  --network sepolia

npx hardhat ignition deploy ignition/modules/CommitteeManager.ts \
  --network sepolia \
  --parameters '{ "CommitteeManagerModule": { "licenseManagerAddress": "${YOUR_LICENSE_MANAGER_CONTRACT_ADDRESS}" } }'
```

#### 5. 소스 코드를 검증

배포가 완료되면 Hardhat Verify를 사용해 소스 코드를 검증합니다.

```bash
npx hardhat verify \
  --network sepolia \
  ${YOUR_LICENSE_MANAGER_CONTRACT_ADDRESS} \
  "ipfs://base/{id}.json"

npx hardhat verify \
  --network sepolia \
  ${YOUR_COMMITTEE_MANAGER_CONTRACT_ADDRESS} \
  ${YOUR_LICENSE_MANAGER_CONTRACT_ADDRESS}
```

## Ethernaut를 통한 취약점 학습

Duration: 29

이번 단계에서는 OpenZeppelin이 운영하는 CTF(Capture The Flag) 스타일 학습 환경인 [Ethernaut](https://ethernaut.openzeppelin.com/)를 활용해 대표적인 온체인 취약점을 체험합니다. 직접 공격 트랜잭션을 만들어 레벨을 클리어한 뒤, 동일한 패턴을 우리 프로젝트 컨트랙트에 어떻게 적용하거나 예방할 수 있을지 기록합니다.

### 진행 방법

- **환경 준비:** Remix 또는 Hardhat 스크립트를 이용해 레벨 인스턴스를 배포하고, 메타마스크 테스트 지갑을 연결합니다.
- **가설 세우기:** 레벨 설명에서 요구하는 목표를 정리하고, 어떤 취약점 유형(재진입, delegatecall, 권한 착오 등)이 연관돼 있는지 추측합니다.
- **익스플로잇 구현:** 트랜잭션 시퀀스나 공격용 컨트랙트를 작성해 레벨을 클리어합니다. 실패 로그를 꼼꼼히 남기고, 스토리지/이벤트를 추적하며 원인을 분석합니다.
- **회고:** 취약점이 발생한 이유와 우리의 `LicenseManager`, `CommitteeManager`에 대응되는 부분을 비교해 보완 아이디어를 메모합니다.

### 권장 학습 루트

- **Fallback / Fallout:** 초기 권한 설정과 `receive()` 함수 오용으로 소유권이 탈취되는 시나리오입니다. AccessControl 초기화 로직을 재검토할 때 참고합니다.
- **Coin Flip / Telephone:** 온체인 난수 및 delegatecall 사용의 위험성을 다루며, 오프체인 의존 데이터를 어떻게 검증해야 하는지 생각하게 해 줍니다.
- **Token / Re-entrancy:** ERC 토큰 구현에서 흔히 나오는 정수 언더플로·재진입 문제를 실습합니다. `requestCodeExecution`처럼 토큰을 소각하는 함수와 비교해 봅니다.
- **Preservation / Elevator:** 스토리지 레이아웃과 라이브러리 호출을 악용하는 사례로, 업그레이더블 컨트랙트나 외부 라이브러리를 사용할 때의 주의점을 짚어볼 수 있습니다.

### 실습

이번 세션에서는 튜토리얼을 같이 진행합니다. Hello Ethernaut(https://ethernaut.openzeppelin.com/level/0)는 게임 전체 흐름과 콘솔 도구를 익히기 위한 튜토리얼 레벨입니다.

#### 1. 지갑 및 네트워크 세팅

- 데스크톱 브라우저에 MetaMask 확장 프로그램을 설치하고 새 지갑을 생성합니다.
- MetaMask 좌측 상단 네트워크 드롭다운에서 `Sepolia`를 선택합니다. Ethernaut는 `Sepolia`, `Optimism Sepolia`, `Arbitrum Sepolia`, `Localhost(31337)`를 지원하므로 필요하면 해당 네트워크를 추가 등록한 뒤 전환할 수 있습니다.
- 상단 바의 `Connect wallet` 버튼으로 사이트와 지갑을 연결하고, 잔액이 없다면 공식 Sepolia Faucet(Alchemy, Infura, QuickNode 등)에서 테스트 ETH를 요청합니다.

#### 2. 브라우저 콘솔 열기

macOS의 경우 `Shift+Cmd+I`, Windows의 F12로 콘솔을 열고, 최초 메시지에 표시되는 `player` 주소를 확인합니다.

언제든지 `player`를 입력해 현재 플레이어 주소를 확인할 수 있고, `getBalance(player)`로 잔액을 조회할 수 있습니다. Chrome 62+에서는 `await getBalance(player)`를 사용하면 `Promise`를 펼치지 않아도 됩니다.

#### 3. 레벨 인스턴스 생성

`Get new instance` 버튼을 클릭하고 MetaMask 트랜잭션을 승인합니다. 이 과정에서 `Instance.sol`이 선택한 네트워크에 새로 배포됩니다. 배포가 끝나면 콘솔에 인스턴스 주소와 `contract` 헬퍼가 자동으로 출력됩니다.

문제 발생 시 `Reset instance`로 기존 인스턴스를 폐기하고 재배포할 수 있습니다.
![ethernaut instance](./images/ethernaut_instance.png)

#### 4. 도움말 및 메인 컨트랙트 확인

`help()` 명령으로 Ethernaut가 제공하는 콘솔 헬퍼 목록을 확인합니다.
![ethernaut help](./images/ethernaut_help.png)

`ethernaut`를 입력하면 게임의 메인 컨트랙트 `Ethernaut.sol`에 접근할 수 있습니다.
![ethernaut ethernaut](./images/ethernaut_ethernaut.png)

`contract`를 입력하면 게임의 발급받은 컨트랙트 `Instance.sol`에 접근할 수 있습니다.
![ethernaut ethernaut](./images/ethernaut_contract.png)

#### 5. Hello Ethernaut 컨트랙트 탐험

- 콘솔에 자동으로 주입된 `contract` 객체가 나만의 `Instance` 컨트랙트입니다. `await contract.info()`를 입력하면 다음 단계 안내가 나오고, 지시에 맞춰 체인처럼 함수를 따라가면 됩니다.

![ethernaut soution](./images/ethernaut_solution.png)

#### 6. **인스턴스 제출**

모든 단계를 마쳤다면 페이지 하단의 `Submit instance` 버튼을 눌러 Ethernaut 메인 컨트랙트에 결과를 전송합니다.

![ethernaut done](./images/ethernaut_done.png)

![ethernaut code](./images/ethernaut_code.png)

위 과정을 통해 콘솔 헬퍼 사용법, 인스턴스 생성/제출 플로우, 그리고 단순한 읽기·쓰기 호출을 모두 체험할 수 있습니다. 이후 레벨도 동일한 UX를 따르므로 이 실습을 완전히 익혀 두면 Ethernaut 전반과 실제 스마트컨트랙트 디버깅 과정이 훨씬 수월해집니다.

## 축하합니다

Duration: 1

축하합니다! 성공적으로 License 관련 컨트랙트를 작성하고 IPFS에 대해 익혔습니다. 다음 시간에는 위원회 관련 컨트랙트 개발과 기존 컨트랙트에서 보안할 점을 확인하도록 하겠습니다.

### 도움이 될 만한 자료

1. [Lit Protocol](https://www.litprotocol.com/): Lit Protocol은 key와 secrets을 관리하기 위한 탈중앙화 네트워크 프로토콜입니다. 본 프로젝트는 이러한 Lit Protocol에서 영감을 받아, DKG(Distributed Key Generation) 개념을 기반으로 이를 솔리디티로 구현하였습니다. Lit Protocol에 대한 보다 자세한 내용은 [공식 백서](https://github.com/LIT-Protocol/whitepaper)를 참고하시기 바랍니다.
2. [IPFS Concepts](https://docs.ipfs.tech/concepts/): [IPFS](https://github.com/ipfs)는 Web3 생태계에서는 중대형 오픈소스 프로젝트입니다. 또한, 이에 대한 구현 원리를 이해하기 위해서 Merkle DAG, UnixFS, DHT, Pub/Sub 모델(Gossip), BitSwap 등 Computer Sicence 관련 배경지식을 많이 요구합니다.
3. [proto school](https://proto.school/tutorials): IPFS나 filecoin과 같은 분산형 웹 스토리지 시스템에 관한 기술 튜토리얼입니다.
4. [Sharmir’s Secret Sharing](https://medium.com/@sineta01/sharmirs-secret-sharing%EC%9D%84-%EC%82%B4%ED%8E%B4%EB%B3%B4%EC%9E%90-eca906e17a4c): 샤미르 분산 공유(Sharmir’s Secret Sharing)에 관한 설명입니다.

### 참고 자료

1. [openzeppelin의 contract관련 개발 문서](https://docs.openzeppelin.com/contracts)
2. [ethernaut](https://ethernaut.openzeppelin.com)

```

```
