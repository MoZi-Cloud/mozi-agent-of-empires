#!/usr/bin/env bash
#
# Mozi AoE portable launcher.
#
# Starts the Mozi AoE web dashboard (frontend + backend in one self-contained
# `aoe` binary) on a random free TCP port above 40000, bound to all interfaces
# so other machines on the LAN can reach it. The dashboard ships embedded in the
# binary, so there is no separate frontend process to start.
#
# Usage:  ./start.sh
# Stop:   Ctrl-C in this terminal (or `aoe serve --stop` from another shell).
#
# This script expects the `aoe` binary to sit next to it in the same directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AOE_BIN="$SCRIPT_DIR/aoe"

if [ ! -x "$AOE_BIN" ]; then
    echo "[error] aoe binary not found next to start.sh (looked for: $AOE_BIN)" >&2
    echo "        Keep start.sh and the aoe binary in the same folder." >&2
    exit 1
fi

# tmux is required at runtime. Tell the user up front rather than letting aoe
# fail with a cryptic message.
if ! command -v tmux >/dev/null 2>&1; then
    echo "[error] tmux is required but not installed." >&2
    echo "        Install it with:  sudo apt install tmux   (Debian/Ubuntu)" >&2
    echo "                          sudo dnf install tmux   (Fedora/RHEL)" >&2
    exit 1
fi

# Pick a free TCP port above 40000. Starts at a random offset so two installs
# on the same machine are unlikely to collide, then walks upward until `ss`
# reports nothing listening. Falls back gracefully if `ss` is unavailable.
pick_port() {
    local base p
    base=$(( 40000 + (RANDOM % 2000) ))
    if command -v ss >/dev/null 2>&1; then
        for (( p = base; p < 60000; p++ )); do
            if ! ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":$p$"; then
                echo "$p"
                return
            fi
        done
    fi
    echo "$base"
}

# Best-effort primary LAN IPv4 (hostname -I prints space-separated addresses).
lan_ip() {
    hostname -I 2>/dev/null | awk '{print $1}'
}

PORT="$(pick_port)"
LAN_IP="$(lan_ip || true)"

cat <<EOF

  Mozi AoE starting on port $PORT ...

  This machine :  http://127.0.0.1:$PORT
EOF
[ -n "$LAN_IP" ] && echo "  LAN         :  http://$LAN_IP:$PORT"
cat <<EOF

  The URL with its auth token prints below once the server is up.
  Open it in a browser (the token is required). Press Ctrl-C to stop.

EOF

# Foreground serve: stays attached so logs stream here and Ctrl-C stops it.
exec "$AOE_BIN" serve --host 0.0.0.0 --port "$PORT"
