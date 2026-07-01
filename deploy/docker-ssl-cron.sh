#!/usr/bin/env bash
# =============================================================================
# 安装 SSL 证书自动续期 cron（每月 1 日 03:00）
# 用法: sudo ./deploy/docker-ssl-cron.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/trigram-algo}"
CRON_TAG="# trigram-algo-ssl-renew"
CRON_LINE="0 3 1 * * cd ${APP_DIR} && ./deploy/docker-ssl-renew.sh >> /var/log/trigram-ssl-renew.log 2>&1 ${CRON_TAG}"

if [[ $EUID -ne 0 ]]; then
  echo "请使用 sudo 运行"
  exit 1
fi

# 移除旧条目
(crontab -l 2>/dev/null | grep -v "${CRON_TAG}" || true) | crontab -

# 添加新条目
(crontab -l 2>/dev/null; echo "${CRON_LINE}") | crontab -

echo "已添加 cron 任务:"
echo "  ${CRON_LINE}"
crontab -l | grep trigram-algo
