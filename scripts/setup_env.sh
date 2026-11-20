#!/usr/bin/env bash
# Persediaan idempoten persekitaran animasi 3D (Linux x64).
# Memasang hanya komponen yang belum ada; tidak memadam atau menggantikan fail sedia ada.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BLENDER_VER="4.5.16"
BLENDER_DIR="/opt/blender-${BLENDER_VER}-linux-x64"

# 1. Blender 4.5 LTS (dengan semakan SHA-256)
if [ ! -x "$BLENDER_DIR/blender" ]; then
  tmp="$(mktemp -d)"; cd "$tmp"
  curl -sSfLO "https://download.blender.org/release/Blender4.5/blender-${BLENDER_VER}-linux-x64.tar.xz"
  curl -sSfL "https://download.blender.org/release/Blender4.5/blender-${BLENDER_VER}.sha256" | grep linux-x64.tar.xz | sha256sum -c -
  tar -xf "blender-${BLENDER_VER}-linux-x64.tar.xz" -C /opt
  cd "$ROOT"; rm -rf "$tmp"
fi
[ -e /usr/local/bin/blender ] || ln -s "$BLENDER_DIR/blender" /usr/local/bin/blender

# 2. Pakej sistem: FFmpeg, Xvfb (paparan maya), espeak-ng (voice-over sementara)
need=(); for p in ffmpeg xvfb espeak-ng; do dpkg -s "$p" >/dev/null 2>&1 || need+=("$p"); done
if [ ${#need[@]} -gt 0 ]; then apt-get update -qq && apt-get install -y --no-install-recommends "${need[@]}"; fi

# 3. Library Python + BlendRelay MCP (venv projek, dipin melalui uv.lock)
cd "$ROOT" && uv sync --frozen

# 4. Add-on BlendRelay ke dalam Blender 4.5 dan aktifkan
blender -b --factory-startup --python-expr "import bpy; bpy.ops.wm.save_userpref()" >/dev/null 2>&1 || true
"$ROOT/.venv/bin/blendrelay-mcp" setup --blender-version 4.5
blender -b --python-expr "import addon_utils, bpy; addon_utils.enable('bl_ext.user_default.blendrelay_mcp', default_set=True); bpy.ops.wm.save_userpref()" >/dev/null 2>&1
"$ROOT/.venv/bin/blendrelay-mcp" doctor | tail -3
