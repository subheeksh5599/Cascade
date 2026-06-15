"use client";

import { useEffect, useState } from "react";

export function Preloader({ text = "Cascade", sub = "Recursive Money Flows", onComplete }: {
  text?: string; sub?: string; onComplete: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [cursor, setCursor] = useState(true);
  const [lift, setLift] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setCursor(false);
          setTimeout(() => {
            setLift(true);
            setTimeout(() => onComplete(), 900);
          }, 500);
        }, 600);
      }
    }, 140);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <div className={`preloader ${lift ? "preloader--lift" : ""}`}>
      <div className="preloader__inner">
        <span className="preloader__text">
          {displayed}
          <span className={`preloader__cursor ${cursor ? "" : "preloader__cursor--off"}`}>|</span>
        </span>
        <span className="preloader__sub">{sub}</span>
      </div>
    </div>
  );
}
