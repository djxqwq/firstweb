/**
 * Static content seed — later synced from FastAPI + TiDB.
 * Source texts migrated from legacy VitePress docs/.
 */

export const profile = {
  name: '邓锦鑫',
  title: "Hello, I'm 邓锦鑫",
  role: '软件工程全栈开发者 | 算法竞赛爱好者',
  bio: '浙江财经大学软件工程专业学生，专注于全栈开发和人工智能领域。热爱算法竞赛，擅长 C/C++、Python、Java 开发，致力于构建优雅、高效的解决方案。',
  links: {
    github: 'https://github.com/djxqwq',
    csdn: 'https://blog.csdn.net/2302_79866931',
    blog: 'https://723539.xyz',
    email: 'mailto:1075751918@qq.com',
  },
}

export const projects = [
  {
    id: 'a',
    title: '派陪 · Pepper 机器人智能养老护理',
    summary:
      '基于 Uniapp 跨端养老小程序，健康数据可视化与 Pepper 机器人集成；首屏加载提速 30%，获挑战杯 AI+ 省级铜奖。',
    tags: ['Uniapp', '小程序', '跨端', 'ECharts'],
    cover: 'nebula',
    github: 'https://github.com/djxqwq',
    demo: '#projects',
  },
  {
    id: 'b',
    title: '基于物联网的养老陪护系统',
    summary:
      'Java/Python 后端 + MySQL，多设备健康指标实时同步；国家级大创立项，软著 2025R11L3781196。',
    tags: ['Java', 'Python', 'MySQL', '物联网'],
    cover: 'orbit',
    github: 'https://github.com/djxqwq',
    demo: '#projects',
  },
  {
    id: 'c',
    title: '浓烟环境人体目标判别系统',
    summary:
      'OpenCV + YOLOv5 火灾救援视觉判别，单帧 ≤100ms，识别准确率 ≥80%，适配双系统。',
    tags: ['Python', 'OpenCV', 'YOLOv5', 'PyTorch'],
    cover: 'flare',
    github: 'https://github.com/djxqwq',
    demo: '#projects',
  },
  {
    id: 'd',
    title: '全栈开发实践项目',
    summary:
      'Vue.js + Spring Boot + MySQL 课程全栈实践：需求分析、系统设计、测试部署完整闭环。',
    tags: ['Vue.js', 'Spring Boot', 'REST', 'MySQL'],
    cover: 'grid',
    github: 'https://github.com/djxqwq',
    demo: '#projects',
  },
]

export const education = [
  {
    period: '2023-09 ~ 至今',
    title: '浙江财经大学 · 软件工程（本科）',
    detail: 'GPA 3.77/5.0 · 专业综合测评前 10%',
  },
  {
    period: '2023-09 ~ 2025-06',
    title: '计算机 ACM 协会 · 干事 → 社长',
    detail:
      '搭建三级培养体系，组织活动 18+ 场，覆盖 300+ 人次；协会获奖同比提升 40%。',
  },
]

export const honors = [
  '第十六届蓝桥杯 C++ 全国总决赛二等奖 / 省一等奖',
  '第十五届蓝桥杯 C++ 全国总决赛三等奖 / 省一等奖',
  '第十届天梯赛全国总决赛团队二等奖',
  '挑战杯人工智能 + 专项赛省级铜奖',
  '国家级大学生创新创业训练计划项目（核心成员 2/5）',
  '软件著作权：基于物联网的养老陪护系统',
]

export const skills = [
  { name: 'C/C++', level: 92, group: '语言' },
  { name: 'Python', level: 88, group: '语言' },
  { name: 'Java', level: 82, group: '语言' },
  { name: 'JavaScript / Vue', level: 80, group: '前端' },
  { name: 'Spring Boot / FastAPI', level: 78, group: '后端' },
  { name: 'MySQL / TiDB', level: 76, group: '数据' },
  { name: '算法竞赛', level: 90, group: '算法' },
  { name: 'OpenCV / YOLO', level: 74, group: 'AI' },
]

export const visitMock = [
  { day: 'Mon', count: 12 },
  { day: 'Tue', count: 19 },
  { day: 'Wed', count: 15 },
  { day: 'Thu', count: 28 },
  { day: 'Fri', count: 22 },
  { day: 'Sat', count: 35 },
  { day: 'Sun', count: 41 },
]

export const navItems = [
  { id: 'home', label: '首页' },
  { id: 'projects', label: '项目' },
  { id: 'education', label: '教育' },
  { id: 'honors', label: '荣誉' },
  { id: 'skills', label: '技能' },
  { id: 'contact', label: '联系' },
  { id: 'visits', label: '更多' },
]
