"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 8927, suffix: "+", label: "Goals Staked" },
  { value: 4.2, suffix: "M", label: "USDCx Locked", prefix: "$" },
  { value: 94, suffix: "%", label: "Success Rate" },
  { value: 0.3, suffix: "s", label: "Avg Settlement Time" },
];

function CountUp({ target, suffix, prefix, isActive }: {
  target: number; suffix: string; prefix?: string; isActive: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!isActive) { setCurrent(0); return; }
    startRef.current = 0;
    const duration = 1800;
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(targetRef.current * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isActive]);

  const display = target % 1 !== 0 ? current.toFixed(1) : String(current);
  return <span className="stat-num">{prefix}{display}{suffix}</span>;
}

export function StatsBand() {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); obs.unobserve(el); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="stats-band">
      <div className="stats-band__inner">
        {STATS.map((s) => (
          <div key={s.label} className="stats-band__item">
            <CountUp target={s.value} suffix={s.suffix} prefix={s.prefix} isActive={active} />
            <span className="stats-band__label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
