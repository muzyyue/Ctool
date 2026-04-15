#!/bin/bash

# Ctool Kylin 环境 - 状态检查脚本
# 检查 nginx 运行状态

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KYLIN_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$KYLIN_DIR/nginx/logs/nginx.pid"

echo "=========================================="
echo "  Ctool Kylin 环境 - 服务状态"
echo "=========================================="
echo ""

if ! command -v nginx &> /dev/null; then
    echo "✗ nginx 未安装"
    echo ""
    echo "请运行: ./scripts/install-nginx.sh"
    exit 1
fi

echo "nginx 版本:"
nginx -v 2>&1
echo ""

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "运行状态: ✓ 运行中"
        echo "进程 ID: $PID"
        echo ""
        
        echo "进程信息:"
        ps -p "$PID" -o pid,ppid,user,%cpu,%mem,vsz,rss,stat,start,time,comm 2>/dev/null || \
        ps aux | grep -E "^[^ ]+ +$PID " | head -1
        echo ""
        
        echo "监听端口:"
        if command -v ss &> /dev/null; then
            ss -tlnp 2>/dev/null | grep -E "nginx|$PID" || ss -tln | grep -E ":80|:8080"
        elif command -v netstat &> /dev/null; then
            netstat -tlnp 2>/dev/null | grep -E "nginx|$PID" || netstat -tln | grep -E ":80|:8080"
        else
            echo "  (无法获取端口信息，ss/netstat 不可用)"
        fi
        echo ""
        
        if [ -f "$KYLIN_DIR/nginx/logs/error.log" ]; then
            ERROR_COUNT=$(grep -c "error" "$KYLIN_DIR/nginx/logs/error.log" 2>/dev/null || echo "0")
            echo "错误日志条目: $ERROR_COUNT"
            if [ "$ERROR_COUNT" -gt 0 ]; then
                echo "最近错误:"
                tail -5 "$KYLIN_DIR/nginx/logs/error.log" 2>/dev/null | sed 's/^/  /'
            fi
        fi
    else
        echo "运行状态: ✗ 已停止 (PID 文件存在但进程不存在)"
        echo "残留 PID 文件: $PID_FILE"
        rm -f "$PID_FILE"
    fi
else
    echo "运行状态: ✗ 已停止 (PID 文件不存在)"
fi

echo ""
echo "----------------------------------------"
echo "目录信息:"
echo "  配置目录: $KYLIN_DIR/nginx/conf"
echo "  日志目录: $KYLIN_DIR/nginx/logs"
echo "  静态文件: $KYLIN_DIR/app"
echo "----------------------------------------"
