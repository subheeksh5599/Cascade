"use client";

import { useState, useCallback } from "react";
import { WalletButton } from "@/components/WalletButton";
import { useStacksWallet } from "@/hooks/useStacksWallet";
import { useGraphCascade } from "@/hooks/useGraphCascade";
import { getHiroTxUrl } from "@/lib/config";
import {
  type CascadeGraph,
  type CascadeNode,
  TEMPLATES,
  validateGraph,
  topologicalSort,
  generateNodeId,
} from "@/lib/graph-engine";
import { tokenToMicro } from "flowvault-sdk";

type NodeTypeStr = "lock" | "split" | "hold";

const NODE_COLORS: Record<string, string> = { lock: "#0f766e", split: "#0d9488", hold: "#14b8a6" };

function GraphSVG({ graph, activeNode, cascadeDone }: {
  graph: CascadeGraph; activeNode: string | null; cascadeDone: boolean;
}) {
  const NODE_W = 130; const NODE_H = 48;
  const nodes = graph.nodes; const edges = graph.edges;
  return (
    <svg className="graph-svg" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#0f766e" />
        </marker>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {edges.map((edge, i) => {
        const from = nodes.find((n) => n.id === edge.from);
        const to = nodes.find((n) => n.id === edge.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2; const y1 = from.y + NODE_H;
        const x2 = to.x + NODE_W / 2; const y2 = to.y;
        const midY = (y1 + y2) / 2;
        const isActive = activeNode === edge.from || (cascadeDone && !activeNode);
        return (
          <g key={`e-${i}`}>
            <path d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`} fill="none"
              stroke={isActive ? NODE_COLORS.split : "rgba(0,0,0,0.1)"}
              strokeWidth={isActive ? 2 : 1.2} strokeDasharray={isActive ? "none" : "5,4"}
              markerEnd="url(#arrowhead)" className="graph-edge" />
            {isActive && <circle r="3.5" fill={NODE_COLORS.split} className="graph-dot">
              <animateMotion dur="1.8s" repeatCount="indefinite" path={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`} />
            </circle>}
          </g>
        );
      })}
      {nodes.map((node) => {
        const sorted = topologicalSort(graph); const order = sorted.indexOf(node.id);
        const isActive = activeNode === node.id;
        return (
          <g key={node.id} className="graph-node" style={{ cursor: "pointer" }}>
            <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={6}
              fill={isActive ? NODE_COLORS[node.type] : "white"}
              stroke={NODE_COLORS[node.type]} strokeWidth={isActive ? 2 : 1.2}
              filter={isActive ? "url(#glow)" : undefined}
              style={{ transition: "fill 0.3s ease, stroke 0.3s ease" }} />
            <text x={node.x + 10} y={node.y + 20} fontFamily="Inter Tight,sans-serif" fontSize={10} fontWeight={600}
              fill={isActive ? "white" : "#1a1720"}>{node.type.toUpperCase()}</text>
            <text x={node.x + 10} y={node.y + 36} fontFamily="Inter Tight,sans-serif" fontSize={12} fontWeight={500}
              fill={isActive ? "white" : "#1a1720"}>{node.label}</text>
            <text x={node.x + NODE_W - 10} y={node.y + 20} fontFamily="Inter Tight,sans-serif" fontSize={14} fontWeight={700}
              fill={isActive ? "rgba(255,255,255,0.35)" : NODE_COLORS[node.type]} textAnchor="end">{order + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function EditorPage() {
  const [graph, setGraph] = useState<CascadeGraph>(TEMPLATES[0].graph);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeTypeAdd, setNodeTypeAdd] = useState<NodeTypeStr>("lock");
  const [depositAmount, setDepositAmount] = useState("500000");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });

  const wallet = useStacksWallet();
  const cascade = useGraphCascade(wallet.address);

  const runValidate = useCallback(() => setValidation(validateGraph(graph)), [graph]);
  useState(() => { runValidate(); });

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
    setValidation(validateGraph(graph));
    const v = validateGraph(graph);
    if (!v.valid) { setValidation(v); return; }
    cascade.execute(graph, tokenToMicro(depositAmount));
  }

  const activeNode = cascade.steps.find((s) => s.status !== "pending" && s.status !== "done")?.nodeId ?? null;

  return (
    <main className="editor-page">
      <header className="topbar-fixed">
        <div className="brand"><a href="/" className="brand-name">Cascade</a></div>
        <nav className="topbar-nav"><a href="/" className="nav-link">Home</a><span className="nav-link active">Editor</span></nav>
        <WalletButton />
      </header>

      <div className="editor-layout">
        <div className="editor-main">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <select value={nodeTypeAdd} onChange={(e) => setNodeTypeAdd(e.target.value as NodeTypeStr)} className="nf-input" style={{ width: 100 }}>
                <option value="lock">Lock</option><option value="split">Split</option><option value="hold">Hold</option>
              </select>
              <button className="btn-accent btn-sm" onClick={addNode}>+ Add Node</button>
            </div>
            <div className="chip-row">
              {TEMPLATES.map((t, i) => <button key={i} className="chip" onClick={() => { setGraph(t.graph); setSelectedNode(null); }}>{t.name}</button>)}
            </div>
          </div>

          <div className="editor-canvas">
            <GraphSVG graph={graph} activeNode={activeNode} cascadeDone={cascade.status === "done"} />
          </div>

          <div className="editor-progress">
            {cascade.steps.length > 0 && cascade.steps.map((step, i) => (
              <div key={step.nodeId} className={`ce-step ce-step--${step.status}`}>
                <span className="ce-step__order">{i + 1}</span>
                <span className="ce-step__label">{step.label}</span>
                <span className="ce-step__status">{step.status}</span>
              </div>
            ))}
          </div>

          <div className="editor-actions">
            <div className="editor-deposit">
              <span className="ce-label">Root Deposit (USDCx)</span>
              <div className="ce-deposit-row">
                <input type="number" min="0" step="0.000001" inputMode="decimal" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="ce-amount" />
                <span className="ce-currency">USDCx</span>
              </div>
            </div>

            {!validation.valid && (
              <div className="status-panel error">{validation.errors.map((e, i) => <div key={i}>{e}</div>)}</div>
            )}

            <button className="btn-accent" onClick={handleExecute}
              disabled={!wallet.isConnected || cascade.status === "running"}>
              {cascade.status === "running" ? "Cascading..." : cascade.status === "done" ? "✓ Cascade Complete" : "Execute Cascade"}
            </button>

            {cascade.error && <div className="status-panel error" style={{ marginTop: 8 }}>{cascade.error}</div>}
            {cascade.txLinks.length > 0 && (
              <div className="tx-links" style={{ marginTop: 8 }}>
                {cascade.txLinks.map((txId, i) => (
                  <a key={txId} href={getHiroTxUrl(txId)} target="_blank" rel="noreferrer">Node {i + 1}: {txId.slice(0, 10)}...</a>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="editor-sidebar">
          <h3>Node Properties</h3>
          {selectedNode && graph.nodes.find((n) => n.id === selectedNode) ? (
            <div className="node-form">
              {(() => { const n = graph.nodes.find((n) => n.id === selectedNode)!; return (
                <>
                  <div className="node-form__field"><label>Label</label><input type="text" value={n.label} onChange={(e) => updateNode(selectedNode, { label: e.target.value })} className="nf-input" /></div>
                  <div className="node-form__field"><label>Type</label><div className="node-form__type-badge">{n.type}</div></div>
                  {(n.type === "lock" || n.type === "split") && (
                    <div className="node-form__field"><label>Lock %</label><input type="number" min="0" max="100" value={n.lockAmount ?? ""} onChange={(e) => updateNode(selectedNode, { lockAmount: e.target.value })} className="nf-input" /></div>
                  )}
                  {n.type !== "hold" && (
                    <div className="node-form__field"><label>Lock Duration (blocks)</label><input type="number" min="1" value={n.lockUntilDelta ?? 144} onChange={(e) => updateNode(selectedNode, { lockUntilDelta: parseInt(e.target.value) || 144 })} className="nf-input" /></div>
                  )}
                  {n.type === "split" && (
                    <>
                      <div className="node-form__field"><label>Split Address (optional if has children)</label><input type="text" placeholder="ST..." value={n.splitAddress ?? ""} onChange={(e) => updateNode(selectedNode, { splitAddress: e.target.value })} className="nf-input" /></div>
                      <div className="node-form__field"><label>Split %</label><input type="number" min="0" max="100" value={n.splitAmount ?? ""} onChange={(e) => updateNode(selectedNode, { splitAmount: e.target.value })} className="nf-input" /></div>
                    </>
                  )}
                </>
              ); })()}
            </div>
          ) : <span className="text-muted" style={{ fontSize: 12 }}>Select a node in the graph</span>}

          <div className="node-list">
            <h4>Nodes</h4>
            {graph.nodes.map((n) => (
              <button key={n.id} className={`node-chip ${n.type} ${selectedNode === n.id ? "node-chip--selected" : ""}`}
                onClick={() => setSelectedNode(n.id)}>
                <span className="node-chip__type">{n.type}</span>
                <span className="node-chip__label">{n.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
