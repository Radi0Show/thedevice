


import { drawSpriteExt, clamp01, ldx, ldy, c_white } from './gm.js';

const W = 640;
const H = 480;



let snap = null;
let snapOf = null;

export function drawSplitCut(ctx, e, state, deps) {
  const { sprites } = deps;
  const timer = e.timer;
  const fade = (10 - timer) / 10;
  if (fade <= 0) return true;

  if (snapOf !== e) {
    snapOf = e;
    if (!snap) {
      snap = document.createElement('canvas');
      snap.width = W;
      snap.height = H;
    }
    const g = snap.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.drawImage(ctx.canvas, 0, 0);
  }

  const xmul = ldx(1, e.angle);
  const ymul = ldy(1, e.angle);
  const htimer = (e.vertical ? 0 : timer) * xmul;
  const vtimer = (e.vertical ? timer : 0) * ymul;


  const entry = sprites.get(e.sprite_index ?? 'spr_battlebg_0');
  if (entry && entry.frames[0]) {
    const img = entry.frames[0];
    let splitW = img.width;
    let splitH = img.height;
    let splitLeft = 0;
    let splitTop = 0;
    if (e.vertical) {
      splitLeft = img.width / 2;
      splitW /= 2;
    } else {
      splitTop = img.height / 2;
      splitH /= 2;
    }

    const half = (sl, st, sw, sh, mul, alpha) => {
      ctx.save();
      ctx.globalAlpha = clamp01(alpha);
      ctx.translate(e.x + htimer * mul, e.y + vtimer * mul);
      ctx.scale(e.image_xscale, e.image_yscale);
      ctx.drawImage(img, sl, st, sw, sh,
        -(entry.meta.ox ?? 0), -(entry.meta.oy ?? 0), sw, sh);
      ctx.restore();
    };

    for (const m of [-8, -6, -4]) half(0, 0, splitW, splitH, m, fade);
    for (const m of [8, 6, 4]) half(splitLeft, splitTop, splitW, splitH, m, fade);
  }


  const sx = e.x - state.view.x;
  const sy = e.y - state.view.y;
  ctx.save();
  ctx.globalAlpha = clamp01(fade / 2);
  if (e.vertical) {
    ctx.drawImage(snap, 0, 0, sx, H, 0, -timer * 8, sx, H);
    ctx.drawImage(snap, sx, 0, W - sx, H, sx, timer * 8, W - sx, H);
  } else {
    ctx.drawImage(snap, 0, 0, W, sy, -timer * 8, 0, W, sy);
    ctx.drawImage(snap, 0, sy, W, H - sy, timer * 8, sy, W, H - sy);
  }
  ctx.restore();


  const px = sprites.get('spr_pxwhite10_center');
  if (px) {
    let angle = e.angle;
    if (e.vertical) angle += 90;
    if (e.diagonal) angle += 45;
    drawSpriteExt(ctx, px, 0, e.x + e.xoffset, e.y + e.yoffset, 50, fade, angle, c_white, 1);
    drawSpriteExt(ctx, px, 0, e.x + e.xoffset, e.y + e.yoffset, 50, fade * 1.4, angle, c_white, 0.5);
  }

  return true;
}
