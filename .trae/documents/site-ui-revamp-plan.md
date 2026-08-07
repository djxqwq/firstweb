# 站点 UI 优化与功能完善计划

## Context

用户反馈了 10 项问题，涉及后台显示、个人信息编辑、头像、访客体验、锁网状图、字体、技术栈交互、技能关联、留言社区。核心诉求：风格统一、修复突兀字体、锁图重新布局为"中心放射"、新增留言公开墙。所有改动做完后本地启动验证，再 push 到 GitHub 自动部署。

---

## 任务清单与实现方案

### 1. admin 列表"已发布·80%"显示优化
**文件**：`frontend/app/admin/page.tsx` (L1109-1115)
- 当前：所有类型都拼 `· ${level}%`，skill 的熟练度与发布状态混淆
- 改：level 只在 `item.type === "skill"` 时显示，文案改为 `· 熟练度 80%`

### 2. profile 改为编辑模式（非新增）
**文件**：`frontend/app/admin/page.tsx`
- 当前：profile 可无限新增，但 `get_profile` 只取第一条
- 改：选择 profile 类型时自动加载已有 profile 进编辑模式（`edit(items[0])`）；无 profile 时表单标题显示"创建个人信息"。隐藏 profile 的"新增"语义
- 实现：`loadContents` 后若 `type==="profile"` 且 items 有数据，自动 `edit(items[0])`

### 3. 头像上传修复
**文件**：`frontend/components/sub/hero-content.tsx`（需确认是否用 `<Image>`）
- admin 预览已用 `<img>`（L1008，OK）
- 前台头像显示若用 Next `<Image>` → 改 `<img>` + `resolveMediaUrl`（与封面同修复模式）

### 4. 访客显示重新规划
**文件**：`frontend/app/admin/page.tsx` visits tab (L574-730)
- **IP Hash** → 短彩色标识（前 6 位 + 同 hash 同色块），作为"访客代号"一眼区分同/异人
- **UA** → 解析为友好描述：`Chrome · Windows` / `Safari · iPhone`（写轻量解析函数）
- **来源 referrer** → 解析域名：`google.com`→`Google`，空→`直接访问`，其他取域名
- **路径** → 友好映射：`/`→`首页`，`/admin`→`后台`，其他保留
- **实时更新**：visits tab 激活时每 30 秒轮询 `loadVisits` + 顶部"刷新"按钮 + 最近 5 分钟的行高亮（新访客标记）
- 新增 `parseUA(ua)` / `parseReferrer(ref)` / `parsePath(path)` 辅助函数

### 5. 锁网状图：中心放射布局（重写）
**文件**：`frontend/components/main/encryption.tsx` (L27-42 MESH_NODES + L173-246 渲染)
- **布局**：中心 1 个核心节点（"全栈"或头像）+ 12 节点等距均匀环绕（固定 radius=170，角度均分 30°）
- **连线**：中心 → 每个外圈节点（放射线）+ 相邻外圈节点连接（成环）
- **节点统一**：固定圆形（w-16 h-16），label 居中或下方，尺寸不再随文字变化
- **交互**（移除 `pointer-events-none`，节点可交互）：
  - hover 节点 → 高亮该节点 + 从中心到它的放射线 + 相邻连线，其他节点/线变暗（opacity 0.25）
  - hover 显示 tooltip：技术简述（如 "C/C++ · 系统级与算法主力"）
- 保留：锁 SVG、磁吸 hover、粒子爆炸、脉冲光环、背景视频
- 节点数据精简为 12 个（去掉冗余），每个加 `desc` 字段用于 tooltip

### 6. 字体优化（只改突兀的，同风格）
**文件**：`frontend/app/globals.css` + `components/sub/skill-text.tsx` + `components/main/encryption.tsx`
- **cursive 类**（globals.css L1-9）：`Cedarville Cursive` 是英文花体，应用到中文回退系统字体显示丑
  - 改 `@import` 引入 `Ma Shan Zheng`（马善政，Google Fonts 免费中文手写体）
  - `.cursive { font-family: "Ma Shan Zheng", "Cedarville Cursive", cursive; }`
  - 受益文案：skill-text "算法竞赛·物联网·人工智能"、encryption "用扎实算法与工程能力..."
- **突兀纯文本**（skill-text L29 "用现代技术栈构建可靠系统"，纯白无特效）→ 加渐变文字特效（复用 `.Welcome-text` 渐变样式或 `bg-gradient-to-r bg-clip-text text-transparent`），与标题风格统一
- **body 字体栈**（globals.css body）：加中文回退 `-apple-system, "PingFang SC", "Microsoft YaHei"`，让 Inter 缺中文时回退优雅
- 不动：已有渐变/发光样式的标题（Hero 等）保持原样

### 7. 技术栈节点统一 + 交互（与任务5合并）

### 8. 技能关联项目后台可编辑
**文件**：`backend/app/main.py` + `frontend/app/admin/page.tsx` + `frontend/components/main/skills.tsx`
- **后端**：`get_skills` 返回已含 `links`（`content_to_out` 已解析 `links_json`）；无需改后端，复用 `links_json` 存 `{"related":[1,2]}`（项目 content id）
- **admin**：skill 编辑表单加"关联项目"多选 checkbox（从已发布项目列表 `items` 中选，存到 `form.links` 为 `{"related":[id,...]}` JSON）
- **前端 skills.tsx**：`fetchSkills` + `fetchProjects` 后，用 skill.links.related 匹配项目 id（替代当前的 `PROJECTS` 标签模糊匹配 L15-23）；无 related 时回退标签匹配

### 9. 留言社区（公开墙 + 管理员回复）
**后端 `backend/app/main.py`**：
- `post_message` 改 `published=True`（直接公开）
- 复用 `body_json` 存元信息：`{"is_admin": false, "reply_to": null}`
- 新增 `GET /api/messages?limit=30`：公开返回最近 published 留言（含管理员回复，按时间倒序）
- 新增 `POST /api/admin/messages/{id}/reply`：admin 回复，创建 `is_admin=True, reply_to=id` 的留言
- 删除留言复用现有 `DELETE /api/admin/contents/{id}`
**前端 `contact.tsx`**：
- 表单下方加留言墙：卡片式（称呼 + 时间 + 内容），管理员回复高亮（紫色边框 + "博主"标签）
- 加载时 `fetch("/api/messages")`，提交后刷新
**admin/page.tsx messages tab**：
- 已有列表 + 编辑/删除；加"回复"按钮 → 调 `/api/admin/messages/{id}/reply`

### 10. 本地启动验证
- 后端：`uvicorn app.main:app --reload --port 8000`（backend 目录）
- 前端：`npm run dev`（frontend 目录，加载 `.env.development`）
- 验证：字体显示、锁中心放射图 hover 交互、profile 编辑、头像显示、访客友好显示+轮询、技能关联、留言墙

---

## 关键文件清单

| 文件 | 改动 |
|------|------|
| `backend/app/main.py` | post_message 改公开 + GET /api/messages + POST reply + get_skills 无需改 |
| `frontend/app/globals.css` | cursive 换 Ma Shan Zheng + body 字体栈 |
| `frontend/components/main/encryption.tsx` | 中心放射布局重写 + 节点统一 + hover 交互 |
| `frontend/components/sub/skill-text.tsx` | 标题加渐变特效 |
| `frontend/components/main/skills.tsx` | 关联项目改用 API links.related |
| `frontend/components/main/contact.tsx` | 新增留言墙 + 管理员回复展示 |
| `frontend/app/admin/page.tsx` | profile 编辑模式 + level 显示 + 访客友好化+轮询 + 技能关联多选 + 留言回复 |
| `frontend/components/sub/hero-content.tsx` | 头像 `<Image>`→`<img>`（如需要） |
| `frontend/lib/api.ts` | 加 fetchMessages + replyMessage |

---

## 验证方式

1. 本地启动后端（8000）+ 前端（3000，加载 .env.development 指向 localhost:8000）
2. 逐项验证：
   - 字体：cursive 文案显示中文手写体；标题渐变特效
   - 锁：点击展开中心放射图，hover 节点高亮关联线、显示 tooltip
   - profile：后台选"个人信息"自动进编辑，无新增
   - 头像：上传后前台 hero 显示正常
   - 访客：UA/来源/路径友好显示，30 秒自动刷新，新访客高亮
   - 技能关联：后台勾选项目，前台 hover 技能显示对应项目
   - 留言：提交后留言墙显示，admin 回复高亮
3. `npx tsc --noEmit` 零错误 + `python -c "ast.parse"` 语法 OK
4. 通过后 commit + push，GitHub Actions 自动部署
