


import { drawSpriteExt } from './gm.js';

let scratch = null;
function surface() {
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = 100;
    scratch.height = 100;
  }
  return scratch;
}

export function drawTunnelslash(ctx, e, state, deps) {
  const { sprites } = deps;
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return true;

  const c = surface();
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 100, 100);

  const wob = Math.sin(e.timer * 2);
  const alpha = e.image_alpha ?? 1;
  const ys = (e.image_yscale ?? 1) + wob * 0.05;
  drawSpriteExt(g, entry, e.image_index ?? 0, 50, 50,
    (e.image_xscale ?? 1) + wob * 0.2, ys, e.image_angle ?? 0,
    [128, 128, 128], alpha);
  drawSpriteExt(g, entry, e.image_index ?? 0, 50, 50,
    (e.image_xscale ?? 1) * 0.85 + wob * 0.1, ys, e.image_angle ?? 0,
    e.image_blend, alpha);

  const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
  const hw = gt ? (gt.image_xscale ?? 2) * 37.5 : 75;
  const hh = gt ? (gt.image_yscale ?? 2) * 37.5 : 75;
  const boxTop = gt ? gt.y - hh : state.view.y + 95;
  const boxBottom = gt ? gt.y + hh : state.view.y + 245;
  const boxLeft = gt ? gt.x - hw : state.view.x + 245;

  const vx = state.view.x;
  const vy = state.view.y;
  if (e.y > boxTop + 8 && e.y < boxBottom - 8) {
    const cut = Math.max(boxLeft + 7 - (e.x - 50), 0);
    if (cut < 100) {
      ctx.drawImage(c, cut, 0, 100 - cut, 100,
        Math.round(e.x - 50 + cut) - vx, Math.round(e.y - 50) - vy, 100 - cut, 100);
    }
  } else {
    ctx.drawImage(c, Math.round(e.x - 50) - vx, Math.round(e.y - 50) - vy);
  }
  return true;
}
