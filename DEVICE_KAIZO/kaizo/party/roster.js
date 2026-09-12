

import { HERO_SPRITES } from '../../sim/heroes.js';
import { PARTY as SIM_PARTY } from '../../sim/damage.js';
import { statsOf } from '../../sim/equipment.js';

import { installKaizoHeals } from './items.js';
import {
  NOELLE_CHAR_ID, noelleSpec, kaizoActsForRoster, KRIS_FELL_SPRITE,
  KRIS_FROZEN_SPRITE,
} from './noelle.js';

export const CHAR_NONE = 0;
export const CHAR_KRIS = 1;
export const CHAR_SUSIE = 2;
export const CHAR_RALSEI = 3;
export const CHAR_NOELLE = NOELLE_CHAR_ID;

export const SLOT_POS = [
  { x: 126, y: 104 },
  { x: 80, y: 142 },
  { x: 58, y: 190 },
];

export function slotDepth(slot) {
  return 200 - slot * 20;
}

const WRITER_Y_OFFSET = -24;

export const GAMESTART_CH3_GEAR = {
  [CHAR_KRIS]: { weapon: 16, armor: [1, 10] },
  [CHAR_SUSIE]: { weapon: 17, armor: [1, 10] },
  [CHAR_RALSEI]: { weapon: 18, armor: [1, 10] },
};

function vanillaSpec(charId, { sideb = false } = {}) {
  const p = SIM_PARTY[charId - 1];
  const spec = { ...HERO_SPRITES[charId - 1] };
  const gear = GAMESTART_CH3_GEAR[charId];
  let swoon = spec.defeat;
  let frozen = spec.hurt;

  if (charId === CHAR_KRIS) {

    swoon = KRIS_FELL_SPRITE;

    frozen = KRIS_FROZEN_SPRITE;
  }

  if (charId === CHAR_SUSIE && sideb) {

    spec.normal = 'spr_susier_dark_unhappy';
    spec.idle = 'spr_susieb_idle_serious';
    spec.defend = 'spr_susieb_defend_unhappy';
    spec.actready = 'spr_susieb_actready';
    spec.attack = 'spr_susieb_attack_serious';
    spec.item = 'spr_susieb_item_unhappy';
    spec.itemready = 'spr_susieb_itemready_unhappy';
    spec.spellready = 'spr_susieb_spellready_unhappy';
    spec.spell = 'spr_susieb_spell_unhappy';
    spec.defeat = 'spr_susie_dw_fell';

    swoon = 'spr_susie_dw_fell';
    frozen = spec.hurt;
  }

  return {
    charId,
    name: p.name,
    maxhp: p.maxhp,
    at: p.at,
    magic: p.magic,
    df: p.df,
    gear: { ...gear, armor: [...(gear.armor ?? [])] },
    spells: null,

    body: { ...BODY_BY_CHAR[charId] },
    spec,
    swoon,
    frozen,
  };
}

const BODY_BY_CHAR = {
  [CHAR_KRIS]: { mywidth: 68, myheight: 74 },
  [CHAR_SUSIE]: { mywidth: 70, myheight: 82 },
  [CHAR_RALSEI]: { mywidth: 52, myheight: 86 },
};

export function characterSpec(charId, opts = {}) {
  let c = null;
  if (charId === CHAR_NOELLE) c = noelleSpec(opts);
  else if (charId === CHAR_KRIS || charId === CHAR_SUSIE || charId === CHAR_RALSEI) {
    c = vanillaSpec(charId, opts);
  }
  if (!c) return null;

  c.spec.defeat = c.swoon;
  return c;
}

export function scrFixparty(charIds) {
  const seen = [false, false, false, false, false];
  for (let i = 0; i < 3; i++) {
    const c = charIds[i];
    if (c === CHAR_KRIS) seen[1] = true;
    if (c === CHAR_SUSIE) seen[2] = true;
    if (c === CHAR_RALSEI) seen[3] = true;
    if (c === CHAR_NOELLE) seen[4] = true;
  }
  const out = [0, 0, 0];
  let ind = 0;
  for (const id of [CHAR_KRIS, CHAR_SUSIE, CHAR_RALSEI, CHAR_NOELLE]) {
    if (seen[id]) {
      out[ind] = id;
      ind += 1;
    }
  }
  return out;
}

export function havecharTable(globalChar) {
  const havechar = [0, 0, 0, 0];
  const charpos = [0, 0, 0, 0];
  let chartotal = 0;
  for (let i = 0; i < 3; i++) {
    const c = globalChar[i];
    if (c !== 0) {
      chartotal += 1;
      if (c === CHAR_KRIS) { havechar[0] = 1; charpos[0] = i; }
      if (c === CHAR_SUSIE) { havechar[1] = 1; charpos[1] = i; }
      if (c === CHAR_RALSEI) { havechar[2] = 1; charpos[2] = i; }
      if (c === CHAR_NOELLE) { havechar[3] = 1; charpos[3] = i; }
    }
  }
  return { havechar, charpos, chartotal };
}

export function charboxChunks(chartotal) {
  if (chartotal === 2) return [108, 322];
  if (chartotal === 1) return [213];
  return [0, 213, 426];
}

export function havechar(state, charId) {
  const gc = globalChar(state);
  return gc[0] === charId || gc[1] === charId || gc[2] === charId ? 1 : 0;
}

export const WEIRD_ROUTE_PARTY = [CHAR_KRIS, CHAR_NOELLE];

export const NORMAL_ROUTE_PARTY = [CHAR_KRIS, CHAR_SUSIE, CHAR_RALSEI];

export function buildRoster(charIds = WEIRD_ROUTE_PARTY, { sideb = false } = {}) {
  const gc = scrFixparty(charIds);
  const acts = kaizoActsForRoster(gc);
  const roster = [];
  for (let slot = 0; slot < 3; slot++) {
    const charId = gc[slot];
    if (charId === CHAR_NONE) continue;
    const c = characterSpec(charId, { sideb });
    roster.push({
      charId,
      slot,
      name: c.name,
      maxhp: c.maxhp,
      at: c.at,
      magic: c.magic,
      df: c.df,
      pos: { ...SLOT_POS[slot] },
      depth: slotDepth(slot),
      sprites: {
        idle: c.spec.idle,
        attack: c.spec.attack,
        hurt: c.spec.hurt,
        swoon: c.swoon,
        frozen: c.frozen,
      },
      spec: c.spec,
      gear: c.gear,
      spells: c.spells,
      body: c.body,
      acts: acts[roster.length] ?? [],
    });
  }
  return roster;
}

export function globalChar(state) {
  if (state.kaizo?.globalChar) return state.kaizo.globalChar;

  return [CHAR_KRIS, CHAR_SUSIE, CHAR_RALSEI];
}

export function rosterSize(state) {
  return state.kaizo?.roster?.length ?? 3;
}

export function charIdOf(state, slot) {
  return globalChar(state)[slot] ?? CHAR_NONE;
}

export function slotOf(state, charId) {
  const gc = globalChar(state);
  for (let i = 0; i < 3; i++) if (gc[i] === charId) return i;
  return -1;
}

export function memberAt(state, slot) {
  return state.kaizo?.roster?.[slot] ?? null;
}

export function memberOf(state, charId) {
  const s = slotOf(state, charId);
  return s < 0 ? null : memberAt(state, s);
}

export function hpOfChar(state, charId) {
  if (charId === CHAR_NONE) return state.kaizo?.hpPhantom ?? 0;
  const slot = slotOf(state, charId);
  return slot < 0 ? 0 : state.partyHp[slot];
}

export function setHpOfChar(state, charId, value) {
  if (charId === CHAR_NONE) {
    if (state.kaizo) state.kaizo.hpPhantom = value;
    return;
  }
  const slot = slotOf(state, charId);
  if (slot >= 0) state.partyHp[slot] = value;
}

export function maxhpOfChar(state, charId) {
  const m = memberOf(state, charId);
  return m ? m.maxhp : 0;
}

export function gearOfChar(state, charId) {
  const override = state.kaizo?.gear?.[charId];
  if (override) return override;
  const m = memberOf(state, charId);
  return m?.gear ?? { weapon: 0, armor: [] };
}

export function gearOfSlot(state, slot) {
  return gearOfChar(state, charIdOf(state, slot));
}

export function statFor(state, slot) {
  const m = memberAt(state, slot);
  if (!m) return { at: 0, df: 0, magic: 0, mantle: false, healRibbons: 0, rudeBusterCost: 125, equipped: [] };
  return statsOf(
    { name: m.name, maxhp: m.maxhp, at: m.at, magic: m.magic, df: m.df },
    gearOfSlot(state, slot),
  );
}

export function isUp(state, slot) {
  if (slot < 0 || slot >= rosterSize(state)) return false;
  if (state.chardead) return !state.chardead[slot];
  return state.partyHp[slot] > 0;
}

export function writerAnchor(state, slot) {
  const m = memberAt(state, slot);
  if (!m) return { x: 0, y: 0 };
  return { x: m.pos.x, y: m.pos.y + m.body.myheight + WRITER_Y_OFFSET };
}

export function freshParty(roster) {
  return roster.map((m) => m.maxhp);
}

export function installRoster(state, {
  charIds = WEIRD_ROUTE_PARTY,
  sideb = false,
  gear = null,
} = {}) {
  const globalCharArr = scrFixparty(charIds);
  const roster = buildRoster(charIds, { sideb });
  const n = roster.length;

  state.kaizo = state.kaizo ?? {};
  state.kaizo.sideb = sideb;
  state.kaizo.globalChar = globalCharArr;
  state.kaizo.roster = roster;
  state.kaizo.acts = roster.map((m) => m.acts);
  const table = havecharTable(globalCharArr);
  state.kaizo.havechar = table.havechar;
  state.kaizo.charpos = table.charpos;
  state.kaizo.chartotal = table.chartotal;

  state.partyChunks = charboxChunks(table.chartotal);
  if (gear) state.kaizo.gear = gear;

  state.kaizo.hpPhantom = 0;

  state.partyHp = freshParty(roster);
  state.charaction = new Array(n).fill(0);
  state.chardead = new Array(n).fill(0);
  state.charmove = new Array(n).fill(1);
  state.charcantarget = new Array(n).fill(1);
  state.charspecial = new Array(n).fill(0);

  state.kaizo.freeze = new Array(n).fill(false);
  state.kaizo.gloom = new Array(n).fill(0);
  state.kaizo.freezeByChar = [0, 0, 0, 0, 0];
  state.kaizo.gloomByChar = [0, 0, 0, 0, 0];

  if (state.knight) {

    state.knight.damagecounter = state.knight.damagecounter ?? 0;
    state.knight.aoedamage = false;
  }

  installKaizoHeals(state);
  return state;
}

export function setGloom(state, slot, value) {
  const k = state.kaizo;
  if (!k) return;
  if (k.gloom) k.gloom[slot] = value;
  const charId = charIdOf(state, slot);
  if (k.gloomByChar) k.gloomByChar[charId] = value;
}

export function setFreeze(state, slot, value) {
  const k = state.kaizo;
  if (!k) return;
  if (k.freeze) k.freeze[slot] = !!value;
  const charId = charIdOf(state, slot);
  if (k.freezeByChar) k.freezeByChar[charId] = value ? 1 : 0;
}

export function isFrozen(state, slot) {
  return !!state.kaizo?.freeze?.[slot];
}

export function knightGameOverRestore(con, { route = 'kaizo' } = {}) {
  return {
    arm: con === 55 ? 'moveOn' : 'retry',

    getchar: route === 'vanilla' ? [CHAR_SUSIE, CHAR_RALSEI] : [],
  };
}

export { kaizoActsForRoster };
