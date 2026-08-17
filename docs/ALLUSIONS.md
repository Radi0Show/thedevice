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

- **The drone cannot start at frame 0.** DEVICE_CONTACT loops it from its
  Create, but the opening is 240 frames with no input in it, and a browser
  will not play audio before a gesture. It starts when sound is granted.
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
