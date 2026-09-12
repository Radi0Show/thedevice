

import { spawn, destroy } from '../../sim/entity.js';
import { lengthdirX, lengthdirY, gmlEq } from '../../sim/gml.js';
import { gmlIrandom, gmlChoose, gmlCreate } from '../../sim/rng.js';
import {
  regularbulletCreate, regularbulletStep, collidebulletOther15, scrBulletInit,
} from '../../sim/bullets/regularbullet.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import {
  scrAfterimage, scrAfterimageGrowAttached,
  knightWarp, knightWarpOut,
} from '../../sim/fx.js';
import { DIAMONDFORM_MASK, enginePairHit, HEART_RECT } from '../../sim/masks.js';
import { kaizoMask } from '../data/masks.js';
import { cue } from '../../sim/audio.js';

import { weirdCircleBullet } from '../../sim/attacks/underbox.js';

export { weirdCircleBullet };

function maskWithPx(m) {
  if (!m.px) m.px = m.rows.map((r) => Array.from(r, (c) => c === '1'));
  return m;
}

export const KAIZO_SMALLER_HEART_MASK = maskWithPx(
  kaizoMask('spr_dodgeheart_smaller_2px_mask'),
);

export function restoreHeartMask(state) {
  if (state.soul && state.soul.mask === KAIZO_SMALLER_HEART_MASK) {
    state.soul.mask = HEART_RECT;
  }
}

function delayed(target, delay, fn) {
  (target.pendingDelayed ??= []).push({ delay, fn });
}

function tickDelayed(state, e) {
  if (!e.pendingDelayed || !e.pendingDelayed.length) return;
  for (const p of e.pendingDelayed) p.delay -= 1;
  const due = e.pendingDelayed.filter((p) => p.delay <= 0);
  e.pendingDelayed = e.pendingDelayed.filter((p) => p.delay > 0);
  for (const p of due) p.fn(state, e);
}

export const weirdFanBullet = {
  name: 'obj_knight_weird_fan',

  gmlName: 'obj_regularbullet',

  create(e, state) {
    regularbulletCreate(e, state);
    e.sprite_index = 'spr_diamondbullet_form';
    e.damage = 103;
    e.element = 5;
    e.grazepoints = 3;
  },

  step: regularbulletStep,

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, DIAMONDFORM_MASK);
  },

  other15: collidebulletOther15,
};

export const weirdCircle = {
  name: 'obj_knight_weird_circle',

  create(e) {
    e.sprite_index = 'spr_knight_weird_shadow';
    e.angle = 0;
    e.distance = 0;
    e.spin = 0;
    e.master = e;
    e.timer = 0;
    e.r = 64;
    e.g = 64;
    e.b = 64;
    e.rgb_rate = 24;
    e.hellzone = false;

  },

  step(e, state) {

    if (e.hellzone && e.alarm[1] > 13) e.alarm[1] = 13;
    e.timer += 1;

    if (e.alarm[1] > 0.5) {

      e.r += 191 / e.rgb_rate;
      e.g += 191 / e.rgb_rate;
      e.b += 191 / e.rgb_rate;
      if (e.alarm[1] < 16 && e.alarm[1] % 4 === 0) {
        scrAfterimageGrowAttached(state, e, e, e.image_blend, false);
      }
    }
  },

  alarm: {

    0() {},

    1(e, state) {
      e.r = 64;
      e.g = 64;
      e.b = 64;
      cue(state, 'snd_drake_dodge', 1, 1);

      const big = spawn(state, weirdCircleBullet, { x: e.x, y: e.y });
      big.direction = 90;
      big.speed = 6;
      big.gravity_direction = big.direction;
      big.gravity = 0.2;
      big.image_speed *= 0.5;
      scrLerpvar(state, spawn, big, 'image_yscale', 3, 2, 12);
      scrLerpvar(state, spawn, big, 'image_xscale', 0, 2, 12);
      big.image_angle = big.direction;

      for (let a = 0; a < 5; a++) {
        const b = spawn(state, weirdFanBullet, { x: e.x, y: e.y });
        b.direction = 27.5 + 31.25 * a;
        b.speed = 4;
        b.image_angle = b.direction;
      }
      for (let a = 0; a < 4; a++) {

        if (a === 1 || a === 2) continue;
        const b = spawn(state, weirdFanBullet, { x: e.x, y: e.y });
        b.direction = 40 + 33.333333333333336 * a;
        b.speed = 6;
        b.image_angle = b.direction;
      }
    },
  },
};

export const weirdBottomManager = {
  name: 'obj_knight_weird_bottom_manager',

  stepOrder: -1,

  create(e, state) {
    scrBulletInit(e);

    e.image_xscale = 2;
    e.image_yscale = 2;
    e.sprite_index = 'spr_knight_warp';
    e.image_index = 8;
    e.image_speed = 0;
    e.image_alpha = 1;
    e.timer = 0;
    e.spin = 2;
    e.angle = 0;
    e.amount = 1;
    e.init_start = 4;
    e.init = 8;
    e.circle_val = 0;
    e.circle_goal = 5;
    e.circle_distance = 120;
    e.circle_list = [];
    e.endme = false;
    e.alarm[0] = 16;
    e.center_x = boxCentreX(state);
    e.center_y = boxBottom(state) + 43;
    e.anchor_x = e.x;
    e.anchor_y = e.y;
    e.difficulty = 0;
    e.turn_type = 'full';
    e.turn_segment = -1;
    e.next_up = -999;
    e.next_next_up = -1;
    e.local_turntimer = 340;

    e.norng = 0;
    e.seed = 0;
    e.delay = 18;

    if (gmlEq(state.currentAc, 102.1)) {
      e.norng = 1;

      state.gmlRng = gmlCreate(1225);
    }
    if (gmlEq(state.currentAc, 102)) {
      e.delay = 29;
      if (state.kaizo?.sideb) {
        e.delay = 27;
      }
    }
    e.pendingDelayed = [];
  },

  init(e) {
    e.local_turntimer = 340;
    e.x += 200;
    delayed(e, 8, (st, m) => scrLerpvar(st, spawn, m, 'image_index', 8, 5, 8));
    delayed(e, 16, (st, m) => { m.image_alpha = 0; });
  },

  alarm: {

    0(e, state) {

      for (let i = 0; i < 6; i++) {
        if (e.circle_val < 5) {
          e.circle_val += 1;
          const c = spawn(state, weirdCircle, { x: e.x, y: e.y });
          c.angle = (360 / e.circle_goal) * e.circle_list.length;
          c.distance = e.circle_distance;
          c.spin = e.spin;
          c.master = e;
          c.alarm[0] = 6;
          e.circle_list.push(c);
          e.alarm[0] = e.init_start;
        } else {
          e.alarm[1] = e.init;
        }
      }
    },

    1(e, state) {

      const _d = e.delay;
      if (e.local_turntimer < 80) {
        for (const c of e.circle_list) {
          if (!c || !c.alive) continue;
          scrLerpvar(state, spawn, c, 'image_alpha', c.image_alpha ?? 1, 0, 32);
          delayed(c, 32, (st, orb) => destroy(orb));
        }
        e.x = e.anchor_x;
        e.y = e.anchor_y;

        if (e.turn_type === 'full') {

          e.alarm[2] = 40;
          delayed(e, 20, (st, m) => scrLerpvar(st, spawn, m, 'image_index', 5, 8, 8));
          delayed(e, 20, (st, m) => { m.image_alpha = 1; });
        } else {
          e.alarm[2] = 32;

          if (e.turn_type === 'short start' || e.turn_type === 'short mid'
              || e.turn_type === 'start') {
            switch (e.next_up) {
              case 1: e.alarm[2] = 1; break;
              case 2: e.alarm[2] = 12; break;
              case 3: e.alarm[2] = 18; break;
              case 4: e.alarm[2] = 1; break;
              default: break;
            }
          }

          if (e.turn_type === 'end' || e.turn_type === 'short end') {
            scrLerpvar(state, spawn, e, 'image_index', e.image_index, 8, 8);
            e.image_alpha = 1;
          }
        }
        return;
      }

      const fuse = _d * e.amount - 4 * Math.max(e.amount - 1, 0);

      for (let i = 0; i < Math.min(e.amount, 3); i++) {
        const c = e.circle_list[i];
        if (c && c.alive) {
          c.alarm[1] = fuse;
          c.rgb_rate = fuse;
        }
      }

      e.circle_list.push(e.circle_list.shift());

      if (e.norng) {
        e.seed += 49121;
        state.gmlRng = gmlCreate(e.seed);
      }

      e.alarm[1] = fuse + 2 * gmlIrandom(state.gmlRng, 3);
      const newspin = gmlChoose(state.gmlRng, [-12, 12]);
      const half = e.alarm[1] / 2 - 2;

      scrLerpvar(state, spawn, e, 'spin', e.spin, newspin, half, 2, 'inout');
      delayed(e, Math.trunc(half), (st, m) => scrLerpvar(
        st, spawn, m, 'spin', newspin, Math.sign(newspin), half, 2, 'inout',
      ));
    },

    2(e, state) {

      destroy(e, state);
    },
  },

  destroyEvent(e, state) {
    if (e.turn_type === 'start' || e.turn_type === 'short start'
        || e.turn_type === 'short mid') return;
    const knight = knightEntity(state);
    if (knight) knight.image_alpha = 1;
    state.turntimer = -1;
  },

  step(e, state) {
    tickDelayed(state, e);

    const knight = knightEntity(state);
    if (knight) {
      knight.siner2 = 0;
      e.anchor_x = knight.x;
      e.anchor_y = knight.y;
    }
    e.local_turntimer -= 1;
    e.timer += 1;
    e.angle += e.spin;
    e.center_x = boxCentreX(state);
    e.center_y = boxBottom(state) + 43;

    if (state.soul) state.soul.mask = KAIZO_SMALLER_HEART_MASK;

    if (gmlEq(state.currentAc, 101)) {
      e.center_y += 92;
    }
    if (gmlEq(state.currentAc, 102)) {
      e.center_y += 32;
    }

    for (const c of e.circle_list) {
      if (!c || !c.alive) continue;
      c.x = e.center_x + lengthdirX(c.distance, c.angle + e.angle);
      c.y = e.center_y + lengthdirY(c.distance * 0.25, c.angle + e.angle);
      tickDelayed(state, c);
    }

    if (state.frame % 4 === 0 && e.image_alpha !== 0) {
      const fade = scrAfterimage(state, e);

      fade.depth = (knight?.depth ?? 0) + 1;
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.speed = 4;
      fade.direction = 0;
    }
  },

};

function growtangle(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
}

function knightEntity(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_knight_enemy');
}

function boxCentreX(state) {
  const gt = growtangle(state);
  return gt ? gt.x : state.view.x + 320;
}

function boxBottom(state) {
  const gt = growtangle(state);
  if (!gt) return state.view.y + 245;
  return gt.y + Math.fround(75 * (gt.image_yscale ?? 2)) * 0.5;
}

export function launchUnderbox(state, x, y, opts = {}) {
  const knight = knightEntity(state);
  if (knight) {
    const w = spawn(state, knightWarp, { x: knight.x, y: knight.y });
    w.master = knight;
    knightWarpOut(state, w);
    knight.image_alpha = 0;
  }

  const gt = growtangle(state);
  if (gt) {
    const growing = (gt.timer < gt.maxtimer && gt.growcon === 1) || (gt.timer > 0 && gt.growcon === 3);
    if (!growing) {
      gt.image_xscale = 2;
      gt.image_yscale = 2;
    }
  }
  const mg = spawn(state, weirdBottomManager, {
    x: x ?? knight?.x ?? 0,
    y: y ?? knight?.y ?? 0,
  });

  if (opts.dcDamage !== undefined) mg.damage = opts.dcDamage;
  weirdBottomManager.init(mg, state);
  return mg;
}
