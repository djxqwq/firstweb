"use client";

import { SparklesIcon } from "@heroicons/react/24/solid";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { TypeWriter } from "@/components/sub/type-writer";
import { MagneticButton } from "@/components/sub/magnetic-button";
import { fetchProfile } from "@/lib/api";
import {
  slideInFromLeft,
  slideInFromRight,
  slideInFromTop,
} from "@/lib/motion";

const DEFAULT_ROLES = [
  "全栈开发者 · Full-Stack Engineer",
  "算法竞赛选手 · Competitive Programmer",
  "AI / 物联网实践者 · Builder",
];

const DEFAULT_BIO =
  "浙江财经大学软件工程专业学生，专注于全栈开发和人工智能领域。热爱算法竞赛，擅长 C/C++、Python、Java 开发，致力于构建优雅、高效的解决方案。";

/** Subtle parallax + light 3D tilt — listens on Hero section. */
function HeroOrb() {
  const ref = useRef<HTMLDivElement>(null);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const spring = { stiffness: 45, damping: 26, mass: 0.7 };
  const x = useSpring(tx, spring);
  const y = useSpring(ty, spring);
  const rotateX = useSpring(rx, spring);
  const rotateY = useSpring(ry, spring);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const section = el.closest("section");
    if (!section) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2)));
      tx.set(nx * 6);
      ty.set(ny * 4);
      ry.set(nx * 5);
      rx.set(-ny * 4);
    };

    const onLeave = () => {
      tx.set(0);
      ty.set(0);
      rx.set(0);
      ry.set(0);
    };

    section.addEventListener("mousemove", onMove);
    section.addEventListener("mouseleave", onLeave);
    return () => {
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
    };
  }, [tx, ty, rx, ry]);

  return (
    <motion.div
      ref={ref}
      variants={slideInFromRight(0.8)}
      className="relative z-10 hidden h-full w-full items-center justify-center md:flex"
      style={{
        x,
        y,
        rotateX,
        rotateY,
        transformPerspective: 1100,
      }}
    >
      <Image
        src="/hero-bg.svg"
        alt=""
        height={650}
        width={650}
        draggable={false}
        className="select-none drop-shadow-[0_0_40px_rgba(112,66,248,0.35)]"
      />
    </motion.div>
  );
}

export const HeroContent = () => {
  const [name, setName] = useState("邓锦鑫");
  const [tagline, setTagline] = useState("邓锦鑫 · 个人技术博客");
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [github, setGithub] = useState("https://github.com/djxqwq");

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      if (p.name) setName(p.name);
      if (p.tagline) setTagline(p.tagline);
      if (p.bio) setBio(p.bio);
      if (p.github) setGithub(p.github);
      const r = p.roles;
      if (Array.isArray(r) && r.length) setRoles(r.map(String));
      else if (typeof r === "string" && r.trim()) {
        setRoles(
          r
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter(Boolean)
        );
      } else if (p.role) {
        setRoles([p.role]);
      }
    });
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="pointer-events-none relative z-[20] mt-32 flex w-full flex-row items-center justify-center px-6 md:mt-40 md:px-20"
    >
      <div className="m-auto flex h-full w-full flex-col justify-center gap-5 text-start">
        <motion.div
          variants={slideInFromTop}
          className="Welcome-box border border-[#7042f88b] px-[7px] py-[8px] opacity-[0.9]"
        >
          <SparklesIcon className="mr-[10px] h-5 w-5 text-[#b49bff]" />
          <h1 className="Welcome-text font-mono text-[13px]">{tagline}</h1>
        </motion.div>

        <motion.div
          variants={slideInFromLeft(0.5)}
          className="mt-6 flex h-auto w-auto max-w-[600px] flex-col gap-6 text-4xl font-bold text-white md:text-6xl"
        >
          <span>
            Hello, I&apos;m{" "}
            <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
              {name}
            </span>
          </span>
        </motion.div>

        {/* 终端样式：后台同步的 role / bio */}
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
              profile.ts — {name || "deng-jinxin"}
            </span>
          </div>

          <div className="space-y-2 px-4 py-4 font-mono text-[13px] leading-6 md:text-sm">
            <p className="text-gray-500">
              <span className="text-purple-400">const</span>{" "}
              <span className="text-cyan-300">role</span>{" "}
              <span className="text-white/50">=</span>{" "}
              <span className="text-amber-200/90">&quot;</span>
              <TypeWriter
                lines={roles.length ? roles : DEFAULT_ROLES}
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
                lines={[bio || DEFAULT_BIO]}
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
          className="pointer-events-auto flex flex-wrap gap-3"
        >
          <MagneticButton href="#projects" variant="primary">
            项目
          </MagneticButton>
          <MagneticButton
            href={github || "https://github.com/djxqwq"}
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
