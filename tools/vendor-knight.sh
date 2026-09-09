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
# The copy is then COMMENT-STRIPPED in place (see the note above the strip
# pass). Upstream keeps every comment; the vendored copy keeps none.
#
# Usage:  tools/vendor-knight.sh [path-to-knight-sim]   (default ~/knight-sim)

set -eu

SRC="${1:-$HOME/knight-sim}"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
DEST="$(cd "$TOOLS/.." && pwd)/DEVICE_KNIGHT"

VENDORED="web sim render input assets"

for d in $VENDORED; do
  [ -d "$SRC/$d" ] || { echo "error: $SRC/$d not found — is $SRC a knight-sim checkout?" >&2; exit 1; }
done

# Mirror one directory, with delete semantics so removals upstream are honest.
# rsync when it exists; a plain rm+cp otherwise. The fallback is the same net
# effect for a tree of static files, and it keeps this script runnable on a bare
# Git-for-Windows shell, which ships no rsync.
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

for d in $VENDORED; do
  mirror "$SRC/$d" "$DEST/$d"
done

# STRIP COMMENTS FROM THE COPY, NEVER FROM SOURCE.
#
# knight-sim/sim, render/ and input/ are ~45% comments by line on purpose — the
# GML citations, the `ORIGINAL BUG:` markers and the "tried and reverted" notes
# are the most valuable thing in the project, and knight-sim/CLAUDE.md asks for
# them. They are also served verbatim to anyone who opens DevTools. This is the
# only layer where both can be true: source keeps every comment, the shipped
# copy keeps none. Because the mirror above re-copies from source first, running
# this script twice produces identical bytes.
#
# Only the directories just mirrored are passed. DEVICE_KNIGHT/index.html is
# THIS site's host page, not upstream's, and is left alone.
if command -v node >/dev/null 2>&1; then
  STRIP_DIRS=""
  for d in $VENDORED; do STRIP_DIRS="$STRIP_DIRS $DEST/$d"; done
  # shellcheck disable=SC2086
  node "$TOOLS/strip-tree.mjs" $STRIP_DIRS
else
  echo "warning: node not found — vendored copy SHIPS ITS COMMENTS" >&2
fi

# Stamp the source commit so a bug report can say which build this is.
if command -v git >/dev/null && git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
  git -C "$SRC" rev-parse --short HEAD > "$DEST/BUILD"
fi

echo "connected: $(du -sh "$DEST" | cut -f1) in $DEST"
echo "verify:    serve the site root and open /DEVICE_KNIGHT/"
