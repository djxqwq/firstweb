import { motion } from 'framer-motion'
import { education } from '../../data/content'

export function Education() {
  return (
    <section id="education" className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title">
          <span>02.</span> 教育背景
        </h2>
        <p className="mt-3 text-sm text-slate-400">终端代码风时间线 · 滚动扫描渐入</p>

        <div className="relative mt-10 space-y-6 border-l border-cyan-400/30 pl-6">
          {education.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass relative rounded-xl p-5"
            >
              <span className="absolute -left-[1.9rem] top-6 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
              <div className="text-[11px] tracking-widest text-emerald-400">{item.period}</div>
              <h3 className="mt-2 text-sm text-slate-100 md:text-base">{item.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-400">{item.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
