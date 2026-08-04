import { useState } from 'react'
import type { FormEvent } from 'react'
import { profile } from '../../data/content'

export function Contact() {
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="contact" className="relative z-10 px-4 py-24">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <div>
          <h2 className="section-title">
            <span>05.</span> 联系方式
          </h2>
          <p className="mt-3 text-sm text-slate-400">终端留言表单 · 静态预览仅前端提示，正式版写入 TiDB</p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li>
              邮箱：
              <a className="text-cyan-300" href={profile.links.email}>
                1075751918@qq.com
              </a>
            </li>
            <li>
              GitHub：
              <a className="text-cyan-300" href={profile.links.github} target="_blank" rel="noreferrer">
                djxqwq
              </a>
            </li>
            <li>
              CSDN：
              <a className="text-cyan-300" href={profile.links.csdn} target="_blank" rel="noreferrer">
                2302_79866931
              </a>
            </li>
            <li>微信 / QQ：djx201998 / 1075751918</li>
          </ul>
        </div>

        <form onSubmit={onSubmit} className="glass rounded-2xl p-6">
          <label className="block text-xs text-slate-400">
            昵称
            <input
              required
              className="mt-2 w-full rounded-lg border border-cyan-400/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
              placeholder="visitor_01"
            />
          </label>
          <label className="mt-4 block text-xs text-slate-400">
            留言
            <textarea
              required
              rows={5}
              className="mt-2 w-full rounded-lg border border-cyan-400/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
              placeholder="> 想交流算法 / 全栈 / 实习机会..."
            />
          </label>
          <button type="submit" className="cyber-btn mt-5 w-full">
            发送信号
          </button>
          {sent && (
            <p className="mt-3 text-xs text-emerald-400">✓ 本地预览：消息已模拟提交（未写库）</p>
          )}
        </form>
      </div>
    </section>
  )
}
