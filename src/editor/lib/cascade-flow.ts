import type { CascadeGraph, CascadeNode } from "./graph-engine";
import { topologicalSort, getNodeById } from "./graph-engine";

export type CascadeStep = {
  nodeId: string;
  label: string;
  status: "pending" | "strategy" | "confirming" | "deposit" | "done" | "error";
  txId?: string;
  error?: string;
};

export interface CascadeState {
  steps: CascadeStep[];
  currentNodeIndex: number;
  status: "idle" | "running" | "done" | "error";
  rootDepositMicro: bigint;
}

export function buildCascadeSteps(graph: CascadeGraph): CascadeStep[] {
  const sorted = topologicalSort(graph);
  return sorted.map((id) => ({
    nodeId: id,
    label: getNodeById(id, graph)?.label ?? id,
    status: "pending" as const,
  }));
}

export function calculateNodeAllocation(
  node: CascadeNode,
  totalMicro: bigint
): {
  lockAmount: bigint;
  splitAmount: bigint;
  holdAmount: bigint;
  splitAddress: string;
} {
  if (node.type === "lock") {
    const pct = parseFloat(node.lockAmount ?? "0");
    const lockMicro = (totalMicro * BigInt(Math.round(pct * 100))) / 10_000n;
    return {
      lockAmount: lockMicro,
      splitAmount: 0n,
      holdAmount: totalMicro - lockMicro,
      splitAddress: "",
    };
  }

  if (node.type === "split") {
    const splitPct = parseFloat(node.splitAmount ?? "0");
    const splitMicro = (totalMicro * BigInt(Math.round(splitPct * 100))) / 10_000n;
    const lockPct = parseFloat(node.lockAmount ?? "0");
    const lockMicro = (totalMicro * BigInt(Math.round(lockPct * 100))) / 10_000n;
    return {
      lockAmount: lockMicro,
      splitAmount: splitMicro,
      holdAmount: totalMicro - lockMicro - splitMicro,
      splitAddress: node.splitAddress ?? "",
    };
  }

  return {
    lockAmount: 0n,
    splitAmount: 0n,
    holdAmount: totalMicro,
    splitAddress: "",
  };
}

export function getNextDepositAmount(
  node: CascadeNode,
  totalMicro: bigint,
  children: CascadeNode[]
): bigint {
  if (children.length === 0) return 0n;

  if (node.type === "hold") {
    return totalMicro / BigInt(children.length);
  }

  const alloc = calculateNodeAllocation(node, totalMicro);
  const distributable = alloc.holdAmount;

  return distributable > 0n ? distributable / BigInt(children.length) : 0n;
}
