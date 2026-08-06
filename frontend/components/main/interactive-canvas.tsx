"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  color: string;
};

/** Lightweight cursor trail — restored after perf trim */
export function InteractiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let lastX = -1;
    let lastY = -1;
    const particles: Particle[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ensureLoop = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const dx = lastX < 0 ? 0 : x - lastX;
      const dy = lastY < 0 ? 0 : y - lastY;
      const speed = Math.min(1, Math.hypot(dx, dy) / 28);
      lastX = x;
      lastY = y;

      const n = speed > 0.15 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8 - 0.2,
          r: 1.4 + Math.random() * 2.2 + speed,
          life: 0.85 + speed * 0.2,
          color: i % 2 ? "#67e8f9" : "#c4b5fd",
        });
      }
      if (particles.length > 40) particles.splice(0, particles.length - 40);
      ensureLoop();
    };

    const onLeave = () => {
      lastX = -1;
      lastY = -1;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // soft glow under cursor tip of trail
      if (particles.length) {
        const tip = particles[particles.length - 1];
        const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 48);
        g.addColorStop(0, "rgba(103,232,249,0.12)");
        g.addColorStop(1, "rgba(3,0,20,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 48, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.022;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (particles.length) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false;
        ctx.clearRect(0, 0, w, h);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[5] h-full w-full"
      aria-hidden
    />
  );
}
