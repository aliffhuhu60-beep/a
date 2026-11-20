"""Skrip permulaan Blender: tekan 'Connect' BlendRelay secara automatik (untuk mod tanpa skrin / Xvfb)."""
import bpy


def _connect():
    try:
        bpy.ops.blendrelay.refresh()
        print("[autoconnect] BlendRelay Connect dihantar")
        return None
    except Exception as exc:  # add-on belum sedia; cuba lagi
        print("[autoconnect] menunggu add-on:", exc)
        return 1.0


bpy.app.timers.register(_connect, first_interval=2.0, persistent=True)
