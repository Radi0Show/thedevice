# CLAUDE.md — thedevice (shadowcrystal.dev)

*(Bootstrap notes written at the Windows migration, 2026-08-28, from the
previous assistant's memory. Verify anything load-bearing against the repo's
own docs — ALLUSIONS.md and the tools — before relying on it.)*

**What this is.** The shadowcrystal.dev site root. The front page recreates
Chapter 1's GONERMAKER sequence from extracted assets; the boss sims are
VENDORED into this repo and embedded (eram-sim runs inside the TV in
DEVICE_ROOM — same page, seamless, but the sims stay separable: no
page-chrome dependencies inside a sim).

**Voice.** The survey-program interrogation register, not pixel-UI chrome.
`ALLUSIONS.md` is the ledger of references — keep it current.

**Rules.**
- Never hand-edit a vendored sim copy. Fix the sim in its own repo
  (`D:\ShadowCrystal\<name>-sim`), then re-vendor with the vendor scripts.
- **Prod promotion only on the user's word**, via `git push origin main:prod`.
  GH Pages (radi0show.github.io/thedevice) is staging; Cloudflare Pages prod
  (shadowcrystal.dev) has a dormant workflow until its secrets are re-added
  post-migration.
- Commits carry no Co-Authored-By trailer.
- Never commit data.win/game.ios/GML dumps/oracle builds. Extracted audio and
  sprites are cleared to ship.

**Next planned work at migration time:** DEVICE_MANTLE → TV wiring in
DEVICE_MENU.
