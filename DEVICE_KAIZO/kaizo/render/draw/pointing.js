

import {
  drawSpriteExt, drawBeamColor, mergeColor, pingpong, clamp01, ldx, ldy, rgb,
  c_white, c_gray, c_black,
} from '../../../render/draw/gm.js';
import { drawStarUserEvent0 } from '../../../render/draw/pointing-star.js';
import { gmlEq } from '../../../sim/gml.js';
import { KAIZO_TELEGRAPH_COLOR } from '../../attacks/kaizo-colors.js';

const c_blue = [0, 0, 255];

const TILE = 640;

const x2Cache = new WeakMap();
function x2(img) {
  if (!img) return null;
  const hit = x2Cache.get(img);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = img.width * 2;
  c.height = img.height * 2;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, c.width, c.height);
  x2Cache.set(img, c);
  return c;
}

let starCanvas = null;
function starSurface(w, h) {
  if (!starCanvas) starCanvas = document.createElement('canvas');
  if (starCanvas.width !== w || starCanvas.height !== h) {
    starCanvas.width = w;
    starCanvas.height = h;
  }
  return starCanvas;
}

const prevRect = new WeakMap();
const prevStarRect = new WeakMap();

function unionRect(a, b) {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

function drawSpritePartExt(ctx, entry, sub, left, top, w, h, dx, dy, xs, ys, color, alpha) {
  if (!entry || !entry.frames.length) return;
  const n = entry.frames.length;
  const img = entry.frames[(((sub | 0) % n) + n) % n];
  if (!img) return;
  const sw = Math.max(0, Math.min(w, img.width - left));
  const sh = Math.max(0, Math.min(h, img.height - top));
  if (sw <= 0 || sh <= 0 || left < 0 || top < 0 || left >= img.width || top >= img.height) return;
  const grey = color ? color[0] / 255 : 1;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha) * grey;
  ctx.drawImage(img, left, top, sw, sh, dx, dy, sw * xs, sh * ys);
  ctx.restore();
}

function scrDrawOutline(ctx, entry, e, dist, color, alpha, imageAlpha) {
  const ang = e.image_angle ?? 0;
  let xA = dist;
  let xB = 0;
  let yA = 0;
  let yB = dist;
  if (ang % 90 !== 0) {
    xA = ldx(dist, ang);
    xB = ldx(dist, ang + 90);
    yA = ldy(dist, ang + 90);
    yB = ldy(dist, ang);
  }
  const a = imageAlpha * alpha;

  for (const [dx, dy] of [[xA, yA], [-xA, -yA], [xB, yB], [-xB, -yB]]) {
    drawSpriteExt(ctx, entry, e.image_index ?? 0, e.x + dx, e.y + dy,
      e.image_xscale, e.image_yscale, ang, color, a, true);
  }
}

function fallbackBranch(e) {
  if (e.con >= 4) return 'none';
  if (e.con <= 1) return 'charge';
  if (e.con === 3 && e.timer > 0) return 'flare';
  return 'surface';
}

export function drawObjKnightPointingCone(ctx, e, state, helpers) {
  const { sprites, VIEW_W, VIEW_H, scratch } = helpers;
  const camX = state.view.x;
  const camY = state.view.y;

  if (e.con < 5) helpers.drawSelf(e, state);

  const branch = e.drawn_branch ?? fallbackBranch(e);
  if (branch === 'none') return true;

  const flow = sprites.get('spr_knight_bullet_flow');
  const mouthX = e.x + 22;
  const mouthY = e.y + 54;
  const width = (mouthX - camX) / 2;

  if (branch === 'charge') {
    const timer = e.drawn_timer ?? e.timer;
    if (timer < 28) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      drawSpritePartExt(ctx, flow, 2, timer * 1, timer * 4 + e.yoff - 2, width, 1, camX, mouthY, 2, 2, c_gray, 1);
      drawSpritePartExt(ctx, flow, 2, timer * 1, timer * 4 + e.yoff - 2, width, 1, camX, mouthY, 2, 2, c_gray, 1);

      if (timer % 2 === 0) {
        drawSpritePartExt(ctx, flow, 2, timer * 2, timer * 4 + e.yoff, width, 1, camX, mouthY, 2, 2, c_gray, 1);
      }

      drawSpritePartExt(ctx, flow, 2, timer * 2, timer * 4 + e.yoff, width, 1, camX, mouthY, 2, 2, c_gray, 1);
      ctx.restore();
    } else {

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(camX, mouthY, mouthX - camX + 1, 3);
      ctx.restore();
    }
    return true;
  }

  if (branch === 'flare') {
    const t = e.drawn_timer ?? e.timer;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSpritePartExt(ctx, flow, 2, (10 - t) * 2, e.yoff - (10 - t) * 4, width, 1, camX, mouthY, 2, 2, c_gray, t / 10);
    drawSpritePartExt(ctx, flow, 2, (10 - t) * 2, e.yoff + (10 - t) * 4, width, 1, camX, mouthY, 2, 2, c_gray, t / 10);
    drawSpritePartExt(ctx, flow, 2, (10 - t) * 2, e.yoff - (10 - t) * 4, width, 1, camX, mouthY, 2, 2, c_gray, t / 10);
    drawSpritePartExt(ctx, flow, 2, (10 - t) * 2, e.yoff + (10 - t) * 4, width, 1, camX, mouthY, 2, 2, c_gray, t / 10);
    ctx.restore();
    return true;
  }

  const angle = e.angle ?? 0;
  const target = e.target_angle || 60;

  const openAngle = angle > 0 ? angle + (e.draw_angle ?? 0) : 0;
  const xLeft = ldx(600, 180 + openAngle / 2);
  const yTop = ldy(600, 180 - openAngle / 2);
  const yBottom = ldy(600, 180 + openAngle / 2);
  const sx = mouthX - camX;
  const sy56 = e.y + 56 - camY;
  const sy58 = e.y + 58 - camY;

  const rect = [
    Math.max(0, Math.floor(Math.min(sx + xLeft, sx)) - 2),
    Math.max(0, Math.floor(Math.min(sy56 + yTop, sy56, sy58 + yBottom)) - 2),
    Math.min(VIEW_W, Math.ceil(Math.max(sx + xLeft, sx)) + 2),
    Math.min(VIEW_H, Math.ceil(Math.max(sy56 + yTop, sy56, sy58 + yBottom)) + 2),
  ];
  const clearR = unionRect(rect, prevRect.get(e));
  prevRect.set(e, rect);

  const buf = scratch(VIEW_W, VIEW_H);
  const b = buf.getContext('2d');
  b.imageSmoothingEnabled = false;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = 'source-over';
  b.globalAlpha = 1;
  b.clearRect(clearR[0], clearR[1], clearR[2] - clearR[0], clearR[3] - clearR[1]);

  b.save();
  b.beginPath();
  b.moveTo(sx + xLeft, sy56 + yTop);
  b.lineTo(sx, sy56);
  b.lineTo(sx + xLeft, sy58 + yBottom);
  b.closePath();
  b.clip();

  b.fillStyle = rgb(mergeColor(c_white, c_black, angle / target));
  b.fill();

  b.globalCompositeOperation = 'lighter';
  const bgX = e.drawn_bg_x ?? 0;
  const linesX = e.drawn_lines_x ?? 0;
  for (const name of ['spr_knight_bullet_flow', 'spr_knight_bullet_flow_alt']) {
    const sheet = sprites.get(name);
    if (!sheet || !sheet.frames.length) continue;
    const f0 = x2(sheet.frames[0]);
    const f1 = x2(sheet.frames[1 % sheet.frames.length]);
    if (f0) b.drawImage(f0, bgX, 0);
    if (f0) b.drawImage(f0, bgX + TILE, 0);
    if (f1) b.drawImage(f1, linesX, 0);
    if (f1) b.drawImage(f1, linesX + TILE, 0);
  }
  b.restore();

  const soul = state.soul;
  if (soul && soul.alive) {
    const hs = sprites.get(soul.sprite_index ?? 'spr_dodgeheart');
    if (hs && hs.frames.length) {
      const hn = hs.frames.length;
      const hi = ((Math.floor(soul.image_index ?? 0) % hn) + hn) % hn;
      b.save();
      b.globalCompositeOperation = 'destination-out';
      b.drawImage(hs.frames[hi], soul.x - camX - (hs.meta.ox ?? 0), soul.y - camY - (hs.meta.oy ?? 0));
      b.restore();
    }
  }

  const stars = state.entities.filter(
    (x) => x.alive && x.type.name === 'obj_knight_pointing_star',
  );
  if (stars.length) {

    let sr = null;
    for (const st of stars) {
      const pad = 48 * Math.max(1, st.image_xscale ?? 1);
      const stx = st.x - camX;
      const sty = st.y - camY;
      sr = unionRect(sr, [stx - pad, sty - pad, stx + pad, sty + pad]);
    }
    sr = [
      Math.max(0, Math.floor(sr[0])), Math.max(0, Math.floor(sr[1])),
      Math.min(VIEW_W, Math.ceil(sr[2])), Math.min(VIEW_H, Math.ceil(sr[3])),
    ];
    const sClear = unionRect(sr, prevStarRect.get(e));
    prevStarRect.set(e, sr);

    const sbuf = starSurface(VIEW_W, VIEW_H);
    const s = sbuf.getContext('2d');
    s.imageSmoothingEnabled = false;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-over';
    s.globalAlpha = 1;
    s.clearRect(sClear[0], sClear[1], sClear[2] - sClear[0], sClear[3] - sClear[1]);

    s.save();
    s.translate(-camX, -camY);
    for (const st of stars) if (st.image_xscale > 0.5) drawStarUserEvent0(s, st, sprites);
    s.restore();

    const grate = sprites.get('spr_knight_line_grate');
    if (grate && grate.frames.length) {
      const flick = e.drawn_star_flicker ?? 0;
      const g2 = x2(grate.frames[0]);
      const gx0 = Math.max(sr[0], 0);
      const gy0 = Math.max(sr[1], flick);
      const gx1 = Math.min(sr[2], g2.width);
      const gy1 = Math.min(sr[3], flick + g2.height);
      if (gx1 > gx0 && gy1 > gy0) {
        s.save();
        s.globalCompositeOperation = 'destination-out';
        s.drawImage(g2, gx0, gy0 - flick, gx1 - gx0, gy1 - gy0, gx0, gy0, gx1 - gx0, gy1 - gy0);
        s.restore();
      }
    }

    s.save();
    s.translate(-camX, -camY);
    for (const st of stars) if (st.image_xscale <= 0.5) drawStarUserEvent0(s, st, sprites);
    s.restore();

    const scw = sClear[2] - sClear[0];
    const sch = sClear[3] - sClear[1];
    if (scw > 0 && sch > 0) {
      b.save();
      b.globalCompositeOperation = 'source-atop';
      b.drawImage(sbuf, sClear[0], sClear[1], scw, sch, sClear[0], sClear[1], scw, sch);
      b.restore();
    }
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  const ow = rect[2] - rect[0];
  const oh = rect[3] - rect[1];
  if (ow > 0 && oh > 0) ctx.drawImage(buf, rect[0], rect[1], ow, oh, rect[0], rect[1], ow, oh);
  ctx.restore();

  return true;
}

export function drawObjKnightPointingStar(ctx, e, state, helpers) {
  const { sprites } = helpers;

  const coneUp = state.entities.some(
    (x) => x.alive && x.type.name === 'obj_knight_pointing_cone',
  );
  if (coneUp && e.con === 0 && (e.stay ?? 0) === 0) return true;

  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;

  const w = entry.frames[0].width;
  const h = entry.frames[0].height;
  const xs = e.image_xscale + 16 / w;
  const ys = e.image_yscale + 16 / h;

  let color = mergeColor(c_gray, KAIZO_TELEGRAPH_COLOR, clamp01(e.timer / 30));

  if (e.stay === 1) {
    color = mergeColor(c_white, KAIZO_TELEGRAPH_COLOR, clamp01(e.timer / 30));
  }

  const alpha = (Math.sin(e.timer * 3) + 1) * 0.25;

  if (e.con === 2 || e.con === 3) {
    let a = 1;
    let length = 120;
    const prog = clamp01(e.timer / 30);
    if (e.con === 2) {
      a = clamp01(prog - alpha);
      length = 50 * clamp01(prog - (e.timer % 2) * 0.75) + 50;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const beamcolor = e.difficulty >= 2 ? color : c_white;

    const sideb = !!(state.kaizo && state.kaizo.sideb);
    const dirs = e.blast_dir ?? [];
    const count = e.blast_stars ?? 0;

    for (let i = 0; i < count; i++) {
      let amult = 1;
      if (e.split_blast && i % 2 === 1) amult = 0.5;
      let beamWidth = 10;
      if (gmlEq(e.difficulty, 3.1)) {
        length *= 1.05;
        beamWidth = 8;
      }
      if (sideb || !e.split_blast || (e.split_blast && i % 2 === 0)) {

        drawBeamColor(ctx, e.x, e.y, length, beamWidth, dirs[i] ?? 0, beamcolor, a * amult);
      }
    }
    ctx.restore();
  }

  if (e.con === 1 || e.con === 2 || e.stay === 1) {
    drawSpriteExt(ctx, entry, 1, e.x, e.y, xs + 0.1, ys + 0.1, e.image_angle, null, alpha);
    drawSpriteExt(ctx, entry, 0, e.x, e.y, xs, ys, e.image_angle, color, 1);
  }

  if (e.con === 3 || e.con === 4) {
    drawSpriteExt(ctx, entry, 2, e.x, e.y, xs + 0.1, ys + 0.1, e.image_angle, null, (Math.sin(e.timer * 6) + 1) * 0.25);
    drawSpriteExt(ctx, entry, 2, e.x, e.y, xs, ys, e.image_angle, null, 1);
  }

  return true;
}

export function drawObjKnightPointingStarchild(ctx, e, state, helpers) {

  if (helpers.roaringOwnsIt(state)) return true;
  const { sprites } = helpers;

  if (e.con === 4) {
    const boom = sprites.get('spr_thrash_missile_explosion');
    const scale = (e.image_yscale + e.image_xscale) / 2;
    drawSpriteExt(ctx, boom, e.timer, e.x, e.y, scale, scale, e.image_angle - 90, c_blue, 1);
    return true;
  }

  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return false;

  const glow = pingpong(e.drawtimer ?? 0, 2) / 4;
  let glowcol = c_white;
  if (e.con >= 1) {
    if (e.con > 1) {
      glowcol = c_blue;
    } else {

      glowcol = mergeColor(c_white, c_blue, e.timer / 10);
    }
  }

  const imageAlpha = e.drawn_image_alpha ?? e.image_alpha ?? 1;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  scrDrawOutline(ctx, entry, e, e.image_xscale, glowcol, glow * imageAlpha, imageAlpha);
  if (e.con > 0) {
    drawSpriteExt(ctx, entry, 1, e.x, e.y, e.image_xscale, e.image_yscale,
      e.image_angle, e.outline ?? c_black, imageAlpha);
  }
  ctx.restore();

  drawSpriteExt(ctx, entry, 0, e.x, e.y, e.image_xscale, e.image_yscale,
    e.image_angle, e.image_blend ?? c_white, imageAlpha);

  return true;
}

