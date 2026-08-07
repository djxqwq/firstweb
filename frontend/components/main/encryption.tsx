"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import { slideInFromTop } from "@/lib/motion";

/* ---------- types ---------- */
type Spark = {
  id: number;
  angle: number;
  speed: number;
  life: number;
  color: string;
};

interface MeshNode {
  id: string;
  label: string;
  color: string;
  angle: number;   // degrees
  radius: number;  // px from center
  connections: string[];
}

/* ---------- 技术栈网状节点 ---------- */
const MESH_NODES: MeshNode[] = [
  { id: "cpp",      label: "C/C++",       color: "#22d3ee", angle: 0,    radius: 155, connections: ["python","java","opencv"] },
  { id: "python",   label: "Python",      color: "#fbbf24", angle: 26,   radius: 130, connections: ["cpp","opencv","yolo","fastapi"] },
  { id: "java",     label: "Java",        color: "#f472b6", angle: -26,  radius: 140, connections: ["cpp","spring"] },
  { id: "opencv",   label: "OpenCV",      color: "#34d399", angle: 52,   radius: 160, connections: ["cpp","python","yolo"] },
  { id: "yolo",     label: "YOLO",        color: "#a855f7", angle: 78,   radius: 145, connections: ["python","opencv"] },
  { id: "spring",   label: "SpringBoot",  color: "#fb923c", angle: -52,  radius: 150, connections: ["java","mysql"] },
  { id: "fastapi",  label: "FastAPI",     color: "#22d3ee", angle: 104,  radius: 135, connections: ["python","docker","tidb"] },
  { id: "mysql",    label: "MySQL",       color: "#fbbf24", angle: -78,  radius: 155, connections: ["spring","tidb"] },
  { id: "tidb",     label: "TiDB",        color: "#a855f7", angle: -104, radius: 140, connections: ["mysql","fastapi","docker"] },
  { id: "docker",   label: "Docker",      color: "#38bdf8", angle: 130,  radius: 150, connections: ["fastapi","tidb","nginx"] },
  { id: "nginx",    label: "Nginx",       color: "#34d399", angle: -130, radius: 145, connections: ["docker","git"] },
  { id: "git",      label: "Git",         color: "#f472b6", angle: 156,  radius: 130, connections: ["nginx","react"] },
  { id: "react",    label: "React/Next",  color: "#22d3ee", angle: -156, radius: 150, connections: ["git","vue"] },
  { id: "vue",      label: "Vue/Uniapp",  color: "#34d399", angle: 182,  radius: 140, connections: ["react"] },
];

/* ---------- 预计算连线（去重） ---------- */
function buildLineSegments() {
  const map = new Map(MESH_NODES.map((n) => [n.id, n]));
  const segments: { from: MeshNode; to: MeshNode }[] = [];
  for (const node of MESH_NODES) {
    for (const cid of node.connections) {
      const target = map.get(cid);
      if (!target) continue;
      if (segments.some((s) => (s.from.id === target.id && s.to.id === node.id))) continue;
      segments.push({ from: node, to: target });
    }
  }
  return segments;
}

/* ---------- component ---------- */
export const Encryption = () => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);

  const sparkId = useRef(0);
  const sparkRaf = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const lineSegments = useMemo(buildLineSegments, []);

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
        {/* ====== lock button 锚点容器（网状图以锁中心对齐） ====== */}
        <div className="relative">
          {/* ====== 网状技术栈（解锁后出现，对齐到锁按钮中心） ====== */}
          <AnimatePresence>
            {open && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {/* ---- SVG 连线层 ---- */}
                <svg
                  viewBox="-220 -220 440 440"
                  className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2"
                  style={{ overflow: "visible" }}
                >
                  {lineSegments.map((seg, i) => {
                    const fr = (seg.from.angle * Math.PI) / 180;
                    const tr = (seg.to.angle * Math.PI) / 180;
                    const x1 = Math.cos(fr) * seg.from.radius;
                    const y1 = Math.sin(fr) * seg.from.radius;
                    const x2 = Math.cos(tr) * seg.to.radius;
                    const y2 = Math.sin(tr) * seg.to.radius;
                    return (
                      <motion.path
                        key={`${seg.from.id}-${seg.to.id}`}
                        d={`M ${x1} ${y1} L ${x2} ${y2}`}
                        fill="none"
                        stroke={seg.from.color}
                        strokeWidth="1.2"
                        strokeOpacity="0.4"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        exit={{ opacity: 0, pathLength: 0 }}
                        transition={{
                          delay: 0.25 + i * 0.04,
                          duration: 0.6,
                          ease: "easeInOut",
                        }}
                        style={{ filter: `drop-shadow(0 0 3px ${seg.from.color}66)` }}
                      />
                    );
                  })}
                </svg>

                {/* ---- 节点层（transformTemplate 避免覆盖 -translate-1/2） ---- */}
                {MESH_NODES.map((node, i) => {
                  const rad = (node.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * node.radius;
                  const y = Math.sin(rad) * node.radius;
                  return (
                    <motion.span
                      key={node.id}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x, y }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 180,
                        damping: 16,
                        delay: 0.35 + i * 0.055,
                      }}
                      transformTemplate={({ x, y, scale }) =>
                        `translate(-50%, -50%) translate(${x}, ${y}) scale(${scale})`
                      }
                      className="absolute left-0 top-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
                      style={{
                        color: node.color,
                        borderColor: `${node.color}66`,
                        background: `${node.color}14`,
                        boxShadow: `0 0 12px ${node.color}33`,
                      }}
                    >
                      {node.label}
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
          {/* pulse rings — hover */}
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
          {/* pulse rings — open */}
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
                {/* center dot — pulsing when unlocked */}
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
            {open ? "解锁 · 技术栈网络" : "点击解锁 · 查看技术栈"}
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