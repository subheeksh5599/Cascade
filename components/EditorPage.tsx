"use client";

import { useState, useEffect, useCallback } from "react";
import { WalletButton } from "@/components/WalletButton";
import { useStacksWallet } from "@/hooks/useStacksWallet";
import { useGraphCascade } from "@/hooks/useGraphCascade";
import { GraphSVG } from "@/components/GraphSVG";
import { getHiroTxUrl } from "@/lib/config";
import {
  type CascadeGraph,
  type CascadeNode,
  TEMPLATES,
  validateGraph,
  generateNodeId,
} from "@/lib/graph-engine";
import { tokenToMicro } from "flowvault-sdk";

type NodeTypeStr = "lock" | "split" | "hold";

const STEP_ICONS: Record<string, string> = {
  pending: "",
  strategy: "",
  confirming: "",
  deposit: "",
  done: "\u2713",
  error: "\u2717",
};

export function EditorPage() {
  const [graph, setGraph] = useState<CascadeGraph>(TEMPLATES[0].graph);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeTypeAdd, setNodeTypeAdd] = useState<NodeTypeStr>("lock");
  const [depositAmount, setDepositAmount] = useState("500000");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });
  const [activeTemplate, setActiveTemplate] = useState(0);

  const wallet = useStacksWallet();
  const cascade = useGraphCascade(wallet.address);

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

  function handleExecute() {
    const v = validateGraph(graph);
    setValidation(v);
    if (!v.valid) return;
    cascade.execute(graph, tokenToMicro(depositAmount));
  }

  const activeNode = cascade.steps.find((s) => s.status !== "pending" && s.status !== "done")?.nodeId ?? null;
  const running = cascade.status === "running";
  const done = cascade.status === "done";
  const hasSteps = cascade.steps.length > 0;

  return (
    <main className="editor-page">
      <header className="topbar-fixed">
        <div className="brand"><a href="/" className="brand-name">Cascade</a></div>
        <nav className="topbar-nav"><a href="/" className="nav-link">Home</a><span className="nav-link active">Editor</span></nav>
        <WalletButton />
      </header>

      <div className="editor-layout">
        <div className="editor-main">
          {/* Toolbar */}
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <span className="editor-toolbar-label">Add node:</span>
              <select value={nodeTypeAdd} onChange={(e) => setNodeTypeAdd(e.target.value as NodeTypeStr)} className="nf-input" style={{ width: 100 }}>
                <option value="lock">Lock</option><option value="split">Split</option><option value="hold">Hold</option>
              </select>
              <button className="btn-accent btn-sm" onClick={addNode}>+ Add</button>
            </div>
            <div className="chip-row">
              {TEMPLATES.map((t, i) => (
                <button key={t.name} className={`chip ${i === activeTemplate ? "chip--active" : ""}`}
                  onClick={() => { setGraph(t.graph); setSelectedNode(null); setActiveTemplate(i); }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Graph canvas */}
          <div className="editor-canvas">
            <GraphSVG graph={graph} activeNode={activeNode} cascadeDone={done} />
          </div>

          {/* Execution progress */}
          {hasSteps && (
            <div className="editor-progress">
              {cascade.steps.map((step, i) => (
                <div key={step.nodeId}
                  className={`ce-step ce-step--${step.status} ${step.status === "deposit" || step.status === "confirming" ? "ce-step--live" : ""}`}>
                  <span className="ce-step__order">{STEP_ICONS[step.status] || i + 1}</span>
                  <span className="ce-step__label">{step.label}</span>
                  <span className="ce-step__status">{step.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="editor-actions">
            <div className="editor-deposit">
              <span className="ce-label">Root Deposit</span>
              <div className="ce-deposit-row">
                <input type="number" min="0" step="0.000001" inputMode="decimal"
                  value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                  className="ce-amount" />
                <span className="ce-currency">USDCx</span>
              </div>
            </div>

            {!validation.valid && (
              <div className="status-panel error">{validation.errors.map((e, i) => <div key={i}>{e}</div>)}</div>
            )}

            <button className="btn-accent" onClick={handleExecute}
              disabled={!wallet.isConnected || running}>
              {running ? "Cascading..." : done ? "\u2713 Complete" : "Execute Cascade"}
            </button>

            {cascade.error && <div className="status-panel error">{cascade.error}</div>}

            {cascade.txLinks.length > 0 && (
              <div className="tx-links">
                {cascade.txLinks.map((txId, i) => (
                  <a key={txId} href={getHiroTxUrl(txId)} target="_blank" rel="noreferrer">
                    Node {i + 1}: {txId.slice(0, 10)}...
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="editor-sidebar">
          <h3>Node Properties</h3>
          {selectedNode && graph.nodes.find((n) => n.id === selectedNode) ? (
            <div className="node-form">
              {(() => {
                const n = graph.nodes.find((n) => n.id === selectedNode)!;
                return (
                  <>
                    <div className="node-form__field">
                      <label>Label</label>
                      <input type="text" value={n.label} onChange={(e) => updateNode(selectedNode, { label: e.target.value })} className="nf-input" />
                    </div>
                    <div className="node-form__field">
                      <label>Type</label>
                      <div className="node-form__type-badge">{n.type}</div>
                    </div>
                    {(n.type === "lock" || n.type === "split") && (
                      <div className="node-form__field">
                        <label>Lock %</label>
                        <input type="number" min="0" max="100" value={n.lockAmount ?? ""} onChange={(e) => updateNode(selectedNode, { lockAmount: e.target.value })} className="nf-input" />
                      </div>
                    )}
                    {n.type !== "hold" && (
                      <div className="node-form__field">
                        <label>Lock Duration (blocks)</label>
                        <input type="number" min="1" value={n.lockUntilDelta ?? 144} onChange={(e) => updateNode(selectedNode, { lockUntilDelta: parseInt(e.target.value) || 144 })} className="nf-input" />
                      </div>
                    )}
                    {n.type === "split" && (
                      <>
                        <div className="node-form__field">
                          <label>Split Address</label>
                          <input type="text" placeholder="ST..." value={n.splitAddress ?? ""} onChange={(e) => updateNode(selectedNode, { splitAddress: e.target.value })} className="nf-input" />
                        </div>
                        <div className="node-form__field">
                          <label>Split %</label>
                          <input type="number" min="0" max="100" value={n.splitAmount ?? ""} onChange={(e) => updateNode(selectedNode, { splitAmount: e.target.value })} className="nf-input" />
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <span className="text-muted" style={{ fontSize: 12 }}>Select a node in the graph</span>
          )}

          <div className="node-list">
            <h4>Nodes</h4>
            {graph.nodes.map((n) => (
              <button key={n.id}
                className={`node-chip ${selectedNode === n.id ? "node-chip--selected" : ""}`}
                onClick={() => setSelectedNode(n.id)}>
                <span className={`node-chip__glyph node-chip__glyph--${n.type}`}>{n.type[0].toUpperCase()}</span>
                <span className="node-chip__label">{n.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
