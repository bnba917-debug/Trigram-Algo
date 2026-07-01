#!/usr/bin/env bash
# =============================================================================
# Docker 首次部署
# 用法:
#   chmod +x deploy/docker-deploy.sh deploy/docker-update.sh
#   ./deploy/docker-deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"
cd "${APP_DIR}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "缺少命令: $1"
    exit 1
  fi
}

# 检测 docker compose 命令
compose() {
  if docker compose version &>/dev/null; then
    docker compose "$@"
  elif command -v docker-compose &>/dev/null; then
    docker-compose "$@"
  else
    error "未找到 docker compose，请先安装 Docker"
    exit 1
  fi
}

info "检查 Docker..."
require_cmd docker
compose version

# 拉取代码（若已是 git 仓库）
if [[ -d "${APP_DIR}/.git" ]]; then
  info "拉取最新代码..."
  git pull --ff-only origin master 2>/dev/null || git pull --ff-only origin main 2>/dev/null || true
fi

# 环境变量
if [[ ! -f "${APP_DIR}/.env" ]]; then
  if [[ -f "${APP_DIR}/deploy/env.production.example" ]]; then
    cp "${APP_DIR}/deploy/env.production.example" "${APP_DIR}/.env"
    warn ".env 已从模板创建，请编辑后重新运行:"
    warn "  nano ${APP_DIR}/.env"
    exit 1
  else
    error "缺少 .env 文件"
    exit 1
  fi
fi

if grep -qE '^ADMIN_PASSWORD=(请替换|changeme|$)' "${APP_DIR}/.env" 2>/dev/null; then
  error "请修改 .env 中的 ADMIN_PASSWORD"
  exit 1
fi

info "构建 Docker 镜像..."
compose build --pull

info "启动容器..."
compose up -d

info "等待健康检查..."
sleep 5

if curl -sf "http://127.0.0.1:3000/api/status" >/dev/null 2>&1; then
  info "应用健康检查通过"
else
  warn "健康检查未通过，查看日志: docker compose logs -f"
fi

compose ps

echo ""
info "=========================================="
info " Docker 部署完成"
info "=========================================="
info " 本地地址 : http://127.0.0.1:3000"
info " 域名     : https://${DOMAIN}"
info ""
info " 常用命令:"
info "   docker compose ps"
info "   docker compose logs -f"
info "   ./deploy/docker-update.sh"
info ""

if [[ $EUID -ne 0 ]]; then
  warn "Nginx 配置需要 root，请执行:"
  echo "  sudo ${APP_DIR}/deploy/nginx-install.sh"
else
  bash "${APP_DIR}/deploy/nginx-install.sh"
fi

if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  warn "尚未配置 SSL，请执行:"
  echo "  SSL_EMAIL=your@email.com sudo ${APP_DIR}/deploy/ssl-setup.sh"
fi
