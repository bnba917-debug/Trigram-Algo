#!/usr/bin/env bash
# =============================================================================
# 安装 better-sqlite3 源码编译所需的系统依赖
# 用法: sudo ./deploy/install-build-deps.sh
# =============================================================================
set -euo pipefail

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

install_debian() {
  apt-get update -qq
  apt-get install -y build-essential python3 python3-dev curl
}

install_rhel() {
  yum install -y gcc gcc-c++ make python3 python3-devel curl

  # CentOS 7 默认 Python 3.6，Node 22 的 node-gyp 需要 Python >= 3.7
  if command -v python3 &>/dev/null; then
    py_minor=$(python3 -c 'import sys; print(sys.version_info.minor)' 2>/dev/null || echo 0)
    if [[ "$py_minor" -lt 7 ]]; then
      warn "检测到 Python 3.${py_minor}，尝试安装 Python 3.8+..."
      if yum list available python38 python38-devel &>/dev/null 2>&1; then
        yum install -y python38 python38-devel || true
      fi
      if [[ -x /usr/bin/python3.8 ]]; then
        alternatives --set python3 /usr/bin/python3.8 2>/dev/null || true
        info "已切换 Python 到 3.8"
      elif [[ -x /usr/bin/python38 ]]; then
        ln -sf /usr/bin/python38 /usr/local/bin/python3-for-node 2>/dev/null || true
        warn "请设置: export PYTHON=/usr/bin/python38"
      else
        warn "无法自动安装 Python 3.8，node-gyp 可能失败"
        warn "可尝试: yum install -y centos-release-scl && yum install -y rh-python38"
      fi
    fi
  fi

  # CentOS 7 的 gcc 4.8 可能过旧，提示 devtoolset
  if [[ -f /etc/redhat-release ]] && grep -qE 'CentOS Linux 7|Red Hat Enterprise Linux Server 7' /etc/redhat-release 2>/dev/null; then
  warn "CentOS 7 检测到 — 若编译仍失败，请安装新版编译器:"
  echo "  sudo yum install -y centos-release-scl"
  echo "  sudo yum install -y devtoolset-11-gcc devtoolset-11-gcc-c++"
  echo "  scl enable devtoolset-11 bash   # 然后在此 shell 中重新 npm install"
  fi
}

info "安装 native 模块编译依赖..."

if command -v apt-get &>/dev/null; then
  install_debian
elif command -v yum &>/dev/null; then
  install_rhel
elif command -v dnf &>/dev/null; then
  dnf install -y gcc gcc-c++ make python3 python3-devel curl
else
  error "不支持的包管理器，请手动安装: gcc g++ make python3-dev"
  exit 1
fi

info "系统依赖安装完成"
