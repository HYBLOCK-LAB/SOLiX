"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletBar() {
  return (
    <div className="flex items-center justify-end">
      <ConnectButton />
    </div>
  );
}
