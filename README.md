<div align="center">

# Cascade

**Programmable money routing graphs on Stacks.**

[![Built on Stacks](https://img.shields.io/badge/Built%20on-Stacks-5546ff)](https://stacks.co)
[![FlowVault SDK](https://img.shields.io/badge/FlowVault-SDK-0f766e)](https://github.com/yashpunmiya/Flowvault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981)](https://cascade-rust.vercel.app)

Define a directed acyclic graph of FlowVault vaults. Deposit USDCx once at the root. The keeper executes Lock, Split, and Hold rules at every downstream node. Each step produces a verifiable state witness.

</div>

<br/>

<p align="center">
  <img src="media/editor.png" alt="Cascade Editor" width="800" />
</p>

<p align="center">
  <strong>Built for the <a href="https://flowvault.dev/bounty">FlowVault Builder Bounty</a> — 1,000 USDT prize pool</strong>
</p>

## Why Cascade

Most FlowVault apps use a single primitive: Deposit → Lock. Every org
builds their own custom contract for anything more complex. Payroll routing,
DAOs splitting revenue, milestone-based escrow with subcontractor cascades —
all hand-coded per use case.

Cascade turns FlowVault into a **composable routing layer**. Define nodes.
Connect edges. The DAG IS the specification. No custom contracts per org. No
spreadsheets. No manual multi-sig signing for each payout.

## Features

### Simulate — Zero-Risk Dry Runs

Runs the deterministic keeper locally. No wallet, no gas, no testnet USDCx.
Shows computed lock, split, and hold amounts on every graph node. Test
percentages, lock durations, and split addresses before broadcasting anything.

### Fork — Instant Graph Reuse

Paste any graph hash, template index, or base64-encoded URL into the fork
input. Instantly loads the exact cascade. Hit Share to copy your graph as a
URL — send it to anyone and they open it in their editor. Graphs are
composable primitives.

### Replay — Visual Audit Trail

After a cascade settles on-chain, a timeline slider appears. Drag to scrub
through every execution step. Nodes highlight on the canvas. Each step links
directly to the Hiro Explorer transaction. Turn a list of tx hashes into a
visual settlement timeline.

### Deterministic Keeper

`resolveNextStep()` is a pure function. Given the same graph and on-chain
state, anyone independently computes the same next action. No secrets. No
side effects. This is the specification of correct cascade execution.

### State Witnesses

Every node execution generates a `CascadeStateWitness` containing the graph
hash, computed allocation, strategy and deposit transaction IDs, and parent
references. `verifyWitness()` confirms integrity of any execution step.

### On-Chain Registry

A Clarity contract (`cascade-registry.clar`) stores graph hashes, per-node
witnesses, and composition links. Published cascades become importable by
other cascades — route one graph's output into another as a node.

## How It Works

**Graph → Keeper → FlowVault → On-Chain**

1. User defines a DAG in the visual editor — Lock, Split, Hold nodes with percentages, lock durations, and destination wallets
2. `resolveNextStep()` deterministically computes which node executes next, with what allocation, based on the graph and current on-chain state
3. For each node: `clearRoutingRules()` → `setRoutingRules()` → `deposit()` — three FlowVault contract calls via the Stacks wallet
4. Each transaction is polled through the Hiro API until confirmed
5. A state witness is generated per node, bound to the graph hash

The editor supports **Simulate** mode that runs the keeper locally without broadcasting transactions — allocation math identical to real execution, zero risk.

## FlowVault Integration

All functions call the same FlowVault v2 contract on Stacks testnet:

| Function | Contract |
|---|---|
| `clear-routing-rules` | `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2` |
| `set-routing-rules` | `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2` |
| `deposit` | `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2` |

USDCx token: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`

## On-Chain Transactions

All confirmed on Stacks testnet. Verifiable via Hiro Explorer.

| Function | Tx |
|---|---|
| Contract deploy | [`0x294a...`](https://explorer.hiro.so/txid/0x294a7f27abcdac1dbcf5d482e04566f1eae70e1d5ce64f07ea0ef8b3c4dceb13?chain=testnet) |
| Register graph | [`0xcd03...`](https://explorer.hiro.so/txid/0xcd03fb8c98218b7ef24d6d8fef19fa7ec905357bce1aff38753638eb92f35adf?chain=testnet) |
| Clear routing | [`0x4ddf...`](https://explorer.hiro.so/txid/0x4ddf2692f388cfeb24facb0586cb5fa800e024116abc2d0d0ccf33e58fbfcac5?chain=testnet) |
| Set routing | [`0x438a...`](https://explorer.hiro.so/txid/0x438ad09ed49a57a687090eca2527f93787cdd940982f38f1cfb2fbf3061fb474?chain=testnet) |
| Deposit (5 USDCx) | [`0x4edb...`](https://explorer.hiro.so/txid/0x4edab35dcad547bd7511f4b77ccd018ba3c1bb0d685d6576c322f4e240274b15?chain=testnet) |

Deposit result: `(ok (tuple (deposited u5000000) (held u5000000) (locked u2500000) (split u0)))`

## Quick Start

```bash
git clone https://github.com/subheeksh5599/Cascade.git
cd Cascade
pnpm install
pnpm run dev
```

Opens `http://localhost:5173`. Append `#editor` for the graph builder.

## Tech Stack

Vite, React 19, Tailwind CSS, GSAP + ScrollTrigger, FlowVault SDK,
@stacks/connect (Leather/Xverse), Clarity, Stacks testnet.

## Project Structure

```
├── src/
│   ├── App.jsx                    # Router (home / #editor)
│   ├── components/                # Landing page
│   │   ├── Hero.jsx               # Full-viewport video + morphing clip-path
│   │   ├── About.jsx              # Scroll-reveal image expansion
│   │   ├── Features.jsx           # Bento grid with 3D tilt
│   │   ├── Story.jsx              # Mix-blend title + floating image
│   │   ├── Contact.jsx            # Clip-path image layering
│   │   ├── Footer.jsx             # Social icons + copyright
│   │   └── Navbar.jsx             # Scroll-aware nav + wallet
│   └── editor/
│       ├── EditorPage.tsx          # Graph builder (simulate, fork, replay)
│       ├── GraphCanvas.tsx         # HTML/SVG node canvas
│       ├── TxnModal.jsx            # Confirm modal + gas estimate
│       ├── graph-engine.ts         # DAG types, validation, templates
│       └── lib/
│           ├── keeper.ts           # Deterministic step resolver
│           ├── proof.ts            # State witness + verification
│           ├── useGraphCascade.ts  # Keeper-driven execute + simulate
│           ├── cascade-flow.ts     # Allocation computation
│           ├── escrow-flow.ts      # Transaction confirmation polling
│           ├── flowvault.ts        # FlowVault SDK factory
│           ├── config.ts           # Network + contract addresses
│           └── wallet.ts           # Stacks address extraction
├── contracts/
│   └── cascade-registry.clar       # On-chain graph registry
└── package.json
```

## License

MIT
