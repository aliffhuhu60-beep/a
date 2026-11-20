#!/usr/bin/env bash
# Mulakan runtime BlendRelay + Blender GUI (di bawah Xvfb jika tiada paparan) dan sambung automatik.
# Guna: scripts/start_blender_mcp.sh [fail.blend]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/.logs"; mkdir -p "$LOG"
BR="$ROOT/.venv/bin/blendrelay-mcp"

# 1. Runtime bridge (localhost sahaja)
if ! pgrep -f "blendrelay-mcp runtime serve|blendrelay_runtime.cli.*serve" >/dev/null; then
  nohup "$BR" runtime serve >"$LOG/runtime.log" 2>&1 &
  sleep 2
fi

# 2. Paparan maya jika tiada skrin
if [ -z "${DISPLAY:-}" ]; then
  export DISPLAY=:99
  pgrep -f "Xvfb :99" >/dev/null || { nohup Xvfb :99 -screen 0 1920x1080x24 >"$LOG/xvfb.log" 2>&1 & sleep 2; }
fi

# Blender perlu XDG_RUNTIME_DIR yang sah; tanpa Wayland ia akan guna X11
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-$(id -u)}"; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"

# 3. Blender GUI + auto-connect
pgrep -f "blender.*blender_autoconnect.py" >/dev/null && { echo "Blender sudah berjalan"; exit 0; }
nohup blender ${1:-} --python "$ROOT/scripts/blender_autoconnect.py" >"$LOG/blender.log" 2>&1 &
echo "Blender dimulakan (PID $!). Log: $LOG/blender.log"
