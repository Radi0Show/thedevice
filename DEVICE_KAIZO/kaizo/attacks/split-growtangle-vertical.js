

import { spawn, destroy } from '../../sim/entity.js';
import { scrEaseOut, GRAY, WHITE } from '../../sim/gml.js';
import { cue } from '../../sim/audio.js';

import { splitFlameMarker } from '../../sim/attacks/split-growtangle.js';

import { spawnLightorb } from './lightorb.js';
import { kaizoMask } from '../data/masks.js';
import { HEART_RECT } from '../../sim/masks.js';

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

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

function baseDepth(e) {
  return e.depth ?? 0;
}

function eventUser0(e) {
  e.timer = 0;
  e.con += 1;
}

function eventUser1(state, e) {
  const gt = box(state);
  if (!gt) return;
  if (gt.customBox) return;

  const newyscale = 3.3333333333333335;
  gt.customBox = true;
  gt.image_yscale = newyscale;
  gt.maxyscale = newyscale;
  e.customBoxBuilt = true;
}

export const splitGrowtangleVertical = {
  name: 'obj_knight_split_growtangle_vertical',

  stepOrder: -0.5,

  create(e, state) {
    const gt = box(state);
    e.image_blend = gt ? gt.image_blend : WHITE;

    e.image_xscale = gt ? gt.image_xscale : 2;
    e.image_yscale = gt ? gt.image_yscale : 2;
    e.depth = baseDepth(gt ?? e) + 100;
    e.con = 0;
    e.timer = 0;
    e.distance = 0;
    if (gt) gt.visible = false;
    e.heart_y = 0;
    e.sprite_index = gt ? gt.sprite_index : 'spr_battlebg_0';
    e.split_dist = 50;
    e.slow = 4;
    e.fast = 8;

    e.child_bullet = [-4];
    e.count = 0;
    e.flame_index = 0;

    e.markers = [0, 1].map((i) => {
      const m = spawn(state, splitFlameMarker, {
        x: e.x + (i === 0 ? 2 : 0),
        y: e.y + (i === 0 ? -1 : 2),
      });
      m.sprite_index = 'spr_rk_split_flame_big';
      m.image_speed = 0.5;
      m.image_xscale = 2;
      m.image_yscale = 2;
      m.image_angle = i === 0 ? 180 : 0;
      m.image_blend = GRAY;
      m.depth = baseDepth(e) + 10;
      return m;
    });
  },

  step(e, state) {
    e.timer += 1;

    if (e.con === 0) {
      if (e.timer === 20) {

        if (state.soul) state.soul.mask = KAIZO_SMALLER_HEART_MASK;

        e.timer = 0;
        e.con = 1;
        eventUser1(state, e);
        cue(state, 'snd_knight_boxbreak', 1.1);
        cue(state, 'snd_chargeshot_fire');

        spawnLightorb(state, e.x, e.y);

        const gt = box(state);
        const heart = state.soul;
        if (heart && gt) {
          e.heart_y = (heart.y + 10) < gt.y ? -1 : 1;
        }
      }

    }

    if (e.con === 1) {
      if (e.timer === 7) {

        for (let i = 0; i < e.count; i += 1) {
          const b = e.child_bullet[i];
          const gt = box(state);
          if (b && b.alive && gt) b.depth = baseDepth(gt) - 10;
        }
      }

      if (e.timer <= 30) {

        const oldDistance = e.distance;

        e.distance = scrEaseOut(e.timer / 30, 6) * 50;

        if (state.soul) {
          state.soul.y += (e.distance - oldDistance) * e.heart_y * 1.25;
        }
      } else {

        eventUser0(e);
      }
    }

    const dist = Math.round(e.distance);
    if (e.markers && e.markers.length === 2) {
      const [m0, m1] = e.markers;
      if (m0.alive) m0.y = e.y - dist - 1;
      if (m1.alive) m1.y = e.y + dist + 3;
    }

    const gt = box(state);
    if (gt) {
      if (e.distance > 0) gt.x = -9999;
      else gt.x = gt.xstart;
    }
  },

  endStep(e, state) {

    e.flame_index = (e.flame_index ?? 0) + 0.5;

    if (e.con <= 0) return;
    const heart = state.soul;
    const gt = box(state);

    if (!heart || !gt) return;

    if (heart.x < gt.xstart - 70) heart.x = gt.xstart - 70;
    if (heart.x > gt.xstart + 52) heart.x = gt.xstart + 52;
    if (e.heart_y === -1) {
      if (heart.y < gt.y - 122) heart.y = gt.y - 122;
      if (heart.y > gt.y - 60) heart.y = gt.y - 60;
    } else {
      if (heart.y > gt.y + 100) heart.y = gt.y + 100;
      if (heart.y < gt.y + 40) heart.y = gt.y + 40;
    }
  },

  cleanUp(e, state) {
    verticalSplitCleanUp(state, e);
  },
};

export function verticalSplitCleanUp(state, e) {
  const gt = box(state);
  if (gt) gt.visible = true;
  for (const m of e.markers ?? []) if (m && m.alive) destroy(m);
  e.markers = [];
}

export function spawnVerticalSplit(state, creator, inherit) {
  const gt = box(state);
  const sp = spawn(state, splitGrowtangleVertical, {
    x: gt ? gt.x : creator.x,
    y: gt ? gt.y : creator.y,
  });
  if (inherit) inherit(creator, sp);

  sp.target = 0;
  return sp;
}
