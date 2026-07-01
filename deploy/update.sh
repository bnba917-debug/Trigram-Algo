#!/usr/bin/env bash
# =============================================================================
# 日常更新脚本（拉代码 + 重装依赖 + 重载 PM2）
# 用法: ./deploy/update.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/trigram-algo}"
PM2_NAME="trigram-algo"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

cd "${APP_DIR}"

info "拉取最新代码..."
git pull --ff-only origin master 2>/dev/null || git pull --ff-only origin main

info "安装依赖..."
bash "${APP_DIR}/deploy/npm-install.sh"

info "重载 PM2..."
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save

sleep 1
if pm2 describe "${PM2_NAME}" | grep -q online; then
  info "更新完成，进程运行中"
  pm2 status "${PM2_NAME}"
else
  warn "进程可能异常，请检查: pm2 logs ${PM2_NAME}"
  exit 1
fi
