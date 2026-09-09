



import { MASK_DATA as raw } from './data/masks.js';

function build(m) {
  return {
    name: m.name,
    w: m.w,
    h: m.h,
    originX: m.originX,
    originY: m.originY,
    bbox: m.bbox,

    px: m.rows.map((r) => Array.from(r, (c) => c === '1')),
  };
}

export const HEART_MASK = build(raw.heart);


export const HEART_RECT = {
  name: 'dodgeheart_rect',
  w: 20,
  h: 20,
  originX: 0,
  originY: 0,
  bbox: [0, 0, 19, 19],
  px: Array.from({ length: 20 }, () => new Array(20).fill(true)),
  axisRect: true,
};


export const HEART_RECT_WALL = { ...HEART_RECT, name: 'dodgeheart_rect_wall', axisRect: 'always' };


export const HEART_SMALL_MASK = build(raw.heartsmall);
export const BATTLEBG_MASK = build(raw.battlebg);


export const BATTLEBG_STRETCH_HITBOX_MASK = build(raw.battlebgStretchHitbox);


export const BATTLEBG_FIGHT_MASK = (() => {
  const src = build(raw.battlebg);
  const h = src.px.length;
  const w = src.px[0].length;
  const px = src.px.map((row, y) => row.map((v, x) => {
    if (v) return true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy;
        const xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && src.px[yy][xx]) return true;
      }
    }
    return false;
  }));
  return { ...src, name: 'battlebg_fight_effective', px };
})();
export const FOUNTAIN_MASK = build(raw.fountain);
export const TOOTH_MASK = build(raw.tooth);
export const STAR_MASK = build(raw.star);


export const STAR_FULL_MASK = build(raw.starfull);


export const DIAMOND_MASK = build(raw.diamondbullet);
export const PXWHITE2_MASK = build(raw.pxwhite2);
export const STARCHILD_MASK = build(raw.starchildparts);
export const SWORDOL_MASK = build(raw.swordol);
export const STARCHILD_TRAIL_MASK = build(raw.starchildtrail);
export const QUICKSLASH_MARKER_MASK = build(raw.quickslashmarker);


export const SMALLBULLET_MASK = build(raw.smallbullet);


export const STREAMDIAMOND_MASK = build(raw.streamdiamond);


export const WEIRDSHAPE_MASK = build(raw.weirdshape);


export const DIAMONDFORM_MASK = build(raw.diamondform);


export const SLASHTUNNEL_MASK = build(raw.slashtunnel);


export const CRESCENT_MASK = build(raw.crescenthitbox);


export const DIAMONDSWORD_MASK = build(raw.diamondsword);
export const DIAMONDBULLET_M_MASK = build(raw.diamondbullet_m);



export const SPRITE_MASKS = {
  spr_pxwhite2: PXWHITE2_MASK,
  spr_knight_starchild_parts: STARCHILD_MASK,

  spr_knight_starchild_trail: STARCHILD_TRAIL_MASK,
  spr_rk_quickslash_marker: QUICKSLASH_MARKER_MASK,
  spr_roaringknight_sword_ol: SWORDOL_MASK,
  spr_knight_diamondbullet_l: DIAMOND_MASK,

  spr_knight_bullet_star: STAR_FULL_MASK,
  spr_roaringknight_tooth: TOOTH_MASK,
  spr_rk_fountain_bullet: FOUNTAIN_MASK,
  spr_smallbullet: SMALLBULLET_MASK,
  spr_diamondbullet: STREAMDIAMOND_MASK,
  spr_knight_weird_shape: WEIRDSHAPE_MASK,
  spr_diamondbullet_form: DIAMONDFORM_MASK,
  spr_roaringknight_slash_tunnel: SLASHTUNNEL_MASK,
  spr_bullet_knightcrescent: CRESCENT_MASK,
  spr_knight_diamondswordbullet: DIAMONDSWORD_MASK,
  spr_knight_diamondbullet_m: DIAMONDBULLET_M_MASK,
};



const probeCache = new Map();
function probeMask(n) {
  let m = probeCache.get(n);
  if (!m) {
    const side = Math.max(1, Math.round(n));
    m = build({
      name: `probe${side}`,
      w: side,
      h: side,
      originX: 0,
      originY: 0,
      bbox: [0, 0, side - 1, side - 1],
      rows: Array.from({ length: side }, () => '1'.repeat(side)),
    });
    probeCache.set(n, m);
  }
  return m;
}



function rint(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}



export function collisionRectanglePrecise(x1, y1, x2, y2, e, mask) {
  if (!mask) return false;

  const sxs = e.image_xscale ?? 1;
  const sys = e.image_yscale ?? 1;
  const ang = e.image_angle ?? 0;
  const r = (ang * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const [bl, bt, br, bb] = mask.bbox;
  const lx0 = (bl - mask.originX) * sxs;
  const lx1 = (br + 1 - mask.originX) * sxs;
  const ly0 = (bt - mask.originY) * sys;
  const ly1 = (bb + 1 - mask.originY) * sys;
  let mnx = Infinity;
  let mxx = -Infinity;
  let mny = Infinity;
  let mxy = -Infinity;
  for (const u of [lx0, lx1]) {
    for (const v of [ly0, ly1]) {
      const wx = e.x + u * cos + v * sin;
      const wy = e.y - u * sin + v * cos;
      if (wx < mnx) mnx = wx;
      if (wx > mxx) mxx = wx;
      if (wy < mny) mny = wy;
      if (wy > mxy) mxy = wy;
    }
  }
  const ix0 = Math.max(x1, mnx);
  const ix1 = Math.min(x2, mxx);
  const iy0 = Math.max(y1, mny);
  const iy1 = Math.min(y2, mxy);
  if (ix0 > ix1 || iy0 > iy1) return false;
  const px0 = rint(ix0);
  const px1 = rint(ix1);
  const py0 = rint(iy0);
  const py1 = rint(iy1);
  const ax = rint(e.x);
  const ay = rint(e.y);
  for (let py = py0; py <= py1; py++) {
    for (let px = px0; px <= px1; px++) {
      const dx = px + 0.5 - ax;
      const dy = py + 0.5 - ay;
      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;
      const sx = Math.floor(u / sxs + mask.originX);
      if (sx < 0 || sx >= mask.w) continue;
      const sy = Math.floor(v / sys + mask.originY);
      if (sy < 0 || sy >= mask.h) continue;
      if (mask.px[sy][sx]) return true;
    }
  }
  return false;
}

export function scrPreciseHit(heart, e, mask, n = 3) {
  const half = n / 2;
  const hx = heart.x + 10;
  const hy = heart.y + 10;
  if (!mask) return false;
  return collisionRectanglePrecise(hx - half, hy - half, hx + half, hy + half, e, mask);
}



export function enginePairHit(heart, e, mask) {
  if (!mask) return false;

  return masksOverlap(
    heart.mask ?? HEART_MASK, heart.x, heart.y,
    mask, e.x, e.y, e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
  );
}


export function spriteMaskHit(e, heart) {
  const m = SPRITE_MASKS[e.sprite_index];
  if (!m) return null;
  return masksOverlap(
    heart.mask ?? HEART_MASK, heart.x, heart.y,
    m, e.x, e.y, e.image_xscale, e.image_yscale, e.image_angle,
  );
}





function rintHalfEven(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}



export function masksOverlap(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle = 0) {

  if (!bsx || !bsy) return false;
  if (maskA.axisRect) {

    const unrotated = ((bangle % 360) + 360) % 360 === 0;
    if (unrotated && maskA.axisRect !== 'always') {
      return masksOverlapPrecise(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
    }
    return masksOverlapRectA(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
  }
  return masksOverlapPrecise(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle);
}



function collisionTrig(bangle) {
  const a = ((bangle % 360) + 360) % 360;
  if (a % 90 === 0) {
    return [[1, 0], [0, 1], [-1, 0], [0, -1]][a / 90];
  }
  const r = (bangle * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r)];
}

function masksOverlapRectA(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle = 0) {

  const [cos, sin] = collisionTrig(bangle);

  const [al, at, ar, ab] = maskA.bbox;
  const aox = maskA.originX ?? 0;
  const aoy = maskA.originY ?? 0;
  const aLeft = ax - aox + al;
  const aRight = ax - aox + ar;
  const aTop = ay - aoy + at;
  const aBottom = ay - aoy + ab;

  const [bl, bt, br, bb] = maskB.bbox;
  const x0 = (bl - maskB.originX) * bsx;
  const x1 = (br + 1 - maskB.originX) * bsx;
  const y0 = (bt - maskB.originY) * bsy;
  const y1 = (bb + 1 - maskB.originY) * bsy;
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (const u of [x0, x1]) {
    for (const v of [y0, y1]) {
      const wx = u * cos + v * sin;
      const wy = -u * sin + v * cos;
      if (wx < minx) minx = wx;
      if (wx > maxx) maxx = wx;
      if (wy < miny) miny = wy;
      if (wy > maxy) maxy = wy;
    }
  }
  const left = Math.max(Math.ceil(aLeft), rintHalfEven(bx + minx));
  const right = Math.min(Math.floor(aRight), rintHalfEven(bx + maxx) - 1);
  const top = Math.max(Math.ceil(aTop), rintHalfEven(by + miny));
  const bottom = Math.min(Math.floor(aBottom), rintHalfEven(by + maxy) - 1);
  if (left > right || top > bottom) return false;

  for (let py = top; py <= bottom; py++) {
    for (let px = left; px <= right; px++) {
      const acx = Math.floor(px - (ax - aox));
      if (acx < 0 || acx >= maskA.w) continue;
      const acy = Math.floor(py - (ay - aoy));
      if (acy < 0 || acy >= maskA.h) continue;
      if (!maskA.px[acy][acx]) continue;

      const dx = px - bx;
      const dy = py - by;
      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;
      const sx = Math.floor(u / bsx + maskB.originX);
      if (sx < 0 || sx >= maskB.w) continue;
      const sy = Math.floor(v / bsy + maskB.originY);
      if (sy < 0 || sy >= maskB.h) continue;
      if (maskB.px[sy][sx]) return true;
    }
  }

  return false;
}

function masksOverlapPrecise(maskA, ax, ay, maskB, bx, by, bsx, bsy, bangle = 0) {

  const rotated = ((bangle % 360) + 360) % 360 !== 0;
  const px = rotated ? bx : Math.round(bx);
  const py = rotated ? by : Math.round(by);
  const invMap = rotated ? (v) => Math.ceil(v) - 1 : Math.floor;
  const [al, at, ar, ab] = maskA.bbox;
  const [bl, bt, br, bb] = maskB.bbox;


  const [cos, sin] = collisionTrig(bangle);


  const lx0 = (bl - maskB.originX) * bsx;
  const lx1 = (br + 1 - maskB.originX) * bsx;
  const ly0 = (bt - maskB.originY) * bsy;
  const ly1 = (bb + 1 - maskB.originY) * bsy;
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (const u of [lx0, lx1]) {
    for (const v of [ly0, ly1]) {
      const wx = u * cos + v * sin;
      const wy = -u * sin + v * cos;
      if (wx < minx) minx = wx;
      if (wx > maxx) maxx = wx;
      if (wy < miny) miny = wy;
      if (wy > maxy) maxy = wy;
    }
  }
  const left = Math.floor(px + minx);
  const right = Math.ceil(px + maxx) - 1;
  const top = Math.floor(py + miny);
  const bottom = Math.ceil(py + maxy) - 1;


  const aox = maskA.originX ?? 0;
  const aoy = maskA.originY ?? 0;
  for (let cy = at; cy <= ab; cy++) {
    const rowA = maskA.px[cy];
    const wy = ay + cy - aoy;
    if (wy < top || wy > bottom) continue;
    const dy = wy - py;

    for (let cx = al; cx <= ar; cx++) {
      if (!rowA[cx]) continue;
      const wx = ax + cx - aox;
      if (wx < left || wx > right) continue;
      const dx = wx - px;

      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;

      const sx = invMap(u / bsx + maskB.originX);
      if (sx < 0 || sx >= maskB.w) continue;
      const sy = invMap(v / bsy + maskB.originY);
      if (sy < 0 || sy >= maskB.h) continue;

      if (maskB.px[sy][sx]) return true;
    }
  }
  return false;
}






export const QUICKSLASH_SHAPE = { bbox: [2, 26, 241, 28], ox: 125, oy: 27, w: 250, h: 48 };


export const QUICKSLASH_MASK = (() => {
  const [bx0, by0, bx1, by1] = QUICKSLASH_SHAPE.bbox;
  const px = [];
  for (let y = 0; y < QUICKSLASH_SHAPE.h; y++) {
    const row = [];
    for (let x = 0; x < QUICKSLASH_SHAPE.w; x++) {
      row.push(x >= bx0 && x <= bx1 && y >= by0 && y <= by1);
    }
    px.push(row);
  }
  return {
    name: 'rk_quickslash_rect',
    w: QUICKSLASH_SHAPE.w,
    h: QUICKSLASH_SHAPE.h,
    originX: QUICKSLASH_SHAPE.ox,
    originY: QUICKSLASH_SHAPE.oy,
    bbox: QUICKSLASH_SHAPE.bbox,
    px,
  };
})();

SPRITE_MASKS.spr_rk_quickslash = QUICKSLASH_MASK;


function localBBox(meta, sx, sy) {
  const [bl, bt, br, bb] = meta.bbox;
  return {
    x0: (bl - meta.ox) * sx,

    x1: (br + 1 - meta.ox) * sx,
    y0: (bt - meta.oy) * sy,
    y1: (bb + 1 - meta.oy) * sy,
  };
}


export function rotatedRectCorners(meta, x, y, sx, sy, angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const b = localBBox(meta, sx, sy);
  const pts = [];
  for (const u of [b.x0, b.x1]) {
    for (const v of [b.y0, b.y1]) {

      pts.push({ x: x + u * cos + v * sin, y: y - u * sin + v * cos });
    }
  }

  return [pts[0], pts[1], pts[3], pts[2]];
}


function aabbHitsOBB(rx0, ry0, rx1, ry1, corners) {
  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: corners[1].x - corners[0].x, y: corners[1].y - corners[0].y },
    { x: corners[3].x - corners[0].x, y: corners[3].y - corners[0].y },
  ];
  const rect = [
    { x: rx0, y: ry0 },
    { x: rx1, y: ry0 },
    { x: rx1, y: ry1 },
    { x: rx0, y: ry1 },
  ];

  for (const a of axes) {
    const len = Math.hypot(a.x, a.y);
    if (len === 0) continue;
    const ax = a.x / len;
    const ay = a.y / len;

    let amin = Infinity;
    let amax = -Infinity;
    for (const p of rect) {
      const d = p.x * ax + p.y * ay;
      if (d < amin) amin = d;
      if (d > amax) amax = d;
    }
    let bmin = Infinity;
    let bmax = -Infinity;
    for (const p of corners) {
      const d = p.x * ax + p.y * ay;
      if (d < bmin) bmin = d;
      if (d > bmax) bmax = d;
    }
    if (amax < bmin || bmax < amin) return false;
  }
  return true;
}



export function scrPreciseHitRotatedRect(heart, e, meta, n = 3) {
  const half = n / 2;
  const hx = heart.x + 10;
  const hy = heart.y + 10;
  const corners = rotatedRectCorners(
    meta,
    e.x,
    e.y,
    e.image_xscale ?? 1,
    e.image_yscale ?? 1,
    e.image_angle ?? 0,
  );
  return aabbHitsOBB(hx - half, hy - half, hx + half, hy + half, corners);
}



export function collisionLineRect(x1, y1, x2, y2, rx0, ry0, rx1, ry1) {

  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 4));
  if (steps <= 0) {
    const px = Math.floor(x1);
    const py = Math.floor(y1);
    return px >= rx0 && px <= rx1 && py >= ry0 && py <= ry1;
  }
  for (let i = 0; i <= steps; i++) {
    const px = Math.floor(x1 + ((x2 - x1) * i) / steps);
    const py = Math.floor(y1 + ((y2 - y1) * i) / steps);
    if (px >= rx0 && px <= rx1 && py >= ry0 && py <= ry1) return true;
  }
  return false;
}


export function heartBBox(heart) {

  const [l, t, r, b] = (heart.mask ?? HEART_MASK).bbox;

  return [heart.x + l, heart.y + t, heart.x + r, heart.y + b];
}




export const GRAZE_MASK = build({
  name: 'spr_grazemask',
  w: 50,
  h: 50,
  originX: 25,
  originY: 25,
  bbox: [0, 0, 49, 49],
  rows: Array.from({ length: 50 }, () => '1'.repeat(50)),
})

GRAZE_MASK.axisRect = 'always';



const grazeScaled = new Map();
export function grazeMaskAt(factor) {
  if (!(factor > 1)) return GRAZE_MASK;
  const key = factor.toFixed(4);
  const hit = grazeScaled.get(key);
  if (hit) return hit;
  const side = Math.round(50 * factor);
  const half = side / 2;
  const m = build({
    name: 'spr_grazemask',
    w: side,
    h: side,
    originX: half,
    originY: half,
    bbox: [0, 0, side - 1, side - 1],
    rows: Array.from({ length: side }, () => '1'.repeat(side)),
  });
  m.axisRect = 'always';
  grazeScaled.set(key, m);
  return m;
}
