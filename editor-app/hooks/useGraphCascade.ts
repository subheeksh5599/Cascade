"use client";

import { useMemo, useState, useCallback } from "react";
import { createFlowVaultSdk } from "@/lib/flowvault";
import { waitForTransactionSuccess } from "@/lib/escrow-flow";
import type { CascadeGraph, CascadeNode } from "@/lib/graph-engine";
import { topologicalSort, getChildren, getNodeById, getParents } from "@/lib/graph-engine";
import { calculateNodeAllocation } from "@/lib/cascade-flow";
import { resolveNextStep, type NodeOnChainState, type CascadeExecutionState } from "@/lib/keeper";
import { signWitness } from "@/lib/proof";

type CascadeStatus = "idle" | "running" | "done" | "error";

interface KeeperStep {
  nodeId: string;
  label: string;
  status: string;
  txId?: string;
  error?: string;
}

export function useGraphCascade(walletAddress: string | null) {
  const [keeperSteps, setKeeperSteps] = useState<KeeperStep[]>([]);
  const [status, setStatus] = useState<CascadeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [graphHash, setGraphHash] = useState<string | null>(null);
  const [witnesses, setWitnesses] = useState<ReturnType<typeof signWitness>[]>([]);

  const sdk = useMemo(
    () =>
      walletAddress
        ? createFlowVaultSdk(walletAddress)
        : null,
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
      setWitnesses([]);

      const sorted = topologicalSort(graph);

      const initialSteps: KeeperStep[] = sorted.map((id) => {
        const n = getNodeById(id, graph);
        return { nodeId: id, label: n?.label ?? id, status: "pending" };
      });
      setKeeperSteps(initialSteps);

      const nodeStates: Record<string, NodeOnChainState> = {};
      for (const id of sorted) {
        nodeStates[id] = {
          routingSet: false,
          depositTxId: null,
          strategyTxId: null,
          vaultState: null,
        };
      }

      try {
        const currentBlock = await sdk.getCurrentBlockHeight(walletAddress);

        for (let i = 0; i < sorted.length; i++) {
          const state: CascadeExecutionState = {
            nodeIndex: i,
            nodeStates,
            rootDepositMicro,
            depositorAddress: walletAddress,
            currentBlock,
          };

          const resolution = resolveNextStep(graph, state);

          if (!resolution.step || !resolution.step.canExecute) {
            if (resolution.step?.blockedReason) {
              setError(resolution.step.blockedReason);
              setStatus("error");
              return;
            }
            setKeeperSteps((prev) =>
              prev.map((s) =>
                s.nodeId === sorted[i] ? { ...s, status: "done" } : s
              )
            );
            continue;
          }

          const step = resolution.step;
          const node = getNodeById(step.nodeId, graph)!;

          setKeeperSteps((prev) =>
            prev.map((s) =>
              s.nodeId === step.nodeId ? { ...s, status: "strategy" } : s
            )
          );

          await sdk.clearRoutingRules();

          const strategyTx = await sdk.setRoutingRules({
            lockAmount: step.allocation.lockAmount,
            lockUntilBlock: step.allocation.lockUntilBlock,
            splitAddress: step.allocation.splitAddress,
            splitAmount: step.allocation.splitAmount,
          });

          setKeeperSteps((prev) =>
            prev.map((s) =>
              s.nodeId === step.nodeId
                ? { ...s, status: "confirming", txId: strategyTx.txId }
                : s
            )
          );

          await waitForTransactionSuccess(strategyTx.txId);

          setKeeperSteps((prev) =>
            prev.map((s) =>
              s.nodeId === step.nodeId ? { ...s, status: "deposit" } : s
            )
          );

          const depositTx = await sdk.deposit(step.inputMicro);
          setTxLinks((prev) => [...prev, depositTx.txId]);

          await waitForTransactionSuccess(depositTx.txId);

          const witness = signWitness(
            resolution.graphHash,
            graph,
            i,
            step,
            strategyTx.txId,
            depositTx.txId
          );
          setWitnesses((prev) => [...prev, witness]);

          nodeStates[step.nodeId] = {
            routingSet: true,
            depositTxId: depositTx.txId,
            strategyTxId: strategyTx.txId,
            vaultState: {
              deposited: step.inputMicro,
              locked: step.allocation.lockAmount,
              held: step.allocation.holdAmount,
              split: step.allocation.splitAmount,
              lockUntilBlock: step.allocation.lockUntilBlock,
              splitAddress: step.allocation.splitAddress,
            },
          };

          setKeeperSteps((prev) =>
            prev.map((s) =>
              s.nodeId === step.nodeId
                ? { ...s, status: "done", txId: depositTx.txId }
                : s
            )
          );

          setGraphHash(resolution.graphHash);

          const children = getChildren(step.nodeId, graph);
          if (children.length > 0 && step.allocation.holdAmount > 0n) {
            const perChild = step.allocation.holdAmount / BigInt(children.length);
            for (const childId of children) {
              nodeStates[childId] = nodeStates[childId] || {
                routingSet: false,
                depositTxId: null,
                strategyTxId: null,
                vaultState: null,
              };
            }
          }
        }

        setStatus("done");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Cascade execution failed.");
        setKeeperSteps((prev) =>
          prev.map((s) =>
            s.status !== "done"
              ? { ...s, status: "error", error: String(err) }
              : s
          )
        );
      }
    },
    [walletAddress, sdk]
  );

  return {
    steps: keeperSteps,
    status,
    error,
    txLinks,
    graphHash,
    witnesses,
    execute,
  };
}
