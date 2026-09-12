

import { destroy } from '../../sim/entity.js';

import { getSwordcolor, KAIZO_TELEGRAPH_COLOR } from './kaizo-colors.js';
import {
  angleDifference,
  clamp,
  clamp01,
  gmlEq,
  lengthdirX,
  lengthdirY,
  lerp,
  pointDirection,
  scrMovetowards,
  sign,
  mergeColor,
  WHITE,
  BLACK,
} from '../../sim/gml.js';
import { collidebulletOther15, regularbulletStep, regularbulletCreate } from '../../sim/bullets/regularbullet.js';
import { chainChildDelay } from '../../sim/attacks/pointing-starchild.js';
import { starOther15 } from './stars-pointing-star.js';

import { kaizoKnightCatch } from './roaring-final-star.js';
import { STARCHILD_MASK, STARCHILD_TRAIL_MASK, scrPreciseHit, enginePairHit } from '../../sim/masks.js';

export { heartFollower, chainChildDelay } from '../../sim/attacks/pointing-starchild.js';

function scrRotatetowards(from, to, delta) {
  const diff = angleDifference(to, from);
  if (Math.abs(diff) > delta) return from + sign(diff) * delta;
  return to;
}

function scrAngleLerp(from, to, t) {
  return from + lerp(0, angleDifference(to, from), t);
}

const STARCHILD_SPRITE_W = 33;
const STARCHILD_SPRITE_H = 32;

function onscreen(e, spacer, state) {
  const w = STARCHILD_SPRITE_W * (e.image_xscale ?? 1);
  const h = STARCHILD_SPRITE_H * (e.image_yscale ?? 1);
  if (e.x + w + spacer < state.view.x) return false;
  if (e.x - spacer > state.view.x + 640) return false;
  if (e.y + h + spacer < state.view.y) return false;
  if (e.y - spacer > state.view.y + 480) return false;
  return true;
}

export const pointingStarchild = {
  name: 'obj_knight_pointing_starchild',

  create(e, state) {

    regularbulletCreate(e, state);
    e.deceleration = 0.1;
    e.minspeed = 1;
    e.timer = 0;
    e.drawtimer = 0;
    e.damage = 1;
    e.element = 5;
    e.lifetime = 60;
    e.difficulty = 0;
    e.con = 0;
    e.tracking = true;
    e.start_angle = 0;
    e.target_angle = 0;
    e.rotation = 0;
    e.delay = 0;
    e.init = false;
    e.rotatespeed = 10;
    e.ease = 0;
    e.xscale_start = 0;
    e.yscale_start = 0;

    e.outline = BLACK;
    e.image_blend = WHITE;
    e.accel = 0.5;
    e.sprite_index = 'spr_knight_starchild_parts';
    e.isBullet = true;
    e.builtinMotion = true;

    e.coltimer = -10;

    e.drawn_image_alpha = e.image_alpha ?? 1;
  },

  step(e, state) {
    if (!e.init) {
      e.init = true;
      if (e.difficulty >= 2) {

        const dc98 = state.entities.some(
          (x) => x.alive && x.type.name === 'obj_dbulletcontroller' && x.ctype === 98,
        );
        if (dc98) {
          chainChildDelay(e, state);
        } else {
          e.delay = 25;
        }

        if (gmlEq(e.difficulty, 3.2) || gmlEq(e.difficulty, 3.3)) {
          e.delay = 0;
        }

        const rows = state.shardDelays?.get(state.frame);
        const match = rows?.find((r) => !r.used
          && Math.abs(r.x - e.x) <= 0.1 && Math.abs(r.y - e.y) <= 0.1);
        if (match) {
          match.used = true;
          e.delay = match.delay;
        }
      }
      if (globalThis.process?.env?.KNIGHT_SHARD_DEBUG) {
        console.error(`[shard] init f=${globalThis.__simFrame} seq=${e.seq}`
          + ` diff=${e.difficulty} delay=${e.delay} y=${e.y.toFixed(1)}`);
      }
    }

    if (globalThis.process?.env?.KNIGHT_SHARD_DEBUG
        && (e.x < state.view.x - 70 || e.y < state.view.y - 70)) {
      console.error(`[shard] edge f=${globalThis.__simFrame} seq=${e.seq}`
        + ` x=${e.x.toFixed(1)} y=${e.y.toFixed(1)} wd=${e.wall_destroy}`
        + ` view=${state.view?.x},${state.view?.y}`);
    }
    regularbulletStep(e, state);
    if (!e.alive) return;

    if (state.entities.some((x) => x.alive && x.type.name === 'obj_knight_roaring2')) {
      return;
    }

    const follower = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_heart_follower',
    );

    if (e.con <= 2) {
      if (e.speed > e.minspeed) {
        e.speed = scrMovetowards(e.speed, e.minspeed, e.deceleration);
      }
      if (e.con === 0 && e.delay > 0) {
        e.timer += 1;
        if (e.timer >= e.delay) {
          if (globalThis.process?.env?.KNIGHT_SHARD_DEBUG) {
            console.error(`[shard] check f=${globalThis.__simFrame} seq=${e.seq}`
              + ` delay=${e.delay} y=${e.y.toFixed(1)} on=${onscreen(e, 10, state)}`);
          }

          if (!onscreen(e, 10, state)) {
            destroy(e);
            return;
          }
          e.timer = 0;
          e.con = 1;
        }
      }
    }

    if (e.con >= 1 && e.con <= 3) {
      if (follower) {
        e.target_angle = pointDirection(e.x, e.y, follower.x + 10, follower.y + 10);
      }
      if (e.con >= 2 && e.tracking) {
        const difference = angleDifference(e.target_angle, e.direction);
        if (Math.abs(difference) < 90) {
          if (e.con < 3) {
            e.direction = scrRotatetowards(e.direction, e.target_angle, 2);
            e.image_angle = e.direction;
          } else if (Math.abs(difference) <= 4) {
            e.rotation = 0;
          } else if (Math.abs(difference) > 30) {
            e.rotation = sign(difference) * 2;
          } else {
            e.rotation = sign(difference);
          }
        } else if (e.con >= 3) {

          e.tracking = false;
          e.rotation = sign(e.rotation);
        }
      } else {
        e.direction += e.rotation;
        e.image_angle += e.rotation;
      }
    }

    if (e.con === 1) {
      e.image_angle = scrAngleLerp(e.direction, e.target_angle, e.timer / 10);
      e.timer += 1;
      if (e.timer >= 10) {
        e.timer = 0;
        e.con = 2;
        e.direction = e.image_angle;
        e.tracking = true;
      }
      if (e.xscale_start === 0) e.xscale_start = e.image_xscale;
      if (e.yscale_start === 0) e.yscale_start = e.image_yscale;
      const flip = Math.cos((e.timer / 5) * Math.PI);
      e.image_yscale = e.yscale_start * flip;

      e.image_blend = mergeColor(WHITE, BLACK, flip);

      e.outline = mergeColor(WHITE, getSwordcolor(state), flip);
    }

    if (e.con === 2) {
      e.timer += 1;
      if (e.timer >= 10) {
        e.timer = 0;
        e.con = 3;
      }
    }

    if (e.con >= 1 && e.ease < 40) {
      const s = (1 - e.ease / 40) * 2;
      e.x -= lengthdirX(s, e.target_angle);
      e.y -= lengthdirY(s, e.target_angle);
      e.ease += 1;
    }

    if (e.con === 3) {

      e.speed = scrMovetowards(e.speed, 25, 0.5);
      e.image_xscale = e.xscale_start + e.speed / 60;
      e.image_yscale = e.yscale_start - e.speed / 90;
    }

    if (e.con === 4) {
      e.speed = 0;
      e.timer += 1;
      if (e.timer >= 4) destroy(e);
    }
  },

  endStep(e, state) {

    e.drawn_image_alpha = e.image_alpha;

    if (e.coltimer !== -999999) e.coltimer += 1;

    if (e.con === 4) return;

    if (e.coltimer !== -999999) {
      e.image_blend = mergeColor(WHITE, KAIZO_TELEGRAPH_COLOR, clamp01(e.coltimer / 30));
    }

    e.drawtimer += 1;

    if (e.con === 1) {
      e.coltimer = -999999;
      e.image_blend = mergeColor(KAIZO_TELEGRAPH_COLOR, BLACK, e.timer / 10);
    }

    const kaizoSideb = !!(state.kaizo && state.kaizo.sideb);
    const fades = e.difficulty <= 2 || (gmlEq(e.difficulty, 3.3) && !kaizoSideb);
    if (!fades) return;
    const fadeStart = e.lifetime - 15;
    e.image_alpha = clamp((e.lifetime - e.drawtimer) / (e.lifetime - fadeStart), 0, 1);
    if (e.image_alpha < 1) e.active = false;
    if (e.image_alpha === 0) destroy(e);
  },

  collides(e, heart, state) {
    if (e.active !== 1 && e.active !== true) return false;
    const roaring = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_knight_roaring2',
    );
    const n = roaring ? 2 : 5;
    const mask =
      e.sprite_index === 'spr_knight_starchild_trail'
        ? STARCHILD_TRAIL_MASK
        : STARCHILD_MASK;

    if (!enginePairHit(heart, e, mask)) return false;
    return scrPreciseHit(heart, e, mask, n);
  },

  other15(e, state) {
    const roaring = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_knight_roaring2',
    );
    if (!roaring) return starOther15(e, state);
    if (e.active !== 1 && e.active !== true) return;
    kaizoKnightCatch(state);

    if (e.destroyonhit === 1) destroy(e);
  },
};
