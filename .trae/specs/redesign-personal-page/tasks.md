# Tasks

## Phase 0: 清理旧代码
- [x] Task 0: 移除所有老旧特效代码
  - [x] 0.1 移除 `theme/index.js` 中的鼠标拖尾特效（createCursorTrail）
  - [x] 0.2 移除 `theme/index.js` 中的点击烟花特效（createClickEffect）
  - [x] 0.3 移除 `custom.css` 中旧特效相关动画（clickRipple、clickParticle、fireworkCore、fireworkSpark、fireworkTrail、fireworkStar）
  - [x] 0.4 精简 `theme/index.js`，仅保留基础主题扩展入口

## Phase 1: 基础设施搭建
- [ ] Task 1: 创建项目目录结构
  - [ ] 1.1 创建 `docs/.vitepress/theme/components/` 目录
  - [ ] 1.2 创建 `docs/.vitepress/theme/styles/` 目录
  - [ ] 1.3 创建 `docs/.vitepress/theme/utils/` 目录
  - [ ] 1.4 创建 `docs/.vitepress/theme/composables/` 目录
  - [ ] 1.5 创建 `docs/.vitepress/theme/backgrounds/` 目录

- [ ] Task 2: 建立设计令牌系统
  - [ ] 2.1 创建 `styles/tokens.css`，定义颜色、间距、字体、阴影、圆角等基础变量
  - [ ] 2.2 创建 `styles/themes.css`，定义深色/浅色主题变量
  - [ ] 2.3 创建 `styles/animations.css`，定义通用动画关键帧（fadeIn、slideUp、glow、shimmer等）
  - [ ] 2.4 创建 `styles/responsive.css`，定义响应式断点 mixin

- [ ] Task 3: 开发背景统一接口
  - [ ] 3.1 创建 `backgrounds/BackgroundManager.js`，统一管理所有背景的注册/销毁/切换
  - [ ] 3.2 创建 `components/InteractiveBackground.vue`，通用背景容器组件（自动根据路由/区域切换背景）
  - [ ] 3.3 实现背景间的淡入淡出过渡效果
  - [ ] 3.4 实现性能检测与自动降级机制

## Phase 2: 多处差异化互动背景开发
- [ ] Task 4: 首页英雄区域 — WebGL 流体背景
  - [ ] 4.1 创建 `backgrounds/FluidBackground.js`
  - [ ] 4.2 实现 WebGL 流体模拟 Shader（基于 Navier-Stokes 方程简化版）
  - [ ] 4.3 实现鼠标交互：移动产生流体扰动和色彩变化
  - [ ] 4.4 实现深色/浅色主题适配

- [ ] Task 5: 首页内容区域 — 3D 粒子星空
  - [ ] 5.1 创建 `backgrounds/StarFieldBackground.js`
  - [ ] 5.2 使用 Three.js 实现 3D 粒子星空渲染
  - [ ] 5.3 实现粒子远近层次和闪烁效果
  - [ ] 5.4 实现鼠标视差和滚动视差效果
  - [ ] 5.5 实现鼠标引力场效果

- [ ] Task 6: 项目页 — 几何网格背景
  - [ ] 6.1 创建 `backgrounds/GeometricGridBackground.js`
  - [ ] 6.2 使用 Canvas 2D 实现动态连线网格
  - [ ] 6.3 实现鼠标靠近时节点高亮并产生波纹扩散
  - [ ] 6.4 实现网格随滚动缓慢漂移

- [ ] Task 7: 教育页 — 粒子流背景
  - [ ] 7.1 创建 `backgrounds/ParticleFlowBackground.js`
  - [ ] 7.2 使用 Canvas 2D 实现粒子沿曲线路径流动
  - [ ] 7.3 实现鼠标扰动改变粒子流向
  - [ ] 7.4 实现柔和的渐变色粒子

- [ ] Task 8: 技能页 — 极光背景
  - [ ] 8.1 创建 `backgrounds/AuroraBackground.js`
  - [ ] 8.2 使用 WebGL Shader 实现极光模拟
  - [ ] 8.3 实现鼠标移动改变极光颜色和形态
  - [ ] 8.4 实现极光自然波动效果

- [ ] Task 9: 荣誉页 — 金色粒子背景
  - [ ] 9.1 创建 `backgrounds/GoldenParticleBackground.js`
  - [ ] 9.2 使用 Canvas 2D 实现金色光点缓缓上升
  - [ ] 9.3 实现鼠标点击产生扩散波纹
  - [ ] 9.4 实现粒子大小和透明度随机变化

- [ ] Task 10: 联系页 — 水波纹背景
  - [ ] 10.1 创建 `backgrounds/RippleBackground.js`
  - [ ] 10.2 使用 Canvas 2D 实现水波纹效果
  - [ ] 10.3 实现鼠标移动产生涟漪扩散
  - [ ] 10.4 实现多涟漪叠加和衰减

## Phase 3: 高级交互特效
- [ ] Task 11: 开发高级交互 composables
  - [ ] 11.1 创建 `composables/useScrollAnimation.js`，滚动驱动的入场/退场动画
  - [ ] 11.2 创建 `composables/useMagneticHover.js`，磁性悬浮效果（元素被鼠标吸引）
  - [ ] 11.3 创建 `composables/useParallax.js`，多层视差滚动
  - [ ] 11.4 创建 `composables/useReveal.js`，内容渐显动画（基于 Intersection Observer）

## Phase 4: 核心 UI 组件开发
- [ ] Task 12: 开发玻璃态卡片组件
  - [ ] 12.1 创建 `components/GlassCard.vue` 组件
  - [ ] 12.2 实现毛玻璃效果（backdrop-filter）和动态边框光效
  - [ ] 12.3 实现 3D 倾斜悬浮效果（鼠标位置驱动）
  - [ ] 12.4 支持多种卡片变体（项目卡、技能卡、导航卡）

- [ ] Task 13: 开发渐变文字与排版组件
  - [ ] 13.1 创建 `components/GradientText.vue` 组件，实现动态渐变流动效果
  - [ ] 13.2 创建 `components/AnimatedHeading.vue` 组件，标题入场动画
  - [ ] 13.3 支持多种渐变预设和动画模式

- [ ] Task 14: 开发技能标签与导航组件
  - [ ] 14.1 创建 `components/SkillTag.vue` 组件，带光效的标签
  - [ ] 14.2 创建 `components/NavCard.vue` 组件，3D 悬浮导航卡片
  - [ ] 14.3 创建 `components/SectionReveal.vue` 组件，区域滚动渐显容器

## Phase 5: 页面重构
- [ ] Task 15: 重构首页
  - [ ] 15.1 重构 `docs/index.md`，集成流体背景（英雄区）+ 星空（内容区）
  - [ ] 15.2 重新设计英雄区域：全屏沉浸式，流体背景 + 渐变文字 + 打字机效果
  - [ ] 15.3 重新设计关于我区域：滚动渐显 + 玻璃态卡片
  - [ ] 15.4 重新设计技能展示区域：3D 倾斜卡片 + 光效标签
  - [ ] 15.5 重新设计导航卡片区域：磁性悬浮 + 3D 动效
  - [ ] 15.6 添加全局滚动动画和视差效果

- [ ] Task 16: 重构项目页
  - [ ] 16.1 重构 `docs/projects/index.md`，使用 GlassCard + 几何网格背景
  - [ ] 16.2 重构项目详情页模板（project-a/b/c/d.md）

- [ ] Task 17: 重构教育页
  - [ ] 17.1 重构 `docs/education.md`，时间轴布局 + 粒子流背景 + 滚动动画

- [ ] Task 18: 重构技能页
  - [ ] 18.1 重构 `docs/skills.md`，分类卡片 + 极光背景 + 进度展示

- [ ] Task 19: 重构荣誉页
  - [ ] 19.1 重构 `docs/honors.md`，奖项展示 + 金色粒子背景 + 数据高亮

- [ ] Task 20: 重构联系页
  - [ ] 20.1 重构 `docs/contact.md`，联系卡片 + 水波纹背景 + 社交链接

## Phase 6: 主题系统集成
- [ ] Task 21: 重构主题入口
  - [ ] 21.1 重写 `theme/index.js`，注册 BackgroundManager 和所有新组件
  - [ ] 21.2 集成 Umami Analytics 脚本注入
  - [ ] 21.3 实现深色/浅色模式平滑过渡

- [ ] Task 22: 重构样式系统
  - [ ] 22.1 重写 `theme/custom.css`，引入设计令牌，移除所有冗余样式
  - [ ] 22.2 重构导航栏样式：玻璃态 + 滚动变化
  - [ ] 22.3 重构侧边栏样式：现代化设计
  - [ ] 22.4 完善响应式断点系统

## Phase 7: 访客统计集成
- [ ] Task 23: 集成 Umami Analytics
  - [ ] 23.1 在 VitePress 配置中注入 Umami 跟踪脚本
  - [ ] 23.2 创建 `composables/useAnalytics.js`，封装统计 API
  - [ ] 23.3 在首页添加访客统计展示组件（总访问量、今日访问等）

## Phase 8: 性能优化与测试
- [ ] Task 24: 性能优化
  - [ ] 24.1 优化所有背景效果（帧率控制、离屏暂停、按需渲染）
  - [ ] 24.2 实现背景组件按需懒加载
  - [ ] 24.3 优化构建产物体积（Tree Shaking、代码分割）

- [ ] Task 25: 测试与验证
  - [ ] 25.1 在 Chrome/Firefox/Safari 中测试所有背景效果
  - [ ] 25.2 在移动端设备测试（触摸交互适配）
  - [ ] 25.3 验证性能指标达标（各背景 FPS）
  - [ ] 25.4 验证 Umami 统计数据正确

# Task Dependencies
- [Task 0] 独立，最先执行
- [Task 1, 2] depends on [Task 0]
- [Task 3] depends on [Task 1, 2]
- [Task 4, 5, 6, 7, 8, 9, 10] depends on [Task 3]（7个背景可并行开发）
- [Task 11] depends on [Task 1, 2]（可与背景开发并行）
- [Task 12, 13, 14] depends on [Task 1, 2]（可与背景开发并行）
- [Task 15, 16, 17, 18, 19, 20] depends on [Task 4-14]
- [Task 21, 22] depends on [Task 15-20]
- [Task 23] depends on [Task 21]
- [Task 24] depends on [Task 21, 22, 23]
- [Task 25] depends on [Task 24]
