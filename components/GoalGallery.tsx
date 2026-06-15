"use client";

import { useEffect, useRef, useState } from "react";
import { ACTIVE_GOALS, type Goal } from "@/lib/goals";

const ORACLE_ICONS: Record<string, string> = { github: "GH", strava: "ST", manual: "MN" };

function GoalCard({ goal, index, visible, hovered, onHover }: {
  goal: Goal; index: number; visible: boolean; hovered: string | null; onHover: (id: string | null) => void;
}) {
  const pct = Math.min(100, Math.round((goal.currentProgress / goal.target) * 100));
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    <div
      className={`goal-card ${hovered === goal.id ? "goal-card--expanded" : ""} ${hovered && hovered !== goal.id ? "goal-card--dimmed" : ""}`}
      style={{ transitionDelay: visible ? `${index * 100}ms` : "0ms" }}
      onMouseEnter={() => onHover(goal.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="goal-card__media">
        <img
          ref={imgRef}
          src={goal.image}
          alt={goal.title}
          className={`goal-card__img ${loaded ? "goal-card__img--loaded" : ""}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
        <div className="goal-card__oracle">{ORACLE_ICONS[goal.oracle]}</div>
        <div className="goal-card__overlay">
          <span className="goal-card__cta">View Goal</span>
        </div>
      </div>
      <div className="goal-card__body">
        <div className="goal-card__header">
          <span className="goal-card__deadline">{goal.deadline}</span>
          <span className={`goal-card__status goal-card__status--${goal.status}`}>{goal.status}</span>
        </div>
        <strong className="goal-card__title">{goal.title}</strong>
        <p className="goal-card__desc">{goal.description}</p>
        <div className="goal-card__progress-bar">
          <div className="goal-card__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="goal-card__footer">
          <span className="goal-card__progress-text">{goal.currentProgress}/{goal.target} {goal.unit}</span>
          <span className="goal-card__stake">{goal.stakeAmount} USDCx staked</span>
        </div>
      </div>
    </div>
  );
}

export function GoalGallery() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="gallery-section">
      <div className="gallery-header">
        <h2>Live Goals</h2>
        <p className="gallery-header__sub">
          Real stakes. Real deadlines. Every goal is backed by USDCx locked in FlowVault.
        </p>
      </div>
      <div className={`gallery-track ${visible ? "gallery-track--visible" : ""}`}>
        {ACTIVE_GOALS.map((goal, i) => (
          <GoalCard key={goal.id} goal={goal} index={i} visible={visible} hovered={hovered} onHover={setHovered} />
        ))}
      </div>
    </section>
  );
}
