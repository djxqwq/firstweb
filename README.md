# 邓锦鑫 · 个人技术博客

正常可浏览的个人网站（不是终端解密站）。

## 怎么访问

| 页面 | 地址 | 说明 |
|------|------|------|
| 炫酷入口 | http://localhost:8080 | 流体背景 + 贪吃蛇名片 |
| **个人作品站** | http://127.0.0.1:3000 | 关于 / 技能 / 项目 / 教育 / 荣誉 / 联系 |
| 管理后台 | http://127.0.0.1:3001/admin | 改内容用（访客不用看） |
| API | http://127.0.0.1:8000/docs | 后端 |

流程：打开 8080 → 点「进入」→ 点「作品集」进入正常个人站。

## 技术来源

- 入口：[Tomotoes/HomePage](https://github.com/Tomotoes/HomePage)
- 作品站：[sanidhyy/space-portfolio](https://github.com/sanidhyy/space-portfolio)
- 后端：FastAPI + TiDB（本地可 SQLite）

## 启动

```bat
scripts\start.bat
```

或分别启动 `home`（8080）、`frontend`（3000）、`backend`（8000）。
