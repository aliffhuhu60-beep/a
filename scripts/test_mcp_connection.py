"""Uji sambungan MCP: Claude Code -> BlendRelay (stdio) -> runtime -> Blender.

Menjalankan arahan yang sama seperti dalam .mcp.json, buat handshake MCP,
senaraikan tool, dan panggil satu tool baca sahaja (inspect scene).
Guna: uv run python scripts/test_mcp_connection.py
"""
import json
import subprocess
import sys

CMD = ["uv", "run", "--no-sync", "blendrelay-mcp", "mcp"]
proc = subprocess.Popen(CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
_id = 0


def rpc(method, params=None, notify=False):
    global _id
    msg = {"jsonrpc": "2.0", "method": method, "params": params or {}}
    if not notify:
        _id += 1
        msg["id"] = _id
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()
    if notify:
        return None
    while True:
        line = proc.stdout.readline()
        if not line:
            raise RuntimeError("Pelayan MCP tamat tanpa jawapan")
        resp = json.loads(line)
        if resp.get("id") == _id:
            if "error" in resp:
                raise RuntimeError(resp["error"])
            return resp["result"]


try:
    init = rpc("initialize", {"protocolVersion": "2025-06-18", "capabilities": {},
                              "clientInfo": {"name": "ujian-sambungan", "version": "1.0"}})
    print("Pelayan:", init["serverInfo"], "| protokol", init["protocolVersion"])
    rpc("notifications/initialized", notify=True)
    tools = rpc("tools/list")["tools"]
    print(f"{len(tools)} tool:", ", ".join(t["name"] for t in tools))
    name = sys.argv[1] if len(sys.argv) > 1 else None
    if name:
        args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
        res = rpc("tools/call", {"name": name, "arguments": args})
        text = "".join(c.get("text", "") for c in res.get("content", []))
        print(f"\n[{name}] isError={res.get('isError', False)}\n{text[:3000]}")
finally:
    proc.stdin.close()
    proc.terminate()
