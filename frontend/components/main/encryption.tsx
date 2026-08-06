"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

import { slideInFromTop } from "@/lib/motion";

/* ---------- types ---------- */
type Spark = {
  id: number;
  angle: number;
  speed: number;
  life: number;
  color: string;
};

type OrbitBadge = {
  label: string;
  color: string;
  angle: number;
};

const SECURITY_BADGES: OrbitBadge[] = [
  { label: "JWT", color: "#22d3ee", angle: 0 },
  { label: "bcrypt", color: "#a855f7", angle: 72 },
  { label: "HTTPS", color: "#34d399", angle: 144 },
  { label: "CORS", color: "#f472b6", angle: 216 },
  { label: "OAuth2", color: "#fbbf24", angle: 288 },
];

/* ---------- component ---------- */
export const Encryption = () => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);

  const sparkId = useRef(0);
  const sparkRaf = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- spark engine ---- */
  const runSparks = useCallback((initial: Spark[]) => {
    setSparks(initial);
    cancelAnimationFrame(sparkRaf.current);
    const tick = () => {
      setSparks((prev) => {
        const alive = prev
          .map((p) => ({
            ...p,
            angle: p.angle + p.speed * 0.02,
            speed: p.speed * 0.96,
            life: p.life - 0.018,
          }))
          .filter((p) => p.life > 0);
        if (alive.length) sparkRaf.current = requestAnimationFrame(tick);
        return alive;
      });
    };
    sparkRaf.current = requestAnimationFrame(tick);
  }, []);

  const burst = useCallback(
    (count = 30) => {
      const arr: Spark[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          id: ++sparkId.current,
          angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4,
          speed: 60 + Math.random() * 90,
          life: 1,
          color: i % 3 === 0 ? "#22d3ee" : i % 3 === 1 ? "#a855f7" : "#fbbf24",
        });
      }
      runSparks(arr);
    },
    [runSparks],
  );

  const toggle = () => {
    burst(28);
    setOpen((v) => !v);
  };

  /* ---- magnetic hover ---- */
  const handleMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // we offset the whole container via CSS transform for the magnetic effect
    const dx = (e.clientX - cx) * 0.12;
    const dy = (e.clientY - cy) * 0.12;
    containerRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const resetMagnetic = () => {
    setHover(false);
    if (containerRef.current) containerRef.current.style.transform = "";
  };

  /* ---- render ---- */
  return (
    <section className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden">
      {/* background video */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-start justify-center">
        <video
          data-lazy-video
          loop muted playsInline preload="none"
          className="h-auto w-full opacity-60"
        >
          <source src="/videos/encryption-bg.webm" type="video/webm" />
        </video>
        {/* ambient glow */}
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{
            background: open
              ? "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.18), transparent 55%)"
              : hover
                ? "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.10), transparent 50%)"
                : "transparent",
          }}
        />
      </div>

      {/* title */}
      <div className="absolute top-10 z-[5]">
        <motion.div
          variants={slideInFromTop}
          className="text-center text-[32px] font-medium text-gray-200 md:text-[40px]"
        >
          性能{" "}
          <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
            &
          </span>{" "}
          安全
        </motion.div>
      </div>

      {/* lock area */}
      <div className="relative z-10 flex flex-col items-center">
        {/* orbiting badges — unlocked only */}
        <AnimatePresence>
          {open && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {SECURITY_BADGES.map((b) => {
                const rad = (b.angle * Math.PI) / 180;
                const orbitRadius = 130;
                const x = Math.cos(rad) * orbitRadius;
                const y = Math.sin(rad) * orbitRadius;
                return (
                  <motion.span
                    key={b.label}
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, x, y }}
                    exit={{ opacity: 0, x: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
                    className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur-sm"
                    style={{
                      color: b.color,
                      borderColor: `${b.color}55`,
                      background: `${b.color}15`,
                      boxShadow: `0 0 10px ${b.color}33`,
                    }}
                  >
                    {b.label}
                  </motion.span>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* magnetic container */}
        <div
          ref={containerRef}
          onPointerMove={handleMove}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={resetMagnetic}
          className="relative transition-transform duration-200 ease-out"
        >
          {/* pulse rings */}
          <AnimatePresence>
            {hover && !open &&
              [0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/25"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0.35, 0], scale: [0.8, 1.6 + i * 0.25] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                />
              ))}
          </AnimatePresence>
          <AnimatePresence>
            {open &&
              [0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0.4, 0], scale: [0.7, 2 + i * 0.2] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                />
              ))}
          </AnimatePresence>

          {/* spark particles */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-30">
            {sparks.map((p) => (
              <span
                key={p.id}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{
                  transform: `translate(${Math.cos(p.angle) * p.speed}px, ${Math.sin(p.angle) * p.speed}px)`,
                  opacity: p.life,
                  background: p.color,
                  boxShadow: `0 0 6px ${p.color}`,
                }}
              />
            ))}
          </div>

          {/* ====== clickable lock button ====== */}
          <button
            type="button"
            onClick={toggle}
            className="group relative flex h-44 w-36 cursor-pointer flex-col items-center justify-center select-none outline-none"
            aria-label={open ? "上锁" : "开锁"}
          >
            {/* lock body — glow on hover */}
            <motion.div
              animate={{
                scale: hover ? 1.06 : 1,
                filter: hover
                  ? "drop-shadow(0 0 18px rgba(168,85,247,0.45))"
                  : "none",
              }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative flex flex-col items-center"
            >
              {/* shackle (top arc) */}
              <motion.svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                className="relative z-10"
                animate={{
                  y: open ? 26 : 0,
                  rotate: open ? -10 : 0,
                }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
              >
                <rect
                  x="12" y="18"
                  width="32" height="28"
                  rx="16" ry="16"
                  fill="none"
                  stroke={open ? "#22d3ee" : "#c0c0d0"}
                  strokeWidth="4"
                />
              </motion.svg>

              {/* lock body (rectangle) */}
              <motion.svg
                width="64"
                height="56"
                viewBox="0 0 64 56"
                className="-mt-2"
                animate={{
                  scale: open ? 1.04 : 1,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
              >
                {/* body */}
                <rect
                  x="6" y="0"
                  width="52" height="50"
                  rx="10" ry="10"
                  fill={open ? "rgba(34,211,238,0.15)" : "rgba(112,66,248,0.12)"}
                  stroke={open ? "#22d3ee" : "#a0a0c0"}
                  strokeWidth="2.5"
                />
                {/* keyhole circle */}
                <circle
                  cx="32" cy="20"
                  r="7"
                  fill="none"
                  stroke={open ? "#22d3ee" : "#a0a0c0"}
                  strokeWidth="2"
                />
                {/* keyhole triangle */}
                <polygon
                  points="28,30 36,30 34,44 30,44"
                  fill={open ? "#22d3ee" : "#a0a0c0"}
                  opacity="0.7"
                />
                {/* center dot */}
                {open && (
                  <motion.circle
                    cx="32" cy="22" r="3"
                    fill="#22d3ee"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.svg>
            </motion.div>
          </button>
        </div>

        {/* status badge */}
        <motion.div
          className="mt-5 rounded-full border px-5 py-1.5 text-xs tracking-wider backdrop-blur-sm"
          animate={{
            borderColor: open ? "rgba(34,211,238,0.45)" : "rgba(112,66,248,0.5)",
            background: open
              ? "rgba(34,211,238,0.08)"
              : "rgba(112,66,248,0.06)",
            boxShadow: open
              ? "0 0 22px rgba(34,211,238,0.3)"
              : hover
                ? "0 0 14px rgba(168,85,247,0.25)"
                : "none",
          }}
          transition={{ duration: 0.4 }}
        >
          <span className={open ? "text-cyan-300" : "text-gray-300"}>
            {open ? "解锁 · 安全技术栈" : "点击解锁 · 查看安全实践"}
          </span>
        </motion.div>
      </div>

      {/* bottom text */}
      <div className="absolute bottom-8 z-[20]">
        <p className="cursive text-center text-[18px] font-medium text-gray-300 md:text-[20px]">
          用扎实算法与工程能力，打造可靠系统。
        </p>
      </div>
    </section>
  );
};
