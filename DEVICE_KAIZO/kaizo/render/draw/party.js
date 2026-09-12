

import { drawSpriteExt } from '../../../render/draw/gm.js';
import { mergeColor } from '../../../sim/gml.js';

const HERO_SCALE = 2;

const FROZEN_SPECIALCOLOR = mergeColor([0, 0, 128], [255, 255, 255], 0.8);

const C_BLUE = [0, 0, 255];

function drawSpritePartExt(ctx, entry, sub, left, top, w, h, x, y, xs, ys, color, alpha) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[((sub | 0) % entry.frames.length + entry.frames.length) % entry.frames.length];
  if (!img) return;
  const sx = Math.max(0, left);
  const sy = Math.max(0, top);
  const sw = Math.min(w - (sx - left), img.width - sx);
  const sh = Math.min(h - (sy - top), img.height - sy);
  if (!(sw > 0) || !(sh > 0)) return;
  const a = Math.max(0, Math.min(1, alpha));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.scale(xs, ys);

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.restore();
}

function drawSpritePartFogged(ctx, helpers, entry, sub, left, top, w, h, x, y, xs, ys, color, alpha) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[((sub | 0) % entry.frames.length + entry.frames.length) % entry.frames.length];
  if (!img) return;
  const baked = helpers.fogged(img, color);
  drawSpritePartExt(ctx, { frames: [baked], meta: entry.meta }, 0,
    left, top, w, h, x, y, xs, ys, null, alpha);
}

export function drawFrozenStatue(ctx, statue, state, helpers) {
  const entry = helpers.sprites.get(statue.sprite);
  if (!entry || !entry.frames.length) return;
  const sub = statue.image_index ?? 0;
  const xs = statue.image_xscale ?? 2;
  const ys = statue.image_yscale ?? 2;
  const alpha = statue.image_alpha ?? 1;
  const { x, y } = statue;

  drawSpriteExt(ctx, entry, sub, x, y, xs, ys, 0, null, alpha);

  const timer = Math.min(1, (statue.age ?? 0) * 0.05);
  const spriteW = (entry.meta?.w ?? entry.frames[0].width) * xs;
  const spriteH = (entry.meta?.h ?? entry.frames[0].height) * ys;
  const t = (spriteH / 2) - (timer * (spriteH / 2));

  const xoff = -((entry.meta?.ox ?? 0) * xs);
  const yoff = -((entry.meta?.oy ?? 0) * ys);

  const parts = [
    [x - 2 + xoff, y - 2 + (t * 2) + yoff, 0.8],
    [x + 2 + xoff, y - 2 + (t * 2) + yoff, 0.4],
    [x - 2 + xoff, y + 2 + (t * 2) + yoff, 0.4],
    [x + 2 + xoff, y + 2 + (t * 2) + yoff, 0.8],
  ];
  for (const [px, py, pa] of parts) {
    drawSpritePartFogged(ctx, helpers, entry, sub, 0, t, spriteW, spriteH - t,
      px, py, xs, ys, FROZEN_SPECIALCOLOR, alpha * pa);
  }

  void C_BLUE;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSpritePartExt(ctx, { frames: [helpers.tinted(entry.frames[Math.abs(Math.floor(sub)) % entry.frames.length], FROZEN_SPECIALCOLOR)], meta: entry.meta },
    0, 0, t, spriteW, spriteH - t, x + xoff, y + (t * 2) + yoff, xs, ys, null, alpha * 0.4);
  ctx.restore();
}

export function drawActorParty(ctx, e, state, helpers) {
  const h = state.heroes?.[e.slot];

  const statue = h && typeof h.herofrozen === 'object' ? h.herofrozen : null;
  if (h?.frozenHidden) {
    if (statue) drawFrozenStatue(ctx, statue, state, helpers);
    return true;
  }

  const blend = h?.blend && !(h.blend[0] === 255 && h.blend[1] === 255 && h.blend[2] === 255)
    ? h.blend
    : null;

  const entry = helpers.sprites.get(e.sprite_index);
  drawSpriteExt(ctx, entry, e.image_index ?? 0, e.x, e.y,
    HERO_SCALE, HERO_SCALE, 0, blend, e.image_alpha ?? 1);

  if (statue) drawFrozenStatue(ctx, statue, state, helpers);
  return true;
}
