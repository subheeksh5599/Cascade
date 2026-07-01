# Cascade

Recursive money flow graphs on FlowVault. Built for Stacks.

One deposit. A directed acyclic graph of FlowVault vaults executes sequentially.
The keeper resolves each step deterministically — given the graph and on-chain
state, anyone can independently compute the same next action. Every node
execution produces a state witness bound to the graph hash.

Built on [FlowVault](https://github.com/yashpunmiya/Flowvault) (Lock, Split,
Hold primitives) on Stacks testnet.

## Architecture

```
User defines DAG   Keeper resolves    FlowVault SDK     Stacks testnet
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────┐
│  Graph Editor │──▶│ resolveNext  │──▶│ setRouting   │──▶│ Lock      │
│  (Next.js)    │   │ Step(graph,  │   │ Rules +      │   │ Split     │
│               │   │  state)      │   │ deposit()    │   │ Hold      │
│  Node Editor  │   │              │   └──────────────┘   └───────────┘
│  Templates    │   │ Deterministic│         │
└──────────────┘   │ State Machine│         ▼
                   └──────────────┘   ┌──────────────┐
                          │           │ State Witness │
                          ▼           │ (graph hash + │
                   ┌──────────────┐   │  allocations  │
                   │ Cascade      │   │  + tx IDs)    │
                   │ Registry     │   └──────────────┘
                   │ (Clarity)    │
                   └──────────────┘
```

### Three Technical Layers

**Keeper** (`lib/keeper.ts`) — deterministic pure-function resolver. Takes a
`CascadeGraph` + on-chain state (`CascadeExecutionState`), produces a
`ResolvedStep` with computed allocations, parent tx verification, and a status
flag. Given identical inputs, the keeper always produces identical output. No
secrets. No side effects. This is the specification of correct execution.

**Execution Witnesses** (`lib/proof.ts`) — each node execution stores a
`CascadeStateWitness` containing the graph hash, computed allocation, strategy
and deposit transaction IDs, and parent tx references. The `verifyWitness`
function confirms the graph hash matches, inputs are nonzero for non-root
nodes, and transaction IDs are valid.

**Cascade Registry** (`contracts/cascade-registry.clar`) — on-chain storage
for graph definitions and execution state. Stores graph hashes (not full
graphs — those live off-chain), tracks per-node witnesses, and supports
cascade composition (one cascade feeding into another). Published cascades
become composable primitives.

## Quick Start

```bash
cd editor-app
pnpm install
pnpm dev
```

Opens on `http://localhost:3000`.

## Editor

The editor (`/editor`) provides:

- **Template gallery** — 10 pre-built graph templates (Payroll, DAO Treasury,
  Grant Distribution, Vesting, etc.) loadable instantly
- **Node editor** — add Lock/Split/Hold nodes, set percentages, lock
  durations, and split addresses
- **Graph canvas** — SVG DAG visualization with active-node highlighting
- **Execute Cascade** — connects Leather/Xverse wallet, chains FlowVault
  contract calls (clearRoutingRules → setRoutingRules → deposit) per node
- **Graph hash** — computed in real-time, displayed in sidebar. After
  execution, the hash is bound to all generated witnesses
- **Transaction links** — Hiro Explorer links for every on-chain step

## FlowVault Integration

Uses FlowVault SDK to call three deployed testnet contracts:

| Function | Purpose |
|---|---|
| `clear-routing-rules` | Reset vault state before configuring next node |
| `set-routing-rules` | Set lock amount, lock duration, split address/amount |
| `deposit` | Transfer USDCx into the FlowVault contract |

Contract addresses:
- FlowVault: `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2`
- USDCx: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`

## On-Chain Proofs

All transactions confirmed on Stacks testnet.

| Transaction | Function | Explorer |
|---|---|---|
| Contract Deploy | `cascade-registry-v2` | [`0x294a...`](https://explorer.hiro.so/txid/0x294a7f27abcdac1dbcf5d482e04566f1eae70e1d5ce64f07ea0ef8b3c4dceb13?chain=testnet) |
| Register Graph | `register-graph` | [`0xcd03...`](https://explorer.hiro.so/txid/0xcd03fb8c98218b7ef24d6d8fef19fa7ec905357bce1aff38753638eb92f35adf?chain=testnet) |
| Clear Routing | `clear-routing-rules` | [`0x4ddf...`](https://explorer.hiro.so/txid/0x4ddf2692f388cfeb24facb0586cb5fa800e024116abc2d0d0ccf33e58fbfcac5?chain=testnet) |
| Set Routing | `set-routing-rules` | [`0x438a...`](https://explorer.hiro.so/txid/0x438ad09ed49a57a687090eca2527f93787cdd940982f38f1cfb2fbf3061fb474?chain=testnet) |
| Deposit | `deposit` (5 USDCx) | [`0x4edb...`](https://explorer.hiro.so/txid/0x4edab35dcad547bd7511f4b77ccd018ba3c1bb0d685d6576c322f4e240274b15?chain=testnet) |

FlowVault deposit result:
`(ok (tuple (deposited u5000000) (held u5000000) (locked u2500000) (split u0)))`

Dev wallet for testing: `ST1H099KW6K2M17JVAC8C5TFBT4HDRC8DHYKZNJGX`

## Project Structure

```
editor-app/
├── app/
│   ├── page.tsx              # Landing page
│   ├── editor/page.tsx       # Graph editor
│   └── layout.tsx
├── contracts/
│   └── cascade-registry.clar  # On-chain registry
├── lib/
│   ├── graph-engine.ts       # DAG types, validation, toposort, templates
│   ├── cascade-flow.ts       # Allocation math, step building
│   ├── keeper.ts             # Deterministic next-step resolver
│   ├── proof.ts              # State witnesses + verification
│   ├── escrow-flow.ts        # Transaction confirmation polling
│   ├── flowvault.ts          # FlowVault SDK factory (browser wallet)
│   ├── config.ts             # Network + contract config
│   └── wallet.ts             # Stacks address extraction
├── hooks/
│   ├── useGraphCascade.ts    # Keeper-driven cascade execution
│   └── useStacksWallet.tsx   # Leather/Xverse wallet connection
└── components/
    ├── CascadeApp.tsx         # Landing page
    ├── EditorPage.tsx         # Graph editor UI
    ├── GraphSVG.tsx           # DAG visualization
    ├── WalletButton.tsx
    └── Preloader.tsx
```

## Tech Stack

Next.js 16, React 19, TypeScript, FlowVault SDK, @stacks/connect
(Leather/Xverse), GSAP, Clarity (registry contract), Stacks testnet.

## License

MIT
