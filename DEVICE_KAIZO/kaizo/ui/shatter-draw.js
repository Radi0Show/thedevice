

import { sliceShatter, drawShatterFragment } from '../../render/shatter.js';

export const SHATTER_SHEET = 'spr_roaringknight_finalshatter';

const unpack = (c) => [c & 255, (c >> 8) & 255, (c >> 16) & 255];

const pieceInfo = new WeakMap();
const seenArray = new WeakMap();

const sliceCache = new Map();

function indexPieces(state) {
  const insts = state.knight?.shatter_insts;
  if (!Array.isArray(insts) || seenArray.has(insts)) return;
  seenArray.set(insts, true);
  for (let i = 0; i < insts.length; i++) {
    const p = insts[i];
    if (!p || p === -4) continue;
    pieceInfo.set(p, {
      i,

      ox: p.x - (state.view?.x ?? 0),
      oy: p.y - (state.view?.y ?? 0),
    });
  }
}

function slicesFor(entry, blend) {
  const key = blend.join(',');
  const hit = sliceCache.get(key);
  if (hit && hit.entry === entry) return hit.slices;
  const slices = sliceShatter(entry, {
    width: entry.meta?.w ?? 640,
    height: entry.meta?.h ?? 480,
    blend,

  });
  sliceCache.set(key, { entry, slices });
  return slices;
}

export function drawKaizoShatterPiece(ctx, e, state, helpers) {
  const entry = helpers?.sprites?.get(SHATTER_SHEET);

  if (!entry) return true;
  indexPieces(state);
  const info = pieceInfo.get(e);
  if (!info) return true;

  if (e.image_blend === undefined) return true;
  const slices = slicesFor(entry, unpack(e.image_blend));
  if (!slices.length) return true;
  drawShatterFragment(ctx, slices[info.i % slices.length], e.x, e.y, {
    ox: info.ox,
    oy: info.oy,

    xscale: e.image_xscale ?? 1,
    yscale: e.image_yscale ?? 1,
    angle: e.image_angle ?? 0,
    alpha: e.image_alpha ?? 1,
  });
  return true;
}

export const KAIZO_SHATTER_OVERRIDE = Object.freeze({
  kaizo_shatterpiece: drawKaizoShatterPiece,
});

