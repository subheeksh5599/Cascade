"use client";

import type { CascadeGraph } from "@/lib/graph-engine";
import type { SimulatedStep } from "@/hooks/useGraphCascade";

const TYPE_COLORS: Record<string, { glow: string; fill: string; border: string; badge: string }> = {
  lock:  { glow: "rgba(245,158,11,0.35)",  fill: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)", badge: "#f59e0b" },
  split: { glow: "rgba(99,102,241,0.4)",   fill: "rgba(99,102,241,0.06)",  border: "rgba(99,102,241,0.3)",  badge: "#6366f1" },
  hold:  { glow: "rgba(6,182,212,0.35)",   fill: "rgba(6,182,212,0.05)",   border: "rgba(6,182,212,0.22)", badge: "#06b6d4" },
};

const TYPE_GLYPHS: Record<string, string> = { lock: "L", split: "S", hold: "H" };

function formatMicro(m: bigint): string {
  const n = Number(m) / 1e6;
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function GraphSVG({
  graph, activeNode, cascadeDone, simulated, replayNode,
}: {
  graph: CascadeGraph;
  activeNode: string | null;
  cascadeDone: boolean;
  simulated?: SimulatedStep[];
  replayNode?: string | null;
}) {
  const NODE_W = 160;
  const NODE_H = 68;
  const nodes = graph.nodes;
  const edges = graph.edges;

  const simMap = new Map<string, SimulatedStep>();
  if (simulated) {
    for (const s of simulated) simMap.set(s.nodeId, s);
  }

  const highlightedNode = replayNode ?? activeNode;
  const isSim = simulated && simulated.length > 0;

  return (
    <svg className="graph-svg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet"
      style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.03) 0%, transparent 60%), #09090b" }}>
      <defs>
        <marker id="graphsvg-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(16,185,129,0.6)" />
        </marker>
        <filter id="graphsvg-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="graphsvg-pulse">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(16,185,129,0.5)" />
          <stop offset="50%" stopColor="rgba(6,182,212,0.25)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.5)" />
        </linearGradient>
      </defs>

      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="16" cy="16" r="0.6" fill="rgba(255,255,255,0.05)" />
      </pattern>
      <rect width="1000" height="560" fill="url(#grid)" />
      <ellipse cx="500" cy="80" rx="400" ry="120" fill="url(#edgeGradient)" opacity="0.06" />

      {edges.map((edge, i) => {
        const from = nodes.find((n) => n.id === edge.from);
        const to = nodes.find((n) => n.id === edge.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2; const y1 = from.y + NODE_H;
        const x2 = to.x + NODE_W / 2; const y2 = to.y;
        const midY = (y1 + y2) / 2;
        const isActive = highlightedNode === edge.from || (cascadeDone && !highlightedNode);
        const pathD = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;

        return (
          <g key={`e-${i}`}>
            <path d={pathD} fill="none"
              stroke={isActive ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.04)"}
              strokeWidth={isActive ? 2 : 1}
              strokeLinecap="round"
              markerEnd={isActive ? "url(#graphsvg-arrowhead)" : undefined}
              className={isActive ? "animate-pulse" : ""}
              style={isActive ? { filter: "drop-shadow(0 0 6px rgba(16,185,129,0.3))" } : undefined} />
            {isActive && <circle r="4" fill="rgba(16,185,129,0.8)" filter="url(#graphsvg-pulse)">
              <animateMotion dur="1.4s" repeatCount="indefinite" path={pathD} />
            </circle>}
            {isActive && <path d={pathD} fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="8" strokeLinecap="round" opacity="0.4" />}
          </g>
        );
      })}

      {nodes.map((node) => {
        const isHighlighted = highlightedNode === node.id;
        const colors = TYPE_COLORS[node.type] ?? TYPE_COLORS.hold;
        const glyph = TYPE_GLYPHS[node.type] ?? "?";
        const simData = simMap.get(node.id);
        const done = cascadeDone || (isSim && simData);

        return (
          <g key={node.id} style={{ transition: "opacity 0.3s ease" }}>
            {/* Glow underlay */}
            <rect x={node.x - 3} y={node.y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={10}
              fill="transparent" stroke={isHighlighted ? colors.border : "rgba(255,255,255,0.03)"}
              strokeWidth={1.5} opacity={isHighlighted ? 0.5 : 0.3}
              style={{ filter: `drop-shadow(0 0 ${isHighlighted ? 20 : 8}px ${colors.glow})` }} />

            {/* Node body */}
            <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={8}
              fill={isHighlighted ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)"}
              stroke={isHighlighted ? colors.border : "rgba(255,255,255,0.06)"}
              strokeWidth={1.2}
              style={{ transition: "all 0.3s ease", backdropFilter: "blur(2px)" }} />

            {/* Type badge */}
            <rect x={node.x + 9} y={node.y + 10} width={24} height={24} rx={6}
              fill={isHighlighted ? colors.fill : "rgba(255,255,255,0.03)"}
              stroke={isHighlighted ? colors.border : "rgba(255,255,255,0.05)"}
              strokeWidth={1} />
            <text x={node.x + 21} y={node.y + 26} textAnchor="middle"
              fontFamily="'SF Mono','Fira Code','JetBrains Mono',monospace" fontSize={12} fontWeight={700}
              fill={isHighlighted ? colors.badge : "rgba(255,255,255,0.25)"}>
              {glyph}
            </text>

            {/* Label + type */}
            <text x={node.x + 42} y={node.y + 22}
              fontFamily="'SF Mono','Fira Code','JetBrains Mono',monospace" fontSize={12} fontWeight={600}
              fill={isHighlighted ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"}>
              {node.label}
            </text>
            <text x={node.x + 42} y={node.y + 38}
              fontFamily="Inter, sans-serif" fontSize={9} fontWeight={400}
              fill={isHighlighted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}>
              {node.type.toUpperCase()}
            </text>

            {/* Allocation display (simulated or done) */}
            {simData && (
              <g>
                <text x={node.x + 42} y={node.y + 55}
                  fontFamily="'SF Mono','Fira Code',monospace" fontSize={9} fontWeight={500}
                  fill="rgba(16,185,129,0.7)">
                  in: {formatMicro(simData.inputMicro)}
                </text>
                {simData.lockMicro > 0n && (
                  <text x={node.x + NODE_W - 8} y={node.y + 18} textAnchor="end"
                    fontFamily="'SF Mono','Fira Code',monospace" fontSize={8} fontWeight={500}
                    fill="#f59e0b">
                    L:{formatMicro(simData.lockMicro)}
                  </text>
                )}
                {simData.splitMicro > 0n && (
                  <text x={node.x + NODE_W - 8} y={node.y + 32} textAnchor="end"
                    fontFamily="'SF Mono','Fira Code',monospace" fontSize={8} fontWeight={500}
                    fill="#6366f1">
                    S:{formatMicro(simData.splitMicro)}
                  </text>
                )}
                {simData.holdMicro > 0n && (
                  <text x={node.x + NODE_W - 8} y={node.y + 46} textAnchor="end"
                    fontFamily="'SF Mono','Fira Code',monospace" fontSize={8} fontWeight={500}
                    fill="#06b6d4">
                    H:{formatMicro(simData.holdMicro)}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
