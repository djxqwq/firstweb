"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
} from "react-icons/hi2";

import { clearToken, getToken } from "@/lib/workspace-auth";

const TOOLS = [
  {
    href: "/tools/qiuzhao",
    title: "秋招投递",
    desc: "投递记录 · 笔试/面试链接 · 拖拽看板 · 临近日程",
    badge: "LIVE",
    mono: "QIUZHAO",
    icon: HiOutlineBriefcase,
  },
] as const;

export default function ToolsHomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/workspace?next=/tools");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="tools-shell flex min-h-screen items-center justify-center text-sm text-gray-500">
        校验登录…
      </div>
    );
  }

  return (
    <div className="tools-shell relative overflow-hidden px-4 py-10 md:px-8">
      <div className="tools-orb -left-20 top-10 h-56 w-56 bg-cyan-400/30" />
      <div className="tools-orb -right-16 top-40 h-64 w-64 bg-emerald-400/20" />

      <div className="relative mx-auto max-w-4xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="tools-mono flex items-center gap-2 text-[11px] tracking-[0.28em] text-cyan-400/80">
              <HiOutlineSparkles className="h-3.5 w-3.5" />
              PRIVATE TOOLS
            </p>
            <h1 className="tools-hero-title mt-2 text-3xl md:text-4xl">
              我的工具
            </h1>
            <p className="mt-2 max-w-md text-sm text-[var(--tools-muted)]">
              与站点内容后台隔离 · 字体来自 Google Fonts · 动效 Framer Motion
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/workspace" className="admin-btn admin-btn-ghost text-xs">
              工作台
            </Link>
            <Link href="/admin" className="admin-btn admin-btn-ghost text-xs">
              <HiOutlineSquares2X2 className="mr-1 inline h-3.5 w-3.5" />
              站点后台
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn-danger text-xs"
              onClick={() => {
                clearToken();
                router.replace("/workspace");
              }}
            >
              退出
            </button>
          </div>
        </motion.header>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.4 }}
              >
                <Link
                  href={t.href}
                  className="tools-card group relative block overflow-hidden p-6 transition hover:border-cyan-400/35"
                >
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/20" />
                  <div className="relative flex items-start justify-between gap-2">
                    <span className="tools-mono text-[10px] tracking-[0.22em] text-gray-500">
                      {t.mono}
                    </span>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 ring-1 ring-emerald-400/25">
                      {t.badge}
                    </span>
                  </div>
                  <div className="relative mt-5 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="relative mt-4 text-xl font-semibold tracking-tight text-white group-hover:text-cyan-100">
                    {t.title}
                  </h2>
                  <p className="relative mt-2 text-sm leading-relaxed text-[var(--tools-muted)]">
                    {t.desc}
                  </p>
                  <span className="relative mt-6 inline-flex items-center gap-1 text-xs text-cyan-300/90">
                    打开
                    <HiOutlineArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            );
          })}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="tools-card border-dashed p-6 opacity-70"
          >
            <span className="tools-mono text-[10px] tracking-[0.22em] text-gray-600">
              SOON
            </span>
            <h2 className="mt-5 text-xl font-semibold text-gray-300">
              更多工具位
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              以后新工具挂在这里，不影响站点后台
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
