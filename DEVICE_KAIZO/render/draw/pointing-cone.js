


import { drawSpriteExt } from './gm.js';
import { drawStarUserEvent0 } from './pointing-star.js';

const BG_SPEED = 20;
const LINES_SPEED = 80;
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

const firstDraw = new WeakMap();



function drawSpritePart(ctx, entry, sub, left, top, w, h, dx, dy, xs, ys, alpha) {
  if (!entry || !entry.frames[sub]) return;
  const img = entry.frames[sub];
  const sw = Math.max(0, Math.min(w, img.width - left));
  const sh = Math.max(0, Math.min(h, img.height - top));
  if (sw <= 0 || sh <= 0 || left < 0 || top < 0 || left >= img.width || top >= img.height) return;
  ctx.save();

  ctx.globalAlpha = alpha * 0.5;
  ctx.drawImage(img, left, top, sw, sh, dx, dy, sw * xs, sh * ys);
  ctx.restore();
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


const drawAngle = new WeakMap();

const prevRect = new WeakMap();
const prevStarRect = new WeakMap();


function unionRect(a, b) {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

export function drawPointingCone(ctx, e, state, deps) {
  const { sprites, VIEW_W, VIEW_H, scratch } = deps;
  const flow = sprites.get('spr_knight_bullet_flow');


  if (e.con < 5) {
    const self = sprites.get(e.sprite_index);
    if (self) {
      drawSpriteExt(ctx, self, e.image_index, e.x, e.y,
        e.image_xscale, e.image_yscale, e.image_angle, null, e.image_alpha);
    }
  }


  if (e.con >= 4) return true;

  if (!firstDraw.has(e)) firstDraw.set(e, state.frame);
  const age = state.frame - firstDraw.get(e);

  const camX = state.view.x;
  const mouthX = e.x + 22;
  const mouthY = e.y + 54;


  if (e.con <= 1) {
    const width = (mouthX - camX) / 2;
    if (e.timer < 28) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawSpritePart(ctx, flow, 2, e.timer * 1, e.timer * 4 + e.yoff - 2, width, 1, camX, mouthY, 2, 2, 1);
      if (e.timer % 2 === 0) {
        drawSpritePart(ctx, flow, 2, e.timer * 2, e.timer * 4 + e.yoff, width, 1, camX, mouthY, 2, 2, 1);
      }
      ctx.restore();
    } else {

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(camX, mouthY, mouthX - camX, 2);
      ctx.restore();
    }
    return true;
  }


  if (e.con === 3 && e.timer > 0) {
    const width = (mouthX - camX) / 2;
    const t = e.timer;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSpritePart(ctx, flow, 2, (10 - t) * 2, e.yoff - (10 - t) * 4, width, 1, camX, mouthY, 2, 2, t / 10);
    drawSpritePart(ctx, flow, 2, (10 - t) * 2, e.yoff + (10 - t) * 4, width, 1, camX, mouthY, 2, 2, t / 10);
    ctx.restore();
    return true;
  }


  const angle = e.angle ?? 0;
  const target = e.target_angle || 60;
  if (angle <= 0) return true;


  const jitter = 1 - (drawAngle.get(e) ?? 0);
  drawAngle.set(e, jitter);
  const openAngle = angle + jitter;

  const rad = (a) => (a * Math.PI) / 180;
  const apexY = e.y + 56;
  const xLeft = 600 * Math.cos(rad(180 + openAngle / 2));
  const yTop = -600 * Math.sin(rad(180 - openAngle / 2));
  const yBottom = -600 * Math.sin(rad(180 + openAngle / 2));


  const mouthSX = mouthX - state.view.x;
  const apexSY = apexY - state.view.y;
  const rect = [
    Math.max(0, Math.floor(mouthSX + xLeft) - 2),
    Math.max(0, Math.floor(apexSY + yTop) - 2),
    Math.min(VIEW_W, Math.ceil(mouthSX) + 2),
    Math.min(VIEW_H, Math.ceil(apexSY + 2 + yBottom) + 2),
  ];

  const clearR = unionRect(unionRect(rect, prevRect.get(e)), prevStarRect.get(e));
  prevRect.set(e, rect);

  const buf = scratch(VIEW_W, VIEW_H);
  const b = buf.getContext('2d');
  b.imageSmoothingEnabled = false;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(clearR[0], clearR[1], clearR[2] - clearR[0], clearR[3] - clearR[1]);
  b.save();
  b.translate(-state.view.x, -state.view.y);


  const wedgePath = (g) => {
    g.beginPath();
    g.moveTo(mouthX + xLeft, apexY + yTop);
    g.lineTo(mouthX, apexY);
    g.lineTo(mouthX + xLeft, apexY + 2 + yBottom);
    g.closePath();
  };

  wedgePath(b);
  b.clip();

  const k = Math.max(0, Math.min(1, angle / target));
  const v = Math.round(255 * (1 - k));
  b.fillStyle = `rgb(${v},${v},${v})`;
  b.fill();

  b.setTransform(1, 0, 0, 1, 0, 0);


  if (flow && flow.frames.length >= 2) {
    const bgX = -((age * BG_SPEED) % TILE);
    const linesX = -((age * LINES_SPEED) % TILE);
    b.globalCompositeOperation = 'lighter';
    for (const [frame, sx] of [
      [0, bgX], [0, bgX + TILE],
      [1, linesX], [1, linesX + TILE],
    ]) {

      const img = x2(flow.frames[frame]);
      if (img) b.drawImage(img, sx, 0);
    }


    b.restore();


    const heart = state.soul;
    const hs = heart && sprites.get('spr_dodgeheart');
    if (hs && hs.frames[0]) {
      b.globalCompositeOperation = 'destination-out';
      b.save();
      b.translate(-state.view.x, -state.view.y);
      b.drawImage(hs.frames[0], heart.x, heart.y);
      b.restore();
    }
    b.globalCompositeOperation = 'source-over';
  } else {
    b.restore();
  }


  const stars = state.entities.filter(
    (x) => x.alive && x.type.name === 'obj_knight_pointing_star' && x.con === 0,
  );
  if (stars.length) {

    let sr = null;
    for (const st of stars) {
      const pad = 48 * Math.max(1, st.image_xscale ?? 1);
      const sx = st.x - state.view.x;
      const sy = st.y - state.view.y;
      sr = unionRect(sr, [sx - pad, sy - pad, sx + pad, sy + pad]);
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
    s.clearRect(sClear[0], sClear[1], sClear[2] - sClear[0], sClear[3] - sClear[1]);
    s.save();
    s.translate(-state.view.x, -state.view.y);

    for (const st of stars) if (st.image_xscale > 0.5) drawStarUserEvent0(s, st, sprites);

    const grate = sprites.get('spr_knight_line_grate');
    if (grate && grate.frames[0]) {
      const flick = (state.frame % 2) * 2;

      const g0 = grate.frames[0];
      const gx0 = Math.max(sr[0], 0);
      const gy0 = Math.max(sr[1], flick);
      const gx1 = Math.min(sr[2], g0.width * 2);
      const gy1 = Math.min(sr[3], flick + g0.height * 2);
      if (gx1 > gx0 && gy1 > gy0) {
        s.save();
        s.setTransform(1, 0, 0, 1, 0, 0);
        s.globalCompositeOperation = 'destination-out';
        s.drawImage(g0, gx0 / 2, (gy0 - flick) / 2, (gx1 - gx0) / 2, (gy1 - gy0) / 2,
          gx0, gy0, gx1 - gx0, gy1 - gy0);
        s.restore();
      }
    }

    for (const st of stars) if (st.image_xscale <= 0.5) drawStarUserEvent0(s, st, sprites);
    s.restore();
    s.globalCompositeOperation = 'source-over';


    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'source-over';
    const scw = sClear[2] - sClear[0];
    const sch = sClear[3] - sClear[1];
    if (scw > 0 && sch > 0) {
      b.drawImage(sbuf, sClear[0], sClear[1], scw, sch, sClear[0], sClear[1], scw, sch);
    }
  }


  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';

  const outR = unionRect(clearR, prevStarRect.get(e));
  const ow = Math.min(VIEW_W, outR[2]) - Math.max(0, outR[0]);
  const oh = Math.min(VIEW_H, outR[3]) - Math.max(0, outR[1]);
  if (ow > 0 && oh > 0) {
    const ox = Math.max(0, outR[0]);
    const oy = Math.max(0, outR[1]);
    ctx.drawImage(buf, ox, oy, ow, oh, ox, oy, ow, oh);
  }
  ctx.restore();

  return true;
}
