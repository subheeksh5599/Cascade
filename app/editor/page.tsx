"use client";

import { EditorPage } from "@/components/EditorPage";
import { WalletProvider } from "@/hooks/useStacksWallet";

export default function Page() {
  return (
    <WalletProvider>
      <EditorPage />
    </WalletProvider>
  );
}
