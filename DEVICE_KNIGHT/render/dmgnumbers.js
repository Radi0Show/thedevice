


import { drawSpriteExt, rgb } from './draw/gm.js';
import { drawSpriteText, measureText, FONTS } from './text.js';
import { dmgColor, TYPE_DEAD, MSG_MAX, TYPE_SWOON, C_LIME } from '../sim/dmgnumbers.js';
import { loadFont, drawText } from './font.js';



export function drawAttackVfx(ctx, state, sprites) {
  const list = state.attackVfx;
  if (!list || !list.length) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const v of list) {
    const entry = sprites.get(v.sprite);
    if (!entry || !entry.frames.length) continue;
    const frame = Math.min(Math.floor(v.index), entry.frames.length - 1);
    drawSpriteExt(ctx, entry, frame, v.x, v.y, v.scale, v.scale, 0, null, 1);
  }
  ctx.restore();
}

export function drawDmgNumbers(ctx, state, sprites) {
  const d = state.dmg;
  if (!d) return;

  if (!d.list.length) return;
  const msg = sprites.get('spr_battlemsg');

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const n of d.list) {
    if (n.delaytimer < n.delay) continue;

    const xs = 2 - n.stretch;
    const ys = n.stretch + n.kill;
    const alpha = Math.max(0, 1 - n.kill);
    if (xs <= 0 || ys <= 0 || alpha <= 0) continue;
    const color = dmgColor(n.type);


    let frame = -1;
    if (n.special === MSG_MAX) frame = 2;
    if (n.damage === 0) frame = 0;
    if (n.type === TYPE_DEAD) frame = 1;

    if (n.type === TYPE_SWOON) frame = 13;
    if (frame >= 0) {
      if (msg) drawSpriteExt(ctx, msg, frame, n.x + 30, n.y, xs, ys, 0, color, alpha);
      continue;
    }


    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(n.x + 30, n.y);
    ctx.scale(xs, ys);
    const text = String(n.damage);
    drawSpriteText(ctx, sprites, FONTS.damage, text, 0, 0, {
      halign: 'right', color: rgb(color),
    });
    ctx.restore();

    if (measureText(sprites, FONTS.damage, text) === 0) {
      state.counters.missingDamageFont = (state.counters.missingDamageFont ?? 0) + 1;
    }
  }
  ctx.restore();
}



export function drawHealWriters(ctx, state, sprites) {
  const heals = state.dmg?.heals;
  if (!heals || !heals.length) return;
  const font = loadFont();
  if (!font?.ready) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const h of heals) {
    const alpha = Math.min(1, h.alpha);
    if (alpha <= 0) continue;

    if (h.maxed) {
      const msg = sprites?.get('spr_battlemsg');
      if (msg) {

        const st = h.stretch ?? 1;
        drawSpriteExt(ctx, msg, 2, h.x + 30, h.y, 2 - st, st, 0, C_LIME, alpha);
        continue;
      }
    }
    drawText(ctx, font, `+${h.healamt}`, h.x, h.y, {
      color: 'rgb(0,255,0)', alpha, halign: 'center',
    });
  }
  ctx.restore();
}
