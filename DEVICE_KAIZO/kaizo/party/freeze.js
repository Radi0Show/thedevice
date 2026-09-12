

import { gmlIrandomRange, gmlRandom } from '../../sim/rng.js';
import { gmlRound } from '../../sim/gml.js';
import { cue } from '../../sim/audio.js';
import { scrDead, scrRevive } from '../../sim/damage.js';
import { applyHeal } from '../../sim/items.js';

export const K_FREEZE_LENGTH = 5;

export const HEROFROZEN_NONE = -4;

export const HEROFROZEN_CLEANED = -99;

export const SG_FREEZE_DAMAGE = { lo: 75, hi: 125 };

export const FREEZE_GATED_SPELLS = new Set([2, 6, 11]);

export const FROZEN_NO_EFFECT_SUFFIX = '^1 &* It had no effect...!/%';
export const SPELLTEXT_NO_EFFECT_SPELLS = new Set([202, 231]);

export const FROZEN_SPELLDELAY = 15;

export function ensureFreezeState(state) {
  const k = (state.kaizo ??= {});
  const n = k.roster?.length ?? state.partyHp?.length ?? 3;
  if (!Array.isArray(k.freeze) || k.freeze.length !== n) {
    const prev = Array.isArray(k.freeze) ? k.freeze : [];
    k.freeze = Array.from({ length: n }, (_, i) => !!prev[i]);
  }

  if (!Array.isArray(k.herofrozen) || k.herofrozen.length !== n) {
    k.herofrozen = Array.from({ length: n }, () => HEROFROZEN_NONE);
  }
  k.frozenStatues ??= [];
  k.frozenStatueSeq ??= 0;
  return k;
}

const VANILLA_PARTY_CHARIDS = [1, 2, 3];

export function charIdOfSlot(state, slot) {
  const r = state.kaizo?.roster;
  if (!r) return VANILLA_PARTY_CHARIDS[slot] ?? 0;
  if (slot < 0 || slot >= r.length) return 0;
  return r[slot].charId ?? 0;
}

export function slotOfCharId(state, charId) {
  const r = state.kaizo?.roster;
  if (!r) {
    const i = VANILLA_PARTY_CHARIDS.indexOf(charId);
    return i;
  }
  for (let i = 0; i < r.length; i++) if (r[i].charId === charId) return i;
  return -1;
}

export function haveChar(state, charId) {
  return slotOfCharId(state, charId) >= 0;
}

export function kFreezeChar(state, charId) {
  if (charId === 0 || charId === -1 || charId == null) return 0;
  const slot = slotOfCharId(state, charId);
  if (slot < 0) return 0;
  return state.kaizo?.freeze?.[slot] ? 1 : 0;
}

export function kFreezeArray(state) {
  const out = new Array(K_FREEZE_LENGTH).fill(0);
  const r = state.kaizo?.roster ?? [];
  for (let i = 0; i < r.length; i++) {
    const c = r[i].charId ?? 0;
    if (c > 0 && c < K_FREEZE_LENGTH) out[c] = state.kaizo?.freeze?.[i] ? 1 : 0;
  }
  return out;
}

export function isFrozen(state, slot) {
  return !!state.kaizo?.freeze?.[slot];
}

export function freezeSlot(state, slot) {
  const k = ensureFreezeState(state);
  if (slot < 0 || slot >= k.freeze.length) return false;
  k.freeze[slot] = true;
  return true;
}

export function freezeChar(state, charId) {
  const slot = slotOfCharId(state, charId);
  return slot < 0 ? false : freezeSlot(state, slot);
}

export function thawSlot(state, slot) {
  const k = ensureFreezeState(state);
  if (slot < 0 || slot >= k.freeze.length) return false;
  k.freeze[slot] = false;
  return true;
}

export function stepSnowgraveFreeze(state, { target } = {}) {
  const k = ensureFreezeState(state);
  const rng = state.gmlRng;
  let draws = 0;

  let frdmg = gmlIrandomRange(rng, SG_FREEZE_DAMAGE.lo, SG_FREEZE_DAMAGE.hi);
  draws += 2;

  const char = charIdOfSlot(state, target);

  if ((state.frame % 2) === 0 && char !== 4) {

    const pitch = 0.85 + gmlRandom(rng, 0.2);
    draws += 1;
    cue(state, 'snd_damage', pitch, 0.75);
  }

  scrDead(state, target);

  if (char === 4) {
    frdmg = gmlRound(frdmg / 16);
    frdmg = Math.min(state.partyHp[target] - 1, frdmg);
  }

  state.partyHp[target] -= frdmg;
  k.sgdmg = (k.sgdmg ?? 0) + frdmg;

  if (Array.isArray(k.gloom)) {
    k.gloom[target] = Math.min(state.partyHp[target] - 1, k.gloom[target] ?? 0);
  }

  let frozen = false;
  let revived = false;
  if (state.partyHp[target] <= 0) {
    freezeSlot(state, target);
    scrDead(state, target);
    frozen = true;
  } else if (state.chardead?.[target] === 1) {
    scrRevive(state, target);
    revived = true;
  }
  return { damage: frdmg, frozen, revived, draws };
}

function mergeColor(c1, c2, amt) {
  const ch = (c, i) => (c >> (i * 8)) & 255;
  let out = 0;
  for (let i = 0; i < 3; i++) {
    const v = Math.trunc(ch(c1, i) + (ch(c2, i) - ch(c1, i)) * amt);
    out |= (v & 255) << (i * 8);
  }
  return out >>> 0;
}
const C_NAVY = 8388608;
const C_WHITE = 16777215;
export const FROZENNPC_SPECIALCOLOR = mergeColor(C_NAVY, C_WHITE, 0.8);

function newFrozenNpc(id) {
  return {
    id,
    sprite: null,
    imageAlpha: 0,
    imageSpeed: 0,
    imageIndex: 0,
    imageXscale: 2,
    imageYscale: 2,
    timer: 0,
    con: 0,
    mysolid: 0,
    init: 0,
    h: 0,
    w: 0,
    returntoxy: 0,
    movetimer: 0,
    kiratimer: 0,
    skipsound: 0,
    skipsolid: 0,
    skipread: 0,
    depth: 0,
    specialinit: 0,
    specialcolor: FROZENNPC_SPECIALCOLOR,
    fresh: 0,
    inbattle: 0,
    x: 0,
    y: 0,
    alive: true,
  };
}

export function statueIsReadable(statue) {
  return statue?.skipread === 0;
}

export function stepFrozenDraw(state) {
  const k = ensureFreezeState(state);
  const roster = k.roster ?? [];
  const suppressed = [];
  for (let slot = 0; slot < k.freeze.length; slot++) {
    if (!k.freeze[slot]) continue;
    suppressed.push(slot);

    if (k.herofrozen[slot] !== HEROFROZEN_NONE) continue;

    const hero = roster[slot] ?? {};
    const st = newFrozenNpc(++k.frozenStatueSeq);
    st.x = hero.pos?.x ?? 0;
    st.y = hero.pos?.y ?? 0;
    st.sprite = hero.sprites?.hurt ?? null;
    if ((hero.charId ?? 0) === 1) st.sprite = 'spr_krisb_frozen';
    st.depth = hero.depth ?? 0;
    st.inbattle = 1;
    st.imageIndex = 0;

    st.imageXscale = hero.scale ?? 2;
    st.imageYscale = hero.scale ?? 2;
    st.slot = slot;
    st.charId = hero.charId ?? 0;
    k.frozenStatues.push(st);
    k.herofrozen[slot] = st.id;
  }
  return suppressed;
}

export function heroDrawSuppressed(state, slot) {
  return isFrozen(state, slot);
}

export function statueForSlot(state, slot) {
  const id = state.kaizo?.herofrozen?.[slot];
  if (id === undefined || id === HEROFROZEN_NONE || id === HEROFROZEN_CLEANED) return null;
  return state.kaizo.frozenStatues.find((s) => s.id === id && s.alive) ?? null;
}

export function heroCleanUp(state, slot) {
  const k = ensureFreezeState(state);

  const thawed = k.freeze[slot] === true;
  thawSlot(state, slot);

  let leaked = null;
  if (k.herofrozen[slot] > HEROFROZEN_NONE) {
    const doomed = statueForSlot(state, slot);
    k.herofrozen[slot] = HEROFROZEN_CLEANED;

    destroyStatueById(state, HEROFROZEN_CLEANED);
    leaked = doomed;
  }
  return { thawed, leaked };
}

function destroyStatueById(state, id) {
  const list = state.kaizo?.frozenStatues ?? [];
  const st = list.find((s) => s.id === id && s.alive);
  if (!st) return false;
  st.alive = false;
  return true;
}

export function clearAllFreeze(state) {
  const k = ensureFreezeState(state);
  for (let i = 0; i < k.freeze.length; i++) k.freeze[i] = false;
  let destroyed = 0;
  for (const st of k.frozenStatues) if (st.alive) { st.alive = false; destroyed += 1; }
  return destroyed;
}

const defaultHealFn = (state, slot, amount) => applyHeal(state, slot, amount, 0);

export function scrHealall(state, amount, healFn = defaultHealFn) {
  ensureFreezeState(state);
  const healed = [];
  const skipped = [];
  for (let i = 0; i < 3; i++) {
    const ch = charIdOfSlot(state, i);
    if (kFreezeChar(state, ch)) { skipped.push(i); continue; }
    if (ch !== 0) { healFn(state, i, amount); healed.push(i); }
  }
  return { healed, skipped };
}

export function scrHealallitemspell(state, amount, healFn = defaultHealFn, healRibbons = 0) {
  const healAmount = amount + Math.ceil(amount / 8) * healRibbons;
  const { healed, skipped } = scrHealall(state, healAmount, healFn);
  const anims = [];
  for (let i = 0; i < 3; i++) {
    const ch = charIdOfSlot(state, i);
    if (kFreezeChar(state, ch)) continue;

    if (ch !== 0) anims.push(i);
  }
  return { healed, skipped, anims, spelldelay: 20 };
}

export function scrHealitemspell(state, target, amount, healFn = defaultHealFn, healRibbons = 0) {
  ensureFreezeState(state);
  const ch = charIdOfSlot(state, target);

  if (kFreezeChar(state, ch)) {
    if (state.kaizo) state.kaizo.spelldelay = FROZEN_SPELLDELAY;
    return false;
  }
  const healAmount = amount + Math.ceil(amount / 8) * healRibbons;
  const healed = healFn(state, target, healAmount);
  if (state.kaizo) state.kaizo.spelldelay = FROZEN_SPELLDELAY;
  return { healed, target, spelldelay: FROZEN_SPELLDELAY };
}

export function scrSpellFreezeGate(state, spellId, casterSlot, targetSlot) {
  ensureFreezeState(state);
  const star = targetSlot;
  const ctar = star < 3 ? charIdOfSlot(state, star) : -1;
  const kDidspell = spellId > 1 && spellId <= 100;
  const frozenTarget = !!kFreezeChar(state, ctar);

  if (spellId === 2 || spellId === 11) {
    return frozenTarget
      ? { kDidspell, blocked: true, spelldelay: FROZEN_SPELLDELAY, targets: null }
      : { kDidspell, blocked: false, spelldelay: FROZEN_SPELLDELAY, targets: null };
  }
  if (spellId === 6) {
    const targets = [];
    for (let i = 0; i < 3; i++) {
      if (frozenTarget) continue;
      if (charIdOfSlot(state, i) !== 0) targets.push(i);
    }
    return { kDidspell, blocked: targets.length === 0, spelldelay: 15, targets };
  }
  return { kDidspell, blocked: false, spelldelay: null, targets: null };
}

export function spellTextFrozenSuffix(state, spellId, targetSlot, baseMsg) {
  if (!SPELLTEXT_NO_EFFECT_SPELLS.has(spellId)) return baseMsg;
  const ctar = targetSlot < 3 ? charIdOfSlot(state, targetSlot) : -1;
  if (kFreezeChar(state, ctar) !== 1) return baseMsg;
  return baseMsg.split('/%').join('') + FROZEN_NO_EFFECT_SUFFIX;
}

export function kaizoFunchance(state, n = 1) {

  const roll = gmlIrandomRange(state.gmlRng, 1, n);
  return roll <= 1 || !!state.kaizo?.funni;
}

const DOWN_LATCH_KEYS = { 1: 'kris', 2: 'susie', 3: 'ralsei', 4: 'noelle' };

export function downMessages(state) {
  const k = ensureFreezeState(state);
  const latch = (k.downLatch ??= { kris: false, susie: false, ralsei: false, noelle: false });
  const sideb = !!k.sideb;
  let draws = 0;

  const hpOfChar = (charId) => {
    const slot = slotOfCharId(state, charId);
    return slot < 0 ? null : state.partyHp[slot];
  };
  const down = (charId) => haveChar(state, charId)
    && !latch[DOWN_LATCH_KEYS[charId]]
    && hpOfChar(charId) < 1;

  let krisdown = '';
  let susiedown = '';
  let ralseidown = '';
  let noelledown = '';
  let downcount = 0;
  let battlemsg = null;

  if (down(1)) {
    krisdown = '* Kris collapsed in silence.&';
    if (sideb) krisdown = "* Can't move your body.&";
    if (kFreezeChar(state, 1)) krisdown = '* Kris was frozen solid.&';
    if (kaizoFunchance(state, 100)) krisdown = '* Kris is now dead.&';
    draws += 2;
    downcount += 1;
    latch.kris = true;
    battlemsg = krisdown;
  }
  if (down(2)) {
    susiedown = "* Susie's demise was expected.&";
    if (kFreezeChar(state, 2)) susiedown = '* Susie succumbed to the cold.&';
    downcount += 1;
    latch.susie = true;
    battlemsg = susiedown;
  }
  if (down(3)) {
    ralseidown = "* Ralsei's hope was shattered.&";
    if (kFreezeChar(state, 3)) ralseidown = '* Ralsei was encased in ice.&';
    downcount += 1;
    latch.ralsei = true;
    battlemsg = ralseidown;
  }
  if (down(4)) {
    noelledown = "* Noelle's breath goes cold.&";
    if (sideb) noelledown = '* She was used up.&';

    downcount += 1;
    latch.noelle = true;
    battlemsg = noelledown;
  }
  if (downcount === 2) {
    battlemsg = krisdown + susiedown + ralseidown + noelledown;
  }
  return {
    battlemsg,
    downcount,
    lines: { krisdown, susiedown, ralseidown, noelledown },
    draws,
  };
}

export function balloonTurnAdvances(state) {
  const slot = slotOfCharId(state, 2);
  const hp = slot < 0 ? 0 : state.partyHp[slot];
  return hp > 0 || !!kFreezeChar(state, 2);
}

export function balloonSuppressed(state) {
  return !!kFreezeChar(state, 2);
}

export const SUSIE_GAMESTART_HP = 190;

export function kaizoAdvanceBalloon(dlg, state, engineAdvance = null) {
  const k = state.kaizo ?? {};
  const practicemode = !!k.practicemode;
  const sideb = !!k.sideb;
  const susiePresent = !!haveChar(state, 2);
  if (!(practicemode || sideb || !susiePresent)) {

    return engineAdvance ? engineAdvance(dlg, state) : null;
  }
  dlg.balloonturn = -1;
  const slot = slotOfCharId(state, 2);
  const hp2 = slot < 0 ? SUSIE_GAMESTART_HP : state.partyHp[slot];
  if (hp2 > 0 || kFreezeChar(state, 2)) {
    dlg.balloonturn += 1;

  }
  dlg.ballooncon = 0;
  dlg.text = null;
  dlg.speaker = null;
  return null;
}
