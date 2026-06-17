"use client";

import { useEffect, useRef, useState } from "react";
import { Preloader } from "@/components/Preloader";
import { WalletButton } from "@/components/WalletButton";
import {
  type CascadeGraph,
  TEMPLATES,
  topologicalSort,
} from "@/lib/graph-engine";

const USE_CASES = [
  {
    title: "Payroll Cascade",
    desc: "One deposit → salaries distributed, runway locked, emergency reserves filled. Entire org paid in one transaction.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=800&fit=crop&q=80",
  },
  {
    title: "DAO Treasury",
    desc: "Community funds auto-route to working groups, core reserves, and contributor pools. Governance enforced on-chain.",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=800&fit=crop&q=80",
  },
  {
    title: "Revenue Splits",
    desc: "Product revenue split across team, investors, and ops — recursively. No spreadsheet. No manual transfers.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=800&fit=crop&q=80",
  },
  {
    title: "Milestone Escrow",
    desc: "Client funds locked. Milestone met → portion released. Sub-milestones cascade to subcontractors.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop&q=80",
  },
];

const NODE_W = 140;
const NODE_H = 56;

function RevealGraph({ rp, graph }: { rp: number; graph: CascadeGraph }) {
  const sorted = topologicalSort(graph);
  const total = sorted.length;
  const stageStep = 1 / total;
  const currentStage = Math.min(total, Math.floor(rp / stageStep));
  const stageProgress = Math.min(1, (rp - currentStage * stageStep) / stageStep);
  const visibleCount = Math.max(0, Math.min(total, currentStage + (stageProgress > 0.5 ? 1 : 0)));
  if (rp >= 0.99) {
    return <RevealGraphSVG graph={graph} sorted={sorted} visibleCount={total} stageProgress={1} />;
  }
  if (visibleCount === 0) return null;
  return <RevealGraphSVG graph={graph} sorted={sorted} visibleCount={visibleCount} stageProgress={stageProgress} />;
}

function RevealGraphSVG({ graph, sorted, visibleCount, stageProgress }: {
  graph: CascadeGraph; sorted: string[]; visibleCount: number; stageProgress: number;
}) {
  const visible = new Set(sorted.slice(0, visibleCount));
  const currentAnimating = sorted[visibleCount - 1] ?? null;
  const edgeOpacity = visibleCount >= 3 ? 1 : visibleCount >= 2 ? 0.6 : 0.3;

  return (
    <div className="scroll-reveal-img" style={{
      opacity: 1,
      transform: `scale(${0.85 + (visibleCount / sorted.length) * 0.15})`,
    }}>
      <svg className="graph-svg" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead-r" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="#0f766e" />
          </marker>
          <filter id="glow-r"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {graph.edges.map((edge, i) => {
          const from = graph.nodes.find((n) => n.id === edge.from);
          const to = graph.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const isVisible = visible.has(edge.from) && visible.has(edge.to);
          if (!isVisible) return null;
          const x1 = from.x + NODE_W / 2; const y1 = from.y + NODE_H;
          const x2 = to.x + NODE_W / 2; const y2 = to.y;
          const midY = (y1 + y2) / 2;
          const isCurrent = edge.from === currentAnimating;
          return (
            <g key={`re-${i}`}>
              <path
                d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                fill="none"
                stroke={isCurrent ? "#0f766e" : "rgba(15,118,110,0.25)"}
                strokeWidth={isCurrent ? 2.5 : 1.5}
                markerEnd="url(#arrowhead-r)"
                opacity={isCurrent ? Math.min(1, stageProgress * 2) : edgeOpacity}
                style={{ transition: "opacity 0.5s ease, stroke 0.5s ease" }}
              />
              {isCurrent && stageProgress > 0.3 && (
                <circle r="4" fill="#0f766e" opacity={Math.min(1, stageProgress)}>
                  <animateMotion dur="1.6s" repeatCount="indefinite"
                    path={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`} />
                </circle>
              )}
            </g>
          );
        })}

        {graph.nodes.map((node) => {
          const isVisible = visible.has(node.id);
          if (!isVisible) return null;
          const order = sorted.indexOf(node.id);
          const isCurrent = node.id === currentAnimating;
          const nodeOpacity = isCurrent ? Math.min(1, stageProgress * 1.5) : 0.85;
          return (
            <g key={node.id} style={{ transition: "opacity 0.6s ease", opacity: nodeOpacity }}>
              <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={8}
                fill={isCurrent ? "#0f766e" : "white"}
                stroke="#0f766e"
                strokeWidth={isCurrent ? 2.5 : 1.5}
                filter={isCurrent ? "url(#glow-r)" : undefined}
                style={{ transition: "fill 0.5s ease, stroke-width 0.5s ease" }} />
              <text x={node.x + 14} y={node.y + 22}
                fontFamily="Inter Tight,sans-serif" fontSize={11} fontWeight={700}
                fill={isCurrent ? "white" : "#0f766e"}>
                {node.type.toUpperCase()}
              </text>
              <text x={node.x + 14} y={node.y + 42}
                fontFamily="Inter Tight,sans-serif" fontSize={13} fontWeight={600}
                fill={isCurrent ? "white" : "#1a1720"}>
                {node.label}
              </text>
              <text x={node.x + NODE_W - 14} y={node.y + 22}
                fontFamily="Playfair Display,serif" fontSize={18} fontWeight={700}
                fill={isCurrent ? "rgba(255,255,255,0.4)" : "rgba(15,118,110,0.3)"}
                textAnchor="end">{order + 1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StepCounter({ rp, template }: { rp: number; template: { graph: CascadeGraph; name: string } }) {
  const sorted = topologicalSort(template.graph);
  const sortedNodes = sorted.map((id) => template.graph.nodes.find((n) => n.id === id)!);
  const total = sortedNodes.length;
  const stageStep = 1 / total;
  const currentIdx = Math.min(total - 1, Math.floor(rp / stageStep));

  return (
    <>
      <span className="building-reveal__num">
        {currentIdx + 1}<span className="building-reveal__of">/{total}</span>
      </span>
      <h2 className="building-reveal__step-title">
        {rp >= 0.99
          ? "Cascade complete."
          : sortedNodes[currentIdx]?.label ?? ""}
      </h2>
      <span className="building-reveal__step-type">
        {rp >= 0.99 ? "" : sortedNodes[currentIdx]?.type.toUpperCase()}
      </span>
      <div className="building-reveal__line" style={{ transform: `scaleX(${rp})` }} />
      <p className="building-reveal__tagline">
        {rp >= 0.99
          ? `All ${total} nodes executed. The entire cascade settles on-chain.`
          : currentIdx === 0
            ? "The root deposit lands. The keeper configures this node's Lock and Split rules via FlowVault."
            : currentIdx < total - 1
              ? `Cascading to the next node. Funds from "${sortedNodes[currentIdx - 1]?.label}" flow to "${sortedNodes[currentIdx]?.label}".`
              : "The final leaf node receives its allocation. The graph is fully settled."}
      </p>
    </>
  );
}

export function CascadeApp() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const revealRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (loading) return;
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const el = revealRef.current; if (!el) return;
        const top = el.getBoundingClientRect().top;
        const wh = window.innerHeight;
        setProgress(Math.min(1, Math.max(0, (wh * 0.4 - top) / (wh * 0.8))));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loading]);

  const rp = progress;

  return (
    <>
      {loading && <Preloader text="Cascade" sub="Recursive Money Flow Graphs" onComplete={() => setLoading(false)} />}
      <main className={`velar-main ${loading ? "velar-main--hidden" : "velar-main--visible"}`}>
        <header className="topbar-fixed">
          <div className="brand"><span className="brand-name">Cascade</span></div>
          <nav className="topbar-nav"><span className="nav-link active">Editor</span><span className="nav-link">How It Works</span><span className="nav-link">Docs</span></nav>
          <WalletButton />
        </header>

        {/* ── Hero ── */}
        <section className="hero-statement">
          <div className="hero-statement__inner">
            <h1 className="fade-in">One deposit.<br />Every node fires.<br />The graph settles.</h1>
            <p className="fade-in stagger-1">
              Cascade chains FlowVault vaults into a directed acyclic graph. Deposit USDCx at the root
              and a keeper automaton executes Lock, Split, and Hold at every downstream node in sequence.
              No manual transfers. No "send me my share." One transaction triggers the entire cascade.
            </p>
            <a href="/editor" className="btn-accent fade-in stagger-2" style={{ display: "inline-flex", marginTop: 24, textDecoration: "none" }}>
              Open Editor
            </a>
          </div>
        </section>

        {/* ── Scroll Reveal: Step-by-Step Cascade ── */}
        <section className="building-reveal" ref={revealRef}>
          <div className="building-reveal__sticky">
            <div className="building-reveal__statement">
              <StepCounter rp={rp} template={TEMPLATES[0]} />
            </div>
            <RevealGraph rp={rp} graph={TEMPLATES[0].graph} />
          </div>
        </section>

        {/* ── Dark Statement: How It Works ── */}
        <section className="dark-statement">
          <div className="dark-statement__inner">
            <div className="dark-statement__text">
              <span className="dark-statement__eyebrow">How Cascade Works</span>
              <h3>A directed acyclic graph of FlowVault vaults. One deposit. Automated execution. On-chain settlement.</h3>
              <p>
                Each node in the cascade is a FlowVault routing rule — <strong>Lock</strong> (time-bound escrow),
                {" "}<strong>Split</strong> (instant routing to recipients), or <strong>Hold</strong> (liquid pass-through).
                A keeper automaton watches the Stacks blockchain. When a deposit lands, it configures the next
                node's routing rules, deposits the cascaded funds, and repeats for every downstream node.
                The entire graph settles without human intervention.
              </p>
              <div className="dark-statement__tags">
                <span>DAG: Topological Order</span>
                <span>Keeper: Automation Engine</span>
                <span>FlowVault: Lock · Split · Hold</span>
              </div>
            </div>
            <div className="dark-statement__visual">
              <div className="ds-shape">
                <span className="ds-doc-line" /><span className="ds-doc-line" /><span className="ds-doc-line" />
                <span className="ds-doc-line" /><span className="ds-doc-line ds-doc-line--short" />
              </div>
              <div className="ds-shape ds-shape--small">
                <span className="ds-doc-line" /><span className="ds-doc-line" /><span className="ds-doc-line ds-doc-line--short" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="stats-band">
          <div className="stats-band__inner">
            {[{ value: 3, suffix: "", label: "Primitives" }, { value: 2, suffix: "s", label: "Avg Cascade Settle" }, { value: 100, suffix: "%", label: "On-Chain Execution" }, { value: 0, suffix: "ms", label: "Keeper Latency" }].map((s) => (
              <div key={s.label} className="stats-band__item">
                <span className="stat-num">{s.value}{s.suffix}</span>
                <span className="stats-band__label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Use Case Gallery ── */}
        <section className="gallery-section">
          <div className="gallery-header"><h2>What You Can Cascade</h2><p className="gallery-header__sub">Every multi-step money flow becomes a single deposit.</p></div>
          <div className="gallery-track gallery-track--visible">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="use-case-card">
                <div className="use-case-card__media">
                  <img src={uc.image} alt={uc.title} className="use-case-card__img" />
                </div>
                <div className="use-case-card__body">
                  <strong>{uc.title}</strong>
                  <p>{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cascade-execute">
          <div className="cascade-execute__head">
            <h2>Ready to build?</h2>
            <p>Open the Cascade editor, define your graph, connect your wallet, and execute.</p>
            <a href="/editor" className="btn-accent" style={{ display: "inline-flex", marginTop: 20, textDecoration: "none" }}>
              Open Editor
            </a>
          </div>
        </section>

        <footer className="velar-footer">
          <p className="footer-sub">Cascade &middot; Recursive Money Flow Graphs &middot; Built with FlowVault &middot; Lock &middot; Split &middot; Hold</p>
        </footer>
      </main>
    </>
  );
}
