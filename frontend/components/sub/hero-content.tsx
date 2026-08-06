"use client";

import { SparklesIcon } from "@heroicons/react/24/solid";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { TypeWriter } from "@/components/sub/type-writer";
import { MagneticButton } from "@/components/sub/magnetic-button";
import {
  slideInFromLeft,
  slideInFromRight,
  slideInFromTop,
} from "@/lib/motion";

const ROLE_LINES = [
  "全栈开发者 · Full-Stack Engineer",
  "算法竞赛选手 · Competitive Programmer",
  "AI / 物联网实践者 · Builder",
];

const BIO =
  "浙江财经大学软件工程专业学生，专注于全栈开发和人工智能领域。热爱算法竞赛，擅长 C/C++、Python、Java 开发，致力于构建优雅、高效的解决方案。";

function HeroOrb() {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rot = useMotionValue(0);
  const transform = useMotionTemplate`translate(${x}px, ${y}px) rotate(${rot}deg)`;

  return (
    <motion.div
      ref={ref}
      variants={slideInFromRight(0.8)}
      className="hidden h-full w-full items-center justify-center md:flex"
      style={{ transform }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        x.set(dx * 0.04);
        y.set(dy * 0.04);
        rot.set(dx * 0.01);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
        rot.set(0);
      }}
      whileTap={{ scale: 0.97 }}
    >
      <Image
        src="/hero-bg.svg"
        alt=""
        height={650}
        width={650}
        draggable={false}
        className="select-none drop-shadow-[0_0_40px_rgba(112,66,248,0.35)] transition duration-500 hover:drop-shadow-[0_0_55px_rgba(34,211,238,0.45)]"
      />
    </motion.div>
  );
}

export const HeroContent = () => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="z-[20] mt-32 flex w-full flex-row items-center justify-center px-6 md:mt-40 md:px-20"
    >
      <div className="m-auto flex h-full w-full flex-col justify-center gap-5 text-start">
        <motion.div
          variants={slideInFromTop}
          className="Welcome-box border border-[#7042f88b] px-[7px] py-[8px] opacity-[0.9]"
        >
          <SparklesIcon className="mr-[10px] h-5 w-5 text-[#b49bff]" />
          <h1 className="Welcome-text font-mono text-[13px]">
            <span className="text-[#9cb2ff]/80">~/portfolio</span>
            <span className="mx-1 text-white/40">$</span>
            <TypeWriter
              lines={["whoami"]}
              loop={false}
              speed={80}
              holdMs={999999}
              className="text-[#e59cff]"
            />
          </h1>
        </motion.div>

        <motion.div
          variants={slideInFromLeft(0.5)}
          className="mt-6 flex h-auto w-auto max-w-[600px] flex-col gap-6 text-4xl font-bold text-white md:text-6xl"
        >
          <span>
            Hello, I&apos;m{" "}
            <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
              邓锦鑫
            </span>
          </span>
        </motion.div>

        <motion.div
          variants={slideInFromLeft(0.7)}
          className="relative my-2 max-w-[600px] overflow-hidden rounded-xl border border-[#7042f861] bg-[#0a0618]/85 shadow-[0_0_40px_rgba(112,66,248,0.18)] backdrop-blur-sm"
          whileHover={{
            boxShadow: "0 0 48px rgba(34,211,238,0.22)",
            borderColor: "rgba(34,211,238,0.35)",
          }}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
            <span className="ml-2 font-mono text-[11px] tracking-wider text-gray-500">
              intro.ts — deng-jinxin
            </span>
          </div>

          <div className="space-y-2 px-4 py-4 font-mono text-[13px] leading-6 md:text-sm">
            <p className="text-gray-500">
              <span className="text-purple-400">const</span>{" "}
              <span className="text-cyan-300">role</span>{" "}
              <span className="text-white/50">=</span>{" "}
              <span className="text-amber-200/90">&quot;</span>
              <TypeWriter
                lines={ROLE_LINES}
                speed={38}
                holdMs={1800}
                className="text-amber-200"
              />
              <span className="text-amber-200/90">&quot;</span>
              <span className="text-white/50">;</span>
            </p>

            <p className="text-gray-400">
              <span className="text-purple-400">const</span>{" "}
              <span className="text-cyan-300">bio</span>{" "}
              <span className="text-white/50">=</span>{" "}
              <span className="text-emerald-300/90">&quot;</span>
              <TypeWriter
                lines={[BIO]}
                loop={false}
                speed={28}
                holdMs={999999}
                className="text-emerald-300/90"
              />
              <span className="text-emerald-300/90">&quot;</span>
              <span className="text-white/50">;</span>
            </p>

            <p className="pt-1 text-gray-500">
              <span className="text-purple-400">export default</span>{" "}
              <span className="text-cyan-300">&#123; role, bio &#125;</span>
              <span className="text-white/50">;</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={slideInFromLeft(1)}
          className="flex flex-wrap gap-3"
        >
          <MagneticButton href="#projects" variant="primary">
            项目
          </MagneticButton>
          <MagneticButton
            href="https://github.com/djxqwq"
            variant="cyan"
            external
          >
            GitHub
          </MagneticButton>
          <MagneticButton href="#contact" variant="purple">
            联系
          </MagneticButton>
        </motion.div>
      </div>

      <HeroOrb />
    </motion.div>
  );
};
