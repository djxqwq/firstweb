import { profile } from '../../data/content'

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-cyan-400/15 bg-black/40 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-display text-sm tracking-widest text-cyan-300">个人技术博客</div>
          <p className="mt-2 text-xs text-slate-400">Copyright © 2026 {profile.name} · 赛博星空静态预览版</p>
          <p className="mt-1 text-[11px] text-slate-500">备案号占位 · 后续接入火山云 + TiDB 后端</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <a className="text-slate-300 hover:text-cyan-300" href={profile.links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="text-slate-300 hover:text-cyan-300" href={profile.links.csdn} target="_blank" rel="noreferrer">
            CSDN
          </a>
          <a className="text-slate-300 hover:text-cyan-300" href={profile.links.blog} target="_blank" rel="noreferrer">
            Blog
          </a>
          <a className="text-slate-300 hover:text-cyan-300" href={profile.links.email}>
            Email
          </a>
        </div>
      </div>
    </footer>
  )
}
