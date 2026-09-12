

import { heroAct, HERO_SPELL, HERO_ITEM } from '../../sim/heroes.js';
import { castSpell } from '../../sim/spells.js';
import { applyItem } from '../../sim/items.js';
import {
  HERO_SPELLTIMER,
  SPELLDELAY_CHAIN,
  SPELLDELAY_EMPTY,
  SPELLDELAY_DEFAULT,
  spellSpelldelay,
  itemSpelldelay,
  spellText,
  itemText,
  createBattleWriter,
  stepBattleWriter,
  charactionOf,
} from '../../sim/spellphase.js';
import { charIdOf, hpOfChar } from '../party/roster.js';

export function spellphaseHp(state, slot) {
  return hpOfChar(state, charIdOf(state, slot));
}

export function skipDownedCasters(state, char) {
  let c = char;
  for (let r = 0; r < 2; r++) {
    if (c < 3) {
      if (spellphaseHp(state, c) <= 0) c += 1;
    }
  }
  return c;
}

function enterPose(state, c, heroState, chainEntry, act) {
  const h = state.heroes?.[c];
  const attacktimer = h?.attacktimer ?? 0;
  act(state, c, heroState);
  if (h) {
    if (chainEntry) h.attacktimer = attacktimer;
    h.itemed = true;
    h.spelltimer = HERO_SPELLTIMER - 1;
    h.attacktimer += 0.5;
  }
}

function newWriter(state, sp, c) {
  const a = charactionOf(state, c);
  const pages = a === 4
    ? itemText(state, c, state.pendingItem[c].id)
    : spellText(state, c, state.pendingSpell[c].id);
  sp.writer = createBattleWriter(pages);
  state.battlemsg = pages[0];
}

function alarm0(state, sp, opts) {
  for (let xyz = 0; xyz < 3; xyz++) {
    sp.using[xyz] = 0;
    sp.gotspell[xyz] = 0;
    sp.gotitem[xyz] = 0;
    const a = charactionOf(state, xyz);
    if (a === 2 || a === 4) {
      sp.spelltotal += 1;
      sp.using[xyz] = 1;
      if (a === 2) sp.gotspell[xyz] = 1;
      else sp.gotitem[xyz] = 1;
      if (sp.castyet === 0) {
        enterPose(state, xyz, a === 2 ? HERO_SPELL : HERO_ITEM, false, opts.heroAct);
        sp.castIn[xyz] = HERO_SPELLTIMER;
        sp.castyet = 1;
        sp.char = xyz + 1;
        newWriter(state, sp, xyz);
      }
    }
  }
  sp.active = 1;
  sp.alarmFrame = state.frame;
  state.spelldelay = SPELLDELAY_CHAIN;
}

function fire(state, sp, c, opts) {
  sp.castFrames[c] = state.frame;
  const p = state.pendingSpell?.[c];
  const it = state.pendingItem?.[c];
  if (p) {
    state.spelldelay = SPELLDELAY_DEFAULT;
    opts.castSpell(state, c, p.id, p.target);
    if (state.spelldelay === SPELLDELAY_DEFAULT) {
      state.spelldelay = spellSpelldelay(p.id);
    }
  } else if (it) {
    state.spelldelay = SPELLDELAY_DEFAULT;
    opts.applyItem(state, it.id, it.target);
    state.spelldelay = itemSpelldelay(it.id);
  }
}

export function stepKaizoSpellphase(state, sp, e, opts = {}) {
  const o = {
    castSpell: opts.castSpell
      ?? ((st, c, id, target) => castSpell(st, c, id, target, { alreadyPaid: true })),
    applyItem: opts.applyItem ?? applyItem,
    heroAct: opts.heroAct ?? heroAct,
  };
  sp.kaizoSkipped ??= [];

  if (sp.alarm > 0) {
    sp.alarm -= 1;
    if (sp.alarm === 0) alarm0(state, sp, o);
  }

  let done = false;
  if (sp.active === 1) {
    sp.spelltimer += 1;
    if (sp.spelltimer >= state.spelldelay && !sp.writer) {
      if (sp.char >= 3 || sp.spelltotal === 1) {
        done = true;
      } else {

        const before = sp.char;
        sp.char = skipDownedCasters(state, sp.char);
        for (let s = before; s < sp.char; s++) sp.kaizoSkipped.push(s);

        if (sp.char < 3) {
          const c = sp.char;
          if (sp.gotitem[c] === 1) {
            sp.re_castyet = 1;
            enterPose(state, c, HERO_ITEM, true, o.heroAct);
            sp.castIn[c] = HERO_SPELLTIMER;
            sp.writer = null;
            newWriter(state, sp, c);
          }
          if (sp.gotspell[c] === 1) {
            sp.re_castyet = 1;
            enterPose(state, c, HERO_SPELL, true, o.heroAct);
            sp.castIn[c] = HERO_SPELLTIMER;
            sp.writer = null;
            newWriter(state, sp, c);
          }
          state.spelldelay = SPELLDELAY_CHAIN;
          if (sp.re_castyet === 0) state.spelldelay = SPELLDELAY_EMPTY;
          sp.char += 1;

          for (let r = 0; r < 2; r++) {
            if (sp.char < 3 && sp.using[sp.char] === 0) sp.char += 1;
          }
        } else {

          state.spelldelay = SPELLDELAY_EMPTY;
        }

        sp.spelltimer = 0;
        sp.re_castyet = 0;
      }
    }
  }
  if (done) {
    sp.doneFrame = state.frame;
    sp.writer = null;
    return true;
  }

  if (sp.writer && stepBattleWriter(state, sp.writer, e)) sp.writer = null;

  for (let c = 0; c < 3; c++) {
    if (sp.castIn[c] > 0) {
      sp.castIn[c] -= 1;
      if (sp.castIn[c] === 0) fire(state, sp, c, o);
    }
  }
  return false;
}
