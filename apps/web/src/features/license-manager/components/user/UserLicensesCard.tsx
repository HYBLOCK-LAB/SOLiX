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
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">내 라이선스</h2>
        <p className="text-sm text-text-light-50 dark:text-text-dark-50">코드별 실행 가능 횟수와 만료일을 확인하세요.</p>
      </header>

      <label className="mb-4 flex flex-col gap-2">
        <span className="text-sm text-text-light-75 dark:text-text-dark-75">코드 ID</span>
        <input
          type="number"
          min={0}
          className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
          value={codeId}
          onChange={(event) => setCodeId(Number(event.target.value))}
        />
      </label>

      <div className="rounded border border-primary-25 bg-background-light-50 p-4 text-sm shadow-sm dark:border-primary-50 dark:bg-background-dark-75">
        {isLoading ? (
          <p className="text-text-light-50 dark:text-text-dark-50">조회 중...</p>
        ) : license ? (
          <ul className="space-y-1">
            <li>
              <span className="text-text-light-50 dark:text-text-dark-50">실행 가능 횟수:</span>{" "}
              <span className="text-text-light-100 dark:text-text-dark-100">{license.balance}</span>
            </li>
            <li>
              <span className="text-text-light-50 dark:text-text-dark-50">만료:</span>{" "}
              <span className="text-text-light-100 dark:text-text-dark-100">{expiryLabel}</span>
            </li>
          </ul>
        ) : (
          <p className="text-text-light-50 dark:text-text-dark-50">계정 연결 후 조회할 수 있습니다.</p>
        )}
      </div>
    </section>
  );
}
