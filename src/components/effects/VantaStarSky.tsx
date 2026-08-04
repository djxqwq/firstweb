"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
// Vanta has no types; effect factory accepts THREE via options
// eslint-disable-next-line @typescript-eslint/no-require-imports
import NET from "vanta/dist/vanta.net.min";

type Hotspot = {
  id: string;
  label: string;
  kind: string;
  x: string;
  y: string;
};

type Props = {
  className?: string;
  hotspots?: Hotspot[];
  onHotspot?: (h: Hotspot) => void;
  onMeteor?: () => void;
};

/**
 * Proven look: real night-sky photo + Vanta.NET constellation
 * (same stack many portfolios use via vantajs.com — not homemade dots).
 */
export function VantaStarSky({ className = "", hotspots = [], onHotspot, onMeteor }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<{ destroy: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const [meteors, setMeteors] = useState<Array<{ id: number; top: number; delay: number }>>([]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFailed(true);
      return;
    }

    try {
      effectRef.current = NET({
        el,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        color: 0xc4e8ff,
        backgroundColor: 0x020617,
        points: 14,
        maxDistance: 22,
        spacing: 16,
        showDots: true,
      });
    } catch {
      setFailed(true);
    }

    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, []);

  // Occasional meteors — clickable easter egg, not a game mode
  useEffect(() => {
    if (failed) return;
    let id = 0;
    const spawn = () => {
      id += 1;
      const mid = id;
      setMeteors((prev) => [...prev.slice(-2), { id: mid, top: 8 + Math.random() * 45, delay: 0 }]);
      setTimeout(() => setMeteors((prev) => prev.filter((m) => m.id !== mid)), 2200);
    };
    const first = window.setTimeout(spawn, 2800);
    const timer = window.setInterval(spawn, 7000 + Math.random() * 4000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [failed]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Real astronomy photo — the actual art */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center sky-drift"
        style={{ backgroundImage: "url(/assets/space/night-sky.jpg)" }}
      />
      <div
        className="absolute inset-0 opacity-55 mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/space/milkyway.jpg)" }}
      />

      {/* Vanta constellation layer */}
      <div
        ref={mountRef}
        className={`absolute inset-0 ${failed ? "opacity-0" : "opacity-100"} [&_canvas]:!pointer-events-auto [&_canvas]:mix-blend-screen [&_canvas]:opacity-[0.92]`}
        aria-hidden
      />

      {/* Soft vignette so text stays readable without washing out stars */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020617] to-transparent" />

      {/* Constellation hotspots */}
      <div className="pointer-events-none absolute inset-0">
        {hotspots.map((h) => (
          <button
            key={h.id}
            type="button"
            title={h.label}
            onClick={() => onHotspot?.(h)}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: h.x, top: h.y }}
          >
            <span className="block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_4px_rgba(196,232,255,0.85)] transition group-hover:scale-150" />
            <span className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-[10px] tracking-[0.2em] text-white/70 group-hover:block md:block md:opacity-0 md:group-hover:opacity-100">
              {h.label.length > 16 ? h.label.slice(0, 16) + "…" : h.label}
            </span>
          </button>
        ))}
      </div>

      {/* Meteors */}
      {meteors.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-label="流星"
          onClick={() => onMeteor?.()}
          className="pointer-events-auto absolute meteor-streak"
          style={{ top: `${m.top}%`, right: "-5%" }}
        />
      ))}
    </div>
  );
}
