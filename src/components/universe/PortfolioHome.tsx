"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CosmosBackground } from "@/components/effects/CosmosBackground";
import type { PublicData } from "@/components/universe/UniverseHub";

type Toast = { id: number; text: string } | null;
type Panel =
  | { type: "project"; id: string }
  | { type: "honor"; id: string }
  | { type: "terminal" }
  | null;

export function PortfolioHome({ data }: { data: PublicData }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [logoHits, setLogoHits] = useState(0);
  const [hint, setHint] = useState(true);
  const name = data.profile?.name ?? "邓锦鑫";

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 7000);
    return () => clearTimeout(t);
  }, []);

  useKonami(() => {
    setPanel({ type: "terminal" });
    pushToast("Konami · 深空终端已打开");
  });

  const pushToast = (text: string) => {
    const id = Date.now();
    setToast({ id, text });
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 3000);
  };

  const honorStats = useMemo(
    () => ({
      national: data.honors.filter((h) => h.level === "国家级").length,
      provincial: data.honors.filter((h) => h.level === "省级").length,
      total: data.honors.length,
    }),
    [data.honors],
  );

  const activeProject = panel?.type === "project" ? data.projects.find((p) => p.id === panel.id) : null;
  const activeHonor = panel?.type === "honor" ? data.honors.find((h) => h.id === panel.id) : null;

  return (
    <div className="relative text-stone-100">
      {/* ── HERO: one composition, sky is the art ── */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        <CosmosBackground
          data={data}
          onHotspot={({ kind, id, label }) => {
            if (kind === "project") setPanel({ type: "project", id });
            else if (kind === "honor") setPanel({ type: "honor", id });
            else setPanel({ type: "terminal" });
            pushToast(label.length > 26 ? label.slice(0, 26) + "…" : label);
          }}
          onMeteor={() => pushToast("流星许愿 · 代码永不崩溃")}
        />

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 py-8 md:px-16 md:py-12">
          <header className="pointer-events-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const n = logoHits + 1;
                setLogoHits(n);
                if (n >= 5) {
                  setLogoHits(0);
                  setPanel({ type: "terminal" });
                  pushToast("隐藏终端已唤醒");
                }
              }}
              className="font-display text-[11px] tracking-[0.42em] text-white/80"
            >
              {name}
            </button>
            <nav className="hidden gap-8 text-[11px] tracking-[0.28em] text-white/55 md:flex">
              <a href="#about" className="hover:text-white">
                ABOUT
              </a>
              <a href="#works" className="hover:text-white">
                WORKS
              </a>
              <a href="#honors" className="hover:text-white">
                HONORS
              </a>
              <a href="#signal" className="hover:text-white">
                SIGNAL
              </a>
            </nav>
          </header>

          <div className="pointer-events-auto max-w-3xl pb-4 md:pb-8">
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[clamp(3.5rem,14vw,9rem)] font-medium leading-[0.88] tracking-[-0.03em] text-white"
            >
              {name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7 }}
              className="mt-6 max-w-md text-base leading-relaxed text-white/70 md:text-lg"
            >
              {data.profile?.subtitle || data.profile?.title || "用代码在星空里画航线"}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-10 flex flex-wrap items-center gap-8"
            >
              <a
                href="#works"
                className="font-display text-sm tracking-[0.2em] text-amber-100 underline decoration-amber-100/40 underline-offset-8 transition hover:decoration-amber-100"
              >
                浏览作品
              </a>
              <a
                href="#signal"
                className="font-display text-sm tracking-[0.2em] text-white/60 transition hover:text-white"
              >
                发送信号
              </a>
            </motion.div>
            <AnimatePresence>
              {hint && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-10 text-[11px] tracking-wide text-white/40"
                >
                  拖动星网 · 点亮星点打开档案 · 抓住偶尔划过的流星
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── ABOUT: one purpose, photo plane ── */}
      <section id="about" className="relative min-h-[85vh] overflow-hidden">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{ backgroundImage: "url(/assets/space/jwst-carina.jpg)" }}
        />
        <div className="absolute inset-0 bg-[#020617]/72" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-28 md:grid-cols-12 md:px-12">
          <div className="md:col-span-5">
            <p className="font-display text-[11px] tracking-[0.35em] text-amber-100/80">ABOUT</p>
            <h2 className="font-display mt-5 text-4xl leading-tight text-white md:text-5xl">
              在代码与
              <br />
              算法之间航行
            </h2>
          </div>
          <div className="md:col-span-7">
            <p className="text-base leading-8 text-white/75 md:text-lg">{data.profile?.bio}</p>
            <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
              {[
                ["学校", data.profile?.school],
                ["专业", data.profile?.major],
                ["GPA", data.profile?.gpa],
                ["综测", data.profile?.ranking],
                ["时段", data.profile?.studyPeriod],
                ["方向", "全栈 / 算法"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] tracking-[0.25em] text-white/40">{k}</dt>
                  <dd className="mt-1.5 text-sm text-white/90">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── WORKS ── */}
      <section id="works" className="relative bg-[#020617]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(/assets/space/galaxy-wide.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[#020617]/80" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 md:px-12">
          <p className="font-display text-[11px] tracking-[0.35em] text-amber-100/80">WORKS</p>
          <h2 className="font-display mt-4 text-4xl text-white md:text-5xl">项目</h2>
          <ul className="mt-16">
            {data.projects.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setPanel({ type: "project", id: p.id })}
                  className="group grid w-full grid-cols-1 border-t border-white/10 py-9 text-left transition md:grid-cols-12 md:gap-6 md:py-11"
                >
                  <span className="font-display text-sm text-white/35 md:col-span-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mt-2 md:col-span-7 md:mt-0">
                    <h3 className="text-xl text-white transition group-hover:text-amber-50 md:text-2xl">
                      {p.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">{p.summary}</p>
                  </div>
                  <div className="mt-4 flex flex-col gap-1 text-xs text-white/40 md:col-span-4 md:mt-0 md:items-end md:text-right">
                    <span>
                      {p.period} · {p.role}
                    </span>
                    <span className="text-white/55">{p.tags.slice(0, 3).join(" · ")}</span>
                  </div>
                </button>
              </li>
            ))}
            <li className="border-t border-white/10" />
          </ul>
        </div>
      </section>

      {/* ── HONORS: full-bleed aurora, no card clutter ── */}
      <section id="honors" className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/assets/space/aurora.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/85 via-[#020617]/75 to-[#020617]/90" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 md:px-12">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="font-display text-[11px] tracking-[0.35em] text-amber-100/80">HONORS</p>
              <h2 className="font-display mt-4 text-4xl text-white md:text-5xl">荣誉</h2>
            </div>
            <div className="flex gap-10">
              <Stat n={honorStats.national} label="国家级" />
              <Stat n={honorStats.provincial} label="省级" />
              <Stat n={honorStats.total} label="总计" />
            </div>
          </div>
          <ul className="mt-16 space-y-0">
            {data.honors.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setPanel({ type: "honor", id: h.id })}
                  className="group flex w-full flex-col gap-1 border-t border-white/10 py-5 text-left transition hover:bg-white/[0.03] sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                >
                  <span className="text-sm text-white/90 group-hover:text-amber-50 md:text-base">
                    {h.title}
                  </span>
                  <span className="shrink-0 text-[11px] tracking-wider text-white/40">
                    {h.year} · {h.level}
                  </span>
                </button>
              </li>
            ))}
            <li className="border-t border-white/10" />
          </ul>
        </div>
      </section>

      {/* ── SKILLS + PATH ── */}
      <section className="relative bg-[#020617] px-6 py-28 md:px-12">
        <div className="mx-auto grid max-w-6xl gap-20 md:grid-cols-2">
          <div>
            <p className="font-display text-[11px] tracking-[0.35em] text-amber-100/80">SKILLS</p>
            <h2 className="font-display mt-4 text-3xl text-white md:text-4xl">技能</h2>
            <div className="mt-10 space-y-8">
              {Object.entries(
                data.skills.reduce<Record<string, typeof data.skills>>((acc, s) => {
                  (acc[s.category] ||= []).push(s);
                  return acc;
                }, {}),
              ).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-[10px] tracking-[0.3em] text-white/35">{cat}</div>
                  <p className="mt-3 text-sm leading-8 text-white/80">
                    {list.map((s) => s.name).join("  ·  ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-[11px] tracking-[0.35em] text-amber-100/80">PATH</p>
            <h2 className="font-display mt-4 text-3xl text-white md:text-4xl">教育与社团</h2>
            {data.campus[0] && (
              <div className="mt-10">
                <div className="text-lg text-white">
                  {data.campus[0].org}
                  <span className="text-white/40"> · {data.campus[0].role}</span>
                </div>
                <div className="mt-1 text-xs text-white/40">{data.campus[0].period}</div>
                <p className="mt-4 text-sm leading-7 text-white/60">{data.campus[0].description}</p>
              </div>
            )}
            <ul className="mt-8 space-y-2 text-sm text-white/50">
              {data.courses.map((c) => (
                <li key={c.id} className="border-l border-amber-100/30 pl-3">
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── SIGNAL ── */}
      <section id="signal" className="relative min-h-[70vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/assets/space/nasa-pillars.jpg)" }}
        />
        <div className="absolute inset-0 bg-[#020617]/78" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 md:px-12">
          <p className="font-display text-[11px] tracking-[0.35em] text-white/55">SIGNAL</p>
          <h2 className="font-display mt-4 text-4xl text-white md:text-6xl">发送信号</h2>
          <p className="mt-4 max-w-lg text-white/60">{data.profile?.cooperation}</p>
          <ul className="mt-14 grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Email", data.profile?.email, data.profile?.email ? `mailto:${data.profile.email}` : "#"],
              ["GitHub", "djxqwq", data.profile?.github || "#"],
              ["CSDN", "博客", data.profile?.csdn || "#"],
              ["QQ", data.profile?.qq, "#"],
              ["微信", data.profile?.wechat, "#"],
              ["站点", "723539.xyz", data.profile?.blog || "#"],
            ].map(([label, value, href]) => (
              <li key={label} className="border-t border-white/15">
                <a
                  href={String(href)}
                  target={String(href).startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex flex-col gap-1 py-5 transition hover:text-amber-50"
                >
                  <span className="text-[10px] tracking-[0.3em] text-white/40">{label}</span>
                  <span className="text-sm text-white/90">{value}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-16 flex flex-wrap gap-6 text-xs text-white/30">
            <Link href="/admin/login" className="hover:text-white/60">
              Admin
            </Link>
            <span>Sky: Unsplash + Vanta.js — CREDITS.md</span>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {panel && (
          <motion.aside
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            className="fixed bottom-4 right-4 top-4 z-50 w-[min(92vw,400px)] overflow-y-auto border border-white/10 bg-[#020617]/94 p-6 backdrop-blur-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="font-display text-[11px] tracking-[0.3em] text-amber-100/70">
                {panel.type === "project" && "PROJECT"}
                {panel.type === "honor" && "HONOR"}
                {panel.type === "terminal" && "TERMINAL"}
              </span>
              <button type="button" className="text-xs text-white/45 hover:text-white" onClick={() => setPanel(null)}>
                CLOSE
              </button>
            </div>
            {activeProject && (
              <div className="space-y-4 text-sm text-white/80">
                <h3 className="text-xl text-white">{activeProject.title}</h3>
                <p className="text-xs text-white/40">
                  {activeProject.period} · {activeProject.role}
                </p>
                <p className="leading-7">{activeProject.summary}</p>
                <ul className="space-y-1 text-amber-100/75">
                  {activeProject.highlights.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
                <pre className="whitespace-pre-wrap bg-black/40 p-3 text-[11px] leading-relaxed text-white/55">
                  {activeProject.content}
                </pre>
              </div>
            )}
            {activeHonor && (
              <div className="space-y-3">
                <h3 className="text-xl text-white">{activeHonor.title}</h3>
                <p className="text-sm text-amber-100/70">
                  {activeHonor.year} · {activeHonor.level} · {activeHonor.category}
                </p>
                <p className="text-sm text-white/60">{activeHonor.description}</p>
              </div>
            )}
            {panel.type === "terminal" && (
              <div className="font-mono text-xs leading-6 text-emerald-300/90">
                <p>&gt; cosmos link established</p>
                <p>&gt; sky rendered via Vanta.NET</p>
                <p>&gt; click constellation nodes</p>
                <p>&gt; catch meteors when they pass</p>
                <p className="mt-4 text-white/35">no game mode · exploration only</p>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-7 left-1/2 z-[60] -translate-x-1/2 border border-white/15 bg-black/75 px-5 py-2.5 text-xs tracking-wide text-white/90 backdrop-blur-md"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-3xl text-amber-50 md:text-4xl">{n}</div>
      <div className="text-[10px] tracking-[0.25em] text-white/40">{label}</div>
    </div>
  );
}

function useKonami(onUnlock: () => void) {
  const seq = useMemo(
    () => [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ],
    [],
  );
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expect = seq[i];
      const norm = expect.length === 1 ? expect.toLowerCase() : expect;
      if (key === norm) {
        i += 1;
        if (i >= seq.length) {
          i = 0;
          onUnlock();
        }
      } else {
        i = key === seq[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onUnlock, seq]);
}
