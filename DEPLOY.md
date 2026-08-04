# 部署说明（火山云 + TiDB）

## 架构

- **主页**：`home/` = [Tomotoes/HomePage](https://github.com/Tomotoes/HomePage)（流体 + 贪吃蛇）
- **档案/项目终端 + 管理台**：`about-web/` = [Tomotoes/react-terminal](https://github.com/Tomotoes/react-terminal)
- **后端**：`backend/` FastAPI，数据库 **TiDB**（MySQL 协议）

## 本地一键

```bat
scripts\start.ps1
```

或分别：

```bash
# API
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000

# 主页
cd home && npm i && npm run dev

# 终端+后台
cd about-web && npm i && npm run dev
```

- 主页 http://localhost:8080  
- 终端 http://127.0.0.1:3001  
- 管理 http://127.0.0.1:3001/admin （默认 `admin` / `changeme123`）  
- Swagger http://127.0.0.1:8000/docs  

## TiDB 配置

在 `.env`：

```env
DATABASE_URL=mysql+pymysql://USER:PASSWORD@TIDB_HOST:4000/DBNAME?charset=utf8mb4
SECRET_KEY=请换成长随机串
ADMIN_USER=admin
ADMIN_PASSWORD=请换成强密码
```

重启 uvicorn 后自动建表并写入种子数据（邓锦鑫项目/教育/荣誉/技能）。

## Nginx 示例

```nginx
server {
  listen 80;
  server_name your.domain;

  location / {
    root /var/www/home/dist;
    try_files $uri /index.html;
  }

  location /archive/ {
    alias /var/www/about-web/dist/;
    try_files $uri /archive/index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:8000/uploads/;
  }
}
```

systemd 跑 uvicorn：

```ini
[Unit]
Description=dengjinxin-blog-api
After=network.target

[Service]
WorkingDirectory=/opt/blog/backend
EnvironmentFile=/opt/blog/backend/.env
ExecStart=/opt/blog/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

## 管理能力（对应你的目标）

- 个人信息 / 项目 / 教育 / 荣誉 / 技能 CRUD  
- 留言入库、访客统计与 CSV 导出  
- 单人 JWT，无注册  
- 前台终端命令实时读 API（API 挂了也能用离线种子）
