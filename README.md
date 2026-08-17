# THE DEVICE

Hub site for browser recreations of DELTARUNE's secret bosses. The landing
page opens as a survey-program interrogation, then a file-select: the one
built boss is a real slot, the unbuilt ones are redacted. The voice is
sourced from the game's own `DEVICE_` objects — `docs/ALLUSIONS.md` is the
ledger of every borrowed line and the rule against adding more.

**Live:** <https://radi0show.github.io/thedevice/>

The opening is a recreation of Chapter 1's vessel-creation sequence, rebuilt
from its own objects — `fnt_main`, typer 666, `IMAGE_DEPTH`, the soul, the
30 Hz clock. `docs/ALLUSIONS.md` cites every constant to the event it was
read from.

Static files only — no build step, no backend. Serve the repo root:

```sh
python3 -m http.server 8300
```

The game's assets are not redistributable guesswork — regenerate them from
your own copy:

```sh
tools/extract-gonermaker.sh
```

The audio is deliberately not in the repository, so the deployed sequence
runs in silence until you extract it locally. See INTEGRATION.md § 2b.

**Current state: self-contained.** No simulator is vendored yet;
`/DEVICE_KNIGHT/` shows NOT CONNECTED and the attack index renders from a
snapshot. `INTEGRATION.md` is the checklist for connecting knight-sim (one
script), jevil-sim (later), stats, and the thedevice.dev release.

```
index.html            DEVICE_MENU     the file select
DEVICE_KNIGHT/        host page for the sim (vendored at merge time)
DEVICE_JEVIL/         empty slot — DEVICE_FAILURE wearing the slot's name
DEVICE_INDEX/         attack index, imported live from the sim when connected
DEVICE_CONTACT/       credits, bug reports, disclaimer
DEVICE_FAILURE/       the nothing-here page; 404.html is its root-path twin
shared/               css, page behavior, the pixel-glyph renderer
tools/vendor-knight.sh  the connect step
```

A fan project, unaffiliated with Toby Fox. DELTARUNE © Toby Fox —
[support the official release](https://deltarune.com).
