


import { cue } from './audio.js';
import { grazeFactors } from './equipment.js';
import { gearOf } from './damage.js';

export const MAX_TENSION = 250;


export function scrTensionheal(state, amount) {
  state.tension = Math.min(state.tension + amount, MAX_TENSION);
}


export function tensionPercent(state) {
  return Math.floor((state.tension / MAX_TENSION) * 100);
}



export function stepGraze(state, grazes, only = null) {
  if (!state.soul) return;
  let grazeNoise = false;

  const cx = state.grazePrev ? state.grazePrev.x : state.soul.x + 10;
  const cy = state.grazePrev ? state.grazePrev.y : state.soul.y + 10;

  const grazeSize = grazeFactors(gearOf(state)).size;

  state.grazeSize = grazeSize;

  for (const e of state.entities) {
    if (!e.alive || !e.isBullet || e.type.name === 'obj_heart') continue;
    if (only && !only(e)) continue;

    const active = e.active === 1 || e.active === true;


    let paired;
    let rowInv = null;
    let rowActive = null;
    if (state.grazeReplay) {
      const rows = state.grazeReplay.get(state.frame);

      const match = rows?.find((r) => !r.used && r.type === (e.type.gmlName ?? e.type.name)
        && Math.abs(r.x - e.x) <= 0.05 && Math.abs(r.y - e.y) <= 0.05);
      if (match) {
        match.used = true;

        rowInv = Number.isFinite(match.inv) ? match.inv : null;

        rowActive = Number.isFinite(match.active) ? match.active : null;
      }
      paired = Boolean(match);
    } else {
      paired = grazes(e, cx, cy, grazeSize);
    }
    if (!paired) {

      continue;
    }


    if (typeof process !== 'undefined' && process.env?.KNIGHT_GRAZE_DEBUG) {
      console.error(`[graze] f=${state.frame} ${e.type.name} grazed=${e.grazed}`
        + ` (${e.x}, ${e.y}) a=${e.image_angle} box=(${cx}, ${cy}) inv=${state.invTimer}`);
    }


    const gateActive = rowActive !== null ? rowActive === 1 : active;

    if (!gateActive && e.type.name !== 'obj_sword_tunnel_sword') continue;

    if ((rowInv ?? state.invTimer) >= 0) continue;


    const gf = grazeFactors(gearOf(state));
    const tp = (e.grazepoints ?? 0) * gf.tp;
    const time = (e.timepoints ?? 0) * gf.time;

    if (e.grazed === 1) {
      scrTensionheal(state, tp / 30);
      if (state.turntimer - 1 >= 10) state.turntimer -= time / 30;
      state.grazeTimer = Math.max(state.grazeTimer ?? 0, 2);
    } else if (e.grazed === 0) {
      e.grazed = 1;
      state.grazeCount = (state.grazeCount ?? 0) + 1;
      scrTensionheal(state, tp);
      if (state.turntimer - 1 >= 10) state.turntimer -= time;
      state.grazeTimer = 10;

      grazeNoise = true;
    }
  }


  if (grazeNoise) cue(state, 'snd_graze');

  if (state.grazeTimer > 0) state.grazeTimer -= 1;
}
