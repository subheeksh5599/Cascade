import { useState, useEffect, useCallback } from "react";
import { type CascadeGraph, type CascadeNode, TEMPLATES, validateGraph, generateNodeId } from "./graph-engine";
import { GraphCanvas } from "./GraphCanvas";
import { TxnModal } from "./TxnModal";
import { useGraphCascade } from "./lib/useGraphCascade";
import { tokenToMicro } from "flowvault-sdk";
import { getHiroTxUrl } from "./lib/config";
import type { NodeType } from "./graph-engine";

const TYPE_COLORS: Record<string, string> = {
  lock: "#f59e0b",
  split: "#6366f1",
  hold: "#06b6d4",
};

export function EditorPage({ walletAddress, onNavigateHome }) {
  const [graph, setGraph] = useState<CascadeGraph>(TEMPLATES[0].graph);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeTypeAdd, setNodeTypeAdd] = useState<NodeType>("lock");
  const [depositInput, setDepositInput] = useState("500000");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [showTxnModal, setShowTxnModal] = useState(false);

  const cascade = useGraphCascade(walletAddress);

  const runValidate = useCallback(() => setValidation(validateGraph(graph)), [graph]);
  useEffect(() => { runValidate(); }, [runValidate]);

  const updateNode = useCallback((id: string, updates: Partial<CascadeNode>) => {
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)) }));
  }, []);

  const addNode = useCallback(() => {
    const lastY = graph.nodes.length > 0 ? Math.max(...graph.nodes.map((n) => n.y)) + 90 : 200;
    const id = generateNodeId();
    setGraph((g) => ({
      ...g,
      nodes: [...g.nodes, { id, type: nodeTypeAdd, label: `Node ${g.nodes.length + 1}`, x: 435, y: lastY, lockAmount: nodeTypeAdd === "lock" ? "50" : "0", lockUntilDelta: 144, splitAddress: "", splitAmount: nodeTypeAdd === "split" ? "10" : "0" }],
    }));
    setSelectedNode(id);
  }, [nodeTypeAdd, graph.nodes]);

  const addEdge = useCallback(() => {
    if (!selectedNode) return;
    const children = graph.edges.filter((e) => e.from === selectedNode).map((e) => e.to);
    const available = graph.nodes.filter((n) => n.id !== selectedNode && !children.includes(n.id));
    if (available.length === 0) return;
    const target = available[available.length - 1];
    setGraph((g) => ({ ...g, edges: [...g.edges, { from: selectedNode, to: target.id }] }));
  }, [selectedNode, graph]);

  const openExecuteModal = () => {
    const v = validateGraph(graph);
    if (!walletAddress) {
      setValidation({ valid: false, errors: ["Connect wallet before executing."] });
      return;
    }
    // Check all nodes have destination wallets
    const missing = graph.nodes.filter(
      (n) => !n.walletAddress && !n.splitAddress
    );
    if (missing.length > 0) {
      setValidation({
        valid: false,
        errors: missing.map((n) => `"${n.label}" has no destination wallet. Select the node and enter a Stacks address.`),
      });
      return;
    }
    setValidation(v);
    if (!v.valid) return;
    setShowTxnModal(true);
  };

  const executeCascade = () => {
    setShowTxnModal(false);
    try {
      const amountMicro = tokenToMicro(depositInput);
      if (amountMicro <= 0n) {
        setValidation({ valid: false, errors: ["Deposit amount must be greater than 0."] });
        return;
      }
      cascade.execute(graph, amountMicro);
    } catch (err) {
      setValidation({ valid: false, errors: [`Invalid amount: ${err instanceof Error ? err.message : String(err)}`] });
    }
  };

  const selectedNodeData = selectedNode ? graph.nodes.find((n) => n.id === selectedNode) : null;
  const activeStep = cascade.steps.find((s) => s.status !== "pending" && s.status !== "done")?.nodeId ?? null;
  const hasSteps = cascade.steps.length > 0;
  const isRunning = cascade.status === "running";
  const steps = cascade.steps;
  const txLinks = cascade.txLinks;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Editor Header */}
      <header className="border-b border-slate-900 px-6 py-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
        <a href="/" className="text-xl font-black text-white uppercase no-underline">
          CASCADE<span className="text-emerald-400">.</span>
        </a>
        <div className="flex items-center gap-5">
          <button onClick={onNavigateHome} className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider hover:text-white transition-colors">Exit Editor</button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          {/* Toolbar */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Assemble:</span>
              <select
                value={nodeTypeAdd}
                onChange={(e) => setNodeTypeAdd(e.target.value as NodeType)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="lock">Lock Rule</option>
                <option value="split">Split Rule</option>
                <option value="hold">Hold Rule</option>
              </select>
              <button onClick={addNode} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                + ADD NODE
              </button>
              {selectedNode && (
                <button onClick={addEdge} className="bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/50 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  CONNECT
                </button>
              )}
            </div>

            {/* Deposit Input */}
            <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2 shadow-inner">
              <label className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Deposit:
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-28 bg-transparent text-white font-mono text-sm font-extrabold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider ml-1">USDCx</span>
              </div>
            </div>

            {/* Execute */}
            <button
              onClick={openExecuteModal}
              disabled={isRunning || !walletAddress}
              className={`text-xs font-black px-5 py-2 rounded-lg transition-all uppercase tracking-wider ${
                !walletAddress
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(52,211,153,0.4)]"
              }`}
            >
              {!walletAddress ? "Connect Wallet" : isRunning ? "Cascading..." : "Execute"}
            </button>
          </div>

          {/* Template buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {TEMPLATES.map((t, i) => (
              <button key={t.name}
                onClick={() => { setGraph(t.graph); setSelectedNode(null); setActiveTemplate(i); }}
                className={`border text-[10px] font-mono px-2.5 py-1.5 rounded transition-all whitespace-nowrap ${
                  i === activeTemplate
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-400"
                    : "border-slate-800 bg-slate-900 text-slate-500 hover:text-white"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 min-h-[400px] border border-slate-900 rounded-xl bg-slate-950 overflow-hidden">
            <GraphCanvas graph={graph} activeNode={activeStep || selectedNode} onSelectNode={setSelectedNode} />
          </div>

          {/* Execution Progress */}
          {hasSteps && (
            <div className="flex gap-3 flex-wrap">
              {steps.map((step, i) => (
                <div key={step.nodeId}
                  className={`flex-1 min-w-[120px] p-3 rounded-lg border text-xs ${
                    step.status === "done"
                      ? "border-emerald-900/30 bg-emerald-950/20 text-emerald-400"
                      : step.status === "deposit" || step.status === "confirming"
                      ? "border-slate-700 bg-slate-800/60 text-white animate-pulse"
                      : step.status === "error"
                      ? "border-red-900/30 bg-red-950/20 text-red-400"
                      : "border-slate-800 bg-slate-900/40 text-slate-500"
                  }`}>
                  <div className="text-[18px] font-mono font-bold mb-1">
                    {step.status === "done" ? "\u2713" : step.status === "error" ? "\u2717" : i + 1}
                  </div>
                  <div className="font-semibold text-white/90">{step.label}</div>
                  <div className="text-[9px] uppercase tracking-wider mt-1 opacity-60">{step.status}</div>
                </div>
              ))}
            </div>
          )}

          {/* Transaction links */}
          {txLinks.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {txLinks.map((tx, i) => (
                <a key={i}
                  href={getHiroTxUrl(tx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-emerald-400/70 hover:text-emerald-300 bg-emerald-950/20 border border-emerald-900/30 px-3 py-1.5 rounded transition-colors">
                  Node {i + 1}: {tx.slice(0, 10)}... &rarr;
                </a>
              ))}
            </div>
          )}

          {/* Validation errors */}
          {!validation.valid && (
            <div className="p-3 border border-red-900/30 rounded-lg bg-red-950/20 text-red-400 text-xs font-mono">
              {validation.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {/* Cascade execution error */}
          {cascade.error && (
            <div className="p-3 border border-red-900/30 rounded-lg bg-red-950/20 text-red-400 text-xs font-mono flex items-center gap-2">
              <span className="text-base">!</span> {cascade.error}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="w-[280px] border-l border-slate-900 p-5 flex flex-col gap-4 bg-slate-950/60 overflow-y-auto">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Node Properties</h3>
          {selectedNodeData ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-500">Label</label>
                <input type="text" value={selectedNodeData.label} onChange={(e) => updateNode(selectedNode!, { label: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-500">Type</label>
                <span className="inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit"
                  style={{ color: TYPE_COLORS[selectedNodeData.type], background: `${TYPE_COLORS[selectedNodeData.type]}15`, border: `1px solid ${TYPE_COLORS[selectedNodeData.type]}40` }}>
                  {selectedNodeData.type}
                </span>
              </div>
              {(selectedNodeData.type === "lock" || selectedNodeData.type === "split") && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500">Lock %</label>
                    <input type="number" min="0" max="100" value={selectedNodeData.lockAmount ?? ""} onChange={(e) => updateNode(selectedNode!, { lockAmount: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500">Duration (blocks)</label>
                    <input type="number" min="1" value={selectedNodeData.lockUntilDelta ?? 144} onChange={(e) => updateNode(selectedNode!, { lockUntilDelta: parseInt(e.target.value) || 144 })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </>
              )}
              {selectedNodeData.type === "split" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500">Split %</label>
                    <input type="number" min="0" max="100" value={selectedNodeData.splitAmount ?? ""} onChange={(e) => updateNode(selectedNode!, { splitAmount: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-500">
                  Destination Wallet
                  <span className="text-emerald-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedNodeData.type === "split" ? "ST... split destination" : "ST... recipient address"}
                    value={selectedNodeData.walletAddress ?? selectedNodeData.splitAddress ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateNode(selectedNode!, { walletAddress: val, splitAddress: val });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 pr-8 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  {((selectedNodeData.walletAddress || selectedNodeData.splitAddress) && (selectedNodeData.walletAddress?.length || selectedNodeData.splitAddress?.length || 0) >= 8) && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  )}
                </div>
                {(!selectedNodeData.walletAddress && !selectedNodeData.splitAddress) && (
                  <span className="text-[8px] text-slate-600 mt-0.5">Enter a Stacks address for this node</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Select a node</span>
          )}
          <div className="flex flex-col gap-2 mt-auto">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Nodes</h4>
            {graph.nodes.map((n) => (
              <button key={n.id} onClick={() => setSelectedNode(n.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all"
                style={{
                  borderColor: selectedNode === n.id ? `${TYPE_COLORS[n.type]}50` : "rgba(51,65,85,0.6)",
                  background: selectedNode === n.id ? `${TYPE_COLORS[n.type]}08` : "transparent",
                }}>
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black"
                  style={{ background: `${TYPE_COLORS[n.type]}15`, border: `1px solid ${TYPE_COLORS[n.type]}30`, color: TYPE_COLORS[n.type] }}>
                  {n.type[0].toUpperCase()}
                </span>
                <span className="text-xs font-medium text-white">{n.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </main>

      <TxnModal
        isOpen={showTxnModal}
        onClose={() => setShowTxnModal(false)}
        onConfirm={executeCascade}
        graph={graph}
        depositAmount={depositInput}
      />
    </div>
  );
}
