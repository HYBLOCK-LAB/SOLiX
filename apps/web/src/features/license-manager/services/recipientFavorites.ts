import { isAddress, getAddress } from "viem";

const STORAGE_KEY = "solix.recipientFavorites";

export const RECIPIENT_FAVORITES_LIMIT = 10;
export const RECIPIENT_FAVORITE_LABEL_MAX_LENGTH = 32;

export interface RecipientFavorite {
  address: `0x${string}`;
  label?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeLabel(label?: string): string | undefined {
  if (!label) return undefined;
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed.slice(0, RECIPIENT_FAVORITE_LABEL_MAX_LENGTH) : undefined;
}

function normalizeFavorite(
  favorite: RecipientFavorite | null | undefined,
): RecipientFavorite | null {
  if (!favorite?.address || !isAddress(favorite.address)) {
    return null;
  }
  const normalizedAddress = getAddress(favorite.address) as `0x${string}`;
  return {
    address: normalizedAddress,
    label: normalizeLabel(favorite.label),
  };
}

function sanitizeFavorites(favorites: RecipientFavorite[]): RecipientFavorite[] {
  const seen = new Set<string>();
  const sanitized: RecipientFavorite[] = [];

  for (const favorite of favorites) {
    const normalized = normalizeFavorite(favorite);
    if (!normalized) continue;
    const key = normalized.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sanitized.push(normalized);
    if (sanitized.length >= RECIPIENT_FAVORITES_LIMIT) break;
  }

  return sanitized;
}

function persistFavorites(favorites: RecipientFavorite[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function readRecipientFavorites(): RecipientFavorite[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecipientFavorite[];
    return sanitizeFavorites(parsed);
  } catch {
    return [];
  }
}

export function writeRecipientFavorites(favorites: RecipientFavorite[]): RecipientFavorite[] {
  const sanitized = sanitizeFavorites(favorites);
  persistFavorites(sanitized);
  return sanitized;
}

export function saveRecipientFavorite(favorite: RecipientFavorite): RecipientFavorite[] {
  const normalized = normalizeFavorite(favorite);
  if (!normalized) {
    return readRecipientFavorites();
  }

  const current = readRecipientFavorites();
  const filtered = current.filter(
    (item) => item.address.toLowerCase() !== normalized.address.toLowerCase(),
  );
  const updated = sanitizeFavorites([normalized, ...filtered]);
  persistFavorites(updated);
  return updated;
}

export function removeRecipientFavorite(address: `0x${string}`): RecipientFavorite[] {
  if (!isAddress(address)) {
    return readRecipientFavorites();
  }

  const normalizedAddress = getAddress(address).toLowerCase();
  const filtered = readRecipientFavorites().filter(
    (favorite) => favorite.address.toLowerCase() !== normalizedAddress,
  );

  persistFavorites(filtered);
  return filtered;
}

export function createDefaultFavoriteLabel(count: number): string {
  const index = Number.isFinite(count) && count >= 0 ? Math.floor(count) + 1 : 1;
  return `지갑 ${index}`;
}
