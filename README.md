# THE DEVICE

Hub site for browser recreations of DELTARUNE's secret bosses. The landing
page opens as a survey-program interrogation, then a file-select: the one
built boss is a real slot, the unbuilt ones are redacted. The voice is
sourced from the game's own `DEVICE_` objects — `docs/ALLUSIONS.md` is the
ledger of every borrowed line and the rule against adding more.

**Live:** <https://radi0show.github.io/thedevice/>

**The chain:** `/` is Chapter 5's weird-route television running its own
`shd_crt2` shader, asking for the cartridge and taking your two settings →
`/DEVICE_MENU/`, Chapter 3's `room_board_sword_intro`, where Kris plugs the
controller in → the board comes up **in the screen** → choosing a device
plays `obj_tvturnoff_manager` backwards and drops you into it.

`/DEVICE_GONERMAKER/` is the Chapter 1 vessel-creation recreation — the same
two questions, in the sequence's own voice. It is off the main path now that
the television asks them. `docs/ALLUSIONS.md` cites every constant to the
event it was read from.

Static files only — no build step, no backend. Serve the repo root:

```sh
python3 -m http.server 8300
```

The sequence's assets — font, background, soul and the drone — are in the
repository, and are regenerated from a copy of the game with:

```sh
tools/extract-gonermaker.sh
```

**Current state: self-contained.** No simulator is vendored yet;
`/DEVICE_KNIGHT/` shows NOT CONNECTED and the attack index renders from a
snapshot. `INTEGRATION.md` is the checklist for connecting knight-sim (one
script), jevil-sim (later), stats, and the thedevice.dev release.

```
index.html            DEVICE_MENU     the file select
DEVICE_KNIGHT/        host page for the sim (vendored at merge time)
DEVICE_JEVIL/         empty slot — DEVICE_FAILURE wearing the slot's name
DEVICE_CONTACT/       credits, bug reports, disclaimer
DEVICE_FAILURE/       the nothing-here page; 404.html is its root-path twin
shared/               css, page behavior, the pixel-glyph renderer
tools/vendor-knight.sh  the connect step
```

A fan project, unaffiliated with Toby Fox. DELTARUNE © Toby Fox —
[support the official release](https://deltarune.com).
