import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cascade — Recursive Money Flow Graphs on FlowVault",
  description:
    "Chain FlowVault vaults into a directed acyclic graph. One deposit triggers cascading Lock, Split, and Hold operations across every downstream node. Built on Stacks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
