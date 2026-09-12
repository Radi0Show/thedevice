


import { drawSpriteExt } from './gm.js';

const VIEW_W = 640;
const VIEW_H = 480;

export function drawTvTurnoff(ctx, tv, sprites) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const pane = sprites.get('spr_zapper_tvturnoff1');
  const blob = sprites.get('spr_zapper_tvturnoff2');

  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;

  if (tv.con === 0) {
    if (pane) drawSpriteExt(ctx, pane, 0, cx, cy, 6, 10, 0, null, tv.alpha1);
  } else if (tv.con === 1) {
    if (pane) drawSpriteExt(ctx, pane, 0, cx, cy, 6, tv.yscale1, 0, null, 1);

    if (blob) drawSpriteExt(ctx, blob, 2, cx, cy, 0.1, 0.1, 0, null, 1);
  } else if (tv.con === 2) {
    if (pane) drawSpriteExt(ctx, pane, 0, cx, cy, tv.xscale1, tv.yscale1, 0, null, 1);
    if (blob) drawSpriteExt(ctx, blob, 2, cx, cy, tv.xscale2, tv.yscale2, 0, null, 1);
  }

  ctx.restore();
}
