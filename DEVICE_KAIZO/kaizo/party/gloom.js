

import { gmlChoose, gmlIrandomRange, gmlRandomRange } from '../../sim/rng.js';
import { spawn } from '../../sim/entity.js';
import { particleGeneric } from '../../sim/fx.js';
import { scrLerpvar } from '../../sim/lerpvar.js';

export const GLOOM_SCR_DAMAGE_CAP = 45;

export const GLOOM_TEXT_THRESHOLD = 36;

export const GLOOM_TEXT = {
  1: '* Kris shivers coldly from GLOOM.&',
  2: '* GLOOM fogs Susie\'s thoughts.&',
  3: '* Ralsei trembles due to GLOOM.&',
  4: '* Noelle\'s GLOOM froze her.&',
};

export const KAIZO_GLOOM_COLOR = '#1346d5';

export function kaizoGloomcolor() {
  return { r: 19, g: 70, b: 213, css: KAIZO_GLOOM_COLOR };
}

export const GLOOM_BLEND = Object.freeze([19, 70, 213]);

const OBJ_HEROSUSIE = 1410;

const HERO_MYHEIGHT = { 1: 74, 2: 82, 3: 86, 4: 86 };

const DEFAULT_ROSTER_CHARIDS = [1, 2, 3];

export function rosterCharIds(state) {
  const roster = state.kaizo?.roster;
  if (Array.isArray(roster) && roster.length > 0) {
    return roster.map((m, i) => (
      typeof m?.charId === 'number' ? m.charId : (DEFAULT_ROSTER_CHARIDS[i] ?? 0)
    ));
  }
  const n = state.partyHp?.length ?? DEFAULT_ROSTER_CHARIDS.length;
  return DEFAULT_ROSTER_CHARIDS.slice(0, n);
}

export function slotOfCharId(state, charId) {
  return rosterCharIds(state).indexOf(charId);
}

export function charIdOfSlot(state, slot) {
  return rosterCharIds(state)[slot] ?? 0;
}

export function ensureGloom(state) {
  const k = (state.kaizo ??= {});
  const n = rosterCharIds(state).length;
  const widen = (arr) => {
    while (arr.length < n) arr.push(0);
    return arr;
  };
  return {

    gloom: widen(k.gloom ??= []),

    timer: widen(k.gloomTimer ??= []),

    emit: widen(k.gloomEmit ??= []),
  };
}

export function scrIsphaseBullets(state) {
  if (typeof state.kaizo?.mnfight === 'number') return state.kaizo.mnfight === 2;
  if (typeof state.mnfight === 'number') return state.mnfight === 2;
  return true;
}

export function kaizoSideb(state) {
  return !!(state.kaizo && state.kaizo.sideb);
}

export function kaizoGloomSplitDamage(state, damage) {
  if (!kaizoSideb(state)) return { gloomdmg: 0, damage };
  let gloomdmg = Math.ceil(damage / 6);
  if (gloomdmg < 10) gloomdmg = 10;
  let out = damage;
  if (damage > 120) out = Math.ceil(damage * 0.8);
  return { gloomdmg, damage: out };
}

export function kaizoGloomSplitMaxhp(state, tdamage) {
  if (!kaizoSideb(state)) return { gloomdmg: 0, damage: tdamage };
  return { gloomdmg: Math.ceil(tdamage / 4), damage: Math.ceil(tdamage * 0.8) };
}

export function kaizoGloomAccrue(state, slot, gloomdmg, { cap45 = false } = {}) {
  if (!kaizoSideb(state)) return 0;
  const led = ensureGloom(state);
  const hp = state.partyHp[slot];

  const practice = !!(state.knight?.practicemode ?? state.kaizo?.practicemode);
  if (hp > 1 && !practice) {
    let dmg = gloomdmg;
    const charId = charIdOfSlot(state, slot);
    if (charId === 4 && state.kaizo?.charweapon?.[4] === 13) dmg = 0;
    const minhp = hp - 1;
    led.gloom[slot] = (led.gloom[slot] ?? 0) + dmg;
    led.gloom[slot] = Math.min(led.gloom[slot], minhp);
    if (cap45 && led.gloom[slot] > GLOOM_SCR_DAMAGE_CAP) {
      led.gloom[slot] = GLOOM_SCR_DAMAGE_CAP;
    }
  } else {
    led.gloom[slot] = 0;
  }
  return led.gloom[slot];
}

export function kaizoGloomClampToHp(state, slot) {
  const led = ensureGloom(state);
  led.gloom[slot] = Math.min(state.partyHp[slot] - 1, led.gloom[slot] ?? 0);
  return led.gloom[slot];
}

export function gloomDarktime(gloom) {
  return Math.ceil(Math.max(18 - (gloom / 5), 1));
}

export function kaizoGloomemit(state, slot) {
  if (state.roaringActive) return 0;
  const rng = state.gmlRng;
  if (!rng) return 0;
  const before = rng.draws ?? 0;
  const charId = charIdOfSlot(state, slot);
  const myheight = HERO_MYHEIGHT[charId] ?? 74;

  const canSpawn = Array.isArray(state.entities) && typeof state.nextSpawnSeq === 'number';
  const member = state.kaizo?.roster?.[slot] ?? null;
  const hx = member?.pos?.x ?? 0;
  const hy = member?.pos?.y ?? 0;
  const hdepth = member?.depth ?? 0;
  for (let r = 0; r < 2; r++) {

    let xx = hx + gmlRandomRange(rng, 0, 28) * 2;

    if (charId === 2) xx = hx + gmlRandomRange(rng, 0, 32) * 2;
    const yy = hy + gmlRandomRange(rng, 0, myheight - 14);

    const dz = gmlChoose(rng, [-1, 1]);
    const ys = 2 * gmlIrandomRange(rng, 4, 6);
    const vs = gmlRandomRange(rng, 4, 6);
    if (!canSpawn) continue;
    const p = spawn(state, particleGeneric, { x: xx, y: yy });
    p.image_blend = GLOOM_BLEND;
    p.depth = hdepth + dz;

    p.sprite_index = 'spr_whitepx';
    p.image_xscale = 2;
    p.image_yscale = ys;

    p.componentMotion = true;
    p.vspeed = vs;

    scrLerpvar(state, spawn, p, 'image_alpha', 1, 0, 5);
    p.timer = 5;
  }
  return (rng.draws ?? 0) - before;
}

export function kaizoGloomStep(state, { bullets = null } = {}) {
  if (!kaizoSideb(state)) return { ticks: 0, emits: 0, draws: 0 };
  const led = ensureGloom(state);
  const chars = rosterCharIds(state);

  const inBullets = bullets === null ? scrIsphaseBullets(state) : !!bullets;
  let ticks = 0;

  for (let charId = 1; charId <= 4; charId++) {
    const slot = chars.indexOf(charId);
    if (slot < 0) continue;
    led.emit[slot] = 0;
    if (!(led.gloom[slot] > 0)) continue;
    if (state.partyHp[slot] < 0) {
      led.gloom[slot] = 0;
      led.timer[slot] = 0;
      continue;
    }
    led.timer[slot] += 1;
    const darktime = gloomDarktime(led.gloom[slot]);
    if (led.timer[slot] >= darktime) {
      led.emit[slot] = 1;
      led.timer[slot] = 0;
      if (inBullets) {
        led.gloom[slot] -= 1;
        state.partyHp[slot] -= 1;
        ticks += 1;
      }
    }
  }

  if (Array.isArray(state.kaizo?.gloomByChar)) {
    for (let charId = 1; charId <= 4; charId++) {
      const slot = chars.indexOf(charId);
      if (slot >= 0) state.kaizo.gloomByChar[charId] = led.gloom[slot] ?? 0;
    }
  }

  let emits = 0;
  let draws = 0;
  for (let charId = 1; charId <= 4; charId++) {
    const slot = chars.indexOf(charId);
    if (slot < 0) continue;
    if (!led.emit[slot]) continue;
    emits += 1;
    draws += kaizoGloomemit(state, slot);
  }

  publishGloomHud(state);
  return { ticks, emits, draws };
}

export function publishGloomHud(state) {
  const led = ensureGloom(state);
  const values = [0, 0, 0];
  for (let slot = 0; slot < Math.max(3, led.gloom.length); slot++) {
    values[slot] = led.gloom[slot] ?? 0;
  }
  state.partyStatusBar = { color: KAIZO_GLOOM_COLOR, values };
  return state.partyStatusBar;
}

export function kaizoGloomMessages(state) {
  if (!kaizoSideb(state)) return null;
  const k = state.kaizo;
  const gtext = (k.gtext ??= [0, 0, 0, 0, 0]);
  let gmsg = '';
  for (let charId = 1; charId <= 4; charId++) {
    if (!gtext[charId] && kaizoCharboxGloom(state, charId) >= GLOOM_TEXT_THRESHOLD) {
      gmsg += GLOOM_TEXT[charId];
      gtext[charId] = 1;
    }
  }
  return gmsg !== '' ? gmsg : null;
}

export const gloomEngine = {
  name: 'kaizo_gloom_engine',
  create(e) {
    e.visible = false;
    e.depth = 0;
  },
  endStep(e, state) {
    kaizoGloomStep(state);
  },
};

export function kaizoCharboxGloom(state, charId) {
  const slot = slotOfCharId(state, charId);
  if (slot < 0) return 0;
  return ensureGloom(state).gloom[slot] ?? 0;
}

export function kaizoGloomBarSegment(state, charId, maxhp) {
  if (!kaizoSideb(state)) return null;
  const gloom = kaizoCharboxGloom(state, charId);
  if (!(gloom > 0)) return null;
  const slot = slotOfCharId(state, charId);
  const hp = state.partyHp[slot];
  const mx = maxhp ?? state.kaizo?.roster?.[slot]?.maxhp ?? 0;

  if (!(hp > 0 && mx > 0)) return null;
  return {
    lx: Math.ceil(((hp - gloom) / mx) * 75),
    rx: Math.ceil((hp / mx) * 75),
    color: KAIZO_GLOOM_COLOR,
  };
}

export function kaizoRudeBusterGloomBlend(state) {
  if (!kaizoSideb(state)) return 0;
  return Math.min(kaizoCharboxGloom(state, 2) / 150, 0.3);
}
