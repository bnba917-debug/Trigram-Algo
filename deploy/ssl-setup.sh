#!/usr/bin/env bash
# =============================================================================
# Let's Encrypt SSL 证书申请
# 前置条件:
#   1. DNS 已解析 aigo.toppeertalk.com → 本机公网 IP
#   2. 已运行 sudo ./deploy/nginx-install.sh（HTTP-only 配置）
# 用法: sudo ./deploy/ssl-setup.sh
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"
EMAIL="${SSL_EMAIL:-}"   # 可设置: SSL_EMAIL=you@example.com sudo ./deploy/ssl-setup.sh
APP_DIR="${APP_DIR:-/var/www/trigram-algo}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  error "请使用 sudo 运行: sudo $0"
  exit 1
fi

if ! command -v certbot &>/dev/null; then
  info "安装 Certbot..."
  if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y certbot python3-certbot-nginx
  elif command -v yum &>/dev/null; then
    yum install -y certbot python3-certbot-nginx
  else
    error "请手动安装 certbot"
    exit 1
  fi
fi

CERTBOT_ARGS=(certbot certonly --nginx -d "${DOMAIN}" --agree-tos --non-interactive)

if [[ -n "${EMAIL}" ]]; then
  CERTBOT_ARGS+=(--email "${EMAIL}")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
  warn "未设置 SSL_EMAIL，使用无邮箱注册（建议设置: SSL_EMAIL=you@example.com）"
fi

info "申请证书: ${DOMAIN}"
"${CERTBOT_ARGS[@]}"

# 切换到完整 HTTPS 配置
info "切换到 HTTPS Nginx 配置..."
APP_DIR="${APP_DIR}" bash "${APP_DIR}/deploy/nginx-install.sh"

info "SSL 配置完成: https://${DOMAIN}"
info "证书自动续期: certbot renew --dry-run"
