#!/usr/bin/env bash
# fireimnext 前端服务安装脚本
# 用法: sudo bash install.sh
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/4] 安装服务文件到 /etc/systemd/system/"
sudo cp "$SRC_DIR/fireimnext.service" /etc/systemd/system/fireimnext.service
sudo systemctl daemon-reload
sudo systemctl enable fireimnext.service

echo "[2/4] 停止手动运行的 next-server（占用 3000 端口）"
OLD_PIDS="$(ss -tlnp 2>/dev/null | awk '/:3000 /' | grep -oP 'pid=\K[0-9]+' | sort -u || true)"
if [ -n "$OLD_PIDS" ]; then
  echo "  发现进程: $OLD_PIDS，发送 SIGTERM"
  kill $OLD_PIDS || true
  sleep 2
else
  echo "  3000 端口无手动进程"
fi

echo "[3/4] 启动 fireimnext 服务"
sudo systemctl start fireimnext.service
sleep 3

echo "[4/4] 服务状态："
systemctl status fireimnext.service --no-pager | head -12
echo
echo "健康检查: http://localhost:3000"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3000 || echo "  HTTP 请求失败"
