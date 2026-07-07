"use client";

import { useMemo, useState, useCallback } from "react";
import { createFlowVaultSdk } from "./flowvault";
import { waitForTransactionSuccess } from "./escrow-flow";
import type { CascadeGraph } from "../graph-engine";
import { topologicalSort, getChildren, getNodeById } from "../graph-engine";
import { calculateNodeAllocation } from "./cascade-flow";
import { resolveNextStep, type NodeOnChainState, type CascadeExecutionState } from "./keeper";
import { signWitness } from "./proof";

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

export function useGraphCascade(walletAddress: string | null) {
  const [steps, setSteps] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "simulating" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txLinks, setTxLinks] = useState<string[]>([]);
  const [graphHash, setGraphHash] = useState<string | null>(null);
  const [witnesses, setWitnesses] = useState<any[]>([]);
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
      nodeStates[id] = { routingSet: true, depositTxId: `sim-${id}`, strategyTxId: `sim-${id}`, vaultState: null };
    }

    for (let i = 0; i < sorted.length; i++) {
      const state: CascadeExecutionState = {
        nodeIndex: i, nodeStates, rootDepositMicro,
        depositorAddress: walletAddress ?? "simulator", currentBlock: 100_000,
      };
      const resolution = resolveNextStep(graph, state);
      if (!resolution.step?.canExecute) continue;

      const step = resolution.step;
      const node = getNodeById(step.nodeId, graph)!;
      const alloc = calculateNodeAllocation(node, step.inputMicro);

      results.push({
        nodeId: step.nodeId, label: step.label, type: step.type,
        inputMicro: step.inputMicro,
        lockMicro: alloc.lockAmount, splitMicro: alloc.splitAmount, holdMicro: alloc.holdAmount,
        lockUntilBlock: 100_000 + (node.lockUntilDelta ?? 144),
        splitAddress: alloc.splitAddress || null,
      });

      nodeStates[step.nodeId] = {
        routingSet: true, depositTxId: `sim-${step.nodeId}`, strategyTxId: `sim-${step.nodeId}`,
        vaultState: { deposited: step.inputMicro, locked: alloc.lockAmount, held: alloc.holdAmount,
          split: alloc.splitAmount, lockUntilBlock: 100_000 + 144, splitAddress: alloc.splitAddress || null },
      };
    }
    setSimulated(results);
    setStatus("done");
  }, [walletAddress]);

  const execute = useCallback(
    async (graph: CascadeGraph, rootDepositMicro: bigint) => {
      if (!walletAddress || !sdk) { setError("Connect wallet first."); return; }
      setStatus("running"); setError(null); setTxLinks([]); setWitnesses([]); setSimulated([]); setReplayIndex(0);

      const sorted = topologicalSort(graph);
      const initialSteps = sorted.map((id) => {
        const n = getNodeById(id, graph);
        return { nodeId: id, label: n?.label ?? id, status: "pending" };
      });
      setSteps(initialSteps);

      const nodeStates: Record<string, NodeOnChainState> = {};
      for (const id of sorted) {
        nodeStates[id] = { routingSet: false, depositTxId: null, strategyTxId: null, vaultState: null };
      }

      try {
        const currentBlock = await sdk.getCurrentBlockHeight(walletAddress);

        for (let i = 0; i < sorted.length; i++) {
          const state: CascadeExecutionState = {
            nodeIndex: i, nodeStates, rootDepositMicro,
            depositorAddress: walletAddress, currentBlock,
          };
          const resolution = resolveNextStep(graph, state);

          if (!resolution.step || !resolution.step.canExecute) {
            if (resolution.step?.blockedReason) { setError(resolution.step.blockedReason); setStatus("error"); return; }
            setSteps((prev) => prev.map((s) => (s.nodeId === sorted[i] ? { ...s, status: "done" } : s)));
            continue;
          }

          const step = resolution.step;
          const node = getNodeById(step.nodeId, graph)!;

          setSteps((prev) => prev.map((s) => s.nodeId === step.nodeId ? { ...s, status: "strategy" } : s));
          await sdk.clearRoutingRules();

          const strategyTx = await sdk.setRoutingRules({
            lockAmount: step.allocation.lockAmount,
            lockUntilBlock: step.allocation.lockUntilBlock,
            splitAddress: step.allocation.splitAddress,
            splitAmount: step.allocation.splitAmount,
          });

          setSteps((prev) => prev.map((s) => s.nodeId === step.nodeId ? { ...s, status: "confirming", txId: strategyTx.txId } : s));
          await waitForTransactionSuccess(strategyTx.txId);

          setSteps((prev) => prev.map((s) => s.nodeId === step.nodeId ? { ...s, status: "deposit" } : s));
          const depositTx = await sdk.deposit(step.inputMicro);
          setTxLinks((prev) => [...prev, depositTx.txId]);
          await waitForTransactionSuccess(depositTx.txId);

          const witness = signWitness(resolution.graphHash, graph, i, step, strategyTx.txId, depositTx.txId);
          setWitnesses((prev) => [...prev, witness]);

          nodeStates[step.nodeId] = {
            routingSet: true, depositTxId: depositTx.txId, strategyTxId: strategyTx.txId,
            vaultState: { deposited: step.inputMicro, locked: step.allocation.lockAmount,
              held: step.allocation.holdAmount, split: step.allocation.splitAmount,
              lockUntilBlock: step.allocation.lockUntilBlock, splitAddress: step.allocation.splitAddress },
          };

          setSteps((prev) => prev.map((s) => s.nodeId === step.nodeId ? { ...s, status: "done", txId: depositTx.txId } : s));
          setGraphHash(resolution.graphHash);

          const children = getChildren(step.nodeId, graph);
          if (children.length > 0 && step.allocation.holdAmount > 0n) {
            const perChild = step.allocation.holdAmount / BigInt(children.length);
            for (const childId of children) {
              nodeStates[childId] = nodeStates[childId] || { routingSet: false, depositTxId: null, strategyTxId: null, vaultState: null };
            }
          }
        }
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Cascade execution failed.");
        setSteps((prev) => prev.map((s) => s.status !== "done" ? { ...s, status: "error", error: String(err) } : s));
      }
    }, [walletAddress, sdk]);

  return { steps, status, error, txLinks, graphHash, witnesses, simulated, replayIndex, setReplayIndex, execute, simulate };
}
