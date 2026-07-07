# Cascade

Programmable money routing graphs on FlowVault. Built for Stacks.

Define a directed acyclic graph where each node is a FlowVault routing rule
(Lock, Split, Hold). Deposit USDCx at the root. The keeper executes every
downstream node in topological order. Each step produces a verifiable state
witness.

**[cascade-rust.vercel.app](https://cascade-rust.vercel.app)** |
**[Editor](https://cascade-rust.vercel.app/#editor)**

Built for the [FlowVault Builder Bounty](https://flowvault.dev/bounty).

## Architecture

```
Graph Editor →  Keeper resolves  →  FlowVault SDK  →  Stacks testnet
                        │
                        ▼
                  State Witnesses
                  (graph hash bound
                   to each node step)
```

### Keeper

`src/editor/lib/keeper.ts` — deterministic pure function. Given a graph +
on-chain state, `resolveNextStep()` computes exactly which node executes next,
with what allocation, and whether it can proceed. Same inputs always produce
same output. Nothing is hardcoded. Anyone can recompute independently.

### Execution Witnesses

`src/editor/lib/proof.ts` — each node execution stores a `CascadeStateWitness`
containing the graph hash, computed allocation, strategy and deposit tx IDs,
and parent references. `verifyWitness()` confirms integrity.

### Registry Contract

`contracts/cascade-registry.clar` — Clarity contract for on-chain graph
metadata, per-node witness storage, and cascade composition. Published
cascades become composable primitives — route one cascade's output into
another.

## Features

### Simulate (Dry-Run)

Runs the keeper resolver locally. No wallet needed. No transactions broadcast.
Shows computed lock, split, and hold amounts on every node. Tests graph logic
with zero risk before going on-chain.

### Fork from Explorer

Paste a graph hash, template index, or encoded graph URL into the fork input.
Instantly loads the matching cascade into the editor. Use the Share button to
copy your graph as a shareable URL.

### Execution Replay

After a cascade completes, a timeline slider appears. Drag to scrub through
each execution step. Highlights the corresponding node on the graph canvas
with direct links to Hiro Explorer for every transaction.

## Quick Start

```bash
pnpm install
pnpm run dev
```

Opens `http://localhost:5173`. Append `#editor` for the graph builder.

## FlowVault Integration

Calls three testnet contract functions per node:

| Function | Contract |
|---|---|
| `clear-routing-rules` | `STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD.flowvault-v2` |
| `set-routing-rules` | " |
| `deposit` | " |

USDCx token: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`

## On-Chain Transactions

| Function | Tx |
|---|---|
| Contract deploy | [`0x294a...`](https://explorer.hiro.so/txid/0x294a7f27abcdac1dbcf5d482e04566f1eae70e1d5ce64f07ea0ef8b3c4dceb13?chain=testnet) |
| Register graph | [`0xcd03...`](https://explorer.hiro.so/txid/0xcd03fb8c98218b7ef24d6d8fef19fa7ec905357bce1aff38753638eb92f35adf?chain=testnet) |
| Clear routing | [`0x4ddf...`](https://explorer.hiro.so/txid/0x4ddf2692f388cfeb24facb0586cb5fa800e024116abc2d0d0ccf33e58fbfcac5?chain=testnet) |
| Set routing | [`0x438a...`](https://explorer.hiro.so/txid/0x438ad09ed49a57a687090eca2527f93787cdd940982f38f1cfb2fbf3061fb474?chain=testnet) |
| Deposit (5 USDCx) | [`0x4edb...`](https://explorer.hiro.so/txid/0x4edab35dcad547bd7511f4b77ccd018ba3c1bb0d685d6576c322f4e240274b15?chain=testnet) |

## Project Structure

```
├── src/
│   ├── App.jsx                    # Router (home / #editor)
│   ├── components/                # Landing page sections
│   │   ├── Hero.jsx               # Full-viewport video + morphing clip-path
│   │   ├── About.jsx              # Scroll-reveal image expansion
│   │   ├── Features.jsx           # Bento grid with 3D tilt
│   │   ├── Story.jsx              # Mix-blend title + floating image
│   │   ├── Contact.jsx            # Clip-path image layering
│   │   ├── Footer.jsx
│   │   └── Navbar.jsx             # Scroll-aware navbar + wallet
│   └── editor/
│       ├── EditorPage.tsx          # Graph builder (simulate, fork, replay)
│       ├── GraphCanvas.tsx         # HTML/SVG node rendering
│       ├── TxnModal.jsx            # Execution confirmation modal
│       ├── graph-engine.ts         # DAG types, validation, toposort, templates
│       └── lib/
│           ├── keeper.ts           # Deterministic step resolver
│           ├── proof.ts            # State witness + verification
│           ├── useGraphCascade.ts  # Keeper-driven execution hook
│           ├── cascade-flow.ts     # Allocation math
│           ├── escrow-flow.ts      # Tx confirmation polling
│           ├── flowvault.ts        # FlowVault SDK factory
│           ├── config.ts           # Network + contract config
│           └── wallet.ts           # Address extraction
├── contracts/
│   └── cascade-registry.clar       # On-chain registry contract
└── package.json
```

## Tech Stack

Vite, React 19, Tailwind CSS, GSAP + ScrollTrigger, FlowVault SDK,
@stacks/connect (Leather/Xverse), Clarity, Stacks testnet.

## License

MIT
