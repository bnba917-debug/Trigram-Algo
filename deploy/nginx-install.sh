#!/usr/bin/env bash
# =============================================================================
# Nginx 站点安装（需 root）
# 用法: sudo ./deploy/nginx-install.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/trigram-algo}"
DOMAIN="${DOMAIN:-aigo.toppeertalk.com}"
NGINX_SITE="aigo.toppeertalk.com.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE}"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

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

if ! command -v nginx &>/dev/null; then
  error "未安装 Nginx，请先安装: apt install nginx  或  yum install nginx"
  exit 1
fi

# Certbot 验证目录
mkdir -p /var/www/certbot

# 根据是否已有证书选择配置
if [[ -f "${CERT_PATH}" ]]; then
  SRC="${APP_DIR}/deploy/nginx/aigo.toppeertalk.com.conf"
  info "检测到 SSL 证书，使用 HTTPS 配置"
else
  SRC="${APP_DIR}/deploy/nginx/aigo.toppeertalk.com.http-only.conf"
  warn "未检测到 SSL 证书，使用 HTTP-only 配置"
  warn "证书申请后请重新运行本脚本以切换到 HTTPS 配置"
fi

if [[ ! -f "${SRC}" ]]; then
  error "找不到 Nginx 配置: ${SRC}"
  exit 1
fi

cp "${SRC}" "${NGINX_AVAILABLE}"
ln -sf "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"

# 移除 default 站点（可选，避免冲突）
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  warn "禁用 default 站点以避免 server_name 冲突"
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx || systemctl restart nginx

info "Nginx 配置已安装: ${NGINX_AVAILABLE}"
info "站点: http://${DOMAIN}"
