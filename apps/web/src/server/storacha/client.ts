import type { Driver } from "@storacha/access/drivers/types";
import type { AgentDataExport } from "@storacha/access/types";
import { create as createStorachaClient } from "@storacha/client";
import type { Client } from "@storacha/client";
import { Buffer } from "buffer";
import { requireStorachaAgentExport } from "../../lib/server-env";

type Serializable = AgentDataExport;

const MAP_MARKER = "$map";
const URL_MARKER = "$url";
const BYTES_MARKER = "$bytes";

const JSON_WHITESPACE_REGEX = /^[\s\r\n\t]+/;
const JSON_OBJECT_PREFIXES = ["{", "["] as const;

let storachaClientPromise: Promise<Client> | null = null;

export async function getStorachaClient(): Promise<Client> {
  if (!storachaClientPromise) {
    const rawExport = requireStorachaAgentExport();
    const decodedExport = decodeAgentExport(rawExport);
    const store = new EnvAgentDriver(decodedExport);
    storachaClientPromise = createStorachaClient({ store });
  }
  return storachaClientPromise;
}

function decodeAgentExport(encoded: string): Serializable {
  const trimmed = encoded.replace(JSON_WHITESPACE_REGEX, "");
  const isJson = JSON_OBJECT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  const jsonString = isJson ? trimmed : decodeBase64ToString(trimmed);

  try {
    return JSON.parse(jsonString, storachaReviver) as Serializable;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse STORACHA_AGENT_EXPORT: ${reason}`);
  }
}

function decodeBase64ToString(value: string): string {
  try {
    return Buffer.from(value, "base64url").toString("utf-8");
  } catch {
    return Buffer.from(value, "base64").toString("utf-8");
  }
}

function cloneAgentData(data: Serializable): Serializable {
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data, storachaReplacer), storachaReviver) as Serializable;
}

function storachaReplacer(_key: string, value: unknown): unknown {
  if (value instanceof URL) {
    return { [URL_MARKER]: value.toString() };
  }
  if (value instanceof Map) {
    return { [MAP_MARKER]: [...value.entries()] };
  }
  if (value instanceof Uint8Array) {
    return { [BYTES_MARKER]: [...value.values()] };
  }
  if (value instanceof ArrayBuffer) {
    return { [BYTES_MARKER]: [...new Uint8Array(value).values()] };
  }
  if ((value as { type?: string; data?: number[] } | null)?.type === "Buffer") {
    const bufferLike = value as { data: number[] };
    return { [BYTES_MARKER]: bufferLike.data };
  }
  return value;
}

function storachaReviver(_key: string, value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (URL_MARKER in value) {
    const markerValue = (value as Record<string, string>)[URL_MARKER];
    return new URL(markerValue);
  }

  if (MAP_MARKER in value) {
    const entries = (value as Record<string, unknown[]>)[MAP_MARKER];
    return new Map(entries as [unknown, unknown][]);
  }

  if (BYTES_MARKER in value) {
    const bytes = (value as Record<string, number[]>)[BYTES_MARKER];
    return new Uint8Array(bytes);
  }

  return value;
}

class EnvAgentDriver implements Driver<Serializable> {
  #data: Serializable | undefined;

  constructor(initialData: Serializable) {
    this.#data = cloneAgentData(initialData);
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {}

  async reset(): Promise<void> {
    this.#data = undefined;
  }

  async save(data: Serializable): Promise<void> {
    this.#data = cloneAgentData(data);
  }

  async load(): Promise<Serializable | undefined> {
    return this.#data ? cloneAgentData(this.#data) : undefined;
  }
}
