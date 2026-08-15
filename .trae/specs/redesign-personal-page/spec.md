# 个人主页全面重构与视觉升级 Spec

## Why
当前项目存在两个核心问题：视觉设计陈旧缺乏吸引力，代码结构混乱难以维护。需要通过全面重构实现现代化视觉体验和可持续的代码架构。

## What Changes
- 全新视觉设计系统：采用现代设计语言，建立统一的设计规范
- 多处差异化互动背景：每个页面/区域使用不同的可互动背景效果，营造丰富的视觉层次
- 组件化架构：将页面拆分为独立可复用的 Vue 组件
- 样式系统重构：使用 CSS 变量和模块化样式，提升可维护性
- 访客统计集成：使用 Umami 等第三方服务实现访问数据统计
- 性能优化：懒加载、代码分割、资源优化

## REMOVED Requirements
### Requirement: 老旧特效系统
**Reason**: 鼠标拖尾、点击烟花等特效已过时，视觉效果不佳
**Migration**: 完全移除旧特效代码，用全新的高端特效系统替代

## Impact
- Affected specs: 首页、项目页、技能页、教育页、荣誉页、联系页
- Affected code: 
  - `docs/index.md` - 首页重构
  - `docs/.vitepress/theme/` - 主题系统重构
  - `docs/.vitepress/theme/custom.css` - 样式系统重构
  - `docs/.vitepress/theme/index.js` - 主题入口重构
  - 新增组件目录 `docs/.vitepress/theme/components/`
  - 新增样式目录 `docs/.vitepress/theme/styles/`
  - 新增背景目录 `docs/.vitepress/theme/backgrounds/`

## ADDED Requirements

### Requirement: 多处差异化互动背景系统
系统 SHALL 在不同页面和区域提供多种不同的可互动背景效果，每种背景风格独特且支持用户交互。所有背景通过统一的 BackgroundPlugin 接口注册，支持按需加载和性能自适应。

#### 背景类型规划
- **首页英雄区域**：WebGL 流体背景 — 液态金属质感，鼠标移动产生流体扰动和色彩变化
- **首页内容区域**：3D 粒子星空 — 数千粒子组成的深邃星空，鼠标视差和引力效果
- **项目页**：几何网格背景 — 动态连线网格，鼠标靠近时节点高亮并产生波纹扩散
- **教育页**：粒子流背景 — 柔和粒子沿曲线路径流动，鼠标扰动改变流向
- **技能页**：极光背景 — 模拟北极光效果，鼠标移动改变极光颜色和形态
- **荣誉页**：金色粒子背景 — 金色光点缓缓上升，鼠标点击产生扩散波纹
- **联系页**：水波纹背景 — 鼠标移动产生涟漪扩散效果

#### Scenario: 背景切换
- **WHEN** 用户在不同页面/区域间导航或滚动
- **THEN** 背景效果平滑过渡，无突兀切换感

#### Scenario: 性能自适应
- **WHEN** 设备性能较低
- **THEN** 自动降级为简化版效果，保证流畅体验

#### Scenario: 统一交互接口
- **WHEN** 开发者添加新背景
- **THEN** 通过统一的 BackgroundPlugin 接口注册，无需修改核心代码

### Requirement: 现代化视觉设计系统
系统 SHALL 采用现代化的视觉设计语言，包括渐变、玻璃态、微动效等。

#### Scenario: 玻璃态卡片
- **WHEN** 渲染卡片组件
- **THEN** 使用毛玻璃效果（backdrop-filter），配合半透明背景和边框光效

#### Scenario: 渐变文字
- **WHEN** 渲染标题文字
- **THEN** 使用动态渐变背景，文字呈现流动渐变效果

#### Scenario: 悬浮动效
- **WHEN** 鼠标悬浮在交互元素上
- **THEN** 元素产生平滑的缩放、位移、阴影变化，伴随光晕效果

### Requirement: 模块化组件架构
系统 SHALL 将页面拆分为独立的 Vue 组件，每个组件职责单一、可复用。

#### Scenario: 组件复用
- **WHEN** 需要在多个页面使用相同功能
- **THEN** 可以直接引用已有组件，无需重复代码

#### Scenario: 独立维护
- **WHEN** 需要修改某个功能
- **THEN** 只需修改对应组件，不影响其他部分

### Requirement: 响应式交互系统
系统 SHALL 提供流畅的交互反馈，增强用户体验。

#### Scenario: 页面过渡
- **WHEN** 用户导航到不同页面
- **THEN** 页面内容以优雅的动画过渡呈现

#### Scenario: 加载状态
- **WHEN** 内容正在加载
- **THEN** 显示骨架屏或加载动画，避免空白页面

### Requirement: 访客统计系统
系统 SHALL 集成第三方统计服务，收集访问数据并展示统计信息。

#### Scenario: 访问记录
- **WHEN** 用户访问网站
- **THEN** 自动记录访问时间、页面、来源等信息到统计服务

#### Scenario: 数据展示
- **WHEN** 管理员查看统计面板
- **THEN** 显示访问人数、页面浏览量、访问来源、设备类型等数据

#### Scenario: 隐私保护
- **WHEN** 收集访问数据
- **THEN** 不收集个人身份信息，符合隐私保护规范

## MODIFIED Requirements

### Requirement: 首页布局
将现有的双屏布局优化为更流畅的单页滚动体验，保留核心视觉元素。

#### Scenario: 首屏展示
- **WHEN** 用户访问首页
- **THEN** 展示全屏英雄区域，包含 WebGL 流体背景、个人介绍、技能标签

#### Scenario: 内容滚动
- **WHEN** 用户向下滚动
- **THEN** 背景从流体过渡到 3D 星空，内容区域以视差效果展开，导航栏自动显示/隐藏

### Requirement: 主题系统
扩展现有主题系统，支持深色/浅色模式自动切换，并提供更多主题变体。

#### Scenario: 主题切换
- **WHEN** 用户切换主题
- **THEN** 所有颜色、动效、背景平滑过渡到新主题

## Technical Requirements

### 技术栈
- Vue 3 Composition API
- VitePress 主题扩展
- WebGL / Three.js（流体效果、3D 粒子）
- Canvas 2D API（网格背景、粒子流、水波纹等轻量效果）
- CSS Custom Properties（设计令牌）
- Intersection Observer API（滚动动画）
- Umami Analytics（访客统计）

### 高端特效技术
- WebGL Shader（流体模拟、极光效果）
- Three.js（3D 粒子系统、星空渲染）
- Canvas 2D（几何网格、粒子流、水波纹、金色粒子）
- CSS Custom Properties（设计令牌）

### 性能指标
- 首屏加载时间 < 2s
- WebGL 流体 FPS > 50
- 3D 粒子 FPS > 40
- Canvas 2D 背景 FPS > 55
- 页面交互响应 < 100ms
- 构建产物体积 < 800KB (gzipped)

### 代码规范
- 组件文件大小 < 200 行
- 样式文件按功能模块拆分
- 所有公共函数添加 JSDoc 注释
- 使用 ESLint + Prettier 统一代码风格
