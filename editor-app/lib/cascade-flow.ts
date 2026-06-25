import type { RoutingRules, TransactionResult } from "flowvault-sdk";
import type { CascadeGraph, CascadeNode } from "@/lib/graph-engine";
import { topologicalSort, getChildren, getNodeById } from "@/lib/graph-engine";
import { waitForTransactionSuccess } from "@/lib/escrow-flow";

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

export interface CascadeVaultSdk {
  setRoutingRules(rules: RoutingRules): Promise<TransactionResult>;
  deposit(amount: bigint): Promise<TransactionResult>;
  getCurrentBlockHeight(senderAddress: string): Promise<number>;
  clearRoutingRules(): Promise<TransactionResult>;
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
  totalMicro: bigint,
  graph: CascadeGraph
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

export async function executeCascadeNode(params: {
  sdk: CascadeVaultSdk;
  node: CascadeNode;
  graph: CascadeGraph;
  walletAddress: string;
  totalMicro: bigint;
  currentBlock: number;
}): Promise<TransactionResult> {
  const alloc = calculateNodeAllocation(params.node, params.totalMicro, params.graph);
  const lockUntil = params.currentBlock + (params.node.lockUntilDelta ?? 144);

  await params.sdk.setRoutingRules({
    lockAmount: alloc.lockAmount,
    lockUntilBlock: lockUntil,
    splitAddress: alloc.splitAddress || null,
    splitAmount: alloc.splitAmount,
  });

  const depositTx = await params.sdk.deposit(params.totalMicro);
  await waitForTransactionSuccess(depositTx.txId);
  return depositTx;
}

export function getNextDepositAmount(
  node: CascadeNode,
  totalMicro: bigint,
  children: CascadeNode[],
  graph: CascadeGraph
): bigint {
  if (children.length === 0) return 0n;

  if (node.type === "hold") {
    const perChild = totalMicro / BigInt(children.length);
    return perChild;
  }

  const alloc = calculateNodeAllocation(node, totalMicro, graph);
  const distributable = alloc.holdAmount;

  if (node.type === "split") {
    const totalSplitPct = children.reduce((sum, child) => {
      const pct = parseFloat(child.lockAmount ?? child.splitAmount ?? "0");
      return sum + Math.round(pct * 100);
    }, 0);
    if (totalSplitPct === 0) {
      return distributable / BigInt(children.length);
    }
    return distributable;
  }

  return distributable > 0n ? distributable / BigInt(children.length) : 0n;
}
