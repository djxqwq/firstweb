"use client";

import { useEffect, useState } from "react";
import { fetchAccessCheck, trackVisit, type AccessCheck } from "@/lib/api";

/**
 * VPN / 境外节点拦截组件。
 *
 * 页面加载时调用 /api/access-check 判断访客是否来自国内。
 * 若为 VPN / 境外 IP，展示嘲讽动画，阻止访问真实内容。
 */

export function VpnBlocker({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "allowed" | "blocked">(
    "loading",
  );
  const [info, setInfo] = useState<AccessCheck | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccessCheck().then((data) => {
      if (cancelled) return;
      if (!data) {
        // API 不可用时放行（不阻断正常访问）
        setStatus("allowed");
        return;
      }
      setInfo(data);
      setStatus(data.allowed ? "allowed" : "blocked");
      // 被拦截时 children 不会挂载，VisitTracker 不会触发；
      // 这里主动上报一次，让后台「外网/VPN 访问记录」能收到这条数据。
      // 后端 post_visit 会按 IP 重新判定 blocked 并入库。
      if (!data.allowed) {
        trackVisit(window.location.pathname);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#030014]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          <span className="text-sm text-gray-500">正在验证访问权限…</span>
        </div>
      </div>
    );
  }

  if (status === "blocked") {
    return <BlockedScreen info={info} />;
  }

  return <>{children}</>;
}

function BlockedScreen({ info }: { info: AccessCheck | null }) {
  const [glitchKey, setGlitchKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setGlitchKey((k) => k + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  const taunts = [
    "别翻墙了，墙外的世界没有你的代码。",
    "VPN 关了吗？关了再进来。",
    "你的 IP 位置比你的代码还能跑。",
    "这位来自「国外」的朋友，本站仅对中国大陆开放。",
    "检测到 VPN 节点，建议关闭后享受完整体验。",
    "你跑得比数据包还快，但跑不过我的防火墙。",
  ];
  const taunt = taunts[glitchKey % taunts.length];

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden bg-[#030014]">
      {/* Matrix rain background */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <MatrixRain />
      </div>

      {/* Radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(168,85,247,0.05) 40%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Glitch 403 */}
        <div className="relative mb-8">
          <GlitchText text="403" />
        </div>

        {/* Animated shield */}
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
          <div
            className="absolute inset-0 animate-ping rounded-full border border-red-500/30"
            style={{ animationDuration: "3s" }}
          />
          <div
            className="absolute inset-[-20px] animate-spin rounded-full border-2 border-dashed border-red-500/20"
            style={{ animationDuration: "8s", animationDirection: "reverse" }}
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-20 w-20 text-red-500"
            style={{ animation: "pulse-shield 2s ease-in-out infinite" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-red-400">访问被拒绝</h1>

        {/* Taunt message */}
        <p
          key={glitchKey}
          className="mb-6 max-w-md text-sm leading-relaxed text-gray-400"
          style={{ animation: "fade-slide 0.5s ease-out" }}
        >
          {taunt}
        </p>

        {/* Info box */}
        {info && (
          <div className="mb-8 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
              <span className="text-gray-500">你的 IP</span>
              <span className="font-mono text-red-400">{info.ip}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 py-2 text-xs">
              <span className="text-gray-500">检测位置</span>
              <span className="text-gray-300">
                {info.country || "未知"}
                {info.city ? ` · ${info.city}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 text-xs">
              <span className="text-gray-500">VPN 状态</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  info.proxy || info.hosting
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {info.proxy || info.hosting
                  ? "已检测到代理/VPN"
                  : "境外节点"}
              </span>
            </div>
            {info.isp && (
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                <span className="text-gray-500">ISP</span>
                <span className="max-w-[180px] truncate text-gray-400">
                  {info.isp}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm text-cyan-300 transition hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          关闭 VPN 后重试
        </button>

        {/* Footer */}
        <p className="mt-12 text-xs text-gray-700">
          本站仅对中国大陆 IP 开放 · 国外访问不予记录
        </p>
      </div>

      <style>{`
        @keyframes pulse-shield {
          0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 8px rgba(239,68,68,0.4)); }
          50% { transform: scale(1.08); opacity: 0.85; filter: drop-shadow(0 0 16px rgba(239,68,68,0.6)); }
        }
        @keyframes fade-slide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glitch-1 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(20% 0 30% 0); transform: translate(-2px, 2px); }
          40% { clip-path: inset(50% 0 10% 0); transform: translate(2px, -2px); }
          60% { clip-path: inset(10% 0 60% 0); transform: translate(-1px, 1px); }
          80% { clip-path: inset(70% 0 5% 0); transform: translate(1px, -1px); }
        }
        @keyframes glitch-2 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
          40% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 1px); }
          60% { clip-path: inset(40% 0 30% 0); transform: translate(1px, 2px); }
          80% { clip-path: inset(30% 0 40% 0); transform: translate(-1px, -2px); }
        }
      `}</style>
    </div>
  );
}

function GlitchText({ text }: { text: string }) {
  return (
    <div className="relative">
      {/* Base text */}
      <span className="text-7xl font-black tracking-wider text-gray-700">
        {text}
      </span>
      {/* Red glitch layer */}
      <span
        className="absolute inset-0 text-7xl font-black tracking-wider text-red-500"
        style={{ animation: "glitch-1 2.5s infinite linear alternate" }}
      >
        {text}
      </span>
      {/* Cyan glitch layer */}
      <span
        className="absolute inset-0 text-7xl font-black tracking-wider text-cyan-400"
        style={{ animation: "glitch-2 2s infinite linear alternate" }}
      >
        {text}
      </span>
    </div>
  );
}

function MatrixRain() {
  const chars = "01アイウエオカキクケコサシスセソタチツテト".split("");

  useEffect(() => {
    const canvas = document.getElementById(
      "matrix-canvas",
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns)
      .fill(0)
      .map(() => Math.random() * -100);

    const draw = () => {
      ctx.fillStyle = "rgba(3, 0, 20, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#22d3ee";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(
          char,
          i * fontSize,
          drops[i] * fontSize,
        );
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      id="matrix-canvas"
      className="h-full w-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
