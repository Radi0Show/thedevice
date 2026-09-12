

import {
  drawSpriteExt, drawBeamColor, mergeColor, clamp01, tinted, pingpong, ldx, ldy,
  c_white, c_black, c_red,
} from '../../../render/draw/gm.js';
import { screenCut } from '../../../render/draw/roaring.js';
import { FONTS, drawSpriteText } from '../../../render/text.js';
import { PARTY } from '../../../sim/damage.js';
import { charIdOf } from '../../party/roster.js';
import {
  kaizoCharboxGloom, kaizoGloomBarSegment, kaizoSideb, KAIZO_GLOOM_COLOR,
} from '../../party/gloom.js';
import { KAIZO_TELEGRAPH_COLOR } from '../../attacks/kaizo-colors.js';

const W = 640;
const H = 480;

const C_DKGRAY = [64, 64, 64];

const C_MAROON = [128, 0, 0];

const C_AQUA = [0, 255, 255];

const C_FUCHSIA = [255, 0, 255];

const C_LIME = [0, 255, 0];

const C_YELLOW = [255, 255, 0];

const C_PURPLE = [128, 0, 128];

const C_TEAL = [0, 128, 128];

const C_BLUE = [0, 0, 255];

const C_RED_CSS = [255, 0, 0];

const SIDEB_VORTEX = [C_TEAL, C_BLUE, C_AQUA, mergeColor(C_FUCHSIA, C_PURPLE, 0.4), C_TEAL];

const CHAR_ICON = ['spr_nothing', 'spr_headkris', 'spr_headsusie', 'spr_headralsei', 'spr_headnoelle'];

const HPCOLOR = [C_AQUA, C_FUCHSIA, C_LIME, C_YELLOW];

const LINE_OUTLINE_OFFSETS = [[0, 2], [2, 0], [2, 2], [-2, -2], [-2, 2], [-2, 2], [0, -2], [-2, 0]];

const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

function isWhite(b) {
  return b == null || (Array.isArray(b) && b[0] === 255 && b[1] === 255 && b[2] === 255);
}

function isDkgray(b) {
  return Array.isArray(b) && b[0] === 64 && b[1] === 64 && b[2] === 64;
}

const blendOrNull = (b) => (isWhite(b) ? null : b);

function withBlock(state, name) {
  return state.entities
    .filter((x) => x.alive && x.type.name === name)
    .sort((a, b) => b.seq - a.seq);
}

const surfaces = {};
function surf(key, w = W, h = H) {
  let c = surfaces[key];
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    surfaces[key] = c;
  }
  return c;
}

function makeColorHsv(h, s, v) {
  const hh = ((h / 255) * 6) % 6;
  const ss = s / 255;
  const vv = v / 255;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - ss * f);
  const t = vv * (1 - ss * (1 - f));
  const map = [[vv, t, p], [q, vv, p], [p, vv, t], [p, q, vv], [t, p, vv], [vv, p, q]];
  const c = map[i % 6];
  return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
}

function makeColorRgb(r, g, b) {
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function drawTiled(g, entry, sub, x, y) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[sub % entry.frames.length];
  if (!img) return;
  const tw = img.width;
  const th = img.height;
  let ox = x % tw;
  if (ox > 0) ox -= tw;
  let oy = y % th;
  if (oy > 0) oy -= th;
  for (let py = oy; py < H; py += th) {
    for (let px = ox; px < W; px += tw) g.drawImage(img, px, py, tw, th);
  }
}

function drawOutlineExt(g, entry, sub, x, y, xs, ys, angle, color, alpha, dist) {
  let xA = dist;
  let xB = 0;
  let yA = 0;
  let yB = dist;
  if (angle % 90 !== 0) {
    xA = ldx(dist, angle);
    xB = ldx(dist, angle + 90);
    yA = ldy(dist, angle + 90);
    yB = ldy(dist, angle);
  }
  drawSpriteExt(g, entry, sub, x + xA, y + yA, xs, ys, angle, color, alpha, true);
  drawSpriteExt(g, entry, sub, x - xA, y - yA, xs, ys, angle, color, alpha, true);
  drawSpriteExt(g, entry, sub, x + xB, y + yB, xs, ys, angle, color, alpha, true);
  drawSpriteExt(g, entry, sub, x - xB, y - yB, xs, ys, angle, color, alpha, true);
}

function drawRoaringStar(g, e, sprites, userEvent) {
  const entry = sprites.get(e.sprite_index);
  if (!entry || !entry.frames.length) return;
  const top = sprites.get('spr_knight_bullet_star_top') ?? entry;
  const bottom = sprites.get('spr_knight_bullet_star_bottom') ?? entry;

  const xs = e.image_xscale + 16 / entry.frames[0].width;
  const ys = e.image_yscale + 16 / entry.frames[0].height;
  const split = e.split ?? 0;
  const ease = e.splitease ?? 0;
  const tx = e.x + ease / 2;
  const ty = e.y + ease;
  const bx = e.x - ease / 2;
  const by = e.y - ease;

  if (userEvent === 0) {

    if (split < 2) {
      drawSpriteExt(g, entry, 0, e.x, e.y, xs, ys, e.image_angle, blendOrNull(e.image_blend), e.image_alpha);
    } else {
      drawSpriteExt(g, top, 0, tx, ty, xs, ys, e.image_angle, blendOrNull(e.image_blend), e.image_alpha);
      drawSpriteExt(g, bottom, 0, bx, by, xs, ys, e.image_angle, blendOrNull(e.image_blend), e.image_alpha);
    }
    return;
  }

  const alpha = (Math.sin(e.timer * 3) + 1) * 0.25;

  if (e.con === 2 || e.con === 2.5 || e.con === 3) {
    let a = 1;
    let length = 120;
    if (e.con === 2) {
      a = clamp01(e.timer / 30 - alpha);
      length = 50 * clamp01(e.timer / 30 - (e.timer % 2) * 0.75) + 50;
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    drawBeamColor(g, tx, ty, length, 10, 90, c_white, a);
    drawBeamColor(g, bx, by, length, 10, 156, c_white, a);
    drawBeamColor(g, tx, ty, length, 10, 24, c_white, a);
    drawBeamColor(g, bx, by, length, 10, 270, c_white, a);
    drawBeamColor(g, tx, ty, length, 10, 336, c_white, a);
    drawBeamColor(g, bx, by, length, 10, 204, c_white, a);
    g.restore();
  }

  if (e.con === 1 || e.con === 2 || e.con === 2.5) {
    const color = mergeColor(c_white, KAIZO_TELEGRAPH_COLOR, clamp01(e.timer / 30));
    drawSpriteExt(g, entry, 1, tx, ty, xs + 0.1, ys + 0.1, 0, null, alpha);
    drawSpriteExt(g, entry, 0, tx, ty, xs, ys, 0, color, 1);
    if (split >= 2) {
      drawSpriteExt(g, bottom, 1, bx, by, xs + 0.1, ys + 0.1, 0, null, alpha);
      drawSpriteExt(g, bottom, 0, bx, by, xs, ys, 0, color, 1);
    }
  }

  if (e.con === 3 || e.con === 4) {
    const s = (Math.sin(e.timer * 6) + 1) * 0.25;
    drawSpriteExt(g, entry, 2, tx, ty, xs + 0.1, ys + 0.1, 0, null, s);
    drawSpriteExt(g, entry, 2, tx, ty, xs, ys, 0, null, 1);
    if (split >= 2) {
      drawSpriteExt(g, bottom, 2, bx, by, xs + 0.1, ys + 0.1, 0, null, s);
      drawSpriteExt(g, bottom, 2, bx, by, xs, ys, 0, null, 1);
    }
  }
}

function drawKnightRows(g, entry, e, time, originX, originY) {
  if (!entry || !entry.frames.length) return;
  const n = entry.frames.length;
  const idx = ((Math.floor(e.knight_sprite_image ?? 0) % n) + n) % n;
  const frame = entry.frames[idx];
  if (!frame) return;
  const img = isWhite(e.image_blend) ? frame : tinted(frame, e.image_blend);

  const bl = entry.meta.bbox ? entry.meta.bbox[0] : 0;
  const bt = entry.meta.bbox ? entry.meta.bbox[1] : 0;
  const h = frame.height;
  const bob = Math.sin(e.bobble_count * 0.1) * e.bobble_amp;
  const intensify = e.intensify ?? 0;
  const fakeAlpha = e.fake_alpha ?? 1;
  const rowY = (a) => originY + e.fake_y + a * 2 + bob - 10 - bt * 2;

  if (intensify > 1.5) {
    g.save();
    g.globalAlpha = clamp01(fakeAlpha * 0.75);
    for (let a = 0; a < h; a++) {
      const off = Math.sin((a + time * 4) * 0.15) * (intensify - 1.5) * 8;
      const x = a % 2 === 0
        ? originX + e.fake_x - 70 + off
        : originX + e.fake_x - 70 - off;
      g.drawImage(img, bl, a, 70, 1, x, rowY(a), 140, 2);
    }
    g.restore();
  }

  g.save();
  g.globalAlpha = clamp01(fakeAlpha);
  for (let a = 0; a < h; a++) {
    const x = originX + e.fake_x - 70 + Math.sin((a + time * 4) * 0.2) * intensify * 0.3;
    g.drawImage(img, bl, a, 70, 1, x, rowY(a), 140, 2);
  }
  g.restore();
}

const maskEntries = new Map();
function maskEntry(mask, color, bakeMask) {
  const key = `${mask.name}|${color[0]},${color[1]},${color[2]}`;
  let en = maskEntries.get(key);
  if (!en) {
    const hex = `#${[color[0], color[1], color[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    en = {
      frames: [bakeMask(mask, hex)],
      meta: { ox: mask.originX, oy: mask.originY, w: mask.w, h: mask.h },
    };
    maskEntries.set(key, en);
  }
  return en;
}

function drawLineSprite(g, line, dx, dy, color, sprites, helpers) {
  const alpha = line.image_alpha ?? 1;
  const entry = sprites.get(line.sprite_index);
  if (entry && entry.frames.length) {
    drawSpriteExt(g, entry, line.image_index ?? 0, line.x + dx, line.y + dy,
      line.image_xscale, line.image_yscale, line.image_angle, blendOrNull(color), alpha);
    return;
  }
  if (!line.mask || !line.mask.px) return;
  const en = maskEntry(line.mask, color ?? c_white, helpers.bakeMask);
  drawSpriteExt(g, en, 0, line.x + dx, line.y + dy,
    line.image_xscale, line.image_yscale, line.image_angle, null, alpha);
}

function takeScreenCut(my, e, state, sprites) {
  screenCut.taken = true;
  const vx = state.view.x;
  const vy = state.view.y;
  const midway = W * 0.5;

  const src = document.createElement('canvas');
  src.width = W;
  src.height = H;
  {
    const g = src.getContext('2d');
    g.imageSmoothingEnabled = false;

    g.globalAlpha = clamp01(e.darkness);
    g.drawImage(my, 0, 0);
    g.globalAlpha = 1;

    const heart = state.soul;
    if (heart && heart.alive) {
      const hs = sprites.get(heart.sprite_index ?? 'spr_dodgeheart');
      if (hs) {
        drawSpriteExt(g, hs, heart.image_index ?? 0, heart.x - vx, heart.y - vy,
          heart.image_xscale ?? 1, heart.image_yscale ?? 1, heart.image_angle ?? 0,
          blendOrNull(heart.image_blend), heart.image_alpha ?? 1);
      }
    }
  }

  for (let i = 0; i < 2; i++) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0);

    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    if (i === 0) {

      g.fillRect(midway + 120, -1, W - (midway + 120), H + 1);

      g.beginPath();
      g.moveTo(midway - 120, -1);
      g.lineTo(midway + 120, H);
      g.lineTo(midway + 120, -1);
      g.closePath();
      g.fill();
    } else {

      g.fillRect(-1, 0, midway - 119 + 1, H);

      g.beginPath();
      g.moveTo(midway - 120, 0);
      g.lineTo(midway - 120, H);
      g.lineTo(midway + 120, H);
      g.closePath();
      g.fill();
    }
    screenCut.halves[i] = c;
  }
}

function drawHpHud(state, sprites) {
  const hud = surf('hp_surf', 360, 32);
  const g = hud.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, 360, 32);

  const chars = [charIdOf(state, 0), charIdOf(state, 1), charIdOf(state, 2)];
  const charamt = chars.filter((c) => c > 0).length;
  const xs = 180 - charamt * 60;
  const sideb = kaizoSideb(state);

  for (let i = 0; i < 3; i++) {
    const ch = chars[i];
    if (ch === 0) continue;
    const icon = CHAR_ICON[ch] ?? CHAR_ICON[0];
    const charcolor = HPCOLOR[ch - 1] ?? c_white;

    const hp = state.partyHp?.[i] ?? 0;
    const maxhp = state.partyMaxhp?.[i] ?? PARTY[i]?.maxhp ?? 0;

    let charind = 0;
    if (state.charaction?.[i] === 10 && hp > 0) charind = 4;
    const x = xs + i * 120;

    g.fillStyle = '#000000';
    g.fillRect(x, 0, 120, 33);

    const ic = sprites.get(icon);
    if (ic && ic.frames.length) drawSpriteExt(g, ic, charind, x + 3, 4, 1, 1, 0, null, 1);

    let tc = null;
    if (maxhp > 0 && hp / maxhp <= 0.25) tc = rgb(C_YELLOW);
    if (hp <= 0) tc = rgb(C_RED_CSS);

    let curColor = tc;
    if (sideb && kaizoCharboxGloom(state, ch) > 0) curColor = KAIZO_GLOOM_COLOR;

    drawSpriteText(g, sprites, FONTS.hp, hp, x + 72, 4, { halign: 'right', color: curColor });

    const slash = sprites.get('spr_hpslash');
    if (slash && slash.frames.length) drawSpriteExt(g, slash, 0, x + 71, 6, 1, 1, 0, null, 1);

    drawSpriteText(g, sprites, FONTS.hp, maxhp, x + 117, 4, { halign: 'right', color: tc });

    g.fillStyle = '#000000';
    g.fillRect(x + 39, 16, 78, 11);

    g.fillStyle = rgb(C_MAROON);
    g.fillRect(x + 40, 17, 76, 9);

    if (hp > 0 && maxhp > 0) {
      g.fillStyle = rgb(charcolor);
      const fill = Math.ceil((hp / maxhp) * 75);
      g.fillRect(x + 40, 17, fill + 1, 9);

      if (sideb) {
        const seg = kaizoGloomBarSegment(state, ch, maxhp);
        if (seg) {
          const xx = x + 40;
          g.fillStyle = seg.color;

          g.fillRect(xx + seg.lx, 17, seg.rx - seg.lx + 1, 9);
        }
      }
    }
  }
  return hud;
}

export function drawObjKnightRoaring2(ctx, e, state, helpers) {
  const { sprites, roaringCover } = helpers;
  const time = state.frame ?? 0;
  const vx = state.view.x;
  const vy = state.view.y;

  if (e.stop && (screenCut.taken || !e.do_fake_screen)) {
    if (screenCut.taken) {

      const self = sprites.get(e.sprite_index);
      if (self && self.frames.length) {
        drawSpriteExt(ctx, self, e.image_index ?? 0, e.x, e.y,
          e.image_xscale ?? 1, e.image_yscale ?? 1, e.image_angle ?? 0,
          blendOrNull(e.image_blend), e.image_alpha ?? 1);
      }
    }
    return true;
  }

  const ball = surf('ball');
  const bg = ball.getContext('2d');
  bg.imageSmoothingEnabled = false;
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.globalCompositeOperation = 'source-over';
  bg.globalAlpha = 1;
  bg.clearRect(0, 0, W, H);

  const flow = sprites.get('spr_knight_bullet_flow');
  drawTiled(bg, flow, 0, e.fake_x + time * 2, e.fake_y);
  bg.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) drawTiled(bg, flow, 0, e.fake_x + time * 2, e.fake_y);
  bg.globalCompositeOperation = 'source-over';

  bg.globalCompositeOperation = 'multiply';
  const cx = e.fake_x;
  const cy = e.fake_y + 57;
  const ring = (radius, outer) => {
    if (radius <= 0) return;
    const grad = bg.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, outer);
    bg.fillStyle = grad;
    bg.beginPath();
    bg.arc(cx, cy, radius, 0, Math.PI * 2);
    bg.fill();
  };
  for (let a = 0; a < 6; a++) ring(1800 - ((e.ball_counter + 300 * a) % 1800), '#595959');
  ring(640, '#000000');
  bg.globalCompositeOperation = 'source-over';

  const starC = surf('star');
  const sg = starC.getContext('2d');
  sg.imageSmoothingEnabled = false;
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.globalCompositeOperation = 'source-over';
  sg.globalAlpha = 1;
  sg.clearRect(0, 0, W, H);
  sg.save();
  sg.translate(-vx, -vy);

  for (const p of withBlock(state, 'obj_particle_generic')) {
    const entry = sprites.get(p.sprite_index);
    if (entry && entry.frames.length) {
      drawSpriteExt(sg, entry, p.image_index, p.x, p.y,
        p.image_xscale, p.image_yscale, p.image_angle, blendOrNull(p.image_blend), p.image_alpha);
    }
  }

  const stars = withBlock(state, 'obj_knight_roaring_star');
  const drawStar = (st) => drawRoaringStar(sg, st, sprites, st.con === 0 ? 0 : 1);
  for (const st of stars) { if (!isWhite(st.image_blend)) drawStar(st); }
  for (const st of stars) { if (!isDkgray(st.image_blend)) drawStar(st); }

  const grate = sprites.get('spr_knight_line_grate');
  if (grate && grate.frames[0]) {
    sg.save();
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'source-atop';
    sg.drawImage(tinted(grate.frames[0], c_black), 0, e.star_flicker,
      grate.frames[0].width * 2, grate.frames[0].height * 2);
    sg.restore();
  }

  for (const st of stars) {
    const dark = isDkgray(st.image_blend);
    const large = (st.image_xscale ?? 1) > 1;
    if ((dark || large) && (st.con ?? 0) < 1) continue;
    drawStar(st);
  }

  for (const k of withBlock(state, 'obj_knight_pointing_starchild')) {
    const entry = sprites.get(k.sprite_index);
    if (!entry || !entry.frames.length) continue;
    const glow = pingpong(k.timer ?? 0, 2) / 4;
    const ka = k.image_alpha ?? 1;
    sg.save();
    sg.globalCompositeOperation = 'lighter';
    drawOutlineExt(sg, entry, k.image_index ?? 0, k.x, k.y, k.image_xscale, k.image_yscale,
      k.image_angle ?? 0, c_white, glow * ka, k.image_xscale);
    drawSpriteExt(sg, entry, k.image_index ?? 0, k.x, k.y, k.image_xscale, k.image_yscale,
      k.image_angle ?? 0, null, ka);
    sg.restore();
  }

  for (const a of withBlock(state, 'obj_afterimage')) {
    const entry = sprites.get(a.sprite_index);
    if (entry && entry.frames.length) {
      drawSpriteExt(sg, entry, a.image_index, a.x, a.y,
        a.image_xscale, a.image_yscale, a.image_angle, null, a.image_alpha);
    }
  }
  sg.restore();

  const my = surf('my');
  const mg = my.getContext('2d');
  mg.imageSmoothingEnabled = false;
  mg.setTransform(1, 0, 0, 1, 0, 0);
  mg.globalCompositeOperation = 'source-over';
  mg.globalAlpha = 1;

  mg.fillStyle = '#000000';
  mg.fillRect(0, 0, W, H);

  let color = makeColorHsv(e.hsv % 255, 255, 255);
  if (kaizoSideb(state)) {
    const hsv = e.hsv % 300;
    const hsvind = (hsv / 300) * 4;
    const colA = SIDEB_VORTEX[Math.floor(hsvind)];
    const colB = SIDEB_VORTEX[Math.ceil(hsvind)];
    const colF = hsvind - Math.floor(hsvind);
    color = mergeColor(mergeColor(colA, colB, colF), c_white, 0.2);
  }

  if (e.ball_darkness > 0) {
    const tintC = surf('tint');
    const tg = tintC.getContext('2d');
    tg.imageSmoothingEnabled = false;
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.globalAlpha = 1;
    tg.clearRect(0, 0, W, H);
    tg.drawImage(ball, 0, 0);
    tg.globalCompositeOperation = 'multiply';
    tg.fillStyle = rgb(color);
    tg.fillRect(0, 0, W, H);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(ball, 0, 0);
    tg.globalCompositeOperation = 'source-over';

    mg.save();
    mg.globalCompositeOperation = 'lighter';
    mg.globalAlpha = clamp01(e.ball_darkness);
    for (let a = 0; a < H; a++) {
      const dx = Math.sin((a + time) * 0.1) * 4 * e.intensity
        + Math.sin((a + time) * 0.35) * 0.5 * e.intensity;
      mg.drawImage(tintC, 0, a, W, 1, dx, a, W, 1);
    }
    mg.restore();
  }

  mg.save();
  mg.globalCompositeOperation = 'lighter';
  mg.drawImage(starC, 0, 0);
  mg.restore();

  for (const a of withBlock(state, 'obj_afterimage_grow')) {
    if (a.target === -1) continue;
    const entry = sprites.get(a.sprite_index);
    if (entry && entry.frames.length) {
      mg.save();
      mg.translate(-vx, -vy);
      drawSpriteExt(mg, entry, a.image_index, a.x, a.y,
        a.image_xscale, a.image_yscale, a.image_angle, blendOrNull(a.image_blend), a.image_alpha);
      mg.restore();
    }
  }

  if (e.line_timer > -1) {
    const grad = sprites.get('spr_rk_quickslash_marker_gradient');
    const mark = sprites.get('spr_rk_quickslash_marker');
    const dir = -63;
    const mx = W * 0.5 - ldx(280, -63);
    const myy = H * 0.5 - ldy(280, -63);
    const thick = 4 + 8 * (1 - Math.min(e.line_timer, 16) / 16);
    color = makeColorRgb(e.r, e.g, e.b);
    if (grad) drawSpriteExt(mg, grad, 0, mx, myy, e.line_timer * 1, thick, dir, color, 1);
    if (mark) drawSpriteExt(mg, mark, 0, mx, myy, e.line_timer * 1, thick, dir, c_black, 1);
  }

  if (e.fix_draw) {

    const kentry = sprites.get(e.knight_sprite);
    const ky = ((e.fake_y + (Math.sin(e.bobble_count * 0.1) * e.bobble_amp)) - 10) + 55 + e.fake_yoff;
    if (kentry && kentry.frames.length) {
      drawSpriteExt(mg, kentry, e.knight_sprite_image, e.fake_x + e.fake_xoff, ky,
        2 * e.final_xs, 2, 0, blendOrNull(e.image_blend), e.fake_alpha ?? 1);
    }

    const oc = mergeColor(c_red, c_black, 0.75);
    const lines = e.final_lines ?? [];

    for (const line of lines) {
      if (!line || line === -4 || !line.alive) continue;
      for (const [dx, dy] of LINE_OUTLINE_OFFSETS) {
        drawLineSprite(mg, line, dx, dy, oc, sprites, helpers);
      }
    }

    const grows = withBlock(state, 'obj_afterimage_grow');
    for (const line of lines) {
      if (!line || line === -4 || !line.alive) continue;
      drawLineSprite(mg, line, 0, 0, line.image_blend, sprites, helpers);
      for (const g of grows) {
        if (g.target !== line) continue;
        const entry = sprites.get(g.sprite_index);
        if (entry && entry.frames.length) {
          drawSpriteExt(mg, entry, g.image_index ?? 0, g.x, g.y,
            g.image_xscale, g.image_yscale, g.image_angle, blendOrNull(g.image_blend), g.image_alpha ?? 1);
        } else if (g.mask && g.mask.px) {
          const en = maskEntry(g.mask, g.image_blend ?? c_white, helpers.bakeMask);
          drawSpriteExt(mg, en, 0, g.x, g.y, g.image_xscale, g.image_yscale, g.image_angle, null, g.image_alpha ?? 1);
        }
      }
    }
  } else if (!e.do_fake_screen) {

    drawKnightRows(mg, sprites.get(e.knight_sprite), e, time, 0, 0);
  }

  roaringCover.fakeScreen = !!e.do_fake_screen;
  roaringCover.entity = e;

  if (e.do_fake_screen && !screenCut.taken) {
    takeScreenCut(my, e, state, sprites);
  }

  if (e.hp_visible) {
    const hud = drawHpHud(state, sprites);
    const cover = surf('cover');
    const cg = cover.getContext('2d');
    cg.imageSmoothingEnabled = false;
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.globalCompositeOperation = 'source-over';
    cg.globalAlpha = 1;
    cg.clearRect(0, 0, W, H);
    cg.globalAlpha = clamp01(e.darkness);
    cg.drawImage(my, 0, 0);

    cg.globalAlpha = clamp01(e.hp_alpha ?? 0.5);
    cg.drawImage(hud, 140, 448 + (e.hp_y ?? 0));
    cg.globalAlpha = 1;
    roaringCover.img = cover;
    roaringCover.alpha = 1;
  } else {
    roaringCover.img = my;
    roaringCover.alpha = clamp01(e.darkness);
  }
  roaringCover.active = true;

  return true;
}

export function drawObjRoaringknightSlash(ctx, e) {
  const dir = e.direction;
  const hx = ldx(640, dir);
  const hy = ldy(640, dir);
  const hxoff = ldx(e.width, dir + 90);
  const hyoff = ldy(e.width, dir + 90);
  const a = e.image_alpha ?? 1;

  ctx.save();
  ctx.globalAlpha = clamp01(a * 2);
  ctx.fillStyle = rgb(C_BLUE);
  ctx.beginPath();
  if (e.slashdir > 0.5) {

    ctx.moveTo(e.x - hx * a, e.y - hy * a);
    ctx.lineTo(e.x + hx + hxoff, e.y + hy + hyoff);
    ctx.lineTo(e.x + hx - hxoff, e.y + hy - hyoff);
  } else {

    ctx.moveTo(e.x + hx * a, e.y + hy * a);
    ctx.lineTo(e.x - hx + hxoff, e.y - hy + hyoff);
    ctx.lineTo(e.x - hx - hxoff, e.y - hy - hyoff);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return true;
}
