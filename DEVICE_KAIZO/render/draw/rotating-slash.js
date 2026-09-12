import { drawSpriteExt, ldx, ldy, rgb, clamp01 } from './gm.js';
import { drawSlashWedge } from './slash.js';



export function drawRotatingSlashTelegraph(ctx, e, state, deps) {
  const { sprites, boxRect } = deps;
  const box = boxRect(state);

  ctx.save();
  if (box) {

    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
  }

  const n = e.slash_number ?? 0;
  if (e.state === 'aim' && e.timer && n > 0) {
    const grad = sprites.get('spr_rk_quickslash_marker_gradient');
    const mark = sprites.get('spr_rk_quickslash_marker');
    const sx = e.timer * 0.2;
    const sy = 1 + 2 * (1 - e.timer / (e.slash_base + 6 + e.slash_offset));

    const col = [Math.round(e.r ?? 128), Math.round(e.g ?? 128), Math.round(e.b ?? 128)];

    for (const [entry, tint] of [[grad, col], [mark, [0, 0, 0]]]) {
      if (!entry) continue;
      for (let a = 0; a < n; a++) {
        const dir = (360 / (n * 2)) * a + e.random_offset + e.aim_direction;
        drawSpriteExt(ctx, entry, 0, e.aim_x, e.aim_y, sx, sy, dir, tint, 1);
      }
    }


    for (const ln of [e.line2, e.line3]) {
      if (!(ln > 0)) continue;
      ctx.save();
      ctx.globalAlpha = clamp01(1 - ln / 7);
      ctx.strokeStyle = rgb(col);
      ctx.lineWidth = e.line_width ?? 4;
      for (let a = 0; a < n; a++) {
        const dir = (360 / (n * 2)) * a + e.random_offset + e.aim_direction;
        const dx = ldx(320, dir);
        const dy = ldy(320, dir);
        for (const sgn of [1, -1]) {
          const ox = ldx(ln * 6, dir + 90) * sgn;
          const oy = ldy(ln * 6, dir + 90) * sgn;
          ctx.beginPath();
          ctx.moveTo(e.aim_x + dx + ox, e.aim_y + dy + oy);
          ctx.lineTo(e.aim_x - dx + ox, e.aim_y - dy + oy);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }


  for (const sl of state.entities) {
    if (!sl.alive || sl.type.name !== 'obj_roaringknight_slash') continue;
    drawSlashWedge(ctx, sl);
  }

  ctx.restore();


  const self = sprites.get(e.sprite_index);
  if (self) {
    drawSpriteExt(ctx, self, e.image_index, e.x,
      e.y + Math.sin(state.frame * 0.1) * 2,
      e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, e.image_alpha);
  }
  return true;
}
