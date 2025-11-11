export function resolveIpfsUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice(7);
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    return uri;
  }
  return `https://gateway.pinata.cloud/ipfs/${uri}`;
}
