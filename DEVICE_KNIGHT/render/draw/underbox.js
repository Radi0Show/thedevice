


import { drawSpriteExt, tinted } from './gm.js';


function drawRow(ctx, img, srcY, w, x, y, color, alpha) {
  if (!img || srcY < 0 || srcY >= img.height) return;
  const src = color ? tinted(img, color) : img;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(src, 0, srcY, w, 1, x, y, w, 1);
  ctx.restore();
}

export function drawWeirdCircle(ctx, e, state, deps) {
  const { sprites } = deps;
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return true;


  if (e.alarm[0] > 0.5 && e.alarm[0] % 2 < 1) return true;

  const img = entry.frames[0];
  const vx = state.view.x;
  const vy = state.view.y;
  const alpha = e.image_alpha ?? 1;
  const blend = [
    Math.max(0, Math.min(255, Math.round(e.r))),
    Math.max(0, Math.min(255, Math.round(e.g))),
    Math.max(0, Math.min(255, Math.round(e.b))),
  ];

  const w = entry.meta.w ?? img.width;
  const h = entry.meta.h ?? img.height;

  for (let a = 0; a < h; a++) {
    drawRow(ctx, img, a, w,
      Math.round((e.x - 24) + Math.sin((a + e.timer) * 0.5) * 2) - vx,
      Math.round((e.y - 6) + a) - vy,
      blend, alpha);
  }

  if (e.alarm[1] < 6 && e.alarm[1] > -1) {
    const s = 1 - e.alarm[1] * 0.165;
    drawSpriteExt(ctx, entry, 0, e.x - vx, e.y - vy, s, s,
      e.image_angle ?? 0, [0, 0, 0], alpha);
  }
  return true;
}



export function drawWeirdBottomManager(ctx, e, state, deps) {
  const { sprites } = deps;
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return true;
  drawSpriteExt(ctx, entry, e.image_index ?? 0,
    e.x - state.view.x,
    (e.y - state.view.y) + Math.sin(state.frame * 0.1) * 2,
    e.image_xscale ?? 2, e.image_yscale ?? 2, e.image_angle ?? 0,
    e.image_blend, e.image_alpha ?? 1);
  return true;
}
