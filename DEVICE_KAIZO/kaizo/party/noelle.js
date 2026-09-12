

export const NOELLE_CHAR_ID = 4;

export const NOELLE_STATS = { maxhp: 120, at: 5, magic: 13, df: 1 };

export const NOELLE_BODY = { mywidth: 52, myheight: 86 };

export const NOELLE_GEAR_SNOWRING = { weapon: 12, armor: [14, 22] };
export const NOELLE_GEAR_THORNRING = { weapon: 13, armor: [14, 22] };

export const NOELLE_GEAR_WEIRD_ROUTE = NOELLE_GEAR_THORNRING;

export const THORN_RING = 13;

export const NOELLE_FRESH_FILE = {
  stats: NOELLE_STATS,
  gear: NOELLE_GEAR_THORNRING,
  spells: [2, 8, 9],

  maybeSpells: [10],
};

export function scrSignParty(sizeChoice, picks) {
  const _pl = [0, 2, 1];
  let partyleft = _pl[sizeChoice] ?? 0;
  const partychar = [0, 0, 0];
  for (const choice of picks) {
    if (partyleft < 0) break;
    partychar[partyleft] = choice + 1;
    partyleft -= 1;
  }

  const seen = [false, false, false, false, false];
  for (let i = 0; i < 3; i++) if (partychar[i] >= 1 && partychar[i] <= 4) seen[partychar[i]] = true;
  const out = [0, 0, 0];
  let ind = 0;
  for (let id = 1; id <= 4; id++) if (seen[id]) { out[ind] = id; ind += 1; }
  return out;
}

export const NOELLE_SPRITE_PREFETCH = [
  'spr_noelleb_pray',
  'spr_noelleb_orb',
  'spr_noelleb_spellready',
  'spr_noelleb_spell',
  'spr_noelleb_spell_special',
  'spr_noelleb_attack',
  'spr_noelleb_attackready',
  'spr_noelleb_victory',
  'spr_noelleb_battleintro',
  'spr_noelleb_act',
  'spr_noelleb_actready',
  'spr_noelleb_defeat',
  'spr_noelleb_defend',
  'spr_noelleb_hurt',
  'spr_noelleb_idle',
  'spr_noelleb_item',
  'spr_noelleb_itemready',
  'spr_noelleb_battleintro_sideb',
  'spr_noelleb_defend_sideb',
  'spr_noelleb_float_sideb',
  'spr_noelleb_idle_sideb',
  'spr_noelleb_hurt_sideb',
  'spr_noelleb_swooned',
];

export const NOELLE_SIDEB_SPRITES = [
  'spr_noelleb_battleintro_sideb',
  'spr_noelleb_defend_sideb',
  'spr_noelleb_float_sideb',
  'spr_noelleb_idle_sideb',
  'spr_noelleb_hurt_sideb',
];

export const NOELLE_PREFETCH_UNASSIGNED = [
  'spr_noelleb_battleintro',
  'spr_noelleb_battleintro_sideb',
  'spr_noelleb_float_sideb',
  'spr_noelleb_orb',
  'spr_noelleb_spell_special',
];

export function noelleSprites(sideb = false) {
  const spec = {
    name: 'NOELLE',

    attackframes: 4,
    itemframes: 9,
    defendframes: 0,
    actframes: 7,
    actreturnframes: 10,
    spellframes: 6,
    victoryframes: null,
    normal: 'spr_noelle_walk_right_dw',
    idle: 'spr_noelleb_idle',
    defend: 'spr_noelleb_defend',
    hurt: 'spr_noelleb_hurt',
    attackready: 'spr_noelleb_attackready',
    attack: 'spr_noelleb_attack',
    item: 'spr_noelleb_item',
    itemready: 'spr_noelleb_itemready',
    spellready: 'spr_noelleb_spellready',
    spell: 'spr_noelleb_spell',
    defeat: 'spr_noelleb_defeat',
    victory: 'spr_noelleb_victory',
    actready: 'spr_noelleb_actready',
    act: 'spr_noelleb_act',
  };

  if (sideb) {
    spec.attackready = 'spr_noelleb_spellready';
    spec.attack = 'spr_noelleb_spell';
    spec.attackframes = 6;
    spec.victory = 'spr_noelleb_pray';
    spec.victoryframes = 10;
    spec.defendframes = 5;
    spec.defend = 'spr_noelleb_defend_sideb';
    spec.hurt = 'spr_noelleb_hurt_sideb';
    spec.idle = 'spr_noelleb_idle_sideb';
  }
  return spec;
}

export function noelleSwoonSprite(sideb = false) {
  return 'spr_noelleb_swooned';
}

export function noelleFrozenSprite(sideb = false) {
  return noelleSprites(sideb).hurt;
}

export const KRIS_FROZEN_SPRITE = 'spr_krisb_frozen';

export const KRIS_FELL_SPRITE = 'spr_kris_fell';

export const NOELLE_SPELLS = [2, 8, 9];
export const NOELLE_SPELL_SNOWGRAVE = 10;

export function noelleSpellCost(spellId, weapon, maxtension = 100) {
  let cost;
  if (spellId === 9) cost = 40;
  else if (spellId === NOELLE_SPELL_SNOWGRAVE) cost = maxtension * 2;
  else return null;
  if (weapon === THORN_RING) cost *= 0.5;
  return cost;
}

export const ACT_N_ACTION = { name: 'N-Action', descb: '', simul: 0 };
export const ACT_HOLD_BREATH = { name: 'HoldBreath', descb: '', simul: 0 };

export const KAIZO_ACTS_BY_CHAR = {
  1: [
    { name: 'Check', descb: 'Useless#analysis' },
    { name: 'HoldBreath', descb: '' },
  ],
  2: [{ name: 'S-Action', descb: '', simul: 0 }],
  3: [{ name: 'R-Action', descb: '', simul: 0 }],
  4: [ACT_N_ACTION],
};

export function kaizoActsForRoster(charIds) {
  const live = charIds.filter((c) => c !== 0);

  const krisAbsent = !live.includes(1);
  return live.map((charId) => {
    const acts = KAIZO_ACTS_BY_CHAR[charId] ?? [];
    if (krisAbsent && charId !== 1) return [{ ...ACT_HOLD_BREATH }];
    return acts.map((a) => ({ ...a }));
  });
}

export function noelleSpec({ sideb = false } = {}) {
  const sprites = noelleSprites(sideb);
  return {
    charId: NOELLE_CHAR_ID,
    name: 'NOELLE',
    maxhp: NOELLE_STATS.maxhp,
    at: NOELLE_STATS.at,
    magic: NOELLE_STATS.magic,
    df: NOELLE_STATS.df,
    gear: { ...NOELLE_GEAR_WEIRD_ROUTE, armor: [...NOELLE_GEAR_WEIRD_ROUTE.armor] },
    spells: [...NOELLE_SPELLS],
    body: { ...NOELLE_BODY },
    spec: sprites,
    swoon: noelleSwoonSprite(sideb),
    frozen: noelleFrozenSprite(sideb),
  };
}
