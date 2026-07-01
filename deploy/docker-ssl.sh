#!/usr/bin/env bash
# =============================================================================
# Docker 内申请 Let's Encrypt SSL 证书
# 前置: ./deploy/docker-deploy.sh 已运行，DNS 已解析
# 用法: SSL_EMAIL=you@example.com ./deploy/docker-ssl.sh
#       或在 .env 中配置 SSL_EMAIL 后执行 ./deploy/docker-ssl.sh
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

# shellcheck source=docker-ssl-common.sh
source "${APP_DIR}/deploy/docker-ssl-common.sh"

SSL_EMAIL="${SSL_EMAIL:-$(load_env_var SSL_EMAIL)}"
DOMAIN="${DOMAIN:-$(load_env_var DOMAIN)}"
DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"

if [[ -n "${SSL_EMAIL}" && "${SSL_EMAIL}" != "你的邮箱@example.com" ]]; then
  info "申请证书: ${DOMAIN} (${SSL_EMAIL})"
else
  info "申请证书: ${DOMAIN}（无邮箱）"
fi

if ssl_cert_exists "${DOMAIN}"; then
  info "证书已存在，启用 HTTPS..."
  enable_https_nginx
  info "SSL 配置完成: https://${DOMAIN}"
  exit 0
fi

request_ssl_cert "${DOMAIN}" "${SSL_EMAIL}"
enable_https_nginx

info "SSL 配置完成: https://${DOMAIN}"
info "证书续期: ./deploy/docker-ssl-renew.sh"
