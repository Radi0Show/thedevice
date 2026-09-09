


import { ldx, ldy, clamp01 } from './gm.js';


export function drawSlashWedge(ctx, e) {
  const dir = e.direction;
  const hx = ldx(640, dir);
  const hy = ldy(640, dir);
  const hxoff = ldx(e.width, dir + 90);
  const hyoff = ldy(e.width, dir + 90);
  const a = e.image_alpha ?? 1;
  const c = Math.round((1 - a) * 255);

  ctx.save();
  ctx.globalAlpha = clamp01(a * 2);
  ctx.fillStyle = `rgb(255,${c},${c})`;
  ctx.beginPath();
  if (e.slashdir) {
    ctx.moveTo(e.x - hx * a, e.y - hy * a);
    ctx.lineTo(e.x + hx + hxoff, e.y + hy + hyoff);
    ctx.lineTo(e.x + hx - hxoff, e.y + hy - hyoff);
  } else {
    ctx.moveTo(e.x + hx * a, e.y + hy * a);
    ctx.lineTo(e.x - hx + hxoff, e.y - hy + hyoff);
    ctx.lineTo(e.x - hx - hxoff, e.y - hy - hyoff);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRoaringknightSlash(ctx, e) {
  drawSlashWedge(ctx, e);
  return true;
}
