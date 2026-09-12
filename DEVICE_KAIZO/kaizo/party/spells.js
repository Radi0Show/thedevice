

import { spawn, destroy } from '../../sim/entity.js';
import { gmlRandom } from '../../sim/rng.js';
import { gmlRound, clamp } from '../../sim/gml.js';
import { cue } from '../../sim/audio.js';
import { damageKnight, KNIGHT_DF } from '../../sim/knight.js';
import { spawnDmgNumber, spawnSelfHealNumber, resetDmgStack } from '../../sim/dmgnumbers.js';
import { MAX_TENSION } from '../../sim/tension.js';
import { ACT_PAGES } from '../../sim/dialogue.js';
import { holdBreath } from '../../sim/spells.js';
import {
  charIdOf, gearOfChar, statFor, memberOf, hpOfChar, setHpOfChar, maxhpOfChar,
  havechar, CHAR_KRIS, CHAR_SUSIE, CHAR_RALSEI, CHAR_NOELLE,
} from './roster.js';
import { THORN_RING, NOELLE_SPELL_SNOWGRAVE } from './noelle.js';
import { scrSpellFreezeGate } from './freeze.js';
import { scrRevive } from './damage.js';
import { castSnowgrave, armSgsceneIfSpell } from './scenes.js';
import { kaizoMonsterXY } from '../actors/kaizo-knight-actor.js';

export const SPELLS_BY_CHAR = {
  1: [7],
  2: [4, 11],
  3: [3, 2],
  4: [2, 8, 9],
};

export function kaizoSpellList(state, slot) {
  const charId = charIdOf(state, slot);
  if (!charId) return [];
  const override = state.kaizo?.spells?.[charId];
  if (override) return override;
  const m = memberOf(state, charId);
  return m?.spells ?? SPELLS_BY_CHAR[charId] ?? [];
}

export const KAIZO_SPELL_INFO = {
  8: { name: 'SleepMist', descb: 'Spare#TIRED foes', cost: 80, target: 0 },
  9: { name: 'IceShock', descb: 'Damage#w/ ICE', cost: 40, target: 2 },
  10: { name: 'SnowGrave', descb: 'Fatal', cost: MAX_TENSION * 2, target: 0 },
};

export function noelleWearsThornRing(state) {
  return gearOfChar(state, CHAR_NOELLE).weapon === THORN_RING;
}

export function kaizoSpellCost(state, slot, spellId) {
  if (spellId === 9) {
    let cost = 40;
    if (noelleWearsThornRing(state)) cost *= 0.5;
    return cost;
  }
  if (spellId === NOELLE_SPELL_SNOWGRAVE) {
    let cost = MAX_TENSION * 2;
    if (noelleWearsThornRing(state)) cost *= 0.5;
    return cost;
  }
  return undefined;
}

export function scrSpellconsumebTp(cost, maxtension = MAX_TENSION) {
  return Math.floor(Math.floor((cost / maxtension) * 100) * 2.5);
}

export function scrHeal(state, slot, amount) {
  const charId = charIdOf(state, slot);
  const curhp = hpOfChar(state, charId);
  const maxhp = maxhpOfChar(state, charId);
  const belowzero = curhp <= 0;
  const abovemaxhp = curhp > maxhp;
  let hp = curhp;
  if (!abovemaxhp) {
    hp += amount;
    if (hp > maxhp) hp = maxhp;
  }
  if (belowzero && hp >= 0) {
    const floor6 = Math.ceil(maxhp / 6);
    if (hp < floor6) hp = floor6;
    setHpOfChar(state, charId, hp);
    scrRevive(state, slot);
  } else {
    setHpOfChar(state, charId, hp);
  }
  cue(state, 'snd_power');
  return hp - curhp;
}

const healAmountModifyByEquipment = (amount, ribbons) =>
  amount + Math.ceil(amount / 8) * ribbons;

export function kaizoScrDamageEnemy(state, damage, casterSlot) {
  const charId = charIdOf(state, casterSlot);
  const type = charId === CHAR_NOELLE ? 6 : charId - 1;

  const { x, y } = kaizoMonsterXY(state);

  spawnDmgNumber(state, x, y, damage, type);
  if (damage > 0) {
    damageKnight(state, damage);
    state.knight.stronghurtanim = damage >= 10000;
  }
  return damage;
}

export function kaizoCastSpell(state, slot, spellId, target = 0) {
  const k = state.kaizo;
  k.spelldelay = 10;
  if (spellId > 1 && spellId <= 100) k.didspell = 1;
  switch (spellId) {
    case 2: return castHealPrayer(state, slot, target);
    case 8: return castSleepMist(state, slot);
    case 9: return castIceShock(state, slot);
    case NOELLE_SPELL_SNOWGRAVE: return castSnowGraveSpell(state, slot);
    default: return undefined;
  }
}

function castHealPrayer(state, slot, target) {
  const k = state.kaizo;
  const gate = scrSpellFreezeGate(state, 2, slot, target);
  if (gate.blocked) {
    k.spelldelay = gate.spelldelay;
    return null;
  }
  const st = statFor(state, slot);
  const healnum = healAmountModifyByEquipment(st.magic * (5 + 0), st.healRibbons);
  scrHeal(state, target, healnum);

  const charId = charIdOf(state, target);
  if (charId) {
    const maxed = hpOfChar(state, charId) >= maxhpOfChar(state, charId);
    spawnSelfHealNumber(state, target, healnum, maxed);
  }
  k.spelldelay = 15;
  return null;
}

export const spellMist = {
  name: 'obj_spell_mist',
  create(e, state) {
    e.visible = true;
    e.siner = 0;
    e.amp = 0;
    e.image_xscale = 3;
    e.image_yscale = 2;
    e.stimer = 0;
    e.initdelay ??= 0;
    e.myself ??= -1;
    e.success = 0;

    if (e.myself >= 0 && (state.monsterstatus?.[e.myself] ?? 0) === 1) e.success = 1;
  },

  endStep(e, state) {
    if (e.initdelay === 0) {
      cue(state, 'snd_ghostappear');
      if (e.success === 1) cue(state, 'snd_spell_pacify');
    }
    e.initdelay -= 1;
    if (e.initdelay <= 0) {
      e.siner += 1;
      e.image_alpha = (Math.sin(e.siner / 9) - 0.3) + (e.success * 0.3);
      e.amp = Math.sin(e.siner / 9) * 30;
      e.stimer += 1;
      if (e.stimer >= 3 && e.siner <= 24) e.stimer = 0;
      if (e.siner >= 40) destroy(e, state);
    }
  },
};

function castSleepMist(state, slot) {
  const k = state.kaizo;
  const knight = state.entities.find((en) => en.alive && en.type.name === 'obj_knight_enemy');
  let mistcount = 0;
  if (knight && (state.knight?.hp ?? 1) > 0) {
    spawn(state, spellMist, {
      x: knight.x, y: knight.y, target: knight, myself: 0, initdelay: mistcount * 10,
    });
    mistcount += 1;
  }
  k.spelldelay = 20 + mistcount * 10;
  void slot;
  return null;
}

export const icespell = {
  name: 'obj_icespell',
  create(e) {
    e.visible = true;
    e.timer = 0;
    e.star ??= 0;
    e.damage ??= 0;
    e.caster ??= 0;
    e.hexes = [];
  },
  endStep(e, state) {
    e.timer += 1;
    const t = e.timer;
    const kn = state.knight;
    if (t === 1) {
      cue(state, 'snd_icespell');
      e.hexes.push({ x: e.x - 25, y: e.y - 20 });
    }
    if (t === 4) {
      if (kn && (state.kaizo?.vars?.kaizo_block ?? false)
        && noelleWearsThornRing(state) && !kn.haveusedroaring) {
        kn.blockanim = 0.5;
      }
      e.hexes.push({ x: e.x + 25, y: e.y - 20 });
    }
    if (t === 7) e.hexes.push({ x: e.x, y: e.y + 20 });
    if (t === 11) e.hexes = [];
    if (t === 15 && !state.gameOver) {
      resetDmgStack(state);
      let damage = e.damage;
      if (kn && (state.kaizo?.vars?.kaizo_block ?? false)) {
        damage = Math.ceil(damage / icespellDivisor(state));
        if (kn.blockanim === 0.5) kn.blockanim = 1;
      }
      e.dealt = kaizoScrDamageEnemy(state, damage, e.caster);
    }
    if (t === 60) destroy(e, state);
  },
};

export function icespellDivisor(state) {
  const dr = state.knight?.damagereduction ?? 0;
  let div;
  if (noelleWearsThornRing(state)) div = 7 - dr * 9.5;
  else if (havechar(state, CHAR_SUSIE) && hpOfChar(state, CHAR_SUSIE) > 0) div = 6 - dr * 7.5;
  else div = 4.5 - dr * 7.5;
  if (div < 1) div = 1;
  return div;
}

function castIceShock(state, slot) {
  const k = state.kaizo;
  k.spelldelay = 30;
  const knight = state.entities.find((en) => en.alive && en.type.name === 'obj_knight_enemy');
  if (!knight) return null;
  k.flag925 = (k.flag925 ?? 0) + 1;
  const minbattlemag = clamp(statFor(state, slot).magic - 10, 1, 999);
  k.spelldelay = 40;
  const damage = Math.ceil(minbattlemag * 30 + 90 + gmlRandom(state.gmlRng, 10));
  spawn(state, icespell, { x: knight.x, y: knight.y, damage, star: 0, caster: slot, target: knight });
  return null;
}

function castSnowGraveSpell(state, slot) {
  const k = state.kaizo;
  k.spelldelay = 30;
  const knight = state.entities.find((en) => en.alive && en.type.name === 'obj_knight_enemy');
  if (!knight) return null;
  castSnowgrave(state, { caster: slot, magic: statFor(state, slot).magic });
  armSgsceneIfSpell(state);
  return null;
}

export const XSLASH_ACT_INDEX = 2;
export const XSLASH_ACT = { name: 'X-Slash', descb: 'Physical#damage', actor: 11, cost: 62.5 };

export function xslashCanpress(state) {
  const hc = state.kaizo?.havechar ?? [0, 0, 0, 0];
  if (hc[1] === 1 && hpOfChar(state, CHAR_SUSIE) > 0) return false;
  if (hc[2] === 1 && hpOfChar(state, CHAR_RALSEI) > 0) return false;
  if (hc[3] === 1 && hpOfChar(state, CHAR_NOELLE) > 0) return false;
  return true;
}

export function xslashRow(state) {
  return {
    ...XSLASH_ACT,
    usable: xslashCanpress(state) && state.tension >= XSLASH_ACT.cost,
  };
}

export function kaizoActList(state, slot) {
  const charId = charIdOf(state, slot);
  if (!charId) return [];
  const rows = (state.kaizo?.acts?.[slot] ?? []).map((a) => ({ ...a }));
  if (charId === CHAR_KRIS && state.kaizo?.sideb) {
    while (rows.length < XSLASH_ACT_INDEX) rows.push({ name: '', descb: '', usable: false });
    rows[XSLASH_ACT_INDEX] = xslashRow(state);
  }
  return rows;
}

export const C_GRAY = 8421504;
export const C_WHITE_NEG = -1;

export function xslashGridHeads(state) {
  const hc = state.kaizo?.havechar ?? [0, 0, 0, 0];
  const partners = [
    [CHAR_SUSIE, 'spr_headsusie'],
    [CHAR_RALSEI, 'spr_headralsei'],
    [CHAR_NOELLE, 'spr_headnoelle'],
  ];
  let krsblend = C_WHITE_NEG;
  let cant = false;
  const heads = [];
  let xoff = 0;
  for (const [charId, sprite] of partners) {
    const present = hc[charId - 1] === 1;
    const alive = hpOfChar(state, charId) > 0;
    if (present && alive) { krsblend = C_GRAY; cant = true; }
    if (present) {
      const blend = alive ? C_GRAY : C_WHITE_NEG;
      heads.push({
        charId, sprite, x: 28 + xoff, y: 380, blend,
        crosses: [{ glyph: 'tenna_x', x: 44 + xoff, y: 391, scale: 0.7, angle: 6, blend },
          { glyph: 'tenna_x', x: 44 + xoff, y: 391, scale: 0.7, angle: 4, blend }],
      });
      xoff += 30;
    }
  }
  return { krsblend, cant, charoffset: 30 * (hc[1] + hc[2] + hc[3]), heads };
}

export const CHECK_PAGES = {
  a: {
    first: ['* Kris analyzed the enemy!', "* But the numbers didn't seem feasible..."],
    again: ["* Kris couldn't bear to check again."],
  },
  b: {
    first: ['* Kris tried to analyze the enemy, but they froze.', '* You brought this upon yourself.'],
    again: ['* Your actions were used up.'],
  },
};

export const HOLDBREATH_PAGES = {
  first: ['* Kris held their breath.&* Their heartbeat quickened.&* The SOUL now moves faster.'],
  again: ['* Kris held their breath...&* They felt dizzy.&* Nothing happened.'],
};

export const NACTION_PAGES = {
  first_a: [
    '* Noelle tries to talk to the Knight!',
    '* But a strange chill made her unable to speak.',
    '* (Why does this feel..^1.&so familiar...?)',
  ],
  again: ["* Noelle couldn't bring herself to say anything."],
};
export const NOELLE_HOLDBREATH_PAGES = {
  first: ['* Noelle held her breath in panic..^1.&* The SOUL now moves faster.'],
  again: ['* Noelle held her breath in panic..^1.&* But nothing seemed to happen.'],
};

export const XSLASH_PAGES = ['* Kris used X-Slash!'];

export function kaizoResolveActPages(state, slot, actId) {
  const charId = charIdOf(state, slot);
  state.actCounts = state.actCounts ?? {};
  const n = state.actCounts;
  const side = state.kaizo?.sideb ? 'b' : 'a';

  if (charId === CHAR_KRIS) {
    if (actId === 0) {
      n.check = (n.check ?? 0) + 1;
      return n.check === 1 ? CHECK_PAGES[side].first : CHECK_PAGES[side].again;
    }
    if (actId === 1) {
      return holdBreath(state) === 'holdbreath_first' ? HOLDBREATH_PAGES.first : HOLDBREATH_PAGES.again;
    }
    if (actId === XSLASH_ACT_INDEX) {
      xslashStart(state, slot);
      return XSLASH_PAGES;
    }
    return undefined;
  }
  if (charId === CHAR_SUSIE) {

    n.susieUsed = true;
    return ACT_PAGES.susie;
  }
  if (charId === CHAR_RALSEI) {
    n.ralsei = (n.ralsei ?? 0) + 1;
    return ACT_PAGES[n.ralsei <= 1 ? 'ralsei' : 'ralsei_again'];
  }
  if (charId === CHAR_NOELLE) {
    if (!havechar(state, CHAR_KRIS)) {

      const kn = state.knight;
      if ((kn.holdbreathcount ?? 0) === 0) {
        kn.holdbreathcount = (kn.holdbreathcount ?? 0) + 1;
        return NOELLE_HOLDBREATH_PAGES.first;
      }
      return NOELLE_HOLDBREATH_PAGES.again;
    }
    const nact = n.nact ?? 0;
    n.nact = nact + 1;
    if (nact === 0 && side === 'a') return NACTION_PAGES.first_a;
    return NACTION_PAGES.again;
  }
  return undefined;
}

export const XSLASH_ALARM = 14;

export function xslashDamage(state) {
  const dr = state.knight?.damagereduction ?? 0;
  let red = 0.15 + (dr - 0.15) * 1.25;
  if (red > 1.05) red = 1.05;
  const at = statFor(state, 0).at;
  let dmg = gmlRound((at * 160) / 20 - KNIGHT_DF * 3);
  dmg = Math.ceil(dmg * red);
  dmg = Math.ceil(dmg * 2);
  return dmg;
}

export function xslashStart(state, slot = 0) {
  const k = state.kaizo;
  const ctl = ensureSpellController(state);
  k.didspell = 1;
  const xs = k.xslash = {
    active: true,
    actcon: 21,
    dontKill: 1,
    hits: [],
    charsprite: 'spr_krisb_attack',
    vfx: [],
  };
  cue(state, 'snd_scytheburst', 1.2);
  xslashHit(state, xs, slot, { xscale: 2 });

  ctl.alarm[4] = XSLASH_ALARM;
  return xs;
}

function xslashHit(state, xs, slot, { xscale }) {
  const knight = state.entities.find((en) => en.alive && en.type.name === 'obj_knight_enemy');
  const kx = knight?.x ?? 425;
  const ky = knight?.y ?? 78;
  const shard = gearOfChar(state, CHAR_KRIS).weapon === 26;
  xs.vfx.push({
    sprite: shard ? 'spr_attack_shard' : 'obj_basicattack', x: kx + 119, y: ky + 76,
    image_xscale: xscale, image_yscale: 2,
  });
  if (xs.hits.length === 0) resetDmgStack(state);
  const dmg = xslashDamage(state);
  kaizoScrDamageEnemy(state, dmg, slot);
  xs.hits.push({ frame: state.frame, damage: dmg });
}

function xslashAlarm4(state) {
  const xs = state.kaizo?.xslash;
  if (!xs?.active) return;
  xs.actcon += 1;
  if (xs.actcon === 22) {
    xs.dontKill = 0;
    xs.actcon = 23;
    cue(state, 'snd_scytheburst', 0.8);
    xslashHit(state, xs, 0, { xscale: -2 });
    ensureSpellController(state).alarm[4] = XSLASH_ALARM;
  } else if (xs.actcon === 24) {
    xs.actcon = 1;
    xs.active = false;
    xs.charsprite = null;
  }
}

export function kaizoActBusy(state) {
  const xs = state.kaizo?.xslash;
  return !!(xs?.active && xs.actcon !== 1);
}

export function stepThornringTick(state) {
  const k = state.kaizo;
  k.tSiner = k.tSiner ?? 0;
  const dotick = !k.practicemode;
  if (dotick && noelleWearsThornRing(state)) {
    const tick = state.knight ? 12 : 6;
    if (k.tSiner % tick === 0) {
      const hp = hpOfChar(state, CHAR_NOELLE);
      if (hp > gmlRound(maxhpOfChar(state, CHAR_NOELLE) / 3)) {
        setHpOfChar(state, CHAR_NOELLE, hp - 1);
      }
    }
  }
  k.tSiner += 1;
}

export const CHARNAME_BY_CHAR = {
  1: 'Kris',
  2: 'Susie',
  3: 'Ralsei',
  4: 'Noelle',
};

export function kaizoCharName(state, slot) {
  const charId = charIdOf(state, slot);
  return CHARNAME_BY_CHAR[charId];
}

export const kaizoSpellController = {
  name: 'kaizo_spell_controller',
  create(e) {
    e.visible = false;
  },
  step(e, state) {
    stepThornringTick(state);
  },
  alarm: {
    4: (e, state) => xslashAlarm4(state),
  },
};

export function ensureSpellController(state) {
  let e = state.entities.find((en) => en.alive && en.type === kaizoSpellController);
  if (!e) e = spawn(state, kaizoSpellController, {});
  return e;
}

export function installKaizoMenu(state) {
  state.kaizo = state.kaizo ?? {};
  const hooks = state.kaizo.hooks = state.kaizo.hooks ?? {};
  hooks.spellInfo ??= KAIZO_SPELL_INFO;
  hooks.spellList ??= kaizoSpellList;
  hooks.actList ??= kaizoActList;
  hooks.spellCost ??= kaizoSpellCost;
  hooks.castSpell ??= kaizoCastSpell;
  hooks.resolveActPages ??= kaizoResolveActPages;
  hooks.actBusy ??= kaizoActBusy;

  hooks.charName ??= kaizoCharName;
  ensureSpellController(state);
  return hooks;
}
