"use client";

import { useEffect, useRef } from "react";

/**
 * 轻量级工具区星空背景 — 纯 Canvas，无 Three.js 依赖
 * - 随机生成数百颗星星 + 几颗流星（免费实现）
 * - 视口变化自适应，标签隐藏时自动停止动画（省电）
 * - 颜色配合秋招台：青蓝 + 淡紫 + 暖琥珀点缀
 */
export function ToolsStarfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = {
      x: number;
      y: number;
      r: number;
      twinkle: number;
      speed: number;
      hue: number;
    };

    type Meteor = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
    };

    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let meteorTimer = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(120, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.018,
        hue: pickHue(),
      }));
    };

    const pickHue = () => {
      // 青蓝主导，穿插少量紫 + 琥珀
      const r = Math.random();
      if (r < 0.72) return 185 + Math.random() * 25; // 青蓝
      if (r < 0.92) return 255 + Math.random() * 35; // 紫
      return 38 + Math.random() * 18; // 琥珀点缀
    };

    const spawnMeteor = () => {
      const fromTop = Math.random() < 0.7;
      const startX = fromTop ? Math.random() * w * 1.2 : -40;
      const startY = fromTop ? -40 : Math.random() * h * 0.4;
      const angle = fromTop ? Math.PI / 4.5 : Math.PI / 7;
      const speed = 6 + Math.random() * 5;
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 70 + Math.floor(Math.random() * 60),
      });
    };

    const loop = () => {
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // 半透明拖尾，营造流星残影 + 星星柔边
      ctx.fillStyle = "rgba(4, 6, 13, 0.28)";
      ctx.fillRect(0, 0, w, h);

      // 星星
      for (const s of stars) {
        s.twinkle += s.speed;
        const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.twinkle));
        const glow = s.r * 3;
        // 发光晕
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glow);
        grad.addColorStop(0, `hsla(${s.hue}, 95%, 80%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${s.hue}, 95%, 70%, ${alpha * 0.25})`);
        grad.addColorStop(1, `hsla(${s.hue}, 95%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glow, 0, Math.PI * 2);
        ctx.fill();
        // 星芯
        ctx.fillStyle = `hsla(${s.hue}, 100%, 95%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 流星
      meteorTimer++;
      if (meteorTimer > 220 + Math.random() * 280) {
        meteorTimer = 0;
        if (meteors.length < 2) spawnMeteor();
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life++;
        const prog = m.life / m.max;
        const alpha = prog < 0.15 ? prog / 0.15 : 1 - (prog - 0.15) / 0.85;
        const tailLen = 120;
        const tx = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * tailLen;
        const ty = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * tailLen;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `hsla(190, 100%, 92%, ${alpha})`);
        g.addColorStop(0.35, `hsla(195, 100%, 75%, ${alpha * 0.6})`);
        g.addColorStop(1, "hsla(260, 100%, 70%, 0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // 流星头
        const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
        head.addColorStop(0, `hsla(190, 100%, 98%, ${alpha})`);
        head.addColorStop(1, "hsla(260, 100%, 75%, 0)");
        ctx.fillStyle = head;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fill();

        if (m.life > m.max || m.x > w + 120 || m.y > h + 120) {
          meteors.splice(i, 1);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
