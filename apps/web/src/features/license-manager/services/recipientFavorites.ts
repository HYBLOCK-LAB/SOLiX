import { isAddress } from "viem";

const STORAGE_KEY = "solix.recipientFavorites";

export interface RecipientFavorite {
  address: `0x${string}`;
  label?: string;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readRecipientFavorites(): RecipientFavorite[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecipientFavorite[];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is RecipientFavorite => isAddress(item?.address ?? ""))
      : [];
  } catch {
    return [];
  }
}

export function writeRecipientFavorites(favorites: RecipientFavorite[]) {
  if (!isBrowser()) return;
  const unique = dedupeFavorites(favorites);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function dedupeFavorites(favorites: RecipientFavorite[]): RecipientFavorite[] {
  const seen = new Set<string>();
  const result: RecipientFavorite[] = [];
  for (const favorite of favorites) {
    if (!isAddress(favorite.address)) continue;
    const lower = favorite.address.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(favorite);
  }
  return result;
}
