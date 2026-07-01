#!/usr/bin/env bash
# =============================================================================
# Docker 日常更新
# 用法: ./deploy/docker-update.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${APP_DIR}"

GREEN='\033[0;32m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $*"; }

compose() {
  if docker compose version &>/dev/null; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

if [[ -d .git ]]; then
  info "拉取最新代码..."
  git pull --ff-only origin master 2>/dev/null || git pull --ff-only origin main
fi

info "重新构建并启动..."
compose build
compose up -d

sleep 3
compose ps
curl -sf "http://127.0.0.1:3000/api/status" && info "健康检查通过" || info "请检查: docker compose logs -f"
