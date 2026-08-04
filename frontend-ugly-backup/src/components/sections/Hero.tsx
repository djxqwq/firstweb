/**
 * Hero — structure adapted from react-portfolio-template section layout
 * + terminal typewriter pattern (typewriter-effect).
 * Ref: https://github.com/AjinkyaGokhale/react-portfolio-template
 * Ref: https://github.com/tameemsafi/typewriter-effect
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { profile } from '../../data/content'

export function Hero() {
  const full = profile.title
  const [text, setText] = useState('')

  useEffect(() => {
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setText(full.slice(0, i))
      if (i >= full.length) window.clearInterval(id)
    }, 55)
    return () => window.clearInterval(id)
  }, [full])

  return (
    <section id="home" className="relative z-10 flex min-h-screen items-center px-4 pb-16 pt-28">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-3 text-xs tracking-[0.25em] text-emerald-400">SYSTEM // ONLINE</p>
          <h1 className="font-display text-3xl leading-tight text-white md:text-5xl">
            {text}
            <span className="ml-1 inline-block h-8 w-2 animate-pulse bg-cyan-400 align-middle md:h-10" />
          </h1>
          <p className="mt-4 text-sm text-cyan-200/90 md:text-base">{profile.role}</p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">{profile.bio}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="cyber-btn" href={profile.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="cyber-btn" href={profile.links.csdn} target="_blank" rel="noreferrer">
              CSDN
            </a>
            <a className="cyber-btn" href="#contact">
              联系我
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative mx-auto flex h-64 w-64 items-center justify-center md:h-80 md:w-80"
        >
          <div className="avatar-ring absolute inset-0 rounded-full border border-cyan-400/40" />
          <div className="absolute inset-3 rounded-full border border-emerald-400/20" />
          <div className="glass relative flex h-48 w-48 items-center justify-center rounded-full md:h-56 md:w-56">
            <div className="font-display text-3xl tracking-[0.2em] text-cyan-300 md:text-4xl">{profile.name}</div>
          </div>
          <div className="pointer-events-none absolute -inset-6 rounded-full bg-[conic-gradient(from_90deg,transparent,rgba(34,211,238,0.35),transparent,rgba(74,222,128,0.25),transparent)] opacity-60 blur-sm" />
        </motion.div>
      </div>
    </section>
  )
}
