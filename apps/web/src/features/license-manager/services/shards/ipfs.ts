const PINATA_GATEWAY_BASE = "https://gateway.pinata.cloud/ipfs";
const LOCAL_HELIA_ENDPOINT = "/api/storage/cid";

export function resolveIpfsUri(uri: string): string {
  const cid = extractCid(uri);
  if (!cid) {
    return uri;
  }
  return `${PINATA_GATEWAY_BASE}/${cid}`;
}

export async function fetchIpfsResource(
  uri: string,
  init?: RequestInit,
): Promise<{ response: Response; source: "helia" | "pinata" | "custom" }> {
  const cid = extractCid(uri);
  if (cid) {
    const localUrl = `${LOCAL_HELIA_ENDPOINT}/${encodeURIComponent(cid)}`;
    try {
      const localResponse = await fetch(localUrl, init);
      if (localResponse.ok) {
        return { response: localResponse, source: "helia" };
      }
    } catch {
      // ignore local fetch errors and fall back to Pinata
    }
  }

  const fallbackUrl = resolveIpfsUri(uri);
  const fallbackResponse = await fetch(fallbackUrl, init);
  if (fallbackResponse.ok) {
    return { response: fallbackResponse, source: cid ? "pinata" : "custom" };
  }

  throw new Error(
    `IPFS 게이트웨이에서 리소스를 가져오지 못했습니다: ${fallbackResponse.statusText}`,
  );
}

function extractCid(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return sanitizeCid(uri.slice(7));
  }
  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    const marker = "/ipfs/";
    const markerIndex = uri.indexOf(marker);
    if (markerIndex >= 0) {
      return sanitizeCid(uri.slice(markerIndex + marker.length));
    }
    return null;
  }
  return sanitizeCid(uri);
}

function sanitizeCid(cid: string): string {
  const endIndex = cid.search(/[?#]/);
  return endIndex >= 0 ? cid.slice(0, endIndex) : cid;
}
