"use client";

import { useEffect, useRef, useState } from "react";
import { Preloader } from "@/components/Preloader";
import { StatsBand } from "@/components/StatsBand";
import { GoalGallery } from "@/components/GoalGallery";
import { GoalStaking } from "@/components/GoalStaking";
import { WalletButton } from "@/components/WalletButton";

export function GSAPApp() {
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
        const el = revealRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        const windowH = window.innerHeight;
        const p = Math.min(1, Math.max(0, (windowH * 0.4 - top) / (windowH * 0.8)));
        setProgress(p);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loading]);

  const rp = progress;

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}

      <main className={`velar-main ${loading ? "velar-main--hidden" : "velar-main--visible"}`}>
        <header className="topbar-fixed">
          <div className="brand">
            <span className="brand-name">StakeVow</span>
          </div>
          <nav className="topbar-nav">
            <span className="nav-link active">Goals</span>
            <span className="nav-link">How It Works</span>
            <span className="nav-link">Docs</span>
          </nav>
          <WalletButton />
        </header>

        <section className="hero-statement">
          <div className="hero-statement__inner">
            <h1 className="fade-in">
              Stake it.
              <br />
              Prove it.
              <br />
              Or lose it.
            </h1>
            <p className="fade-in stagger-1">
              Stake USDCx on any goal via FlowVault. Hit the target, get it all back.
              Fall short, and your penalty routes automatically. Lock. Split. Hold.
              All enforced by smart contracts on Stacks.
            </p>
          </div>
        </section>

        <section className="building-reveal" ref={revealRef}>
          <div className="building-reveal__sticky">
            <div className="building-reveal__statement">
              <span className="building-reveal__num">{Math.round(rp * 100)}%</span>
              <h2>Your goal.<br />Your stake.<br />Your proof.</h2>
              <div className="building-reveal__line" style={{ transform: `scaleX(${rp})` }} />
              <p className="building-reveal__tagline">
                FlowVault locks your stake until the deadline. An oracle verifies the outcome.
                Success returns everything. Failure routes the penalty. Zero trust required.
              </p>
            </div>

            <div
              className="scroll-reveal-img"
              style={{
                transform: `translateY(${(1 - rp) * 40}%) scale(${0.75 + rp * 0.25})`,
                opacity: Math.min(1, rp * 1.6),
              }}
            >
              <div className="flow-diagram-viz">
                <div className="fd-node fd-node--deposit">
                  <span className="fd-node__label">Deposit</span>
                  <span className="fd-node__val">USDCx</span>
                </div>
                <div className="fd-arrow">→</div>
                <div className="fd-routes">
                  <div className="fd-route fd-route--lock">
                    <span className="fd-route__label">Lock</span>
                    <span className="fd-route__detail">until deadline</span>
                  </div>
                  <div className="fd-route fd-route--split">
                    <span className="fd-route__label">Split</span>
                    <span className="fd-route__detail">to penalty</span>
                  </div>
                  <div className="fd-route fd-route--hold">
                    <span className="fd-route__label">Hold</span>
                    <span className="fd-route__detail">liquid balance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dark-statement">
          <div className="dark-statement__inner">
            <div className="dark-statement__text">
              <span className="dark-statement__eyebrow">How It Works</span>
              <h3>Three FlowVault primitives. One deposit. Instant enforcement.</h3>
              <p>
                When you stake a goal, FlowVault's <strong>Lock</strong> primitive
                secures your funds until the deadline block height. The <strong>Split</strong>{" "}
                primitive pre-commits your penalty to the recipient. The <strong>Hold</strong>{" "}
                primitive keeps your remaining balance liquid. All routing executes atomically
                in a single transaction, verifiable on the Stacks testnet explorer.
              </p>
              <div className="dark-statement__tags">
                <span>Lock: Stake Secured</span>
                <span>Split: Penalty Routed</span>
                <span>Hold: Liquid Balance</span>
              </div>
            </div>
            <div className="dark-statement__visual">
              <div className="ds-shape" />
              <div className="ds-shape ds-shape--small" />
            </div>
          </div>
        </section>

        <StatsBand />
        <GoalGallery />
        <GoalStaking />

        <footer className="velar-footer">
          <p className="footer-sub">StakeVow &middot; Built with FlowVault &middot; Lock &middot; Split &middot; Hold</p>
        </footer>
      </main>
    </>
  );
}
