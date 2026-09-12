


import { PARTY, partyMaxhp, partySize, scrRevive } from './damage.js';
import { MAX_TENSION } from './tension.js';
import { cue, cueStop } from './audio.js';
import { spawnHealWriter } from './dmgnumbers.js';


export const ITEMS = {
  1: { name: 'Dark Candy', desc: 'Heals#40HP', target: 'one', kind: 'heal', amount: 40 },
  2: { name: 'ReviveMint', desc: 'Heal#Downed#Ally', target: 'one', kind: 'revive' },
  5: { name: 'BrokenCake', desc: 'Heals#20HP', target: 'one', kind: 'heal', amount: 20 },
  6: { name: 'Top Cake', desc: 'Heals#team#160HP', target: 'all', kind: 'heal', amount: 160 },
  7: { name: 'Spincake', desc: 'Heals#team#150HP', target: 'all', kind: 'heal', amount: 150 },
  8: { name: 'Darkburger', desc: 'Heals#70HP', target: 'one', kind: 'heal', amount: 70 },

  9: { name: 'LancerCookie', desc: 'Heals#50HP', target: 'one', kind: 'heal', amount: 1 },
  10: { name: 'GigaSalad', desc: 'Heals#4HP', target: 'one', kind: 'heal', amount: 4 },
  11: { name: 'ClubsSandwich', desc: 'Heals#team#70HP', target: 'all', kind: 'heal', amount: 70 },
  12: {
    name: 'HeartsDonut', desc: 'Healing#varies', target: 'one', kind: 'heal',
    perChar: [20, 80, 50],
  },
  13: {
    name: 'ChocDiamond', desc: 'Healing#varies', target: 'one', kind: 'heal',
    perChar: [80, 20, 50],
  },
  14: { name: 'Favwich', desc: 'Heals#ALL HP', target: 'one', kind: 'heal', amount: 500 },
  15: { name: 'RouxlsRoux', desc: 'Heals#50 HP', target: 'one', kind: 'heal', amount: 50 },
  16: { name: 'CD Bagel', desc: 'Heals#80 HP', target: 'one', kind: 'heal', amount: 80 },
  22: { name: 'DD-Burger', desc: 'Heals#60HP 2x', target: 'one', kind: 'heal', amount: 60 },
  23: { name: 'LightCandy', desc: 'Heals#120HP', target: 'one', kind: 'heal', amount: 120 },
  24: { name: 'ButJuice', desc: 'Heals#100HP', target: 'one', kind: 'heal', amount: 100 },
  25: { name: 'SpagettiCode', desc: 'Heals#team#30HP', target: 'all', kind: 'heal', amount: 30 },
  26: {
    name: 'JavaCookie', desc: 'Healing#varies', target: 'one', kind: 'heal',
    perChar: [100, 90, 90],
  },

  27: { name: 'TensionBit', desc: 'Raises#TP#32%', target: 'none', kind: 'tension', tp: 80 },
  28: { name: 'TensionGem', desc: 'Raises#TP#50%', target: 'none', kind: 'tension', tp: 'half' },
  29: { name: 'TensionMax', desc: 'Raises#TP#Max', target: 'none', kind: 'tension', tp: 'max' },
  30: { name: 'ReviveDust', desc: 'Revives#team#25%', target: 'all', kind: 'revive' },
  31: { name: 'ReviveBrite', desc: 'Revives#team#100%', target: 'all', kind: 'revive' },

  32: { name: 'S.POISON', desc: 'Hurts#party#member', target: 'one', kind: 'hurt', amount: 20 },
  34: { name: 'TVDinner', desc: 'Heals#100HP', target: 'one', kind: 'heal', amount: 100 },

  35: { name: 'Pipis', desc: 'Does#nothing', target: 'one', kind: 'heal', perChar: [100, 0, 0] },
  36: { name: 'FlatSoda', desc: 'Heals#20HP', target: 'one', kind: 'heal', amount: 20 },
  37: { name: 'TVSlop', desc: 'Heals#80HP', target: 'one', kind: 'heal', amount: 80 },
  38: { name: 'ExecBuffet', desc: 'Heals#team#100HP', target: 'all', kind: 'heal', amount: 100 },
  39: { name: 'DeluxeDinner', desc: 'Heals#140HP', target: 'one', kind: 'heal', amount: 140 },
};


export const ITEM_IDS = Object.keys(ITEMS).map(Number).sort((a, b) => a - b);



export function itemInfo(state, id) {
  const over = state?.kaizo?.items;
  if (over && Object.prototype.hasOwnProperty.call(over, id)) return over[id];
  return ITEMS[id];
}


export function itemTable(state) {
  const over = state?.kaizo?.items;
  if (!over) return ITEMS;
  return { ...ITEMS, ...over };
}



function slotHasCharacter(state, slot) {
  return slot >= 0 && slot < partySize(state);
}


export const healAmountFor = (item, target) => (
  item.perChar ? (item.perChar[target] ?? 0) : (item.amount ?? 0)
);


export const descLines = (item) => (item?.desc ?? '').split('#');

export const INVENTORY_SIZE = 12;


export const DEFAULT_BAG = (() => {
  const bag = [7, 38, 2, 2, 2, 2, 2, 2, 30, 29];
  while (bag.length < INVENTORY_SIZE) bag.push(39);
  return bag.slice(0, INVENTORY_SIZE);
})();



export function freshInventory(custom = null) {
  if (!custom) return [...DEFAULT_BAG];
  return custom.filter((id) => ITEMS[id]).slice(0, INVENTORY_SIZE);
}



export function applyHeal(state, target, amount, healRibbons = 0) {
  const hp = state.partyHp;

  if (!slotHasCharacter(state, target)) return 0;

  const maxhp = partyMaxhp(state, target);
  const amt = amount + Math.ceil(amount / 8) * healRibbons;
  const before = hp[target];
  const belowZero = hp[target] <= 0;

  if (hp[target] <= maxhp) {
    hp[target] += amt;
    if (hp[target] > maxhp) hp[target] = maxhp;
  }
  if (belowZero && hp[target] >= 0) {
    const floor6 = Math.ceil(maxhp / 6);
    if (hp[target] < floor6) hp[target] = floor6;

    scrRevive(state, target);
  }

  cueStop(state, 'snd_power');
  cue(state, 'snd_power');
  return hp[target] - before;
}



export function scrHealitem(state, target, amount) {

  const kHook = state.kaizo?.hooks?.scrHealitem;
  if (kHook) return kHook(state, target, amount);
  const did = applyHeal(state, target, amount, 0);

  spawnHealWriter(state, target, amount);
  return did;
}



export function scrHealitemAll(state, amount) {

  const kHook = state.kaizo?.hooks?.scrHealitemAll;
  if (kHook) return kHook(state, amount);
  let total = 0;
  for (let i = 0; i < 3; i++) {
    if (!slotHasCharacter(state, i)) continue;
    total += applyHeal(state, i, amount, 0);
  }

  for (let i = 0; i < partySize(state); i++) spawnHealWriter(state, i, amount);
  return total;
}



export function reviveAmount(state, target, which) {
  const hp = state.partyHp[target];

  const maxhp = partyMaxhp(state, target);
  if (which === 'mint') return hp <= 0 ? maxhp - hp : Math.floor(maxhp * 0.5);
  return hp <= 0 ? Math.floor(maxhp * 0.25) - hp : 10;
}





export function takeItem(state, slot, bag = null) {
  const list = bag ?? state.inventory;
  const id = list[slot];
  if (!itemInfo(state, id)) return null;

  list.splice(slot, 1);
  return id;
}



function itemEffect(state, item, target) {
  if (item.kind === 'heal') {
    const amount = healAmountFor(item, target);
    if (item.target === 'all') return scrHealitemAll(state, amount);

    if (amount <= 0) return 0;
    return scrHealitem(state, target, amount);
  }
  if (item.kind === 'revive') {
    const which = item.name === 'ReviveMint' ? 'mint' : 'dust';
    if (item.target === 'all') {

      let did = 0;
      for (let i = 0; i < 3; i++) {
        if (!slotHasCharacter(state, i)) continue;
        did += applyHeal(state, i, reviveAmount(state, i, which));
      }
      return did;
    }
    return applyHeal(state, target, reviveAmount(state, target, which));
  }
  if (item.kind === 'tension') {

    const want = item.tp === 'max' ? MAX_TENSION
      : item.tp === 'half' ? Math.ceil(MAX_TENSION / 2)
        : (item.tp ?? 0);
    const before = state.tension;
    state.tension = Math.min(MAX_TENSION, state.tension + want);
    return state.tension - before;
  }
  if (item.kind === 'hurt') {

    const hp = state.partyHp;
    const before = hp[target];
    hp[target] = Math.max(before - (item.amount ?? 0), 1);
    return before - hp[target];
  }
  return 0;
}


function itemVerb(item, did) {
  if (item.kind === 'revive') return `revived ${did}`;
  if (item.kind === 'tension') return `TP +${Math.round(did)}`;
  if (item.kind === 'hurt') return `-${did} HP`;
  return `healed ${did}`;
}


export function applyItem(state, id, target = 0) {
  const item = itemInfo(state, id);
  if (!item) return null;
  const did = itemEffect(state, item, target);
  if (did <= 0) return null;
  return `${item.name}: ${itemVerb(item, did)}`;
}

export function useItem(state, slot, target = 0, bag = null) {

  const list = bag ?? state.inventory;
  const id = list[slot];
  const item = itemInfo(state, id);
  if (!item) return null;

  const did = itemEffect(state, item, target);
  if (did <= 0) return null;


  list.splice(slot, 1);
  return `${item.name}: ${itemVerb(item, did)}`;
}


export function usableSlots(state, bag = null) {

  const anyDown = state.partyHp.slice(0, partySize(state)).some((h) => h <= 0);

  const anyHurt = state.partyHp
    .slice(0, partySize(state))
    .some((h, i) => h > 0 && h < partyMaxhp(state, i));
  return (bag ?? state.inventory).map((id) => {
    const item = itemInfo(state, id);
    if (!item) return false;
    if (item.kind === 'revive') return anyDown;

    if (item.kind === 'heal') return anyHurt || anyDown;
    if (item.kind === 'tension') return state.tension < MAX_TENSION;

    if (item.kind === 'hurt') return state.partyHp.slice(0, partySize(state)).some((h) => h > 1);
    return false;
  });
}
