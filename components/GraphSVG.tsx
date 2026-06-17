"use client";

import { topologicalSort } from "@/lib/graph-engine";
import type { CascadeGraph } from "@/lib/graph-engine";

const NODE_COLORS: Record<string, string> = { lock: "#0f766e", split: "#0d9488", hold: "#14b8a6" };

export function GraphSVG({ graph, activeNode, cascadeDone }: {
  graph: CascadeGraph; activeNode: string | null; cascadeDone: boolean;
}) {
  const NODE_W = 130; const NODE_H = 48;
  const nodes = graph.nodes; const edges = graph.edges;
  return (
    <svg className="graph-svg" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="graphsvg-arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#0f766e" />
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
              stroke={isActive ? NODE_COLORS.split : "rgba(0,0,0,0.1)"}
              strokeWidth={isActive ? 2 : 1.2} strokeDasharray={isActive ? "none" : "5,4"}
              markerEnd="url(#graphsvg-arrowhead)" className="graph-edge" />
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
              filter={isActive ? "url(#graphsvg-glow)" : undefined}
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
