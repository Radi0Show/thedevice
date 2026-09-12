

import { MAX_TENSION } from '../../sim/tension.js';
import { gmlRandomRange } from '../../sim/rng.js';

export const KAIZO_SIDEB_TP_CAP = 125;

export const TENSIONBAR_SPRITE_H = 196;

const GRAVITY_DIRECTION = 270;

const MARKER_GRAVITY = 0.35;

const C_ORANGE = [255, 128, 0];

const MARKER_SPRITE = 'spr_roaringknight_finalslash_mask';

export { MAX_TENSION };

export function kaizoSideb(state) {
  return !!(state.kaizo && state.kaizo.sideb);
}

export function kaizoTpscene(state) {
  if (typeof state.kaizo?.tpscene === 'number') return state.kaizo.tpscene;
  if (typeof state.knight?.k_tpscene === 'number') return state.knight.k_tpscene;
  return 0;
}

function endCutsceneVersion(state) {
  if (typeof state.kaizo?.endCutsceneVersion === 'number') {
    return state.kaizo.endCutsceneVersion;
  }
  return state.knight?.end_cutscene_version ?? 0;
}

export function kaizoTensionClampActive(state) {
  if (!kaizoSideb(state)) return false;
  const s = kaizoTpscene(state);
  return s >= 10 || s === -1;
}

export function kaizoTpbar(state) {
  const k = (state.kaizo ??= {});
  return (k.tpbar ??= { apparent: 0, current: 0, changetimer: 0, maxed: 0 });
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

export function kaizoTensionbarSprites(state) {
  return kaizoTensionClampActive(state)
    ? { bar: 'spr_tensionbar_sliced', cutout: 'spr_tensionbar_sliced_cutout', tplogo: false }
    : { bar: 'spr_tensionbar', cutout: 'spr_tensionbar_cutout', tplogo: true };
}

export function kaizoTensionbarLayout(state) {
  return { yoff: kaizoTensionClampActive(state) ? 32 : 0 };
}

const PI32 = Math.fround(Math.PI);

function markerMotion(m) {
  const gr = Math.fround(Math.fround(Math.fround(GRAVITY_DIRECTION) * PI32) / 180);
  m.hspeed = Math.fround(m.hspeed
    + Math.fround(Math.fround(m.gravity) * Math.fround(Math.cos(gr))));
  m.vspeed = Math.fround(m.vspeed
    + Math.fround(Math.fround(m.gravity) * -Math.fround(Math.sin(gr))));
  m.x = Math.fround(m.x + m.hspeed);
  m.y = Math.fround(m.y + m.vspeed);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function stepMarkerLerps(m) {
  if (!m.lerps.length) return;
  const keep = [];
  for (const t of m.lerps) {
    t.time += 1;
    m[t.name] = lerp(t.a, t.b, t.time / t.maxtime);
    if (t.time < t.maxtime) keep.push(t);
  }
  m.lerps = keep;
}

function makeMarker({ x, y, hspeed, vspeed, xscale, yy, sy, delay }) {
  const m = {
    x,
    y,
    hspeed,
    vspeed,
    gravity: MARKER_GRAVITY,
    image_xscale: xscale,
    image_yscale: xscale / 1.75,
    image_alpha: 1,
    age: 0,
    life: delay > 0 ? 35 + delay : 45,
    lerps: [],
  };
  if (delay > 0) {
    m.lerps.push({ name: 'vspeed', a: 0, b: vspeed, maxtime: delay, time: 0 });
    m.lerps.push({ name: 'y', a: sy, b: yy, maxtime: delay, time: 0 });
    m.lerps.push({ name: 'image_alpha', a: 1.5, b: 0, maxtime: 25 + delay, time: 0 });
  } else {
    m.y = yy;
    m.lerps.push({ name: 'image_alpha', a: 4.5, b: 0, maxtime: 45, time: 0 });
  }
  return m;
}

export function kaizoTpMarkers(state) {
  const k = (state.kaizo ??= {});
  return (k.tpMarkers ??= []);
}

function stepMarkers(state) {
  const live = kaizoTpMarkers(state);
  if (!live.length) return;
  const keep = [];
  for (const m of live) {
    m.age += 1;
    if (m.age >= m.life) continue;
    stepMarkerLerps(m);
    markerMotion(m);
    keep.push(m);
  }
  state.kaizo.tpMarkers = keep;
}

function publishSkin(state) {
  const sprites = kaizoTensionbarSprites(state);
  const bar = kaizoTpbar(state);
  state.tensionBar = {
    bar: sprites.bar,
    cutout: sprites.cutout,
    tplogo: sprites.tplogo,
    yoff: kaizoTensionbarLayout(state).yoff,
    trail: bar,
    markers: kaizoTpMarkers(state).map((m) => ({
      sprite: MARKER_SPRITE,
      subimage: 0,
      x: m.x,
      y: m.y,
      xscale: m.image_xscale,
      yscale: m.image_yscale,
      blend: C_ORANGE,
      alpha: m.image_alpha,
    })),
  };
}

export function kaizoTensionbarDraw(state) {
  const bar = kaizoTpbar(state);
  const out = { clamped: false, particles: 0, draws: 0 };

  stepMarkers(state);

  if (endCutsceneVersion(state) > 0) {
    publishSkin(state);
    return out;
  }

  if (kaizoTensionClampActive(state)) {
    const rng = state.gmlRng;
    const before = rng?.draws ?? 0;
    const live = kaizoTpMarkers(state);
    let i = 125.1;
    let sep = 4;
    if (state.tension >= 200) sep = 7.5;
    while (i <= state.tension) {

      const inScene = kaizoTpscene(state) >= 10;
      const hsp = inScene ? [-3, -5] : [-1, 1];
      const vsp = inScene ? [-2, -5] : [-2, -1];

      const tpnum = i / 2.5;

      const delay = inScene ? 0 : Math.ceil((i - 125) / 20);
      for (let h = 0; h < 3; h++) {

        const yy = (h * 1.5) + TENSIONBAR_SPRITE_H - (tpnum * 1.96);
        const sy = (h * 1.5) + TENSIONBAR_SPRITE_H - 98;

        const hspeed = rng ? gmlRandomRange(rng, hsp[0], hsp[1]) : 0;
        const vspeed = rng ? gmlRandomRange(rng, vsp[0], vsp[1]) : 0;
        const xscale = rng ? gmlRandomRange(rng, 0.46, 0.68) : 0.57;
        live.push(makeMarker({

          x: 3.4 + (h * 6.66),
          y: sy,
          hspeed,
          vspeed,
          xscale,
          yy,
          sy,
          delay,
        }));
        out.particles += 1;
      }
      i += sep;
    }
    out.draws = (rng?.draws ?? 0) - before;

    state.tension = clamp(state.tension, 0, KAIZO_SIDEB_TP_CAP);
    bar.apparent = clamp(bar.apparent, 0, KAIZO_SIDEB_TP_CAP);
    bar.current = clamp(bar.current, 0, KAIZO_SIDEB_TP_CAP);
    out.clamped = true;
  }

  const t = state.tension ?? 0;
  if (Math.abs(bar.apparent - t) < 20) bar.apparent = t;
  if (bar.apparent < t) bar.apparent += 20;
  if (bar.apparent > t) bar.apparent -= 20;

  if (bar.apparent !== bar.current) {
    bar.changetimer += 1;
    if (bar.changetimer > 15) {
      const d = bar.apparent - bar.current;
      if (d > 0) bar.current += 2;
      if (d > 10) bar.current += 2;
      if (d > 25) bar.current += 3;
      if (d > 50) bar.current += 4;
      if (d > 100) bar.current += 5;
      if (d < 0) bar.current -= 2;
      if (d < -10) bar.current -= 2;
      if (d < -25) bar.current -= 3;
      if (d < -50) bar.current -= 4;
      if (d < -100) bar.current -= 5;
      if (Math.abs(bar.apparent - bar.current) < 3) bar.current = bar.apparent;
    }
  }

  const tamt = Math.floor((bar.apparent / MAX_TENSION) * 100);
  bar.maxed = tamt >= 100 ? 1 : 0;

  publishSkin(state);

  return out;
}

export const tensionbarDraw = {
  name: 'kaizo_tensionbar_draw',
  stepOrder: 1000,
  create(e) {
    e.visible = false;
    e.depth = 0;
  },
  endStep(e, state) {
    kaizoTensionbarDraw(state);
  },
};

export function kaizoTensionPercent(state) {
  return Math.floor((kaizoTpbar(state).apparent / MAX_TENSION) * 100);
}

export function kaizoEffectiveTpCeiling(state) {
  return kaizoTensionClampActive(state) ? KAIZO_SIDEB_TP_CAP : MAX_TENSION;
}

export function kaizoCanAfford(state, cost) {
  return (state.tension ?? 0) >= cost;
}
