#!/usr/bin/env bash
# =============================================================================
# Docker 日常更新
# 用法: ./deploy/docker-update.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${APP_DIR}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

compose() {
  if docker compose version &>/dev/null; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

# shellcheck source=docker-ssl-common.sh
source "${APP_DIR}/deploy/docker-ssl-common.sh"

if [[ -d .git ]]; then
  info "拉取最新代码..."
  git pull --ff-only origin master 2>/dev/null || git pull --ff-only origin main
fi

DOMAIN="${DOMAIN:-$(load_env_var DOMAIN)}"
DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"
select_nginx_conf "$DOMAIN"
info "Nginx 配置: ${NGINX_CONF##*/}"

info "重新构建并启动..."
compose build
compose up -d trigram-algo nginx

sleep 3
compose ps

if curl -sf "http://127.0.0.1/api/status" >/dev/null; then
  info "HTTP 健康检查通过"
elif curl -sf "https://127.0.0.1/api/status" -k >/dev/null 2>&1; then
  info "HTTPS 健康检查通过"
else
  warn "请检查: docker compose logs trigram-nginx"
fi
