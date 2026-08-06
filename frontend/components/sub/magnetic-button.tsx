"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "cyan" | "purple";
  className?: string;
  external?: boolean;
};

export function MagneticButton({
  href,
  children,
  variant = "primary",
  className = "",
  external,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const transform = useMotionTemplate`translate(${x}px, ${y}px)`;

  const base =
    variant === "primary"
      ? "button-primary text-white border border-transparent"
      : variant === "cyan"
        ? "border border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/10"
        : "border border-purple-400/40 text-purple-200 hover:bg-purple-400/10";

  return (
    <motion.a
      ref={ref}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      style={{ transform }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        x.set(dx * 0.22);
        y.set(dy * 0.22);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.96 }}
      className={`inline-flex min-w-[140px] items-center justify-center rounded-lg px-6 py-2 text-center transition ${base} ${className}`}
    >
      {children}
    </motion.a>
  );
}
