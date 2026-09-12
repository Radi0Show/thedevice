

import {
  WEIRD_ROUTE_PARTY, GAMESTART_CH3_GEAR, characterSpec, scrFixparty,
  CHAR_KRIS, CHAR_NOELLE, CHAR_NONE,
} from '../party/roster.js';

export const PROCEED_KEY = 'kaizoknight.proceed';

export const PROCEED_SHATTER_SPRITE = 'spr_roaringknight_finalshatter';

export function loadProceed(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PROCEED_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return {};
    const out = { presses: v.presses | 0, taken: !!v.taken };

    if (Array.isArray(v.gear) && v.gear.length === WEIRD_ROUTE_PARTY.length) {
      out.gear = v.gear.map((g) => ({
        weapon: g?.weapon | 0,
        armor: (g?.armor ?? []).map((a) => a | 0),
      }));
    }
    return out;
  } catch {

    return {};
  }
}

export function saveProceed(unused, gear = null, storage = globalThis.localStorage) {
  try {
    storage?.setItem(PROCEED_KEY, JSON.stringify({
      v: 1,
      presses: unused?.presses | 0,
      taken: !!unused?.taken,
      gear: Array.isArray(gear) ? gear : undefined,
    }));
  } catch {   }
}

export function weirdRouteTabs() {
  const gc = scrFixparty(WEIRD_ROUTE_PARTY);
  const tabs = [];
  for (const charId of gc) {
    if (charId === CHAR_NONE) continue;
    const c = characterSpec(charId, { sideb: true });
    tabs.push({
      name: c.name.toUpperCase(),
      char: charId - 1,
      charId,
      base: { at: c.at, df: c.df, magic: c.magic, maxhp: c.maxhp },

      head: charId === CHAR_NOELLE ? 'spr_headnoelle' : undefined,
    });
  }
  return tabs;
}

export function weirdRouteGear() {
  return weirdRouteTabs().map((t) => {
    const g = t.charId === CHAR_KRIS
      ? GAMESTART_CH3_GEAR[CHAR_KRIS]
      : characterSpec(t.charId, { sideb: true }).gear;
    return { weapon: g.weapon, armor: [...(g.armor ?? [])] };
  });
}

export function gearOverrideFromTabs(tabs, gear) {
  const out = {};
  for (let i = 0; i < tabs.length; i++) {
    const g = gear?.[i];
    if (!g) continue;
    out[tabs[i].charId] = { weapon: g.weapon | 0, armor: [...(g.armor ?? [])] };
  }
  return out;
}

export function padLoadout(gear) {
  const out = gear.map((g) => ({ weapon: g.weapon, armor: [...(g.armor ?? [])] }));
  while (out.length < 3) out.push({ weapon: 0, armor: [] });
  return out;
}

export const PROCEED_VERSION = 'D';
