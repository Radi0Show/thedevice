#!/bin/sh
# CONNECT THE SWORD-ROUTE SIM — copies eram-sim's engine and asset pack into
# DEVICE_MANTLE/. Same posture as vendor-knight.sh: a copy, not a submodule,
# because the deployed site must be a self-contained static tree.
#
# eram-sim's contract is DIFFERENT from the knight's (INTEGRATION.md § 2a-2):
# it does not get a page of its own — DEVICE_ROOM imports
# DEVICE_MANTLE/sim/eram.js and mounts the whole campaign on the room's own
# television canvas via mountEram(canvas, { base: './DEVICE_MANTLE/assets/' }).
# So this ships sim/ and assets/ ONLY: eram-sim's index.html is bug-test
# scaffolding and deliberately stays home.
#
# Usage:  tools/vendor-eram.sh [path-to-eram-sim]   (default ~/eram-sim)

set -eu

SRC="${1:-$HOME/eram-sim}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/DEVICE_MANTLE"

for d in sim assets; do
  [ -d "$SRC/$d" ] || { echo "error: $SRC/$d not found — is $SRC an eram-sim checkout?" >&2; exit 1; }
done

mkdir -p "$DEST"
for d in sim assets; do
  rsync -a --delete "$SRC/$d/" "$DEST/$d/"
done

if command -v git >/dev/null && git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
  git -C "$SRC" rev-parse --short HEAD > "$DEST/BUILD"
fi

echo "connected: $(du -sh "$DEST" | cut -f1) in $DEST"
echo "verify:    DEVICE_ROOM's television mounts it (see INTEGRATION.md § 2a-2)"
