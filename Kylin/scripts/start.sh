#!/bin/bash

# Ctool Kylin 环境 - 启动脚本
# 使用自定义配置启动 nginx 服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KYLIN_DIR="$(dirname "$SCRIPT_DIR")"
NGINX_CONF="$KYLIN_DIR/nginx/conf/nginx.conf"
PID_FILE="$KYLIN_DIR/nginx/logs/nginx.pid"

PORT=${1:-80}

if ! command -v nginx &> /dev/null; then
    echo "错误: nginx 未安装"
    echo "请先运行: ./scripts/install-nginx.sh"
    exit 1
fi

if [ ! -f "$NGINX_CONF" ]; then
    echo "错误: nginx 配置文件不存在: $NGINX_CONF"
    exit 1
fi

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "nginx 已在运行中 (PID: $PID)"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

if [ "$PORT" != "80" ]; then
    TEMP_CONF="$KYLIN_DIR/nginx/conf/nginx.conf.tmp"
    sed "s/listen 80;/listen $PORT;/" "$NGINX_CONF" > "$TEMP_CONF"
    NGINX_CONF="$TEMP_CONF"
fi

echo "正在启动 nginx..."
echo "  - 配置文件: $NGINX_CONF"
echo "  - 监听端口: $PORT"
echo "  - 静态文件: $KYLIN_DIR/app"

cd "$KYLIN_DIR/nginx"
nginx -c "$NGINX_CONF" -p "$KYLIN_DIR/nginx"

sleep 1

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo ""
    echo "✓ nginx 启动成功 (PID: $PID)"
    echo ""
    echo "访问地址: http://localhost:$PORT"
    echo ""
    echo "停止服务: ./scripts/stop.sh"
    echo "重启服务: ./scripts/restart.sh"
    echo "查看状态: ./scripts/status.sh"
else
    echo "✗ nginx 启动失败，请检查日志:"
    echo "  cat $KYLIN_DIR/nginx/logs/error.log"
    exit 1
fi

if [ "$PORT" != "80" ]; then
    rm -f "$KYLIN_DIR/nginx/conf/nginx.conf.tmp"
fi
