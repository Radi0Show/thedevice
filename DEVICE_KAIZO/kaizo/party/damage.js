

import { gmlRound } from '../../sim/gml.js';
import { gmlChoose, gmlRandomRange, gmlIrandom } from '../../sim/rng.js';
import { spawnDmgNumber, TYPE_PARTY, TYPE_DEAD, TYPE_SWOON } from '../../sim/dmgnumbers.js';
import { scrShakescreen } from '../../sim/shake.js';
import { cue, cueStop } from '../../sim/audio.js';
import {
  CHAR_NONE, CHAR_NOELLE, globalChar, rosterSize, charIdOf, memberAt,
  hpOfChar, setHpOfChar, maxhpOfChar, gearOfChar, statFor, setGloom, isUp,
} from './roster.js';
import { THORN_RING } from './noelle.js';
import { heroHurt } from './heroes.js';

export { statFor, isUp };

export const ACTION_DEFEND = 10;

export const TP_DEFEND = 40;

export const SHADOW_MANTLE = 23;

export const UP = 'UP';
export const DOWN = 'DOWN';
export const SWOON = 'SWOON';

export function partyPos(state, slot) {
  return memberAt(state, slot)?.pos ?? { x: 0, y: 0 };
}

export function statusOf(state, slot) {
  const hp = state.partyHp[slot];
  if (hp > 0) return UP;
  return hp <= -999 ? SWOON : DOWN;
}

export function partyStatus(state) {
  const out = [];
  for (let i = 0; i < rosterSize(state); i++) out.push(statusOf(state, i));
  return out;
}

export function scrDead(state, slot) {
  if (slot < 0 || slot >= rosterSize(state)) return;

  if (typeof process !== 'undefined' && process.env?.KAIZO_PARTY_DEBUG) {
    console.error(`[party] f=${state.frame} scr_dead slot ${slot}`
      + ` hp=${state.partyHp?.[slot]} chardead=${state.chardead?.[slot]}->1`);
  }
  if (state.charmove) state.charmove[slot] = 0;
  if (state.charcantarget) state.charcantarget[slot] = 0;
  if (state.chardead) state.chardead[slot] = 1;
  if (state.charaction) state.charaction[slot] = 0;
  if (state.charspecial) state.charspecial[slot] = 0;
}

export function scrRevive(state, slot) {
  if (slot < 0 || slot >= rosterSize(state)) return;
  if (typeof process !== 'undefined' && process.env?.KAIZO_PARTY_DEBUG) {
    console.error(`[party] f=${state.frame} scr_revive slot ${slot}`
      + ` hp=${state.partyHp?.[slot]} (charaction/charspecial stay ${state.charaction?.[slot]}/${state.charspecial?.[slot]})`);
  }
  if (state.charmove) state.charmove[slot] = 1;
  if (state.charcantarget) state.charcantarget[slot] = 1;
  if (state.chardead) state.chardead[slot] = 0;
}

export function scrDamageCalculation(state, damage, slot) {
  let d = damage;
  const def = statFor(state, slot).df;
  const maxhp = maxhpOfChar(state, charIdOf(state, slot));
  const a = maxhp / 5;
  const b = maxhp / 8;
  for (let i = 0; i < def; i++) {
    if (d > a) d -= 3;
    else if (d > b) d -= 2;
    else d -= 1;
  }
  return Math.max(d, 1);
}

function charWearsMantle(state, charId) {
  if (charId === CHAR_NONE) return false;
  if (state.noMantle) return false;
  return (gearOfChar(state, charId).armor ?? []).includes(SHADOW_MANTLE);
}

export function scrDamagePretarget(state, target) {
  let t = target;

  if (t < 3 && t >= 0 && hpOfChar(state, charIdOf(state, t)) <= 0) {
    const m = scrRandomtargetOld(state);
    if (m !== 3) t = m;
  }

  const pick = (fallback) => { const m = scrRandomtargetOld(state); return m === 3 ? fallback : m; };
  if (t === 4) {
    t = pick(0);
    if (hpRatioOfSlot(state, t) < scrPartyHpaverage(state) / 2) t = pick(t);
    if (hpRatioOfSlot(state, t) < scrPartyHpaverage(state) / 2) t = pick(t);
    if (t === 0 && hpRatioOfSlot(state, t) < 0.35) t = pick(t);
  }

  return t;
}

export function kaizoKnightTarget(state, target, opts = {}) {
  return scrKaizoTarget(state, scrDamagePretarget(state, target), opts);
}

export function scrPartyHpaverage(state) {
  let totalhp = 0;
  let totalmaxhp = 0;
  for (let i = 0; i < 3; i++) {
    if (i >= rosterSize(state)) continue;
    const ch = charIdOf(state, i);
    if (ch > 0) {
      totalhp += hpOfChar(state, ch);
      totalmaxhp += maxhpOfChar(state, ch);
    }
  }
  return totalhp > 0 ? Math.floor(totalhp / totalmaxhp) : 0;
}

function hpRatioOfSlot(state, slot) {
  if (slot < 0 || slot >= rosterSize(state)) return 1;
  const ch = charIdOf(state, slot);
  return hpOfChar(state, ch) / maxhpOfChar(state, ch);
}

export function scrRandomtargetOld(state) {
  let abletotarget = 1;
  let any = false;
  for (let i = 0; i < 3; i++) if (state.charcantarget?.[i]) any = true;
  if (!any) abletotarget = 0;
  const draw = () => (state.gmlRng ? gmlChoose(state.gmlRng, [0, 1, 2]) : 0);
  let mytarget = draw();
  if (abletotarget === 1) {

    let guard = 0;
    while (!state.charcantarget?.[mytarget] && guard < 64) {
      mytarget = draw();
      guard += 1;
    }
  } else {
    mytarget = 3;
  }
  return mytarget;
}

export function scrKaizoTarget(state, target, opts = {}) {
  const k = state.knight;

  const aoe = opts.aoe ?? k?.aoedamage ?? false;
  if (aoe) return target;

  const gc = globalChar(state);
  const ch0 = gc[0];
  const ch1 = gc[1];
  const ch2 = gc[2];
  const hp0 = hpOfChar(state, ch0) * (ch0 > 0 ? 1 : 0);
  const hp1 = hpOfChar(state, ch1) * (ch1 > 0 ? 1 : 0);
  const hp2 = hpOfChar(state, ch2) * (ch2 > 0 ? 1 : 0);

  let mantlechar = -1;
  if (charWearsMantle(state, ch0) && hpOfChar(state, ch0) > 0) mantlechar = 0;
  if (charWearsMantle(state, ch1) && hpOfChar(state, ch1) > 0) mantlechar = 1;
  if (charWearsMantle(state, ch2) && hpOfChar(state, ch2) > 0) mantlechar = 2;
  const mc = mantlechar;

  if ((k?.damagecounter ?? 0) >= 2) mantlechar = -1;

  let t = target;
  if (mantlechar === -1) {
    let sus = Math.max(hpOfChar(state, ch1) / maxhpOfChar(state, ch1), 0.45);
    let ral = Math.max(hpOfChar(state, ch2) / maxhpOfChar(state, ch2), 0.45);
    if (gc[1] === CHAR_NONE) sus = 0;
    if (gc[2] === CHAR_NONE) ral = 0;
    let krisrange = 2 - sus - ral;
    const hitstat = state.gmlRng ? gmlRandomRange(state.gmlRng, 0, 2) : 0;
    if (hpOfChar(state, ch0) < 0) krisrange = -1;
    if (hitstat > krisrange) {
      if (hp0 > 0) t = 0;
      if (hp1 > 0 && hp2 > 0) t = state.gmlRng ? gmlChoose(state.gmlRng, [1, 2]) : 1;
      else if (hp1 > 0) t = 1;
      else if (hp2 > 0) t = 2;
    } else {
      t = 0;
    }
    if (t !== mc) {
      if (k) k.damagecounter = 0;
    }
  } else {
    if (k) k.damagecounter = (k.damagecounter ?? 0) + 1;
    t = mantlechar;
  }
  return t;
}

export function scrPicktargetWeighted(state, w1 = 1, w2 = 1, w3 = 1, w4 = 1) {
  const reps = [w1, w2, w3, w4];
  const havechar = state.kaizo?.havechar ?? [0, 0, 0, 0];
  const charpos = state.kaizo?.charpos ?? [0, 0, 0, 0];
  const bag = [];
  let targmax = -1;
  for (let i = 0; i < 4; i++) {

    if (havechar[i] && hpOfChar(state, i + 1) > 0) {
      for (let r = 0; r < reps[i]; r++) {
        targmax += 1;
        bag.push(charpos[i]);
      }
    }
  }
  if (bag.length > 0) {

    const idx = state.gmlRng ? gmlIrandom(state.gmlRng, targmax) : 0;
    return bag[Math.min(idx, bag.length - 1)];
  }
  return 0;
}

export function gloomPrecompute(damage) {
  let gloomdmg = Math.ceil(damage / 6);
  if (gloomdmg < 10) gloomdmg = 10;
  const softened = damage > 120 ? Math.ceil(damage * 0.8) : damage;
  return { gloomdmg, damage: softened };
}

export function gloomAccrue(state, chartarget, gloomdmg, { capAt45 = true } = {}) {
  const k = state.kaizo;
  if (!k?.sideb) return;
  const hp = hpOfChar(state, chartarget);
  const practicemode = !!k.practicemode;
  let value;
  if (hp > 1 && !practicemode) {
    let g = gloomdmg;
    if (chartarget === CHAR_NOELLE && gearOfChar(state, CHAR_NOELLE).weapon === THORN_RING) g = 0;
    const minhp = hp - 1;

    const curSlot = (k.globalChar ?? []).indexOf(chartarget);
    const cur = curSlot >= 0 && k.gloom
      ? (k.gloom[curSlot] ?? 0)
      : (k.gloomByChar?.[chartarget] ?? 0);
    value = cur + g;
    value = Math.min(value, minhp);
    if (capAt45 && value > 45) value = 45;
  } else {
    value = 0;
  }

  if (k.gloomByChar) k.gloomByChar[chartarget] = value;
  const slot = (k.globalChar ?? []).indexOf(chartarget);
  if (slot >= 0) setGloom(state, slot, value);
}

function practiceHp(state, mul) {
  for (let c = 1; c <= 4; c++) {
    const m = maxhpOfChar(state, c);
    if (m > 0) setHpOfChar(state, c, m * mul);
  }
}

export function scrDamage(state, damage, target, opts = {}) {

  if (state.damageEnabled === false) return 0;

  const k = state.knight;
  const sideb = !!state.kaizo?.sideb;
  const practicemode = !!state.kaizo?.practicemode;

  let gloomdmg = 0;
  let dmg = damage;
  if (sideb) {
    const pre = gloomPrecompute(damage);
    gloomdmg = pre.gloomdmg;
    dmg = pre.damage;
  }

  if (k) k.progamer = false;

  let t = target;

  t = scrDamagePretarget(state, t);

  const truedamage = opts.truedamage ? 1 : 0;

  let chartarget = 3;
  if (k && truedamage === 0) {
    t = scrKaizoTarget(state, t, { aoe: opts.aoe });
  }

  let tdamage = dmg;
  let shadowmantlereduction = false;

  if (practicemode) practiceHp(state, 2);

  if (t < 3) {
    if (truedamage === 1) {

    } else {
      tdamage = scrDamageCalculation(state, tdamage, t);
    }
    chartarget = charIdOf(state, t);

    if (truedamage === 0) {

      for (let s = 0; s < 3; s++) {
        if (charWearsMantle(state, charIdOf(state, s)) && t === s) {
          tdamage = gmlRound(tdamage * 0.33);
          shadowmantlereduction = true;
        }
      }

      if (charIdOf(state, t) === CHAR_NOELLE) {
        tdamage = gmlRound(tdamage * 0.5);
      }
    }

    if (truedamage === 1) {

    } else {
      if (state.charaction?.[t] === ACTION_DEFEND) {
        tdamage = Math.ceil((2 * tdamage) / 3);
      }

      if (!shadowmantlereduction) {
        tdamage = Math.ceil(tdamage * (opts.elementReduction ?? 1));
      }
    }
    if (tdamage < 1) tdamage = 1;
  }

  if (!state.entities?.some((sh) => sh.alive && sh.type?.name === 'obj_shake')) {
    scrShakescreen(state);
  }

  heroHurt(state, t);

  let hpdiff = tdamage;
  let doomtype = -1;

  if (t < 3) {
    const hp = hpOfChar(state, chartarget);
    if (hp <= 0) {

      doomtype = 4;
      setHpOfChar(state, chartarget, hp - gmlRound(tdamage / 4));
      hpdiff = gmlRound(tdamage / 4);
    } else {
      setHpOfChar(state, chartarget, hp - tdamage);
      if (hpOfChar(state, chartarget) <= 0) {

        doomtype = 12;
        hpdiff = gmlRound(hpOfChar(state, chartarget) + 999);
        setHpOfChar(state, chartarget, -999);
        scrDead(state, t);
      }
    }
    const pos = partyPos(state, t);
    spawnDmgNumber(
      state, pos.x, pos.y, hpdiff,
      doomtype === -1 ? TYPE_PARTY : (doomtype === 4 ? TYPE_DEAD : TYPE_SWOON),
      2,
    );
  }

  if (sideb) gloomAccrue(state, chartarget, gloomdmg, { capAt45: true });

  if (t === 3) damageAllInline(state, tdamage, opts);

  if (practicemode) practiceHp(state, 1);

  return t < 3 ? hpdiff : 0;
}

function damageAllInline(state, startDamage, opts = {}) {
  let tdamage = startDamage;
  let shadowmantlereduction = false;
  for (let hpi = 0; hpi < 3; hpi++) {
    const chartarget = charIdOf(state, hpi);
    if (hpOfChar(state, chartarget) >= 0) {
      tdamage = scrDamageCalculation(state, tdamage, hpi);

      const literal = [1, 2, 3];
      for (let s = 0; s < 3; s++) {
        if (charWearsMantle(state, literal[s]) && hpi === s) {
          tdamage = gmlRound(tdamage * 0.33);
          shadowmantlereduction = true;
        }
      }
      if (!shadowmantlereduction) {
        tdamage = Math.ceil(tdamage * (opts.elementReduction ?? 1));
      }
      if (state.charaction?.[hpi] === ACTION_DEFEND) {
        setHpOfChar(state, chartarget,
          hpOfChar(state, chartarget) - Math.ceil((3 * tdamage) / 4));
      } else {
        setHpOfChar(state, chartarget, hpOfChar(state, chartarget) - tdamage);
      }
      if (hpOfChar(state, chartarget) <= 0) {

        setHpOfChar(state, chartarget, gmlRound(-maxhpOfChar(state, CHAR_NONE) / 2));
      }
    }
  }
}

export function scrDamageSingle(state, damage, target = 0, opts = {}) {
  if (state.damageEnabled === false) return 0;
  if (state.invTimer >= 0) return 0;
  const dealt = scrDamage(state, damage, target, opts);
  state.invTimer = state.invc * 30;

  if (dealt > 0) {
    cueStop(state, 'snd_hurt1');
    cue(state, 'snd_hurt1');
  }
  return dealt;
}

export function kaizoDamageHooks() {
  return { scrDamage, scrDamageSingle, scrDamageAll, scrDamageMaxhp };
}

export function scrDamageAll(state, damage, opts = {}) {
  if (state.damageEnabled === false) return 0;
  if (state.invTimer >= 0) return 0;
  const k = state.knight;
  if (k) k.aoedamage = true;
  let total = 0;
  for (let ti = 0; ti < 3; ti++) {
    const charId = charIdOf(state, ti);
    if (hpOfChar(state, charId) > 0 && charId !== CHAR_NONE) {
      total += scrDamage(state, damage, ti, { ...opts, aoe: true });
    }
  }
  if (k) k.aoedamage = false;
  state.invTimer = state.invc * 30;

  if (total > 0) {
    cueStop(state, 'snd_hurt1');
    cue(state, 'snd_hurt1');
  }
  return total;
}

export function scrDamageMaxhp(state, fraction, ignoreDefend = false, cannotFell = false, opts = {}) {
  if (state.invTimer >= 0) return 0;
  const k = state.knight;
  const sideb = !!state.kaizo?.sideb;
  const practicemode = !!state.kaizo?.practicemode;

  let t = opts.target ?? 0;
  let arg0 = fraction;

  const aoe = opts.aoe ?? k?.aoedamage ?? false;
  if (state.knight && !state.roaringActive && !aoe) {
    t = scrKaizoTarget(state, t, { aoe: false });

    for (let s = 0; s < 3; s++) {
      if (t === s && charWearsMantle(state, charIdOf(state, s))) {
        arg0 /= 2;
        break;
      }
    }
    if (charIdOf(state, t) === CHAR_NOELLE) arg0 *= 0.75;
  }

  const chartarget = charIdOf(state, t);
  let tdamage = Math.ceil(maxhpOfChar(state, chartarget) * arg0);
  let gloomdmg = 0;
  if (sideb) {
    gloomdmg = Math.ceil(tdamage / 4);
    tdamage = Math.ceil(tdamage * 0.8);
  }
  if (state.charaction?.[t] === ACTION_DEFEND && !ignoreDefend) {
    tdamage = Math.ceil(tdamage / 1.5);
  }
  if (cannotFell) {
    tdamage = Math.min(Math.max(tdamage, 1), hpOfChar(state, chartarget) - 1);
  }
  if (practicemode) practiceHp(state, 2);

  if (!state.entities?.some((sh) => sh.alive && sh.type?.name === 'obj_shake')) {
    scrShakescreen(state);
  }

  heroHurt(state, t);

  if (tdamage < 0) tdamage = 0;

  let hpdiff = tdamage;
  let doomtype = -1;
  const hp = hpOfChar(state, chartarget);
  if (hp <= 0) {
    doomtype = 4;
    setHpOfChar(state, chartarget, hp - gmlRound(tdamage / 4));
    hpdiff = gmlRound(tdamage / 4);
  } else {
    setHpOfChar(state, chartarget, hp - tdamage);
    if (hpOfChar(state, chartarget) <= 0) {
      doomtype = 12;
      hpdiff = gmlRound(hpOfChar(state, chartarget) + 999);
      setHpOfChar(state, chartarget, -999);
      scrDead(state, t);
    }
  }
  const pos = partyPos(state, t);
  spawnDmgNumber(
    state, pos.x, pos.y, hpdiff,
    doomtype === -1 ? TYPE_PARTY : (doomtype === 4 ? TYPE_DEAD : TYPE_SWOON),
    2,
  );

  if (sideb) gloomAccrue(state, chartarget, gloomdmg, { capAt45: false });

  if (practicemode) practiceHp(state, 1);
  state.invTimer = state.invc * 30;
  return tdamage;
}

export function scrDamageAllMaxhp(state, fraction = 1, ignoreDefend = false, cannotFell = false, opts = {}) {
  if (state.invTimer >= 0) return 0;
  const k = state.knight;
  if (k) k.aoedamage = true;
  let total = 0;
  for (let ti = 0; ti < 3; ti++) {
    const charId = charIdOf(state, ti);
    if (hpOfChar(state, charId) > 0 && charId !== CHAR_NONE) {

      state.invTimer = -1;
      total += scrDamageMaxhp(state, fraction, ignoreDefend, cannotFell, {
        ...opts, target: ti, aoe: true,
      });
    }
  }
  if (k) k.aoedamage = false;
  state.invTimer = state.invc * 30;
  return total;
}

export function partyWiped(state) {
  let gameover = 1;
  for (let i = 0; i < 3; i++) {
    const charId = charIdOf(state, i);
    if (charId !== CHAR_NONE && hpOfChar(state, charId) > 0) gameover = 0;
  }
  return gameover === 1;
}

export function scrGameover(state) {
  if (state.knight) return false;
  return partyWiped(state);
}

export function partyAliveCount(state) {
  const gc = globalChar(state);
  let n = 0;
  for (let c = 1; c <= 4; c++) {
    const present = gc[0] === c || gc[1] === c || gc[2] === c ? 1 : 0;
    n += present * (hpOfChar(state, c) > 0 ? 1 : 0);
  }
  return n;
}

export function applyKrisPartyMultiplier(damage, state) {
  const alive = partyAliveCount(state);
  if (alive <= 1) return Math.ceil(damage * 2.5);
  if (alive === 2) return Math.ceil(damage * 1.5);
  return damage;
}

export function vanillaKrisMult(state) {
  const n = rosterSize(state);
  const down = (s) => (s < n ? state.partyHp[s] < 0 : true);
  const a = down(1);
  const b = down(2);
  if (a && b) return 2;
  if (a || b) return 1;
  return 0.5;
}

export function freshParty(state) {
  return (state.kaizo?.roster ?? []).map((m) => m.maxhp);
}
