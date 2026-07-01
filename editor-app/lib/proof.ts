import type { CascadeGraph } from "@/lib/graph-engine";
import { hashGraph, type ResolvedStep } from "@/lib/keeper";

export interface CascadeStateWitness {
  cascadeId: string;
  graphHash: string;
  nodeIndex: number;
  nodeId: string;
  inputMicro: string;
  allocation: {
    lockAmount: string;
    splitAmount: string;
    holdAmount: string;
    lockUntilBlock: number;
    splitAddress: string | null;
  };
  parentDepositTxIds: string[];
  strategyTxId: string;
  depositTxId: string;
  timestamp: number;
}

export function signWitness(
  cascadeId: string,
  graph: CascadeGraph,
  nodeIndex: number,
  step: ResolvedStep,
  strategyTxId: string,
  depositTxId: string
): CascadeStateWitness {
  return {
    cascadeId,
    graphHash: hashGraph(graph),
    nodeIndex,
    nodeId: step.nodeId,
    inputMicro: step.inputMicro.toString(),
    allocation: {
      lockAmount: step.allocation.lockAmount.toString(),
      splitAmount: step.allocation.splitAmount.toString(),
      holdAmount: step.allocation.holdAmount.toString(),
      lockUntilBlock: step.allocation.lockUntilBlock,
      splitAddress: step.allocation.splitAddress,
    },
    parentDepositTxIds: step.requiredParentTxs,
    strategyTxId,
    depositTxId,
    timestamp: Date.now(),
  };
}

export function verifyWitness(
  graph: CascadeGraph,
  witness: CascadeStateWitness
): { valid: boolean; reason?: string } {
  const computedHash = hashGraph(graph);
  if (computedHash !== witness.graphHash) {
    return { valid: false, reason: "Graph hash mismatch." };
  }

  if (witness.inputMicro === "0" && witness.nodeIndex > 0) {
    return { valid: false, reason: "Zero input on non-root node." };
  }

  if (!witness.strategyTxId || !witness.strategyTxId.startsWith("0x")) {
    return { valid: false, reason: "Missing or invalid strategy tx." };
  }

  if (!witness.depositTxId || !witness.depositTxId.startsWith("0x")) {
    return { valid: false, reason: "Missing or invalid deposit tx." };
  }

  return { valid: true };
}
