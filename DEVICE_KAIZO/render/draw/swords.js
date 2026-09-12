


import { drawSpriteExt, c_white, clamp01 } from './gm.js';

const lerp = (a, b, t) => a + (b - a) * t;



export function drawSwordTunnelSword(ctx, e, state, deps) {
  const { sprites } = deps;

  if (e.telegraphalpha > 0) {
    const tel = sprites.get('spr_lasergun_laser_telegraph');
    if (tel) {
      drawSpriteExt(ctx, tel, 0, e.x, e.y, 999, 0.4, e.image_angle,
        [255, 0, 0], e.telegraphalpha);
    }
  }

  const entry = sprites.get(e.sprite_index);
  if (!entry) return false;

  const px = e.xprevious ?? e.x;
  const py = e.yprevious ?? e.y;
  for (let i = 0; i < 10; i++) {
    drawSpriteExt(ctx, entry, e.image_index, lerp(px, e.x, i / 10), lerp(py, e.y, i / 10),
      e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, i / 10);
  }


  return false;
}



export function drawTrackingSword(ctx, e, state, deps) {
  const { sprites } = deps;
  const entry = sprites.get(e.sprite_index);
  if (!entry) return false;

  if (e.afterimagecon === 0) {
    drawSpriteExt(ctx, entry, e.image_index, e.x, e.y,
      e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, e.image_alpha);
    if (e.con === 2) {
      drawSpriteExt(ctx, entry, e.image_index, e.x, e.y,
        e.image_xscale, e.image_yscale, e.image_angle, c_white, e.image_alpha);
    }
    return true;
  }

  if (e.afterimagecon === 1 || e.afterimagecon === 2) {
    const dim = e.afterimagecon === 2 ? 0.5 : 1;
    drawSpriteExt(ctx, entry, e.image_index, e.x, e.y,
      e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, 0.0025);
    for (let i = 0; i < 40; i++) {
      drawSpriteExt(ctx, entry, e.image_index,
        lerp(e.x, e.targetx, i / 40), lerp(e.y, e.targety, i / 40),
        e.image_xscale, e.image_yscale, e.image_angle, e.image_blend,
        clamp01((0.2 + i / 80) * dim));
    }
  }
  return true;
}



const slashSurface = { c: null };
export function drawTrackingSwordsManager(ctx, e, state, deps) {
  const { sprites, boxRect } = deps;
  const slashes = state.entities.filter(
    (x) => x.alive && x.type.name === 'obj_tracking_sword_slash',
  );
  const box = boxRect(state);
  if (!slashes.length || !box) return true;

  if (!slashSurface.c) {
    slashSurface.c = document.createElement('canvas');
    slashSurface.c.width = 150;
    slashSurface.c.height = 150;
  }
  const g = slashSurface.c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 150, 150);
  g.globalCompositeOperation = 'lighter';
  for (const s of slashes) {
    const entry = sprites.get(s.sprite_index);
    if (!entry) continue;
    drawSpriteExt(g, entry, s.image_index, s.x - box.x, s.y - box.y,
      s.image_xscale, s.image_yscale, s.image_angle, c_white, s.image_alpha);
  }
  g.globalCompositeOperation = 'source-over';

  ctx.drawImage(slashSurface.c, box.x, box.y);
  return true;
}



let jitterSeed = 1;
function jitter() {
  jitterSeed = (jitterSeed * 1103515245 + 12345) & 0x7fffffff;
  return (jitterSeed >>> 16) % 3 - 1;
}

export function drawSplitslashStrike(ctx, e, state, deps) {
  if (e.playerstrike !== 1) return false;
  const { sprites } = deps;
  const heart = state.soul;
  if (!heart) return false;

  const hs = sprites.get(heart.sprite_index) ?? sprites.get('spr_dodgeheart');
  const slice = sprites.get('spr_rk_slash_heartslice');
  const dx = jitter();
  const dy = jitter();

  const fade = clamp01(1 - (e.timer - 45) / 10);

  if (hs) {
    drawSpriteExt(ctx, hs, heart.image_index, heart.x + dx, heart.y + dy, 1, 1, 0, null, 1);
  }
  if (slice) {
    drawSpriteExt(ctx, slice, e.cuty, heart.x + dx, heart.y + dy, 1, 1, 0, c_white, fade);
  }
  return false;
}
