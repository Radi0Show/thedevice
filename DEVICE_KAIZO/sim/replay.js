


const BITS = {
  left: 1, right: 2, up: 4, down: 8, focus: 16, confirm: 32, cancel: 64,

  button3: 128,
};
const KEYS = Object.keys(BITS);

export const TOKEN_VERSION = 'K1';


export function packInput(input) {
  let b = 0;
  for (const k of KEYS) if (input?.[k]) b |= BITS[k];
  return b;
}


export function unpackInput(b) {
  const out = {};
  for (const k of KEYS) out[k] = (b & BITS[k]) !== 0;
  return out;
}



export function createRecorder(meta = {}) {
  return {
    meta: {
      seed: meta.seed ?? 0,
      mode: meta.mode ?? 'fight',
      attack: meta.attack ?? '',
      difficulty: meta.difficulty ?? 0,
    },
    runs: [],
    frames: 0,
  };
}

export function recordInput(rec, input) {
  const b = packInput(input);
  const last = rec.runs[rec.runs.length - 1];

  if (last && last[0] === b && last[1] < 255) last[1] += 1;
  else rec.runs.push([b, 1]);
  rec.frames += 1;
}


const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toB64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

function fromB64(str) {
  const bytes = [];
  let buf = 0;
  let bits = 0;
  for (const ch of str) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  return bytes;
}

export function encodeReplay(rec) {
  const bytes = [];
  for (const [b, n] of rec.runs) {
    bytes.push(b, n);
  }
  const m = rec.meta;
  return [
    TOKEN_VERSION,
    m.seed,
    m.mode,
    m.attack || '-',
    m.difficulty,
    rec.frames,
    toB64(bytes),
  ].join('.');
}



export function decodeReplay(token) {
  const parts = String(token).trim().split('.');
  if (parts.length !== 7) {
    throw new Error(`not a replay token (${parts.length} fields, expected 7)`);
  }
  const [ver, seed, mode, attack, difficulty, frames, payload] = parts;
  if (ver !== TOKEN_VERSION) {
    throw new Error(`token version ${ver}, this build reads ${TOKEN_VERSION}`);
  }

  const bytes = fromB64(payload);
  if (bytes.length % 2 !== 0) throw new Error('truncated payload');

  const table = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const input = unpackInput(bytes[i]);
    for (let n = 0; n < bytes[i + 1]; n++) table.push(input);
  }
  if (table.length !== Number(frames)) {
    throw new Error(`payload is ${table.length} frames, header says ${frames}`);
  }

  const idle = unpackInput(0);
  return {
    meta: {
      seed: Number(seed),
      mode,
      attack: attack === '-' ? '' : attack,
      difficulty: Number(difficulty),
    },
    frames: table.length,
    inputAt: (f) => table[f] ?? idle,
  };
}
