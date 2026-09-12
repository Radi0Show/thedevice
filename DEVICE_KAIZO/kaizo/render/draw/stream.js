

import {
  drawSpriteExt, mergeColor, rgb, c_gray, c_black,
} from '../../../render/draw/gm.js';
import { getSwordcolor } from '../../attacks/kaizo-colors.js';

const REGULARBULLET_FAMILY = Object.freeze(new Set([

  'obj_regularbullet', 'obj_bullet_dice', 'obj_knight_roaring_star',
  'obj_shutta_reticle_bullet', 'obj_bullet_knight_stream', 'obj_fallingsword',
  'obj_roaringknight_fountain_bullet_old', 'obj_tracking_swords_manager',
  'obj_celestial_body_parent', 'obj_sword_vortex', 'obj_knight_diamondswordbullet_ext',
  'obj_elnina_snowring', 'obj_tracking_sword_slash', 'obj_snowflake_ult_bullet',
  'obj_bullet_knightcrescent', 'obj_knight_pointing_starchild',
  'obj_precipitation_bullet_parent', 'obj_diagonal_bullet_manager', 'obj_diagonal_bullet',
  'obj_watercooler_bullet_rainball', 'obj_ribbick_battle_fly', 'obj_ribbick_battle_frog',
  'obj_bullet_rain', 'obj_rabbitbullet', 'obj_elnina_raindrop', 'obj_sword_tunnel_manager',
  'obj_roaringknight_fountain_bullet', 'obj_bullet_sun', 'obj_roaringknight_split_bullet',
  'obj_bullet_knight_tunnelslash', 'obj_tracking_sword1', 'obj_bullet_umbrella',
  'obj_tracking_sword2', 'obj_bullet_snow', 'obj_rainwater', 'obj_bullet_homing',
  'obj_lanino_solar_system', 'obj_knight_bullethell_bullet2', 'obj_knight_bullethell_bullet',
  'obj_bullet_moon', 'obj_sword_tunnel_sword', 'obj_spinningbullet',
  'obj_shutta_reticle_bullet2', 'obj_bullet_submoon', 'obj_sword_vortex_manager',
  'obj_bullet_knight_slash',

  'obj_bullet_stream_hitbox', 'obj_bullet_stream_sword',
]));

function withOrder(state, pred) {
  return state.entities
    .filter((x) => x.alive && pred(x))
    .sort((a, b) => b.seq - a.seq);
}

const isRegularbullet = (x) => REGULARBULLET_FAMILY.has(x.type.name);

function frameOf(entry, idx) {
  const n = entry.frames.length;
  const i = Math.floor(idx ?? 0);
  return entry.frames[((i % n) + n) % n];
}

function tintOf(blend, helpers) {
  if (blend == null) return null;
  if (Array.isArray(blend)) return blend;
  if (typeof blend === 'number') return blend === helpers.C_WHITE_GM ? null : helpers.rgbOf(blend);
  throw new TypeError(`stream.js: image_blend must be [r,g,b] or a packed real, got ${JSON.stringify(blend)}`);
}

function growtangle(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle') ?? null;
}

const gtMinx = (gt) => gt.x - (75 * (gt.image_xscale ?? 2)) / 2;
const gtMaxx = (gt) => gt.x + (75 * (gt.image_xscale ?? 2)) / 2;
const gtMiny = (gt) => gt.y - (75 * (gt.image_yscale ?? 2)) / 2;
const gtMaxy = (gt) => gt.y + (75 * (gt.image_yscale ?? 2)) / 2;

function drawInBoxExtBegin(ctx, gt, arg0, arg1) {
  if (!gt) return false;
  const x1 = gtMinx(gt) + 5 - arg0;
  const y1 = gtMiny(gt) + 5 - arg1;
  const x2 = gtMaxx(gt) - 4 + arg0;
  const y2 = gtMaxy(gt) - 4 + arg1;
  ctx.beginPath();
  ctx.rect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
  ctx.clip();
  return true;
}

function drawLineWidthColor(ctx, l, width, color) {
  if (!(width > 0)) return;
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(l.x1, l.y1);
  ctx.lineTo(l.x2, l.y2);
  ctx.stroke();
}

export function drawObjKnightStream(ctx, e, state, helpers) {
  const { sprites, blit } = helpers;

  const _sinamt = Math.min(state.turntimer ?? 0, 8);
  const pose = sprites.get(e.sprite_index);
  if (pose && pose.frames.length) {
    blit(frameOf(pose, e.image_index), pose.meta.ox, pose.meta.oy,
      e.x, e.y + (Math.sin(e.fulltimer * 0.1) * _sinamt),
      e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
      e.image_alpha ?? 1, tintOf(e.image_blend, helpers));
  }

  const gt = growtangle(state);
  ctx.save();
  drawInBoxExtBegin(ctx, gt, -3, -3);

  for (const b of withOrder(state, isRegularbullet)) helpers.drawSelf(b, state);

  for (const l of withOrder(state, (x) => x.type.name === 'obj_knight_streamline')) {
    drawLineWidthColor(ctx, l, l.width, c_gray);
  }

  const sword = getSwordcolor(state);
  const _ds = mergeColor(sword, c_black, 0.5);

  const beams = withOrder(state, (x) => x.type.name === 'obj_bullet_knight_stream');
  for (const b of beams) drawLineWidthColor(ctx, b, b.width, sword);
  const pulse = Math.sin(state.frame * Math.PI);
  for (const b of beams) {
    if (b.width > 8) drawLineWidthColor(ctx, b, b.width * (0.8 + (pulse * 0.2)), _ds);
  }
  for (const b of beams) {
    if (b.width > 8) drawLineWidthColor(ctx, b, b.width * (0.65 + (pulse * 0.2)), c_black);
  }

  ctx.restore();
  return true;
}

let swordSurface = null;
function getSwordSurface() {
  if (!swordSurface) {
    swordSurface = document.createElement('canvas');
    swordSurface.width = 640;
    swordSurface.height = 480;
  }
  return swordSurface;
}

function drawShakenBox(ctx, gt, sx, sy, helpers) {
  const { sprites, SPRITE_FOR } = helpers;
  const entry = sprites.get(gt.sprite_index ?? SPRITE_FOR.obj_growtangle);
  const xs = gt.image_xscale ?? 1;
  const ys = gt.image_yscale ?? 1;
  const ang = gt.image_angle ?? 0;
  const alpha = gt.image_alpha ?? 1;
  const blend = tintOf(gt.image_blend, helpers);
  drawSpriteExt(ctx, entry, 1, gt.x + sx, gt.y + sy, xs, ys, ang, blend, alpha);
  const growth = (gt.timer < gt.maxtimer && gt.growcon === 1) || (gt.timer > 0 && gt.growcon === 3);
  if (gt.customBox && growth && gt.growcon !== 2) {
    const sizer = gt.maxtimer ? gt.timer / gt.maxtimer : 0;
    const _scale = sizer * (gt.growscale ?? 2);
    drawSpriteExt(ctx, sprites.get('spr_custom_box'), 0, gt.x + sx, gt.y + sy, _scale, _scale, ang, blend, alpha);
  } else {
    drawSpriteExt(ctx, entry, Math.floor(gt.image_index ?? 0), gt.x + sx, gt.y + sy, xs, ys, ang, blend, alpha);
  }
}

function drawSwordSurface(ctx, state, sx, sy, helpers) {
  const { sprites } = helpers;
  const surf = getSwordSurface();
  const g = surf.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 640, 480);
  const vx = state.view.x;
  const vy = state.view.y;
  for (const b of withOrder(state, isRegularbullet)) {
    if (b.flag === undefined) continue;
    const entry = sprites.get(b.sprite_index);
    const sub = Math.floor(b.image_index ?? 0);
    const ys = b.yscale ?? b.image_yscale ?? 1;
    if (b.flag === 'C') {
      drawSpriteExt(g, entry, sub, b.x - vx, b.y - vy,
        b.image_xscale ?? 1, ys, b.image_angle ?? 0, tintOf(b.image_blend, helpers), b.image_alpha ?? 1);
    } else if (b.flag === 'D') {
      let _secretswordblend = b.image_blend;
      if (b.sprite_index === 'spr_roaringknight_sword_ol_alt') _secretswordblend = helpers.C_WHITE_GM;
      drawSpriteExt(g, entry, sub, (b.x - vx) + sx, (b.y - vy) + sy,
        b.image_xscale ?? 1, ys, b.image_angle ?? 0, tintOf(_secretswordblend, helpers), b.image_alpha ?? 1);
    }
  }

  const gt = growtangle(state);
  if (gt) {
    const edge = (gtMinx(gt) + 4) - vx;
    g.clearRect(0, 0, edge + 1, 481);
  }
  ctx.drawImage(surf, vx, vy);
}

export function drawObjKnightTunnelSlasher(ctx, e, state, helpers) {
  const { sprites, blit } = helpers;

  const pose = sprites.get(e.sprite_index);
  if (pose && pose.frames.length) {
    blit(frameOf(pose, e.image_index), pose.meta.ox, pose.meta.oy,
      e.x, e.y + (Math.sin(e.fulltimer * 0.1) * 2),
      e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
      e.image_alpha ?? 1, tintOf(e.image_blend, helpers));
  }

  if (e.attack_type === 1) {
    if (e.attack_con > 1) {

      const _sx = e.shake_x ?? 0;
      const _sy = e.shake_y ?? 0;

      for (const gt of withOrder(state, (x) => x.type.name === 'obj_growtangle')) {
        drawShakenBox(ctx, gt, _sx, _sy, helpers);
      }

      for (const a of withOrder(state, (x) => x.type.name === 'obj_afterimage')) {
        if (a.sprite_index === 'spr_roaringknight_sword_ol_alt') helpers.drawSelf(a, state);
      }

      drawSwordSurface(ctx, state, _sx, _sy, helpers);

      for (const t of withOrder(state, (x) => x.type.name === 'obj_tracking_sword1')) {
        helpers.drawVanilla(t, state);
      }

    }
  }
  return true;
}

export function drawObjKnightTunnelSlasher2Revised(ctx, e, state, helpers) {
  const { sprites, blit } = helpers;
  const ymod = Math.sin((e.siner ?? 0) / 30) * 8;
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const alpha = e.image_alpha ?? 1;
  const blend = tintOf(e.image_blend, helpers);
  if (e.sprite_index === 'spr_roaringknight_noarm') {
    const arm = sprites.get('spr_roaringknight_armpoint');
    if (arm && arm.frames.length) {
      blit(frameOf(arm, e.armpoint_index), arm.meta.ox, arm.meta.oy,
        e.x + 116, e.y + 62 + ymod, xs, ys, e.armpoint ?? 0, alpha, blend);
    }
  }
  const body = sprites.get(e.sprite_index);
  if (body && body.frames.length) {
    blit(frameOf(body, e.image_index), body.meta.ox, body.meta.oy,
      e.x, e.y + ymod, xs, ys, e.image_angle ?? 0, alpha, blend);
  }
  return true;
}

export function drawObjKnightDiamondswordbulletExt(ctx, e, state, helpers) {
  const entry = helpers.sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;
  const jx = e.extJitter ? e.extJitter.x : 0;
  const jy = e.extJitter ? e.extJitter.y : 0;
  drawSpriteExt(ctx, entry, Math.floor(e.image_index ?? 0),
    e.x + jx, e.y + jy,
    e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
    diamondswordbulletExtColor(e), e.image_alpha ?? 1);
  return true;
}

export function diamondswordbulletExtColor(e) {
  return [Math.trunc(e.r ?? 255), Math.trunc(e.g ?? 255), Math.trunc(e.b ?? 255)];
}
