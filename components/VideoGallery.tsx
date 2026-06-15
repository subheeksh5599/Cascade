"use client";

import { useEffect, useRef, useState } from "react";

const PROPERTIES = [
  {
    id: "villa-mare",
    title: "Villa Mare",
    location: "Amalfi Coast, Italy",
    price: "$4,850,000",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=1000&fit=crop&q=80",
  },
  {
    id: "the-penthouse",
    title: "The Arcon Penthouse",
    location: "Upper East Side, New York",
    price: "$9,200,000",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=1000&fit=crop&q=80",
  },
  {
    id: "glass-house",
    title: "The Glass House",
    location: "Beverly Hills, California",
    price: "$7,400,000",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=1000&fit=crop&q=80",
  },
  {
    id: "chalet-blanc",
    title: "Chalet Blanc",
    location: "Gstaad, Switzerland",
    price: "$12,600,000",
    image: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=1000&fit=crop&q=80",
  },
];

export function VideoGallery() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="gallery-section">
      <div className="gallery-header">
        <span className="accent-eyebrow">Portfolio</span>
        <h2>Programmable Properties</h2>
        <p className="gallery-header__sub">
          Every listing settles on-chain via FlowVault. Earnest money locked. Commissions routed. Instant.
        </p>
      </div>

      <div className={`gallery-track ${visible ? "gallery-track--visible" : ""}`}>
        {PROPERTIES.map((p, i) => (
          <div
            key={p.id}
            className={`gallery-card ${hovered === p.id ? "gallery-card--expanded" : ""} ${hovered && hovered !== p.id ? "gallery-card--dimmed" : ""}`}
            style={{ transitionDelay: visible ? `${i * 80}ms` : "0ms" }}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="gallery-card__media">
              <img
                src={p.image}
                alt={p.title}
                className={`gallery-card__img ${loaded.has(p.id) ? "gallery-card__img--loaded" : ""}`}
                loading="lazy"
                onLoad={() => setLoaded((prev) => new Set(prev).add(p.id))}
              />
              <div className="gallery-card__shimmer" />
              <div className="gallery-card__overlay">
                <span className="gallery-card__play">View Listing</span>
              </div>
            </div>
            <div className="gallery-card__info">
              <span className="gallery-card__location">{p.location}</span>
              <strong className="gallery-card__title">{p.title}</strong>
              <span className="gallery-card__price">{p.price}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
