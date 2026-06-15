"use client";

import { useEffect, useRef, useState } from "react";
import { Preloader } from "@/components/Preloader";
import { StatsBand } from "@/components/StatsBand";
import { VideoGallery } from "@/components/VideoGallery";
import { EscrowPanel } from "@/components/EscrowPanel";
import { WalletButton } from "@/components/WalletButton";

export function VelarApp() {
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const revealRef = useRef<HTMLDivElement>(null);
  const revealProgress = useRef(0);

  useEffect(() => {
    if (loading) return;

    const onScroll = () => {
      setScrollY(window.scrollY);
      const el = revealRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const start = windowH * 0.3;
      const end = rect.height * 0.7;

      if (rect.top < start && rect.bottom > 0) {
        const progress = Math.min(1, Math.max(0, (start - rect.top) / (start + end)));
        revealProgress.current = progress;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading]);

  const rp = revealProgress.current;

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}

      <main className={`velar-main ${loading ? "velar-main--hidden" : "velar-main--visible"}`}>
        <header className="topbar-fixed">
          <div className="brand">
            <div className="brand-mark">V</div>
            <div>
              <span className="brand-name">Velar</span>
              <span className="brand-sub">Programmable Real Estate</span>
            </div>
          </div>
          <nav className="topbar-nav">
            <span className="nav-link active">Properties</span>
            <span className="nav-link">How It Works</span>
            <span className="nav-link">Docs</span>
          </nav>
          <WalletButton />
        </header>

        <section className="hero-statement">
          <div className="hero-bg-image" />
          <div className="hero-statement__inner">
            <span className="accent-eyebrow fade-in">Built on FlowVault &middot; Stacks</span>
            <h1 className="fade-in stagger-1">
              Real estate transactions
              <br />
              programmed, not brokered.
            </h1>
            <p className="fade-in stagger-2">
              Velar encodes property escrow as programmable money flows.
              Earnest money locked on-chain. Agent commissions auto-routed at settlement.
              No escrow company. No wire delays. Just <em>code.</em>
            </p>
          </div>
        </section>

        <section className="building-reveal" ref={revealRef}>
          <div className="building-reveal__sticky">
            <div className="building-reveal__statement">
              <span className="building-reveal__num">
                {Math.round(rp * 100)}%
              </span>
              <h2>
                Lock. Split.
                <br />
                Settle.
              </h2>
              <div className="building-reveal__line" style={{ transform: `scaleX(${rp})` }} />
              <p className="building-reveal__tagline">
                Three FlowVault primitives power every Velar transaction. One deposit. Instant routing.
              </p>
            </div>

            <div
              className="building-facade"
              style={{
                transform: `translateY(${(1 - rp) * 60}%) scale(${0.7 + rp * 0.3})`,
                opacity: Math.min(1, rp * 1.5),
              }}
            >
              <div className="building-facade__body">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="building-facade__row"
                    style={{ opacity: 0.15 + (i / 12) * 0.4 }}
                  >
                    {Array.from({ length: 6 - Math.floor(i / 3) }).map((_, j) => (
                      <div key={j} className="building-facade__window" />
                    ))}
                  </div>
                ))}
              </div>
              <div className="building-facade__crown" />
              <div className="building-facade__base" />
            </div>
          </div>
        </section>

        <section className="dark-statement">
          <div className="dark-statement__inner">
            <div className="dark-statement__text">
              <span className="dark-statement__eyebrow">Why Programmable Escrow</span>
              <h3>
                Traditional escrow takes weeks and costs thousands. FlowVault settles in blocks and routes commissions instantly.
              </h3>
              <p>
                Every Velar property listing is a smart routing rule. When a buyer deposits,
                FlowVault&apos;s Lock primitive secures earnest money until the closing block height.
                The Split primitive routes the agent&apos;s commission at deposit time &mdash; no
                waiting for settlement. The Hold primitive keeps remaining funds liquid. All
                verifiable on-chain via Stacks explorer.
              </p>
              <div className="dark-statement__tags">
                <span>Lock: Earnest Money</span>
                <span>Split: Agent Commission</span>
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
        <VideoGallery />
        <EscrowPanel />

        <footer className="velar-footer">
          <div className="footer-brand">
            <div className="brand-mark footer-mark">V</div>
            <span>Velar &mdash; Programmable Real Estate on Stacks</span>
          </div>
          <p className="footer-sub">
            Built with FlowVault &middot; Lock &middot; Split &middot; Hold &middot; Stacks Testnet
          </p>
        </footer>
      </main>
    </>
  );
}
