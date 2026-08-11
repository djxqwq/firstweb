/**
 * Content customized for 邓锦鑫.
 * UI / 3D / animations from MIT template:
 * https://github.com/sanidhyy/space-portfolio
 */
import { FaBook, FaEnvelope } from "react-icons/fa";
import { RxGithubLogo, RxLinkedinLogo } from "react-icons/rx";

export type SkillIcon = {
  skill_name: string;
  image: string;
  width: number;
  height: number;
};

/** 完整图标技术栈：优先 skillicons.dev（MIT / 免费 CDN） */
export const SKILL_GROUPS: { title: string; skills: SkillIcon[] }[] = [
  {
    title: "语言 · 核心",
    skills: [
      { skill_name: "C / C++", image: "https://skillicons.dev/icons?i=cpp", width: 64, height: 64 },
      { skill_name: "Python", image: "https://skillicons.dev/icons?i=py", width: 64, height: 64 },
      { skill_name: "Java", image: "https://skillicons.dev/icons?i=java", width: 64, height: 64 },
      { skill_name: "JavaScript", image: "https://skillicons.dev/icons?i=js", width: 58, height: 58 },
      { skill_name: "TypeScript", image: "https://skillicons.dev/icons?i=ts", width: 64, height: 64 },
      { skill_name: "算法竞赛", image: "algo.svg", width: 64, height: 64 },
      { skill_name: "Go", image: "https://skillicons.dev/icons?i=go", width: 56, height: 56 },
    ],
  },
  {
    title: "前端",
    skills: [
      { skill_name: "HTML", image: "https://skillicons.dev/icons?i=html", width: 64, height: 64 },
      { skill_name: "CSS", image: "https://skillicons.dev/icons?i=css", width: 64, height: 64 },
      { skill_name: "Vue / Uniapp", image: "https://skillicons.dev/icons?i=vue", width: 64, height: 64 },
      { skill_name: "Uniapp", image: "uniapp.svg", width: 64, height: 64 },
      { skill_name: "React", image: "https://skillicons.dev/icons?i=react", width: 64, height: 64 },
      { skill_name: "Next.js", image: "https://skillicons.dev/icons?i=nextjs", width: 64, height: 64 },
      { skill_name: "Tailwind", image: "https://skillicons.dev/icons?i=tailwind", width: 64, height: 64 },
      { skill_name: "Framer", image: "https://skillicons.dev/icons?i=framer", width: 64, height: 64 },
      { skill_name: "Redux", image: "https://skillicons.dev/icons?i=redux", width: 64, height: 64 },
    ],
  },
  {
    title: "后端 · 数据",
    skills: [
      { skill_name: "Spring Boot", image: "https://skillicons.dev/icons?i=spring", width: 64, height: 64 },
      { skill_name: "FastAPI", image: "fastapi.svg", width: 64, height: 64 },
      { skill_name: "Node.js", image: "https://skillicons.dev/icons?i=nodejs", width: 64, height: 64 },
      { skill_name: "Express", image: "https://skillicons.dev/icons?i=express", width: 64, height: 64 },
      { skill_name: "MySQL", image: "https://skillicons.dev/icons?i=mysql", width: 64, height: 64 },
      { skill_name: "TiDB", image: "tidb.svg", width: 64, height: 64 },
      { skill_name: "PostgreSQL", image: "https://skillicons.dev/icons?i=postgres", width: 64, height: 64 },
      { skill_name: "MongoDB", image: "https://skillicons.dev/icons?i=mongodb", width: 48, height: 48 },
      { skill_name: "Prisma", image: "https://skillicons.dev/icons?i=prisma", width: 64, height: 64 },
      { skill_name: "GraphQL", image: "https://skillicons.dev/icons?i=graphql", width: 64, height: 64 },
      { skill_name: "Firebase", image: "https://skillicons.dev/icons?i=firebase", width: 52, height: 52 },
    ],
  },
  {
    title: "工程 · 视觉 · 其他",
    skills: [
      { skill_name: "OpenCV / YOLO", image: "opencv.svg", width: 64, height: 64 },
      { skill_name: "Docker", image: "https://skillicons.dev/icons?i=docker", width: 64, height: 64 },
      { skill_name: "React Native", image: "https://skillicons.dev/icons?i=react", width: 64, height: 64 },
      { skill_name: "Tauri", image: "tauri.png", width: 64, height: 64 },
      { skill_name: "Figma", image: "https://skillicons.dev/icons?i=figma", width: 48, height: 48 },
    ],
  },
];

/** 熟练度条（与后台 skill 同步；API 不可用时的真实回退） */
export const CORE_LEVELS: { title: string; level: number }[] = [
  { title: "C/C++", level: 92 },
  { title: "算法竞赛", level: 90 },
  { title: "Python", level: 88 },
  { title: "Java", level: 82 },
  { title: "Vue/Uniapp", level: 80 },
  { title: "Spring Boot/FastAPI", level: 78 },
  { title: "MySQL/TiDB", level: 76 },
  { title: "OpenCV/YOLO", level: 74 },
];

/** 核心能力文字徽章 */
export const CORE_BADGES = [
  "C / C++",
  "Python",
  "Java",
  "Vue / Uniapp",
  "Spring Boot",
  "FastAPI",
  "OpenCV / YOLO",
  "TiDB",
  "算法竞赛",
] as const;

/** 点击技能时展示的关联说明（短、具体） */
export const SKILL_FOCUS: Record<string, string> = {
  HTML: "结构层基础",
  CSS: "视觉与布局",
  JavaScript: "浏览器端交互基础",
  TypeScript: "本站与后台管理的主要语言",
  React: "交互界面与组件化",
  "Next.js": "个人站前端框架",
  Tailwind: "快速打磨视觉细节",
  Framer: "动效与过渡",
  Redux: "状态管理",
  "Node.js": "工具链与脚本能力",
  Express: "轻量 HTTP 服务",
  MySQL: "物联网陪护等项目的数据层",
  TiDB: "分布式 SQL / 本站可选库",
  PostgreSQL: "关系型数据备选",
  MongoDB: "文档型数据",
  Prisma: "类型安全 ORM",
  GraphQL: "灵活查询层",
  Firebase: "快速后端能力",
  Docker: "环境隔离与部署",
  Go: "高并发服务向",
  "React Native": "跨端移动端",
  Tauri: "桌面端壳层",
  Figma: "界面设计协作",
  "C / C++": "蓝桥杯 / 天梯赛主战场",
  "C/C++": "蓝桥杯 / 天梯赛主战场",
  Python: "OpenCV · YOLO · FastAPI",
  Java: "Spring Boot 全栈与物联网后端",
  "Vue / Uniapp": "派陪跨端小程序",
  Uniapp: "跨端小程序与 H5",
  "Spring Boot": "Java 后端工程化",
  FastAPI: "本站 API 与内容管理",
  "OpenCV / YOLO": "浓烟人体判别系统",
  "OpenCV/YOLO": "浓烟人体判别系统",
  算法竞赛: "蓝桥杯国奖 · 天梯赛国奖",
  "Vue/Uniapp": "派陪跨端小程序",
  "Spring Boot/FastAPI": "Java / Python 后端双栈",
  "MySQL/TiDB": "关系型与分布式数据",
};

export const SKILL_DATA = SKILL_GROUPS[0].skills;
export const FRONTEND_SKILL = SKILL_GROUPS[0].skills;
export const BACKEND_SKILL = SKILL_GROUPS[1].skills;
export const FULLSTACK_SKILL = SKILL_GROUPS[2].skills;
export const OTHER_SKILL = [] as const;

export const SOCIALS = [
  {
    name: "GitHub",
    icon: RxGithubLogo,
    link: "https://github.com/djxqwq",
  },
  {
    name: "CSDN",
    icon: FaBook,
    link: "https://blog.csdn.net/2302_79866931",
  },
  {
    name: "Email",
    icon: FaEnvelope,
    link: "mailto:1075751918@qq.com",
  },
] as const;

export const PROJECTS = [
  {
    title: "派陪 · Pepper 机器人智能养老护理",
    description:
      "基于 Uniapp 跨端养老小程序，打通健康数据可视化与 Pepper 机器人集成。",
    detail:
      "面向养老场景的跨端小程序：健康数据可视化、陪护提醒与 Pepper 机器人能力集成。\n\n亮点：首屏加载提速约 30%；支撑挑战杯人工智能+专项赛省级铜奖。\n技术：Uniapp · 小程序 · 跨端交互。",
    image: "/projects/project-1.png",
    tags: ["Uniapp", "小程序", "跨端"],
    links: {
      demo: "https://723539.xyz",
    },
  },
  {
    title: "基于物联网的养老陪护系统",
    description:
      "Java/Python 后端 + MySQL，多设备健康指标实时同步的养老陪护系统。",
    detail:
      "国家级大学生创新创业训练计划项目（核心成员 2/5）。多设备健康指标采集与同步，覆盖陪护场景闭环。\n\n软著登记号：2025R11L3781196。\n技术：Java · Python · MySQL · 物联网。",
    image: "/projects/project-2.png",
    tags: ["Java", "Python", "MySQL", "物联网"],
    links: {
      docs: "https://blog.csdn.net/2302_79866931",
    },
  },
  {
    title: "浓烟环境人体目标判别系统",
    description:
      "OpenCV + YOLOv5 火灾救援视觉判别系统，适配 Windows/Ubuntu。",
    detail:
      "面向浓烟/火灾救援场景的人体目标判别：单帧处理 ≤100ms，人体识别准确率 ≥80%。\n\n技术：Python · OpenCV · YOLOv5。",
    image: "/projects/project-3.png",
    tags: ["Python", "OpenCV", "YOLOv5"],
    links: {},
  },
  {
    title: "全栈开发实践项目",
    description: "Vue.js + Spring Boot + MySQL 课程全栈闭环实践。",
    detail:
      "从前端交互到后端接口与数据持久化的完整练习项目，沉淀全栈工程化经验。\n\n技术：Vue.js · Spring Boot · MySQL。",
    image: "/projects/project-1.png",
    tags: ["Vue.js", "Spring Boot", "MySQL"],
    links: {
      github: "https://github.com/djxqwq",
    },
  },
] as const;

export const EDUCATION = [
  {
    period: "2023-09 ~ 至今",
    title: "浙江财经大学 · 软件工程（本科）",
    detail: "GPA 3.77/5.0 · 专业综合测评前 10%",
  },
  {
    period: "2023-09 ~ 2025-06",
    title: "计算机 ACM 协会 · 干事 → 社长",
    detail:
      "搭建三级培养体系，组织活动 18+ 场，覆盖 300+ 人次；协会获奖同比提升 40%。",
  },
] as const;

export const HONORS = [
  "第十六届蓝桥杯 C++ 全国总决赛二等奖 / 省一等奖",
  "第十五届蓝桥杯 C++ 全国总决赛三等奖 / 省一等奖",
  "第十届天梯赛全国总决赛团队二等奖",
  "挑战杯人工智能+专项赛省级铜奖",
  "国家级大学生创新创业训练计划项目（核心成员 2/5）",
  "软件著作权：基于物联网的养老陪护系统",
] as const;

export const FOOTER_DATA = [
  {
    title: "社区",
    data: [
      {
        name: "GitHub",
        icon: RxGithubLogo,
        link: "https://github.com/djxqwq",
      },
      {
        name: "CSDN",
        icon: FaBook,
        link: "https://blog.csdn.net/2302_79866931",
      },
      {
        name: "个人博客",
        icon: FaBook,
        link: "https://723539.xyz",
      },
    ],
  },
  {
    title: "联系",
    data: [
      {
        name: "GitHub",
        icon: RxGithubLogo,
        link: "https://github.com/djxqwq",
      },
      {
        name: "邮箱",
        icon: FaEnvelope,
        link: "mailto:1075751918@qq.com",
      },
      {
        name: "QQ",
        icon: RxLinkedinLogo,
        link: "mailto:1075751918@qq.com",
      },
    ],
  },
  {
    title: "关于",
    data: [
      {
        name: "关于我",
        icon: null,
        link: "#about-me",
      },
      {
        name: "技能特长",
        icon: null,
        link: "#skills",
      },
      {
        name: "联系我",
        icon: null,
        link: "mailto:1075751918@qq.com",
      },
      {
        name: "内容管理",
        icon: null,
        link: "/admin",
      },
    ],
  },
] as const;

export const NAV_LINKS = [
  { title: "关于", link: "#about-me" },
  { title: "技能", link: "#skills" },
  { title: "项目", link: "#projects" },
  { title: "教育", link: "#education" },
  { title: "荣誉", link: "#honors" },
  { title: "联系", link: "#contact" },
] as const;

export const LINKS = {
  sourceCode: "/#intro",
  home: "/#intro",
  admin: "/admin",
};
