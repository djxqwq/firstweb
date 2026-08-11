"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

type Star = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  age: number;
  twinkle: number;
  hue: number;
};

const WELL_NX = 0.5;
const WELL_NY = 0.28;

/**
 * 全 Hero 可点；星空粒子从鼠标飞出再被吸入。
 * 视频用 screen 混合去掉纯黑底，与 #030014 星空页融合。
 */
export function InteractiveBlackhole() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const idRef = useRef(0);
  const pulseRef = useRef(0);
  const sizeRef = useRef({ w: 1, h: 1 });

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });
  const scale = useSpring(1, { stiffness: 160, damping: 20 });
  const brightness = useSpring(1, { stiffness: 120, damping: 20 });
  const hue = useSpring(0, { stiffness: 80, damping: 20 });
  const videoFilter = useMotionTemplate`brightness(${brightness}) hue-rotate(${hue}deg) saturate(1.2) contrast(1.05)`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => void video.play().catch(() => {});
    tryPlay();
    video.addEventListener("loadeddata", tryPlay);
    return () => video.removeEventListener("loadeddata", tryPlay);
  }, []);

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
        if (visible) {
          void videoRef.current?.play().catch(() => {});
          if (!raf) raf = requestAnimationFrame(tick);
        } else {
          videoRef.current?.pause();
        }
      },
      { rootMargin: "120px", threshold: 0 }
    );
    if (wrapRef.current) io.observe(wrapRef.current);

    const resize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const wellCenter = () => {
      const { w, h } = sizeRef.current;
      return {
        cx: w * WELL_NX + sx.get(),
        cy: h * WELL_NY + sy.get(),
      };
    };

    const drawStar = (
      x: number,
      y: number,
      r: number,
      alpha: number,
      color: string
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // 十字星芒
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.45;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - r * 2.4, y);
      ctx.lineTo(x + r * 2.4, y);
      ctx.moveTo(x, y - r * 2.4);
      ctx.lineTo(x, y + r * 2.4);
      ctx.stroke();
      ctx.restore();
    };

    const tick = () => {
      raf = 0;
      if (!visible) return;
      const { w, h } = sizeRef.current;
      const { cx, cy } = wellCenter();
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(
        cx,
        cy,
        4,
        cx,
        cy,
        80 + pulseRef.current * 36
      );
      g.addColorStop(0, `rgba(168,85,247,${0.12 + pulseRef.current * 0.18})`);
      g.addColorStop(0.55, `rgba(34,211,238,${0.05 + pulseRef.current * 0.08})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 90 + pulseRef.current * 40, 0, Math.PI * 2);
      ctx.fill();

      const next: Star[] = [];
      for (const s of starsRef.current) {
        s.age += 1;
        const dx = cx - s.x;
        const dy = cy - s.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / dist;
        const uy = dy / dist;

        // 全程吸入：越近越强，保证最终都能进洞
        const force = 0.35 + 12 / (dist * 0.08 + 18);
        s.vx += ux * force;
        s.vy += uy * force;
        // 削弱切向速度，轨迹更往洞口收
        const tx = s.vx - ux * (s.vx * ux + s.vy * uy);
        const ty = s.vy - uy * (s.vx * ux + s.vy * uy);
        s.vx -= tx * 0.08;
        s.vy -= ty * 0.08;
        s.vx *= 0.99;
        s.vy *= 0.99;
        s.x += s.vx;
        s.y += s.vy;
        s.twinkle += 0.12;

        // 只有进洞口才消掉；途中几乎不掉 life，避免半路消失
        if (dist < 16) {
          s.life -= 0.08;
        } else {
          s.life -= 0.0012;
        }

        if (s.life > 0 && dist > 6) {
          next.push(s);
          const a = Math.min(1, s.life) * (0.55 + 0.45 * Math.abs(Math.sin(s.twinkle)));
          const color =
            s.hue > 250
              ? `rgba(196,181,253,${a})`
              : s.hue > 180
                ? `rgba(165,243,252,${a})`
                : `rgba(255,255,255,${a})`;
          drawStar(s.x, s.y, s.r, a, color);
        }
      }
      starsRef.current = next;

      // 持续补给外围星尘，让黑洞一直在「吸」
      if (starsRef.current.length < 36 && Math.random() < 0.45) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 110 + Math.random() * 220;
        starsRef.current.push({
          id: ++idRef.current,
          x: cx + Math.cos(ang) * rad,
          y: cy + Math.sin(ang) * rad * 0.55,
          vx: -Math.sin(ang) * 0.35,
          vy: Math.cos(ang) * 0.2,
          r: 0.45 + Math.random() * 1.0,
          life: 1,
          age: 0,
          twinkle: Math.random() * Math.PI,
          hue: Math.random() > 0.4 ? 200 : 270,
        });
      }

      pulseRef.current *= 0.93;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [sx, sy]);

  const localPoint = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMove = (e: React.MouseEvent) => {
    const p = localPoint(e);
    if (!p) return;
    const { w, h } = sizeRef.current;
    const nx = p.x / w;
    const ny = p.y / h;
    mx.set((nx - WELL_NX) * 18);
    my.set((ny - WELL_NY) * 12);
    const dist = Math.hypot(nx - WELL_NX, ny - WELL_NY);
    const near = Math.max(0, 1 - dist / 0.45);
    brightness.set(1 + near * 0.2);
    hue.set((WELL_NX - nx) * 18);
    scale.set(1 + near * 0.05);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
    brightness.set(1);
    hue.set(0);
    scale.set(1);
  };

  const onClick = (e: React.MouseEvent) => {
    const p = localPoint(e);
    if (!p) return;
    const { w, h } = sizeRef.current;
    const cx = w * WELL_NX + sx.get();
    const cy = h * WELL_NY + sy.get();
    const distToWell = Math.hypot(p.x - cx, p.y - cy);

    pulseRef.current = Math.min(1.2, 0.55 + distToWell / 400);
    scale.set(1.06);
    window.setTimeout(() => scale.set(1), 240);

    // 少而精：少量星点从鼠标散开，随后全部被吸入
    const nearFactor = Math.min(1, distToWell / 140);
    const count = Math.floor(8 + nearFactor * 4); // 8~12
    const baseSp = 0.5 + nearFactor * 2.4;

    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const sp = baseSp * (0.6 + Math.random() * 0.55);
      const tangential = nearFactor < 0.35;
      const vx = tangential
        ? -Math.sin(ang) * sp * 1.2 + Math.cos(ang) * sp * 0.2
        : Math.cos(ang) * sp;
      const vy = tangential
        ? Math.cos(ang) * sp * 1.2 + Math.sin(ang) * sp * 0.2
        : Math.sin(ang) * sp;

      starsRef.current.push({
        id: ++idRef.current,
        x: p.x + (Math.random() - 0.5) * 4,
        y: p.y + (Math.random() - 0.5) * 4,
        vx,
        vy,
        r: 0.8 + Math.random() * 1.2,
        life: 1,
        age: 0,
        twinkle: Math.random() * Math.PI,
        hue: i % 3 === 0 ? 280 : i % 3 === 1 ? 195 : 0,
      });
    }
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 z-0 cursor-crosshair"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      role="presentation"
    >
      {/* screen：纯黑透明，和主页 #030014 星空底融合；边缘羽化再软一点 */}
      <motion.video
        ref={videoRef}
        data-lazy-video
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{
          x: sx,
          y: sy,
          scale,
          filter: videoFilter,
          mixBlendMode: "screen",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 28%, #000 35%, transparent 78%)",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 28%, #000 35%, transparent 78%)",
        }}
        className="pointer-events-none absolute left-0 top-[-8%] h-[85%] w-full rotate-180 object-cover opacity-95"
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
