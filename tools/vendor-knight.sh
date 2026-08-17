#!/bin/sh
# CONNECT THE KNIGHT SIM — copies the playable build into DEVICE_KNIGHT/.
#
# This is the merge step INTEGRATION.md describes. It is deliberately a copy,
# not a submodule or symlink: the deployed site must be a self-contained tree
# of static files, and a copy cannot half-exist. Idempotent — run it again
# after any upstream change to refresh the vendored build.
#
# What ships is exactly what knight-sim's own pages.yml ships: web/ sim/
# render/ input/ assets/. tools/, docs/, notes/ and CLAUDE.md stay home.
#
# Usage:  tools/vendor-knight.sh [path-to-knight-sim]   (default ~/knight-sim)

set -eu

SRC="${1:-$HOME/knight-sim}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/DEVICE_KNIGHT"

for d in web sim render input assets; do
  [ -d "$SRC/$d" ] || { echo "error: $SRC/$d not found — is $SRC a knight-sim checkout?" >&2; exit 1; }
done

# --delete keeps removals honest; the exclude protects the hub's host page,
# which is this site's file, not upstream's.
for d in web sim render input assets; do
  rsync -a --delete "$SRC/$d/" "$DEST/$d/"
done

# Stamp the source commit so a bug report can say which build this is.
if command -v git >/dev/null && git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
  git -C "$SRC" rev-parse --short HEAD > "$DEST/BUILD"
fi

echo "connected: $(du -sh "$DEST" | cut -f1) in $DEST"
echo "verify:    serve the site root and open /DEVICE_KNIGHT/"
