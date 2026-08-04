# 开源资源与风格选型（静态预览阶段）

## 风格方向（已落地）

- **深空黑底 + 电青 / 终端绿**：避免紫白渐变、奶油衬线等常见 AI 默认风
- 字体：Orbitron（标题）+ JetBrains Mono（正文/终端）
- 参考仓库：
  - [VertexHQ/cyberpunk-react-dev-portfolio](https://github.com/VertexHQ/cyberpunk-react-dev-portfolio) — 霓虹玻璃拟态
  - [McKlay/portfolio-website](https://github.com/McKlay/portfolio-website) — 宇宙星空分层
  - [Simone-techAIGC/cyber-portfolio](https://github.com/Simone-techAIGC/cyber-portfolio) — 赛博终端 + 代码雨气质
  - [AjinkyaGokhale/react-portfolio-template](https://github.com/AjinkyaGokhale/react-portfolio-template) — 单页分区骨架

## 特效复用

| 能力 | 来源 |
|------|------|
| Three.js Points 星空 | three.js Points API + McKlay 星空分层思路 |
| 代码雨 | 经典 Canvas Matrix + [Rezmason/matrix](https://github.com/Rezmason/matrix) 交互语义（光标扰动） |
| 卡片倾斜 | `react-parallax-tilt` |
| 动效入场 | `framer-motion` |
| 流体（下一步） | [`three-fluid-fx`](https://github.com/artcodev/three-fluid-fx) + makemepulse 长按语义 |
| 交互参考 | [2016.makemepulse.com](https://2016.makemepulse.com)（仅交互，不照搬页面） |

## 数据与后端（下一步）

- **数据库改为 TiDB**（MySQL 协议），不再用 SQLite
- FastAPI + SQLAlchemy/SQLModel，连接串形如：
  `mysql+pymysql://user:pass@tidb-host:4000/dbname`
- 火山云服务器部署 API；前台静态可由 Nginx 托管

## 本地预览

```bash
cd frontend
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173 ）。
