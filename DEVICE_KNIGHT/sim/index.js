

import { runPhase, runAlarms, reap } from './entity.js';
import { traceRow } from './trace.js';
import { spriteMaskHit, SPRITE_MASKS, masksOverlap, GRAZE_MASK, grazeMaskAt } from './masks.js';
import { stepGraze } from './tension.js';
import { freshParty, scrRevive } from './damage.js';
import { stepDmgNumbers, stepHealWriters} from './dmgnumbers.js';
import { rngNext } from './rng.js';

export { createState } from './state.js';
export { spawn, destroy, ALARM_COUNT } from './entity.js';
export { traceHeader, traceRow, real, int } from './trace.js';
export { createRng, rngNext, rngRandom, rngIrandom, rngRange, rngChoose, rngSnapshot, rngRestore } from './rng.js';
export { FPS, MS_PER_FRAME, drain } from './clock.js';

export const PHASES = ['animation', 'beginStep', 'alarm', 'step', 'motion', 'collision', 'endStep'];

function runMotion(state) {
  state.eventPhase = 'motion';

  for (const e of state.entities) {
    if (!e.alive) continue;

    if (e.type.motion) e.type.motion(e, state);

    if (e.componentMotion) {
      if (!e.hspeed && !e.vspeed) continue;
      state.counters.motionSteps += 1;
      e.x = e.x + e.hspeed;
      e.y = e.y + e.vspeed;
      e.speed = Math.sqrt(e.hspeed * e.hspeed + e.vspeed * e.vspeed);
      let dir = (Math.atan2(-e.vspeed, e.hspeed) * 180) / Math.PI;
      if (dir < 0) dir += 360;
      e.direction = dir;
      continue;
    }

    if (!e.builtinMotion) continue;

    if (e.friction) {
      if (e.speed > 0) {
        e.speed = e.speed - e.friction;
        if (e.speed < 0) e.speed = 0;
      } else if (e.speed < 0) {
        e.speed = e.speed + e.friction;
        if (e.speed > 0) e.speed = 0;
      }
    }

    let hs;
    let vs;
    if (e.motionPolarWritten !== false) {

      const r = Math.fround(Math.fround(Math.fround(e.direction) * PI32) / 180);
      hs = fixupInteger(Math.fround(Math.fround(e.speed) * Math.fround(Math.cos(r))));
      vs = fixupInteger(Math.fround(Math.fround(e.speed) * -Math.fround(Math.sin(r))));
    } else {

      hs = e.motionHspeed;
      vs = e.motionVspeed;
    }

    if (!e.gravity && hs === 0 && vs === 0) {

      e.motionHspeed = hs;
      e.motionVspeed = vs;
      e.motionPolarWritten = false;
      continue;
    }
    state.counters.motionSteps += 1;

    if (e.gravity) {

      const gr = Math.fround(Math.fround(Math.fround(e.gravity_direction) * PI32) / 180);
      hs = Math.fround(hs + Math.fround(Math.fround(e.gravity) * Math.fround(Math.cos(gr))));
      vs = Math.fround(vs + Math.fround(Math.fround(e.gravity) * -Math.fround(Math.sin(gr))));

      e.speed = fixupInteger(Math.fround(Math.sqrt(Math.fround(Math.fround(hs * hs) + Math.fround(vs * vs)))));
      let dir = fixupInteger(Math.fround(Math.fround(Math.fround(Math.atan2(-vs, hs)) * 180) / PI32));
      if (dir < 0) dir = Math.fround(dir + 360);
      e.direction = dir;
    }

    e.motionHspeed = hs;
    e.motionVspeed = vs;

    e.motionPolarWritten = false;

    e.x = e.x + hs;
    e.y = e.y + vs;
  }
}

const PI32 = Math.fround(Math.PI);

function fixupInteger(v) {
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-4 ? r : v;
}

export function motionComponents(e) {
  if (e.motionPolarWritten !== false) {
    const r = Math.fround(Math.fround(Math.fround(e.direction) * PI32) / 180);
    return [
      fixupInteger(Math.fround(Math.fround(e.speed) * Math.fround(Math.cos(r)))),
      fixupInteger(Math.fround(Math.fround(e.speed) * -Math.fround(Math.sin(r)))),
    ];
  }
  return [e.motionHspeed, e.motionVspeed];
}

export function setMotionComponents(e, hs, vs) {
  hs = Math.fround(hs);
  vs = Math.fround(vs);
  e.motionHspeed = hs;
  e.motionVspeed = vs;
  e.speed = fixupInteger(Math.fround(Math.sqrt(Math.fround(Math.fround(hs * hs) + Math.fround(vs * vs)))));
  let dir = fixupInteger(Math.fround(Math.fround(Math.fround(Math.atan2(-vs, hs)) * 180) / PI32));
  if (dir < 0) dir = Math.fround(dir + 360);
  e.direction = dir;
  e.motionPolarWritten = false;
}

function grazes(e, gx, gy, sizeFactor = 1) {
  const mask = e.mask ?? SPRITE_MASKS[e.sprite_index] ?? null;
  if (!mask) return false;

  return masksOverlap(
    grazeMaskAt(sizeFactor), gx, gy,
    mask, e.x, e.y, e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
  );
}

function runCollisions(state) {
  state.eventPhase = 'collision';
  const heart = state.soul;
  if (!heart || !heart.alive) return;

  if (!state.grazePrev) state.grazePrev = { x: heart.x + 10, y: heart.y + 10 };

  const bornNow = (b) => b.bornFrame === state.frame;
  stepGraze(state, grazes, (b) => !bornNow(b));

  for (const pass of ['old', 'new']) {
    const want = pass === 'old' ? (b) => !bornNow(b) : bornNow;

    for (const b of [...state.entities].sort((a, z) => z.seq - a.seq)) {
      if (!want(b)) continue;
      if (!b.alive || !b.isBullet || !b.type.other15) continue;
    if (b.maskOff) continue;

    const collides = b.type.collides;
    let hit;
    if (collides) {
      state.counters.collisionChecks += 1;
      hit = collides(b, heart, state);
    } else {
      hit = spriteMaskHit(b, heart);
      if (hit === null) {

        state.counters.unmaskedBullets += 1;
        continue;
      }
      state.counters.collisionChecks += 1;
    }

    if (typeof process !== 'undefined' && process.env?.KNIGHT_PAIR_DEBUG && b.type.name === process.env.KNIGHT_PAIR_DEBUG) {
      const [pa, pb] = (process.env.KNIGHT_PAIR_FRAMES ?? '0-0').split('-').map(Number);
      if (state.frame >= pa && state.frame <= pb) console.error(`[pair] f=${state.frame} ${b.type.name} seq=${b.seq} b=(${b.x}, ${b.y}) a=${b.image_angle} xs=${b.image_xscale} ys=${b.image_yscale} sprite=${b.sprite_index} maskOff=${b.maskOff} heart=(${heart.x}, ${heart.y}) heartMask=${heart.mask?.name ?? '(default)'} hit=${hit}`);
    }
    if (hit) {
      state.counters.collisionHits += 1;

      if (typeof process !== 'undefined' && process.env?.KNIGHT_HIT_DEBUG) {
        console.error(`[hit] f=${state.frame} ${b.type.name} (${b.x}, ${b.y})`
          + ` a=${b.image_angle} xs=${b.image_xscale} ys=${b.image_yscale}`
          + ` inv=${state.invTimer} soul=(${heart.x}, ${heart.y})`);
      }
      b.type.other15(b, state);
    }
    }
  }

  stepGraze(state, grazes, bornNow);

}

function runAnimation(state) {
  for (const e of state.entities) {
    if (!e.alive || !e.image_speed) continue;

    const n = state.spriteFrames?.[e.sprite_index] ?? 0;

    const rate = state.spriteRate?.[e.sprite_index] ?? 1;
    let idx = (e.image_index ?? 0) + e.image_speed * rate;
    if (n > 1 && idx >= n) {
      idx -= n;
      e.animationEnded = true;
    }
    e.image_index = idx;
  }
}

export function stepFrame(state, input) {

  state.prevInput = state.input;
  state.input = input;

  state.invAtFrameStart = state.invTimer;

  for (const e of state.entities) {
    if (!e.alive) continue;
    e.xprevious = e.x;
    e.yprevious = e.y;
  }

  state.roaringActive = state.entities.some(
    (e) => e.alive && e.type.name === 'obj_knight_roaring2',
  );

  runAnimation(state);
  runPhase(state, 'beginStep');
  runAlarms(state);

  state.soulPrev = state.soul && state.soul.alive
    ? { x: state.soul.x, y: state.soul.y }
    : null;
  runPhase(state, 'step');
  runMotion(state);
  runCollisions(state);
  runPhase(state, 'endStep');

  runPhase(state, 'draw');

  stepDmgNumbers(state, state.rng ? () => rngNext(state.rng) : undefined);

  stepHealWriters(state);

  const rh = state.returnHeart;
  if (rh) {
    rh.t += 1;
    const p = Math.min(1, rh.t / rh.flytime);
    rh.x = rh.x + (rh.tx - rh.x) * (1 / Math.max(1, rh.flytime - rh.t + 1));
    rh.y = rh.y + (rh.ty - rh.y) * (1 / Math.max(1, rh.flytime - rh.t + 1));
    if (p >= 1) {

      state.returnHeart = null;
      state.heartBurst = { x: rh.tx, y: rh.ty, burst: 0 };
    }
  }

  if (state.heartBurst) {
    state.heartBurst.burst += 1;
    if (state.heartBurst.burst > 10) state.heartBurst = null;
  }

  if (state.soul && state.soul.alive) {
    state.grazePrev = { x: state.soul.x + 10, y: state.soul.y + 10 };
  } else {
    state.grazePrev = null;
  }

  reap(state);

  if (state.keepAlive) {
    state.partyHp = freshParty();

    for (let i = 0; i < 3; i++) scrRevive(state, i);
    state.gameOver = false;
  }

  state.trace.push(traceRow(state));
  state.frame += 1;

  return state;
}

export function runFrames(state, frames, inputAt) {
  for (let i = 0; i < frames; i++) {
    stepFrame(state, inputAt(state.frame));
  }
  return state;
}
