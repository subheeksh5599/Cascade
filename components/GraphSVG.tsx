"use client";

import { topologicalSort } from "@/lib/graph-engine";
import type { CascadeGraph } from "@/lib/graph-engine";

export function GraphSVG({ graph, activeNode, cascadeDone }: {
  graph: CascadeGraph; activeNode: string | null; cascadeDone: boolean;
}) {
  const NODE_W = 130; const NODE_H = 48;
  const nodes = graph.nodes; const edges = graph.edges;
  return (
    <svg className="graph-svg" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="graphsvg-arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="rgba(255,255,255,0.3)" />
        </marker>
        <filter id="graphsvg-glow"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
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
              stroke={isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.06)"}
              strokeWidth={isActive ? 1.5 : 1}
              strokeDasharray={isActive ? "none" : "4,4"}
              markerEnd="url(#graphsvg-arrowhead)" className="graph-edge" />
            {isActive && <circle r="3" fill="rgba(255,255,255,0.5)" className="graph-dot">
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
              fill={isActive ? "var(--c4)" : "var(--c2)"}
              stroke={isActive ? "rgba(255,255,255,0.25)" : "var(--c5)"}
              strokeWidth={isActive ? 1.5 : 1}
              filter={isActive ? "url(#graphsvg-glow)" : undefined}
              style={{ transition: "fill 0.3s ease, stroke 0.3s ease" }} />
            <text x={node.x + 10} y={node.y + 20} fontFamily="Inter, sans-serif" fontSize={10} fontWeight={500}
              fill={isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)"}>{node.type.toUpperCase()}</text>
            <text x={node.x + 10} y={node.y + 36} fontFamily="Inter, sans-serif" fontSize={12} fontWeight={400}
              fill={isActive ? "var(--bone)" : "rgba(255,255,255,0.5)"}>{node.label}</text>
            <text x={node.x + NODE_W - 10} y={node.y + 20} fontFamily="Cormorant Garamond, serif" fontSize={14} fontWeight={300} fontStyle="italic"
              fill={isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"} textAnchor="end">{order + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}
