"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import { useLicenseManagerWrite } from "../../hooks/useLicenseManagerWrite";
import { useOwnedCodes } from "../../hooks/useOwnedCodes";
import {
  createDefaultFavoriteLabel,
  readRecipientFavorites,
  removeRecipientFavorite,
  RECIPIENT_FAVORITES_LIMIT,
  RECIPIENT_FAVORITE_LABEL_MAX_LENGTH,
  saveRecipientFavorite,
  type RecipientFavorite,
} from "../../services/recipientFavorites";

const CONNECTED_WALLET_LABEL = "연결된 지갑";

type DisplayFavorite = RecipientFavorite & { readOnly?: boolean };

function shortenAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function IssueLicenseCard() {
  const account = useAccount();
  const [codeId, setCodeId] = useState(0);
  const [recipient, setRecipient] = useState<`0x${string}` | "">("");
  const [runs, setRuns] = useState(1);
  const [expiry, setExpiry] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<RecipientFavorite[]>([]);
  const [favoriteLabel, setFavoriteLabel] = useState("");
  const [isLabelEditorVisible, setIsLabelEditorVisible] = useState(false);

  const { codes: ownedCodes, isLoading: isCodesLoading } = useOwnedCodes();

  const { execute, isPending, isSuccess, transactionHash, error } =
    useLicenseManagerWrite("issueLicense");

  useEffect(() => {
    setFavorites(readRecipientFavorites());
  }, []);

  const normalizedAccount = useMemo(
    () => (account.address ? (getAddress(account.address) as `0x${string}`) : null),
    [account.address],
  );

  const normalizedRecipient = useMemo(
    () => (recipient && isAddress(recipient) ? (getAddress(recipient) as `0x${string}`) : null),
    [recipient],
  );

  useEffect(() => {
    if (normalizedAccount) {
      setRecipient((prev) => (prev ? prev : normalizedAccount));
      return;
    }
    setRecipient("");
  }, [normalizedAccount]);

  const hasOwnedCodes = ownedCodes.length > 0;
  const codeSelectValue = useMemo(() => (codeId > 0 ? String(codeId) : ""), [codeId]);
  const isFavoritesFull = favorites.length >= RECIPIENT_FAVORITES_LIMIT;

  const existingFavoriteForRecipient = useMemo(() => {
    if (!normalizedRecipient) {
      return null;
    }
    return (
      favorites.find(
        (favorite) => favorite.address.toLowerCase() === normalizedRecipient.toLowerCase(),
      ) ?? null
    );
  }, [favorites, normalizedRecipient]);

  const addFavoriteButtonText = isLabelEditorVisible ? "즐겨찾기 저장" : "즐겨찾기 추가";
  const isAddButtonDisabled =
    !isLabelEditorVisible && !existingFavoriteForRecipient && isFavoritesFull;

  const displayFavorites: DisplayFavorite[] = useMemo(() => {
    const persisted = normalizedAccount
      ? favorites.filter(
          (favorite) => favorite.address.toLowerCase() !== normalizedAccount.toLowerCase(),
        )
      : favorites;

    if (!normalizedAccount) {
      return persisted;
    }

    return [
      {
        address: normalizedAccount,
        label: CONNECTED_WALLET_LABEL,
        readOnly: true,
      },
      ...persisted,
    ];
  }, [favorites, normalizedAccount]);

  const handleAddFavorite = () => {
    if (!isLabelEditorVisible) {
      if (!normalizedRecipient) {
        setStatus("올바른 수령자 주소를 먼저 입력해주세요.");
        return;
      }

      setIsLabelEditorVisible(true);
      setFavoriteLabel(
        existingFavoriteForRecipient?.label ?? createDefaultFavoriteLabel(favorites.length),
      );
      setStatus(
        existingFavoriteForRecipient
          ? "즐겨찾기 이름을 수정하세요."
          : "즐겨찾기 이름을 입력하세요.",
      );
      return;
    }

    if (!normalizedRecipient) {
      setStatus("올바른 수령자 주소를 입력 후 즐겨찾기를 저장하세요.");
      return;
    }

    const isExistingFavorite = Boolean(existingFavoriteForRecipient);

    if (!isExistingFavorite && isFavoritesFull) {
      setStatus(`즐겨찾기는 최대 ${RECIPIENT_FAVORITES_LIMIT}개까지 저장할 수 있습니다.`);
      return;
    }

    if (!recipient || !isAddress(recipient)) {
      setStatus("올바른 수령자 주소를 입력 후 즐겨찾기에 추가하세요.");
      return;
    }

    const next = saveRecipientFavorite({
      address: normalizedRecipient,
      label: favoriteLabel.trim() || undefined,
    });
    setFavorites(next);
    setFavoriteLabel("");
    setIsLabelEditorVisible(false);
    setStatus(
      isExistingFavorite ? "즐겨찾기 정보가 업데이트되었습니다." : "즐겨찾기에 추가되었습니다.",
    );
  };

  const handleRemoveFavorite = (address: `0x${string}`) => {
    const next = removeRecipientFavorite(address);
    setFavorites(next);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!codeId) {
      setStatus("라이선스를 발급할 코드 ID를 선택해주세요.");
      return;
    }

    if (!recipient || !isAddress(recipient)) {
      setStatus("올바른 수령자 주소를 입력해주세요.");
      return;
    }

    const expiryTimestamp = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;

    try {
      setStatus(null);
      await execute([
        BigInt(codeId),
        getAddress(recipient) as `0x${string}`,
        BigInt(runs),
        BigInt(expiryTimestamp),
      ]);
    } catch (err) {
      setStatus(`트랜잭션 실패: ${(err as Error).message}`);
    }
  };

  return (
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">
          라이선스 발급
        </h2>
        <p className="text-sm text-text-light-50 dark:text-text-dark-50">
          소유한 코드에 대해 실행권을 발급합니다.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">내 코드 선택</span>
          <select
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            value={codeSelectValue}
            onChange={(event) => {
              const value = event.target.value;
              setCodeId(value ? Number(value) : 0);
            }}
            disabled={isCodesLoading || !hasOwnedCodes}
          >
            <option value="">
              {isCodesLoading ? "코드 목록을 불러오는 중..." : "코드를 선택하세요"}
            </option>
            {ownedCodes.map((code) => (
              <option key={code.codeId} value={code.codeId}>
                #{code.codeId} · {code.name || code.cipherCid}
              </option>
            ))}
          </select>
          {!isCodesLoading && !hasOwnedCodes && (
            <span className="text-xs text-text-light-50 dark:text-text-dark-50">
              등록된 코드가 없습니다. 먼저 코드를 등록하세요.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">수령자 주소</span>
          <input
            type="text"
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 font-mono text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            placeholder="0x..."
            value={recipient}
            onChange={(event) => setRecipient(event.target.value as `0x${string}` | "")}
          />
          {isLabelEditorVisible && (
            <input
              type="text"
              maxLength={RECIPIENT_FAVORITE_LABEL_MAX_LENGTH}
              className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
              placeholder="즐겨찾기 이름을 입력하세요"
              value={favoriteLabel}
              onChange={(event) => setFavoriteLabel(event.target.value)}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-secondary-50 px-3 py-1 text-xs font-semibold text-primary-100 transition hover:bg-secondary-75 dark:text-text-dark-100"
              onClick={handleAddFavorite}
              disabled={isAddButtonDisabled}
            >
              {addFavoriteButtonText}
            </button>
            {isLabelEditorVisible && (
              <button
                type="button"
                className="rounded border border-primary-25 px-3 py-1 text-xs text-text-light-75 transition hover:border-rose-300 hover:text-rose-400 dark:border-primary-50 dark:text-text-dark-75"
                onClick={() => {
                  setIsLabelEditorVisible(false);
                  setFavoriteLabel("");
                  setStatus(null);
                }}
              >
                취소
              </button>
            )}
          </div>
        </label>

        {displayFavorites.length > 0 && (
          <div className="rounded-lg border border-primary-25 bg-background-light-50 p-3 text-xs text-text-light-75 shadow-sm dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-75">
            <p className="mb-2 font-semibold text-text-light-50 dark:text-text-dark-50">즐겨찾기</p>
            <div className="flex flex-wrap gap-2">
              {displayFavorites.map((favorite) => (
                <div
                  key={`${favorite.address}-${favorite.label ?? ""}`}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    className="rounded-full border border-primary-25 px-3 py-1 font-mono text-[11px] text-primary-100 transition hover:bg-secondary-25 dark:border-primary-50 dark:text-text-dark-100"
                    onClick={() => setRecipient(favorite.address)}
                  >
                    {favorite.label ?? shortenAddress(favorite.address)}
                  </button>
                  {!favorite.readOnly && (
                    <button
                      type="button"
                      className="text-[10px] text-text-light-50 transition hover:text-rose-400 dark:text-text-dark-50"
                      onClick={() => handleRemoveFavorite(favorite.address)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">실행 가능 횟수</span>
          <input
            type="number"
            min={1}
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            value={runs}
            onChange={(event) => setRuns(Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">만료일 (옵션)</span>
          <input
            type="datetime-local"
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-primary-75 disabled:cursor-not-allowed disabled:bg-primary-50 disabled:text-text-dark-75"
          disabled={isPending}
        >
          {isPending ? "트랜잭션 전송 중..." : "라이선스 발급"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-text-light-50 dark:text-text-dark-50">{status}</p>}
        {isSuccess && transactionHash && (
          <p className="text-secondary-100">발급 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
