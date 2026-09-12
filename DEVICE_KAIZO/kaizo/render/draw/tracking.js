

import { C_WHITE, NO_FOG } from '../../../render/knightdraw.js';
import { kaizoIdlesprite } from '../../actors/kaizo-knight-actor.js';

const C_RED_RGB = [255, 0, 0];

const SPR_BALL = 'spr_roaringknight_ball_transition';

const SPR_HURT = 'spr_roaringknight_hurt';

const SPR_PXWHITE2 = 'spr_pxwhite2';

function tunnelAnimAlive(state) {
  return !!state.entities?.some(
    (x) => x.alive && x.type?.name === 'obj_knight_swordtunnelanim',
  );
}

function tintOf(c, rgbOf) {
  if (c == null) return null;
  if (Array.isArray(c)) {
    return (c[0] === 255 && c[1] === 255 && c[2] === 255) ? null : c;
  }
  return c === C_WHITE ? null : rgbOf(c);
}

function fogOf(c, rgbOf) {
  return Array.isArray(c) ? c : rgbOf(c);
}

export function drawObjTrackingSwordSlash() {
  return true;
}

export function drawObjTrackingSwordSlashExtraGraze(ctx, e, state, helpers) {
  const { sprites, blit, rgbOf } = helpers;
  const entry = sprites.get(e.sprite_index ?? SPR_PXWHITE2);

  if (!entry || !entry.frames.length) return true;
  const idx = Math.abs(Math.floor(e.image_index ?? 0)) % entry.frames.length;
  blit(entry.frames[idx], entry.meta.ox, entry.meta.oy, e.x, e.y,
    e.image_xscale ?? 900, e.image_yscale ?? 7, e.image_angle ?? 0,
    e.image_alpha ?? 1, tintOf(e.image_blend ?? C_RED_RGB, rgbOf));
  return true;
}

export function kaizoKnightDrawCalls(state, e) {
  const k = state.knight;
  const out = [];
  if (!k || !e) return out;

  const idle = kaizoIdlesprite(e, k);
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const ang = e.image_angle ?? 0;
  const alpha = e.image_alpha ?? 1;
  const blend = e.image_blend ?? C_WHITE;
  const siner = k.siner ?? 0;
  const sinerIdle = k.animState === 0 ? siner + (1 / 6) : siner;

  const offx = 0;
  const offy = 0;
  const shakex = k.shakex ?? 0;
  const hurttimer = k.hurttimer ?? 0;

  if (e.visible === false) return out;

  if (tunnelAnimAlive(state)) return out;

  if (k.chargeupcon === 2) {
    out.push({
      tag: 'burnout', sprite: idle, index: siner, x: e.x, y: e.y,
      xs, ys, ang, blend, alpha: (10 - (k.chargeuptimer ?? 0)) / 10, fog: C_WHITE,
    });
    return out;
  }

  if (k.animState === 10) {
    out.push({
      tag: 'self10', sprite: e.sprite_index ?? idle, index: e.image_index ?? 0,
      x: e.x, y: e.y, xs, ys, ang, blend, alpha, fog: NO_FOG,
    });
  }

  if (k.animState === 3 && hurttimer >= 0) {

    if (k.endCutscene === 1) {

      const showIdle = (hurttimer % 3) === 0 || !k.stronghurtanim;
      out.push(showIdle
        ? {
          tag: 'strobe_idle', sprite: idle, index: siner,
          x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 1, fog: NO_FOG,
        }
        : {
          tag: 'strobe_ball', sprite: SPR_BALL, index: 7,
          x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 1, fog: NO_FOG,
        });
    } else {

      out.push({
        tag: 'strobe_idle', sprite: idle, index: siner,
        x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 1, fog: NO_FOG,
      });
    }

  }

  if (k.animState === 0) {
    out.push({ tag: 'base', sprite: idle, index: sinerIdle, x: e.x, y: e.y, xs, ys, ang, blend, alpha, fog: NO_FOG });
    if (k.flash) {
      out.push({
        tag: 'flash', sprite: idle, index: sinerIdle, x: e.x, y: e.y, xs, ys, ang, blend,
        alpha: (-Math.cos((k.fsiner ?? 0) / 5) * 0.4) + 0.6,
        fog: blend,
      });
    }
  }

  if ((k.whiteflash ?? 0) > 0) {
    if (k.animState === 10) {

      out.push({
        tag: 'wflash_self10', sprite: e.sprite_index ?? idle, index: e.image_index ?? 0,
        x: e.x, y: e.y, xs, ys, ang, blend, alpha: 0.62, fog: C_WHITE,
      });
    }
    if (k.animState === 3 && hurttimer >= 0) {

      out.push({
        tag: 'wflash_hurt', sprite: SPR_HURT, index: 0,
        x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 0.62, fog: C_WHITE,
      });
    }
    if (k.animState === 0) {

      out.push({
        tag: 'wflash_idle', sprite: idle, index: sinerIdle, x: e.x, y: e.y,
        xs, ys, ang, blend, alpha: 0.62, fog: C_WHITE,
      });
    }
  }

  if (k.chargeupcon === 1) {
    out.push({
      tag: 'chargeup', sprite: idle, index: sinerIdle, x: e.x, y: e.y,
      xs, ys, ang, blend, alpha: (k.chargeuptimer ?? 0) / 10, fog: C_WHITE,
    });
  }

  return out;
}

export function drawObjKnightEnemy(ctx, e, state, helpers) {
  const { sprites, blit, fogged, rgbOf, frandCanvas, SPRITE_FOR } = helpers;
  const k = state.knight;

  if (k?.chargeupcon === 1) {
    const entry0 = sprites.get(e.sprite_index ?? SPRITE_FOR.obj_knight_enemy);
    if (entry0 && entry0.frames.length) {
      const idx0 = Math.abs(Math.floor(e.image_index ?? 0)) % entry0.frames.length;
      const t = k.chargeuptimer ?? 0;

      for (let back = 12; back >= 1; back--) {
        const bf = t - back;
        if (bf <= 10 || bf % 4 !== 0) continue;
        const dir = frandCanvas(bf, 71) * Math.PI * 2;
        const dist = back * 4;
        const alpha = Math.max(0, 0.6 - back * 0.05);
        if (alpha <= 0) continue;

        blit(fogged(entry0.frames[idx0], [255, 255, 255]), entry0.meta.ox, entry0.meta.oy,
          e.x + Math.cos(dir) * dist, e.y + Math.sin(dir) * dist,
          e.image_xscale ?? 1, e.image_yscale ?? 1, 0, alpha);
      }
    }
  }

  const calls = kaizoKnightDrawCalls(state, e);

  if (!calls.length) {
    const hidden = e.visible === false
      || (k?.chargeupcon ?? 0) >= 2
      || tunnelAnimAlive(state);
    if (!hidden) return false;
  }
  for (const d of calls) {
    const entry = sprites.get(d.sprite);
    if (!entry || !entry.frames.length) continue;
    const idx = Math.abs(Math.floor(d.index)) % entry.frames.length;

    const img = d.fog !== NO_FOG && d.fog != null
      ? fogged(entry.frames[idx], fogOf(d.fog, rgbOf))
      : entry.frames[idx];
    blit(img, entry.meta.ox, entry.meta.oy, d.x, d.y, d.xs, d.ys, d.ang, d.alpha,
      tintOf(d.blend, rgbOf));
  }
  return true;
}
