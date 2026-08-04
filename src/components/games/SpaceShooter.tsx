"use client";

import { useEffect, useRef, useState } from "react";

type Rock = { x: number; y: number; vy: number; r: number; img: HTMLImageElement; rot: number; vr: number; hp: number };
type Bullet = { x: number; y: number; vy: number };

export function SpaceShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [alive, setAlive] = useState(true);
  const scoreRef = useRef(0);

  useEffect(() => {
    setBest(Number(localStorage.getItem("space_best") || 0));
  }, []);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 720;
    const H = 480;
    canvas.width = W;
    canvas.height = H;

    const shipImg = new Image();
    const meteorImg = new Image();
    const meteor2Img = new Image();
    const laserImg = new Image();
    const bgImg = new Image();
    shipImg.src = "/assets/game/ship.png";
    meteorImg.src = "/assets/game/meteor.png";
    meteor2Img.src = "/assets/game/meteor2.png";
    laserImg.src = "/assets/game/laser.png";
    bgImg.src = "/assets/game/bg.png";

    const ship = { x: W / 2, y: H - 70, w: 56, h: 56 };
    const rocks: Rock[] = [];
    const bullets: Bullet[] = [];
    const keys: Record<string, boolean> = {};
    let bgY = 0;
    let tick = 0;
    let dead = false;
    scoreRef.current = 0;
    setScore(0);
    setAlive(true);

    const onKey = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = e.type === "keydown";
      if (e.type === "keydown" && e.code === "Space") {
        e.preventDefault();
        bullets.push({ x: ship.x, y: ship.y - 28, vy: -10 });
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    let raf = 0;
    const loop = () => {
      if (dead) return;
      tick += 1;
      const speed = 4 + Math.min(4, scoreRef.current / 400);
      if (keys.arrowleft || keys.a) ship.x -= 6;
      if (keys.arrowright || keys.d) ship.x += 6;
      if (keys.arrowup || keys.w) ship.y -= 5;
      if (keys.arrowdown || keys.s) ship.y += 5;
      ship.x = Math.max(30, Math.min(W - 30, ship.x));
      ship.y = Math.max(40, Math.min(H - 40, ship.y));

      bgY = (bgY + 1.5) % 256;

      if (tick % 28 === 0) {
        const img = Math.random() > 0.5 ? meteorImg : meteor2Img;
        rocks.push({
          x: 40 + Math.random() * (W - 80),
          y: -40,
          vy: speed * (0.7 + Math.random() * 0.6),
          r: 18 + Math.random() * 16,
          img,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.1,
          hp: 1,
        });
      }

      for (const b of bullets) b.y += b.vy;
      for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].y < -20) bullets.splice(i, 1);
      }

      for (const r of rocks) {
        r.y += r.vy;
        r.rot += r.vr;
      }
      for (let i = rocks.length - 1; i >= 0; i--) {
        if (rocks[i].y > H + 60) rocks.splice(i, 1);
      }

      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(b.x - r.x, b.y - r.y) < r.r + 6) {
            bullets.splice(j, 1);
            r.hp -= 1;
            if (r.hp <= 0) {
              rocks.splice(i, 1);
              scoreRef.current += 25;
              setScore(scoreRef.current);
            }
            break;
          }
        }
      }

      for (const r of rocks) {
        if (Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 18) {
          dead = true;
          setAlive(false);
          setRunning(false);
          const finalScore = scoreRef.current;
          const nb = Math.max(best, finalScore);
          setBest(nb);
          localStorage.setItem("space_best", String(nb));
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game: "space-shooter", score: finalScore, playerName: "旅人" }),
          }).catch(() => undefined);
          break;
        }
      }

      if (tick % 6 === 0) setScore(scoreRef.current);

      // draw tiled bg
      if (bgImg.complete) {
        for (let y = -256 + (bgY % 256); y < H; y += 256) {
          for (let x = 0; x < W; x += 256) {
            ctx.drawImage(bgImg, x, y, 256, 256);
          }
        }
      } else {
        ctx.fillStyle = "#0b1026";
        ctx.fillRect(0, 0, W, H);
      }

      for (const b of bullets) {
        if (laserImg.complete) {
          ctx.drawImage(laserImg, b.x - 6, b.y - 18, 12, 28);
        } else {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(b.x - 2, b.y - 10, 4, 16);
        }
      }

      for (const r of rocks) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        if (r.img.complete) {
          const s = r.r * 2.2;
          ctx.drawImage(r.img, -s / 2, -s / 2, s, s);
        } else {
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath();
          ctx.arc(0, 0, r.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (shipImg.complete) {
        ctx.drawImage(shipImg, ship.x - ship.w / 2, ship.y - ship.h / 2, ship.w, ship.h);
      } else {
        ctx.fillStyle = "#7dd3fc";
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - 20);
        ctx.lineTo(ship.x - 16, ship.y + 16);
        ctx.lineTo(ship.x + 16, ship.y + 16);
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [running, best]);

  return (
    <div className="bg-slate-950 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>
          分数 {score} · 最佳 {best}
        </span>
        <span className="text-slate-500">WASD / 方向键 · Space 射击</span>
      </div>
      <canvas ref={canvasRef} className="mx-auto h-auto w-full max-w-full rounded-xl border border-white/10" style={{ aspectRatio: "720/480" }} />
      <div className="mt-3 flex gap-2">
        {!running && (
          <button
            type="button"
            className="rounded-full bg-amber-400/90 px-4 py-2 text-xs font-medium text-slate-950"
            onClick={() => setRunning(true)}
          >
            {alive ? "开始巡航" : "再来一局"}
          </button>
        )}
        {!alive && <span className="self-center text-xs text-rose-300">撞击！分数已提交。</span>}
      </div>
    </div>
  );
}
