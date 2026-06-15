"use client";

import { useMemo, useState, useCallback } from "react";
import { createFlowVaultSdk } from "@/lib/flowvault";
import { waitForTransactionSuccess } from "@/lib/escrow-flow";
import type { CascadeGraph } from "@/lib/graph-engine";
import { topologicalSort, getChildren, getNodeById } from "@/lib/graph-engine";
import {
  type CascadeStep,
  type CascadeVaultSdk,
  calculateNodeAllocation,
  getNextDepositAmount,
} from "@/lib/cascade-flow";

export function useGraphCascade(walletAddress: string | null) {
  const [steps, setSteps] = useState<CascadeStep[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txLinks, setTxLinks] = useState<string[]>([]);

  const sdk = useMemo(
    () => (walletAddress ? (createFlowVaultSdk(walletAddress) as unknown as CascadeVaultSdk) : null),
    [walletAddress]
  );

  const execute = useCallback(
    async (graph: CascadeGraph, rootDepositMicro: bigint) => {
      if (!walletAddress || !sdk) {
        setError("Connect wallet first.");
        return;
      }

      setStatus("running");
      setError(null);
      setTxLinks([]);

      const sorted = topologicalSort(graph);
      const initialSteps: CascadeStep[] = sorted.map((id) => ({
        nodeId: id,
        label: getNodeById(id, graph)?.label ?? id,
        status: "pending",
      }));
      setSteps(initialSteps);

      const nodeBalances = new Map<string, bigint>();
      nodeBalances.set(sorted[0], rootDepositMicro);

      try {
        for (let i = 0; i < sorted.length; i++) {
          const nodeId = sorted[i];
          const node = getNodeById(nodeId, graph)!;
          const totalMicro = nodeBalances.get(nodeId) ?? 0n;

          if (totalMicro === 0n) {
            setSteps((prev) =>
              prev.map((s) => (s.nodeId === nodeId ? { ...s, status: "done" } : s))
            );
            continue;
          }

          setSteps((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "strategy" } : s
            )
          );

          const currentBlock = await sdk.getCurrentBlockHeight(walletAddress);
          const alloc = calculateNodeAllocation(node, totalMicro, graph);
          const lockUntil = currentBlock + (node.lockUntilDelta ?? 144);

          await sdk.clearRoutingRules();
          await sdk.setRoutingRules({
            lockAmount: alloc.lockAmount,
            lockUntilBlock: lockUntil,
            splitAddress: alloc.splitAddress || null,
            splitAmount: alloc.splitAmount,
          });

          const strategyTx = await sdk.setRoutingRules({
            lockAmount: alloc.lockAmount,
            lockUntilBlock: lockUntil,
            splitAddress: alloc.splitAddress || null,
            splitAmount: alloc.splitAmount,
          });

          setSteps((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "confirming" as const, txId: strategyTx.txId } : s
            )
          );

          await waitForTransactionSuccess(strategyTx.txId);

          setSteps((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "deposit" as const } : s
            )
          );

          const depositTx = await sdk.deposit(totalMicro);
          setTxLinks((prev) => [...prev, depositTx.txId]);

          await waitForTransactionSuccess(depositTx.txId);

          setSteps((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: "done" as const, txId: depositTx.txId } : s
            )
          );

          const children = getChildren(nodeId, graph);
          if (children.length > 0) {
            const distributable = alloc.holdAmount > 0n ? alloc.holdAmount : totalMicro;
            const perChild = distributable / BigInt(children.length);
            for (const childId of children) {
              nodeBalances.set(childId, perChild);
            }
          }
        }

        setStatus("done");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Cascade execution failed.");
        setSteps((prev) =>
          prev.map((s) =>
            s.status !== "done" ? { ...s, status: "error", error: String(err) } : s
          )
        );
      }
    },
    [walletAddress, sdk]
  );

  return { steps, status, error, txLinks, execute };
}
