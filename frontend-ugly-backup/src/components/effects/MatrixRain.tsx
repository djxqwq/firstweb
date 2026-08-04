/**
 * Binary / Matrix-style canvas rain.
 * Logic adapted from classic Matrix Canvas tutorials + Rezmason/matrix interaction ideas
 * (cursor proximity scatters glyphs, speed follows pointer).
 * Ref: https://github.com/Rezmason/matrix (MIT — interaction semantics only)
 */
import { useEffect, useRef } from 'react'

type Props = { enabled?: boolean }

export function MatrixRain({ enabled = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const glyphs = '01アイウエオカキクケコサシスセソABCDEF<>[]{}/\\|$#@'
    let width = 0
    let height = 0
    let columns = 0
    let drops: number[] = []
    let speeds: number[] = []
    let pointer = { x: -9999, y: -9999 }
    let raf = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      const fontSize = Math.max(12, Math.floor(width / 90))
      columns = Math.floor(width / fontSize)
      drops = Array.from({ length: columns }, () => Math.random() * -40)
      speeds = Array.from({ length: columns }, () => 0.35 + Math.random() * 0.85)
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`
    }

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY }
    }

    const draw = () => {
      raf = requestAnimationFrame(draw)
      if (document.hidden) return

      ctx.fillStyle = 'rgba(3, 7, 18, 0.08)'
      ctx.fillRect(0, 0, width, height)

      const fontSize = Math.max(12, Math.floor(width / 90))
      for (let i = 0; i < columns; i++) {
        const x = i * fontSize
        const y = drops[i] * fontSize
        const dx = x - pointer.x
        const dy = y - pointer.y
        const dist = Math.hypot(dx, dy)
        const near = dist < 120

        if (near) {
          drops[i] -= 1.8
          speeds[i] = 1.6
        } else {
          const influence = 1 + Math.min(Math.abs(pointer.x - x) / width, 1) * 0.8
          speeds[i] = 0.35 + influence * 0.5
        }

        const char = glyphs[Math.floor(Math.random() * glyphs.length)]
        ctx.fillStyle = near ? '#4ade80' : i % 7 === 0 ? '#22d3ee' : 'rgba(34, 211, 238, 0.35)'
        ctx.fillText(char, x, y)

        if (y > height && Math.random() > 0.975) drops[i] = 0
        drops[i] += speeds[i]
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-40 mix-blend-screen"
    />
  )
}
