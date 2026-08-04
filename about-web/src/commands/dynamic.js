/**
 * Dynamic commands — 邓锦鑫专属
 * Fetches FastAPI when available; otherwise uses offline seed.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const getTime = () => {
  const date = new Date()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  return `${hours}${minutes < 10 ? ':0' : ':'}${minutes}${seconds < 10 ? ':0' : ':'}${seconds}`
}

async function api(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

const FALLBACK = {
  profile: {
    name: '邓锦鑫',
    role: '软件工程全栈开发者 | 算法竞赛爱好者',
    school: '浙江财经大学 · 软件工程',
    email: '1075751918@qq.com',
    github: 'https://github.com/djxqwq',
    csdn: 'https://blog.csdn.net/2302_79866931',
    bio: '专注全栈与人工智能，热爱算法竞赛，擅长 C/C++、Python、Java。',
  },
  projects: [
    { title: '派陪 Pepper 机器人智能养老护理', summary: 'Uniapp 跨端 · 挑战杯 AI+ 省铜' },
    { title: '物联网养老陪护系统', summary: 'Java/Python/MySQL · 国创 · 软著' },
    { title: '浓烟环境人体目标判别', summary: 'YOLOv5 · ≤100ms · ≥80%' },
    { title: '全栈开发实践', summary: 'Vue.js + Spring Boot + MySQL' },
  ],
  skills: [
    { title: 'C/C++', level: 92 },
    { title: '算法竞赛', level: 90 },
    { title: 'Python', level: 88 },
    { title: 'Java', level: 82 },
    { title: 'Vue/Uniapp', level: 80 },
    { title: 'Spring Boot/FastAPI', level: 78 },
    { title: 'MySQL/TiDB', level: 76 },
  ],
  education: [
    { title: '浙江财经大学', summary: '软件工程 · 本科在读 · 2023-09~至今 · GPA 3.77/5.0' },
    { title: 'ACM 协会', summary: '干事→社长 · 活动18+场 · 覆盖300+人次' },
  ],
  honors: [
    { title: '第十六届蓝桥杯 C++ 全国二等奖 / 省一等奖' },
    { title: '第十五届蓝桥杯 C++ 全国三等奖 / 省一等奖' },
    { title: '第十届天梯赛全国团队二等奖' },
    { title: '挑战杯人工智能+专项赛省级铜奖' },
    { title: '国家级大创项目（核心成员 2/5）' },
    { title: '软著：基于物联网的养老陪护系统' },
  ],
}

const introduction = [
  { type: 'system', label: 'System', content: 'cd dengjinxin' },
  { type: 'system', label: 'System', content: '欢迎访问邓锦鑫的终端档案。' },
  { time: getTime(), type: 'info', label: '姓名:', content: '邓锦鑫' },
  { time: getTime(), type: 'info', label: '身份:', content: FALLBACK.profile.role },
  { time: getTime(), type: 'info', label: '学校:', content: FALLBACK.profile.school },
  { time: getTime(), type: 'info', label: '邮箱:', content: FALLBACK.profile.email },
]

function printLines(print, lines) {
  return new Promise((resolve) => {
    let i = 0
    const timer = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(timer)
        resolve({ type: 'success', label: 'Done', content: 'OK' })
        return
      }
      print(lines[i])
      i += 1
    }, 120)
  })
}

export default {
  intro: {
    description: '自我介绍',
    run(print) {
      let i = 0
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          print(introduction[i])
          i += 1
          if (!introduction[i]) {
            clearInterval(interval)
            resolve({ type: 'success', label: 'Done', content: '介绍完毕。输入 help 查看更多命令。' })
          }
        }, 450)
      })
    },
  },

  project: {
    description: '项目作品集',
    async run(print) {
      let list = FALLBACK.projects
      try {
        list = await api('/api/projects')
      } catch (_) { /* offline */ }
      const lines = (list || []).map((p, i) => ({
        type: 'success',
        label: `P${i + 1}`,
        content: `${p.title} · ${p.summary || ''}`,
      }))
      return printLines(print, lines)
    },
  },

  skill: {
    description: '技能特长',
    async run(print) {
      let list = FALLBACK.skills
      try {
        list = await api('/api/skills')
      } catch (_) { /* offline */ }
      const lines = (list || []).map((s) => ({
        type: s.level >= 85 ? 'success' : s.level >= 70 ? 'warning' : 'error',
        label: s.level >= 85 ? 'A' : s.level >= 70 ? 'B' : 'C',
        content: `· ${s.title} ${s.level}/100`,
      }))
      return printLines(print, lines)
    },
  },

  education: {
    description: '教育背景',
    async run(print) {
      let list = FALLBACK.education
      try {
        list = await api('/api/education')
      } catch (_) { /* offline */ }
      const lines = (list || []).map((e) => ({
        type: 'info',
        label: 'EDU',
        content: `${e.title} — ${e.summary || ''}`,
      }))
      return printLines(print, lines)
    },
  },

  honor: {
    description: '荣誉证书',
    async run(print) {
      let list = FALLBACK.honors
      try {
        list = await api('/api/honors')
      } catch (_) { /* offline */ }
      const lines = (list || []).map((h, i) => ({
        type: 'success',
        label: `H${i + 1}`,
        content: h.title || h.summary,
      }))
      return printLines(print, lines)
    },
  },

  contact: {
    description: '联系方式',
    async run(print) {
      let p = FALLBACK.profile
      try {
        p = { ...p, ...(await api('/api/profile')) }
      } catch (_) { /* offline */ }
      return printLines(print, [
        { type: 'info', label: '姓名:', content: p.name },
        { type: 'info', label: '邮箱:', content: p.email },
        { type: 'info', label: 'GitHub:', content: p.github },
        { type: 'info', label: 'CSDN:', content: p.csdn || '' },
        { type: 'info', label: '简介:', content: p.bio || p.role || '' },
      ])
    },
  },

  message: {
    description: '留言：message 你的内容',
    async run(print, input) {
      if (!input) {
        return { type: 'error', label: 'Error', content: '用法: message 你好，想交流算法...' }
      }
      try {
        await api('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'visitor', content: input }),
        })
        print({ type: 'success', label: 'OK', content: '留言已提交到服务器。' })
        return { type: 'success', label: 'Done', content: '' }
      } catch (_) {
        return { type: 'warning', label: 'Offline', content: '后端未启动，留言未写入。请先启动 FastAPI。' }
      }
    },
  },

  visit: {
    description: '访客统计概览',
    async run(print) {
      try {
        const stats = await api('/api/visits/stats')
        const lines = (stats.days || []).map((d) => ({
          type: 'info',
          label: d.day,
          content: `${d.count} visits`,
        }))
        if (!lines.length) {
          return { type: 'info', label: 'Info', content: '暂无访客数据' }
        }
        print({ type: 'system', label: 'Total', content: String(stats.total || 0) })
        return printLines(print, lines)
      } catch (_) {
        return { type: 'warning', label: 'Offline', content: '后端未启动。' }
      }
    },
  },

  blog: {
    description: '打开 CSDN 博客',
    run(print) {
      print({ type: 'success', label: 'OK', content: 'Opening CSDN...' })
      window.open('https://blog.csdn.net/2302_79866931', '_blank')
      return Promise.resolve({ type: 'success', label: 'Done', content: '' })
    },
  },

  github: {
    description: '打开 GitHub',
    run(print) {
      print({ type: 'success', label: 'OK', content: 'Opening GitHub...' })
      window.open('https://github.com/djxqwq', '_blank')
      return Promise.resolve({ type: 'success', label: 'Done', content: '' })
    },
  },

  home: {
    description: '返回流体主页',
    run(print) {
      print({ type: 'success', label: 'OK', content: '返回主页...' })
      window.location.href = 'http://127.0.0.1:8080/'
      return Promise.resolve({ type: 'success', label: 'Done', content: '' })
    },
  },

  admin: {
    description: '打开管理后台',
    run(print) {
      print({ type: 'success', label: 'OK', content: '打开 /admin ...' })
      window.location.href = '/admin'
      return Promise.resolve({ type: 'success', label: 'Done', content: '' })
    },
  },
}
