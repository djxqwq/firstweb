"use client";

import { SparklesIcon } from "@heroicons/react/24/solid";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
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
      className="relative z-10 hidden h-full w-full items-center justify-center md:flex"
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
      const r = (p as { roles?: string[] | string }).roles;
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
      className="relative z-10 mt-28 flex w-full flex-row items-center justify-center px-6 pb-16 md:mt-36 md:px-20"
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

        <motion.div
          variants={slideInFromLeft(0.7)}
          className="relative my-2 max-w-[600px] space-y-3 rounded-xl border border-[#7042f861] bg-[#0a0618]/75 px-5 py-4 shadow-[0_0_40px_rgba(112,66,248,0.18)] backdrop-blur-sm"
          whileHover={{
            boxShadow: "0 0 48px rgba(34,211,238,0.22)",
            borderColor: "rgba(34,211,238,0.35)",
          }}
        >
          <p className="min-h-[1.5rem] text-sm text-cyan-200/90 md:text-base">
            <TypeWriter
              lines={roles.length ? roles : DEFAULT_ROLES}
              speed={38}
              holdMs={1800}
              className="text-cyan-200"
            />
          </p>
          <p className="text-sm leading-7 text-gray-300 md:text-[15px]">
            {bio}
          </p>
        </motion.div>

        <motion.div
          variants={slideInFromLeft(1)}
          className="flex flex-wrap gap-3"
        >
          <MagneticButton href="#projects" variant="primary">
            项目
          </MagneticButton>
          <MagneticButton href={github || "https://github.com/djxqwq"} variant="cyan" external>
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
