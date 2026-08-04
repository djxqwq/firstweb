import { useEffect, useState } from 'react'
import { navItems } from '../../data/content'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [openMore, setOpenMore] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const main = navItems.filter((n) => n.id !== 'visits')
  const more = navItems.find((n) => n.id === 'visits')

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition ${
        scrolled ? 'bg-black/55 backdrop-blur-xl border-b border-cyan-400/15' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#home" className="font-display text-sm tracking-[0.18em] text-cyan-300 md:text-base">
          个人技术博客
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {main.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-full px-3 py-1.5 text-xs tracking-wider text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-200"
            >
              {item.label}
            </a>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMore((v) => !v)}
              className="rounded-full px-3 py-1.5 text-xs tracking-wider text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-200"
            >
              {more?.label ?? '更多'} ▾
            </button>
            {openMore && (
              <div className="absolute right-0 mt-2 min-w-40 rounded-xl border border-cyan-400/25 bg-slate-950/95 p-2 shadow-xl">
                <a
                  href="#visits"
                  onClick={() => setOpenMore(false)}
                  className="block rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                >
                  访客可视化
                </a>
                <a
                  href="#contact"
                  onClick={() => setOpenMore(false)}
                  className="block rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                >
                  合作意向
                </a>
              </div>
            )}
          </div>
        </nav>

        <button
          type="button"
          className="rounded border border-cyan-400/40 px-2 py-1 text-xs text-cyan-300 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          MENU
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-cyan-400/15 bg-black/80 px-4 py-3 md:hidden">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-slate-300"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
