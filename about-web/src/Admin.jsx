/**
 * Admin panel — 单人 JWT 管理台（项目 CRUD 优先）
 * 风格对齐终端档案，接口对接 FastAPI。
 */
import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const TYPES = [
  { key: 'project', label: '项目' },
  { key: 'education', label: '教育' },
  { key: 'honor', label: '荣誉' },
  { key: 'skill', label: '技能' },
  { key: 'profile', label: '个人信息' },
  { key: 'message', label: '留言' },
]

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '')
  const [user, setUser] = useState('admin')
  const [pass, setPass] = useState('')
  const [type, setType] = useState('project')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    id: null,
    title: '',
    summary: '',
    level: 80,
    sort_order: 0,
    published: true,
    cover_url: '',
  })
  const [visits, setVisits] = useState([])
  const [tab, setTab] = useState('contents')

  const title = useMemo(() => TYPES.find((t) => t.key === type)?.label || type, [type])

  const login = async (e) => {
    e.preventDefault()
    setError('')
    const body = new URLSearchParams()
    body.set('username', user)
    body.set('password', pass)
    const res = await fetch(`${API}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      setError('登录失败：检查用户名密码')
      return
    }
    const data = await res.json()
    localStorage.setItem('admin_token', data.access_token)
    setToken(data.access_token)
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken('')
  }

  const loadContents = async () => {
    if (!token) return
    const res = await fetch(`${API}/api/admin/contents?type=${type}`, {
      headers: authHeaders(token),
    })
    if (res.status === 401) {
      logout()
      return
    }
    setItems(await res.json())
  }

  const loadVisits = async () => {
    if (!token) return
    const res = await fetch(`${API}/api/admin/visits?limit=50`, {
      headers: authHeaders(token),
    })
    if (res.ok) setVisits(await res.json())
  }

  useEffect(() => {
    if (token && tab === 'contents') loadContents()
    if (token && tab === 'visits') loadVisits()
  }, [token, type, tab])

  const resetForm = () =>
    setForm({
      id: null,
      title: '',
      summary: '',
      level: 80,
      sort_order: 0,
      published: true,
      cover_url: '',
    })

  const save = async (e) => {
    e.preventDefault()
    const payload = {
      type,
      title: form.title,
      summary: form.summary,
      level: Number(form.level) || 0,
      sort_order: Number(form.sort_order) || 0,
      published: !!form.published,
      cover_url: form.cover_url || '',
      body_json: type === 'profile' ? { name: form.title, bio: form.summary } : {},
      tags_json: [],
      links_json: {},
    }
    const url = form.id
      ? `${API}/api/admin/contents/${form.id}`
      : `${API}/api/admin/contents`
    const res = await fetch(url, {
      method: form.id ? 'PUT' : 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setError('保存失败')
      return
    }
    resetForm()
    loadContents()
  }

  const edit = (item) => {
    setForm({
      id: item.id,
      title: item.title || '',
      summary: item.summary || '',
      level: item.level || 0,
      sort_order: item.sort_order || 0,
      published: item.published,
      cover_url: item.cover_url || '',
    })
  }

  const remove = async (id) => {
    if (!confirm('确认删除？')) return
    await fetch(`${API}/api/admin/contents/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    loadContents()
  }

  const exportVisits = async () => {
    const res = await fetch(`${API}/api/admin/visits/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setError('导出失败')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'visits.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!token) {
    return (
      <div style={styles.page}>
        <form onSubmit={login} style={styles.card}>
          <h1 style={styles.h1}>管理后台 · 邓锦鑫</h1>
          <p style={styles.muted}>单人 JWT 登录 · 无注册入口</p>
          <input style={styles.input} value={user} onChange={(e) => setUser(e.target.value)} placeholder="用户名" />
          <input
            style={styles.input}
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="密码"
          />
          {error && <p style={styles.err}>{error}</p>}
          <button style={styles.btn} type="submit">
            登录
          </button>
          <a href="/" style={styles.link}>
            ← 返回终端档案
          </a>
        </form>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, maxWidth: 980, width: '100%' }}>
        <div style={styles.row}>
          <h1 style={styles.h1}>星空管理台</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btnGhost} type="button" onClick={() => setTab('contents')}>
              内容
            </button>
            <button style={styles.btnGhost} type="button" onClick={() => setTab('visits')}>
              访客
            </button>
            <button style={styles.btnGhost} type="button" onClick={logout}>
              退出
            </button>
          </div>
        </div>

        {tab === 'contents' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  style={{
                    ...styles.btnGhost,
                    borderColor: type === t.key ? '#22d3ee' : '#334155',
                    color: type === t.key ? '#22d3ee' : '#cbd5e1',
                  }}
                  onClick={() => {
                    setType(t.key)
                    resetForm()
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={save} style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              <h2 style={styles.h2}>
                {form.id ? '编辑' : '新增'} · {title}
              </h2>
              <input
                style={styles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="标题"
                required
              />
              <textarea
                style={{ ...styles.input, minHeight: 80 }}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="简介 / 正文摘要"
              />
              {type === 'skill' && (
                <input
                  style={styles.input}
                  type="number"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  placeholder="熟练度 0-100"
                />
              )}
              <input
                style={styles.input}
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                placeholder="排序"
              />
              <label style={styles.muted}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />{' '}
                发布到前台
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.btn} type="submit">
                  保存
                </button>
                <button style={styles.btnGhost} type="button" onClick={resetForm}>
                  清空表单
                </button>
                <a href="http://127.0.0.1:3001/" target="_blank" rel="noreferrer" style={styles.link}>
                  预览前台
                </a>
              </div>
              {error && <p style={styles.err}>{error}</p>}
            </form>

            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((item) => (
                <div key={item.id} style={styles.item}>
                  <div>
                    <strong>{item.title}</strong>
                    <div style={styles.muted}>{item.summary}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={styles.btnGhost} type="button" onClick={() => edit(item)}>
                      编辑
                    </button>
                    <button style={styles.btnDanger} type="button" onClick={() => remove(item.id)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!items.length && <p style={styles.muted}>暂无数据</p>}
            </div>
          </>
        )}

        {tab === 'visits' && (
          <>
            <button style={styles.btn} type="button" onClick={exportVisits}>
              导出 CSV（需已登录 token，请用接口工具或后端直接下载）
            </button>
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              {visits.map((v) => (
                <div key={v.id} style={styles.item}>
                  <code style={{ fontSize: 12 }}>
                    {v.created_at} · {v.ip_hash} · {v.path} · {v.device}
                  </code>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg,#030712,#0f172a 50%,#082f49)',
    color: '#e2e8f0',
    display: 'flex',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'JetBrains Mono, Consolas, monospace',
  },
  card: {
    background: 'rgba(15,23,42,0.88)',
    border: '1px solid rgba(34,211,238,0.35)',
    borderRadius: 16,
    padding: 24,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
  },
  h1: { margin: 0, fontSize: 22, color: '#67e8f9' },
  h2: { margin: 0, fontSize: 16, color: '#a5f3fc' },
  muted: { color: '#94a3b8', fontSize: 13 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#020617',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    padding: '10px 12px',
  },
  btn: {
    background: 'linear-gradient(90deg,#0891b2,#22d3ee)',
    color: '#082f49',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'transparent',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  link: { color: '#67e8f9', fontSize: 13 },
  err: { color: '#f87171', fontSize: 13 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    border: '1px solid #1e293b',
    borderRadius: 10,
    background: 'rgba(2,6,23,0.6)',
  },
}
