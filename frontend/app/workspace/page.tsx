"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  clearToken,
  getToken,
  loginRequest,
} from "@/lib/workspace-auth";

const CARDS = [
  {
    href: "/admin",
    title: "站点后台",
    desc: "项目、访客、留言、设置 —— 管公开网站",
    tag: "Site",
    accent: "from-violet-500/25 to-cyan-500/10",
    ring: "hover:ring-violet-400/40",
  },
  {
    href: "/tools",
    title: "我的工具",
    desc: "秋招投递、笔试面试进度 —— 只给你自己用",
    tag: "Tools",
    accent: "from-cyan-500/25 to-emerald-500/10",
    ring: "hover:ring-cyan-400/40",
  },
] as const;

export default function WorkspacePage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "";
  const [token, setTok] = useState("");
  const [user, setUser] = useState("1075751918");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = getToken();
    setTok(t);
    if (t && next.startsWith("/") && !next.startsWith("//")) {
      router.replace(next);
    }
  }, [next, router]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const t = await loginRequest(user, pass);
      setTok(t);
      if (next.startsWith("/") && !next.startsWith("//")) {
        router.replace(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setTok("");
  };

  if (!token) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={login}
          className="admin-card w-full max-w-md space-y-5 p-8 shadow-[0_0_60px_rgba(34,211,238,0.12)]"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={52}
              height={52}
              className="rounded-full ring-1 ring-white/15"
            />
            <div>
              <h1 className="text-2xl font-semibold text-white">工作台</h1>
              <p className="text-sm text-gray-400">
                一次登录 · 站点后台 / 我的工具
              </p>
            </div>
          </div>
          <label className="block">
            <span className="admin-field-label">用户名</span>
            <input
              className="admin-input"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="admin-field-label">密码</span>
            <div className="relative">
              <input
                className="admin-input pr-16"
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] text-gray-400 hover:text-cyan-200"
              >
                {showPass ? "隐藏" : "显示"}
              </button>
            </div>
          </label>
          {error && <p className="text-sm text-amber-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="admin-btn admin-btn-primary w-full py-3 text-sm font-medium"
          >
            {loading ? "登录中…" : "进入工作台"}
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-cyan-300/90 hover:text-cyan-200"
          >
            ← 返回站点
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={44}
              height={44}
              className="rounded-full ring-1 ring-white/10"
            />
            <div>
              <h1 className="text-xl font-semibold text-white md:text-2xl">
                工作台
              </h1>
              <p className="text-xs text-gray-500">
                选一个入口 · 登录状态两边通用
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="admin-btn admin-btn-ghost text-xs">
              查看站点
            </Link>
            <button
              type="button"
              onClick={logout}
              className="admin-btn admin-btn-danger text-xs"
            >
              退出
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${c.accent} p-6 ring-1 ring-transparent transition ${c.ring}`}
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-gray-500">
                {c.tag}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-white group-hover:text-cyan-100">
                {c.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {c.desc}
              </p>
              <span className="mt-6 inline-block text-xs text-cyan-300/80">
                进入 →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
