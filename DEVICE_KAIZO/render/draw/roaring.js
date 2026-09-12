


import { drawSpriteExt, drawBeamColor, mergeColor, clamp01, tinted, c_white, c_gray, c_red } from './gm.js';
import { drawPointingStarchild } from './pointing-starchild.js';

const W = 640;
const H = 480;

function surf(store, key) {
  let c = store[key];
  if (!c) {
    c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    store[key] = c;
  }
  return c;
}
const surfaces = {};


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


function drawTiled(g, entry, sub, x, y, scale = 1) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[sub % entry.frames.length];
  if (!img) return;
  const tw = img.width * scale;
  const th = img.height * scale;
  let ox = x % tw;
  if (ox > 0) ox -= tw;
  let oy = y % th;
  if (oy > 0) oy -= th;
  for (let py = oy; py < H; py += th) {
    for (let px = ox; px < W; px += tw) g.drawImage(img, px, py, tw, th);
  }
}



function drawRoaringStar(ctx, e, sprites, userEvent) {
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
      drawSpriteExt(ctx, entry, 0, e.x, e.y, xs, ys, e.image_angle, e.image_blend, e.image_alpha);
    } else {
      drawSpriteExt(ctx, top, 0, tx, ty, xs, ys, e.image_angle, e.image_blend, e.image_alpha);
      drawSpriteExt(ctx, bottom, 0, bx, by, xs, ys, e.image_angle, e.image_blend, e.image_alpha);
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
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawBeamColor(ctx, tx, ty, length, 10, 90, c_white, a);
    drawBeamColor(ctx, bx, by, length, 10, 156, c_white, a);
    drawBeamColor(ctx, tx, ty, length, 10, 24, c_white, a);
    drawBeamColor(ctx, bx, by, length, 10, 270, c_white, a);
    drawBeamColor(ctx, tx, ty, length, 10, 336, c_white, a);
    drawBeamColor(ctx, bx, by, length, 10, 204, c_white, a);
    ctx.restore();
  }
  if (e.con === 1 || e.con === 2 || e.con === 2.5) {
    const color = mergeColor(c_gray, c_red, clamp01(e.timer / 30));
    drawSpriteExt(ctx, entry, 1, tx, ty, xs + 0.1, ys + 0.1, 0, c_white, alpha);
    drawSpriteExt(ctx, entry, 0, tx, ty, xs, ys, 0, color, 1);
    if (split >= 2) {
      drawSpriteExt(ctx, bottom, 1, bx, by, xs + 0.1, ys + 0.1, 0, c_white, alpha);
      drawSpriteExt(ctx, bottom, 0, bx, by, xs, ys, 0, color, 1);
    }
  }
  if (e.con === 3 || e.con === 4) {
    const g = (Math.sin(e.timer * 6) + 1) * 0.25;
    drawSpriteExt(ctx, entry, 2, tx, ty, xs + 0.1, ys + 0.1, 0, c_white, g);
    drawSpriteExt(ctx, entry, 2, tx, ty, xs, ys, 0, c_white, 1);
    if (split >= 2) {
      drawSpriteExt(ctx, bottom, 2, bx, by, xs + 0.1, ys + 0.1, 0, c_white, g);
      drawSpriteExt(ctx, bottom, 2, bx, by, xs, ys, 0, c_white, 1);
    }
  }
}



function drawKnightRows(g, entry, e, time, originX, originY) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[Math.floor(e.knight_sprite_image ?? 0) % entry.frames.length];
  if (!img) return;
  const bl = entry.meta.bbox ? entry.meta.bbox[0] : 0;
  const bt = entry.meta.bbox ? entry.meta.bbox[1] : 0;
  const h = img.height;
  const bob = Math.sin(e.bobble_count * 0.1) * e.bobble_amp;
  const intensify = e.intensify ?? 0;
  const rowY = (a) => originY + e.fake_y + a * 2 + bob - 10 - bt * 2;

  if (intensify > 1.5) {
    g.save();
    g.globalAlpha = (e.fake_alpha ?? 1) * 0.75;
    for (let a = 0; a < h; a++) {
      if (a % 2 !== 0 && a % 2 !== 1) continue;
      const off = Math.sin((a + time * 4) * 0.15) * (intensify - 1.5) * 8;
      const x = a % 2 === 0
        ? originX + e.fake_x - 70 + off
        : originX + e.fake_x - 70 - off;
      g.drawImage(img, bl, a, 70, 1, x, rowY(a), 140, 2);
    }
    g.restore();
  }

  g.save();
  g.globalAlpha = e.fake_alpha ?? 1;
  for (let a = 0; a < h; a++) {
    const x = originX + e.fake_x - 70 + Math.sin((a + time * 4) * 0.2) * intensify * 0.3;
    g.drawImage(img, bl, a, 70, 1, x, rowY(a), 140, 2);
  }
  g.restore();
}

export function drawRoaring(ctx, e, state, deps) {
  const { sprites } = deps;
  const time = state.frame;
  const vx = state.view.x;
  const vy = state.view.y;
  const alive = (name) => state.entities.filter((x) => x.alive && x.type.name === name);


  if (e.stop && screenCut.taken) {

    const self = sprites.get(e.sprite_index);
    if (self) {
      drawSpriteExt(ctx, self, e.image_index, e.x - vx, e.y - vy,
        e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, e.image_alpha);
    }
    return true;
  }


  const ball = surf(surfaces, 'ball');
  const bg = ball.getContext('2d');
  bg.imageSmoothingEnabled = false;
  bg.setTransform(1, 0, 0, 1, 0, 0);
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


  const starC = surf(surfaces, 'star');
  const sg = starC.getContext('2d');
  sg.imageSmoothingEnabled = false;
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.clearRect(0, 0, W, H);
  sg.save();
  sg.translate(-vx, -vy);


  for (const p of alive('obj_particle_generic')) {
    const entry = sprites.get(p.sprite_index);
    if (entry) {
      drawSpriteExt(sg, entry, p.image_index, p.x, p.y,
        p.image_xscale, p.image_yscale, p.image_angle, p.image_blend, p.image_alpha);
    }
  }


  const roarStars = alive('obj_knight_roaring_star');
  const isWhite = (x) => !x.image_blend || x.image_blend === c_white
    || (Array.isArray(x.image_blend) && x.image_blend[0] === 255 && x.image_blend[1] === 255);
  const drawStar = (st) => drawRoaringStar(sg, st, sprites, st.con === 0 ? 0 : 1);

  for (const st of roarStars) { if (!isWhite(st)) drawStar(st); }
  for (const st of roarStars) { if (isWhite(st)) drawStar(st); }

  const grate = sprites.get('spr_knight_line_grate');
  if (grate && grate.frames[0]) {

    sg.save();
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'source-atop';
    sg.drawImage(tinted(grate.frames[0], [0, 0, 0]), 0, e.star_flicker,
      grate.frames[0].width * 2, grate.frames[0].height * 2);
    sg.restore();
  }

  for (const st of roarStars) {
    const dark = !isWhite(st);
    const large = (st.image_xscale ?? 1) > 1;
    if ((dark || large) && (st.con ?? 0) < 1) continue;
    drawStar(st);
  }

  for (const k of alive('obj_knight_pointing_starchild')) {
    drawPointingStarchild(sg, k, state, deps);
  }
  for (const a of alive('obj_afterimage')) {
    const entry = sprites.get(a.sprite_index);
    if (entry) {
      drawSpriteExt(sg, entry, a.image_index, a.x, a.y,
        a.image_xscale, a.image_yscale, a.image_angle, c_white, a.image_alpha);
    }
  }
  sg.restore();


  const my = surf(surfaces, 'my');
  const mg = my.getContext('2d');
  mg.imageSmoothingEnabled = false;
  mg.setTransform(1, 0, 0, 1, 0, 0);
  mg.globalCompositeOperation = 'source-over';
  mg.globalAlpha = 1;
  mg.fillStyle = '#000000';
  mg.fillRect(0, 0, W, H);


  if (e.ball_darkness > 0) {
    const tintC = surf(surfaces, 'tint');
    const tg = tintC.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, W, H);
    tg.drawImage(ball, 0, 0);
    tg.globalCompositeOperation = 'multiply';
    const [r, g, b] = makeColorHsv(e.hsv % 255, 255, 255);
    tg.fillStyle = `rgb(${r},${g},${b})`;
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

  for (const a of alive('obj_afterimage_grow')) {
    const entry = sprites.get(a.sprite_index);
    if (entry) {
      mg.save();
      mg.translate(-vx, -vy);
      drawSpriteExt(mg, entry, a.image_index, a.x, a.y,
        a.image_xscale, a.image_yscale, a.image_angle, c_white, a.image_alpha);
      mg.restore();
    }
  }


  if (e.line_timer > -1) {
    const grad = sprites.get('spr_rk_quickslash_marker_gradient');
    const mark = sprites.get('spr_rk_quickslash_marker');
    const dir = -63;
    const mx = W * 0.5 - Math.cos((dir * Math.PI) / 180) * 280;
    const myy = H * 0.5 + Math.sin((dir * Math.PI) / 180) * 280;
    const thick = 4 + 8 * (1 - Math.min(e.line_timer, 16) / 16);
    const col = [Math.round(e.r), Math.round(e.g), Math.round(e.b)];

    mg.save();
    if (grad) drawSpriteExt(mg, grad, 0, mx, myy, e.line_timer, thick, dir, col, 1);
    if (mark) drawSpriteExt(mg, mark, 0, mx, myy, e.line_timer, thick, dir, [0, 0, 0], 1);
    mg.restore();
  }

  if (!e.do_fake_screen) {
    drawKnightRows(mg, sprites.get(e.knight_sprite), e, time, 0, 0);
  }


  roaringCover.img = my;
  roaringCover.alpha = clamp01(e.darkness);
  roaringCover.active = true;


  roaringCover.fakeScreen = !!e.do_fake_screen;
  roaringCover.entity = e;


  if (e.do_fake_screen && !screenCut.taken) {
    takeScreenCut(my, e, state, sprites);
  }

  return true;
}



export const roaringCover = {
  active: false, img: null, alpha: 0, fakeScreen: false, entity: null,
};


export function drawRoaringCover(ctx, state, sprites) {
  if (!roaringCover.active || !roaringCover.img) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = roaringCover.alpha;
  ctx.drawImage(roaringCover.img, 0, 0);
  ctx.globalAlpha = 1;
  if (roaringCover.fakeScreen && roaringCover.entity) {
    drawKnightRows(ctx, sprites.get(roaringCover.entity.knight_sprite),
      roaringCover.entity, state.frame, 0, 0);
  }
  ctx.restore();
}

const CUT_TOP_X = 200;
const CUT_BOTTOM_X = 440;


export const screenCut = { taken: false, halves: [null, null], origins: [[160, 240], [480, 240]] };

function takeScreenCut(my, e, state, sprites) {
  screenCut.taken = true;


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
    const hs = heart && sprites.get(heart.sprite_index ?? 'spr_dodgeheart');
    if (hs) {
      drawSpriteExt(g, hs, heart.image_index, heart.x - state.view.x, heart.y - state.view.y,
        heart.image_xscale, heart.image_yscale, heart.image_angle,
        heart.image_blend, heart.image_alpha);
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
    g.beginPath();
    if (i === 0) {

      g.moveTo(CUT_TOP_X, -1);
      g.lineTo(CUT_BOTTOM_X, H);
      g.lineTo(W, H);
      g.lineTo(W, -1);
    } else {

      g.moveTo(CUT_TOP_X, 0);
      g.lineTo(CUT_BOTTOM_X, H);
      g.lineTo(0, H);
      g.lineTo(0, 0);
    }
    g.closePath();
    g.fill();
    screenCut.halves[i] = c;
  }
}


export function resetScreenCut() {
  screenCut.taken = false;
  screenCut.halves = [null, null];
}



export function drawScreenPiece(ctx, e, state) {
  const img = screenCut.halves[e.piece];
  if (!img) return true;
  const [ox, oy] = screenCut.origins[e.piece];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp01(e.image_alpha ?? 1);
  ctx.drawImage(img, e.x - state.view.x - ox, e.y - state.view.y - oy);
  ctx.restore();
  return true;
}
