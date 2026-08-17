#!/bin/sh
# EXTRACT THE SEQUENCE'S ASSETS from your own copy of DELTARUNE.
#
# The interrogation on the front page is a recreation of Chapter 1's vessel
# creation (`DEVICE_CONTACT` and friends), and it draws with the game's real
# font, background and soul. Those come out of the data file — nobody's copy
# but your own — and this script is how they get there.
#
# Everything it writes is committed, audio included. You only need to run
# this to REGENERATE the assets — after a game update, or to prove that what
# is in the repository is what the data file actually contains.
#
# Note what "audio" means for this scene: one looping drone. The typer is
# `snd_nosound`, so the text itself is silent, and the appearance chime fires
# exactly once.
#
#   tools/extract-gonermaker.sh [path-to-DELTARUNE.app]
#
# Needs UndertaleModCli (https://github.com/UnderminersTeam/UndertaleModTool);
# point UTMT at it if it is not on PATH.

set -eu

APP="${1:-$HOME/knight-research/oracle/DELTARUNE.app}"
UTMT="${UTMT:-$HOME/tools/utmt-cli/UndertaleModCli}"
PATCHES="${PATCHES:-$HOME/knight-research/tools/patches}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/assets/gonermaker"

# macOS ships the chapter data as game.ios, not data.win. Every guide online
# says data.win; on this platform that path does not exist.
CH1="$APP/Contents/Resources/chapter1_mac/game.ios"
MUS="$APP/Contents/Resources/mus"

[ -f "$CH1" ] || { echo "error: no chapter 1 data at $CH1" >&2; exit 1; }
[ -x "$UTMT" ] || { echo "error: UndertaleModCli not at $UTMT (set UTMT=)" >&2; exit 1; }

mkdir -p "$DEST"

# fnt_main — scr_84_get_font("main"), the font every DEVICE_ screen draws with.
FNT_TARGET=fnt_main "$UTMT" load "$CH1" -s "$PATCHES/extract_font.csx" -o /tmp/gm_x.ios >/dev/null
cp /tmp/font_out/fnt_main.png /tmp/font_out/fnt_main.json "$DEST/"

# IMAGE_DEPTH — what DEVICE_OBACK_4 draws, four mirrored copies of it.
BG_TARGET=IMAGE_DEPTH "$UTMT" load "$CH1" -s "$PATCHES/extract_background.csx" -o /tmp/gm_x.ios >/dev/null
cp /tmp/bg_out/IMAGE_DEPTH_0.png "$DEST/IMAGE_DEPTH.png"

# IMAGE_SOUL_BLUR — DEVICE_APPEARANCE's sprite, and the choice cursor.
SPR_TARGET=IMAGE_SOUL_BLUR "$UTMT" load "$CH1" -s "$PATCHES/extract_sprite.csx" -o /tmp/gm_x.ios >/dev/null
cp /tmp/spr_out/IMAGE_SOUL_BLUR_0.png "$DEST/IMAGE_SOUL_BLUR.png"

# AUDIO — loose in the bundle (the drone) and packed (the appearance chime).
cp "$MUS/audio_drone.ogg" "$DEST/" 2>/dev/null \
  || echo "note: audio_drone.ogg not found in $MUS — the scene will be silent"
echo AUDIO_APPEARANCE > /tmp/gm_cues.txt
SND_LIST=/tmp/gm_cues.txt "$UTMT" load "$CH1" -s "$PATCHES/extract_audio.csx" -o /tmp/gm_x.ios >/dev/null
cp /tmp/snd_out/AUDIO_APPEARANCE.wav "$DEST/" 2>/dev/null || true

ls -la "$DEST"
