#!/usr/bin/env bash
# =============================================================================
# 安装 npm 依赖（兼容旧版 GLIBC 服务器）
# 在 deploy.sh / update.sh 中调用，也可单独运行:
#   ./deploy/npm-install.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${APP_DIR}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

# 检测 GLIBC 版本
glibc_version() {
  local ver
  ver=$(ldd --version 2>&1 | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")
  echo "$ver"
}

GLIBC_VER=$(glibc_version)
info "系统 GLIBC: ${GLIBC_VER}"

needs_source_build() {
  local major minor
  major=$(echo "$1" | cut -d. -f1)
  minor=$(echo "$1" | cut -d. -f2)
  # GLIBC < 2.29 无法使用 better-sqlite3 预编译包
  if [[ "$major" -lt 2 ]] || [[ "$major" -eq 2 && "$minor" -lt 29 ]]; then
    return 0
  fi
  return 1
}

export npm_config_build_from_source=true

if needs_source_build "$GLIBC_VER"; then
  warn "GLIBC ${GLIBC_VER} < 2.29，将强制从源码编译 better-sqlite3"
  warn "如未安装编译工具，请先运行: sudo ./deploy/install-build-deps.sh"

  # 优先使用 Python 3.8+（node-gyp 要求）
  for py in python3.11 python3.10 python3.9 python3.8 python3; do
    if command -v "$py" &>/dev/null; then
      py_ver=$("$py" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "0")
      py_minor=$(echo "$py_ver" | cut -d. -f2)
      if [[ "$py_minor" -ge 7 ]]; then
        export PYTHON="$(command -v "$py")"
        info "使用 Python: ${PYTHON} (${py_ver})"
        break
      fi
    fi
  done

  if [[ -z "${PYTHON:-}" ]]; then
    warn "未找到 Python >= 3.7，node-gyp 可能失败"
  fi

  # CentOS 7 devtoolset 支持
  if [[ -f /opt/rh/devtoolset-11/enable ]]; then
    # shellcheck source=/dev/null
    source /opt/rh/devtoolset-11/enable
    info "已启用 devtoolset-11 编译器"
  elif [[ -f /opt/rh/devtoolset-8/enable ]]; then
    # shellcheck source=/dev/null
    source /opt/rh/devtoolset-8/enable
    info "已启用 devtoolset-8 编译器"
  fi
fi

info "安装 npm 依赖 (build_from_source=true)..."
rm -rf node_modules/better-sqlite3

if [[ -f package-lock.json ]]; then
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev
else
  npm install --omit=dev
fi

info "验证 better-sqlite3..."
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
