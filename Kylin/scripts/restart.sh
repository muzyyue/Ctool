#!/bin/bash

# Ctool Kylin 环境 - 重启脚本
# 重启 nginx 服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KYLIN_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$KYLIN_DIR/nginx/logs/nginx.pid"

echo "正在重启 nginx..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "停止当前服务..."
        "$SCRIPT_DIR/stop.sh"
        sleep 1
    fi
fi

echo "启动新服务..."
"$SCRIPT_DIR/start.sh" "$@"
