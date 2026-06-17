# Cascade

**Recursive Money Flow Graphs on FlowVault · Built for Stacks**

One deposit. A directed acyclic graph of FlowVault vaults executes. The keeper automaton chains Lock, Split, and Hold at every downstream node until the entire cascade settles. No manual transfers. No spreadsheets. Just code.

[![Built on Stacks](https://img.shields.io/badge/Built%20on-Stacks-5546ff)](https://stacks.co)
[![FlowVault SDK](https://img.shields.io/badge/FlowVault-SDK-0f766e)](https://github.com/yashpunmiya/Flowvault)
[![Smart Contract](https://img.shields.io/badge/Contract-Testnet-0f766e)](./contracts/cascade-registry.clar)

---

## What It Does

Define a graph where each node is a FlowVault routing rule. Nodes connect with edges representing fund flow. Deposit USDCx once at the root — the keeper watches the Stacks blockchain and automatically cascades funds through every downstream node in topological order.

```
    [Company Deposit]  ← root: one deposit
       /        \
   [Lock]      [Split]
  90d/60%    Salary/35%
                /    \
          [Hold]    [Hold]
         Dev Lead  Frontend
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Cascade Registry (Clarity)            │
│  On-chain graph storage & discovery    │
├─────────────────────────────────────────┤
│  Graph Engine (TypeScript)             │
│  DAG validation, topological sort      │
├─────────────────────────────────────────┤
│  Cascade Keeper (TypeScript)           │
│  Multi-node FlowVault SDK orchestrator │
├─────────────────────────────────────────┤
│  FlowVault Contracts (Stacks testnet)  │
│  Lock · Split · Hold primitives        │
└─────────────────────────────────────────┘
```

## Live Demo

**[cascade-rust.vercel.app](https://cascade-rust.vercel.app)** — Landing page with scroll-reveal cascade animation

**[cascade-rust.vercel.app/editor](https://cascade-rust.vercel.app/editor)** — Graph builder with FlowVault wallet integration

## Smart Contract

`contracts/cascade-registry.clar` stores published cascade graph definitions on-chain:
- `register-graph` — publish a graph (name, description, node/edge count)
- `get-graph` — retrieve graph metadata by ID
- `get-graphs-by-creator` — count graphs published by a creator
- `get-graph-by-creator-index` — fetch a creator's graph by index
- `delete-graph` — creator-only deletion

**Testnet contract**: `ST3EH039PNE6HSXYV1CY0AC58SA0N06GMHS3CQB9H.cascade-registry-v2`

## On-Chain Proofs

All transactions confirmed on Stacks testnet — verifiable via Hiro Explorer.

| Transaction | Function | Result | Explorer |
|---|---|---|---|
| Contract Deploy | `cascade-registry-v2` | Success | [`0x294a...`](https://explorer.hiro.so/txid/0x294a7f27abcdac1dbcf5d482e04566f1eae70e1d5ce64f07ea0ef8b3c4dceb13?chain=testnet) |
| Register Graph | `register-graph` | Success | [`0xcd03...`](https://explorer.hiro.so/txid/0xcd03fb8c98218b7ef24d6d8fef19fa7ec905357bce1aff38753638eb92f35adf?chain=testnet) |
| Clear Routing | `clear-routing-rules` | `(ok true)` | [`0x4ddf...`](https://explorer.hiro.so/txid/0x4ddf2692f388cfeb24facb0586cb5fa800e024116abc2d0d0ccf33e58fbfcac5?chain=testnet) |
| Set Routing Rules | `set-routing-rules` (Lock 2.5 USDCx) | `(ok true)` | [`0x438a...`](https://explorer.hiro.so/txid/0x438ad09ed49a57a687090eca2527f93787cdd940982f38f1cfb2fbf3061fb474?chain=testnet) |
| FlowVault Deposit | `deposit` (5 USDCx) | 5 deposited, 2.5 locked, 2.5 held | [`0x4edb...`](https://explorer.hiro.so/txid/0x4edab35dcad547bd7511f4b77ccd018ba3c1bb0d685d6576c322f4e240274b15?chain=testnet) |

FlowVault deposit result: `(ok (tuple (deposited u5000000) (held u5000000) (locked u2500000) (split u0)))`

This proves real FlowVault integration — Lock primitive configured on-chain, USDCx routed through the vault with routing rules applied.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` — the cinematic landing page with step-by-step scroll reveal.

Open `http://localhost:3000/editor` — the full cascade builder with graph canvas, node property editor, and FlowVault wallet integration.

## Project Structure

```
├── contracts/           # Clarity smart contracts
│   └── cascade-registry.clar
├── app/
│   ├── page.tsx         # Landing page (/)
│   ├── editor/page.tsx  # Cascade editor (/editor)
│   └── globals.css
├── components/
│   ├── CascadeApp.tsx   # Landing page orchestration
│   ├── EditorPage.tsx   # Graph editor + execute
│   └── Preloader.tsx    # Typewriter preloader
├── lib/
│   ├── graph-engine.ts  # DAG types, validation, topological sort
│   ├── cascade-flow.ts  # Multi-node keeper orchestrator
│   ├── config.ts        # FlowVault contract principals
│   ├── flowvault.ts     # FlowVault SDK initialization
│   └── goals.ts         # Use case definitions
├── hooks/
│   ├── useGraphCascade.ts   # Cascade execution hook
│   ├── useStacksWallet.tsx  # Stacks wallet connection
│   └── usePropertyEscrow.ts # FlowVault deposit hook
└── tests/
    └── cascade-registry.test.ts
```

## FlowVault Integration

Cascade uses the FlowVault SDK to interact with deployed testnet contracts:

| Primitive | How Cascade Uses It |
|-----------|-------------------|
| **Lock** | Time-locks portions of cascading funds at each node |
| **Split** | Routes funds to recipients (salary, penalty, treasury) |
| **Hold** | Keeps remaining balance liquid for downstream nodes |

Contract addresses:
- FlowVault v2: `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2`
- USDCx testnet: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Pure CSS with cinematic scroll animations
- **Blockchain**: Stacks testnet, Clarity, FlowVault SDK
- **Wallet**: @stacks/connect (Leather, Xverse)
- **Testing**: Vitest, Clarinet

## License

MIT
