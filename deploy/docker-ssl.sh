#!/usr/bin/env bash
# =============================================================================
# Docker 内申请 Let's Encrypt SSL 证书
# 前置: ./deploy/docker-deploy.sh 已运行，DNS 已解析
# 用法: SSL_EMAIL=you@example.com ./deploy/docker-ssl.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"
EMAIL="${SSL_EMAIL:-}"

cd "${APP_DIR}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

compose() {
  if docker compose version &>/dev/null; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

if [[ -z "${EMAIL}" ]]; then
  error "请设置邮箱: SSL_EMAIL=you@example.com ./deploy/docker-ssl.sh"
  exit 1
fi

info "申请证书: ${DOMAIN}"

compose run --rm --profile manual --entrypoint certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --non-interactive

info "切换到 HTTPS 配置..."
export NGINX_CONF="${APP_DIR}/deploy/nginx/docker-https.conf"
compose up -d nginx

info "SSL 配置完成: https://${DOMAIN}"
info "证书续期: ./deploy/docker-ssl-renew.sh"
