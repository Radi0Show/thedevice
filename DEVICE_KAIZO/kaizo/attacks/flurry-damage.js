

import { gmlChoose, gmlRandomRange } from '../../sim/rng.js';
import {
  PARTY, PARTY_POS, gearOf, scrDead, ACTION_DEFEND,
} from '../../sim/damage.js';
import { heroHurt } from '../../sim/heroes.js';
import { spawnDmgNumber, TYPE_PARTY, TYPE_SWOON } from '../../sim/dmgnumbers.js';
import { scrShakescreen } from '../../sim/shake.js';

export function kaizoSideb(state) {
  return !!(state.kaizo && state.kaizo.sideb);
}

export function kaizoScrDamageMaxhp(state, fraction, ignoreDefend = false, cannotFell = false, opts = {}) {
  if (state.invTimer >= 0) return 0;

  if (state.knight) state.knight.progamer = false;

  const hp = state.partyHp;
  let target = opts.target ?? 0;

  if (!state.roaringActive && !opts.aoe) {
    const gear = gearOf(state);
    const armorHas23 = (i) => (gear[i]?.armor ?? []).includes(23);

    let mantlechar = -1;
    for (let i = 0; i < 3; i++) {
      if (armorHas23(i) && hp[i] > 0) mantlechar = i;
    }
    const mc = mantlechar;
    const k = state.knight;

    if ((k?.damagecounter ?? 0) >= 2) mantlechar = -1;

    if (mantlechar === -1) {

      const sus = Math.max(hp[1] / PARTY[1].maxhp, 0.45);
      const ral = Math.max(hp[2] / PARTY[2].maxhp, 0.45);

      let krisrange = 2 - sus - ral;
      const hitstat = state.gmlRng ? gmlRandomRange(state.gmlRng, 0, 2) : 1;
      if (hp[0] < 0) krisrange = -1;
      if (hitstat > krisrange) {

        if (hp[0] > 0) target = 0;
        if (hp[1] > 0 && hp[2] > 0) {
          target = state.gmlRng ? gmlChoose(state.gmlRng, [1, 2]) : 1;
        } else if (hp[1] > 0) {
          target = 1;
        } else if (hp[2] > 0) {
          target = 2;
        }
      } else {
        target = 0;
      }

      if (target !== mc && k) k.damagecounter = 0;
    } else {

      if (k) k.damagecounter = (k.damagecounter ?? 0) + 1;
      target = mantlechar;
    }

    if (armorHas23(target)) fraction /= 2;

  }

  const maxhp = PARTY[target].maxhp;
  let t = Math.ceil(maxhp * fraction);

  let gloomdmg = 0;
  if (kaizoSideb(state)) {
    gloomdmg = Math.ceil(t / 4);
    t = Math.ceil(t * 0.8);
  }
  if (state.charaction?.[target] === ACTION_DEFEND && !ignoreDefend) {
    t = Math.ceil(t / 1.5);
  }
  if (cannotFell) {

    t = Math.min(Math.max(t, 1), hp[target] - 1);
  }

  if (!state.entities?.some((sh) => sh.alive && sh.type?.name === 'obj_shake')) {
    scrShakescreen(state);
  }

  if (t < 0) t = 0;

  hp[target] -= t;
  if (hp[target] <= 0) {

    hp[target] = -999;
    scrDead(state, target);
  }
  heroHurt(state, target);

  spawnDmgNumber(state, PARTY_POS[target].x, PARTY_POS[target].y, t,
    hp[target] > 0 ? TYPE_PARTY : TYPE_SWOON, 2);

  if (kaizoSideb(state) && state.kaizo) {
    const gloom = (state.kaizo.gloom ??= [0, 0, 0]);
    if (hp[target] > 1) {

      const minhp = hp[target] - 1;
      gloom[target] += gloomdmg;
      gloom[target] = Math.min(gloom[target], minhp);
    } else {
      gloom[target] = 0;
    }
  }

  state.invTimer = state.invc * 30;
  return t;
}
