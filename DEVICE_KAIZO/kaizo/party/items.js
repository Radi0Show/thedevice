

import { applyHeal, ITEMS } from '../../sim/items.js';
import { spawnHealWriter } from '../../sim/dmgnumbers.js';
import { scrHealallitemspell, scrHealitemspell, charIdOfSlot } from './freeze.js';

export const KAIZO_ITEMS = {

  14: {
    name: 'FavSandwich', desc: 'Heals#ALL HP', target: 'one', kind: 'heal', amount: 5000,
  },

  23: {
    name: 'LightCandy', desc: 'Heals#200HP', target: 'one', kind: 'heal', amount: 200,
  },
};

export const KAIZO_ITEMS_REJECTED = Object.freeze({

  7: { reason: 'official churn reversed — the mod inherited v0.0.091 and never touched it' },
});

export const PERCHAR_BY_CHARID = Object.freeze({

  12: { 1: 20, 2: 80, 3: 50, 4: 30 },
  13: { 1: 80, 2: 20, 3: 50, 4: 70 },

  26: { 1: 100, 2: 90, 3: 90, 4: 90 },
});

export function perCharFor(id, globalChar) {
  const byChar = PERCHAR_BY_CHARID[id];
  if (!byChar) return null;
  const out = [];
  for (let slot = 0; slot < 3; slot++) out.push(byChar[globalChar?.[slot]] ?? 0);
  return out;
}

function kaizoHealAll(state, amount) {
  let total = 0;
  const healFn = (st, slot, amt) => {
    const did = applyHeal(st, slot, amt, 0);
    total += did;
    return did;
  };
  const res = scrHealallitemspell(state, amount, healFn, 0);

  for (const slot of res.anims) spawnHealWriter(state, slot, amount);
  return total;
}

function kaizoHealOne(state, target, amount) {
  let did = 0;
  const healFn = (st, slot, amt) => {
    const d = applyHeal(st, slot, amt, 0);
    did += d;
    return d;
  };
  const res = scrHealitemspell(state, target, amount, healFn, 0);
  if (res === false) return 0;

  if (charIdOfSlot(state, target) !== 0) spawnHealWriter(state, target, amount);
  return did;
}

function buildItemOverrides(state) {
  const out = { ...KAIZO_ITEMS };
  const globalChar = state?.kaizo?.globalChar;
  if (!globalChar) return out;
  for (const id of Object.keys(PERCHAR_BY_CHARID).map(Number)) {
    const perChar = perCharFor(id, globalChar);
    if (!perChar) continue;
    out[id] = { ...(out[id] ?? ITEMS[id]), perChar };
  }
  return out;
}

export function installKaizoHeals(state) {
  state.kaizo = state.kaizo ?? {};
  state.kaizo.items = state.kaizo.items ?? buildItemOverrides(state);
  state.kaizo.hooks = state.kaizo.hooks ?? {};
  state.kaizo.hooks.scrHealitemAll = state.kaizo.hooks.scrHealitemAll ?? kaizoHealAll;
  state.kaizo.hooks.scrHealitem = state.kaizo.hooks.scrHealitem ?? kaizoHealOne;
  return state;
}
