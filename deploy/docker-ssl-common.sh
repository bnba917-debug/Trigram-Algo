#!/usr/bin/env bash
# =============================================================================
# Docker SSL 公共函数（供 docker-deploy.sh / docker-ssl.sh 调用）
# =============================================================================

docker_compose() {
  if docker compose version &>/dev/null; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

load_env_var() {
  local key="$1"
  local file="${APP_DIR}/.env"
  if [[ -f "$file" ]]; then
    grep -E "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^"//;s/"$//' || true
  fi
}

ssl_cert_exists() {
  local domain="${1:-$DOMAIN}"
  docker_compose run --rm --profile manual --entrypoint test certbot \
    -f "/etc/letsencrypt/live/${domain}/fullchain.pem" 2>/dev/null
}

request_ssl_cert() {
  local domain="${1:-$DOMAIN}"
  local email="${2:-$SSL_EMAIL}"

  if [[ -z "$email" ]]; then
    return 1
  fi

  docker_compose run --rm --profile manual --entrypoint certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "${domain}" \
    --email "${email}" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring
}

enable_https_nginx() {
  export NGINX_CONF="${APP_DIR}/deploy/nginx/docker-https.conf"
  docker_compose up -d nginx
}

auto_setup_ssl() {
  local domain="${DOMAIN:-aigo.toppeertalk.com}"
  SSL_EMAIL="${SSL_EMAIL:-$(load_env_var SSL_EMAIL)}"
  DOMAIN="${domain}"

  if ssl_cert_exists "$DOMAIN"; then
    info "检测到已有 SSL 证书，启用 HTTPS..."
    enable_https_nginx
    return 0
  fi

  if [[ -z "$SSL_EMAIL" || "$SSL_EMAIL" == "你的邮箱@example.com" ]]; then
    warn "未配置 SSL_EMAIL，跳过自动申请证书（仅 HTTP）"
    warn "在 .env 中设置 SSL_EMAIL=你的邮箱 后重新运行 ./deploy/docker-deploy.sh"
    return 1
  fi

  info "自动申请 SSL 证书: ${DOMAIN} (${SSL_EMAIL})"
  if request_ssl_cert "$DOMAIN" "$SSL_EMAIL"; then
    info "证书申请成功，切换到 HTTPS..."
    enable_https_nginx
    return 0
  fi

  warn "证书申请失败，请确认 DNS 已解析且 80 端口可从公网访问"
  warn "稍后手动执行: SSL_EMAIL=${SSL_EMAIL} ./deploy/docker-ssl.sh"
  return 1
}
