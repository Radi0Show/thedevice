# DEPLOY — shadowcrystal.dev

The site is this repo, served as static files. Two surfaces, gated by
branch — pushing to main NEVER touches production:

- **Staging** — GitHub Pages at radi0show.github.io/thedevice, deploys on
  every push to `main`, exactly as before. Bug-test freely here. Free,
  ~100 GB/month soft cap: fine for testing, not for a traffic spike.
- **Production** — Cloudflare Pages behind shadowcrystal.dev, deploys
  ONLY from the `prod` branch (.github/workflows/deploy-cloudflare.yml).
  Free tier, unlimited static bandwidth, global CDN, automatic HTTPS
  (which .dev REQUIRES — the whole TLD is HSTS-preloaded).

## Promoting to production

When staging looks right:

    git push origin main:prod

That fast-forwards `prod` to what `main` has now; the workflow deploys it.
To ship (or roll back to) a specific commit instead:

    git push origin <sha>:prod --force

`prod` is therefore always the exact tree that is live — reading the
branch answers "what is production running?".

Every path ships under the domain automatically because the repo is the
site tree: shadowcrystal.dev/ is the boot, shadowcrystal.dev/DEVICE_KNIGHT/
is the knight, and so on — same URLs as staging, different host.

## The sims are vendored, not referenced

`tools/vendor-knight.sh` and `tools/vendor-eram.sh` copy the playable
builds in from the sibling checkouts, stamp the source commit into
`*/BUILD`, and the result is committed. What was playtested is
byte-for-byte what ships; a sim update is: fix upstream, re-run the vendor
script, commit here.

- `DEVICE_KNIGHT/` — knight-sim's `web/ sim/ render/ input/ assets/`
- `DEVICE_MANTLE/` — eram-sim's `sim/ assets/` ONLY (no page of its own:
  DEVICE_ROOM's television mounts it in-page via `mountEram`, see
  INTEGRATION.md § 2a-2)

## How production actually deploys

The dashboard project `thedevice` (Workers & Pages) is GIT-CONNECTED to
this repo: Cloudflare clones on push and runs wrangler itself — no GitHub
Action, no repo secrets. `wrangler.jsonc` declares the repo root as a
directory of static assets (no Worker script), and `.assetsignore` keeps
tools/, docs/ and the workflows out of the served site. A missing URL
serves /404.html — the in-fiction DEVICE_FAILURE page.

Settings that make the gate hold (dashboard → the project → Settings →
Build):

- **Production branch: `prod`.** Production deploys ONLY from `prod`;
  pushes to `main` make preview builds at most (or turn non-production
  builds off entirely to save build minutes).
- Build command: none. Deploy command: the default (`npx wrangler
  deploy` on the production branch; non-production branches get
  `versions upload`, which never touches live traffic).

Remaining one-time steps:

1. **Buy shadowcrystal.dev** — Cloudflare Registrar sells at cost
   (Domain Registration → Register), same account, so DNS is automatic.
2. **Attach the domain**: the project → Domains tab → add
   `shadowcrystal.dev` (and `www.shadowcrystal.dev` if wanted).
   Certificates are automatic.

## Posture

Non-commercial fan project: no ads, no monetization, the attribution
footer ships on every page. That is both the community norm this kind of
project lives under and the practical protection for the domain.
