


import {
  drawSpriteExt, drawOutline, mergeColor, pingpong, clamp01,
  c_white, c_red, c_black,
} from './gm.js';

export function drawPointingStarchild(ctx, e, state, deps) {
  const { sprites } = deps;

  if (e.con === 4) {
    const boom = sprites.get('spr_thrash_missile_explosion');
    const scale = (e.image_yscale + e.image_xscale) / 2;
    drawSpriteExt(ctx, boom, e.timer, e.x, e.y, scale, scale, e.image_angle - 90, c_red, 1);
    return true;
  }

  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;


  const glow = pingpong(e.drawtimer, 2) / 4;

  let glowcol = c_white;
  if (e.con >= 1) {
    glowcol = e.con > 1 ? c_red : mergeColor(c_white, c_red, e.timer / 10);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawOutline(ctx, entry, e, e.image_xscale, glowcol, glow * e.image_alpha);
  if (e.con > 0) {
    drawSpriteExt(ctx, entry, 1, e.x, e.y, e.image_xscale, e.image_yscale,
      e.image_angle, e.outline ?? c_black, e.image_alpha);
  }
  ctx.restore();

  drawSpriteExt(ctx, entry, 0, e.x, e.y, e.image_xscale, e.image_yscale,
    e.image_angle, e.image_blend ?? c_white, e.image_alpha);

  return true;
}
