"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict, fromUnixTime } from "date-fns";
import { useUserLicenses } from "../../hooks/useUserLicenses";

function trimHash(value: string) {
  if (!value) return "-";
  return value.length > 12 ? `${value.slice(0, 10)}…` : value;
}

export function UserLicensesCard() {
  const { licenses, isLoading, isRefetching, error, refetch } = useUserLicenses();
  const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null);

  useEffect(() => {
    if (licenses.length === 0) {
      setSelectedCodeId(null);
      return;
    }
    if (!selectedCodeId || !licenses.some((license) => license.codeId === selectedCodeId)) {
      setSelectedCodeId(licenses[0].codeId);
    }
  }, [licenses, selectedCodeId]);

  const selectedLicense = useMemo(
    () => licenses.find((license) => license.codeId === selectedCodeId) ?? null,
    [licenses, selectedCodeId],
  );

  const expiryLabel =
    selectedLicense && selectedLicense.expiry > 0
      ? formatDistanceToNowStrict(fromUnixTime(selectedLicense.expiry), {
          addSuffix: true,
        })
      : "만료 없음";

  const handleReload = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">
            내 라이선스
          </h2>
          <p className="text-sm text-text-light-50 dark:text-text-dark-50">
            보유 중인 실행권 목록과 상세 정보를 확인하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReload}
          disabled={isLoading || isRefetching}
          className="inline-flex items-center gap-2 rounded-lg border border-primary-50 bg-background-light-50 px-3 py-2 text-xs font-semibold text-primary-100 transition hover:border-primary-75 hover:text-primary-75 disabled:cursor-not-allowed disabled:border-surface-dark-50 disabled:text-text-light-50 dark:border-primary-75 dark:bg-background-dark-75 dark:text-text-dark-75 dark:hover:border-primary-100 dark:hover:text-text-dark-100"
        >
          {isRefetching ? "새로고침 중..." : "새로고침"}
        </button>
      </header>

      <div className="rounded border border-primary-25 bg-background-light-50 p-4 text-sm shadow-sm dark:border-primary-50 dark:bg-background-dark-75">
        {isLoading ? (
          <p className="text-text-light-50 dark:text-text-dark-50">라이선스를 불러오는 중...</p>
        ) : error ? (
          <p className="max-h-[4.5rem] overflow-hidden text-rose-500">
            라이선스 정보를 불러오지 못했습니다. 지갑 연결 상태를 확인해주세요.
          </p>
        ) : licenses.length === 0 ? (
          <p className="text-text-light-50 dark:text-text-dark-50">
            보유 중인 라이선스가 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {licenses.map((license) => (
                <button
                  key={license.codeId}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-xs transition ${
                    license.codeId === selectedCodeId
                      ? "border-primary-100 bg-secondary-25 text-primary-100 dark:bg-primary-75/40 dark:text-text-dark-100"
                      : "border-primary-25 bg-background-light-50 text-text-light-75 hover:border-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-75 dark:hover:border-primary-75"
                  }`}
                  onClick={() => setSelectedCodeId(license.codeId)}
                >
                  <div className="font-semibold text-[11px]">#{license.codeId}</div>
                  {license.name && (
                    <div className="text-[10px]">{license.name}</div>
                  )}
                  <div className="text-[10px]">runs {license.balance}</div>
                </button>
              ))}
            </div>

            {selectedLicense && (
              <dl className="grid gap-2 text-xs text-text-light-75 dark:text-text-dark-75 md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">
                    코드 ID
                  </dt>
                  <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                    #{selectedLicense.codeId}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">
                    이름
                  </dt>
                  <dd className="mt-1 text-text-light-100 dark:text-text-dark-100">
                    {selectedLicense.name || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">
                    버전
                  </dt>
                  <dd className="mt-1 text-text-light-100 dark:text-text-dark-100">
                    {selectedLicense.version || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">
                    실행 가능 횟수
                  </dt>
                  <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                    {selectedLicense.balance.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">만료</dt>
                  <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                    {expiryLabel}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">상태</dt>
                  <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                    {selectedLicense.paused ? "일시정지" : "활성"}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">
                    Code Hash
                  </dt>
                  <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                    {trimHash(selectedLicense.codeHash)}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-semibold text-text-light-50 dark:text-text-dark-50">
                    Cipher CID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-text-light-100 dark:text-text-dark-100">
                    {selectedLicense.cipherCid || "-"}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
