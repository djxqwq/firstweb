/**
 * Project cards — glassmorphism + tilt.
 * Tilt via react-parallax-tilt (vanilla-tilt family).
 * Layout inspired by open portfolio templates.
 */
import { useState } from 'react'
import Tilt from 'react-parallax-tilt'
import { motion, AnimatePresence } from 'framer-motion'
import { projects } from '../../data/content'

const coverGradient: Record<string, string> = {
  nebula: 'from-cyan-500/30 via-slate-900 to-emerald-500/20',
  orbit: 'from-sky-500/25 via-slate-950 to-cyan-700/20',
  flare: 'from-amber-400/25 via-slate-950 to-rose-500/15',
  grid: 'from-emerald-400/20 via-slate-950 to-cyan-500/20',
}

export function Projects() {
  const [active, setActive] = useState<(typeof projects)[number] | null>(null)

  return (
    <section id="projects" className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title">
          <span>01.</span> 项目作品集
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          磨砂玻璃卡片 + 3D 倾斜预览。当前为静态数据，后续由 FastAPI + TiDB 后台 CRUD 实时驱动。
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {projects.map((p, idx) => (
            <Tilt key={p.id} tiltMaxAngleX={8} tiltMaxAngleY={8} glareEnable glareMaxOpacity={0.18}>
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: idx * 0.06 }}
                className="glass group relative overflow-hidden rounded-2xl p-5"
              >
                <div
                  className={`mb-4 h-28 rounded-xl bg-gradient-to-br ${coverGradient[p.cover] ?? coverGradient.grid} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(90deg,transparent_0,rgba(34,211,238,0.35)_50%,transparent_100%)] group-hover:animate-pulse" />
                  <div className="absolute bottom-3 left-3 font-display text-[10px] tracking-widest text-cyan-200">
                    PROJECT_{p.id.toUpperCase()}
                  </div>
                </div>
                <h3 className="text-base text-slate-100">{p.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">{p.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex gap-3">
                  <button type="button" className="cyber-btn !px-4 !py-2 text-xs" onClick={() => setActive(p)}>
                    详情
                  </button>
                  <a className="cyber-btn !px-4 !py-2 text-xs" href={p.github} target="_blank" rel="noreferrer">
                    源码
                  </a>
                </div>
              </motion.article>
            </Tilt>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass relative max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300"
                onClick={() => setActive(null)}
              >
                ✕
              </button>
              <h3 className="font-display text-lg text-cyan-200">{active.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{active.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {active.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-xs text-slate-500">
                静态预览弹窗 · 正式版将接入多图轮播与后台编辑（Embla + Admin API）。
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
