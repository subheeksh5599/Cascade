import type { CascadeGraph, CascadeNode } from "@/lib/graph-engine";
import {
  topologicalSort,
  getChildren,
  getNodeById,
  getParents,
} from "@/lib/graph-engine";
import { calculateNodeAllocation } from "@/lib/cascade-flow";

export interface NodeOnChainState {
  routingSet: boolean;
  depositTxId: string | null;
  strategyTxId: string | null;
  vaultState: {
    deposited: bigint;
    locked: bigint;
    held: bigint;
    split: bigint;
    lockUntilBlock: number;
    splitAddress: string | null;
  } | null;
}

export interface CascadeExecutionState {
  nodeIndex: number;
  nodeStates: Record<string, NodeOnChainState>;
  rootDepositMicro: bigint;
  depositorAddress: string;
  currentBlock: number;
}

export interface ResolvedStep {
  nodeId: string;
  label: string;
  type: CascadeNode["type"];
  inputMicro: bigint;
  allocation: Omit<ReturnType<typeof calculateNodeAllocation>, "splitAddress"> & {
    lockUntilBlock: number;
    splitAddress: string | null;
  };
  requiredParentTxs: string[];
  canExecute: boolean;
  blockedReason: string | null;
}

export type KeeperStatus = "ready" | "blocked" | "completed" | "invalid";

export interface KeeperResult {
  status: KeeperStatus;
  step: ResolvedStep | null;
  nextIndex: number;
  executedTxIds: string[];
  graphHash: string;
}

export function hashGraph(graph: CascadeGraph): string {
  const payload = {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      lockAmount: n.lockAmount ?? "0",
      lockUntilDelta: n.lockUntilDelta ?? 0,
      splitAddress: n.splitAddress ?? "",
      splitAmount: n.splitAmount ?? "0",
    })),
    edges: graph.edges.map((e) => ({
      from: e.from,
      to: e.to,
    })),
  };

  const str = JSON.stringify(payload, Object.keys(payload).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function resolveNextStep(
  graph: CascadeGraph,
  state: CascadeExecutionState
): KeeperResult {
  const sorted = topologicalSort(graph);
  const executedTxIds: string[] = [];
  const graphHash = hashGraph(graph);

  for (const ns of Object.values(state.nodeStates)) {
    if (ns.depositTxId) executedTxIds.push(ns.depositTxId);
    if (ns.strategyTxId) executedTxIds.push(ns.strategyTxId);
  }

  if (state.nodeIndex >= sorted.length) {
    return { status: "completed", step: null, nextIndex: sorted.length, executedTxIds, graphHash };
  }

  const nodeId = sorted[state.nodeIndex];
  const node = getNodeById(nodeId, graph);

  if (!node) {
    return { status: "invalid", step: null, nextIndex: state.nodeIndex, executedTxIds, graphHash };
  }

  let inputMicro = 0n;

  if (state.nodeIndex === 0) {
    inputMicro = state.rootDepositMicro;
  } else {
    const parents = getParents(nodeId, graph);
    for (const parentId of parents) {
      const parentState = state.nodeStates[parentId];
      if (!parentState?.vaultState) continue;

      const parentNode = getNodeById(parentId, graph);
      if (!parentNode) continue;

      const parentAlloc = calculateNodeAllocation(
        parentNode,
        parentState.vaultState.deposited
      );
      const children = getChildren(parentId, graph);
      if (children.length > 0 && parentAlloc.holdAmount > 0n) {
        inputMicro += parentAlloc.holdAmount / BigInt(children.length);
      }
    }
  }

  if (inputMicro === 0n && state.nodeIndex > 0) {
    return { status: "blocked", step: null, nextIndex: state.nodeIndex, executedTxIds, graphHash };
  }

  const requiredParentTxs: string[] = [];
  let blockedReason: string | null = null;

  for (const pid of getParents(nodeId, graph)) {
    const ps = state.nodeStates[pid];
    const parentLabel = getNodeById(pid, graph)?.label ?? pid;
    if (!ps?.depositTxId) {
      blockedReason = `Waiting for "${parentLabel}" to settle.`;
    }
    requiredParentTxs.push(ps?.depositTxId ?? "");
  }

  const alloc = calculateNodeAllocation(node, inputMicro);
  const lockUntil = state.currentBlock + (node.lockUntilDelta ?? 144);

  const step: ResolvedStep = {
    nodeId,
    label: node.label,
    type: node.type,
    inputMicro,
    allocation: {
      ...alloc,
      splitAddress: alloc.splitAddress || null,
      lockUntilBlock: lockUntil,
    },
    requiredParentTxs: requiredParentTxs.filter(Boolean),
    canExecute: !blockedReason,
    blockedReason,
  };

  return {
    status: step.canExecute ? "ready" : "blocked",
    step,
    nextIndex: state.nodeIndex,
    executedTxIds,
    graphHash,
  };
}
