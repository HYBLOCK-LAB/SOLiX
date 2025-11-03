import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const STORAGE_KEY = "solix.executionKeys";
export const EXECUTION_KEY_STORAGE_LIMIT = 20;

interface ExecutionKeyRecord {
  publicKey: `0x${string}`;
  privateKey: `0x${string}`;
  createdAt: string;
}

export interface ExecutionKeyPair {
  publicKey: `0x${string}`;
  privateKey: `0x${string}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRecords(): ExecutionKeyRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExecutionKeyRecord[];
    return Array.isArray(parsed) ? sanitizeRecords(parsed) : [];
  } catch {
    return [];
  }
}

function writeRecords(records: ExecutionKeyRecord[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function sanitizeRecords(records: ExecutionKeyRecord[]): ExecutionKeyRecord[] {
  const seen = new Set<string>();
  const sanitized: ExecutionKeyRecord[] = [];

  for (const record of records) {
    if (!record?.publicKey || !record?.privateKey) continue;
    const normalizedPublicKey = record.publicKey.toLowerCase();
    const normalizedPrivateKey = record.privateKey.toLowerCase();
    if (!normalizedPublicKey.startsWith("0x") || !normalizedPrivateKey.startsWith("0x")) continue;
    if (seen.has(normalizedPublicKey)) continue;
    seen.add(normalizedPublicKey);
    sanitized.push({
      publicKey: record.publicKey,
      privateKey: record.privateKey,
      createdAt: record.createdAt ?? new Date().toISOString(),
    });
    if (sanitized.length >= EXECUTION_KEY_STORAGE_LIMIT) break;
  }

  return sanitized;
}

export function listExecutionKeys(): ExecutionKeyRecord[] {
  return readRecords();
}

export function storeExecutionKeyPair(pair: ExecutionKeyPair): ExecutionKeyRecord[] {
  const normalizedPublicKey = pair.publicKey.toLowerCase();

  const updated = [
    {
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      createdAt: new Date().toISOString(),
    },
    ...readRecords().filter(
      (record) => record.publicKey.toLowerCase() !== normalizedPublicKey,
    ),
  ]
    .slice(0, EXECUTION_KEY_STORAGE_LIMIT)
    .map((record, index) => ({
      ...record,
      createdAt: record.createdAt ?? new Date(Date.now() - index).toISOString(),
    }));

  writeRecords(updated);
  return updated;
}

export function removeExecutionKey(publicKey: `0x${string}`): ExecutionKeyRecord[] {
  if (!publicKey || !publicKey.startsWith("0x")) {
    return readRecords();
  }

  const normalized = publicKey.toLowerCase();
  const filtered = readRecords().filter(
    (record) => record.publicKey.toLowerCase() !== normalized,
  );
  writeRecords(filtered);
  return filtered;
}

export function clearExecutionKeys(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function createExecutionKeyPair(): Promise<ExecutionKeyPair> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const publicKey = account.publicKey;
  return {
    privateKey,
    publicKey,
  };
}
