"use client";

import { useState } from "react";
import { useLicenseInfo } from "../../hooks/use-license-info";
import { formatDistanceToNowStrict, fromUnixTime } from "date-fns";

export function UserLicensesCard() {
  const [codeId, setCodeId] = useState(0);
  const { license, isLoading } = useLicenseInfo(codeId);

  const expiryLabel =
    license && license.expiry > 0
      ? formatDistanceToNowStrict(fromUnixTime(license.expiry), { addSuffix: true })
      : "만료 없음";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">내 라이선스</h2>
        <p className="text-sm text-slate-400">코드별 실행 가능 횟수와 만료일을 확인하세요.</p>
      </header>

      <label className="mb-4 flex flex-col gap-2">
        <span className="text-sm text-slate-300">코드 ID</span>
        <input
          type="number"
          min={0}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={codeId}
          onChange={(event) => setCodeId(Number(event.target.value))}
        />
      </label>

      <div className="rounded border border-slate-800 bg-slate-950/60 p-4 text-sm">
        {isLoading ? (
          <p className="text-slate-400">조회 중...</p>
        ) : license ? (
          <ul className="space-y-1">
            <li>
              <span className="text-slate-400">실행 가능 횟수:</span> {license.balance}
            </li>
            <li>
              <span className="text-slate-400">만료:</span> {expiryLabel}
            </li>
          </ul>
        ) : (
          <p className="text-slate-500">계정 연결 후 조회할 수 있습니다.</p>
        )}
      </div>
    </section>
  );
}
