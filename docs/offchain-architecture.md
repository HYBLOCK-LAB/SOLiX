# SOLiX 오프체인 아키텍처

경량화를 최우선으로 설계한 두 개의 어플리케이션(`committee`, `license-web`)과 운영에 필요한 인프라 구성 요소를 정리합니다. 모든 구성 요소는 SOLID 원칙을 지키며 단일 책임에 집중하도록 나누었습니다.

## 1. Committee 서비스

- **역할**: 온체인 이벤트 구독 → 샤드 집계 → 임계치 도달 시 컨트랙트 승인 호출
- **스택**
  - Node.js + Fastify (HTTP API)
  - viem (온체인 이벤트 구독 및 트랜잭션 송신)
  - Redis + BullMQ (조각 저장 및 승인 워커)
  - Web3.Storage 업로드는 필요 시 토큰만 주입하면 활성화

### 폴더 구조

```
apps/committee/src
├── application          # 유스케이스/워커
├── config               # 환경변수 정의
├── domain               # 엔티티, 리포지터리, 서비스 인터페이스
├── infrastructure       # Redis, Blockchain, Queue, Evidence 어댑터
├── interfaces           # HTTP 계층(Fastify)
└── shared               # 로거 등 공용 유틸
```

- `main.ts`에서 모든 의존성을 조립합니다.
- `RunApprovalQueue`는 BullMQ를 이용해 임계치 달성 시 단일 잡만 처리하며, `RunApprovalWorker`가 실제 `approveExecution`를 호출합니다.
- 환경 변수는 `src/config/env.ts`에서 `zod`로 검증합니다.

### 주요 엔드포인트

- `POST /shards` : `runId`, `submitter`, `encryptedPieceCid`, `sig`를 받아 Redis에 저장하고 임계치 도달 시 큐에 작업을 추가
- `GET /runs/:runId` : 수집된 조각 수/임계치/승인 상태 조회
- `GET /health` : 단순 헬스 체크

### 환경 변수 (`.env.committee`)

```
PORT=4000
RPC_URL=https://...
CHAIN_ID=11155111
CONTRACT_ADDRESS=0x...
OPERATOR_PK=0x... # 위원회 운영자 프라이빗 키
REDIS_URL=redis://redis:6379
RUN_TTL_SECONDS=86400
WEB3_STORAGE_TOKEN= # 선택 항목
```

## 2. License 웹 애플리케이션

- **역할**: 배포자/사용자 모두를 위한 단일 UI
  - 배포자: 코드 등록, 메타데이터 갱신, 라이선스 발급, 일시정지
  - 사용자: 내 라이선스 확인, 실행 요청
- **스택**
  - Next.js (App Router)
  - wagmi + RainbowKit + viem
  - TailwindCSS v4
  - date-fns (만료일 표시)

### 폴더 구조

```
apps/web/src
├── app                 # Next.js 라우팅/Providers
├── components          # 공용 UI
├── features
│   └── license-manager
│       ├── abi.ts
│       ├── constants.ts
│       ├── components
│       ├── hooks
│       ├── services        # encryption, artifact orchestration
│       └── utils
└── lib
    ├── env.ts          # NEXT_PUBLIC_* 환경 변수 검증
    └── wagmi/config.ts # 체인/지갑 설정
```

- `DashboardTabs`로 배포자/사용자 도구를 구분
- `useLicenseManagerWrite` 훅이 트랜잭션 흐름(전송 → Receipt)을 조율
- `services/encryption`이 AES-GCM 암호화를 담당하고, `services/artifact`가 암호문 생성 → 업로드 → CID 확보까지의 파이프라인을 조립
- Next API 라우트(`/api/storage/upload`)가 Helia 기반 CID 생성과 Storacha 업로드를 담당하며, 클라이언트는 브라우저에서 암호화된 바이트만 전송

#### 코드 업로드 파이프라인

1. 사용자가 코드 파일(최대 256MB)을 선택하면 브라우저에서 AES-GCM(256-bit)으로 내용을 암호화하고 keccak256 해시를 계산합니다. 키와 IV는 16진수로 반환되어 다운로드와 별도로 보관할 수 있습니다.
2. 암호문은 바이너리 그대로 FormData에 담겨 Next API(`/api/storage/upload`)로 전달됩니다. 이 경로는 단일 책임 원칙에 맞게 암호화 로직과 분리되어 있으며, 업로드 처리만 수행합니다.
3. 서버 측에서는 Helia + UnixFS를 사용해 암호문을 DAG에 추가하고 CID를 계산합니다. 개발(로컬) 환경에서는 여기서 흐름이 종료되며 Helia 노드에 암호문 블록이 남습니다.
4. 배포(Production) 환경이라면 동일한 암호문을 CAR로 패킹(ipfs-car) 후, Helia에서 얻은 CID와 일치하는지 검증합니다. 검증이 통과하면 Storacha(w3up) API에 CAR를 업로드하여 고정된 CID로 영구 보관합니다.
5. 클라이언트는 Helia/Storacha 결과로부터 `cipherCid`, AES 키, IV를 상태에 저장하고, 트랜잭션 전송 시 이 메타데이터를 사용합니다.

암호화된 코드와 키는 온체인에 직접 저장되지 않으므로, 운영자는 RegisterCodeCard에서 노출되는 키/IV를 별도로 안전하게 보관해야 합니다.

### 필요한 환경 변수 (`.env.license`)

```
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_NAME=SOLiX Devnet
NEXT_PUBLIC_CHAIN_RPC_URL=https://...
NEXT_PUBLIC_CHAIN_SYMBOL=ETH
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_ID= # WalletConnect project id
NEXT_PUBLIC_STORAGE_MODE=local # 또는 production
STORACHA_AGENT_EXPORT= # production + Storacha 업로드 시 필수 (서버 전용, Base64/JSON)
```

## 3. Docker 및 실행

루트의 `docker-compose.yml`은 Redis, committee, license-web을 한 번에 띄웁니다. 가스리스 릴레이가 필요하면 `relayer` 서비스 섹션을 해제하고 별도 Dockerfile을 추가하세요.

### committee 빌드/실행

```bash
docker compose up --build committee
```

### license 웹 빌드/실행

```bash
docker compose up --build license-web
```

### 로컬 개발

```bash
cd apps/committee
npm install
npm run dev

cd ../web
npm install
npm run dev
```

## 4. 연계 흐름

1. 컨트랙트에서 `RunRequested` 이벤트 발생
2. Committee가 viem으로 이벤트 구독 → Redis에 `run:{runId}` 레코드 생성
3. 위원이 `POST /shards`로 조각 제출
4. BullMQ worker가 임계치 도달 시 조각 묶음을 확인 후 `approveExecution(runId, pieces[])` 호출
5. 승인 완료 후 상태를 `approved`로 갱신하고 TTL을 단축
6. License 웹에서 실행 요청 시 committee API에서 현황을 확인 가능

필요 시 Storacha(w3up) 에이전트 델리게이션을 주입하면 조각 CID 목록을 JSON으로 업로드하여 영구 스토리지를 확보할 수 있습니다.
