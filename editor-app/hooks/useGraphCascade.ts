"use client";

import { useMemo, useState, useCallback } from "react";
import { createFlowVaultSdk } from "@/lib/flowvault";
import { waitForTransactionSuccess } from "@/lib/escrow-flow";
import type { CascadeGraph } from "@/lib/graph-engine";
import { topologicalSort, getChildren, getNodeById } from "@/lib/graph-engine";
import { calculateNodeAllocation } from "@/lib/cascade-flow";
import { resolveNextStep, type NodeOnChainState, type CascadeExecutionState } from "@/lib/keeper";
import { signWitness } from "@/lib/proof";

type CascadeStatus = "idle" | "running" | "simulating" | "done" | "error";

export interface SimulatedStep {
  nodeId: string;
  label: string;
  type: string;
  inputMicro: bigint;
  lockMicro: bigint;
  splitMicro: bigint;
  holdMicro: bigint;
  lockUntilBlock: number;
  splitAddress: string | null;
}

export interface KeeperStep {
  nodeId: string;
  label: string;
  status: string;
  txId?: string;
  error?: string;
  allocation?: { lock: bigint; split: bigint; hold: bigint };
}

export function useGraphCascade(walletAddress: string | null) {
  const [steps, setSteps] = useState<KeeperStep[]>([]);
  const [status, setStatus] = useState<CascadeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [graphHash, setGraphHash] = useState<string | null>(null);
  const [witnesses, setWitnesses] = useState<ReturnType<typeof signWitness>[]>([]);
  const [simulated, setSimulated] = useState<SimulatedStep[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);

  const sdk = useMemo(
    () => (walletAddress ? createFlowVaultSdk(walletAddress) : null),
    [walletAddress]
  );

  const simulate = useCallback((graph: CascadeGraph, rootDepositMicro: bigint) => {
    setStatus("simulating");
    setError(null);
    setSimulated([]);

    const sorted = topologicalSort(graph);
    const results: SimulatedStep[] = [];
    const nodeStates: Record<string, NodeOnChainState> = {};

    for (const id of sorted) {
      nodeStates[id] = {
        routingSet: true,
        depositTxId: `sim-${id}`,
        strategyTxId: `sim-strat-${id}`,
        vaultState: null,
      };
    }

    const fakeBlock = 100_000;

    for (let i = 0; i < sorted.length; i++) {
      const state: CascadeExecutionState = {
        nodeIndex: i,
        nodeStates,
        rootDepositMicro,
        depositorAddress: walletAddress ?? "simulator",
        currentBlock: fakeBlock,
      };

      const resolution = resolveNextStep(graph, state);
      if (!resolution.step?.canExecute) continue;

      const step = resolution.step;
      const alloc = calculateNodeAllocation(
        getNodeById(step.nodeId, graph)!,
        step.inputMicro
      );

      results.push({
        nodeId: step.nodeId,
        label: step.label,
        type: step.type,
        inputMicro: step.inputMicro,
        lockMicro: alloc.lockAmount,
        splitMicro: alloc.splitAmount,
        holdMicro: alloc.holdAmount,
        lockUntilBlock: fakeBlock + (graph.nodes.find((n) => n.id === step.nodeId)?.lockUntilDelta ?? 144),
        splitAddress: alloc.splitAddress || null,
      });

      nodeStates[step.nodeId] = {
        routingSet: true,
        depositTxId: `sim-${step.nodeId}`,
        strategyTxId: `sim-strat-${step.nodeId}`,
        vaultState: {
          deposited: step.inputMicro,
          locked: alloc.lockAmount,
          held: alloc.holdAmount,
          split: alloc.splitAmount,
          lockUntilBlock: fakeBlock + 144,
          splitAddress: alloc.splitAddress || null,
        },
      };
    }

    setSimulated(results);
    setStatus("done");
  }, [walletAddress]);

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
      setSimulated([]);
      setReplayIndex(0);

      const sorted = topologicalSort(graph);

      const initialSteps: KeeperStep[] = sorted.map((id) => {
        const n = getNodeById(id, graph);
        return { nodeId: id, label: n?.label ?? id, status: "pending" };
      });
      setSteps(initialSteps);

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
            setSteps((prev) =>
              prev.map((s) => (s.nodeId === sorted[i] ? { ...s, status: "done" } : s))
            );
            continue;
          }

          const step = resolution.step;

          setSteps((prev) =>
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

          setSteps((prev) =>
            prev.map((s) =>
              s.nodeId === step.nodeId
                ? { ...s, status: "confirming", txId: strategyTx.txId }
                : s
            )
          );

          await waitForTransactionSuccess(strategyTx.txId);

          setSteps((prev) =>
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

          const alloc = step.allocation;

          nodeStates[step.nodeId] = {
            routingSet: true,
            depositTxId: depositTx.txId,
            strategyTxId: strategyTx.txId,
            vaultState: {
              deposited: step.inputMicro,
              locked: alloc.lockAmount,
              held: alloc.holdAmount,
              split: alloc.splitAmount,
              lockUntilBlock: alloc.lockUntilBlock,
              splitAddress: alloc.splitAddress,
            },
          };

          setSteps((prev) =>
            prev.map((s) =>
              s.nodeId === step.nodeId
                ? {
                    ...s,
                    status: "done",
                    txId: depositTx.txId,
                    allocation: {
                      lock: alloc.lockAmount,
                      split: alloc.splitAmount,
                      hold: alloc.holdAmount,
                    },
                  }
                : s
            )
          );

          setGraphHash(resolution.graphHash);

          const children = getChildren(step.nodeId, graph);
          if (children.length > 0 && alloc.holdAmount > 0n) {
            const perChild = alloc.holdAmount / BigInt(children.length);
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
        setSteps((prev) =>
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
    steps,
    status,
    error,
    txLinks,
    graphHash,
    witnesses,
    simulated,
    replayIndex,
    setReplayIndex,
    execute,
    simulate,
  };
}
