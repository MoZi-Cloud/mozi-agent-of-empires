#!/usr/bin/env bash
#
# Build the Mozi AoE Debian package (.deb) directly with dpkg-deb, no
# cargo-deb required (the fork's build sandbox has no outbound crates.io
# access). Run after:  cargo build --features serve --release
#
# Output: <root>/mozi-aoe_<version>_amd64.deb

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$ROOT/target/release/aoe"

if [ ! -x "$BIN" ]; then
    echo "[error] release binary not found at $BIN" >&2
    echo "        build it first: RUST_MIN_STACK=134217728 cargo build --features serve --release" >&2
    exit 1
fi

VERSION="$("$BIN" --version | awk '{print $2}')"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/mozi-aoe"

mkdir -p "$PKG/DEBIAN" "$PKG/usr/bin" "$PKG/usr/share/doc/mozi-aoe"

cp "$BIN" "$PKG/usr/bin/aoe"
chmod 0755 "$PKG/usr/bin/aoe"
cp "$ROOT/README.md" "$PKG/usr/share/doc/mozi-aoe/README.md"
cp "$ROOT/LICENSE" "$PKG/usr/share/doc/mozi-aoe/LICENSE"
cp "$ROOT/NOTICE" "$PKG/usr/share/doc/mozi-aoe/NOTICE"
chmod 0644 "$PKG/usr/share/doc/mozi-aoe/"*

cat > "$PKG/DEBIAN/control" <<EOF
Package: mozi-aoe
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: amd64
Depends: tmux, libc6 (>= 2.28)
Maintainer: MoZi <mozi@u8erp.com>
Description: Terminal session manager for AI coding agents
 Mozi AoE is an unofficial fork of Agent of Empires, distributed under the
 MIT License. The web dashboard is compiled into the binary, so a single
 \`aoe serve\` runs the full frontend and backend with no separate process.
 Website: https://u8erp.com . See /usr/share/doc/mozi-aoe/NOTICE for the
 attribution and the list of changes relative to upstream.
EOF
chmod 0644 "$PKG/DEBIAN/control"

OUT="$ROOT/mozi-aoe_${VERSION}_amd64.deb"
dpkg-deb --build --root-owner-group "$PKG" "$OUT"

echo
echo "Wrote $OUT"
