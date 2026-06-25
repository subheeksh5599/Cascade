"use client";

import { useStacksWallet } from "@/hooks/useStacksWallet";
import { truncateAddress } from "@/lib/wallet";

export function WalletButton() {
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet } = useStacksWallet();

  if (isConnected && address) {
    return (
      <div className="wallet-row">
        <span className="connection-dot" aria-hidden="true" />
        <span className="address-chit">{truncateAddress(address)}</span>
        <button className="btn-ghost" type="button" onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="btn-accent" type="button" onClick={connectWallet} disabled={isConnecting}>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
