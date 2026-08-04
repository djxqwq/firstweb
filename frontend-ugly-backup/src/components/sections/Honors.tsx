import { motion } from 'framer-motion'
import { honors } from '../../data/content'

export function Honors() {
  return (
    <section id="honors" className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title">
          <span>03.</span> 荣誉证书
        </h2>
        <p className="mt-3 text-sm text-slate-400">证书网格 · 后续接入大图预览 Lightbox</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {honors.map((h, i) => (
            <motion.div
              key={h}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="glass group rounded-xl p-4 transition hover:border-cyan-300/50 hover:shadow-[0_0_28px_rgba(34,211,238,0.18)]"
            >
              <div className="font-display text-[10px] tracking-widest text-amber-300">AWARD_{String(i + 1).padStart(2, '0')}</div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{h}</p>
              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 transition group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
