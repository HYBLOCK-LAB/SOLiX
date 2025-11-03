import { WalletBar } from "../components/WalletBar";
import { DashboardTabs } from "../features/license-manager/components/DashboardTabs";
import { clientEnv } from "../lib/env";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12 text-text-light-100 dark:text-text-dark-100">
      <WalletBar />

      <section className="rounded-3xl border border-primary-25 bg-gradient-to-br from-background-light-100 via-surface-light-100 to-secondary-25 p-10 shadow-xl dark:border-surface-dark-75 dark:from-background-dark-100 dark:via-surface-dark-100 dark:to-primary-75">
        <h1 className="text-3xl font-semibold text-primary-100 dark:text-text-dark-100 md:text-4xl">
          SOLiX 라이선스 대시보드
        </h1>
        <p className="mt-4 max-w-3xl text-base text-text-light-75 dark:text-text-dark-75 md:text-lg">
          배포자는 코드를 등록하고 라이선스를 발급하며, 사용자는 보유한 실행권을 기반으로 안전하게
          실행을 요청합니다. 온체인 이벤트에 맞춰 설계된 컴팩트한 위원회 아키텍처와 함께 동작하도록
          구성되어 있습니다.
        </p>

        <dl className="mt-6 grid gap-6 text-sm md:grid-cols-3">
          <div className="rounded-2xl border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-surface-dark-75 dark:bg-surface-dark-75">
            <dt className="text-text-light-50 dark:text-text-dark-50">체인</dt>
            <dd className="mt-1 text-lg font-semibold text-primary-100 dark:text-text-dark-100">
              {clientEnv.NEXT_PUBLIC_CHAIN_NAME}
            </dd>
          </div>
          <div className="rounded-2xl border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-surface-dark-75 dark:bg-surface-dark-75">
            <dt className="text-text-light-50 dark:text-text-dark-50">컨트랙트</dt>
            <dd className="mt-1 font-mono text-xs overflow-hidden text-ellipsis text-text-light-75 dark:text-text-dark-75">
              {clientEnv.NEXT_PUBLIC_CONTRACT_ADDRESS}
            </dd>
          </div>
          <div className="rounded-2xl border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-surface-dark-75 dark:bg-surface-dark-75">
            <dt className="text-text-light-50 dark:text-text-dark-50">가이드</dt>
            <dd className="mt-1 text-text-light-75 dark:text-text-dark-75">
              /session/week2/week2.md 참고
            </dd>
          </div>
        </dl>
      </section>

      <DashboardTabs />
    </main>
  );
}
