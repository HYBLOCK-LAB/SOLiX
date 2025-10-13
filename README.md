# SOLiX

**S**ecure **O**n-Chain **Li**cense E**x**ecution Platform

탈중앙식 라이선스 관리 플랫폼

---

> 하이블럭(HYBLOCK) 8기 개발 세션 자료입니다.  
> 본 세션은 **스마트 컨트랙트 기반 코드 라이선스 발급·관리 시스템**을 구현하는 것을 목표로 합니다.

---

### 학습 목표

<aside>
💡 신뢰성 확보를 위한 도구로서 블록체인을 이해할 수 있다.
</aside>

**세부목표**

1. Ethereum, EVM과 결정론적 프로그램에 대해 이해한다.
2. 체인의 특성을 이해하고 어플리케이션을 개발할 수 있다.
3. Reentrancy, DoS, timestamp 공격, Fallback 공격 등 Smart Contract에서 발생할 수 있는 취약점을 이해한다.

### 스켈레톤 코드

- 프로젝트를 진행하기 위한 스켈레톤 코드가 제공됩니다. [apps](./apps/) 디렉토리를 참고해주세요.

> 1주차에는 별도의 스켈레톤 코드가 제공되지 않습니다.  
> 학습 자료를 참고하여 로컬 환경을 직접 세팅해보세요.

### 학습 자료

- 학습 자료로 [Google Codelab](https://codelabs.developers.google.com)을 사용합니다.
- 작성된 학습 자료는 [github pages](https://hyblock-lab.github.io/SOLiX/)에 배포됩니다. 여기서 단계별로 학습할 수 있습니다.

### 세부 계획

1. Solidity를 이용한 Smart Contract 개발
2. Smart Contract 개발
3. Solidity 코드 분석 및 수정
4. 부족한 점 보완 및 테스트

### 로컬 실습 빠르게 시작하기

주차별 실습 예제는 `apps/contracts` Hardhat 워크스페이스에 정리되어 있습니다. 아래 명령어로 실행해 볼 수 있습니다.

```bash
cd apps/contracts
npm install
npx hardhat test
npx hardhat run scripts/deploy.ts --network sepolia
```

- Sepolia에 배포하려면 `.env` 파일(또는 `npx hardhat vars`)에 `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`를 등록해 주세요.
