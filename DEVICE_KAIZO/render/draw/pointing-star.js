


import { scrEaseIn } from '../../sim/gml.js';
import {
  drawSpriteExt, drawBeamColor, mergeColor, clamp01,
  c_gray, c_red, c_white,
} from './gm.js';

export function drawPointingStar(ctx, e, state, deps) {
  const { sprites } = deps;
  const coneUp = state.entities.some(
    (x) => x.alive && x.type.name === 'obj_knight_pointing_cone',
  );
  if (coneUp && e.con === 0) return true;

  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;


  const w = entry.frames[0].width;
  const h = entry.frames[0].height;
  const xs = e.image_xscale + 16 / w;
  const ys = e.image_yscale + 16 / h;

  const color = mergeColor(c_gray, c_red, clamp01(e.timer / 30));
  const alpha = (Math.sin(e.timer * 3) + 1) * 0.25;

  if (e.con === 2 || e.con === 3) {
    let a = 1;
    let length = 120;
    let prog = clamp01(e.timer / 30);
    if (e.con === 2) {
      a = clamp01(prog - alpha);

      length = 50 * clamp01(prog - (e.timer % 2) * 0.75) + 50;
    }
    let offset = 66;
    const sublength = e.difficulty >= 1 ? length : length / 2;
    let beamcolor = e.difficulty >= 2 ? color : c_white;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (e.difficulty === 2) {
      prog = scrEaseIn(clamp01(e.timer / 20), 4);
      offset = e.con === 3 ? 5 : 66 + (5 - 66) * prog;
      beamcolor = color;
      if (e.timer >= 30) {

        const p2 = scrEaseIn(clamp01((e.timer - 30) / 10), 4);
        length += 50 - p2 * 50;
      }
      const s = 90 + e.side;
      const t = -90 + e.side;
      drawBeamColor(ctx, e.x, e.y, length, 10, s, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, length, 10, t, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, s + offset, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, s - offset, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, t + offset, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, t - offset, beamcolor, a);
    } else {
      drawBeamColor(ctx, e.x, e.y, length, 10, 90, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, 156, c_white, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, 24, c_white, a);
      drawBeamColor(ctx, e.x, e.y, sublength, 10, 270, c_white, a);
      drawBeamColor(ctx, e.x, e.y, length, 10, 336, beamcolor, a);
      drawBeamColor(ctx, e.x, e.y, length, 10, 204, beamcolor, a);
    }
    ctx.restore();
  }

  if (e.con === 1 || e.con === 2) {
    drawSpriteExt(ctx, entry, 1, e.x, e.y, xs + 0.1, ys + 0.1, e.image_angle, c_white, alpha);
    drawSpriteExt(ctx, entry, 0, e.x, e.y, xs, ys, e.image_angle, color, 1);
  }
  if (e.con === 3 || e.con === 4) {

    const g = (Math.sin(e.timer * 6) + 1) * 0.25;
    drawSpriteExt(ctx, entry, 2, e.x, e.y, xs + 0.1, ys + 0.1, e.image_angle, c_white, g);
    drawSpriteExt(ctx, entry, 2, e.x, e.y, xs, ys, e.image_angle, c_white, 1);
  }

  return true;
}



export function drawStarUserEvent0(ctx, e, sprites) {
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return;
  const xs = e.image_xscale + 16 / entry.frames[0].width;
  const ys = e.image_yscale + 16 / entry.frames[0].height;
  drawSpriteExt(ctx, entry, 0, e.x, e.y, xs, ys, 0, c_white, 1);
}
