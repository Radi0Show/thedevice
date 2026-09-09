


import { gmlRound } from './gml.js';
import { heroHurt } from './heroes.js';
import { statsOf } from './equipment.js';
import { spawnDmgNumber, TYPE_PARTY, TYPE_DEAD, TYPE_SWOON} from './dmgnumbers.js';
import { gmlChoose } from './rng.js';
import { scrShakescreen } from './shake.js';



export const PARTY_POS = [
  { x: 126, y: 104 },
  { x: 80, y: 142 },
  { x: 58, y: 190 },
];
import { cue, cueStop } from './audio.js';


export const PARTY = [
  { name: 'KRIS', maxhp: 160, at: 14, magic: 0, df: 2, weaponDf: 0, armorDf: [1, 2] },
  { name: 'SUSIE', maxhp: 190, at: 18, magic: 2, df: 2, weaponDf: 0, armorDf: [1, 2] },
  { name: 'RALSEI', maxhp: 140, at: 12, magic: 11, df: 2, weaponDf: 0, armorDf: [1, 2] },
];



export const DEFAULT_GEAR = [
  { weapon: 23, armor: [23, 27] },
  { weapon: 24, armor: [22, 7] },
  { weapon: 18, armor: [21, 26] },
];



export function gearOf(state) {
  if (state.loadout?.gear) return state.loadout.gear;
  if (state.loadout?.shadowMantle === false) {
    return DEFAULT_GEAR.map((g) => ({
      ...g,
      armor: (g.armor ?? []).filter((a) => a !== 23),
    }));
  }
  return DEFAULT_GEAR;
}



export function statFor(state, slot) {
  return statsOf(PARTY[slot], gearOf(state)[slot] ?? { weapon: 0, armor: [] });
}


const MANTLE_DF = 3;

export function battleDf(target, shadowMantle) {

  const p = PARTY[target];
  const armor2 = shadowMantle ? MANTLE_DF : p.armorDf[1];
  return p.df + p.weaponDf + p.armorDf[0] + armor2;
}



export function scrDamageCalculation(damage, target, shadowMantle, state = null) {
  let d = damage;

  const def = state ? statFor(state, target).df : battleDf(target, shadowMantle);
  const maxhp = PARTY[target].maxhp;
  const a = maxhp / 5;
  const b = maxhp / 8;
  for (let i = 0; i < def; i++) {
    if (d > a) d -= 3;
    else if (d > b) d -= 2;
    else d -= 1;
  }
  return d;
}


export const ACTION_DEFEND = 10;


export const TP_DEFEND = 40;



export const UP = 'UP';
export const DOWN = 'DOWN';
export const SWOON = 'SWOON';

export function statusOf(state, target) {
  const hp = state.partyHp[target];
  if (hp > 0) return UP;
  return hp <= -999 ? SWOON : DOWN;
}

export function partyStatus(state) {
  return [0, 1, 2].map((i) => statusOf(state, i));
}


export function isUp(state, target) {

  if (state.chardead) return !state.chardead[target];
  return state.partyHp[target] > 0;
}



export function scrDead(state, slot) {
  if (state.charmove) state.charmove[slot] = 0;
  if (state.charcantarget) state.charcantarget[slot] = 0;
  if (state.chardead) state.chardead[slot] = 1;
  if (state.charaction) state.charaction[slot] = 0;
  if (state.charspecial) state.charspecial[slot] = 0;
}


export function scrRevive(state, slot) {
  if (state.charmove) state.charmove[slot] = 1;
  if (state.charcantarget) state.charcantarget[slot] = 1;
  if (state.chardead) state.chardead[slot] = 0;
}



export function knightTarget(state, target, opts = {}) {
  if (opts.aoe || opts.truedamage) return target;


  const hook = state.kaizo?.hooks?.knightTarget;
  if (hook) return hook(state, target, opts);

  let t = target;


  const cantarget = (slot) => (state.charcantarget ? state.charcantarget[slot] : 1);
  const rtOld = () => {
    const any = [0, 1, 2].some((i) => cantarget(i));
    if (!any) return 3;
    let m = opts.choose ? opts.choose(0, 1, 2) : 0;
    let guard = 0;
    while (!cantarget(m) && guard++ < 64) m = opts.choose ? opts.choose(0, 1, 2) : 0;
    return m;
  };
  const maxhpOf = (slot) => (state.partyMaxhp ? state.partyMaxhp[slot] : PARTY[slot].maxhp);
  const ratio = (slot) => (slot >= 0 && slot < 3 ? state.partyHp[slot] / maxhpOf(slot) : 1);
  const hpaverage = () => {
    let hp = 0;
    let mx = 0;
    for (let i = 0; i < 3; i++) { hp += state.partyHp[i]; mx += maxhpOf(i); }
    return hp > 0 ? Math.floor(hp / mx) : 0;
  };

  const pick = (fallback) => { const m = rtOld(); return m === 3 ? fallback : m; };
  if (t < 3 && t >= 0 && state.partyHp[t] <= 0) t = pick(t);
  if (t === 4) {
    t = pick(0);
    if (ratio(t) < hpaverage() / 2) t = pick(t);
    if (ratio(t) < hpaverage() / 2) t = pick(t);
    if (t === 0 && ratio(t) < 0.35) t = pick(t);
  }


  if (t === 0) {
    const susie = state.partyHp[1] > 0;
    const ralsei = state.partyHp[2] > 0;
    if (susie && ralsei) t = opts.choose ? opts.choose(1, 2) : 1;
    else if (susie) t = 1;
    else if (ralsei) t = 2;
  }


  const gear = gearOf(state);

  const wears = (i) => (gear[i]?.armor ?? []).includes(23);

  const mantle = (wears(0) || wears(1) || wears(2)) && !state.noMantle;

  const ac = opts.ac ?? state.currentAc;
  if (mantle && ac !== 13) {
    const k = state.knight;
    k.damagecounter = (k.damagecounter ?? 0) + 1;
    if (k.damagecounter < 3) {

      for (let i = 0; i < 3; i++) if (state.partyHp[i] > 0 && wears(i)) t = i;
    } else {
      let pick = opts.choose ? opts.choose(0, 1, 2) : 0;

      for (let i = 0; i < 2; i++) {
        if (state.partyHp[pick] <= 0) pick += 1;
        if (pick > 2) pick = 0;
      }
      t = pick;

      const a1 = (i) => (gear[i]?.armor ?? [])[0] === 23;
      const a2 = (i) => (gear[i]?.armor ?? [])[1] === 23;
      const skipReset = ((t === 0 && a1(0)) || a2(0))
        || ((t === 1 && a1(1)) || a2(1))
        || ((t === 2 && a1(2)) || a2(2));
      if (!skipReset) k.damagecounter = 0;
    }
  }
  return t;
}



export function scrDamage(state, damage, target, opts = {}) {

  const kHook = state.kaizo?.hooks?.scrDamage;
  if (kHook) return kHook(state, damage, target, opts);

  if (state.damageEnabled === false) return 0;

  const mantle = (gearOf(state)[target]?.armor ?? []).includes(23);
  const hp = state.partyHp;
  if (!hp || hp[target] <= 0) return 0;


  let t = damage;
  let mantled = false;
  if (!opts.truedamage) {
    t = scrDamageCalculation(damage, target, mantle, state);
    if (mantle) {
      t = gmlRound(t * 0.33);
      mantled = true;
    }
    if (state.charaction?.[target] === ACTION_DEFEND) t = Math.ceil((2 * t) / 3);
    if (!mantled) t = Math.ceil(t * (opts.elementReduction ?? 1));
  }
  if (t < 1) t = 1;


  if (opts.flurrySoftened) t = gmlRound(t * 0.66);


  if (!state.entities.some((s) => s.alive && s.type?.name === 'obj_shake')) {
    scrShakescreen(state);
  }

  hp[target] -= t;
  if (hp[target] <= 0) {

    hp[target] = target === 0 ? Math.round(-PARTY[0].maxhp / 2) : -999;
    scrDead(state, target);
  }

  heroHurt(state, target);

  const doomtype = hp[target] > 0
    ? TYPE_PARTY
    : (target === 0 ? TYPE_DEAD : TYPE_SWOON);
  spawnDmgNumber(state, PARTY_POS[target].x, PARTY_POS[target].y, t, doomtype, 2);
  return t;
}



export function scrDamageSingle(state, damage, target, opts = {}) {

  const kHook = state.kaizo?.hooks?.scrDamageSingle;
  if (kHook) return kHook(state, damage, target, opts);
  if (state.damageEnabled === false) return 0;
  if (state.invTimer >= 0) return 0;

  if (state.knight) state.knight.progamer = false;

  const t = knightTarget(state, target, {
    ...opts,
    choose: (...xs) => (state.gmlRng ? gmlChoose(state.gmlRng, xs) : xs[0]),
  });
  const dealt = scrDamage(state, damage, t, opts);
  state.invTimer = state.invc * 30;

  if (dealt > 0) {
    cueStop(state, 'snd_hurt1');
    cue(state, 'snd_hurt1');
  }
  return dealt;
}



export function scrDamageAll(state, damage, opts = {}) {

  const kHook = state.kaizo?.hooks?.scrDamageAll;
  if (kHook) return kHook(state, damage, opts);
  if (state.damageEnabled === false) return 0;
  if (state.invTimer >= 0) return 0;

  if (state.knight) state.knight.progamer = false;
  let total = 0;
  for (let ti = 0; ti < 3; ti++) {
    if (state.partyHp[ti] > 0) total += scrDamage(state, damage, ti, opts);
  }
  state.invTimer = state.invc * 30;

  if (total > 0) {
    cueStop(state, 'snd_hurt1');
    cue(state, 'snd_hurt1');
  }
  return total;
}


export function freshParty() {
  return PARTY.map((p) => p.maxhp);
}


export function partyWiped(state) {
  return state.partyHp.every((h) => h <= 0);
}



export function scrDamageMaxhp(state, fraction, ignoreDefend = false, cannotFell = false, opts = {}) {

  const kHook = state.kaizo?.hooks?.scrDamageMaxhp;
  if (kHook) return kHook(state, fraction, ignoreDefend, cannotFell, opts);
  if (state.invTimer >= 0) return 0;
  const hp = state.partyHp;


  let target = opts.target ?? 0;
  if (!state.roaringActive) {
    target = knightTarget(state, target, {
      ...opts,
      choose: (...xs) => (state.gmlRng ? gmlChoose(state.gmlRng, xs) : xs[0]),
    });
    if ((gearOf(state)[target]?.armor ?? []).includes(23)) fraction /= 2;
  }

  const maxhp = PARTY[target].maxhp;
  let t = Math.ceil(maxhp * fraction);
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

    hp[target] = target === 0 ? Math.round(-PARTY[0].maxhp / 2) : -999;
    scrDead(state, target);
  }
  heroHurt(state, target);
  spawnDmgNumber(state, PARTY_POS[target].x, PARTY_POS[target].y, t,
    hp[target] > 0 ? TYPE_PARTY : (target === 0 ? TYPE_DEAD : TYPE_SWOON), 2);
  state.invTimer = state.invc * 30;
  return t;
}

