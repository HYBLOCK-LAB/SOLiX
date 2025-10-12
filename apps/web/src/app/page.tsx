import { WalletBar } from "../components/WalletBar";
import { DashboardTabs } from "../features/license-manager/components/DashboardTabs";
import { clientEnv } from "../lib/env";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-10">
      <WalletBar />

      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 shadow-2xl">
        <h1 className="text-3xl font-semibold text-slate-100 md:text-4xl">
          SOLiX 실행 라이선스 허브
        </h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
          배포자는 코드를 등록하고 라이선스를 발급하며, 사용자는 보유한 실행권을
          기반으로 안전하게 실행을 요청합니다. 온체인 이벤트에 맞춰 설계된
          컴팩트한 위원회 아키텍처와 함께 동작하도록 구성되어 있습니다.
        </p>

        <dl className="mt-6 grid gap-6 text-sm text-slate-300 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <dt className="text-slate-400">체인</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-100">
              {clientEnv.NEXT_PUBLIC_CHAIN_NAME}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <dt className="text-slate-400">컨트랙트</dt>
            <dd className="mt-1 font-mono text-xs text-slate-200">
              {clientEnv.NEXT_PUBLIC_CONTRACT_ADDRESS}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <dt className="text-slate-400">가이드</dt>
            <dd className="mt-1 text-slate-200">
              /session/week2/week2.md 참고
            </dd>
          </div>
        </dl>
      </section>

      <DashboardTabs />
    </main>
  );
}
