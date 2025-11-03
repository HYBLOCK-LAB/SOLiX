const PINATA_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

const PINATA_TIMEOUT_MS = 20_000;

export async function uploadToPinata(
  bytes: Uint8Array,
  fileName: string,
  jwt: string,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PINATA_TIMEOUT_MS);

  try {
    const formData = new FormData();
    const blob = (() => {
      // Copy the bytes into a new Uint8Array (backed by an ArrayBuffer) to avoid SharedArrayBuffer issues
      const copy = bytes.slice();
      return new Blob([copy], { type: "application/octet-stream" });
    })();

    formData.append("file", blob, fileName);

    const response = await fetch(PINATA_FILE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.text().catch(() => response.statusText);
      throw new Error(`Pinata upload failed: ${response.status} ${errorPayload}`);
    }

    const payload = (await response.json()) as PinataResponse;
    return payload.IpfsHash;
  } finally {
    clearTimeout(timeoutId);
  }
}
