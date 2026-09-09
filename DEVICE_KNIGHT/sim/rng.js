

export function createRng(seed) {
  return { s: seed >>> 0 };
}

export function rngNext(r) {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rngRandom(r, n) {
  return rngNext(r) * n;
}

export function rngIrandom(r, n) {
  return Math.floor(rngNext(r) * (n + 1));
}

export function rngRange(r, lo, hi) {
  return lo + rngNext(r) * (hi - lo);
}

export function rngChoose(r, values) {
  return values[Math.floor(rngNext(r) * values.length)];
}

export function rngSnapshot(r) {
  return r.s >>> 0;
}

export function rngRestore(r, s) {
  r.s = s >>> 0;
}

const POLY = 0xda442d24;

export function gmlCreate(seed) {
  const state = new Uint32Array(16);
  let s = seed >>> 0;
  for (let i = 0; i < 16; i++) {

    s = (Math.imul(s, 214013) + 2531011) >>> 16;
    state[i] = s;
  }
  return { state, idx: 0, seed: seed >>> 0 };
}

export function gmlU32(r) {
  r.draws = (r.draws ?? 0) + 1;

  if (globalThis.__trap === true) {
    const site = (new Error().stack ?? '').split(String.fromCharCode(10)).slice(2).find((l) => !l.includes('rng.js')) ?? '';
    console.error('DRAW ' + globalThis.__simFrame + ' #' + r.draws + ' ' + site.trim().replace(new RegExp('^at '), '').replace(new RegExp('file:///[^ )]*/(sim|kaizo)/'), '$1/'));
  }
  const st = r.state;
  let a = st[r.idx];
  let c = st[(r.idx + 13) & 15];
  const b = (a ^ c ^ (a << 16) ^ (c << 15)) >>> 0;
  c = st[(r.idx + 9) & 15];
  c = (c ^ (c >>> 11)) >>> 0;
  a = st[r.idx] = (b ^ c) >>> 0;
  const d = (a ^ ((a << 5) & POLY)) >>> 0;
  r.idx = (r.idx + 15) & 15;
  a = st[r.idx];
  st[r.idx] = (a ^ b ^ d ^ (a << 2) ^ (b << 18) ^ (c << 28)) >>> 0;
  return st[r.idx];
}

function gmlI63(r) {
  const lo = gmlU32(r);
  const hi = gmlU32(r) & 0x7fffffff;

  return (BigInt(hi) << 32n) | BigInt(lo);
}

export function gmlRandom(r, x) {
  return (gmlU32(r) / 4294967296) * x;
}

export function gmlRandomRange(r, lo, hi) {
  return lo + (gmlU32(r) / 4294967296) * (hi - lo);
}

export function gmlIrandom(r, n) {
  return Number(gmlI63(r) % BigInt(n + 1));
}

export function gmlIrandomRange(r, lo, hi) {
  return lo + Number(gmlI63(r) % BigInt(hi - lo + 1));
}

export function gmlChoose(r, values) {
  return values[gmlU32(r) % values.length];
}

export function gmlRandomsign(r) {
  return gmlIrandom(r, 1) * 2 - 1;
}

export function gmlShuffle(rng, list) {

  const burned = [];
  for (let i = 0; i < list.length * 16; i++) burned.push(gmlU32(rng));
  for (let i = list.length - 1; i > 0; i--) {
    const j = burned[i * 16 - 1] % (i + 1);
    const t = list[i];
    list[i] = list[j];
    list[j] = t;
  }
  return list;
}
