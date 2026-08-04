import { visitMock } from '../../data/content'

export function Visits() {
  const max = Math.max(...visitMock.map((v) => v.count))

  return (
    <section id="visits" className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title">
          <span>06.</span> 访客可视化
        </h2>
        <p className="mt-3 text-sm text-slate-400">静态 mock 折线柱 · 正式版由 TiDB visits 表聚合 + ECharts</p>

        <div className="glass mt-10 rounded-2xl p-6">
          <div className="mb-6 flex items-end gap-3">
            {visitMock.map((v) => (
              <div key={v.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-cyan-500/20 to-cyan-300/80"
                  style={{ height: `${(v.count / max) * 140}px` }}
                  title={`${v.count}`}
                />
                <span className="text-[10px] text-slate-400">{v.day}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-black/40 p-3 font-mono text-[11px] leading-6 text-emerald-300/90">
            <div>$ visitor-stream --tail</div>
            <div>[10:21:03] ip=hash:a1f3… path=/ device=desktop</div>
            <div>[10:22:11] ip=hash:9c2b… path=/projects device=mobile</div>
            <div>[10:24:48] ip=hash:77e0… path=/contact device=desktop</div>
            <div className="animate-pulse">_</div>
          </div>
        </div>
      </div>
    </section>
  )
}
