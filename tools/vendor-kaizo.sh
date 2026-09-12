#!/bin/sh
# CONNECT THE KAIZO KNIGHT SIM — copies the playable build into DEVICE_KAIZO/.
#
# The sibling of tools/vendor-knight.sh, and the same bargain: a COPY, not a
# submodule or symlink, because the deployed site must be a self-contained tree
# of static files and a copy cannot half-exist. Idempotent — re-run after any
# upstream change.
#
# WHAT THIS SHIPS THAT vendor-knight.sh DOES NOT: the `kaizo/` tree. The kaizo
# build is knight-sim's engine plus a kaizo-owned layer that the engine reaches
# only through `state.kaizo.hooks.*`, so both have to travel together.
#
# WHAT IT DELIBERATELY LEAVES HOME:
#   kaizo/tools/     2.8M of checks, oracle differs and regen tooling. None of
#                    it runs in a browser and some of it names the research
#                    repo's paths. The repo's asset policy is that no GML dump
#                    and no oracle build enters a public repo, and this is the
#                    line where that is enforced.
#   kaizo/*.md       HANDOFF, STRATEGY, RENDER-CRITIC — working documents.
#
# 47 files under kaizo/ mention `knight-research` paths. Every one is inside a
# COMMENT (verified: no non-comment line matches), and the strip pass below
# removes every comment from the copy — so the research tree is named nowhere
# in what ships. If that strip is ever skipped, those paths ship with it.
#
# Usage:  tools/vendor-kaizo.sh [path-to-kaizo-knight-sim]
set -eu

SRC="${1:-D:/ShadowCrystal/kaizo-knight-sim}"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
DEST="$(cd "$TOOLS/.." && pwd)/DEVICE_KAIZO"

VENDORED="web sim render input assets kaizo"

for d in $VENDORED; do
  [ -d "$SRC/$d" ] || { echo "error: $SRC/$d not found — is $SRC a kaizo-knight-sim checkout?" >&2; exit 1; }
done

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

# The tooling and the working documents do not ship. See the header.
rm -rf "$DEST/kaizo/tools"

# EVERY .md AND .txt GOES, BY RULE RATHER THAN BY NAME. The strip pass below
# only understands .js/.mjs/.html/.css, so a markdown file ships VERBATIM —
# and kaizo/party/WEIRD-ROUTE.md names `knight-research` paths in its prose.
# Naming the known files here would have worked today and failed silently the
# next time someone adds a note beside the code.
find "$DEST" \( -name '*.md' -o -name '*.txt' \) -type f -delete

# THE HOST PAGE IS DERIVED, NOT HAND-WRITTEN — and that is the difference from
# DEVICE_KNIGHT, whose index.html is this site's own and is left alone.
#
# The kaizo entry page carries DOM the sim reads (the touch overlay, and now the
# pre-fight mode select the mod raises before the fight). A hand-written copy
# would silently fall behind the moment upstream adds another node — so this
# takes upstream's web/kaizo.html verbatim and rewrites its four relative
# references to sit one directory up, then adds this site's own metadata.
if command -v node >/dev/null 2>&1; then
  node "$TOOLS/host-kaizo.mjs" "$DEST/web/kaizo.html" "$DEST/index.html"
else
  echo "error: node not found — cannot derive the host page" >&2; exit 1
fi

# STRIP COMMENTS FROM THE COPY, NEVER FROM SOURCE. The whole directory is
# passed, so the derived index.html is stripped along with the trees — which is
# what keeps upstream's GML citations and research paths out of what a browser
# downloads.
if command -v node >/dev/null 2>&1; then
  node "$TOOLS/strip-tree.mjs" "$DEST"
else
  echo "warning: node not found — vendored copy SHIPS ITS COMMENTS" >&2
fi

if command -v git >/dev/null && git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
  git -C "$SRC" rev-parse --short HEAD > "$DEST/BUILD"
fi

echo "connected: $(du -sh "$DEST" | cut -f1) in $DEST"
echo "verify:    serve the site root and open /DEVICE_KAIZO/"
