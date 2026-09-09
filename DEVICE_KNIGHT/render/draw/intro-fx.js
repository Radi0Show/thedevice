


import { drawSpriteExt, c_white } from './gm.js';


function frand(frame, salt) {
  let t = (frame * 374761393 + salt * 668265263) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

export function drawIntroFx(ctx, e, sprites) {
  const entry = sprites.get(e.sprite_index);

  const w = (entry?.meta?.w ?? 64) * (e.image_xscale ?? 2);
  const h = (entry?.meta?.h ?? 64) * (e.image_yscale ?? 2);
  const px = e.x + w * 0.42;
  const py = e.y + h * 0.5;


  if (e.crushTimer >= 0 && e.crushTimer <= 88) {
    let radius;
    let alpha;
    if (e.crushTimer <= 24) {
      const t = e.crushTimer / 24;
      radius = 960 + (160 - 960) * t;
      alpha = 0.1 * t;
    } else {
      const q = Math.min(1, (e.crushTimer - 24) / 64);
      const e2 = 1 - (1 - q) * (1 - q);
      radius = 160 + (0 - 160) * e2;
      alpha = 0.1 + (1 - 0.1) * e2;
    }
    const t = Math.min(1, e.crushTimer / 24);

    const ht = Math.min(1, e.crushTimer / 64);
    const hsv = 256 + (64 - 256) * (1 - (1 - ht) * (1 - ht));
    const [r, g, b] = hsvToRgb255(hsv % 255, 255, 255);

    crushCanvas = getCanvas(crushCanvas, VIEW_W, VIEW_H);
    const cg = crushCanvas.getContext('2d');
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.globalCompositeOperation = 'source-over';
    cg.clearRect(0, 0, VIEW_W, VIEW_H);
    cg.fillStyle = '#000';
    cg.beginPath();
    cg.arc(px, py, Math.max(1, radius), 0, Math.PI * 2);
    cg.fill();

    const flow = sprites.get('spr_knight_bullet_flow');
    if (flow?.frames[0]) {
      cg.globalCompositeOperation = 'source-in';
      const img = flow.frames[0];
      const ox = -((e.frame * 8) % img.width);
      for (let x = ox; x < VIEW_W; x += img.width) {
        for (let y = 0; y < VIEW_H; y += img.height) cg.drawImage(img, x, y);
      }
      cg.globalCompositeOperation = 'source-over';
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    tintCanvas = getCanvas(tintCanvas, VIEW_W, VIEW_H);
    const tg = tintCanvas.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, VIEW_W, VIEW_H);
    tg.drawImage(crushCanvas, 0, 0);
    tg.globalCompositeOperation = 'multiply';
    tg.fillStyle = `rgb(${r},${g},${b})`;
    tg.fillRect(0, 0, VIEW_W, VIEW_H);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(crushCanvas, 0, 0);


    ctx.globalAlpha = alpha;
    for (let i = 0; i < 4; i++) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(tintCanvas, 0, 0);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }


  if (e.inrushLast != null) {

    const LIFE = 32;
    const easeIn = (t) => 1 - Math.cos(t * 1.5707963267948966);
    for (let back = 0; back < LIFE; back++) {
      const bf = e.frame - back;

      if (bf > e.inrushLast) continue;
      const n = 2 + Math.floor(frand(bf, 1) * 3);
      for (let i = 0; i < n; i++) {
        const dir = frand(bf, 2 + i) * Math.PI * 2;
        const dist0 = 40 + frand(bf, 20 + i) * 240;
        const size = 0.25 + frand(bf, 40 + i) * 0.75;
        const vmax = 16 + Math.floor(frand(bf, 60 + i) * 9);

        let travelled = 0;
        for (let j = 0; j < back; j++) travelled += 4 + (vmax - 4) * easeIn(j / LIFE);
        const dist = dist0 - travelled;
        if (dist <= 32) continue;
        const t = back / LIFE;
        const sx = px + Math.cos(dir) * dist;
        const sy = py + Math.sin(dir) * dist;
        const len = 3 * size * (1 + 15 * easeIn(t));
        const thick = Math.max(1, 3 * (size + (size * 0.5 - size) * easeIn(t)));
        ctx.save();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.translate(sx, sy);
        ctx.rotate(dir + Math.PI);
        ctx.fillRect(-len / 2, -thick / 2, len, thick);
        ctx.restore();
      }
    }
  }


  if (e.fxState === 'roaring' && e.attack_speed > 0 && entry) {
    for (let g = 1; g <= 3; g++) {
      const gf = e.frame - g * 3;
      const ox = (frand(gf, 7) - 0.5) * 60;
      const oy = (frand(gf, 8) - 0.5) * 60;
      drawSpriteExt(ctx, entry, e.image_index, e.x + ox, e.y + oy,
        e.image_xscale, e.image_yscale, 0, null, 0.15 * (4 - g) / 4);
    }
  }




  if (e.bar) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = e.bar;
    ctx.beginPath();
    ctx.moveTo(px, py - e.bar * 40);
    ctx.lineTo(px, py + e.bar * 40);
    ctx.stroke();
    ctx.restore();
  }

  if (!entry) return true;

  if (e.sprite_index === 'spr_roaringknight_shift_ol') {
    let xoff = 0;
    let yoff = 0;
    if (e.shudder) {
      xoff = Math.floor(frand(e.frame, 11) * 3) - 1;
      yoff = Math.floor(frand(e.frame, 12) * 3) - 1;
    }
    drawSpriteExt(ctx, entry, e.image_index, e.x - 20 + xoff, e.y + 20 + yoff,
      e.image_xscale, e.image_yscale, 0, null, e.image_alpha ?? 1);
    if (e.whiteout) {

      drawSpriteExt(ctx, entry, e.image_index, e.x - 20 + xoff, e.y + 20 + yoff,
        e.image_xscale, e.image_yscale, 0, c_white, e.whiteout_counter, true);
    }
  } else {
    const bob = Math.sin(e.frame * 0.2) * 2;
    drawSpriteExt(ctx, entry, e.image_index, e.x, e.y + bob,
      e.image_xscale, e.image_yscale, 0, null, e.image_alpha ?? 1);
  }
  return true;
}



const VIEW_W = 640;
const VIEW_H = 480;


let bgCanvas = null;
let swordCanvas = null;
let ghostScratch = null;

let crushCanvas = null;
let tintCanvas = null;


function hsvToRgb255(h, sat, val) {
  const H = (h / 255) * 6;
  const S = sat / 255;
  const V = val / 255;
  const i = Math.floor(H) % 6;
  const f = H - Math.floor(H);
  const p = V * (1 - S);
  const q = V * (1 - f * S);
  const t = V * (1 - (1 - f) * S);
  const [r, g, b] = [[V, t, p], [q, V, p], [p, V, t], [p, q, V], [t, p, V], [V, p, q]][i];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getCanvas(ref, w, h) {
  if (!ref || ref.width !== w || ref.height !== h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;

    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  }
  return ref;
}


const ROOM_W = 2960;


function tiledArea(g, entry, phaseX, phaseY, x1, y1, x2, y2) {
  const tw = entry.meta.w * 2;
  const th = entry.meta.h * 2;
  let startX = phaseX + Math.ceil((x1 - phaseX) / tw - 1) * tw;
  let startY = phaseY + Math.ceil((y1 - phaseY) / th - 1) * th;
  g.save();
  g.beginPath();
  g.rect(x1, y1, x2 - x1, y2 - y1);
  g.clip();
  for (let y = startY; y < y2; y += th) {
    for (let x = startX; x < x2; x += tw) {
      if (x + tw < 0 || x > VIEW_W || y + th < 0 || y > VIEW_H) continue;
      drawSpriteExt(g, entry, 0, x, y, 2, 2, 0, null, 1);
    }
  }
  g.restore();
}


export function drawSnowBackdrop(g, camX, fountainSpeed, sprites) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  const S = (name) => sprites.get(name);
  const cam = camX;
  const fs = fountainSpeed;
  const xo = 1320;
  const yo = -10;
  const bgH = 480;

  const l1 = S('spr_dw_snow_zone_bg_parallax_layer_1');
  if (l1) tiledArea(g, l1, xo - cam, yo + 20, xo * 0.9 - cam, yo + 20, xo * 0.9 + ROOM_W + 200 - cam, yo + 20 + bgH);
  const tall = S('spr_dw_fountain_tall');
  if (tall) drawSpriteExt(g, tall, Math.floor(fs) % (tall.meta.frames ?? 6), 2200 - cam, -120, 2, 2, 0, null, 1);
  const l2 = S('spr_dw_snow_zone_bg_parallax_layer_2_test');
  if (l2) tiledArea(g, l2, xo * 0.9 - 40 - cam, yo + 20, xo * 0.9 - cam, yo + 20, xo * 0.9 + ROOM_W + 200 - cam, yo + 20 + bgH);
  const l3 = S('spr_dw_snow_zone_bg_parallax_layer_3_test');
  if (l3) tiledArea(g, l3, xo * 0.6 - cam, yo, xo * 0.6 - cam, yo, xo * 0.6 + ROOM_W + 200 - cam, yo + bgH);
  const l4 = S('spr_dw_snow_zone_bg_parallax_layer_4_test');
  if (l4) tiledArea(g, l4, 40 - cam, yo, 0 - cam, yo, ROOM_W - cam, yo + bgH);
  const l5 = S('spr_dw_snow_zone_bg_parallax_layer_5_test');
  if (l5) tiledArea(g, l5, 0 - cam, yo - 180, 0 - cam, yo - 180, ROOM_W - cam, yo - 180 + bgH);
  const end = S('spr_dw_snow_zone_end');
  if (end) drawSpriteExt(g, end, 0, 1998 - cam, yo - 66, 2, 2, 0, null, 1);

  g.fillStyle = '#000';
  g.fillRect(2600 - cam, 0, VIEW_W - (2600 - cam), VIEW_H);
  const cc = S('spr_cc_fountainbg');
  if (cc) drawSpriteExt(g, cc, Math.floor(fs) % (cc.meta.frames ?? 4), 2370 - cam, 0, 2, 2, 0, null, 1);
}

function drawActor(ctx, sprites, a, camX) {
  const entry = sprites.get(a.sprite);
  if (!entry) return;
  const frames = entry.meta.frames ?? 1;
  drawSpriteExt(ctx, entry, Math.floor(a.index) % frames, a.x - camX, a.y, 2, 2, 0, null, 1);
}

export function drawIntroScene(ctx, sc, sprites) {
  const cam = sc.camX;


  bgCanvas = getCanvas(bgCanvas, VIEW_W, VIEW_H);
  const bgCtx = bgCanvas.getContext('2d');
  bgCtx.setTransform(1, 0, 0, 1, 0, 0);
  drawSnowBackdrop(bgCtx, sc.camX, sc.bg.fountain_speed, sprites);
  ctx.save();
  ctx.globalAlpha = Math.max(0, sc.bg.fadeAlpha);
  ctx.drawImage(bgCanvas, 0, 0);
  ctx.restore();


  if (sc.flightGhosts) {
    for (const g of sc.flightGhosts) {
      const entry = sprites.get(g.sprite);
      if (!entry) continue;
      const alpha = Math.max(0, 0.5 - (sc.t - g.born) * 0.04);
      if (alpha <= 0) continue;
      const frames = entry.meta.frames ?? 1;
      drawSpriteExt(ctx, entry, g.index % frames, g.x - cam, g.y, 2, 2, 0, null, alpha);
    }
  }


  drawActor(ctx, sprites, sc.actors.kris, cam);
  drawActor(ctx, sprites, sc.actors.susie, cam);
  drawActor(ctx, sprites, sc.actors.ralsei, cam);


  const k = sc.knight;
  if (sc.marker) {
    const entry = sprites.get('spr_roaringknight_sword_appear_new');
    if (entry) {
      drawSpriteExt(ctx, entry, sc.marker.index, k.x - cam, k.y, 2, 2, 0, null, 1);
    }
  } else if (k.visible) {

    const entry = sprites.get(k.sprite);
    if (entry) {
      const frames = entry.meta.frames ?? 1;
      drawSpriteExt(ctx, entry, Math.floor(k.index) % frames, k.x - cam, k.y, 2, 2, 0, null, 1);
    }
    if (k.sword_active) {
      const sword = sprites.get('spr_roaringknight_sword');
      if (sword) {
        const sx = k.x - cam;
        const sy = k.y + k.y_base_pos;
        if (k.sword_appear) {

          const alpha = Math.max(0, Math.min(1,
            k.sword_flash ? k.sword_alpha + Math.sin(k.alpha_siner) : 1));
          swordCanvas = getCanvas(swordCanvas, VIEW_W, VIEW_H);
          const sg = swordCanvas.getContext('2d');
          sg.setTransform(1, 0, 0, 1, 0, 0);
          sg.clearRect(0, 0, VIEW_W, VIEW_H);
          drawSpriteExt(sg, sword, 0, sx, sy, 2, 2, 0, null, 1);
          sg.globalCompositeOperation = 'destination-out';
          sg.fillStyle = '#000';
          sg.fillRect(sx + 34, k.y + 58, 42, VIEW_H);
          sg.globalCompositeOperation = 'source-over';
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(swordCanvas, 0, 0);
          ctx.restore();
        } else {
          drawSpriteExt(ctx, sword, 0, sx, sy, 2, 2, 0, null, 1);
        }
      }
    }
    if (k.grab_hand && entry) {
      const hand = sprites.get('spr_roaringknight_sword_grab_hand_new');
      if (hand) {
        drawSpriteExt(ctx, hand, Math.floor(k.index) % (hand.meta.frames ?? 1),
          k.x - cam, k.y, 2, 2, 0, null, 1);
      }
    }
  }


  if (sc.fx && !sc.fx.done) drawIntroFx(ctx, sc.fx, sprites);


  if (sc.circle) {
    const c = sc.circle;
    const fx = sc.fx;
    const cx = fx ? fx.x + 128 * 0.42 : k.x - cam;
    const cy = fx ? fx.y + 128 * 0.5 : k.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, Math.min(1, c.alpha));
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, c.size));
    grad.addColorStop(0, 'rgb(0,0,0)');
    grad.addColorStop(1, `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, c.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }


  const anchorX = sc.fx ? sc.fx.x + 128 * 0.42 : VIEW_W / 2;
  const anchorY = sc.fx ? sc.fx.y + 128 * 0.5 : VIEW_H / 2;
  for (const g of sc.ghosts) {
    const age = sc.t - g.born;
    const alpha = 0.5 - age * g.faderate;
    if (alpha <= 0) continue;
    const scale = 1 + age * 0.01;
    ghostScratch = getCanvas(ghostScratch, VIEW_W, VIEW_H);
    const gg = ghostScratch.getContext('2d');
    gg.clearRect(0, 0, VIEW_W, VIEW_H);
    gg.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(anchorX, anchorY);
    ctx.scale(scale, scale);
    ctx.drawImage(ghostScratch, -anchorX, -anchorY);
    ctx.restore();
  }
}
