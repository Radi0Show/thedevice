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
