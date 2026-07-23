#!/usr/bin/env bash
# Start the web dashboard dev stack: builds the serve-enabled `aoe` binary and
# runs it alongside the Vite dev server, with Vite proxying /api and the session
# websockets to the backend. Thin wrapper over `cargo xtask dev`, which owns the
# process-group lifecycle (Ctrl-C stops both, clears a stale dev serve, and with
# --watch rebuilds the backend on Rust changes while Vite stays up).
#
# Usage:
#   scripts/dev/start.sh                  # backend :8081, Vite :5173, loopback
#   scripts/dev/start.sh --host 0.0.0.0   # expose Vite on the LAN
#   scripts/dev/start.sh --watch          # rebuild backend on Rust changes
#   scripts/dev/start.sh --serve-port 8082 --web-port 5174
#
# Proxy: on this host cargo reaches the internet through a local proxy, but npm
# must stay direct (its registry is direct and a generic proxy stalls it). Any
# proxy already exported in the shell is re-routed to cargo only via the
# cargo-specific CARGO_HTTP_PROXY, and the generic proxy vars are stripped so the
# npm/Vite subprocesses inherit nothing. Set AOE_DEV_PROXY to override the
# detected proxy.
#
# Extra args are forwarded to `cargo xtask dev` (--serve-port, --web-port,
# --host, --watch).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing required tool: $1" >&2; exit 1; }; }
need cargo
need node
need npm
command -v tmux >/dev/null 2>&1 || echo "warning: tmux not found; running aoe from source needs it." >&2

# Re-route a detected proxy to cargo only; strip the generic vars so npm stays direct.
proxy=""
for v in AOE_DEV_PROXY https_proxy HTTPS_PROXY http_proxy HTTP_PROXY; do
  val="${!v:-}"
  if [[ -n "$val" ]]; then proxy="$val"; break; fi
done
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
if [[ -n "$proxy" ]]; then
  export CARGO_HTTP_PROXY="$proxy"
  echo "[start] cargo proxy via $proxy (npm left direct)"
fi

exec cargo xtask dev "$@"
