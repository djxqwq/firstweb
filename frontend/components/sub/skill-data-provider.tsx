"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { useInView } from "react-intersection-observer";

type Props = {
  src: string;
  name: string;
  width: number;
  height: number;
  index: number;
};

const FALLBACK: Record<string, { bg: string; label: string }> = {
  "cpp.svg": { bg: "#00599C", label: "C++" },
  "python.svg": { bg: "#3776AB", label: "Py" },
  "java.svg": { bg: "#ED8B00", label: "Java" },
  "algo.svg": { bg: "#7c3aed", label: "Algo" },
  "vue.svg": { bg: "#42b883", label: "Vue" },
  "uniapp.svg": { bg: "#2b9939", label: "Uni" },
  "spring.svg": { bg: "#6db33f", label: "Boot" },
  "fastapi.svg": { bg: "#009688", label: "API" },
  "tidb.svg": { bg: "#e31c3d", label: "TiDB" },
  "opencv.svg": { bg: "#5c3ee8", label: "CV" },
};

/** Skill tile — hover animation: scale + glow + 3D tilt */
export const SkillDataProvider = ({
  src,
  name,
  width,
  height,
  index,
}: Props) => {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "40px" });
  const [hover, setHover] = useState(false);
  const [broken, setBroken] = useState(false);
  const size = Math.min(Math.max(width, height), 64);
  const tile = size + 28;
  const fb = FALLBACK[src];

  // 3D 倾斜效果 - 更平滑
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 15 });
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;
    // 更轻微的倾斜
    rotateX.set(-percentY * 8);
    rotateY.set(percentX * 8);
  };

  const handleMouseLeave = () => {
    setHover(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.03, 0.35), duration: 0.35 }}
      onMouseEnter={() => setHover(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col items-center"
    >
      <motion.div
        animate={{
          scale: hover ? 1.1 : 1,
          y: hover ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative flex items-center justify-center rounded-xl border"
        style={{
          width: tile,
          height: tile,
          borderColor: hover ? "rgba(34,211,238,0.5)" : "rgba(112,66,248,0.25)",
          background: hover ? "rgba(34,211,238,0.08)" : "rgba(3,0,20,0.45)",
          boxShadow: hover ? "0 0 20px rgba(34,211,238,0.25), inset 0 0 12px rgba(34,211,238,0.1)" : "none",
          perspective: 800,
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* 悬停光环 - 更柔和 */}
        {hover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-xl"
            style={{
              background: "radial-gradient(circle, rgba(34,211,238,0.15), transparent 70%)",
            }}
          />
        )}
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {broken || !src ? (
            <span
              className="flex h-full w-full items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: fb?.bg ?? "#7c3aed" }}
            >
              {fb?.label ?? name.slice(0, 3)}
            </span>
          ) : (
            <Image
              src={`/skills/${src}`}
              width={size}
              height={size}
              alt={name}
              unoptimized={src.endsWith(".svg")}
              className="object-contain"
              style={{ width: size, height: "auto", maxHeight: size }}
              draggable={false}
              onError={() => setBroken(true)}
            />
          )}
        </div>
      </motion.div>
      <motion.span
        animate={{ color: hover ? "#a5f3fc" : "#9ca3af" }}
        className="mt-2 max-w-full truncate px-1 text-center text-[10px] tracking-wide"
      >
        {name}
      </motion.span>
    </motion.div>
  );
};
