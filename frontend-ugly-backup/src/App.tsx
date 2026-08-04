/**
 * Static cyber-space portfolio preview.
 * Style refs:
 * - https://github.com/VertexHQ/cyberpunk-react-dev-portfolio
 * - https://github.com/McKlay/portfolio-website
 * - https://github.com/Simone-techAIGC/cyber-portfolio
 * Effects adapted from Three.js Points + classic Matrix canvas rain.
 * Backend (FastAPI + TiDB) will replace static data later.
 */
import { useCallback, useEffect, useState } from 'react'
import { Starfield } from './components/effects/Starfield'
import { MatrixRain } from './components/effects/MatrixRain'
import { AsciiPortrait } from './components/effects/AsciiPortrait'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { Projects } from './components/sections/Projects'
import { Education } from './components/sections/Education'
import { Honors } from './components/sections/Honors'
import { Skills } from './components/sections/Skills'
import { Contact } from './components/sections/Contact'
import { Visits } from './components/sections/Visits'

export default function App() {
  const [storm, setStorm] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [, setSeq] = useState('')

  const triggerStorm = useCallback(() => {
    setStorm(true)
    window.setTimeout(() => setStorm(false), 2500)
  }, [])

  useEffect(() => {
    console.log(
      '%c个人技术博客 · 邓锦鑫',
      'color:#22d3ee;font-family:monospace;font-size:14px',
    )
    console.log('%c> 试试 Konami: ↑↑↓↓←→←→BA', 'color:#4ade80;font-family:monospace')
  }, [])

  useEffect(() => {
    const map: Record<string, string> = {
      ArrowUp: 'U',
      ArrowDown: 'D',
      ArrowLeft: 'L',
      ArrowRight: 'R',
      b: 'B',
      a: 'A',
      B: 'B',
      A: 'A',
    }
    const target = 'UUDDLRLRBA'
    const onKey = (e: KeyboardEvent) => {
      const k = map[e.key]
      if (!k) return
      setSeq((prev) => {
        const next = (prev + k).slice(-target.length)
        if (next === target) setHidden(true)
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative min-h-screen">
      <Starfield starCount={storm ? 9000 : 4500} />
      <MatrixRain />
      <div
        className={`pointer-events-none fixed inset-0 z-[2] transition ${
          storm ? 'bg-[radial-gradient(circle,rgba(34,211,238,0.25),transparent_55%)]' : ''
        }`}
      />

      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Projects />
        <Education />
        <Honors />
        <Skills />
        <Contact />
        <Visits />
      </main>
      <Footer />
      <AsciiPortrait onActivate={triggerStorm} />

      {hidden && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <div className="glass max-w-md rounded-2xl p-6 text-center">
            <div className="font-display text-cyan-300">HIDDEN_SECTOR_UNLOCKED</div>
            <p className="mt-4 text-sm text-slate-300">
              彩蛋页预览成功。正式版将接入独立隐藏路由与更完整的飞船动画。
            </p>
            <button type="button" className="cyber-btn mt-6" onClick={() => setHidden(false)}>
              返回主站
            </button>
          </div>
        </div>
      )}

      {/* bottom decorative ship hint */}
      <img
        src="/assets/ship-hint.svg"
        alt=""
        className="pointer-events-none fixed bottom-4 left-4 z-20 hidden h-10 opacity-70 md:block"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}
