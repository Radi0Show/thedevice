

import { drawSpriteExt, ldx, ldy, rgb, clamp01 } from '../../../render/draw/gm.js';
import { gmlRound } from '../../../sim/gml.js';

function makeColorRgb(r, g, b) {
  return [Math.trunc(r) & 255, Math.trunc(g) & 255, Math.trunc(b) & 255];
}

function blendOf(c) {
  if (c == null) return null;
  const a = typeof c === 'number' ? [c & 255, (c >> 8) & 255, (c >> 16) & 255] : c;
  if (a[0] === 255 && a[1] === 255 && a[2] === 255) return null;
  return a;
}

function drawTriangleColor(ctx, x1, y1, x2, y2, x3, y3, col, alpha) {
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.fillStyle = rgb(col);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLineWidthColor(ctx, x1, y1, x2, y2, w, col, alpha) {
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.strokeStyle = rgb(col);
  ctx.lineWidth = w;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

const surfaces = new Map();
function surface(key, w, h) {
  let c = surfaces.get(key);
  if (!c) {
    c = document.createElement('canvas');
    surfaces.set(key, c);
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, w, h);
  return c;
}

function growtangle(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
}

function scrGetBox(state, i) {
  const gt = growtangle(state);
  if (!gt) return 0;
  const hw = (gt.spriteWidth ?? 75 * gt.image_xscale) * 0.5;
  const hh = (gt.spriteHeight ?? 75 * gt.image_yscale) * 0.5;
  switch (i) {
    case 0: return gt.x + hw;
    case 1: return gt.y - hh;
    case 2: return gt.x - hw;
    case 3: return gt.y + hh;
    case 4: return gt.x;
    case 5: return gt.y;
    default: return false;
  }
}

function instanceNumber(state, name) {
  let n = 0;
  for (const x of state.entities) if (x.alive && x.type.name === name) n += 1;
  return n;
}

export function drawObjRoaringknightQuickslash(ctx, e, state, helpers) {

  if (e.slash) {

    const entry = helpers.sprites.get(e.sprite_index);
    drawSpriteExt(ctx, entry, e.image_index, e.x, e.y,
      e.image_xscale, 1, e.image_angle, blendOf(e.image_blend), e.image_alpha);
  }
  return true;
}

export function drawObjRoaringknightQuickslashAttack(ctx, e, state, helpers) {

  if (e.image_alpha === 1 && !e.nodraw) {

    helpers.drawSelf(e, state);

  }

  const gt = growtangle(state);
  if (gt) {
    const surf = surface('quickslash_attack.hell_surface', 142, 142);
    const g = surf.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    const _gtx = scrGetBox(state, 2) + 5;
    const _gty = scrGetBox(state, 1) + 5;
    const grad = helpers.sprites.get('spr_rk_quickslash_marker_gradient');

    for (const s of state.entities) {
      if (!s.alive) continue;
      const n = s.type.name;
      if (n !== 'obj_roaringknight_quickslash' && n !== 'obj_roaringknight_quickslash_big') continue;
      if (s.slash) continue;

      drawSpriteExt(g, grad, s.image_index,
        (s.x - _gtx) + s.xdraw, (s.y - _gty) + s.ydraw,
        s.image_xscale, s.thickness, s.image_angle, blendOf(s.image_blend), s.image_alpha);
    }
    g.globalCompositeOperation = 'source-over';

    const sx = _gtx;
    const sy = _gty;
    helpers.defer(() => ctx.drawImage(surf, sx, sy));
  }
  return true;
}

export function drawObjKnightRotatingSlash(ctx, e, state, helpers) {
  const { sprites } = helpers;

  const bx = scrGetBox(state, 2) + 5;
  const by = scrGetBox(state, 1) + 5;
  const bw = scrGetBox(state, 0) - scrGetBox(state, 2) - 8;
  const bh = scrGetBox(state, 3) - scrGetBox(state, 1) - 8;
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, Math.max(0, bw), Math.max(0, bh));
  ctx.clip();

  if (e.state === 'aim' && e.timer > 0.5) {
    const grad = sprites.get('spr_rk_quickslash_marker_gradient');
    const mark = sprites.get('spr_rk_quickslash_marker');
    const sx = e.timer * 0.2;
    const sy = 1 + (2 * (1 - (e.timer / (e.slash_base + 6 + e.slash_offset))));

    for (let a = 0; a < e.slash_number; a++) {
      const dir = ((360 / (e.slash_number * 2)) * a) + e.random_offset + e.aim_direction;
      const color = makeColorRgb(e.r, e.g, e.b);
      drawSpriteExt(ctx, grad, 0, e.aim_x, e.aim_y, sx, sy, dir, color, 1);
    }

    for (let a = 0; a < e.slash_number; a++) {
      const dir = ((360 / (e.slash_number * 2)) * a) + e.random_offset + e.aim_direction;
      drawSpriteExt(ctx, mark, 0, e.aim_x, e.aim_y, sx, sy, dir, [0, 0, 0], 1);
    }

    for (const ln of [e.line2, e.line3]) {
      if (!(ln > 0.5)) continue;
      const alpha = 1 - (ln / 7);
      for (let a = 0; a < e.slash_number; a++) {
        const dir = ((360 / (e.slash_number * 2)) * a) + e.random_offset + e.aim_direction;
        const dirx = ldx(320, dir);
        const diry = ldy(320, dir);
        const color = makeColorRgb(e.r, e.g, e.b);
        const ox = ldx(ln * 6, dir + 90);
        const oy = ldy(ln * 6, dir + 90);

        drawLineWidthColor(ctx,
          e.aim_x + dirx + ox, e.aim_y + diry + oy,
          (e.aim_x - dirx) + ox, (e.aim_y - diry) + oy,
          e.line_width, color, alpha);
        drawLineWidthColor(ctx,
          (e.aim_x + dirx) - ox, (e.aim_y + diry) - oy,
          e.aim_x - dirx - ox, e.aim_y - diry - oy,
          e.line_width, color, alpha);
      }
    }
  }

  for (const s of state.entities) {
    if (!s.alive || s.type.name !== 'obj_roaringknight_slash') continue;
    const hx = ldx(640, s.direction);
    const hy = ldy(640, s.direction);
    const hxoff = ldx(s.width, s.direction + 90);
    const hyoff = ldy(s.width, s.direction + 90);
    const a = s.image_alpha;

    const color = makeColorRgb((1 - a) * 255, (1 - a) * 255, 255);

    if (s.slashdir > 0.5) {
      drawTriangleColor(ctx,
        s.x - (hx * a), s.y - (hy * a),
        s.x + hx + hxoff, s.y + hy + hyoff,
        (s.x + hx) - hxoff, (s.y + hy) - hyoff,
        color, 1);
    } else {
      drawTriangleColor(ctx,
        s.x + (hx * a), s.y + (hy * a),
        (s.x - hx) + hxoff, (s.y - hy) + hyoff,
        s.x - hx - hxoff, s.y - hy - hyoff,
        color, 1);
    }
  }

  ctx.restore();

  const me = surface('rotating_slash.me_surface', 640, 480);
  const g = me.getContext('2d');
  let _kX = e.x - state.view.x;
  let _kY = (e.y - state.view.y) + (Math.sin(state.frame * 0.1) * 2);
  const paired = instanceNumber(state, 'obj_knight_rotating_slash') > 1;
  if (paired) {
    _kX = gmlRound(_kX / 2) * 2;
    _kY = gmlRound(_kY / 2) * 2;
  }

  drawSpriteExt(g, sprites.get(e.sprite_index), e.image_index, _kX, _kY,
    e.image_xscale, e.image_yscale, e.image_angle, blendOf(e.image_blend), e.image_alpha);
  if (paired) {
    let _flickerY = state.frame % 2;
    if (!e.firstrot) {
      _flickerY = 1 - _flickerY;
    }

    g.globalCompositeOperation = 'destination-out';
    drawSpriteExt(g, sprites.get('spr_knight_line_grate'), 0, 0, _flickerY * 2, 2, 2, 0, null, 1);
    g.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(me, state.view.x, state.view.y);
  return true;
}

function remapClamped(inMin, inMax, outMin, outMax, v) {
  const r = outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);
  const lo = Math.min(outMin, outMax);
  const hi = Math.max(outMin, outMax);
  return r < lo ? lo : r > hi ? hi : r;
}

function irandomFrame(frand, frame, salt, n) {
  return Math.floor(frand(frame, salt) * (n + 1));
}

export function drawObjRoaringknightQuickslashBig(ctx, e, state, helpers) {
  if (e.slash) helpers.drawSelf(e, state);

  if (e.playerstrike === 1 || e.playerstrike === true) {
    const heart = state.soul;
    if (heart && heart.alive !== false) {
      const { sprites } = helpers;
      const frame = state.frame ?? 0;
      const dx = e.strikeJitter
        ? e.strikeJitter.xx
        : irandomFrame(helpers.frandCanvas, frame, 0x9b1e + e.seq * 2 + 1, 2) - 1;
      const dy = e.strikeJitter
        ? e.strikeJitter.yy
        : irandomFrame(helpers.frandCanvas, frame, 0x9b1e + e.seq * 2 + 2, 2) - 1;
      const fade = remapClamped(45, 55, 1, 0, e.timer ?? 0);

      const hs = sprites.get(heart.sprite_index) ?? sprites.get('spr_dodgeheart');

      if (hs) drawSpriteExt(ctx, hs, heart.image_index ?? 0, heart.x + dx, heart.y + dy, 1, 1, 0, null, 1);
      const slice = sprites.get('spr_rk_slash_heartslice');

      if (slice) drawSpriteExt(ctx, slice, e.cuty ?? 8, heart.x + dx, heart.y + dy, 1, 1, 0, null, fade);
    }
  }
  return true;
}
