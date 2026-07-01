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
  docker_compose run --rm --no-deps --entrypoint test certbot \
    -f "/etc/letsencrypt/live/${domain}/fullchain.pem" 2>/dev/null
}

request_ssl_cert() {
  local domain="${1:-$DOMAIN}"
  local email="${2:-$SSL_EMAIL}"
  local -a args

  args=(
    certonly
    --webroot
    --webroot-path=/var/www/certbot
    -d "${domain}"
    --agree-tos
    --non-interactive
    --keep-until-expiring
  )

  if [[ -n "$email" && "$email" != "你的邮箱@example.com" ]]; then
    args+=(--email "${email}")
  else
    args+=(--register-unsafely-without-email)
    warn "未设置 SSL_EMAIL，使用无邮箱申请（到期前不会收到邮件提醒）"
  fi

  docker_compose run --rm --no-deps --entrypoint certbot certbot "${args[@]}"
}

enable_https_nginx() {
  export NGINX_CONF="${APP_DIR}/deploy/nginx/docker-https.conf"
  docker_compose up -d nginx
}

select_nginx_conf() {
  local domain="${1:-${DOMAIN:-aigo.toppeertalk.com}}"
  if ssl_cert_exists "$domain"; then
    export NGINX_CONF="${APP_DIR}/deploy/nginx/docker-https.conf"
  else
    export NGINX_CONF="${APP_DIR}/deploy/nginx/docker-http.conf"
  fi
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

  if [[ -n "$SSL_EMAIL" && "$SSL_EMAIL" != "你的邮箱@example.com" ]]; then
    info "自动申请 SSL 证书: ${DOMAIN} (${SSL_EMAIL})"
  else
    info "自动申请 SSL 证书: ${DOMAIN}（无邮箱）"
  fi

  if request_ssl_cert "$DOMAIN" "$SSL_EMAIL"; then
    info "证书申请成功，切换到 HTTPS..."
    enable_https_nginx
    return 0
  fi

  warn "证书申请失败，请确认 DNS 已解析且 80 端口可从公网访问"
  warn "稍后手动执行: ./deploy/docker-ssl.sh"
  return 1
}
