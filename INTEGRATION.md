# INTEGRATION — how the pieces connect, and in what order

The hub is deliberately **self-contained** right now: no sim is vendored, no
external project is referenced, and every page works served from this
directory alone. This file is the record of what connects later, how, and
what was already agreed — so the merge is a checklist, not an archaeology
dig.

Current state: `/DEVICE_KNIGHT/` shows NOT CONNECTED. It heals on its own
the moment the sim is vendored.

`/DEVICE_INDEX/` HAS BEEN REMOVED and the room must not come back: the path
is gone, its two noscript links are gone, and `/DEVICE_INDEX/` now falls to
404.html like any other name that was never a device.

## 1. Connect knight-sim (the merge step)

```sh
tools/vendor-knight.sh            # copies ~/knight-sim's playable build in
```

That copies `web/ sim/ render/ input/ assets/` (exactly what knight-sim's
own `pages.yml` ships) into `DEVICE_KNIGHT/`, stamps the source commit into
`DEVICE_KNIGHT/BUILD`, and never touches the hub's `DEVICE_KNIGHT/index.html`.
Then serve the site root and check:

- `/DEVICE_KNIGHT/` boots the sim (title screen, playable, audio after first
  keypress)
- the hub mute button works and survives a reload
- deep link `/DEVICE_KNIGHT/?mode=practice&attack=stars&difficulty=2` skips
  the title into practice

### The 2-line sim change (approved, deferred — do it upstream, then simplify here)

`render/sprites.js` and `render/audio.js` fetch `'../assets/…'`
**document-relative**, so the hosting page must sit one URL level below the
repo root. The hub's host page fakes that position with `<base href="./web/">`.
The agreed upstream fix makes the driver host-independent:

```js
// render/sprites.js
const BASE = new URL('../assets/sprites/', import.meta.url).href;
// render/audio.js
const BASE = new URL('../assets/audio/', import.meta.url).href;
```

(This is also what knight-sim's `pages.yml` comment already *claims* is true —
only `render/font.js` actually does it today.) After that lands upstream and
is re-vendored: delete the `<base>` tag from `DEVICE_KNIGHT/index.html` and
change its `import('./main.js')` to `import('./web/main.js')`, and the
`../../` hrefs in that page become `../`. Run `npm run verify` upstream after
the change (expect the tracked 40/41).

### KNIGHT slot stats (agreed: rectify at merge)

The menu slot currently shows static text (`CHAPTER 3 · READY`). The plan for
real per-visitor playtime/attempts/wins, in preference order:

1. **Proper hook (small upstream change):** `web/main.js` dispatches
   `CustomEvent('knightsim', {detail: {type: 'win'|'gameover'|'reset'}})` at
   the three places it already handles those transitions, plus a running
   frame count. The hub host page listens, accumulates into
   `localStorage['thedevice.stats.knight']`, and `index.html` renders it into
   the slot's `.meta` (playtime as `H:MM`, the game's save-file format).
2. **Zero-upstream fallback:** poll `window.__sim.state` (exposed already —
   `frame`, `gameOver`, `endFade`) at ~2 Hz from the host page and detect
   edges. Approximate but honest; misses nothing a save-file readout cares
   about.

Do not fake numbers in the meantime — an invented playtime on a file-select
screen is exactly the "nothing invented ships" violation the sim forbids.

## 2. Connect jevil-sim (later — still deep in bug testing, do not connect yet)

Confirmed: `~/jevil-sim` has the same family layout (`web/ sim/ render/
input/ assets/`), so the same pattern applies. The checklist when it is
ready:

1. Copy `tools/vendor-knight.sh` → `tools/vendor-jevil.sh`, change the
   default source and destination (`DEVICE_JEVIL/`).
2. **Inspect before assuming** — the knight host page encodes knight-sim's
   contract (`#game` 640×480, `#hud`, `window.__audio`, document-relative
   asset fetches, localStorage key `knightsim.settings`). Verify each against
   jevil-sim's `web/` before copying the host page; note its settings key so
   the two sims never collide in storage.
3. Replace `DEVICE_JEVIL/index.html` (today: the DEVICE_FAILURE slot page)
   with a host page modeled on `DEVICE_KNIGHT/index.html`, keeping its
   OG/twitter block (new screenshot: `og/jevil.png`).
4. On the menu, turn slot 2 into a filled file: copy the KNIGHT slot's
   markup, `[ EMPTY ]` → `JEVIL`, meta `CHAPTER 2 · READY`.
5. The remaining empty slots stay pointed at `/DEVICE_FAILURE/` until their
   boss exists; when one becomes real, give it a named route first
   (`DEVICE_<NAME>/` as a slot page), then repeat this list.

## 2a-2. Connect eram-sim (DEVICE_MANTLE — the in-TV handoff)

Different contract from the knight: eram-sim does not navigate to its own
page — selecting DEVICE_MANTLE transitions **inside the television on
DEVICE_MENU**, same browser page, no iframe. The sim is built for it:
`runBoard(canvas, level, opts)` takes any canvas and a `base` path, every
fetch is base-relative, audio is injectable (`opts.audio`), and
`opts.onComplete` hands control back. At merge time:

1. ~~Vendor `sim/ assets/` from ~/eram-sim~~ **DONE** —
   `tools/vendor-eram.sh` (its index.html is bug-test scaffolding and
   stays home; the vendored commit is stamped in `DEVICE_MANTLE/BUILD`).
2. On DEVICE_MANTLE select: play the reverse tvturnoff as usual, then

   ```js
   import { mountEram } from './DEVICE_MANTLE/sim/eram.js';
   const eram = await mountEram(tvCanvas, {
     base: './DEVICE_MANTLE/assets/',
     onLevelChange: (n, title) => { /* label the TV */ },
     onExit: () => { /* the route finished — hand the TV back */ },
   });
   // eram.stop() tears down; eram.jump(n) is the debug entry.
   ```

   `mountEram` chains all seven levels itself, touches no DOM beyond the
   canvas, and every fetch is base-relative. eram-sim's index.html is the
   reference host — it runs on exactly this call.
3. The sim's own TV-set drawing (`drawTV` in sim/board.js) duplicates the
   room's television — pass/patch it off at embed time; it is one function,
   kept separable on purpose.
4. localStorage: eram uses `eramsim.*` keys only — no collision with
   `thedevice.prefs` or `knightsim.settings`.

## 2b. The extracted assets

The interrogation draws with the game's own font, background and soul, and
they are regenerated from YOUR copy of the game:

```sh
tools/extract-gonermaker.sh            # defaults to ~/knight-research/oracle
```

`docs/ALLUSIONS.md` lists every constant the scene runs on and where it was
read. **All of it is committed, audio included** — the sound is cleared for
use in these projects, so the drone ships with the scene it belongs to and
"DO YOU WANT SOUND?" is a real question on the deployed site.

(This supersedes the older line in knight-sim's `extract_audio.csx`, which
says extracted audio never goes in a public repo. That caution does not
apply here.)

Browsers still gate playback behind a gesture, and the sequence opens with
240 frames that contain no input, so the drone starts when sound is granted
rather than at frame 0 — a platform limit, not a posture. See
`docs/ALLUSIONS.md` § honest deviations.

## 3. Release

**Live now:** <https://radi0show.github.io/thedevice/> — GitHub Pages, deploy
from `main` at the repo root, no build step and no workflow. Push to `main`
is the deploy.

- **`_headers` does nothing on GitHub Pages.** It is a Cloudflare/Netlify
  file and is kept for the eventual move; Pages sets its own caching.
- **The OG/twitter URLs are absolute and currently point at
  `radi0show.github.io/thedevice/`.** At the domain cutover, grep every
  `.html` for that string and swap it for `thedevice.dev` — scrapers require
  absolute URLs, so this cannot be made relative.
- `404.html` is served for every unknown path at any depth, so it is
  **deliberately self-contained** (inlined CSS and JS, and a home link
  computed from `location`) — a relative stylesheet resolves against a
  directory that does not exist, and a root-absolute one breaks under the
  `/thedevice/` project subpath.

### When it moves to thedevice.dev

- **Host:** Cloudflare Pages, no build command, output directory = repo root.
  `404.html` is picked up automatically and serves DEVICE_FAILURE for every
  unknown route.
- **Headers:** `_headers` is already in place — vendored sim assets cache
  immutable (they only change by re-vendoring), HTML stays revalidated.
- **OG images** live in `og/` and are referenced by **absolute**
  `https://thedevice.dev/…` URLs (scrapers require absolute). If the domain
  ever changes, grep every page for `thedevice.dev`. The typographic cards
  are generated — `python3 tools/gen-og.py` rebuilds them from the site's own
  glyph table. After the knight is connected, replace `og/knight.png` with a
  real gameplay frame: load `/DEVICE_KNIGHT/?frames=1200&pause=1&seed=12345`,
  screenshot the canvas at 1200×630. Deterministic, so the card is
  reproducible.
- **Speed to play:** launch traffic lands on `/DEVICE_KNIGHT` directly. After
  vendoring, generate `<link rel="modulepreload">` hints for the sim's module
  graph into the host page head (one `find DEVICE_KNIGHT/{sim,render,input}
  DEVICE_KNIGHT/web -name '*.js'` pass) to collapse the import waterfall.
  Optional but cheap; the sprite manifest fetch is the long pole either way.

## 4. Decisions already made (so they are not re-litigated)

- **The site speaks in the game's own register.** The interrogation, the
  menu, and the failure pages are built on the real `DEVICE_` objects in the
  game files. `docs/ALLUSIONS.md` is the ledger: every borrowed line with
  its source in the dump, the grep recipe to find more, and the rule against
  adding more. Copy changes go through that file.
- **The interrogation IS the settings screen.** First visit asks three
  questions (`thedevice.prefs`: `{seenIntro, flickerOK, soundOn}`);
  [ RECONFIGURE ] on the menu re-asks. Q1 is the game's own
  "FIRST. ARE YOU PHOTOSENSITIVE?" — asked before anything on the site
  flickers, and `prefers-reduced-motion` overrides it toward stillness
  regardless of the answer. Q2 gates the hub's square-wave blips.
- **No click-to-start audio gate on /DEVICE_KNIGHT.** The sim solves
  autoplay internally (AudioContext resumes on first keypress); the hub adds
  the persistent mute button (`window.__audio.enabled`, persisted as
  `thedevice.mute`, key `M`). Known wrinkle: unmuting does not resume a
  music loop mid-fight — the next cue or reset restarts it; the sim's own Q
  key behaves the same.
- **The photosensitivity question governs the SITE, not the fight.** The
  fight's own strobes are game content the hub cannot reach; an in-fight
  flash-reduction mode would be a sim feature and a sim decision.
- **Empty slots are redacted, not named** ( `02 J▒▒▒▒` … ), so the menu
  teases without publishing a roadmap. `/DEVICE_JEVIL` exists as a named
  route because the spec's routing table names it; the other bosses get
  routes when they get builds.
- **Placeholders block release:** dataminer credits on `DEVICE_CONTACT`,
  and the KO-FI/support URL (three sites: DEVICE_CONTACT, DEVICE_JEVIL,
  and the menu's in-page failure view). Ship-blocking by design — credits
  are load-bearing.
- **`shared/pixeltext.js` is build tooling now.** No page uses it; it stays
  because `tools/gen-og.py` reads its glyph table to render the OG cards.
