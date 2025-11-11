import { serverEnv } from "./serverEnv";

export function buildCommitteeUrls(path: string): string[] {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (serverEnv.COMMITTEE_API_URLS.length === 0) {
    throw new Error("No COMMITTEE_API_URLS configured");
  }
  return serverEnv.COMMITTEE_API_URLS.map((base) =>
    `${base.replace(/\/+$/, "")}${normalizedPath}`
  );
}
