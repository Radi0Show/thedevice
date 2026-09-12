




import { heroAct, HERO_SPELL, HERO_ITEM } from './heroes.js';
import { castSpell, spellInfo } from './spells.js';
import { applyItem, ITEMS } from './items.js';
import { PARTY } from './damage.js';
import { msgLines, textSoundChar } from './dialogue.js';
import { cue } from './audio.js';


export const SPELLPHASE_ALARM = 5;

export const HERO_SPELLTIMER = 16;

export const SPELLDELAY_CHAIN = 90;

export const SPELLDELAY_EMPTY = 1;

export const SPELLDELAY_DEFAULT = 10;





export function spellSpelldelay(spellId) {
  switch (spellId) {
    case 1: return 30;
    case 2: return 15;
    case 3: return 20;
    case 4: return 70;
    case 5: return 70;
    case 6: return 15;
    case 8: return 20;
    case 9: return 30;
    case 10: return 30;
    case 11: return 15;

    default: return SPELLDELAY_DEFAULT;
  }
}

export function itemSpelldelay(itemId) {
  const it = ITEMS[itemId];
  if (!it) return SPELLDELAY_DEFAULT;
  if (it.kind === 'heal' || it.kind === 'revive' || it.kind === 'hurt') {
    return it.target === 'all' ? 20 : 15;
  }
  return SPELLDELAY_DEFAULT;
}



export function charName(state, c) {
  const hook = state?.kaizo?.hooks?.charName;
  if (hook) {
    const v = hook(state, c);
    if (v !== undefined) return v;
  }
  const n = PARTY[c]?.name ?? 'Kris';
  return n.charAt(0) + n.slice(1).toLowerCase();
}



export const SPELL_TEXT = {
  1: '* ~1 cast RUDE BUSTER!',
  2: '* ~1 cast HEAL PRAYER!',
  3: '* ~1 cast PACIFY!&* But the enemy wasn\'t TIRED...',
  4: '* ~1 used RUDE BUSTER!',
  5: '* ~1 used RED BUSTER!',
  6: '* ~1 cast DUAL HEAL!',
  8: '* ~1 cast SLEEPMIST!',
  9: '* ~1 cast ICESHOCK!',
  10: '* ~1 cast SNOWGRAVE!',
  11: '* ~1 cast ULTRAHEAL!',
};


export const ITEM_TEXT = {
  1: 'DARK CANDY', 2: 'REVIVEMINT', 5: 'BROKEN CAKE', 6: 'TOPCAKE', 7: 'SPINCAKE',
  8: 'DARKBURGER', 9: 'LANCERCOOKIE', 10: 'GIGASALAD', 11: 'CLUBS SANDWICH',
  12: 'HEARTS DONUT', 13: 'CHOCO DIAMOND', 14: 'FAV SANDWICH', 15: 'ROUXLS ROUX',
};

export function spellText(state, c, spellId) {
  const hook = state?.kaizo?.hooks?.spellText;
  if (hook) {
    const v = hook(state, c, spellId);
    if (v !== undefined) return v;
  }
  const line = SPELL_TEXT[spellId] ?? `* ~1 cast ${(spellInfo(state, spellId)?.name ?? 'MAGIC').toUpperCase()}!`;
  return [line.replace('~1', charName(state, c))];
}

export function itemText(state, c, itemId) {
  const name = ITEM_TEXT[itemId] ?? (ITEMS[itemId]?.name ?? 'ITEM').toUpperCase();
  return [`* ${charName(state, c)} used the ${name}!`];
}




export function createBattleWriter(pages) {
  return { pages, pos: 1, page: 0, halted: false, pmb: 0, automash: 0 };
}



export function stepBattleWriter(state, w, e) {
  const visible = msgLines(w.pages[w.page]).join('').length;
  let b1 = false;
  let b2 = false;
  const zP = !!state.input?.confirm && !e.actConfirmHeld;
  e.actConfirmHeld = !!state.input?.confirm;
  if (zP && w.pmb <= 0) b1 = true;
  if (state.input?.focus && w.pmb <= 0) b2 = true;
  if (state.textAutoMash !== false && state.input?.button3) {
    w.pmb = 3;
    w.automash = w.automash === 0 ? 1 : 0;
    if (w.automash === 0) b1 = true;
    if (w.automash === 1) b2 = true;
  }
  let dead = false;
  if (!w.halted) {
    w.pos += 1;
    if (textSoundChar(w.pages[w.page], w.pos - 1)) cue(state, 'snd_text', 1, 1);
    if (w.pos > visible) w.halted = true;
  }
  if (b2 && !w.halted) {
    w.pos = visible + 3;
    w.halted = true;
  }
  if (b1 && w.halted) {
    if (w.page < w.pages.length - 1) {
      w.page += 1;
      w.pos = 1;
      w.halted = false;
    } else {
      dead = true;
    }
  }
  w.pmb -= 1;
  state.battlemsg = w.pages[Math.min(w.page, w.pages.length - 1)];
  return dead;
}




export function charactionOf(state, c) {
  if (state.pendingSpell?.[c]) return 2;
  if (state.pendingItem?.[c]) return 4;
  return 0;
}


export function needsSpellphase(state) {
  for (let c = 0; c < 3; c++) {
    const a = charactionOf(state, c);
    if (a === 2 || a === 4) return true;
  }
  return false;
}


export function createSpellphase(state) {
  return {
    spelltimer: 0,
    spellmax: 40,
    spelltotal: 0,
    char: 0,
    castyet: 0,
    re_castyet: 0,
    active: 0,
    alarm: SPELLPHASE_ALARM,
    using: [0, 0, 0],
    gotspell: [0, 0, 0],
    gotitem: [0, 0, 0],
    writer: null,

    castIn: [0, 0, 0],
    createdFrame: state.frame,

    alarmFrame: -1,
    castFrames: [-1, -1, -1],
    doneFrame: -1,
  };
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



export function stepSpellphase(state, sp, e, opts = {}) {
  const o = {
    castSpell: opts.castSpell
      ?? ((st, c, id, target) => castSpell(st, c, id, target, { alreadyPaid: true })),
    applyItem: opts.applyItem ?? applyItem,
    heroAct: opts.heroAct ?? heroAct,
  };


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
