/**
 * Router: / = TermFolio 档案； /admin = 管理台
 * UI base: Tomotoes/react-terminal
 */
import { useEffect, useState } from 'react'
import Terminal from './termfolio/index.jsx'
import dynamicList from './commands/dynamic'
import staticList from './commands/static'
import Admin from './Admin.jsx'
import './terminal.css'

const cmd = { dynamicList, staticList }
const config = {
  prompt: '➜  ~ ',
  version: '1.0.0',
  initialDirectory: 'dengjinxin',
  bootCmd: 'intro',
  welcomeMessage:
    '邓锦鑫的终端档案。命令: project skill education honor contact message visit blog github home admin',
}

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    // visit beacon
    fetch(`${API}/api/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || '',
        device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      }),
    }).catch(() => {})
  }, [path])

  useEffect(() => {
    if (path.startsWith('/admin')) return
    const fadeEl = document.querySelectorAll('.fade')
    fadeEl.forEach((e) => e.classList.add('in'))
    return () => fadeEl.forEach((e) => e.classList.remove('in'))
  }, [path])

  if (path.startsWith('/admin')) {
    return <Admin />
  }

  return <Terminal className="fade" cmd={cmd} config={config} />
}
