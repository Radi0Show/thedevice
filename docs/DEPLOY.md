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

## One-time human steps (in order, ~15 minutes)

1. **Cloudflare account** (free plan) at dash.cloudflare.com.
2. **Buy shadowcrystal.dev** — Cloudflare Registrar sells at cost
   (Domain Registration → Register). Registering it there puts its DNS on
   the same account, which makes step 5 two clicks.
3. **Create the Pages project**: Workers & Pages → Create → Pages →
   "Direct Upload" → name it exactly `shadowcrystal`. (Direct Upload
   because the workflow pushes builds to it; no git connection needed.)
4. **Add the two repo secrets** on github.com/Radi0Show/thedevice →
   Settings → Secrets and variables → Actions:
   - `CLOUDFLARE_ACCOUNT_ID` — dashboard right sidebar.
   - `CLOUDFLARE_API_TOKEN` — My Profile → API Tokens → Create Token →
     "Cloudflare Pages: Edit" template.
5. **Custom domain**: the Pages project → Custom domains → add
   `shadowcrystal.dev` (and `www.shadowcrystal.dev` if wanted — Cloudflare
   sets the redirect). Certificates are automatic.
6. Push anything to main (or run the workflow manually) — the deploy step
   wakes up on its own once the secrets exist.

Until steps 1-5 happen, the workflow runs and skips the deploy politely;
nothing breaks.

## Posture

Non-commercial fan project: no ads, no monetization, the attribution
footer ships on every page. That is both the community norm this kind of
project lives under and the practical protection for the domain.
