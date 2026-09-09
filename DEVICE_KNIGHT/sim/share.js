



const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VERSION = 'A';


export const NONE = 63;

const enc = (n) => ALPHABET[Math.max(0, Math.min(63, n | 0))];
const dec = (ch) => {
  const i = ALPHABET.indexOf(ch);
  return i < 0 ? null : i;
};

export const CONFIG_LENGTH = 25;



export function encodeConfig({
  mode = NONE, attack = NONE, difficulty = NONE, gear = null, bag = null,
} = {}) {
  let out = VERSION + enc(mode) + enc(attack) + enc(difficulty);
  for (let c = 0; c < 3; c++) {
    const g = gear?.[c];
    out += enc(g ? g.weapon : NONE);
    out += enc(g ? (g.armor?.[0] ?? 0) : NONE);
    out += enc(g ? (g.armor?.[1] ?? 0) : NONE);
  }
  for (let i = 0; i < 12; i++) out += enc(bag ? (bag[i] ?? 0) : NONE);
  return out;
}



export function decodeConfig(token, {
  weaponOk = () => true, armorOk = () => true, itemOk = () => true,
  modeCount = 4, attackCount = 1,
} = {}) {
  if (typeof token !== 'string' || token.length !== CONFIG_LENGTH) return null;
  if (token[0] !== VERSION) return null;
  const v = [];
  for (const ch of token) {
    const n = dec(ch);
    if (n === null) return null;
    v.push(n);
  }

  const pick = (n, count) => (n === NONE || n < 0 || n >= count ? null : n);
  const out = {
    mode: pick(v[1], modeCount),
    attack: pick(v[2], attackCount),

    difficulty: v[3] === NONE ? null : v[3],
    gear: null,
    bag: null,
  };


  const gearVals = v.slice(4, 13);
  if (!gearVals.includes(NONE)) {
    const gear = [];
    for (let c = 0; c < 3; c++) {
      const w = gearVals[c * 3];
      const a1 = gearVals[c * 3 + 1];
      const a2 = gearVals[c * 3 + 2];
      gear.push({

        weapon: weaponOk(w, c) ? w : 0,
        armor: [armorOk(a1, c) ? a1 : 0, armorOk(a2, c) ? a2 : 0],
      });
    }
    out.gear = gear;
  }

  const bagVals = v.slice(13, 25);
  if (!bagVals.every((n) => n === NONE)) {

    out.bag = bagVals.map((n) => (n !== NONE && itemOk(n) ? n : 0));
  }

  return out;
}
