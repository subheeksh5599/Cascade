"use client";

import { useState, useEffect, useCallback } from "react";
import { WalletButton } from "@/components/WalletButton";
import { useStacksWallet } from "@/hooks/useStacksWallet";
import { useGraphCascade } from "@/hooks/useGraphCascade";
import { GraphSVG } from "@/components/GraphSVG";
import { getHiroTxUrl } from "@/lib/config";
import { hashGraph } from "@/lib/keeper";
import {
  type CascadeGraph,
  type CascadeNode,
  TEMPLATES,
  validateGraph,
  generateNodeId,
} from "@/lib/graph-engine";
import { tokenToMicro } from "flowvault-sdk";

type NodeTypeStr = "lock" | "split" | "hold";

function graphToBase64(g: CascadeGraph): string {
  try { return btoa(JSON.stringify(g)); } catch { return ""; }
}

function base64ToGraph(s: string): CascadeGraph | null {
  try {
    const g = JSON.parse(atob(s));
    if (g?.nodes && g?.edges) return g;
    return null;
  } catch { return null; }
}

export function EditorPage() {
  const [graph, setGraph] = useState<CascadeGraph>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith("g=")) {
        const g = base64ToGraph(hash.slice(2));
        if (g) return g;
      }
    }
    return TEMPLATES[0].graph;
  });

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeTypeAdd, setNodeTypeAdd] = useState<NodeTypeStr>("lock");
  const [depositAmount, setDepositAmount] = useState("500000");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [computedHash, setComputedHash] = useState("");
  const [forkInput, setForkInput] = useState("");
  const [forkError, setForkError] = useState("");

  const wallet = useStacksWallet();
  const cascade = useGraphCascade(wallet.address);

  const runValidate = useCallback(() => setValidation(validateGraph(graph)), [graph]);
  useEffect(() => { runValidate(); }, [runValidate]);

  useEffect(() => {
    if (validation.valid) setComputedHash(hashGraph(graph));
  }, [graph, validation.valid]);

  const updateNode = useCallback((id: string, updates: Partial<CascadeNode>) => {
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)) }));
  }, []);

  const addNode = useCallback(() => {
    const lastY = graph.nodes.length > 0 ? Math.max(...graph.nodes.map((n) => n.y)) + 90 : 200;
    const id = generateNodeId();
    const cap = nodeTypeAdd[0].toUpperCase() + nodeTypeAdd.slice(1);
    setGraph((g) => ({
      ...g,
      nodes: [...g.nodes, {
        id, type: nodeTypeAdd, label: `${cap} ${g.nodes.length + 1}`,
        x: 435, y: lastY,
        lockAmount: nodeTypeAdd === "lock" ? "50" : "0",
        lockUntilDelta: 144, splitAddress: "",
        splitAmount: nodeTypeAdd === "split" ? "10" : "0",
      }],
    }));
    setSelectedNode(id);
  }, [nodeTypeAdd, graph.nodes]);

  function handleFork() {
    setForkError("");
    const val = forkInput.trim();
    if (!val) return;

    const byHash = TEMPLATES.find((t) => {
      const h = hashGraph(t.graph);
      return h === val || h.startsWith(val);
    });
    if (byHash) {
      setGraph(byHash.graph);
      setActiveTemplate(TEMPLATES.indexOf(byHash));
      setForkInput("");
      return;
    }

    const idx = parseInt(val);
    if (!isNaN(idx) && idx >= 0 && idx < TEMPLATES.length) {
      setGraph(TEMPLATES[idx].graph);
      setActiveTemplate(idx);
      setForkInput("");
      return;
    }

    const g = base64ToGraph(val);
    if (g) {
      setGraph(g);
      setActiveTemplate(-1);
      setForkInput("");
      return;
    }

    setForkError("Not found. Try template index (0-8) or paste a graph URL.");
  }

  function handleShare() {
    const enc = graphToBase64(graph);
    const url = `${window.location.origin}/editor#g=${enc}`;
    navigator.clipboard.writeText(url).catch(() => {
      prompt("Copy this link:", url);
    });
  }

  function handleSimulate() {
    const v = validateGraph(graph);
    setValidation(v);
    if (!v.valid) return;
    cascade.simulate(graph, tokenToMicro(depositAmount));
  }

  function handleExecute() {
    const v = validateGraph(graph);
    setValidation(v);
    if (!v.valid) return;
    cascade.execute(graph, tokenToMicro(depositAmount));
  }

  const activeNode = cascade.steps.find(
    (s) => s.status !== "pending" && s.status !== "done"
  )?.nodeId ?? null;

  const allSteps = cascade.steps.length > 0 ? cascade.steps : [];
  const running = cascade.status === "running";
  const done = cascade.status === "done";
  const hasSimulated = cascade.simulated.length > 0;
  const totalSteps = allSteps.length > 0 ? allSteps.length : cascade.simulated.length;

  const replayNode =
    done && cascade.replayIndex > 0
      ? (allSteps[cascade.replayIndex - 1]?.nodeId ?? null)
      : null;

  return (
    <main className="editor-page">
      <header className="topbar-fixed">
        <div className="brand"><a href="/" className="brand-name">Cascade</a></div>
        <nav className="topbar-nav">
          <a href="/" className="nav-link">Home</a>
          <span className="nav-link active">Editor</span>
        </nav>
        <WalletButton />
      </header>

      <div className="editor-layout">
        <div className="editor-main">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <span className="editor-toolbar-label">Add node:</span>
              <select value={nodeTypeAdd} onChange={(e) => setNodeTypeAdd(e.target.value as NodeTypeStr)} className="nf-input" style={{ width: 100 }}>
                <option value="lock">Lock</option><option value="split">Split</option><option value="hold">Hold</option>
              </select>
              <button className="btn-accent btn-sm" onClick={addNode}>+ Add</button>
            </div>

            <div className="toolbar-group">
              <input
                type="text"
                placeholder="Paste graph hash to fork..."
                value={forkInput}
                onChange={(e) => { setForkInput(e.target.value); setForkError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleFork()}
                className="nf-input"
                style={{ width: 220, fontSize: 11 }}
              />
              <button className="btn-accent btn-sm" onClick={handleFork}>Fork</button>
              {forkError && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 8 }}>{forkError}</span>}
            </div>

            <button className="btn-ghost" onClick={handleShare} title="Copy share link" style={{ fontSize: 11 }}>
              Share
            </button>

            <div className="chip-row">
              {TEMPLATES.map((t, i) => (
                <button key={t.name} className={`chip ${i === activeTemplate ? "chip--active" : ""}`}
                  onClick={() => { setGraph(t.graph); setSelectedNode(null); setActiveTemplate(i); }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="editor-canvas">
            <GraphSVG
              graph={graph}
              activeNode={activeNode}
              cascadeDone={done}
              simulated={hasSimulated ? cascade.simulated : undefined}
              replayNode={replayNode}
            />
          </div>

          {allSteps.length > 0 && (
            <div className="editor-progress">
              {allSteps.map((step, i) => (
                <div key={step.nodeId}
                  className={`ce-step ce-step--${step.status} ${step.status === "deposit" || step.status === "confirming" ? "ce-step--live" : ""}`}>
                  <span className="ce-step__order">
                    {step.status === "done" ? "\u2713" : step.status === "error" ? "\u2717" : i + 1}
                  </span>
                  <span className="ce-step__label">{step.label}</span>
                  <span className="ce-step__status">{step.status}</span>
                  {step.txId && (
                    <a href={getHiroTxUrl(step.txId)} target="_blank" rel="noreferrer"
                      style={{ fontSize: 9, color: "var(--bone)", marginLeft: 8, textDecoration: "underline" }}>
                      {step.txId.slice(0, 8)}...
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasSimulated && !allSteps.length && (
            <div className="editor-progress">
              {cascade.simulated.map((s, i) => (
                <div key={s.nodeId} className="ce-step ce-step--done">
                  <span className="ce-step__order">{i + 1}</span>
                  <span className="ce-step__label">{s.label}</span>
                  <span className="ce-step__status">simulated</span>
                  <span style={{ fontSize: 9, color: "var(--bone)", marginLeft: 8 }}>
                    {Number(s.inputMicro) / 1e6} USDCx
                  </span>
                </div>
              ))}
            </div>
          )}

          {done && totalSteps > 1 && (
            <div className="replay-bar">
              <div className="replay-bar__head">
                <span className="replay-bar__label">Replay</span>
                <span className="replay-bar__step">
                  {cascade.replayIndex === 0
                    ? "Drag to replay execution"
                    : `Step ${cascade.replayIndex}/${totalSteps}: ${allSteps[cascade.replayIndex - 1]?.label ?? ""}`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={totalSteps}
                value={cascade.replayIndex}
                onChange={(e) => cascade.setReplayIndex(parseInt(e.target.value))}
                className="replay-slider"
              />
              {cascade.replayIndex > 0 && allSteps[cascade.replayIndex - 1]?.txId && (
                <a
                  href={getHiroTxUrl(allSteps[cascade.replayIndex - 1].txId!)}
                  target="_blank" rel="noreferrer"
                  className="replay-bar__txlink"
                >
                  View Tx on Hiro Explorer
                </a>
              )}
            </div>
          )}

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
              <div className="status-panel error">
                {validation.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" onClick={handleSimulate}
                disabled={running}>
                Simulate
              </button>
              <button className="btn-accent" onClick={handleExecute}
                disabled={!wallet.isConnected || running}>
                {running ? "Cascading..." : done ? "Complete" : "Execute Cascade"}
              </button>
            </div>

            {cascade.error && <div className="status-panel error">{cascade.error}</div>}

            {cascade.graphHash && done && (
              <div className="hash-panel">
                <div className="hash-panel__label">Graph Hash</div>
                <code className="hash-panel__hash">{cascade.graphHash}</code>
                <div className="hash-panel__meta">
                  {cascade.witnesses.length} execution witnesses generated
                </div>
              </div>
            )}

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

          {computedHash && validation.valid && (
            <div className="sidebar-hash">
              <div style={{ fontSize: 11, color: "var(--bone)", marginBottom: 4 }}>Graph Hash</div>
              <code style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", wordBreak: "break-all" }}>{computedHash}</code>
            </div>
          )}

          <div className="node-list">
            <h4>Nodes</h4>
            {graph.nodes.map((n) => (
              <button key={n.id}
                className={`node-chip ${selectedNode === n.id ? "node-chip--selected" : ""}`}
                onClick={() => setSelectedNode(n.id)}
                style={{
                  borderColor: selectedNode === n.id
                    ? n.type === "lock" ? "rgba(245,158,11,0.4)" : n.type === "split" ? "rgba(99,102,241,0.45)" : "rgba(6,182,212,0.4)"
                    : undefined
                }}>
                <span className="node-chip__glyph"
                  style={{
                    background: n.type === "lock" ? "rgba(245,158,11,0.12)" : n.type === "split" ? "rgba(99,102,241,0.12)" : "rgba(6,182,212,0.1)",
                    borderColor: n.type === "lock" ? "rgba(245,158,11,0.3)" : n.type === "split" ? "rgba(99,102,241,0.35)" : "rgba(6,182,212,0.25)",
                    color: n.type === "lock" ? "#f59e0b" : n.type === "split" ? "#6366f1" : "#06b6d4",
                  }}>
                  {n.type[0].toUpperCase()}
                </span>
                <span className="node-chip__label">{n.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
