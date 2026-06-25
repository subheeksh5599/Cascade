"use client";

import { CascadeApp } from "@/components/CascadeApp";
import { WalletProvider } from "@/hooks/useStacksWallet";

export default function Page() {
  return (
    <WalletProvider>
      <CascadeApp />
    </WalletProvider>
  );
}
