


import { PARTY_POS, PARTY, partyMaxhp } from './damage.js';
import { gmlRandom } from './rng.js';



const CHARBOX_X = [0, 212, 424];

const LIGHTB = [128, 255, 255];
const LIGHTF = [255, 153, 255];
const LIGHTG = [128, 255, 128];
export const DMG_COLORS = [LIGHTB, LIGHTF, LIGHTG];


export const TYPE_PARTY = -1;
export const TYPE_DEAD = 4;


export const TYPE_SWOON = 12;

export const TYPE_HEAL = 3;
const C_WHITE = [255, 255, 255];
const C_RED = [255, 0, 0];
export const C_LIME = [0, 255, 0];



export const MSG_MAX = 3;


export function dmgColor(type) {
  if (type === 0) return LIGHTB;
  if (type === 1) return LIGHTF;
  if (type === 2) return LIGHTG;
  if (type === TYPE_HEAL) return C_LIME;
  if (type === TYPE_DEAD) return C_RED;
  if (type === TYPE_SWOON) return C_RED;
  return C_WHITE;
}



export function createDmgNumbers() {
  return { list: [], heals: [], hittarget: 0, tu: [0, 0, 0] };
}



export function spawnDmgNumber(state, x, y, damage, type, delay = 8, opts = {}) {
  const d = state.dmg;
  if (!d) return;

  const { special = 0, stack = true, yoff = 0 } = opts;
  const top = stack ? y + 20 - d.hittarget * 20 : y + yoff;

  if (state.gmlRng) gmlRandom(state.gmlRng, 600);
  d.list.push({
    x,

    y: top,
    ystart: top,
    damage,
    type,
    special,
    delay,
    delaytimer: 0,
    hspeed: 0,
    vspeed: 0,
    vstart: 0,
    bounces: 0,
    stretch: 0.2,
    stretchgo: 1,
    killtimer: 0,
    killactive: 0,
    kill: 0,
  });
  if (stack) d.hittarget += 1;
}


export function resetDmgStack(state) {
  if (state.dmg) {
    state.dmg.hittarget = 0;
    state.dmg.tu = [0, 0, 0];
  }
}





const HEAL_ANCHOR = [
  { x: 156, y: 104 },
  { x: 96, y: 142 },
  { x: 127, y: 190 },
];

export function spawnSelfHealNumber(state, target, amount, maxed) {
  const d = state.dmg;
  if (!d) return;

  const pos = HEAL_ANCHOR[target] ?? PARTY_POS[target];
  const tu = d.tu[target] ?? 0;
  spawnDmgNumber(state, pos.x, pos.y, amount, TYPE_HEAL, 8,
    { special: maxed ? MSG_MAX : 0, stack: false, yoff: -tu * 20 });
  d.tu[target] = tu + 1;
}






export function spawnHealWriter(state, target, amount) {
  const d = state.dmg;
  if (!d) return;

  const hp = state.partyHp?.[target] ?? 0;

  const max = partyMaxhp(state, target) ?? 0;
  const pos = HEAL_ANCHOR[target] ?? PARTY_POS[target];
  d.heals.push({

    x: pos.x,
    y: pos.y - 6,
    maxed: max > 0 && hp >= max,
    healamt: amount,

    stretch: 0.2,
    stretchgo: 1,

    vspeed: -6,
    alpha: 1.5,
  });
}


export function stepHealWriters(state) {
  for (const h of state.dmg?.heals ?? []) {

    if (h.stretchgo === 1) h.stretch = (h.stretch ?? 0.2) + 0.4;
    if ((h.stretch ?? 0) >= 1.2) { h.stretch = 1; h.stretchgo = 0; }
  }
  const d = state.dmg;
  if (!d || !d.heals.length) return;
  for (const h of d.heals) {
    h.y += h.vspeed;
    h.vspeed = h.vspeed + 0.2 > 0 ? 0 : h.vspeed + 0.2;

    h.alpha -= 0.1;
  }
  d.heals = d.heals.filter((h) => h.alpha >= 0);
}


export function stepDmgNumbers(state, rng) {
  const d = state.dmg;
  if (!d) return;
  for (const n of d.list) {

    if (n.delaytimer < n.delay) {
      n.delaytimer += 1;
      if (n.delaytimer === n.delay) {

        n.vspeed = -5 - (state.gmlRng ? gmlRandom(state.gmlRng, 2)
          : (rng ? rng() * 2 : 1));
        n.vstart = n.vspeed;
        n.hspeed = 10;
      }
      continue;
    }

    if (n.hspeed > 0) n.hspeed -= 1;
    else if (n.hspeed < 0) n.hspeed += 1;
    if (Math.abs(n.hspeed) < 1) n.hspeed = 0;
    n.x += n.hspeed;

    if (n.bounces < 2) n.vspeed += 1;
    n.y += n.vspeed;
    if (n.y > n.ystart && n.bounces < 2 && n.killactive === 0) {
      n.y = n.ystart;
      n.vspeed = n.vstart / 2;
      n.bounces += 1;
    }
    if (n.bounces >= 2 && n.killactive === 0) {
      n.vspeed = 0;
      n.y = n.ystart;
    }

    if (n.stretchgo === 1) n.stretch += 0.4;
    if (n.stretch >= 1.2) {
      n.stretch = 1;
      n.stretchgo = 0;
    }

    n.killtimer += 1;
    if (n.killtimer > 35) n.killactive = 1;
    if (n.killactive === 1) {
      n.kill += 0.08;
      n.y -= 4;
    }
  }
  d.list = d.list.filter((n) => n.kill <= 1);
}
