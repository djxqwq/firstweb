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
  short: string;
  color: string;
  angle: number; // degrees
  desc: string;
}

/* ---------- 技术栈放射节点（12 个等距环绕 + 中心核心） ---------- */
const NODE_RADIUS = 168;

const MESH_NODES: MeshNode[] = [
  { id: "cpp",     label: "C/C++",       short: "C++",  color: "#22d3ee", angle: -90, desc: "系统级开发与算法竞赛主力语言" },
  { id: "python",  label: "Python",      short: "Py",   color: "#fbbf24", angle: -60, desc: "AI / 后端 / 自动化的万能胶水" },
  { id: "java",    label: "Java",        short: "Java", color: "#f472b6", angle: -30, desc: "工程化后端与 Spring 生态" },
  { id: "spring",  label: "Spring Boot", short: "SB",   color: "#fb923c", angle: 0,   desc: "企业级 Java 后端框架" },
  { id: "fastapi", label: "FastAPI",     short: "FA",   color: "#22d3ee", angle: 30,  desc: "高性能 Python 异步后端" },
  { id: "mysql",   label: "MySQL",       short: "SQL",  color: "#fbbf24", angle: 60,  desc: "关系型数据库基石" },
  { id: "tidb",    label: "TiDB",        short: "TiDB", color: "#a855f7", angle: 90,  desc: "分布式 MySQL 兼容数据库" },
  { id: "docker",  label: "Docker",      short: "Dk",   color: "#38bdf8", angle: 120, desc: "容器化部署与交付" },
  { id: "nginx",   label: "Nginx",       short: "Ng",   color: "#34d399", angle: 150, desc: "反向代理与静态资源服务" },
  { id: "react",   label: "React/Next",  short: "Rx",   color: "#22d3ee", angle: 180, desc: "现代化前端与 SSR 框架" },
  { id: "vue",     label: "Vue/Uniapp",  short: "Vue",  color: "#34d399", angle: 210, desc: "渐进式前端与跨端小程序" },
  { id: "opencv",  label: "OpenCV/YOLO", short: "CV",   color: "#a855f7", angle: 240, desc: "计算机视觉与目标检测" },
];

/* 节点坐标 */
function nodePos(node: MeshNode) {
  const rad = (node.angle * Math.PI) / 180;
  return { x: Math.cos(rad) * NODE_RADIUS, y: Math.sin(rad) * NODE_RADIUS };
}

/* 环线：相邻节点连接 */
function buildRingSegments() {
  const segs: { from: MeshNode; to: MeshNode }[] = [];
  for (let i = 0; i < MESH_NODES.length; i++) {
    segs.push({
      from: MESH_NODES[i],
      to: MESH_NODES[(i + 1) % MESH_NODES.length],
    });
  }
  return segs;
}

/* ---------- component ---------- */
export const Encryption = () => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sparkId = useRef(0);
  const sparkRaf = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const ringSegments = useMemo(buildRingSegments, []);

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
                {/* ---- SVG 连线层（放射线 + 环线） ---- */}
                <svg
                  viewBox="-210 -210 420 420"
                  className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
                  style={{ overflow: "visible" }}
                >
                  {/* 放射线：中心 → 每个节点 */}
                  {MESH_NODES.map((node, i) => {
                    const { x, y } = nodePos(node);
                    const active = !hoveredId || hoveredId === node.id;
                    return (
                      <motion.line
                        key={`ray-${node.id}`}
                        x1={0}
                        y1={0}
                        x2={x}
                        y2={y}
                        stroke={node.color}
                        strokeWidth={active ? 1.6 : 1}
                        strokeOpacity={active ? 0.7 : 0.12}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.2 + i * 0.03, duration: 0.5 }}
                        style={{
                          filter: active
                            ? `drop-shadow(0 0 4px ${node.color}99)`
                            : "none",
                        }}
                      />
                    );
                  })}
                  {/* 环线：相邻节点连接 */}
                  {ringSegments.map((seg, i) => {
                    const a = nodePos(seg.from);
                    const b = nodePos(seg.to);
                    const active =
                      !hoveredId ||
                      hoveredId === seg.from.id ||
                      hoveredId === seg.to.id;
                    return (
                      <motion.line
                        key={`ring-${seg.from.id}-${seg.to.id}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={seg.from.color}
                        strokeWidth={active ? 1.3 : 0.8}
                        strokeOpacity={active ? 0.5 : 0.08}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.4 + i * 0.03, duration: 0.5 }}
                      />
                    );
                  })}
                </svg>

                {/* ---- 中心核心节点 ---- */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 18,
                    delay: 0.15,
                  }}
                  className="absolute left-0 top-0 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-purple-600/30 to-cyan-500/30 text-center backdrop-blur-sm"
                  style={{ boxShadow: "0 0 24px rgba(34,211,238,0.4)" }}
                >
                  <span className="text-[11px] font-bold text-white">全栈</span>
                  <span className="text-[8px] tracking-wider text-cyan-200/80">
                    CORE
                  </span>
                </motion.div>

                {/* ---- 外圈节点层（可交互） ---- */}
                {MESH_NODES.map((node, i) => {
                  const { x, y } = nodePos(node);
                  const active = !hoveredId || hoveredId === node.id;
                  return (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: active ? 1 : 0.28, scale: 1, x, y }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 180,
                        damping: 16,
                        delay: 0.3 + i * 0.04,
                        opacity: { duration: 0.2 },
                      }}
                      transformTemplate={({ x, y, scale }) =>
                        `translate(-50%, -50%) translate(${x}, ${y}) scale(${scale})`
                      }
                      onPointerEnter={() => setHoveredId(node.id)}
                      onPointerLeave={() => setHoveredId(null)}
                      className="pointer-events-auto absolute left-0 top-0 z-20 flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-full border text-center backdrop-blur-sm"
                      style={{
                        color: node.color,
                        borderColor: active
                          ? `${node.color}aa`
                          : `${node.color}40`,
                        background: `${node.color}1f`,
                        boxShadow: active ? `0 0 16px ${node.color}66` : "none",
                      }}
                    >
                      <span className="text-[11px] font-bold leading-tight">
                        {node.short}
                      </span>
                      {/* tooltip */}
                      <div
                        className={`pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-center transition-opacity duration-200 ${
                          hoveredId === node.id ? "opacity-100" : "opacity-0"
                        }`}
                        style={{
                          borderColor: `${node.color}55`,
                          background: "rgba(10,6,24,0.95)",
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold"
                          style={{ color: node.color }}
                        >
                          {node.label}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {node.desc}
                        </div>
                      </div>
                    </motion.div>
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