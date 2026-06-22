"use client";

import { topologicalSort } from "@/lib/graph-engine";
import type { CascadeGraph } from "@/lib/graph-engine";

const TYPE_STYLES: Record<string, { border: string; fill: string; dash: string }> = {
  lock:  { border: "rgba(255,255,255,0.25)", fill: "rgba(255,255,255,0.04)", dash: "none" },
  split: { border: "rgba(255,255,255,0.25)", fill: "rgba(255,255,255,0.04)", dash: "none" },
  hold:  { border: "rgba(255,255,255,0.12)", fill: "rgba(255,255,255,0.02)", dash: "3,3" },
};

const TYPE_GLYPHS: Record<string, string> = {
  lock: "L",
  split: "S",
  hold: "H",
};

export function GraphSVG({ graph, activeNode, cascadeDone }: {
  graph: CascadeGraph; activeNode: string | null; cascadeDone: boolean;
}) {
  const NODE_W = 144; const NODE_H = 52;
  const nodes = graph.nodes; const edges = graph.edges;
  return (
    <svg className="graph-svg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="graphsvg-arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="rgba(255,255,255,0.2)" />
        </marker>
        <filter id="graphsvg-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="graphsvg-pulse"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Grid pattern */}
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="0.5" fill="rgba(255,255,255,0.04)" />
      </pattern>
      <rect width="1000" height="560" fill="url(#grid)" />

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
              stroke={isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)"}
              strokeWidth={isActive ? 2 : 1}
              markerEnd="url(#graphsvg-arrowhead)" />
            {isActive && <circle r="3.5" fill="rgba(255,255,255,0.6)" filter="url(#graphsvg-pulse)">
              <animateMotion dur="1.6s" repeatCount="indefinite" path={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`} />
            </circle>}
          </g>
        );
      })}

      {nodes.map((node) => {
        const sorted = topologicalSort(graph); const order = sorted.indexOf(node.id);
        const isActive = activeNode === node.id;
        const style = TYPE_STYLES[node.type] ?? TYPE_STYLES.hold;
        const glyph = TYPE_GLYPHS[node.type] ?? "?";
        return (
          <g key={node.id} style={{ cursor: "pointer", transition: "opacity 0.3s ease" }}>
            <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={8}
              fill={isActive ? "rgba(255,255,255,0.08)" : style.fill}
              stroke={isActive ? "rgba(255,255,255,0.5)" : style.border}
              strokeWidth={isActive ? 1.5 : 0.8}
              strokeDasharray={isActive ? "none" : style.dash}
              filter={isActive ? "url(#graphsvg-glow)" : undefined}
              style={{ transition: "fill 0.3s ease, stroke 0.3s ease" }} />

            {/* Type glyph badge */}
            <rect x={node.x + 8} y={node.y + 8} width={22} height={22} rx={5}
              fill={isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)"}
              stroke={isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}
              strokeWidth={0.8} />
            <text x={node.x + 19} y={node.y + 23} textAnchor="middle"
              fontFamily="Inter, sans-serif" fontSize={12} fontWeight={600}
              fill={isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)"}>
              {glyph}
            </text>

            <text x={node.x + 40} y={node.y + 23}
              fontFamily="Inter, sans-serif" fontSize={12} fontWeight={500}
              fill={isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"}>
              {node.label}
            </text>
            <text x={node.x + 40} y={node.y + 40}
              fontFamily="Inter, sans-serif" fontSize={10} fontWeight={400}
              fill={isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)"}>
              {node.type.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
