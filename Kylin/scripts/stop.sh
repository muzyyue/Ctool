#!/bin/bash

# Ctool Kylin 环境 - 停止脚本
# 优雅停止 nginx 服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KYLIN_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$KYLIN_DIR/nginx/logs/nginx.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "nginx 未运行 (PID 文件不存在)"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
    echo "nginx 未运行 (进程 $PID 不存在)"
    rm -f "$PID_FILE"
    exit 0
fi

echo "正在停止 nginx (PID: $PID)..."

nginx -s quit -p "$KYLIN_DIR/nginx" 2>/dev/null || kill -QUIT "$PID" 2>/dev/null || {
    echo "优雅停止失败，尝试强制停止..."
    kill -9 "$PID" 2>/dev/null || true
}

for i in {1..10}; do
    if ! kill -0 "$PID" 2>/dev/null; then
        break
    fi
    sleep 1
done

if kill -0 "$PID" 2>/dev/null; then
    echo "警告: nginx 未能正常停止，尝试强制终止..."
    kill -9 "$PID" 2>/dev/null || true
fi

rm -f "$PID_FILE"
echo "✓ nginx 已停止"
