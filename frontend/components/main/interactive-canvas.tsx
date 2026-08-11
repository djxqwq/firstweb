"use client";

/**
 * Lightweight star cursor trail + click ripples.
 * Inspired by common open-source cursor glitter demos (canvas, no heavy physics).
 * Keeps particle count low to avoid competing with the fluid intro WebGL.
 */

import { useEffect, useRef } from "react";

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  color: string;
};

type Ripple = {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  color: string;
};

export function InteractiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let lastX = -1;
    let lastY = -1;
    let lastSpawn = 0;
    const dots: Dot[] = [];
    const ripples: Ripple[] = [];
    const COLORS = ["#67e8f9", "#a78bfa", "#f0abfc", "#e0f2fe"];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
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
      const now = performance.now();
      if (now - lastSpawn < 24) {
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      lastSpawn = now;
      const x = e.clientX;
      const y = e.clientY;
      const dx = lastX < 0 ? 0 : x - lastX;
      const dy = lastY < 0 ? 0 : y - lastY;
      lastX = x;
      lastY = y;
      if (Math.hypot(dx, dy) < 2) return;

      dots.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.15,
        life: 0.7,
        r: 1.2 + Math.random() * 1.6,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
      if (dots.length > 28) dots.splice(0, dots.length - 28);
      ensureLoop();
    };

    const onClick = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      ripples.push({
        x,
        y,
        r: 2,
        max: 56 + Math.random() * 24,
        life: 1,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
      for (let i = 0; i < 12; i++) {
        const ang = (Math.PI * 2 * i) / 12;
        const sp = 1.8 + Math.random() * 2.2;
        dots.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0.95,
          r: 1.4 + Math.random() * 1.8,
          color: COLORS[i % COLORS.length],
        });
      }
      if (dots.length > 40) dots.splice(0, dots.length - 40);
      ensureLoop();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (rp.max - rp.r) * 0.12 + 1.2;
        rp.life -= 0.03;
        if (rp.life <= 0 || rp.r >= rp.max) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = rp.life * 0.55;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r * 0.55, 0, Math.PI * 2);
        ctx.globalAlpha = rp.life * 0.25;
        ctx.stroke();
      }

      for (let i = dots.length - 1; i >= 0; i--) {
        const p = dots[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= 0.028;
        if (p.life <= 0) {
          dots.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (dots.length || ripples.length) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false;
        ctx.clearRect(0, 0, w, h);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onClick);
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
