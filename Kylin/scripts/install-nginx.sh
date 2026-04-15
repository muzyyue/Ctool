#!/bin/bash

# Ctool Kylin 环境 - nginx 安装脚本
# 自动检测系统架构和包管理器，提供安装指导

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KYLIN_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  Ctool Kylin 环境 - nginx 安装脚本"
echo "=========================================="
echo ""

detect_arch() {
    local arch
    arch=$(uname -m)
    case $arch in
        x86_64|amd64)
            echo "x86_64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            echo "$arch"
            ;;
    esac
}

detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v pacman &> /dev/null; then
        echo "pacman"
    else
        echo "unknown"
    fi
}

check_nginx() {
    if command -v nginx &> /dev/null; then
        echo "✓ nginx 已安装: $(nginx -v 2>&1)"
        return 0
    else
        echo "✗ nginx 未安装"
        return 1
    fi
}

ARCH=$(detect_arch)
PKG_MANAGER=$(detect_package_manager)

echo "系统信息:"
echo "  - 架构: $ARCH"
echo "  - 包管理器: $PKG_MANAGER"
echo ""

echo "检查 nginx 安装状态..."
if check_nginx; then
    echo ""
    echo "nginx 已安装，无需重复安装。"
    echo "您可以直接运行 ./start.sh 启动服务。"
    exit 0
fi

echo ""
echo "----------------------------------------"
echo "请根据您的系统选择以下命令安装 nginx:"
echo "----------------------------------------"
echo ""

case $PKG_MANAGER in
    apt)
        echo "Debian/Ubuntu/Kylin (apt):"
        echo "  sudo apt update"
        echo "  sudo apt install -y nginx"
        ;;
    yum)
        echo "CentOS/RHEL/Kylin (yum):"
        echo "  sudo yum install -y epel-release"
        echo "  sudo yum install -y nginx"
        ;;
    dnf)
        echo "Fedora/Kylin (dnf):"
        echo "  sudo dnf install -y nginx"
        ;;
    pacman)
        echo "Arch Linux (pacman):"
        echo "  sudo pacman -S nginx"
        ;;
    *)
        echo "无法识别的包管理器，请手动安装 nginx"
        echo "或访问: https://nginx.org/en/linux_packages.html"
        ;;
esac

echo ""
echo "安装完成后，请运行以下命令启动服务:"
echo "  cd $KYLIN_DIR"
echo "  ./scripts/start.sh"
echo ""
