"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Mote = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
};

/**
 * Interactive blackhole: cursor warp, click accretion pulse, gravity motes.
 */
export function InteractiveBlackhole() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motesRef = useRef<Mote[]>([]);
  const idRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.35, active: false });
  const pulseRef = useRef(0);

  const [pulses, setPulses] = useState(0);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });
  const scale = useSpring(1, { stiffness: 160, damping: 20 });
  const brightness = useSpring(1, { stiffness: 120, damping: 20 });
  const hue = useSpring(0, { stiffness: 80, damping: 20 });
  const videoFilter = useMotionTemplate`brightness(${brightness}) hue-rotate(${hue}deg) saturate(1.15)`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      },
      { rootMargin: "80px" }
    );
    if (wrapRef.current) io.observe(wrapRef.current);

    const resize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      raf = 0;
      const el = wrapRef.current;
      if (!el || !visible) return;
      const { width: w, height: h } = el.getBoundingClientRect();
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5 + (mouseRef.current.x - 0.5) * 40;
      const cy = h * 0.28 + (mouseRef.current.y - 0.35) * 30;

      // accretion glow
      const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 90 + pulseRef.current * 40);
      g.addColorStop(0, `rgba(168,85,247,${0.18 + pulseRef.current * 0.25})`);
      g.addColorStop(0.4, `rgba(34,211,238,${0.08 + pulseRef.current * 0.12})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 110 + pulseRef.current * 50, 0, Math.PI * 2);
      ctx.fill();

      // gravity motes
      const next: Mote[] = [];
      for (const m of motesRef.current) {
        const dx = cx - m.x;
        const dy = cy - m.y;
        const dist = Math.max(12, Math.hypot(dx, dy));
        const pull = 180 / (dist * dist);
        m.vx += (dx / dist) * pull * 8;
        m.vy += (dy / dist) * pull * 8;
        m.vx *= 0.96;
        m.vy *= 0.96;
        m.x += m.vx;
        m.y += m.vy;
        m.life -= dist < 28 ? 0.08 : 0.004;
        if (m.life > 0 && dist > 10) {
          next.push(m);
          ctx.beginPath();
          ctx.fillStyle = `rgba(165,243,252,${m.life})`;
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 8;
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      motesRef.current = next;

      // ambient orbit dust
      if (motesRef.current.length < 22 && Math.random() < 0.2) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 70 + Math.random() * 160;
        motesRef.current.push({
          id: ++idRef.current,
          x: cx + Math.cos(ang) * rad,
          y: cy + Math.sin(ang) * rad * 0.55,
          vx: -Math.sin(ang) * 0.6,
          vy: Math.cos(ang) * 0.35,
          r: 0.8 + Math.random() * 1.6,
          life: 0.7 + Math.random() * 0.3,
        });
      }

      pulseRef.current *= 0.94;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    mouseRef.current = { x: nx, y: ny, active: true };
    mx.set((nx - 0.5) * 28);
    my.set((ny - 0.35) * 18);
    const dist = Math.hypot(nx - 0.5, ny - 0.28);
    brightness.set(1 + Math.max(0, 0.25 - dist) * 1.2);
    hue.set((0.5 - nx) * 25);
    scale.set(1 + Math.max(0, 0.22 - dist) * 0.35);
  };

  const onLeave = () => {
    mouseRef.current.active = false;
    mx.set(0);
    my.set(0);
    brightness.set(1);
    hue.set(0);
    scale.set(1);
  };

  const onClick = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    pulseRef.current = Math.min(1.6, 1 + pulses * 0.08);
    scale.set(1.08);
    window.setTimeout(() => scale.set(1), 280);
    for (let i = 0; i < 18 + Math.min(pulses, 10); i++) {
      const ang = (Math.PI * 2 * i) / 18;
      motesRef.current.push({
        id: ++idRef.current,
        x: cx + Math.cos(ang) * 20,
        y: cy + Math.sin(ang) * 20,
        vx: Math.cos(ang) * 3,
        vy: Math.sin(ang) * 3,
        r: 1.2 + Math.random(),
        life: 1,
      });
    }
    setPulses((n) => n + 1);
  };

  return (
    <div
      ref={wrapRef}
      className="absolute left-0 top-[-340px] z-0 h-full w-full cursor-crosshair"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      role="presentation"
    >
      <motion.video
        data-lazy-video
        muted
        loop
        playsInline
        preload="none"
        style={{ x: sx, y: sy, scale, filter: videoFilter }}
        className="rotate-180 h-full w-full object-cover"
      >
        <source src="/videos/blackhole.webm" type="video/webm" />
      </motion.video>

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
      />
    </div>
  );
}
