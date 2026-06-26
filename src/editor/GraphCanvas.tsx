import { topologicalSort } from "./graph-engine";
import type { CascadeGraph } from "./graph-engine";

const TYPE_COLORS: Record<string, { accent: string; bg: string; border: string; label: string; icon: string }> = {
  lock:  { accent: "#f59e0b", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.35)",  label: "amber",   icon: "LOCK" },
  split: { accent: "#6366f1", bg: "rgba(99,102,241,0.06)",   border: "rgba(99,102,241,0.4)",   label: "indigo",  icon: "SPLIT" },
  hold:  { accent: "#06b6d4", bg: "rgba(6,182,212,0.05)",    border: "rgba(6,182,212,0.25)",   label: "cyan",    icon: "HOLD" },
};

export function GraphCanvas({ graph, activeNode, onSelectNode }: {
  graph: CascadeGraph; activeNode?: string | null; onSelectNode?: (id: string) => void;
}) {
  const { nodes, edges } = graph;

  return (
    <div className="relative w-full h-[600px] bg-slate-950 overflow-hidden">
      {/* Technical Grid Matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_80%,transparent_100%)] opacity-40" />

      {/* SVG Edge Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker id="canvas-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(16,185,129,0.6)" />
          </marker>
        </defs>

        {edges.map((edge, i) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;

          const x1 = from.x + 74, y1 = from.y + 56;
          const x2 = to.x + 74, y2 = to.y;
          const midY = (y1 + y2) / 2;
          const isActive = activeNode === edge.from;
          const pathD = `M ${x1},${y1} C ${x1},${midY} ${x2},${midY} ${x2},${y2}`;

          return (
            <g key={`e-${i}`}>
              <path d={pathD} stroke={isActive ? "#334155" : "#1e293b"} strokeWidth="2" fill="none" />
              {isActive && (
                <>
                  <path d={pathD} stroke="rgba(16,185,129,0.15)" strokeWidth="6" fill="none" />
                  <path d={pathD} stroke="#34d399" strokeWidth="2" fill="none"
                    strokeDasharray="8, 12" filter="url(#glow-effect)"
                    className="animate-cascade" />
                  <circle r="4" fill="rgba(52,211,153,0.9)" filter="url(#glow-effect)">
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={pathD} />
                  </circle>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* HTML Node Layer */}
      <div className="absolute inset-0 w-full h-full">
        {nodes.map((node) => {
          const sorted = topologicalSort(graph);
          const isActive = activeNode === node.id;
          const colors = TYPE_COLORS[node.type] ?? TYPE_COLORS.hold;

          return (
            <div key={node.id}
              onClick={() => onSelectNode?.(node.id)}
              className="absolute z-10 transition-all duration-300 cursor-pointer select-none"
              style={{ left: node.x, top: node.y, width: 148 }}>
              {/* Node Card */}
              <div className={`bg-slate-900/90 border shadow-xl rounded-xl p-3 text-center backdrop-blur-md ring-1 ring-white/5 transition-all duration-300
                ${isActive ? "scale-105" : "hover:scale-[1.02]"}`}
                style={{
                  borderColor: isActive ? colors.border : "rgba(51,65,85,0.8)",
                  borderTopColor: colors.accent,
                  borderTopWidth: 2,
                  boxShadow: isActive ? `0 0 24px ${colors.border}` : "none",
                }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: isActive ? colors.accent : "rgba(148,163,184,0.4)" }} />
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase"
                    style={{ color: colors.accent }}>
                    {colors.icon} {node.type}
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-200 truncate">{node.label}</div>
                {(node.type === "lock" || node.type === "split") && node.lockAmount && (
                  <div className="text-[10px] font-mono text-slate-400 mt-1 bg-slate-950/60 py-0.5 rounded border border-slate-800">
                    {node.lockAmount}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
