# VitePress 技术博客模板（个人主页 + 项目作品集）

这是一个 **VitePress + GitHub Pages** 的静态技术博客模板，专为技术博主和开发者设计。

- 🚀 技术博主风格：个人主页 + 项目作品集展示
- 📱 响应式设计：手机、平板、电脑完美适配
- ⚡ 快速部署：推送到 GitHub 自动更新
- 🎨 简洁干净：无花哨动画，专注内容展示
- 🔧 易于定制：所有内容都是占位符，替换即可使用

## 📋 页面结构

### 🏠 首页（个人主页）
- 个人介绍和头像占位
- 技能栈展示（前端/后端/工具/其他）
- 快速导航卡片（项目/教育/荣誉/联系）

### 🛠️ 项目作品集
- **项目列表页**：卡片式布局展示所有项目
- **项目详情页**：每个项目都有独立页面，包含：
  - 项目简介和核心功能
  - 完整技术栈说明
  - 系统架构图
  - 性能指标和亮点
  - GitHub 和 CSDN 链接

### 📚 其他页面
- 教育背景
- 荣誉证书
- 技能特长
- 联系方式

## 🚀 快速开始

### 1. 环境要求
- Node.js 18+（推荐 20 LTS）
- Git

验证环境：
```bash
node -v
npm -v
```

### 2. 本地运行
```bash
# 克隆项目
git clone <你的仓库地址>
cd 个人博客

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
浏览器打开 `http://localhost:5173` 查看效果。

### 3. 构建与预览
```bash
npm run build
npm run preview
```

## 🌐 GitHub Pages 自动部署

### 1. 创建 GitHub 仓库
1. 在 GitHub 新建仓库（建议名：`tech-blog`）
2. 将项目推送到 `main` 分支

### 2. 开启 Pages
1. 进入仓库 `Settings` → `Pages`
2. `Build and deployment` 选择：`GitHub Actions`
3. 推送代码会自动触发部署

部署成功后访问：`https://<你的用户名>.github.io/<仓库名>/`

### 3. 自定义域名（可选）
- **免费域名**：直接使用 GitHub Pages 默认域名
- **自定义域名**：
  - 购买域名：阿里云/腾讯云/Namecheap 等
  - 在仓库 `Settings` → `Pages` → `Custom domain` 配置
  - 按提示设置 DNS 解析

## 🎨 自定义指南

### 1. 修改个人信息
编辑 `docs/index.md`：
- 替换 `【占位】` 内容为你的真实信息
- 更新头像、技能、介绍等

### 2. 添加项目
- 在 `docs/projects/index.md` 添加新项目卡片
- 创建新的项目详情页（参考 `project-a.md`）
- 更新 `docs/.vitepress/config.js` 的侧边栏配置

### 3. 修改样式
- 主要样式在 `docs/.vitepress/theme/custom.css`
- 可以调整颜色、布局、动画等

### 4. 更新导航
编辑 `docs/.vitepress/config.js`：
- 修改导航栏和侧边栏
- 更新站点标题和描述
- 添加社交媒体链接

## 📁 项目结构

```
个人博客/
├── docs/
│   ├── index.md                 # 首页
│   ├── projects/                # 项目作品集
│   │   ├── index.md            # 项目列表
│   │   ├── project-a.md        # 项目A详情
│   │   ├── project-b.md        # 项目B详情
│   │   ├── project-c.md        # 项目C详情
│   │   └── project-d.md        # 项目D详情
│   ├── education.md            # 教育背景
│   ├── campus.md               # 校园经历
│   ├── honors.md               # 荣誉证书
│   ├── skills.md               # 技能特长
│   ├── contact.md              # 联系方式
│   └── .vitepress/
│       ├── config.js           # VitePress 配置
│       └── theme/
│           ├── index.js        # 主题入口
│           └── custom.css      # 自定义样式
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署
├── package.json                # 项目配置
└── README.md                   # 说明文档
```

## ✨ 特色功能

- 🎯 **技术导向**：专为技术博主设计，突出项目和技术能力
- 📱 **响应式**：完美适配各种设备尺寸
- ⚡ **高性能**：基于 VitePress，加载速度快
- 🔗 **多链接**：每个项目支持 GitHub、CSDN、详情页三种跳转
- 🏷️ **标签系统**：项目技术栈标签，一目了然
- 📊 **数据展示**：性能指标、统计数据等

## 🛠️ 技术栈

- **静态生成**：VitePress
- **样式框架**：CSS Grid + Flexbox
- **部署平台**：GitHub Pages
- **CI/CD**：GitHub Actions
- **图标**：Emoji + VitePress 内置图标

## 📝 许可证

MIT License - 可自由使用和修改

---

> 💡 **提示**：这是一个模板项目，所有内容都是占位符。请根据自己的实际情况替换内容，特别是个人信息、项目描述和链接地址。
