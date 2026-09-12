

import { spawn, destroy } from '../../sim/entity.js';
import {
  gmlChoose, gmlRandom, gmlIrandom, gmlIrandomRange,
} from '../../sim/rng.js';
import { mergeColor } from '../../sim/gml.js';

const gmUnpack = (c) => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
const gmPack = ([r, g, b]) => (r | (g << 8) | (b << 16)) >>> 0;
const C_WHITE = 16777215;
const C_RED = 255;
const C_BLUE = 16711680;

const SHATTER_HIT_FRONT = gmPack(mergeColor(gmUnpack(C_WHITE), gmUnpack(C_RED), 0.6));
const SHATTER_HIT_BACK = gmPack(mergeColor(gmUnpack(C_BLUE), gmUnpack(C_RED), 0.6));

const SHATTER_ORIGINS = [
  [39, 41], [122, 59], [184, 20], [245, 53], [378, 27], [545, 68],
  [15, 150], [190, 105], [363, 112], [496, 160], [613, 178], [92, 134],
  [577, 206], [41, 195], [165, 213], [354, 207], [578, 272], [262, 228],
  [63, 281], [445, 295], [293, 352], [163, 340], [21, 351], [120, 352],
  [607, 396], [72, 410], [124, 463], [222, 439], [519, 423], [419, 440],
  [313, 464],
];

export const shatterPiece = {
  name: 'kaizo_shatterpiece',
  create(e) {
    e.depth = -999999999;
    e.image_speed = 0;
  },
};

export const screenshatterController = {
  name: 'kaizo_screenshatter',
  step(e, state) {
    screenshatterStep(state);
  },
};

export function screenshatterCreate(state, { finalHit = false } = {}) {
  const k = state.knight;
  if (!k) return;

  if (k.shatter_sprs) {
    for (let i = 0; i < k.shatter_sprs.length; i++) {
      const inst = k.shatter_insts[i];
      if (inst && inst !== -4 && inst.alive) destroy(inst);
      k.shatter_insts[i] = -4;
      k.shatter_sprs[i] = -4;
    }
  }
  const rng = state.gmlRng;
  const shatterFlipX = gmlChoose(rng, [0, 1]);
  const shatterFlipY = gmlChoose(rng, [0, 1]);
  let shatterDelay = 0;

  k.shatter_sprs = [];
  k.shatter_insts = [];
  k.shatter_blend = [C_WHITE, C_BLUE];
  if (finalHit) {

    k.shatter_blend = [SHATTER_HIT_FRONT, SHATTER_HIT_BACK];
    shatterDelay = 6;

  }
  for (let i = 0; i <= 30; i++) {
    let sx = SHATTER_ORIGINS[i][0];
    if (shatterFlipX) sx = 640 - sx;
    let sy = SHATTER_ORIGINS[i][1];
    if (shatterFlipY) sy = 480 - sy;

    const p = spawn(state, shatterPiece, {
      x: state.view.x + sx,
      y: state.view.y + sy,
    });
    p.grav = 0.75;
    p.hsp = (sx - 320) / 320;
    p.vsp = (sy - 240) / 240;
    p.hsp *= gmlRandom(rng, 12);
    p.vsp *= gmlRandom(rng, 7);
    p.vsp -= 5;
    p.image_angle = gmlRandom(rng, -1);
    p.rot = gmlRandom(rng, -3);
    p.spin = 3600;
    p.spin_amt = gmlRandom(rng, -16);
    p.delay = shatterDelay;
    if (p.delay > 0) {

      p.x += -gmlIrandom(rng, 2);
      p.y += gmlIrandomRange(rng, -2, 2);
      p.xstart = p.x;
      p.ystart = p.y;
    }
    k.shatter_insts.push(p);

    k.shatter_sprs.push(p);
  }
  if (!state.entities.some((s) => s.alive && s.type.name === 'kaizo_screenshatter')) {
    spawn(state, screenshatterController, { x: 0, y: 0 });
  }
}

export function screenshatterStep(state) {
  const k = state.knight;
  if (!k || !k.shatter_insts) return;
  for (let i = 0; i < k.shatter_insts.length; i++) {
    const inst = k.shatter_insts[i];
    if (inst && inst !== -4 && inst.alive) {
      if (inst.delay > 0) {
        inst.delay -= 1;
        inst.x = inst.xstart + gmlIrandomRange(state.gmlRng, -inst.delay, inst.delay) / 2;
        inst.y = inst.ystart + gmlIrandomRange(state.gmlRng, -inst.delay, inst.delay) / 2;
      } else {
        inst.x += inst.hsp;
        inst.y += inst.vsp;
        inst.vsp += inst.grav;

        inst.spin += inst.spin_amt;
        let rspin = inst.spin % 360;
        inst.image_angle += inst.rot;

        if (rspin >= 180) rspin = 360 - rspin;

        if (rspin <= 90) inst.image_xscale = (90 - rspin) / 90;
        else inst.image_xscale = (rspin - 90) / -90;
        if (inst.image_xscale > 0) inst.image_blend = k.shatter_blend[0];
        else inst.image_blend = k.shatter_blend[1];
        if (inst.y > state.view.y + 1000) {

          destroy(inst);
        }
      }
    } else {

      k.shatter_insts[i] = -4;
      k.shatter_sprs[i] = -4;
      k.shatter_insts.splice(i, 1);
      k.shatter_sprs.splice(i, 1);
      i -= 1;
    }
  }
}

export function screenshatterClear(state) {
  const k = state.knight;
  if (!k || !k.shatter_insts) return;
  for (let i = 0; i < k.shatter_insts.length; i++) {
    const inst = k.shatter_insts[i];
    if (inst && inst !== -4 && inst.alive) {
      destroy(inst);
      k.shatter_insts[i] = -4;
      k.shatter_sprs[i] = -4;
      k.shatter_insts.splice(i, 1);
      k.shatter_sprs.splice(i, 1);
      i -= 1;
    }
  }
}
