


import { drawSpriteExt, mergeColor, rgb, c_white } from './draw/gm.js';
import { BOLT_SPEED, ROW_PITCH, BAR_X, BAR_Y } from '../sim/fightbar.js';


const c_navy = [0, 0, 128];
const c_blue = [0, 0, 255];
const c_purple = [128, 0, 128];
const c_green = [0, 128, 0];
const c_yellow = [255, 255, 0];
const c_aqua = [0, 255, 255];
const c_fuchsia = [255, 0, 255];
const c_lime = [0, 255, 0];


const CHARCOLOR = [c_aqua, c_fuchsia, c_lime];

const BOLTCOLOR = CHARCOLOR.map((c) => mergeColor(c, c_white, 0.5));

const ROWCOLOR = [c_blue, c_purple, c_green, c_yellow];


function outlineRect(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = 1;

  ctx.strokeRect(x1 + 0.5, y1 + 0.5, x2 - x1, y2 - y1);
}

export function drawFightBar(ctx, bar, sprites, originX = BAR_X, originY = BAR_Y, state = null) {

  if (state?.knight?.endCutscene > 0) return;
  if (!bar || !bar.active) return;
  const x = originX;
  const y = originY;
  const anyChar = bar.havechar.some((h) => h === 1);

  const front = sprites.get('spr_pressfront');
  const frontB = sprites.get('spr_pressfront_b');
  const spot = sprites.get('spr_pressspot');
  const attackspot = sprites.get('spr_attackspot');

  ctx.save();
  for (let i = 0; i < 3; i++) {
    const ry = y + ROW_PITCH * i;


    if (anyChar && (i === 1 || i === 2)) {
      ctx.fillStyle = rgb(c_navy);
      ctx.fillRect(x + 77, ry, 300 - 77, 1);
    }

    if (bar.havechar[i] !== 1) continue;


    const j = i + 1;
    let color = ROWCOLOR[j - 1] ?? c_navy;
    const pb = bar.pressbuffer[j] ?? 0;
    if (pb > 0) color = mergeColor(color, c_white, pb / 5);

    outlineRect(ctx, x + 78, ry, x + 80 + 15 * BOLT_SPEED, ry + 36, color);
    outlineRect(ctx, x + 79, ry + 2, x + 80 + 15 * BOLT_SPEED - 1, ry + 35, color);

    if (front) drawSpriteExt(ctx, front, j - 1, x, ry, 1, 1, 0, c_white, 1);

    if (frontB) {
      drawSpriteExt(ctx, frontB, bar.oneButton ? 0 : i, x, ry, 1, 1, 0, c_white, 1);
    }
    if (spot) drawSpriteExt(ctx, spot, j - 1, x + 80, ry, 1, 1, 0, c_white, 1);
  }


  if (attackspot) {
    for (const a of bar.afterimages) {
      drawSpriteExt(ctx, attackspot, 0, x + a.x, y + a.y, 1, 1, 0, c_white, a.alpha);
    }
    for (const b of bar.bolts) {
      if (!b.alive) continue;
      const close = b.frame - bar.boltx;
      const alpha = close < 0 ? 1 + close / 3 : 1;
      if (alpha <= 0) continue;
      drawSpriteExt(
        ctx, attackspot, 0,
        x + 80 + close * BOLT_SPEED, y + ROW_PITCH * b.char,
        1, 1, 0, c_white, alpha,
      );
    }


    for (const s of bar.bursts) {
      const color = s.critical ? c_yellow : BOLTCOLOR[s.char] ?? c_white;
      drawSpriteExt(
        ctx, attackspot, 0, x + s.x, y + s.y,
        s.xscale, s.yscale, 0, color, Math.max(0, s.alpha),
      );
    }
  }


  if (bar.fade) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, bar.fadeamt ?? 0)})`;
    ctx.fillRect(x - 1, y, 641, 300);
  }

  ctx.restore();
}
