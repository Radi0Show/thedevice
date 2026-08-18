# ALLUSIONS — what the site borrows, and from where

Every Gaster-register line on this site is either lifted from, or shaped
against, the game's own `DEVICE_` objects. This file is the ledger: what is
verbatim, what is paraphrase, and where each source lives in the dump — so
nothing here is fan-wiki hearsay, and so nobody "improves" a line without
knowing what it was quoting.

**The rule: don't overfit.** The register works because it withholds. A few
lines carry the whole voice; every addition dilutes it. If you want to add
an allusion, first find its source with the recipe below, then ask whether
the site is better with one more voice line. It usually is not.

## How to read the source

The dump lives in the PRIVATE repo (never publish it):

```
~/knight-research/gml_dump/CodeEntries/     # 7,603 decompiled .gml files
```

The Gaster-adjacent machinery is the `DEVICE_` object family — real internal
names, exactly as the site spec said:

```
DEVICE_MENU          the file-select screen (both registers — see below)
DEVICE_CONTACT_old   the survey-program interrogation + vessel creation
DEVICE_GONERMAKER    the vessel part-picker (HEAD/BODY/LEGS state machine)
DEVICE_NAMER         the vessel naming keyboard
DEVICE_APPEARANCE    the vessel preview
DEVICE_CHOICE        the question chooser (also ch3's GO BACK / GO FORWARD)
DEVICE_FAILURE       the game over — including the Knight's own variant
DEVICE_OBACK_4       the background
```

English strings are inline in the GML (only Japanese is externalized to
`lang/lang_ja.json`), so a plain grep gets everything:

```sh
grep -oh 'stringsetloc("[^"]*"' \
  ~/knight-research/gml_dump/CodeEntries/gml_Object_DEVICE_*.gml \
  | sed 's/.*stringsetloc("//;s/"$//'
```

If the dump ever needs regenerating, knight-sim's CLAUDE.md has the full
UndertaleModCli recipe (macOS note: the data file is `game.ios`, not
`data.win`, and the CLI runs under Rosetta from `~/tools/utmt-cli`).

## The front page is not an allusion — it is a recreation

The interrogation at `/` is Chapter 1's vessel-creation opening rebuilt from
its own objects, not styled to resemble it. Chapter 1 externalises its
strings, so the words come out of
`chapter1_mac/lang/lang_en.json` rather than the GML:

```sh
python3 -c "
import json; d = json.load(open('chapter1_mac/lang/lang_en.json'))
print('\n'.join(repr(d[k]) for k in d if 'DEVICE_CONTACT_slash_Step_0' in k))"
```

Every constant `shared/gm-intro.js` runs on, and where it was read:

| what | value | source |
|---|---|---|
| font | `fnt_main` ("8bitoperator JVE", ASCII 32–126) | `scr_84_get_font("main")` → `scr_84_init_localization`'s `font_map` |
| typer | 666 = `scr_textsetup(font, c_white, x, y, 33, 0, 4, snd_nosound, 12, 20, 2)` | `scr_texttype` case 666 |
| speed | one character every **4 frames** at 30 Hz | that `rate` argument, via `alarm[0] = rate` |
| advance | **12px flat**, not the glyph's shift | obj_writer Draw: `wx += hspace` |
| line height | 20px | `vspace` |
| **sound** | **`snd_nosound` — the text types in SILENCE** | that `textsound` argument |
| glow | main `1`, cardinals `0.3 + sin(siner/14) * 0.1`, diagonals `0.08 + sin(siner/14) * 0.04` | obj_writer Draw, `special == 2` |
| pauses | `^1`→5 `^2`→10 `^3`→15 `^4`→20 `^5`→30 `^6`→40 `^7`→60 `^8`→90 `^9`→150 frames | obj_writer Alarm_0 |
| music | `AUDIO_DRONE.ogg`, looped from Create | DEVICE_CONTACT Create |
| veil | black rect at `FADEFACTOR` 0.4, over the background and under the text | DEVICE_CONTACT Draw |
| soul | `IMAGE_SOUL_BLUR` at (150,120), `momentum` 0.5, the beam-open reveal | DEVICE_APPEARANCE Create + Draw |
| background | `IMAGE_DEPTH` (160x120), four mirrored copies around (160,120), a new one every `20 / OBM` frames, newer ones further back | DEVICE_OBACK_4 + DEVICE_CONTACT's `OBMADE` block |
| choices | options at x 110 / 190, y 180, selected `c_yellow`, cursor eased by 0.3, **`CURX = -1` so neither starts selected** | DEVICE_CHOICE TYPE 0 |
| room | 320x240, integer-scaled (the game runs it at 2x) | the room's own size |

Two of those are the ones worth defending if anybody "fixes" them later:
the **silence** (a typing blip would be inventing a sound the scene does not
have) and the **flat 12px advance** (proportional spacing is the single most
visible way to get this text wrong).

`\M0` / `\M1` / `\M2` in the real strings are not text effects — they set
`global.flag[20]`, which DEVICE_CONTACT reads to fade the music. The engine
consumes them and moves on.

Two honest deviations, both forced:

- **The drone may not start at frame 0.** DEVICE_CONTACT loops it from its
  Create and so does this, with sound on by default and the question there
  to turn it off — but a browser will not begin playback before a gesture,
  so a cold visit stays quiet until the first key or tap and picks it up
  there. Nothing waits on an answer.
- **The words after "WE MAY BEGIN" are the site's own.** The game goes on to
  build a vessel; this asks the site's three questions in the same notation,
  at the same coordinates, in the same voice.
- **One soul, and it descends.** The original never moves it: DEVICE_CONTACT
  closes the soul away (`SOUL.t -= 2; SOUL.momentum = -0.5`) before the
  questions, and DEVICE_CHOICE draws a separate cursor already sitting at
  the option row — two objects that never share the screen. Asking the
  site's questions inside the opening beat put both up at once, so the soul
  descends and becomes the cursor instead, carried on DEVICE_CHOICE's own
  easing (0.3 of the remaining distance a frame, snapping inside 2px). The
  `sin(HSINER / 16) * 2` bob stops when it stops being the thing in the
  middle.

## The ledger

### Verbatim (kept rare, load-bearing only)

| line on the site | where it appears | source |
|---|---|---|
| `ARE YOU THERE?` / `ARE WE CONNECTED?` | intro, opening; knight page not-connected | `DEVICE_CONTACT_old_Step_0` — the sequence's own opening |
| `EXCELLENT. / TRULY EXCELLENT.` | intro | same file, same order |
| `FIRST. / ARE YOU PHOTOSENSITIVE?` | intro Q1 — the accessibility control | same file; it is the sequence's literal first question, asked before anything moves. (The older build's version, `YOU ACKNOWLEDGE THE POSSIBILITY OF PAIN AND SEIZURE.`, is in the same file.) |
| `UNDERSTOOD.` | intro, after Q1 | same file — its acknowledgment after the seizure question |
| `THANK YOU FOR YOUR TIME.` | intro, closing | same file — opens the discard beat |
| `IT WAS AS IF IT WAS NEVER THERE AT ALL.` | /DEVICE_FAILURE/ and 404 | `DEVICE_MENU_Other_15` — the dark register's erase-complete line; the correct sentence for a page that does not exist |
| `[EMPTY]` (register of the empty slots) | menu slots | `DEVICE_MENU_Create_0` — `NAME[i] = "[EMPTY]"` |

### Shaped against the source (paraphrase, not quote)

| line on the site | shaped against | source |
|---|---|---|
| `THREE QUESTIONS BEFORE YOU PROCEED. ANSWER HONESTLY.` | `HAVE YOU ANSWERED HONESTLY?` | `DEVICE_CONTACT_old_Step_0` |
| `WHEN YOU REACH AN END, WILL YOU PERSIST?` | `IT APPEARS YOU HAVE REACHED AN END.` / `WILL YOU PERSIST?` | `DEVICE_FAILURE_Step_0` — the game-over's own question |
| `IT DOES NOT MATTER. YOU WILL.` | `AND YET YOU PERSIST...` | `DEVICE_FAILURE_Step_0` — the Knight's line |
| `YOUR ANSWERS` → `will now be recorded.` (the case drop) | `YOUR WONDERFUL CREATION` → `Will now be discarded.` | `DEVICE_CONTACT_old_Step_0` — the drop out of capitals is the mechanism being quoted, not the words |
| `SELECT A DEVICE.` | `Please select a file.` — while the dark register (TYPE 0) shows literally a blank `" "` where that prompt would be | `DEVICE_MENU_Draw_0` |
| `VERY INTERESTING.` register generally | `VERY INTERESTING.` / `WHAT AN INTERESTING BEHAVIOR.` / `HOW INTERESTING.` | `DEVICE_MENU_Other_15`, `DEVICE_CONTACT_old_Step_0` |

### Original to the site (in register, no single source)

- `THE MENU PRECEDES THE DEVICE. / THE DEVICE PRECEDES THE DARKNESS.` (ENTRY comments)
- `THIS DEVICE HAS NOT BEEN BUILT.` / `COME BACK WHEN YOU ARE STRONGER.`
- `THERE IS NOTHING HERE.` / `. . . YET.` (the dot)
- `MOST OF THEM WERE NOT NEEDED.`
- `*(do not trust the empty slots.)` (the tab whisper)
- the friend (mismatched pink/yellow eyes) — deliberately unexplained; do not explain it

### Held in reserve (sourced, deliberately unused)

The dark file-menu has more register than the site spends: `IT WILL BE
SUBSUMED.`, `TRULY ERASE IT?` / `THEN IT WILL BE DESTROYED.`, `IT IS BARREN
AND CANNOT BE COPIED.`, `THEN IT WAS SPARED.`, `CHOOSE THE TARGET FOR THE
REFLECTION.`, `PREPARATIONS ARE COMPLETE.` — and DEVICE_FAILURE holds the
Knight's whole monologue (`INCREDIBLE. I FELT IT THERE, SHINING. YOUR
POWER.`, `SHALL WE HASTEN?`, `YOU WON'T WIN LIKE THIS.`). These are the
vocabulary for FUTURE surfaces (a delete-your-save-data control wants
`TRULY ERASE IT?`; a gauntlet mode wants `SHALL WE HASTEN?`). Spending them
now, on nothing, is the overfitting this file exists to prevent.

## DEVICE_BOARD_ROOM — the room, not a likeness

`/DEVICE_BOARD_ROOM/` is `room_board_preshadowmantle` from Chapter 3 — the board
stage Kris plays for a rank (`scr_get_rank_letter`: Z, C, B, A, S, T) — put
back together from the room itself rather than rebuilt by eye. The room's
tiles, its walls and Kris's starting cell are dumped straight out of the
data file:

```sh
ROOM_NAME=room_board_preshadowmantle UndertaleModCli load <game.ios> \
    -s tools/patches/dump_room.csx -o /tmp/x.ios            # tiles + tileset
ROOM_NAME=room_board_preshadowmantle UndertaleModCli load <game.ios> \
    -s tools/patches/dump_room_instances.csx -o /tmp/x.ios  # walls, Kris, triggers
```

| what | value | source |
|---|---|---|
| room | 2460x960, a 77x30 grid of 32px tiles from `bg_board_adventure_tileset` | the room |
| screen | **384x256, fixed at (128,64)** | `obj_board_camera` Create — `gamescreenWidth` / `gamescreenHeight` |
| world offset | `moveX = 128 - roomStartingX`, `moveY = 64 - roomStartingY` → (0, -256) here | `obj_board_camera` Create |
| Kris | 16x16 sprite at the instance's scale 2 = 32x32, starting at room (304,496) | `obj_mainchara_board` + the instance |
| speed | `wspeed = 4` | `obj_mainchara_board` Create |
| bounds | x 128..480, y 64..288 — the pane inset by Kris's own 32px | `obj_mainchara_board` Step, lines 1-4 |
| walls | 21 `obj_board_solid`, 32x32 cells scaled per instance | the room |
| walk cycle | two frames, `image_index += 0.125` while `walkbuffer > 3`; `walkbuffer = 6` **only when x or y actually changed** | `obj_mainchara_board` Step |
| shift | 24px/frame horizontally, 16 vertically — 16 frames either way | `obj_board_camera` Step |

**THE CAMERA NEVER MOVES.** This is the thing to understand before touching
any of it: the screen is a fixed window and Kris is clamped inside it. When
he crosses an edge, `obj_board_camera` translates *the entire world* — the
tile layers by `layer_x`/`layer_y`, and every `obj_board_parent` instance,
Kris included — one whole screen over. Everything in the room moves with the
screen; the screen stays put.

**And Kris gets two pixels back.** The shift moves every board instance by
the full movespeed and then nudges KRIS ALONE by 2 the other way, every
frame. Over 16 frames he travels 352 instead of 384 — from one bound to
exactly the other (480 - 352 = 128) — so he walks in at the edge of the new
screen. Leaving it out was not a cosmetic error: he overshot the opposite
bound, tripped the edge test again, and the screen shifted back and forth
forever. It is four lines and the whole transition depends on them.

The edge only opens onto somewhere real: the shift is refused if a solid
sits one cell beyond the boundary, which is why the room's outer walls are
walls and not exits.

Not included, and honestly labelled: the board's sword, its enemies, the
rank tally and the surrounding game-show set. The room, its walls, its
sprites and the way it moves are the whole of what this is.

## DEVICE_ROOM — the room the game is played in

`/DEVICE_ROOM/` is `room_board_sword_intro`: the television, the console on
the floor, and Kris with a controller in his hands. In Chapter 3 the board
game is what is ON that screen; here what boots is this website.

| what | value | source |
|---|---|---|
| the room | `spr_gameshow_swordroutebg` at (0,0) | `obj_gameshow_swordroute` Create |
| the screen | a 192x144 **hole** in that sprite → 384x288 at (138,42) once drawn at dark-world scale | measured from the sprite's alpha |
| console | `spr_gameshow_console` at (202,322) | same Create |
| TV glow | `spr_gameshow_swordroute_tvglow` at (0,320), additive, tinted by the screen | `obj_gameshow_swordroute` Draw |
| Kris | enters at x 576, walks to (300,298) and faces up; `spr_krisu_holdcontroller` once he is holding it | `obj_swordroute_consolestarter` Create + Step |
| walk | `bwspeed = 3`, running +2 / +4 / +5 at runtimer 0 / 10 / 60 in the dark world | `obj_mainchara` Create + Step |
| scale | everything at 2 | `scr_darksize()` |
| boot | blue `#2F38B0`, then **"NO CONTROLLER"** over `snd_nes_nocontroller`; `snd_tv_static` and `spr_static_effect` when it cuts out | `obj_swordroute_consolestarter` Create/Step/Draw |

The console really does check for a controller — `scr_keyitemcheck(16)` — and
shows "NO CONTROLLER" when you have not got one. That check is the hinge the
whole page hangs on: the television is already on and already complaining
when you walk in, and plugging in is what answers it.

**The walk box is invented, and it is the only invented thing here.** The
room contains no solids — eight instances, not one a wall — because in the
game you never walk in it: the console starter drives Kris to the console on
a timer. Free movement is this site's addition, so its floor is a rectangle
fitted to the lit area of the background art. Everything else is read.

Shortened honestly: the real sequence waits on dialogue, a choice and a
logo animation this room does not have, so the beats between static and boot
are tighter than the original's.

## DEVICE_INSERT — a cut string, finished

Chapter 5's weird route ends on a television, `obj_ch5_LW20W_crt`, which
puts the whole picture through a chromatic-aberration shader. Its Create
also builds a string:

```gml
_insert_text = stringsetloc("INSERT\nCHAPTER 7 SIDE B", ...)
```

**Nothing ever draws it.** A grep across all 11,850 code entries in the
chapter finds exactly one occurrence — that assignment. It is a write-only
variable, the same shape as `splitbox`, `slice_delay` and `linex` in
knight-sim's notes: content that exists as a string and never reaches a
screen.

That matters for what "the same font" can mean here. There is no font to
copy and no position to match, because the game never puts the line up.
`/DEVICE_INSERT/` finishes the joke instead — the television asks for the
cartridge this site is actually about, set in `fnt_main`, the font the rest
of the site already speaks in.

What *is* copied is the effect, and it is **the shader itself**, not a
likeness of it. `assets/crt/shd_crt2.frag` is the chapter's own fragment
shader extracted from the data file — everything from `#define PI` down is
character for character the game's code, with GameMaker's desktop-GLSL
preamble swapped for the two lines WebGL1 needs. It runs against the two
uniforms the object feeds it:

| uniform | value | source |
|---|---|---|
| `aberation_amount` | `0.34` | `obj_ch5_LW20W_crt` Step |
| `TIME` | accumulates `scr_wave(0, 0.75, 4, 0)` every frame | Step + `scr_wave` |
| `scr_wave(a,b,p,ph)` | `a + h + sin(((now/1000 + p*ph)/p) * 2pi) * h`, `h = (b-a)/2` | the script, verbatim |

**Do not "simplify" this back into a canvas filter.** The first version of
this screen split the colour channels by hand in 2D canvas, and it read as
flat next to the real thing — because shd_crt2 is not an aberration effect,
it is a whole television. In order: barrel warp (0.6), per-pixel noise
(0.04), horizontal interference (0.25), a rolling band (0.4 at speed 0.5)
that ALSO multiplies the aberration, a 3-tap Gaussian horizontal filter,
Gaussian scanlines (0.4 at strength -8), an RGB aperture grille (0.6), a
brightness lift, and a vignette (0.7/0.6). The picture is composed at
640x480 because the shader's own `resolution` const is 640x480 and its
emulated pixel grid has to land where it expects.

The questions on it are the interrogation's own two, asked as settings
rather than as questions, and they write to the same stored preferences.


## The board is on the television

The selector lives in the screen of `room_board_sword_intro`, painted by the
room's own renderer rather than laid over it — so it is the picture the
television is showing, with Kris in front of it holding the controller.

| what | value | source |
|---|---|---|
| the blue | `#2F38B0` — the console's own boot blue. The board screen's `#3F48CC` (obj_board_b2s_icedoor) read more electric flat on a bright canvas than the set does in the game | `obj_board_b2s_icedoor` Draw — `draw_sprite_ext(spr_pxwhite, 0,0,0, 640,480, 0, #3F48CC, 1)`, the fill behind "AREN'T YOU FORGETTING SOMETHING IMPORTANT?" |
| the font | `fnt_8bit`, display name **"AdventureBoard"** — monospaced, 16px cell, 20px tall | `scr_84_get_font("8bit")` → `scr_84_init_localization`'s font map |

The cipher is **real Wingdings**, not a likeness of it. The font turned out
to be installed on the machine this was built on, so every letter and the
underscore was rendered at 128px, box-downsampled into a 16x16 cell and
thresholded at 0.36 coverage. The shapes in `shared/wingdings.js` are
Microsoft's — you can recognise them: J K L are the three faces, N the
skull, S the filled drop, T the snowflake, U V W X the crosses, Y the
hexagram, Z the star and crescent. An earlier pass invented symbols that
merely looked occult, which is a different thing from being Wingdings.

They are **baked in as bitmaps on purpose**: Wingdings cannot be embedded
and is absent from most phones and every Linux box, where a missing symbol
font falls back to plain legible letters — leaking the exact thing the
cipher hides, on the machines least likely to have it.

16x16 is fnt_8bit's own cell, so a name in cipher and a name in the board
font sit on the same grid. The cursor is a 6px square centred on the glyph
box, in one column set off the widest name.

**Nothing is written under the list.** It used to say PRESS Z, which is an
instruction on a screen whose whole job is to be a list of names. Only the
NOT BUILT flash remains, and only while you are pressing at something that
isn't there.


## The room has furniture now

`room_board_sword_intro` has no solids — eight instances, not one a wall —
because the game never lets you walk there. Free movement is this site's
addition, so its collision is too, and it is fitted to the art rather than
read out of the room:

- the console's **base** blocks, not its whole sprite. A box the full height
  of `spr_gameshow_console` would swallow the very spot the game itself
  walks Kris to.
- Kris resolves on a box at his **feet**, not his whole body. He is 38x76
  with his head in the upper two thirds, and a body-sized box cannot stand
  in front of anything — it collides with the console while his feet are
  still a body-length away. Overworld characters resolve at the base, and so
  does this one.

## Going in — obj_tvturnoff_manager, backwards

Choosing DEVICE_KNIGHT plays the set turning ON, which is the game's own
turn-OFF run in reverse. Its Draw has three phases:

| phase | frames | what | cue |
|---|---|---|---|
| con 0 | 5 | a white bar at scale (6, 10) fades in | — |
| con 1 | 8 | `_yscale1` eases 10 → 0.05: the picture collapses to a line | `snd_tvturnoff` on frame 4 |
| con 2 | 30 | `_xscale1` eases → 0 while `spr_zapper_tvturnoff2` pops to 0.4 over 5 frames and shrinks away | `snd_tvturnoff2` |

Reversed, that reads as a dot swelling out of nothing, throwing itself wide
into a line, and the line opening into a full white field. The two cues play
in reverse order for the same reason the picture does. The navigation fires
only once the field is total, so the page change happens under the white and
is never seen.

The sprites are the game's own — `spr_zapper_tvturnoff1` (140x238, the bar)
and `spr_zapper_tvturnoff2` (390x390, the dot).
