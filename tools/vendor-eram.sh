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
# The copy is then COMMENT-STRIPPED in place, exactly as the knight's is.
#
# Usage:  tools/vendor-eram.sh [path-to-eram-sim]   (default ~/eram-sim)

set -eu

SRC="${1:-$HOME/eram-sim}"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
DEST="$(cd "$TOOLS/.." && pwd)/DEVICE_MANTLE"

VENDORED="sim assets"

for d in $VENDORED; do
  [ -d "$SRC/$d" ] || { echo "error: $SRC/$d not found — is $SRC an eram-sim checkout?" >&2; exit 1; }
done

# See vendor-knight.sh: rsync when present, rm+cp on shells that have none.
mirror() {
  _src="$1"; _dest="$2"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$_src/" "$_dest/"
  else
    [ -n "$_dest" ] || { echo "error: empty destination" >&2; exit 1; }
    rm -rf "$_dest"
    mkdir -p "$_dest"
    cp -R "$_src/." "$_dest/"
  fi
}

mkdir -p "$DEST"
for d in $VENDORED; do
  mirror "$SRC/$d" "$DEST/$d"
done

# Strip comments from the COPY only — eram-sim's own source keeps every one of
# them. The mirror above re-copies from source first, so this is idempotent.
if command -v node >/dev/null 2>&1; then
  STRIP_DIRS=""
  for d in $VENDORED; do STRIP_DIRS="$STRIP_DIRS $DEST/$d"; done
  # shellcheck disable=SC2086
  node "$TOOLS/strip-tree.mjs" $STRIP_DIRS
else
  echo "warning: node not found — vendored copy SHIPS ITS COMMENTS" >&2
fi

if command -v git >/dev/null && git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
  git -C "$SRC" rev-parse --short HEAD > "$DEST/BUILD"
fi

echo "connected: $(du -sh "$DEST" | cut -f1) in $DEST"
echo "verify:    DEVICE_ROOM's television mounts it (see INTEGRATION.md § 2a-2)"
