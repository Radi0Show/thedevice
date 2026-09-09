


import { PARTY, statFor } from './damage.js';
import { spellDamage, damageKnight } from './knight.js';
import { castRudeBuster } from './rudebuster.js';
import { applyHeal } from './items.js';
import { spawnSelfHealNumber } from './dmgnumbers.js';
import { PARTY as PARTY_STATS } from './damage.js';



const healAmountModifyByEquipment = (amount, ribbons) =>
  amount + Math.ceil(amount / 8) * ribbons;



function healNumber(state, target, amount) {
  const maxed = state.partyHp[target] >= PARTY_STATS[target].maxhp;
  spawnSelfHealNumber(state, target, amount, maxed);
}
import { cue } from './audio.js';
import { ACT_PAGES } from './dialogue.js';


const PARTY_POS = [{ x: 126, y: 104 }, { x: 80, y: 142 }, { x: 58, y: 190 }];
const KNIGHT_POS = { x: 425, y: 78 };

const KNIGHT_AIM = { dx: 60, dy: 90 - 50 };


export const SPELLS = {
  2: { name: 'Heal Prayer', descb: 'Heal#Ally', cost: 80, target: 1 },
  3: { name: 'Pacify', descb: 'Spare#TIRED foe', cost: 40, target: 2 },
  4: { name: 'Rude Buster', descb: 'Rude#Damage#', cost: 125, target: 2 },
  7: { name: 'ACT', descb: 'Use#action', cost: 0, target: 0 },
  11: { name: 'UltraHeal', descb: 'Best#healing', cost: 225, target: 1 },
};


export const SPELL_LIST = [[7], [4, 11], [3, 2]];



export const ACTS = [
  [
    { name: 'Check', descb: 'Useless#analysis' },
    { name: 'HoldBreath', descb: '' },
  ],
  [{ name: 'S-Action', descb: '' }],
  [{ name: 'R-Action', descb: '' }],
];



export function spellCost(state, slot, spellId) {
  const s = SPELLS[spellId];
  if (!s) return Infinity;

  if (spellId === 4) return statFor(state, slot).rudeBusterCost;
  return s.cost;
}

export function canAfford(state, spellId, slot = 1) {
  return state.tension >= spellCost(state, slot, spellId);
}





export function resolveActPages(state, c, actId) {
  state.actCounts = state.actCounts ?? {};
  const n = state.actCounts;
  if (c === 0) {
    if (actId === 1) return ACT_PAGES[holdBreath(state)];
    n.check = (n.check ?? 0) + 1;
    return ACT_PAGES[n.check === 1 ? 'check' : 'point'];
  }
  if (c === 1) {

    n.susieUsed = true;
    return ACT_PAGES.susie;
  }
  n.ralsei = (n.ralsei ?? 0) + 1;
  return ACT_PAGES[n.ralsei <= 1 ? 'ralsei' : 'ralsei_again'];
}

export function holdBreath(state) {

  const n = (state.knight.holdbreathcount ?? 0) + 1;
  state.knight.holdbreathcount = 1;
  return n <= 1 ? 'holdbreath_first' : 'holdbreath_again';
}


export function soulSpeed(state) {
  if (!state.knight?.holdbreathcount) return 4;
  return state.roaringActive ? 6 : 5;
}



export function castSpell(state, slot, spellId, target = 0, opts = {}) {
  const s = SPELLS[spellId];
  if (!s) return null;

  if (!opts.alreadyPaid) {
    if (state.tension < s.cost) return null;
    state.tension -= s.cost;
  }

  if (spellId === 4) {

    const k = state.entities.find((en) => en.alive && en.type.name === 'obj_knight_enemy');
    const kx = (k?.x ?? KNIGHT_POS.x) + KNIGHT_AIM.dx;
    const ky = (k?.y ?? KNIGHT_POS.y) + KNIGHT_AIM.dy;
    castRudeBuster(state, PARTY_POS[slot].x, PARTY_POS[slot].y,
      spellDamage(state, slot), kx, ky);
    return 'Rude Buster!';
  }
  if (spellId === 2) {

    const st = statFor(state, slot);
    const amount = healAmountModifyByEquipment(st.magic * 5, st.healRibbons);
    applyHeal(state, target, st.magic * 5, st.healRibbons);
    healNumber(state, target, amount);

    return null;
  }
  if (spellId === 11) {

    const st2 = statFor(state, slot);
    const amount = healAmountModifyByEquipment(st2.magic * 5 + 100, st2.healRibbons);
    const did = applyHeal(state, target, st2.magic * 5 + 100, st2.healRibbons);
    healNumber(state, target, amount);
    return `UltraHeal: +${did}`;
  }
  if (spellId === 3) {

    state.pacifyFail = { con: 6, alarm: 8 };
    return null;
  }
  return null;
}
