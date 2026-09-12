

import { spawn } from '../../sim/entity.js';
import { cue } from '../../sim/audio.js';
import { scrMovetowards, scrEaseOut, lerp, gmlEq } from '../../sim/gml.js';
import { gmlRandomRange, gmlChoose, gmlRandom } from '../../sim/rng.js';
import { pointingStar } from './stars-pointing-star.js';
import { pointingCone } from './stars-pointing-cone.js';
import { heartFollower } from '../../sim/attacks/pointing-starchild.js';

export const starsController = {
  name: 'obj_dbulletcontroller',

  stepOrder: -1,

  create(e, state) {
    e.btimer = 0;
    e.made = 0;
    e.endtimer = 120;
    e.init = 2;
    e.size = 0;
    e.special = 0;

    e.starid = 0;

    e.ctype = 98;

    state.childDelay = 0;
    state.childSubdelay = 0;

    if (state.soul && !state.entities.some((x) => x.alive && x.type.name === 'obj_heart_follower')) {
      spawn(state, heartFollower, { x: state.soul.x, y: state.soul.y });
    }
  },

  step(e, state) {

    if (!e.turntimerPaid) {
      e.turntimerPaid = true;
      state.turntimer += 30;

      const d = e.difficulty ?? 0;
      if (d >= 2 && !gmlEq(d, 3.2) && !gmlEq(d, 3.3)) state.turntimer += 90;
    }
    if (e.init >= 3) return;

    e.btimer += 1;

    if (state.turntimer - 1 <= e.endtimer + 1) {
      e.init = 3;
      return;
    }

    if ((e.made !== 0 && e.btimer >= 4) || e.btimer >= 33) {
      const cone = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_pointing_cone',
      );
      if (!cone) return;

      const coneAngle = cone.angle;

      if ((e.difficulty ?? 0) === 2 && state.gmlRng) {
        e.side = gmlChoose(state.gmlRng, [0, 66, -66]);
      }

      e.starid += 1;
      let starexp = 0;
      const kaizoSideb = !!(state.kaizo && state.kaizo.sideb);
      const kd = e.difficulty ?? 0;
      if (kaizoSideb) {
        if (gmlEq(kd, 3.1)) {
          if (e.starid % 2 >= 1) starexp = 1;
        } else if (e.starid % 4 >= 1) starexp = 1;
      } else if (gmlEq(kd, 3.1)) {
        if (e.starid % 2 >= 1) starexp = 1;
      } else if (e.starid % 3 >= 1) starexp = 1;
      if (kd === 1 || gmlEq(kd, 3.3)) starexp = 1;

      const d = spawn(state, pointingStar, { x: cone.x + 22, y: cone.y + 56 });
      d.difficulty = e.difficulty ?? 0;
      d.side = e.side ?? 1;

      d.starry = starexp;

      cue(state, 'snd_stardrop', 0.5, 0.5);

      let direction;
      let speed;
      const replay = state.starVariant ? state.starVariant.launches : null;
      if (replay) {
        const rec = replay[e.made];
        if (!rec) { d.alive = false; return; }
        direction = rec.direction;
        speed = rec.speed;
      } else if (e.made === 0) {

        e.size = gmlRandomRange(state.gmlRng, 0.5, 1);
        e.special = gmlRandomRange(state.gmlRng, -0.5, 0.5);
        direction = 180 + e.special * coneAngle;
        speed = lerp(10, 5, e.size);
      } else {
        e.size = (e.size + (0.5 + Math.sin(e.made) * 0.5)) % 1;
        const _u = gmlRandom(state.gmlRng, 1);
        if (globalThis.process?.env?.KNIGHT_STAR_DEBUG) {
          console.error(`[chain] made=${e.made} specialPrev=${e.special} u=${_u} sin=${Math.sin(_u)}`);
        }
        e.special =
          ((e.special + (0.5 + (0.5 + Math.sin(_u) * 0.3))) % 1) - 0.5;
        direction = 180 + e.special * coneAngle;
        speed = lerp(10, 5, e.size);
      }

      if (!replay && e.size <= 0.1 && state.soul) {
        const hx = state.soul.x + 10 - (cone.x + 22);
        const hy = state.soul.y + 10 - (cone.y + 56);
        const heartdir = ((Math.atan2(-hy, hx) * 180) / Math.PI + 360) % 360;
        let diffd = ((heartdir - direction) % 360 + 540) % 360 - 180;
        if (Math.abs(diffd) < 20) {
          direction = direction < heartdir
            ? heartdir - 20 + diffd
            : heartdir + 20 + diffd;
          const lo = 180 - cone.angle;
          const hi = 180 + cone.angle;
          const span = hi - lo;
          if (span > 0) {
            while (direction < lo) direction += span;
            while (direction > hi) direction -= span;
          }
        }
      }

      d.direction = direction;
      d.speed = speed;
      if (globalThis.process?.env?.KNIGHT_STAR_DEBUG) {
        console.error(`[star] f=${globalThis.__simFrame} made=${e.made} size=${e.size}`
          + ` special=${e.special} coneAngle=${coneAngle} dir=${direction} spd=${speed}`);
      }

      e.made += 1;
      e.btimer = 0;

      if (gmlEq(e.difficulty ?? 0, 3.3)) e.btimer = -1;
    }
  },
};

export function kaizoStarsEndtimer(difficulty) {
  const d = difficulty ?? 0;
  return d >= 2 && !gmlEq(d, 3.2) && !gmlEq(d, 3.3) ? 210 : 120;
}

export const CONE_POS = { x: 425, y: 78.56589 };

export function launchKaizoStars(state, difficulty, pos = CONE_POS) {
  const endtimer = kaizoStarsEndtimer(difficulty);
  const dc = spawn(state, starsController, { ...pos });
  dc.difficulty = difficulty;
  dc.endtimer = endtimer;

  dc.turntimerPaid = true;
  state.turntimer += 30;
  if (difficulty >= 2 && !gmlEq(difficulty, 3.2) && !gmlEq(difficulty, 3.3)) {
    state.turntimer += 90;
  }
  const cone = spawn(state, pointingCone, { ...pos });
  cone.difficulty = difficulty;
  cone.con = 1;
  cone.endtimer = endtimer;

  if (difficulty === 0 && state.gmlRng) {
    dc.side = gmlChoose(state.gmlRng, [-1, 1]);
  }

  return dc;
}
