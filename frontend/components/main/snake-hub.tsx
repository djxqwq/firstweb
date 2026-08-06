"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { fetchProfile, resolveMediaUrl } from "@/lib/api";

declare global {
  interface Window {
    GridAnimation?: new (
      canvas: HTMLCanvasElement,
      options?: Record<string, unknown>
    ) => { init: () => void; destroy?: () => void };
    isPhone?: boolean;
    __snakeScript?: boolean;
  }
}

/** Original Tomotoes GridAnimation snake + hub card */
export function SnakeHub() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const gameRef = useRef<{ destroy?: () => void } | null>(null);
  const [avatar, setAvatar] = useState("/avatar.jpg");
  const [name, setName] = useState("邓锦鑫");
  const [role, setRole] = useState("全栈 · 算法 · 人工智能");

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      if (p.cover_url) setAvatar(resolveMediaUrl(p.cover_url));
      if (p.name) setName(p.name);
      if (p.role) setRole(p.role);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let started = false;

    const start = () => {
      const canvas = canvasRef.current;
      if (!canvas || !window.GridAnimation || cancelled || started) return;
      started = true;

      const isPhone = !!window.isPhone;
      const game = new window.GridAnimation(canvas, {
        direction: "diagonal",
        speed: isPhone ? 0.03 : 0.05,
        borderColor: isPhone
          ? "rgba(167, 139, 250, 0.22)"
          : "rgba(112, 66, 248, 0.18)",
        squareSize: isPhone ? 50 : 40,
        hoverFillColor: "rgba(103, 232, 249, 0.55)",
        hoverShadowColor: "rgba(167, 139, 250, 0.75)",
        transitionDuration: isPhone ? 150 : 200,
        trailDuration: isPhone ? 2000 : 1500,
        specialBlockColor: "rgba(112, 66, 248, 0.85)",
        specialHoverColor: "rgba(34, 211, 238, 0.9)",
        snakeHeadColor: "rgba(255, 255, 255, 0.95)",
        snakeTailColor: "rgba(167, 139, 250, 0.3)",
        snakeColorDecay: 0.85,
        touchSensitivity: isPhone ? 1.2 : 1.0,
        vibrationEnabled: isPhone,
      });
      game.init();
      gameRef.current = game;
    };

    const loadAndWatch = () => {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
          }
        },
        { threshold: 0.2 }
      );
      if (sectionRef.current) io.observe(sectionRef.current);

      return () => io.disconnect();
    };

    let stopWatch: (() => void) | undefined;

    if (!window.__snakeScript) {
      window.__snakeScript = true;
      const script = document.createElement("script");
      script.src = `/effects/snake-grid.js?v=3`;
      script.onload = () => {
        stopWatch = loadAndWatch();
      };
      document.body.appendChild(script);
    } else {
      stopWatch = loadAndWatch();
    }

    return () => {
      cancelled = true;
      stopWatch?.();
      try {
        gameRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      gameRef.current = null;
    };
  }, []);

  const goAbout = () => {
    document.getElementById("about-me")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="hub"
      className="relative h-screen w-full snap-start overflow-hidden bg-[#030014]"
    >
      <canvas
        ref={canvasRef}
        id="gridCanvas"
        className="absolute inset-0 h-full w-full"
        aria-label="贪吃蛇互动背景"
      />

      <div className="pointer-events-none relative z-[2] flex h-full flex-col items-center justify-center px-6 text-center">
        <Image
          src={avatar}
          alt={name}
          width={100}
          height={100}
          unoptimized={avatar.startsWith("http")}
          className="rounded-full border-[3px] border-cyan-300/50 object-cover shadow-[0_0_24px_rgba(112,66,248,0.45)]"
        />
        <h2 className="mt-4 text-3xl font-light text-white md:text-4xl">
          {name}
        </h2>
        <p className="mt-2 text-xs tracking-[0.3em] text-indigo-200/80">
          {role}
        </p>

        <div className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-5 text-sm text-violet-200">
          <button
            type="button"
            onClick={goAbout}
            className="rounded-lg border border-violet-400/40 px-4 py-2 transition hover:border-cyan-300/50 hover:text-cyan-200"
          >
            继续了解
          </button>
          <a
            href="https://blog.csdn.net/2302_79866931"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-2 transition hover:text-cyan-200"
          >
            技术博客
          </a>
          <a
            href="mailto:1075751918@qq.com"
            className="rounded-lg px-3 py-2 transition hover:text-cyan-200"
          >
            邮箱
          </a>
          <a
            href="https://github.com/djxqwq"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-2 transition hover:text-cyan-200"
          >
            GitHub
          </a>
        </div>

        <p className="mt-8 text-[11px] tracking-widest text-violet-300/50">
          鼠标移动控制蛇 · 吃掉高亮方块
        </p>
      </div>
    </section>
  );
}
