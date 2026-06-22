"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ───────────────────────────────────────────
   Cascade Preloader — Geometric DAG construction
   Dark editorial · monochrome · cinematic
   Anti-slop: no counter, no progress bar, no "AI grammar"
   Instead: nodes assemble into a cascade graph,
   edges draw between them, then text scrambles into place.
   ─────────────────────────────────────────── */

const CHARS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ!#%&?@$";
const LOAD_MS = 3200;

function rng() { return Math.random(); }
function pick<T>(a: T[]): T { return a[Math.floor(rng() * a.length)]; }

/* ─── Geometric Node/Edge System (canvas) ─── */
interface NodeD {
  x: number; y: number;
  tx: number; ty: number;
  r: number; alpha: number;
  label: string;
  born: number; // progress threshold [0,1] when this node appears
  connected: number[]; // indices of connected nodes
}
interface EdgeD {
  from: number; to: number;
  alpha: number;
  born: number;
}

function buildGraph(W: number, H: number): { nodes: NodeD[]; edges: EdgeD[] } {
  const cx = W * 0.38;
  const cy = H * 0.46;
  const dx = W * 0.22;
  const dy = H * 0.16;

  const nodeDefs = [
    { tx: cx, ty: cy - dy, label: "DEPOSIT" },
    { tx: cx - dx, ty: cy + dy * 0.2, label: "LOCK" },
    { tx: cx + dx, ty: cy + dy * 0.2, label: "SPLIT" },
    { tx: cx - dx * 1.4, ty: cy + dy * 1.3, label: "HOLD" },
    { tx: cx - dx * 0.3, ty: cy + dy * 1.35, label: "VAULT" },
    { tx: cx + dx * 0.6, ty: cy + dy * 1.25, label: "FLOW" },
    { tx: cx + dx * 1.3, ty: cy + dy * 1.3, label: "CASCADE" },
  ];

  const nodes: NodeD[] = nodeDefs.map((d, i) => ({
    x: W * (rng() * 0.6 + 0.2),
    y: H * (rng() * 0.5 + 0.1),
    tx: d.tx, ty: d.ty,
    r: 26 + rng() * 14,
    alpha: 0,
    label: d.label,
    born: 0.08 + i * 0.085,
    connected: [],
  }));

  // DAG edges
  const edges: EdgeD[] = [
    { from: 0, to: 1, alpha: 0, born: 0.28 },
    { from: 0, to: 2, alpha: 0, born: 0.28 },
    { from: 1, to: 3, alpha: 0, born: 0.46 },
    { from: 1, to: 4, alpha: 0, born: 0.46 },
    { from: 2, to: 5, alpha: 0, born: 0.52 },
    { from: 2, to: 6, alpha: 0, born: 0.52 },
  ];

  edges.forEach((e) => {
    nodes[e.from].connected.push(e.to);
    nodes[e.to].connected.push(e.from);
  });

  return { nodes, edges };
}

function useGraphCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  progress: number,
  visible: boolean
) {
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let nodes: NodeD[] = [], edges: EdgeD[] = [];
    let animId = 0;
    let frame = 0;

    function resize() {
      W = c!.width = window.innerWidth;
      H = c!.height = window.innerHeight;
      const g = buildGraph(W, H);
      nodes = g.nodes;
      edges = g.edges;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      frame++;

      // ── drift particles ──
      for (let i = 0; i < 14; i++) {
        const px = W * 0.5 + Math.cos(frame * 0.006 + i * 1.3) * W * 0.44;
        const py = H * 0.48 + Math.sin(frame * 0.008 + i * 0.9) * H * 0.38;
        const grd = ctx!.createRadialGradient(px, py, 0, px, py, 60 + i * 12);
        grd.addColorStop(0, `rgba(255,255,255,${0.025})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.beginPath(); ctx!.arc(px, py, 60 + i * 12, 0, Math.PI * 2);
        ctx!.fillStyle = grd; ctx!.fill();
      }

      // ── edges ──
      edges.forEach((e) => {
        if (progress < e.born) return;
        const reveal = Math.min(1, (progress - e.born) / 0.18);
        const a = nodes[e.from].alpha * nodes[e.to].alpha * reveal;
        if (a < 0.01) return;
        const nf = nodes[e.from], nt = nodes[e.to];
        ctx!.beginPath();
        ctx!.moveTo(nf.x, nf.y);
        const mx = (nf.x + nt.x) / 2, my = (nf.y + nt.y) / 2 - 20;
        ctx!.quadraticCurveTo(mx, my, nt.x, nt.y);
        ctx!.strokeStyle = `rgba(255,255,255,${a * 0.3})`;
        ctx!.lineWidth = 0.6;
        ctx!.stroke();

        // directional dot on edge
        const t = (Math.sin(frame * 0.03 + e.from * 0.7) + 1) / 2;
        const ex = (1 - t) * (1 - t) * nf.x + 2 * (1 - t) * t * mx + t * t * nt.x;
        const ey = (1 - t) * (1 - t) * nf.y + 2 * (1 - t) * t * my + t * t * nt.y;
        ctx!.beginPath(); ctx!.arc(ex, ey, 2.2, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${a * 0.5})`;
        ctx!.fill();
      });

      // ── nodes ──
      nodes.forEach((n) => {
        if (progress < n.born) { n.alpha = 0; return; }
        const reveal = Math.min(1, (progress - n.born) / 0.2);
        const ease = 1 - Math.pow(1 - reveal, 3);
        n.x += (n.tx - n.x) * 0.08;
        n.y += (n.ty - n.y) * 0.08;
        n.alpha = ease;

        const breathe = 1 + Math.sin(frame * 0.025 + n.tx * 0.01) * 0.04;

        // glow ring
        const g = ctx!.createRadialGradient(n.x, n.y, n.r * 0.3, n.x, n.y, n.r * 1.5);
        g.addColorStop(0, `rgba(255,255,255,${n.alpha * 0.09})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r * 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = g; ctx!.fill();

        // circle
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r * breathe, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(255,255,255,${n.alpha * 0.25})`;
        ctx!.lineWidth = 0.8;
        ctx!.stroke();

        // label
        ctx!.font = "10px 'Inter', 'Helvetica Neue', sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = `rgba(255,255,255,${n.alpha * 0.5})`;
        ctx!.fillText(n.label, n.x, n.y);
      });

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [canvasRef, progress]);
}

/* ─── Mouse glow canvas ─── */
function useGlowCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0, anim = 0;
    function rs() { W = c!.width = window.innerWidth; H = c!.height = window.innerHeight; mx = W / 2; my = H / 2; }
    const mv = (e: MouseEvent) => { tmx = e.clientX; tmy = e.clientY; };
    function draw() {
      ctx!.clearRect(0, 0, W, H);
      mx += (tmx - mx) * 0.035; my += (tmy - my) * 0.035;
      const g = ctx!.createRadialGradient(mx, my, 0, mx, my, 360);
      g.addColorStop(0, "rgba(255,255,255,0.05)");
      g.addColorStop(0.6, "rgba(255,255,255,0.01)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, H);
      anim = requestAnimationFrame(draw);
    }
    rs(); draw();
    window.addEventListener("resize", rs);
    window.addEventListener("mousemove", mv);
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", rs); window.removeEventListener("mousemove", mv); };
  }, [canvasRef]);
}

/* ─── Text scramble ─── */
function useScramble(
  elRef: React.RefObject<HTMLElement | null>,
  final: string,
  active: boolean,
  startDelay: number,
) {
  useEffect(() => {
    if (!active || !elRef.current) return;
    const el = elRef.current;
    const len = final.length;
    const start = performance.now() + startDelay;
    let raf = 0;

    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed < 0) { raf = requestAnimationFrame(tick); return; }
      const progress = Math.min(elapsed / 1400, 1);
      const resolved = Math.floor(progress * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        if (final[i] === " ") { out += " "; }
        else if (i < resolved) { out += final[i]; }
        else { out += pick(CHARS.split("")); }
      }
      el.textContent = out;
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, final, startDelay]);
}

/* ───────────────────────────────────────────
   COMPONENT
   ─────────────────────────────────────────── */
export function Preloader({
  text = "Cascade",
  sub = "Recursive Money Flow Graphs",
  onComplete,
}: {
  text?: string;
  sub?: string;
  onComplete: () => void;
}) {
  const graphRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  const [progress, setProgress] = useState(0);
  const [lift, setLift] = useState(false);
  const [done, setDone] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [phase, setPhase] = useState<"building" | "scrambling" | "complete">("building");

  useGraphCanvas(graphRef, progress, !done);
  useGlowCanvas(glowRef);

  useScramble(titleRef, text, phase === "scrambling", 0);
  useScramble(subRef, sub, showSub, 600);

  const finish = useCallback(() => {
    setDone(true);
    setPhase("complete");
    setTimeout(() => setLift(true), 400);
    setTimeout(() => onComplete(), 1300);
  }, [onComplete]);

  useEffect(() => {
    const startT = performance.now();
    let raf = 0;

    function tick(now: number) {
      const raw = Math.min((now - startT) / LOAD_MS, 1);
      const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      setProgress(p);

      if (p > 0.68 && phase === "building") { setPhase("scrambling"); setShowText(true); }
      if (p > 0.78 && !showSub) setShowSub(true);

      if (raw < 1) { raf = requestAnimationFrame(tick); }
      else { setProgress(1); finish(); }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish, phase, showSub]);

  return (
    <div
      className={`fv-preloader ${lift ? "fv-preloader--lift" : ""} ${done ? "fv-preloader--done" : ""}`}
      style={{ display: done && lift ? "none" : "flex" }}
    >
      {/* background canvases — depth 0,1 */}
      <canvas ref={glowRef} className="fv-canvas fv-canvas--glow" />
      {/* graph canvas — depth 2 */}
      <canvas ref={graphRef} className="fv-canvas fv-canvas--graph" />

      {/* typography layer — depth 4 */}
      <div className="fv-type-layer">
        <h1 className="fv-title" ref={titleRef}>
          {text}
        </h1>
        <p className="fv-sub" ref={subRef}>
          {sub}
        </p>
        <p className="fv-phase">
          {phase === "building" ? "CONSTRUCTING GRAPH" : phase === "scrambling" ? "RESOLVING IDENTITY" : "READY"}
        </p>
      </div>

      <style jsx>{`
        .fv-preloader {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: #000000;
          transition: transform 0.95s cubic-bezier(0.65, 0, 0.35, 1);
          cursor: crosshair;
        }
        .fv-preloader--done {
          opacity: 0;
          transition: opacity 0.55s ease;
        }
        .fv-preloader--lift {
          transform: translateY(-100%);
        }

        .fv-canvas {
          position: fixed; inset: 0; pointer-events: none;
        }
        .fv-canvas--glow { z-index: 0; }
        .fv-canvas--graph { z-index: 1; }

        .fv-type-layer {
          position: relative; z-index: 10;
          display: flex; flex-direction: column;
          align-items: center; gap: 0;
          text-align: center;
        }

        .fv-title {
          font-family: 'Cormorant Garamond', 'Times New Roman', serif;
          font-size: clamp(52px, 8vw, 96px);
          font-weight: 300; font-style: italic;
          line-height: 1; letter-spacing: -0.015em;
          color: #ffffff;
          min-height: 1.2em;
          /* deliberately NOT monospace — the uneven width during scramble IS the aesthetic */
        }

        .fv-sub {
          font-family: 'Inter', 'Helvetica Neue', sans-serif;
          font-size: 12px; font-weight: 350;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          margin-top: 16px;
          min-height: 1em;
        }

        .fv-phase {
          font-family: 'Inter', 'Helvetica Neue', sans-serif;
          font-size: 10px; font-weight: 350;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.18);
          margin-top: 32px;
          transition: opacity 1s;
        }

        @media (max-width: 600px) {
          .fv-title { font-size: clamp(36px, 12vw, 64px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .fv-preloader--lift { opacity: 0; pointer-events: none; transition: opacity 0.3s; }
          .fv-canvas--graph { display: none; }
        }
      `}</style>
    </div>
  );
}
