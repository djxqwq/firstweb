"use client";

/**
 * Precise neon crosshair cursor (1:1 follow, no lag ring).
 * Click burst only while animating — no perpetual full-screen clear.
 */

import { useEffect, useRef } from "react";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

export function CosmicCursor() {
  const tipRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    document.documentElement.classList.add("cosmic-cursor");

    const tip = tipRef.current;
    const canvas = canvasRef.current;
    if (!tip || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;
    const sparks: Spark[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const isInteractive = (el: EventTarget | null) => {
      if (!(el instanceof Element)) return false;
      return !!el.closest(
        "a,button,input,textarea,select,label,[role='button'],.cursor-pointer"
      );
    };

    const onMove = (e: MouseEvent) => {
      // exact position — no lerp lag
      tip.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      tip.classList.toggle("is-hot", isInteractive(e.target));
    };

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.life -= 0.045;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (sparks.length) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    const onDown = (e: MouseEvent) => {
      tip.classList.add("is-down");
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(ang) * 2.8,
          vy: Math.sin(ang) * 2.8,
          life: 1,
          color: i % 2 ? "#67e8f9" : "#c4b5fd",
        });
      }
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const onUp = () => tip.classList.remove("is-down");

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      document.documentElement.classList.remove("cosmic-cursor");
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9990] hidden md:block"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        ref={tipRef}
        className="cosmic-cross absolute left-0 top-0 will-change-transform"
      >
        <span className="arm h" />
        <span className="arm v" />
        <span className="core" />
      </div>
    </div>
  );
}
