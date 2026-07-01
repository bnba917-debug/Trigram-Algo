#!/usr/bin/env bash
# =============================================================================
# 续期 Docker 内 SSL 证书（可加入 crontab）
# 用法: ./deploy/docker-ssl-renew.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${APP_DIR}"

compose() {
  if docker compose version &>/dev/null; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

compose run --rm --profile manual --entrypoint certbot certbot renew --quiet
export NGINX_CONF="${APP_DIR}/deploy/nginx/docker-https.conf"
compose exec nginx nginx -s reload 2>/dev/null || compose restart nginx

echo "证书续期完成"
