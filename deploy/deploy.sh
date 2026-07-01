#!/usr/bin/env bash
# =============================================================================
# 刘伯温预测股市 — 首次部署脚本
# 目标域名: aigo.toppeertalk.com
# 用法:
#   chmod +x deploy/deploy.sh deploy/update.sh deploy/ssl-setup.sh
#   ./deploy/deploy.sh
#
# 可选环境变量:
#   APP_DIR=/var/www/trigram-algo   应用目录
#   APP_PORT=3000                   Node 监听端口
#   DOMAIN=aigo.toppeertalk.com     域名
#   GIT_REPO=https://github.com/bnba917-debug/Trigram-Algo.git
#   SKIP_NGINX=1                    跳过 Nginx 配置（仅部署应用）
#   SKIP_SSL=1                      跳过 SSL 提示
# =============================================================================
set -euo pipefail

# ---------- 可配置项 ----------
APP_DIR="${APP_DIR:-/var/www/trigram-algo}"
APP_PORT="${APP_PORT:-3000}"
DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"
GIT_REPO="${GIT_REPO:-https://github.com/bnba917-debug/Trigram-Algo.git}"
PM2_NAME="trigram-algo"
NGINX_SITE="aigo.toppeertalk.com.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE}"

# ---------- 颜色输出 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------- 前置检查 ----------
require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "缺少命令: $1"
    exit 1
  fi
}

check_node_version() {
  local ver
  ver=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$ver" -lt 18 ]]; then
    error "需要 Node.js >= 18，当前: $(node -v)"
    exit 1
  fi
}

info "检查依赖..."
require_cmd node
require_cmd npm
require_cmd git
check_node_version

if ! command -v pm2 &>/dev/null; then
  warn "未安装 PM2，正在全局安装..."
  npm install -g pm2
fi

# ---------- 拉取代码 ----------
info "部署目录: ${APP_DIR}"

if [[ -d "${APP_DIR}/.git" ]]; then
  info "目录已存在，拉取最新代码..."
  cd "${APP_DIR}"
  git pull --ff-only origin master || git pull --ff-only origin main
else
  info "克隆仓库..."
  sudo mkdir -p "$(dirname "${APP_DIR}")"
  if [[ ! -d "${APP_DIR}" ]]; then
    sudo git clone "${GIT_REPO}" "${APP_DIR}"
  fi
  sudo chown -R "$(whoami):$(whoami)" "${APP_DIR}"
  cd "${APP_DIR}"
fi

# ---------- 安装依赖 ----------
info "安装 npm 依赖..."
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ---------- 环境变量 ----------
if [[ ! -f "${APP_DIR}/.env" ]]; then
  if [[ -f "${APP_DIR}/deploy/env.production.example" ]]; then
    cp "${APP_DIR}/deploy/env.production.example" "${APP_DIR}/.env"
    warn ".env 已从模板创建，请编辑后重新运行本脚本:"
    warn "  nano ${APP_DIR}/.env"
    exit 1
  else
    error "缺少 .env 文件，请先创建: cp deploy/env.production.example .env"
    exit 1
  fi
fi

# 校验关键配置
source_env_check() {
  local env_file="${APP_DIR}/.env"
  if grep -qE '^ADMIN_PASSWORD=(请替换|changeme|$)' "${env_file}" 2>/dev/null; then
    error "请修改 .env 中的 ADMIN_PASSWORD 为强口令"
    exit 1
  fi
  if grep -qE '^DEBUG_UNLOCK=true' "${env_file}" 2>/dev/null; then
    warn "DEBUG_UNLOCK=true — 生产环境建议设为 false"
  fi
}
source_env_check

# 确保 PORT 一致
if ! grep -q "^PORT=" "${APP_DIR}/.env"; then
  echo "PORT=${APP_PORT}" >> "${APP_DIR}/.env"
fi

# ---------- 数据目录 ----------
mkdir -p "${APP_DIR}/data" "${APP_DIR}/logs"
chmod 755 "${APP_DIR}/data"

# ---------- PM2 ----------
info "启动 / 重载 PM2 进程..."
cd "${APP_DIR}"

export PORT="${APP_PORT}"

if pm2 describe "${PM2_NAME}" &>/dev/null; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save

# 配置开机自启（需要 sudo，失败不阻断）
if command -v systemctl &>/dev/null; then
  pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null || true
fi

# ---------- 健康检查 ----------
info "等待应用启动..."
sleep 2

if curl -sf "http://127.0.0.1:${APP_PORT}/api/status" >/dev/null 2>&1; then
  info "应用健康检查通过 (GET /api/status)"
elif curl -sf "http://127.0.0.1:${APP_PORT}/" >/dev/null 2>&1; then
  info "应用首页可访问"
else
  warn "健康检查未通过，请查看日志: pm2 logs ${PM2_NAME}"
fi

# ---------- Nginx ----------
if [[ "${SKIP_NGINX:-0}" == "1" ]]; then
  warn "已跳过 Nginx 配置 (SKIP_NGINX=1)"
else
  if [[ $EUID -ne 0 ]]; then
    warn "Nginx 配置需要 root 权限，请以 sudo 运行以下命令:"
    echo ""
    echo "  sudo ${APP_DIR}/deploy/nginx-install.sh"
    echo ""
  else
    bash "${APP_DIR}/deploy/nginx-install.sh"
  fi
fi

# ---------- 完成 ----------
echo ""
info "=========================================="
info " 部署完成"
info "=========================================="
info " 应用目录 : ${APP_DIR}"
info " 本地地址 : http://127.0.0.1:${APP_PORT}"
info " 域名     : https://${DOMAIN}"
info ""
info " 常用命令:"
info "   pm2 status"
info "   pm2 logs ${PM2_NAME}"
info "   ./deploy/update.sh"
info ""

if [[ "${SKIP_SSL:-0}" != "1" ]] && [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  warn "尚未配置 SSL 证书，请执行:"
  echo "  sudo ./deploy/ssl-setup.sh"
fi
