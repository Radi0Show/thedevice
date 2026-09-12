





export const CHAPTER = 3;



export const WEAPONS = {
  1: { name: "Wood Blade", allowed: [0] },
  2: { name: "Mane Ax", allowed: [] },
  3: { name: "Red Scarf", allowed: [2] },
  4: { name: "EverybodyWeapon", at: 12, df: 6, magic: 8, allowed: [0, 1, 2, 3] },
  5: { name: "Spookysword", at: 2, allowed: [0], ability: "Spookiness UP" },
  6: { name: "Brave Ax", at: 2, allowed: [1], ability: "Guts Up" },
  7: { name: "Devilsknife", at: 5, magic: 4, allowed: [1], ability: "Buster TP DOWN" },
  8: { name: "Trefoil", at: 4, allowed: [0], ability: "Money Earned UP" },
  9: { name: "Ragger", at: 2, allowed: [2] },
  10: { name: "DaintyScarf", magic: 2, allowed: [2], ability: "Fluffiness UP" },
  11: { name: "TwistedSwd", at: 16, allowed: [0], ability: "Trance" },
  12: { name: "SnowRing", allowed: [3] },
  13: { name: "ThornRing", at: 14, magic: 12, allowed: [3], ability: "Trance" },
  14: { name: "BounceBlade", at: 2, df: 1, allowed: [0], ability: "Defense" },
  15: { name: "CheerScarf", at: 1, magic: 2, allowed: [2], ability: "Smiley" },
  16: { name: "MechaSaber", at: 4, allowed: [0], ability: "Annoying" },
  17: { name: "AutoAxe", at: 4, allowed: [1], ability: "BadIdea" },
  18: { name: "FiberScarf", at: 3, magic: 2, allowed: [2] },
  19: { name: "Ragger2", at: 5, magic: -1, allowed: [2], ability: "Prickly" },
  20: { name: "BrokenSwd", allowed: [], ability: "Failure" },
  21: { name: "PuppetScarf", at: 10, magic: -6, allowed: [2] },
  22: { name: "FreezeRing", at: 4, magic: 4, allowed: [3] },
  23: { name: "Saber10", at: 6, allowed: [0] },
  24: { name: "ToxicAxe", at: 6, allowed: [1] },
  25: { name: "FlexScarf", at: 4, magic: 1, allowed: [2] },
  26: { name: "BlackShard", at: 16, allowed: [0, 3] },};


export const ARMOR = {
  1: { name: "Amber Card", df: 1, allowed: [0, 1, 2] },
  2: { name: "Dice Brace", df: 2, allowed: [0, 1, 2] },
  3: { name: "Pink Ribbon", df: 1, allowed: [0, 2, 3], ability: "GrazeArea" },
  4: { name: "White Ribbon", df: 2, allowed: [0, 2], ability: "Cuteness" },
  5: { name: "IronShackle", at: 1, df: 2, allowed: [0, 1, 2] },
  6: { name: "MouseToken", magic: 2, allowed: [0, 1, 2], element: 7, elementAmount: 0.5 },
  7: { name: "Jevilstail", at: 2, df: 2, magic: 2, allowed: [0, 1, 2] },
  8: { name: "Silver Card", df: 2, allowed: [0, 1, 2], ability: "$ +5%" },
  9: { name: "TwinRibbon", df: 3, allowed: [0, 2, 3], ability: "GrazeArea" },
  10: { name: "GlowWrist", df: 2, allowed: [0, 1, 2, 3] },
  11: { name: "ChainMail", df: 3, allowed: [0, 1, 2, 3] },
  12: { name: "B.ShotBowtie", df: 2, magic: 1, allowed: [0, 1, 2, 3] },
  13: { name: "SpikeBand", at: 2, df: 1, allowed: [0, 1, 2, 3] },
  14: { name: "Silver Watch", df: 2, allowed: [0, 1, 2, 3], ability: "GrazeTime" },
  15: { name: "TensionBow", df: 2, allowed: [0, 1, 2, 3], ability: "TPGain" },
  16: { name: "Mannequin", allowed: [0], element: 6, elementAmount: 0.35, ability: "???" },
  17: { name: "DarkGoldBand", allowed: [0] },
  18: { name: "SkyMantle", df: 1, allowed: [0, 1, 2, 3], element: 1, elementAmount: 0.5, ability: "Elec/Holy" },
  19: { name: "SpikeShackle", at: 3, df: 1, allowed: [0, 1, 2, 3], ability: "Attack" },
  20: { name: "FrayedBowtie", at: 1, df: 1, magic: 1, allowed: [0, 2, 3], element: 6, elementAmount: 0.15 },
  21: { name: "Dealmaker", df: 5, magic: 5, allowed: [0, 1, 2], element: 6, elementAmount: 0.4, ability: "$ +30%" },
  22: { name: "RoyalPin", df: 3, magic: 1, allowed: [0, 1, 2, 3] },
  23: { name: "ShadowMantle", df: CHAPTER, allowed: [0, 1, 2], element: 5, elementAmount: 0.66, ability: "Dark/Star" },
  24: { name: "LodeStone", df: 2, allowed: [0, 1, 2, 3], ability: "TPGain" },
  25: { name: "GingerGuard", df: 3, allowed: [0, 1, 2, 3] },
  26: { name: "BlueRibbon", df: 1, magic: 1, allowed: [0, 2, 3], ability: "Heal+" },
  27: { name: "TennaTie", df: 5, magic: -2, allowed: [0, 1, 2, 3] },};



const GRAZE_TP = { 15: 0.1, 24: 0.05, 3: -0.2, 9: -0.25 };
const GRAZE_TIME = { 14: 0.1, 3: -0.2 };
const GRAZE_SIZE = { 3: 0.2, 9: 0.25 };


export function partyWearing(loadout, id) {
  let n = 0;
  for (const c of loadout) {
    for (const a of c.armor ?? []) if (a === id) n += 1;
  }
  return n;
}

export function grazeFactors(loadout) {
  let tp = 1;
  let time = 1;
  let size = 1;
  for (const [id, v] of Object.entries(GRAZE_TP)) tp += partyWearing(loadout, +id) * v;
  for (const [id, v] of Object.entries(GRAZE_TIME)) time += partyWearing(loadout, +id) * v;
  for (const [id, v] of Object.entries(GRAZE_SIZE)) size += partyWearing(loadout, +id) * v;

  if (size > 3) size = 3;
  return { tp, time, size };
}

const num = (v) => (v === 'CHAPTER' ? CHAPTER : (v ?? 0));


export function itemOf(kind, id) {
  const raw = (kind === 'weapon' ? WEAPONS : ARMOR)[id];
  if (!raw) return null;
  return { ...raw, df: num(raw.df === 'CHAPTER' ? 'CHAPTER' : raw.df) };
}


export function canEquip(kind, id, slot) {
  const it = (kind === 'weapon' ? WEAPONS : ARMOR)[id];
  return !!it && (it.allowed ?? []).includes(slot);
}



export function statsOf(base, entry) {
  const eq = [];
  const w = itemOf('weapon', entry.weapon);
  if (w) eq.push(w);
  for (const a of entry.armor ?? []) {
    const it = itemOf('armor', a);
    if (it) eq.push(it);
  }
  let at = base.at;
  let df = base.df;
  let magic = base.magic;
  for (const e of eq) {
    at += e.at ?? 0;
    df += e.df ?? 0;
    magic += e.magic ?? 0;
  }
  return {
    at,
    df,
    magic,

    healRibbons: (entry.armor ?? []).filter((a) => a === 26).length,

    rudeBusterCost: entry.weapon === 7 ? 100 : 125,

    mantle: (entry.armor ?? []).includes(23),
    equipped: eq,
  };
}
