#!/usr/bin/env bash
#
# Assemble the portable Linux x86_64 .zip from the release binary.
# Run after:  cargo build --features serve --release
#
# Output: <root>/mozi-aoe-<version>-linux-amd64.zip

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$ROOT/target/release/aoe"

if [ ! -x "$BIN" ]; then
    echo "[error] release binary not found at $BIN" >&2
    echo "        build it first: cargo build --features serve --release" >&2
    exit 1
fi

VERSION="$("$BIN" --version | awk '{print $2}')"
NAME="mozi-aoe-${VERSION}-linux-amd64"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
DIR="$STAGE/$NAME"
mkdir -p "$DIR"

cp "$BIN" "$DIR/aoe"
cp "$ROOT/packaging/start.sh" "$DIR/start.sh"
cp "$ROOT/packaging/README-portable.md" "$DIR/README.md"
cp "$ROOT/LICENSE" "$DIR/LICENSE"
cp "$ROOT/NOTICE" "$DIR/NOTICE"
chmod 0755 "$DIR/aoe" "$DIR/start.sh"

( cd "$STAGE" && zip -r "$ROOT/${NAME}.zip" "$NAME" >/dev/null )

echo "Wrote $ROOT/${NAME}.zip"
unzip -l "$ROOT/${NAME}.zip" | sed 's/^/  /'
