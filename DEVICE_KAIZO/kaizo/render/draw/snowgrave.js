

import { drawSpriteExt, rgb, c_white, clamp01 } from '../../../render/draw/gm.js';

const SNOWFLAKE_SPRITE = 'spr_icespell_snowflake';

const SNOWFALL_SPRITE = 'bg_snowfall';

const C_BLUE = [0, 0, 255];

function drawRectangleColourVertical(ctx, x1, y1, x2, y2, top, bottom, alpha) {
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  const g = ctx.createLinearGradient(0, y1, 0, y2);
  g.addColorStop(0, rgb(top));
  g.addColorStop(1, rgb(bottom));
  ctx.fillStyle = g;
  ctx.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
  ctx.restore();
}

function drawSpriteTiledExt(ctx, entry, sub, x, y, xs, ys, color, alpha, vx, vy, W, H) {
  if (!entry || !entry.frames.length) return;
  const tw = (entry.meta.w ?? 0) * xs;
  const th = (entry.meta.h ?? 0) * ys;
  if (!(tw > 0) || !(th > 0)) return;
  const ox = (entry.meta.ox ?? 0) * xs;
  const oy = (entry.meta.oy ?? 0) * ys;

  const px = x - ox;
  const py = y - oy;
  const startX = px + Math.ceil((vx - px) / tw - 1) * tw;
  const startY = py + Math.ceil((vy - py) / th - 1) * th;
  for (let ty = startY; ty < vy + H; ty += th) {
    if (ty + th <= vy) continue;
    for (let tx = startX; tx < vx + W; tx += tw) {
      if (tx + tw <= vx) continue;
      drawSpriteExt(ctx, entry, sub, tx + ox, ty + oy, xs, ys, 0, color, alpha);
    }
  }
}

export function drawObjSpellSnowgrave(ctx, e, state, helpers) {
  const { sprites, VIEW_W, VIEW_H } = helpers;
  const xx = state.view?.x ?? 0;
  const yy = state.view?.y ?? 0;
  const timer = e.timer ?? 0;
  const bgalpha = e.bgalphaDrawn ?? e.bgalpha ?? 0;
  const snowspeed = e.snowspeedDrawn ?? e.snowspeed ?? 0;

  if (timer > 0) {

    drawRectangleColourVertical(ctx, xx - 10, yy - 10, xx + 700, yy + 500,
      c_white, C_BLUE, bgalpha);
  }
  const snow = sprites.get(SNOWFALL_SPRITE);

  drawSpriteTiledExt(ctx, snow, 0, snowspeed / 1.5, timer * 6, 2, 2, null,
    bgalpha, xx, yy, VIEW_W, VIEW_H);

  drawSpriteTiledExt(ctx, snow, 0, snowspeed, timer * 8, 2, 2, null,
    bgalpha * 2, xx, yy, VIEW_W, VIEW_H);

  return true;
}

export function drawObjSpellSnowgraveSnowflake(ctx, e, state, helpers) {
  const entry = helpers.sprites.get(e.sprite_index ?? SNOWFLAKE_SPRITE);
  if (!entry || !entry.frames.length) return true;
  const sub = Math.floor(e.image_index ?? 0);
  const xs = e.image_xscale ?? 2;
  const ys = e.image_yscale ?? 2;
  const alpha = e.image_alpha ?? 1;
  const fs = e.flakescale ?? 1;
  const blend = e.image_blend ?? null;
  const drawSelf = () => drawSpriteExt(ctx, entry, sub, e.x, e.y, xs, ys,
    e.image_angle ?? 0, blend, alpha);

  drawSelf();
  if (e.siner !== 0) {
    const s = Math.sin(e.siner / 3);
    drawSpriteExt(ctx, entry, sub, e.x + s * 30, e.y, s * 2 * fs, 2 * fs, 0, null, alpha);
    drawSpriteExt(ctx, entry, sub, e.x - s * 30, e.y, s * 2 * fs, 2 * fs, 0, null, alpha);
  } else if (e.con >= 1) {
    drawSelf();
    drawSelf();
  }
  return true;
}
