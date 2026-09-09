


import { drawSpriteExt } from './gm.js';

export function drawFallingSword(ctx, e, state, deps) {
  const { sprites } = deps;
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return true;

  const vx = state.view.x;
  const vy = state.view.y;
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const alpha = e.image_alpha ?? 1;

  for (let i = (e.old_x?.length ?? 1) - 1; i > 0; i--) {
    const a = alpha - 0.3 * i;
    if (a <= 0) continue;
    drawSpriteExt(ctx, entry, 0, e.old_x[i] - vx, e.old_y[i] - vy,
      xs, ys - 0.2 * i, e.old_angle[i], null, a);
  }
  drawSpriteExt(ctx, entry, 0, e.x - vx, e.y - vy, xs, ys, e.image_angle ?? 0,
    e.image_blend, alpha);
  return true;
}


export function drawSwordfallKnight(ctx, e, state, deps) {
  const { sprites } = deps;
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return true;
  const k = state.knight;
  const dip = Math.sin(state.frame * 0.1) * (e.dip ?? 0);
  const idx = Math.abs(Math.floor(e.image_index ?? 0)) % entry.frames.length;

  if (e.forcexfix && e.sprite_index === 'spr_roaringknight_attack_ol_center') {

    const y = (k?.ystart ?? 78) + Math.cos((e._siner ?? 0) / 8) * 8;
    drawSpriteExt(ctx, entry, idx, 544, y,
      e.image_xscale ?? 2, e.image_yscale ?? 2, e.image_angle ?? 0, e.image_blend,
      e.image_alpha ?? 1);
  } else if (e.sprite_index === 'spr_roaringknight_sword_ol') {
    drawSpriteExt(ctx, entry, idx, 544, e.y - state.view.y + dip + 30,
      e.image_xscale ?? 2, e.image_yscale ?? 2, e.image_angle ?? 0, e.image_blend,
      e.image_alpha ?? 1);
  } else {
    drawSpriteExt(ctx, entry, idx, e.x - state.view.x, e.y - state.view.y + dip,
      e.image_xscale ?? 2, e.image_yscale ?? 2, e.image_angle ?? 0, e.image_blend,
      e.image_alpha ?? 1);
  }
  return true;
}
