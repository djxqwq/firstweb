"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { slideInFromTop } from "@/lib/motion";

/**
 * Lock → tech-orbit.svg + interactive cyber neural net.
 * Unlock: hide flashy video; show orbit + neural backdrop.
 */

type Spark = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

declare global {
  interface Window {
    createCyberNetwork?: (
      canvas: HTMLCanvasElement,
      options?: { host?: HTMLElement }
    ) => {
      start: () => void;
      stop: () => void;
      destroy: () => void;
    };
  }
}

function useSparks() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const idRef = useRef(0);
  const rafRef = useRef(0);

  const run = useCallback((initial: Spark[]) => {
    setSparks(initial);
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      setSparks((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.96,
            vy: p.vy * 0.96 + 0.03,
            life: p.life - 0.024,
          }))
          .filter((p) => p.life > 0);
        if (next.length) rafRef.current = requestAnimationFrame(tick);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const burst = useCallback(
    (n = 28) => {
      const arr: Spark[] = [];
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.2;
        const sp = 2.2 + Math.random() * 4;
        arr.push({
          id: ++idRef.current,
          x: 0,
          y: 0,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 0.4,
          life: 1,
          color: i % 2 ? "#22d3ee" : "#c084fc",
        });
      }
      run(arr);
    },
    [run]
  );

  return { sparks, burst };
}

function SparkLayer({ sparks }: { sparks: Spark[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-40">
      {sparks.map((p) => (
        <span
          key={p.id}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.life,
            background: p.color,
            boxShadow: `0 0 10px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

function TechOrbitVault({
  onLock,
  sparks,
}: {
  onLock: () => void;
  sparks: Spark[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.78 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 170, damping: 20 }}
      className="relative mx-auto w-[min(94vw,640px)]"
    >
      <SparkLayer sparks={sparks} />

      <img
        src="/effects/tech-orbit.svg"
        alt="技术栈轨道"
        className="pointer-events-none relative z-10 block h-auto w-full select-none drop-shadow-[0_0_48px_rgba(34,211,238,0.2)]"
        draggable={false}
      />

      <div className="absolute inset-0 z-30 flex items-center justify-center">
        <button
          type="button"
          onClick={onLock}
          className="flex h-[80px] w-[80px] cursor-pointer flex-col items-center justify-center rounded-full border border-cyan-300/50 bg-[#030014]/88 outline-none backdrop-blur-md transition hover:border-cyan-200/80 hover:shadow-[0_0_28px_rgba(34,211,238,0.5)]"
          aria-label="锁定"
        >
          <Image
            src="/lock-main.png"
            alt=""
            width={30}
            height={30}
            draggable={false}
          />
          <span className="mt-0.5 text-[8px] tracking-[0.18em] text-cyan-200/80">
            LOCK
          </span>
        </button>
      </div>
    </motion.div>
  );
}

/** Full-section interactive neural net — starts with unlock */
function CyberNetLayer({
  active,
  hostRef,
}: {
  active: boolean;
  hostRef: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const netRef = useRef<{
    start: () => void;
    stop: () => void;
    destroy: () => void;
  } | null>(null);

  useEffect(() => {
    if (!active) {
      netRef.current?.stop();
      return;
    }
    let cancelled = false;
    const boot = async () => {
      if (!window.createCyberNetwork) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "/effects/cyber-network.js?v=4";
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.body.appendChild(s);
        }).catch(() => null);
      }
      const host = hostRef.current;
      if (cancelled || !canvasRef.current || !host) return;
      if (!window.createCyberNetwork) return;
      netRef.current?.destroy();
      netRef.current = window.createCyberNetwork(canvasRef.current, { host });
      netRef.current.start();
    };
    void boot();
    return () => {
      cancelled = true;
      netRef.current?.destroy();
      netRef.current = null;
    };
  }, [active, hostRef]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

function Padlock({
  busy,
  onClick,
  sparks,
}: {
  busy: boolean;
  onClick: () => void;
  sparks: Spark[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 160, damping: 16, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 160, damping: 16, mass: 0.4 });

  return (
    <motion.div
      ref={wrapRef}
      onMouseMove={(e) => {
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        mx.set(Math.max(-1, Math.min(1, dx)) * 10);
        my.set(Math.max(-1, Math.min(1, dy)) * 8);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.28 }}
      className="relative flex flex-col items-center justify-center"
    >
      <SparkLayer sparks={sparks} />
      <motion.div style={{ x: sx, y: sy }} className="flex flex-col items-center">
        <button
          type="button"
          onClick={onClick}
          className="relative flex h-[150px] w-[120px] cursor-pointer flex-col items-center justify-center select-none"
          aria-label="点击解锁技术栈轨道"
        >
          <motion.div
            animate={{
              y: 14,
              rotate: busy ? [0, -8, 8, -4, 0] : 0,
              filter: busy
                ? "drop-shadow(0 0 18px rgba(34,211,238,0.85))"
                : undefined,
            }}
            transition={
              busy
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 260, damping: 14 }
            }
          >
            <Image
              src="/lock-top.png"
              alt=""
              width={50}
              height={50}
              priority
              draggable={false}
            />
          </motion.div>
          <Image
            src="/lock-main.png"
            alt="Lock"
            width={70}
            height={70}
            priority
            draggable={false}
          />
        </button>
      </motion.div>
    </motion.div>
  );
}

export const Encryption = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { sparks, burst } = useSparks();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (open) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [open]);

  const unlock = () => {
    if (busyRef.current || open) return;
    busyRef.current = true;
    setBusy(true);
    burst(36);
    window.setTimeout(() => {
      setOpen(true);
      setBusy(false);
      busyRef.current = false;
    }, 280);
  };

  const lock = () => {
    if (busyRef.current || !open) return;
    busyRef.current = true;
    burst(14);
    setOpen(false);
    window.setTimeout(() => {
      busyRef.current = false;
    }, 200);
  };

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100vh] w-full items-center justify-center overflow-hidden py-20 md:min-h-[110vh]"
    >
      {/* flashy video — fade OUT when unlocked */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: 0.45 }}
      >
        <video
          ref={videoRef}
          data-lazy-video
          loop
          muted
          playsInline
          autoPlay
          preload="auto"
          className="h-full w-full object-cover opacity-75"
        >
          <source src="/videos/encryption-bg.webm" type="video/webm" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background: busy
              ? "radial-gradient(circle at 50% 48%, rgba(168,85,247,0.28), transparent 55%)"
              : "radial-gradient(circle at 50% 48%, rgba(112,66,248,0.14), transparent 55%)",
          }}
        />
      </motion.div>

      {/* calm dark plate when orbit open */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.45 }}
        style={{
          background:
            "radial-gradient(circle at 50% 45%, #0b1224 0%, #030014 70%)",
        }}
      />

      {/* interactive neural net — appears with unlock */}
      <CyberNetLayer active={open} hostRef={sectionRef} />

      {/* title */}
      <div className="pointer-events-none absolute left-0 right-0 top-8 z-[5] text-center md:top-12">
        <motion.div
          variants={slideInFromTop}
          className="text-[32px] font-medium text-gray-200 md:text-[40px]"
        >
          性能{" "}
          <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
            &
          </span>{" "}
          安全
        </motion.div>
      </div>

      {/* dead-center stage */}
      <div className="relative z-20 flex w-full flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {!open ? (
            <Padlock key="lock" busy={busy} onClick={unlock} sparks={sparks} />
          ) : (
            <TechOrbitVault key="orbit" onLock={lock} sparks={sparks} />
          )}
        </AnimatePresence>

        <motion.div
          className="Welcome-box mt-8 border border-[#7042F88B] px-[15px] py-[4px] opacity-[0.9]"
          animate={{
            boxShadow: open
              ? "0 0 22px rgba(34,211,238,0.35)"
              : busy
                ? "0 0 16px rgba(168,85,247,0.35)"
                : "0 0 10px rgba(112,66,248,0.12)",
          }}
        >
          <h1 className="Welcome-text text-[12px]">
            {open
              ? "移动鼠标扰动神经网络 · 点中心锁收回"
              : busy
                ? "解锁中…"
                : "点击锁 · 展开技术栈轨道"}
          </h1>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-8 left-0 right-0 z-20 px-4">
        <p className="cursive text-center text-[18px] font-medium text-gray-300 md:text-[20px]">
          用扎实算法与工程能力，打造可靠系统。
        </p>
      </div>
    </section>
  );
};
