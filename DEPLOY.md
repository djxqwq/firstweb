# 部署指南 — 723539.xyz

## 架构

```
浏览器 → https://723539.xyz
              ↓
         Nginx (宿主机 80/443)
         ├── /api/*      → Docker: backend:8000
         ├── /uploads/*  → Docker: backend:8000
         ├── /docs       → Docker: backend:8000 (可选)
         └── 其他        → Docker: frontend:3000
              ↓
         TiDB Cloud (ap-southeast-1)
```

## 前置条件

1. **服务器**：Ubuntu/Debian，已开放 80/443 端口
2. **域名**：`723539.xyz` 和 `www.723539.xyz` A 记录指向服务器 IP
3. **TiDB Cloud**：已放行服务器 IP，已获取连接信息
4. **代码**：已上传到 GitHub 仓库

## 首次部署

### 1. 服务器上准备代码

```bash
ssh root@你的服务器IP
git clone <仓库地址> /opt/blog
cd /opt/blog
```

### 2. 配置后端环境

```bash
# 编辑生产配置（填入 TiDB 密码等）
vi backend/.env
```

确保 `.env` 内容：
```
SECRET_KEY=<强随机值>
ADMIN_USER=1075751918
ADMIN_PASSWORD=<强密码>
DATABASE_URL=mysql+pymysql://<user>:<pass>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/blog?charset=utf8mb4
CORS_ORIGINS=https://723539.xyz,https://www.723539.xyz
```

### 3. 一键部署

```bash
bash deploy.sh
```

脚本会自动：安装 Docker/Nginx/Certbot → 构建启动容器 → 配置 Nginx → 申请 SSL 证书

### 4. 验证

```bash
curl https://723539.xyz/api/health
# 返回 {"ok":true,"db":"mysql"}
```

## 自动部署（GitHub Actions）

### 配置 Secrets

GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Secret | 值 |
|--------|-----|
| `SSH_HOST` | 服务器公网 IP |
| `SSH_USER` | `root` |
| `SSH_KEY` | SSH 私钥完整内容 |
| `SSH_PORT` | `22` |

### 服务器上生成 SSH 密钥

```bash
ssh root@服务器IP
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions  # 复制到 GitHub Secret SSH_KEY
```

### 触发部署

```bash
git push origin main
```

修改 `frontend/`、`backend/`、`nginx/`、`docker-compose.yml` 会自动触发部署。

## 常用运维命令

```bash
# 查看日志
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# 重启服务
docker compose restart

# 重新构建
docker compose up -d --build

# 查看状态
docker compose ps

# 进入容器
docker compose exec backend bash
docker compose exec frontend sh

# Nginx 操作
nginx -t              # 测试配置
systemctl reload nginx # 重载配置

# 证书续期（自动，也可手动）
certbot renew --dry-run
```

## 备份

```bash
# 备份数据库（在服务器执行）
docker compose exec backend python -c "
from app.main import SessionLocal, Content, Setting
import json
db = SessionLocal()
# 导出逻辑按需编写
"

# 备份上传文件
docker run --rm -v blog-backend-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

## 故障排查

| 问题 | 排查 |
|------|------|
| 网站打不开 | `docker compose ps` 看容器是否运行 |
| 502 Bad Gateway | `docker compose logs backend` 看后端日志 |
| API 报错 | `curl http://127.0.0.1:8000/api/health` 本地测试 |
| 数据库连接失败 | 检查 TiDB Cloud IP 白名单是否包含服务器 IP |
| 证书过期 | `certbot renew && systemctl reload nginx` |
| 图片不显示 | 检查 nginx `/uploads/` 反代是否正常 |

## 注意事项

- `backend/.env` 不在 git 中，服务器上手动维护
- 上传文件存在 Docker 卷 `backend-uploads`，容器重启不丢失
- `docker compose down` 不会删除卷，`docker compose down -v` 会删除卷（慎用）
- 前端环境变量 `NEXT_PUBLIC_API_BASE` 为空（同源请求），构建时注入
