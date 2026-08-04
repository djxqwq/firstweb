/**
 * Skills bars — static stand-in for ECharts radial chart (wired later).
 */
import { motion } from 'framer-motion'
import { skills } from '../../data/content'

export function Skills() {
  return (
    <section id="skills" className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title">
          <span>04.</span> 技能特长
        </h2>
        <p className="mt-3 text-sm text-slate-400">静态星条预览 · 正式版替换为 ECharts 环形星空图</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {skills.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4"
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-200">
                  {s.name} <span className="text-slate-500">/{s.group}</span>
                </span>
                <span className="text-cyan-300">{s.level}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
