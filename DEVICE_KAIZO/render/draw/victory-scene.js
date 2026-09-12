

import { drawSpriteExt } from './gm.js';
import { drawSnowBackdrop } from './intro-fx.js';
import { loadFont, drawText } from '../font.js';
import { formatWriter, revealed } from '../../sim/dialogue.js';
import { VICTORY_LINES } from '../../sim/victory-scene.js';

const VIEW_W = 640;
const VIEW_H = 480;

function srand(frame, salt) {
  let t = (frame * 374761393 + salt * 668265263) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

function drawActor(ctx, sprites, a, cam) {
  if (!a.visible) return;
  const entry = sprites.get(a.sprite);
  if (!entry) return;
  const frames = entry.meta.frames ?? 1;
  const index = Math.floor(a.index) % frames;
  const sx = a.x - cam;
  if (a.flip) {

    const compX = sx + (entry.meta.w - 2 * (entry.meta.ox ?? 0)) * 2;
    ctx.save();
    ctx.translate(compX, a.y);
    ctx.scale(-1, 1);
    drawSpriteExt(ctx, entry, index, 0, 0, 2, 2, 0, null, 1);
    ctx.restore();
  } else {
    drawSpriteExt(ctx, entry, index, sx, a.y, 2, 2, 0, null, 1);
  }
}

export function drawVictoryScene(ctx, sc, sprites) {

  const shakeJitter = [sc.shake ? sc.shake.offset : 0, 0];
  ctx.save();
  ctx.translate(shakeJitter[0], shakeJitter[1]);
  const cam = Math.round(sc.camX);

  ctx.fillStyle = '#000';
  ctx.fillRect(-16, -16, VIEW_W + 32, VIEW_H + 32);

  drawSnowBackdrop(ctx, cam, sc.bg.fountain_speed, sprites);

  if (sc.shard) {
    const s = sc.shard;
    const piece = sprites.get('spr_roaringknight_sword_break_piece_small');
    if (piece) {
      drawSpriteExt(ctx, piece, 0, s.x - cam, s.y, 2, 2, s.angle, null, 1);
    }
    if (s.shine) {
      const shine = sprites.get('spr_shine_white');
      if (shine) {
        const frames = shine.meta.frames ?? 4;
        drawSpriteExt(ctx, shine, Math.floor(sc.t * 0.1) % frames,
          s.x - 4 - cam, s.y - 4, 2, 2, 0, null, 1);
      }
    }
  }

  const order = Object.values(sc.actors).sort((a, b) => a.y - b.y);
  for (const a of order) drawActor(ctx, sprites, a, cam);

  const k = sc.knight;
  if (k.visible) {
    const entry = sprites.get(k.sprite);
    if (entry) {
      const frames = entry.meta.frames ?? 1;
      const index = Math.min(Math.floor(k.index), frames - 1);
      let ox = k.jolt[0];
      let oy = k.jolt[1];
      if (k.shake > 0) {
        ox += Math.floor(srand(sc.t, 61) * (k.shake * 2 + 1)) - k.shake;
        oy += Math.floor(srand(sc.t, 62) * (k.shake * 2 + 1)) - k.shake;
      }

      if (sc.knightStatic) {
        for (let g = 1; g <= 2; g++) {
          const gf = sc.t - g * 2;
          const gx = (srand(gf, 63) - 0.5) * 24;
          const gy = (srand(gf, 64) - 0.5) * 24;
          drawSpriteExt(ctx, entry, index, k.x - cam + gx, k.y + gy,
            2, 2, 0, null, 0.3 / g);
        }
      }
      drawSpriteExt(ctx, entry, index, k.x - cam + ox, k.y + oy, 2, 2, 0, null, 1);
    }
  }

  const hitback = sprites.get('spr_fx_hitback');
  if (hitback) {
    for (const f of sc.hitFx) {
      const age = sc.t - f.born;
      const index = Math.min(4, Math.floor((age / f.life) * 5));
      const alpha = f.alpha * (f.alpha < 1 ? 1 - age / f.life : 1);
      drawSpriteExt(ctx, hitback, index, f.x - cam, f.y, 2, 2, 0, null,
        Math.max(0, alpha));
    }
  }

  ctx.restore();

  if (sc.white.visible && sc.white.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, sc.white.alpha);
    ctx.fillStyle = sc.white.black ? '#000' : '#fff';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  if (sc.slash.visible) {
    const streak = sprites.get('spr_roaringknight_slash_white_horizontal');
    if (streak) {
      drawSpriteExt(ctx, streak, 0, sc.slash.x - cam, sc.slash.y, 2, 2, 0, null, 1);
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, sc.slash.y - 4, VIEW_W, 8);
    }
  }

  if (sc.flash) {
    const f = sc.flash;
    const t = f.t <= 8 ? f.t / 8 : Math.max(0, 1 - (f.t - 10) / 8);
    const eased = 1 - (1 - t) * (1 - t);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, eased * f.peak));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  const msg = sprites.get('spr_battlemsg');
  if (msg) {
    for (const s of sc.swoons) {
      const age = sc.t - s.born;
      let stretch = Math.min(1, 0.2 + 0.4 * age);
      const kill = age > 35 ? Math.min(1, (age - 35) * 0.1) : 0;
      if (kill >= 1) continue;
      drawSpriteExt(ctx, msg, 13, s.x - cam + 30, s.y, 2 - stretch,
        stretch + kill, 0, [255, 0, 0], 1 - kill);
    }
  }

  if (sc.dialogue) {

    const line = (sc.lines ?? VICTORY_LINES)[sc.dialogue.line];
    const bx0 = 24;
    const by0 = 312;
    const bx2 = 616;
    const by3 = 478;

    ctx.fillStyle = '#000';
    ctx.fillRect(bx0 + 20, by0 + 20, bx2 - 20 - (bx0 + 20), by3 - 20 - (by0 + 20));
    const top = sprites.get('spr_textbox_top');
    const left = sprites.get('spr_textbox_left');
    const corner = sprites.get('spr_textbox_topleft');
    const bw = bx2 - bx0 - 63;
    const bh = by3 - by0 - 63;
    if (top) {
      drawSpriteExt(ctx, top, 0, bx0 + 32, by0, bw, 2, 0, null, 1);
      drawSpriteExt(ctx, top, 0, bx0 + 32, by3 + 1, bw, -2, 0, null, 1);
    }
    if (left) {
      drawSpriteExt(ctx, left, 0, bx2 + 1, by0 + 32, -2, bh, 0, null, 1);
      drawSpriteExt(ctx, left, 0, bx0, by0 + 32, 2, bh, 0, null, 1);
    }
    if (corner) {
      const jewel = Math.floor(sc.t / 10) % (corner.meta.frames ?? 8);
      drawSpriteExt(ctx, corner, jewel, bx0, by0, 2, 2, 0, null, 1);
      drawSpriteExt(ctx, corner, jewel, bx2 + 1, by0, -2, 2, 0, null, 1);
      drawSpriteExt(ctx, corner, jewel, bx0, by3 + 1, 2, -2, 0, null, 1);
      drawSpriteExt(ctx, corner, jewel, bx2 + 1, by3 + 1, -2, -2, 0, null, 1);
    }

    const writerX = bx0 + 36;
    const writerY = by0 + 26;
    const faceX = writerX + 16;
    const faceY = writerY + 10;

    const FACE_FRAME = { 0: 40, 1: 32, 2: 34, 3: 33, 4: 34, 5: 34, 6: 35 };
    const frame = FACE_FRAME[sc.dialogue.line] ?? 0;
    if (line.speaker === 'susie') {
      const face = sprites.get('spr_face_susie_alt');
      if (face) drawSpriteExt(ctx, face, frame, faceX - 5, faceY, 2, 2, 0, null, 1);
    } else {
      const face = sprites.get('spr_face_r_nohat');
      if (face) drawSpriteExt(ctx, face, frame, faceX - 15, faceY - 10, 2, 2, 0, null, 1);
    }

    const font = loadFont('../assets/fonts', 'fnt_mainbig');
    if (font?.ready) {
      const lines = revealed(formatWriter(line.text, 26), sc.dialogue.timer, 1);
      for (let i = 0; i < lines.length; i++) {
        drawText(ctx, font, lines[i], writerX + 116, writerY + 8 + i * 36,
          { color: 'rgb(255,255,255)', advance: 16, special: 1 });
      }
    }
  }
}
