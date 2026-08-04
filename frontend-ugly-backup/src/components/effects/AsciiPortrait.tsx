/**
 * Lightweight ASCII portrait — image-to-glyph grid approach
 * adapted from common canvas ASCII demos (no heavy deps for static preview).
 */
import { useEffect, useRef } from 'react'

const CHARS = ' .·:;+*#%@'

type Props = {
  label?: string
  onActivate?: () => void
}

export function AsciiPortrait({ label = '邓锦鑫', onActivate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cols = 28
    const rows = 36
    const cell = 7
    canvas.width = cols * cell
    canvas.height = rows * cell

    let mx = cols / 2
    let my = rows / 2
    let raf = 0

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mx = ((e.clientX - rect.left) / rect.width) * cols
      my = ((e.clientY - rect.top) / rect.height) * rows
    }

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      ctx.fillStyle = '#030712'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${cell}px "JetBrains Mono", monospace`
      ctx.textBaseline = 'top'

      const cx = cols * 0.5
      const cy = rows * 0.48
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const dx = (x - cx) / (cols * 0.32)
          const dy = (y - cy) / (rows * 0.38)
          const warp = Math.sin((x - mx) * 0.35 + t * 0.002) * 0.08 + Math.cos((y - my) * 0.3) * 0.08
          const r = Math.hypot(dx + warp, dy * 1.15)
          let v = Math.max(0, 1 - r)
          // head silhouette
          if (y > rows * 0.62) {
            const neck = Math.abs(x - cx) / (cols * 0.18) + (y - rows * 0.62) / (rows * 0.4)
            v = Math.max(v, Math.max(0, 1 - neck))
          }
          const pulse = 0.85 + 0.15 * Math.sin(t * 0.004 + x * 0.2)
          const idx = Math.min(CHARS.length - 1, Math.floor(v * pulse * (CHARS.length - 1)))
          if (idx === 0) continue
          const near = Math.hypot(x - mx, y - my) < 4
          ctx.fillStyle = near ? '#4ade80' : v > 0.7 ? '#22d3ee' : 'rgba(148, 163, 184, 0.75)'
          ctx.fillText(CHARS[idx], x * cell, y * cell)
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={onActivate}
      title="点击触发流星雨彩蛋"
      className="fixed right-4 bottom-24 z-30 hidden rounded-xl border border-cyan-400/30 bg-black/50 p-2 shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur-md transition hover:border-cyan-300/70 md:block"
    >
      <canvas ref={canvasRef} className="block opacity-90" />
      <div className="mt-1 text-center font-display text-[10px] tracking-widest text-cyan-300">{label}</div>
    </button>
  )
}
