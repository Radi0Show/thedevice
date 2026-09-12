


import { drawSpriteExt, c_white } from './draw/gm.js';

export function drawRudeBuster(ctx, state, sprites) {
  const r = state.rude;
  if (!r) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const anim = sprites.get('spr_susie_rudebuster');
  if (r.anim && anim?.frames.length) {

    const f = Math.min(Math.floor(r.anim.index), anim.frames.length - 1);
    drawSpriteExt(ctx, anim, f, r.anim.x, r.anim.y, 2, 2, 0, c_white, 1);
  }

  const b = r.bolt;
  const beam = sprites.get('spr_rudebuster_beam');
  if (!b || !beam?.frames.length) {
    ctx.restore();
    return;
  }


  for (const a of b.trail) {
    if (a.alpha <= 0 || a.scale <= 0) continue;

    drawSpriteExt(ctx, beam, Math.min(4, beam.frames.length - 1),
      a.x, a.y, 2, a.scale, a.angle, c_white, Math.max(0, a.alpha));
  }

  if (b.explode === 0) {
    drawSpriteExt(ctx, beam, Math.floor(b.t) % beam.frames.length,
      b.x, b.y, 2, 2, b.direction, c_white, b.alpha);
  } else {
    for (const s of b.bursts ?? []) {
      if (s.scale <= 0.05) continue;

      drawSpriteExt(ctx, beam, Math.min(4, beam.frames.length - 1),
        s.x, s.y, s.scale * 2, 2, s.angle, c_white, 1);
    }
  }
  ctx.restore();
}
