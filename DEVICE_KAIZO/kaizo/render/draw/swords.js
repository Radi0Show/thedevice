

import { drawSpriteExt } from '../../../render/draw/gm.js';
import { KNIGHT } from '../../../sim/actors.js';
import { getSwordcolor, KAIZO_TELEGRAPH_COLOR } from '../../attacks/kaizo-colors.js';

const lerp = (a, b, t) => a + (b - a) * t;

function knightEntity(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_knight_enemy');
}

export function drawObjFallingsword(ctx, e, state, helpers) {
  const entry = helpers.sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length || !e.old_x) return false;

  const color = getSwordcolor(state);
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const alpha = e.image_alpha ?? 1;

  for (let i = e.old_x.length - 1; i > 0; i--) {
    const a = alpha - 0.3 * i;
    if (a <= 0) continue;
    drawSpriteExt(ctx, entry, 0, e.old_x[i], e.old_y[i],
      xs, ys - 0.2 * i, e.old_angle[i], color, a);
  }

  return false;
}

export function drawObjKnightSwordfall(ctx, e, state, helpers) {
  const entry = helpers.sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;

  const sub = Math.floor(e.image_index ?? 0);
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const ang = e.image_angle ?? 0;
  const alpha = e.image_alpha ?? 1;
  const dip = e.dip ?? 0;
  const camx = state.view.x;

  const breathe = Math.sin(state.frame * 0.1) * dip;

  if (e.forcexfix && e.sprite_index === 'spr_roaringknight_attack_ol_center') {

    const k = knightEntity(state);
    const ystart = k?.ystart ?? state.knight?.ystart ?? KNIGHT.ystart;
    drawSpriteExt(ctx, entry, sub, camx + 544, ystart + Math.cos((e._siner ?? 0) / 8) * 8,
      xs, ys, ang, e.image_blend, alpha);
  } else if (e.sprite_index === 'spr_roaringknight_sword_ol') {

    drawSpriteExt(ctx, entry, sub, camx + 544, e.y + breathe + 30,
      xs, ys, ang, e.image_blend, alpha);
  } else {

    drawSpriteExt(ctx, entry, sub, e.x, e.y + breathe,
      xs, ys, ang, e.image_blend, alpha);
  }
  return true;
}

export function drawObjSwordTunnelSword(ctx, e, state, helpers) {

  if (e.telegraphalpha > 0) {
    const tel = helpers.sprites.get('spr_lasergun_laser_telegraph');
    if (tel && tel.frames.length) {
      drawSpriteExt(ctx, tel, 0, e.x, e.y, 999, 0.4, e.image_angle ?? 0,
        KAIZO_TELEGRAPH_COLOR, e.telegraphalpha);
    }
  }

  const entry = helpers.sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;

  const px = e.xprevious ?? e.x;
  const py = e.yprevious ?? e.y;
  const sub = Math.floor(e.image_index ?? 0);
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const ang = e.image_angle ?? 0;
  for (let i = 0; i < 10; i++) {
    drawSpriteExt(ctx, entry, sub, lerp(px, e.x, i / 10), lerp(py, e.y, i / 10),
      xs, ys, ang, e.image_blend, i / 10);
  }

  return false;
}

export function drawObjKnightSwordtunnelanim(ctx, e, state, helpers) {

  return e.vertical ? true : false;
}
