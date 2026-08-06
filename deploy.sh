#!/bin/bash
# ============================================================
#  一键部署脚本 — 723539.xyz
#  在服务器上执行：bash deploy.sh
# ============================================================
set -e

DOMAIN="723539.xyz"
EMAIL="admin@${DOMAIN}"
PROJECT_DIR="/opt/blog"

echo "=========================================="
echo "  部署 ${DOMAIN}"
echo "=========================================="

# ---- 1. 安装系统依赖 ----
echo "[1/6] 安装 Docker / Nginx / Certbot..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx > /dev/null

# ---- 2. 拉取代码（首次） ----
echo "[2/6] 检查项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo "请先将项目代码上传到 ${PROJECT_DIR}"
    echo "  方式1: git clone <仓库地址> ${PROJECT_DIR}"
    echo "  方式2: scp -r ./个人网站 root@服务器IP:${PROJECT_DIR}"
    exit 1
fi

cd "$PROJECT_DIR"

# ---- 3. 检查 .env ----
echo "[3/6] 检查后端配置..."
if [ ! -f backend/.env ]; then
    echo "错误: backend/.env 不存在，请创建后重试"
    exit 1
fi

# ---- 4. 启动 Docker 容器 ----
echo "[4/6] 构建 & 启动容器..."
docker compose up -d --build
echo "等待服务启动..."
sleep 8

# 健康检查
if curl -sf http://127.0.0.1:8000/api/health > /dev/null; then
    echo "  ✓ 后端正常"
else
    echo "  ✗ 后端未就绪，检查: docker logs blog-backend"
fi
if curl -sf http://127.0.0.1:3000 > /dev/null; then
    echo "  ✓ 前端正常"
else
    echo "  ✗ 前端未就绪，检查: docker logs blog-frontend"
fi

# ---- 5. 配置 Nginx ----
echo "[5/6] 配置 Nginx..."
cp nginx/${DOMAIN}.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---- 6. 申请 SSL 证书 ----
echo "[6/6] 申请 Let's Encrypt 证书..."
certbot --nginx \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    -m ${EMAIL} \
    --redirect \
    || echo "  ⚠ 证书申请失败，可手动运行: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

# 设置自动续期（已由 certbot 定时任务自动处理）
echo ""
echo "=========================================="
echo "  ✓ 部署完成！"
echo "=========================================="
echo "  站点:  https://${DOMAIN}"
echo "  后台:  https://${DOMAIN}/admin"
echo "  API:   https://${DOMAIN}/api/health"
echo "  日志:  docker compose logs -f"
echo "  重启:  docker compose restart"
echo "=========================================="
