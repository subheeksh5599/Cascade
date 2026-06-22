import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cascade — Recursive Money Flow Graphs",
  description:
    "Chain FlowVault vaults into a directed acyclic graph. One deposit triggers cascading Lock, Split, and Hold operations across every downstream node. Built on Stacks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Inter:opsz,wght@14..32,250;14..32,300;14..32,350;14..32,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
