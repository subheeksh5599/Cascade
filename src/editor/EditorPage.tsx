import { useState, useEffect, useCallback } from "react";
import { type CascadeGraph, type CascadeNode, TEMPLATES, validateGraph, generateNodeId } from "./graph-engine";
import { GraphCanvas } from "./GraphCanvas";
import type { NodeType } from "./graph-engine";

const TYPE_COLORS: Record<string, string> = {
  lock: "#f59e0b",
  split: "#6366f1",
  hold: "#06b6d4",
};

export function EditorPage() {
  const [graph, setGraph] = useState<CascadeGraph>(TEMPLATES[0].graph);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeTypeAdd, setNodeTypeAdd] = useState<NodeType>("lock");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });
  const [activeTemplate, setActiveTemplate] = useState(0);

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

  const selectedNodeData = selectedNode ? graph.nodes.find((n) => n.id === selectedNode) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontStyle: "italic", color: "#fff", textDecoration: "none", fontWeight: 300 }}>Cascade</a>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>Home</a>
          <span style={{ fontSize: 11, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em" }}>Editor</span>
        </div>
      </header>

      {/* Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", height: "calc(100vh - 53px)" }}>
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24, borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "auto" }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Add:</span>
              <select value={nodeTypeAdd} onChange={(e) => setNodeTypeAdd(e.target.value as NodeType)}
                style={{ padding: "6px 10px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 12, outline: "none", width: 90 }}>
                <option value="lock" style={{ background: "#111" }}>Lock</option>
                <option value="split" style={{ background: "#111" }}>Split</option>
                <option value="hold" style={{ background: "#111" }}>Hold</option>
              </select>
              <button onClick={addNode} style={{ padding: "6px 16px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>+ Add</button>
              {selectedNode && <button onClick={addEdge} style={{ padding: "6px 16px", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 50, background: "rgba(16,185,129,0.05)", color: "#34d399", cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>→ Connect</button>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {TEMPLATES.map((t, i) => (
                <button key={t.name} onClick={() => { setGraph(t.graph); setSelectedNode(null); setActiveTemplate(i); }}
                  style={{ padding: "5px 14px", border: i === activeTemplate ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 1000, background: i === activeTemplate ? "rgba(255,255,255,0.05)" : "transparent", color: i === activeTemplate ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, minHeight: 360, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <GraphCanvas graph={graph} activeNode={selectedNode} onSelectNode={setSelectedNode} />
          </div>

          {/* Validation */}
          {!validation.valid && (
            <div style={{ padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              {validation.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: 16, background: "rgba(255,255,255,0.02)", overflow: "auto" }}>
          <h3 style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Node Properties</h3>
          {selectedNodeData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Label</label>
                <input type="text" value={selectedNodeData.label} onChange={(e) => updateNode(selectedNode!, { label: e.target.value })}
                  style={{ padding: "8px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Type</label>
                <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: TYPE_COLORS[selectedNodeData.type], background: `${TYPE_COLORS[selectedNodeData.type]}15`, border: `1px solid ${TYPE_COLORS[selectedNodeData.type]}40`, width: "fit-content" }}>
                  {selectedNodeData.type}
                </span>
              </div>
              {(selectedNodeData.type === "lock" || selectedNodeData.type === "split") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Lock %</label>
                  <input type="number" min="0" max="100" value={selectedNodeData.lockAmount ?? ""} onChange={(e) => updateNode(selectedNode!, { lockAmount: e.target.value })}
                    style={{ padding: "8px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
              )}
              {selectedNodeData.type !== "hold" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Duration (blocks)</label>
                  <input type="number" min="1" value={selectedNodeData.lockUntilDelta ?? 144} onChange={(e) => updateNode(selectedNode!, { lockUntilDelta: parseInt(e.target.value) || 144 })}
                    style={{ padding: "8px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
              )}
              {selectedNodeData.type === "split" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Split Address</label>
                    <input type="text" placeholder="ST..." value={selectedNodeData.splitAddress ?? ""} onChange={(e) => updateNode(selectedNode!, { splitAddress: e.target.value })}
                      style={{ padding: "8px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Split %</label>
                    <input type="number" min="0" max="100" value={selectedNodeData.splitAmount ?? ""} onChange={(e) => updateNode(selectedNode!, { splitAmount: e.target.value })}
                      style={{ padding: "8px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Select a node in the graph</span>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
            <h4 style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px 0" }}>Nodes</h4>
            {graph.nodes.map((n) => (
              <button key={n.id} onClick={() => setSelectedNode(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: selectedNode === n.id ? `1px solid ${TYPE_COLORS[n.type]}60` : "1px solid rgba(255,255,255,0.06)", borderRadius: 8, background: selectedNode === n.id ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: `${TYPE_COLORS[n.type]}12`, border: `1px solid ${TYPE_COLORS[n.type]}30`, color: TYPE_COLORS[n.type] }}>{n.type[0].toUpperCase()}</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: "#fff" }}>{n.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
