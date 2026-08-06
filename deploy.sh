#!/bin/bash
# ============================================================
#  一键部署脚本 — 723539.xyz
#  在服务器上执行：bash deploy.sh
#  支持非 root 用户（自动加 sudo）
# ============================================================
set -e

DOMAIN="723539.xyz"
EMAIL="admin@${DOMAIN}"
# 自动检测项目目录（脚本所在目录）
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# sudo 前缀：root 不需要，非 root 自动加
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
    # 确保 sudo 可用
    if ! sudo -n true 2>/dev/null; then
        echo "需要 sudo 权限，请输入密码："
        sudo -v
    fi
fi

echo "=========================================="
echo "  部署 ${DOMAIN}"
echo "  目录: ${PROJECT_DIR}"
echo "  用户: $(whoami)"
echo "=========================================="

# ---- 1. 安装系统依赖 ----
echo "[1/6] 安装 Docker / Nginx / Certbot..."
if ! command -v docker &> /dev/null; then
    echo "  安装 Docker..."
    curl -fsSL https://get.docker.com | $SUDO sh
    $SUDO systemctl enable --now docker
fi

# 把当前用户加入 docker 组（免 sudo 运行 docker）
if ! groups | grep -q docker; then
    $SUDO usermod -aG docker "$(whoami)"
    echo "  已将 $(whoami) 加入 docker 组（需重新登录生效）"
fi

$SUDO apt-get update -qq
$SUDO apt-get install -y -qq nginx certbot python3-certbot-nginx curl > /dev/null

# ---- 2. 检查项目目录 ----
echo "[2/6] 检查项目目录..."
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo "错误: 在 ${PROJECT_DIR} 未找到 docker-compose.yml"
    echo "请在项目根目录执行此脚本"
    exit 1
fi

cd "$PROJECT_DIR"

# ---- 3. 检查 .env ----
echo "[3/6] 检查后端配置..."
if [ ! -f backend/.env ]; then
    echo "错误: backend/.env 不存在"
    echo "请创建配置文件：cp backend/.env.example backend/.env && vi backend/.env"
    exit 1
fi

# ---- 4. 启动 Docker 容器 ----
echo "[4/6] 构建 & 启动容器..."
# 如果 docker 命令需要权限，用 sudo
if docker compose up -d --build 2>/dev/null; then
    :
else
    $SUDO docker compose up -d --build
fi
echo "等待服务启动..."
sleep 10

# 健康检查
if curl -sf http://127.0.0.1:8000/api/health > /dev/null; then
    echo "  ✓ 后端正常"
else
    echo "  ✗ 后端未就绪，检查: docker logs blog-backend"
fi
if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "  ✓ 前端正常"
else
    echo "  ⚠ 前端可能还在启动中（正常现象，稍等片刻）"
fi

# ---- 5. 配置 Nginx ----
echo "[5/6] 配置 Nginx..."
$SUDO cp nginx/${DOMAIN}.conf /etc/nginx/sites-available/
$SUDO ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t
$SUDO systemctl reload nginx

# ---- 6. 申请 SSL 证书 ----
echo "[6/6] 申请 Let's Encrypt 证书..."
$SUDO certbot --nginx \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    -m ${EMAIL} \
    --redirect \
    || echo "  ⚠ 证书申请失败，可手动运行: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

# 设置自动续期（已由 certbot 定时任务自动处理）
echo ""
echo "=========================================="
echo "  ✓ 部署完成！"
echo "=========================================="
echo "  站点:  https://${DOMAIN}"
echo "  后台:  https://${DOMAIN}/admin"
echo "  API:   https://${DOMAIN}/api/health"
echo ""
echo "  常用命令:"
echo "    日志:  docker compose logs -f"
echo "    重启:  docker compose restart"
echo "    状态:  docker compose ps"
echo ""
if ! groups | grep -q docker; then
    echo "  ⚠ 请重新登录服务器以生效 docker 组权限"
fi
echo "=========================================="
