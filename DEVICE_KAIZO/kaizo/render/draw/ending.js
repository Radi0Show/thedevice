

import { drawSpriteExt } from '../../../render/draw/gm.js';
import { drawSnowBackdrop } from '../../../render/draw/intro-fx.js';
import { drawSpriteText, FONTS } from '../../../render/text.js';
import { loadFont, drawText } from '../../../render/font.js';
import { formatWriter, revealed } from '../../../sim/dialogue.js';
import {
  ensureEnding, endingActor, endingMarker, endingAfterimages,
  SPR, OVERLAY_SCALE, C_WHITE,
} from '../../scenes/kaizo-ending.js';

const VIEW_W = 640;
const VIEW_H = 480;

const ACTOR_SCALE = 2;

function srand(frame, salt) {
  let t = (frame * 374761393 + salt * 668265263) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function css(c) {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

export function objShakeOffset(sc, who, frame) {
  let dx = 0;
  let dy = 0;
  for (const s of sc.shakes) {
    if (!s.objshake || s.target !== who) continue;
    const age = frame - s.frame;
    if (age < 0) continue;
    const speed = Math.max(1, s.shakespeed ?? 1);
    const steps = Math.floor(age / speed);
    const ax = (s.shakexamt ?? 0) - steps * (s.shakereduct ?? 1);
    const ay = (s.shakeyamt ?? 0) - steps * (s.shakereduct ?? 1);
    if (ax <= 0 && ay <= 0) continue;
    const sign = steps % 2 === 0 ? 1 : -1;
    if (ax > 0) dx += sign * Math.round(ax * (srand(s.frame + steps, 11) * 0.5 + 0.5));
    if (ay > 0) dy += sign * Math.round(ay * (srand(s.frame + steps, 12) * 0.5 + 0.5));
  }
  return [dx, dy];
}

function shakeamtOffset(e, frame) {
  const amt = e.shakeamt ?? 0;
  if (!(amt > 0)) return [0, 0];
  return [
    (srand(frame, 21) * 2 - 1) * amt,
    (srand(frame, 22) * 2 - 1) * amt,
  ];
}

function drawFullscreenMarker(ctx, m, cam) {
  const w = 4 * (m.image_xscale ?? 1);
  const h = 4 * (m.image_yscale ?? 1);
  const a = clamp01(m.image_alpha ?? 1);
  if (a <= 0) return false;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = css(m.image_blend ?? C_WHITE);
  ctx.fillRect(m.x - cam, m.y, w, h);
  ctx.restore();
  return true;
}

function drawMarker(ctx, sprites, m, cam) {
  if (m.visible === false) return false;
  if ((m.image_xscale ?? 1) === OVERLAY_SCALE) return drawFullscreenMarker(ctx, m, cam);
  const entry = sprites.get(m.sprite);
  if (!entry || !entry.frames.length) return false;
  if (clamp01(m.image_alpha ?? 1) <= 0) return false;
  drawSpriteExt(ctx, entry, Math.floor(m.image_index ?? 0),
    m.x - cam, m.y, m.image_xscale ?? 2, m.image_yscale ?? 2,
    m.image_angle ?? 0, null, clamp01(m.image_alpha ?? 1));
  return true;
}

function drawEndingActor(ctx, sprites, a, cam, frame) {
  if (a.visible === false) return false;
  const entry = sprites.get(a.sprite);
  if (!entry || !entry.frames.length) return false;
  const [jx, jy] = shakeamtOffset(a, frame);
  drawSpriteExt(ctx, entry, Math.floor(a.image_index ?? 0),
    a.x - cam + jx, a.y + jy,

    (a.image_xscale ?? 1) === 1 ? ACTOR_SCALE : a.image_xscale,
    (a.image_yscale ?? 1) === 1 ? ACTOR_SCALE : a.image_yscale,
    a.image_angle ?? 0, null, clamp01(a.image_alpha ?? 1));
  return true;
}

function drawAfterimage(ctx, sprites, g, cam) {
  const entry = sprites.get(g.sprite);
  if (!entry || !entry.frames.length) return false;
  const a = clamp01(g.image_alpha);
  if (a <= 0) return false;
  drawSpriteExt(ctx, entry, Math.floor(g.image_index ?? 0), g.x - cam, g.y,
    (g.image_xscale ?? 1) === 1 ? ACTOR_SCALE : g.image_xscale,
    (g.image_yscale ?? 1) === 1 ? ACTOR_SCALE : g.image_yscale,
    g.image_angle ?? 0, null, a);
  return true;
}

const OUCHIE_COLOR = [255, 0, 0];
const WRITER_DELAY = 2;
const WRITER_VSPEED = -6;

function writerPose(age) {
  let t = age - WRITER_DELAY;
  if (t < 0) return null;
  let vspeed = WRITER_VSPEED;
  const vstart = vspeed;
  let hspeed = 10;
  let dx = 0;
  let dy = 0;
  let bounces = 0;
  const killStart = 35;
  for (let i = 0; i < t; i++) {
    if (hspeed > 0) hspeed -= 1;
    else if (hspeed < 0) hspeed += 1;
    if (Math.abs(hspeed) < 1) hspeed = 0;
    dx += hspeed;
    const killactive = i >= killStart ? 1 : 0;
    if (bounces < 2) vspeed += 1;
    dy += vspeed;
    if (dy > 0 && bounces < 2 && killactive === 0) {
      dy = 0;
      vspeed = vstart / 2;
      bounces += 1;
    }
    if (bounces >= 2 && killactive === 0) { vspeed = 0; dy = 0; }
  }
  const stretch = Math.min(1, 0.2 + 0.4 * t);
  const kill = t > killStart ? (t - killStart) * 0.08 : 0;
  if (kill >= 1) return null;
  return { dx, dy, stretch, kill };
}

function drawWriters(ctx, sprites, sc, frame) {
  let painted = 0;
  const msg = sprites.get('spr_battlemsg');
  const all = [
    ...sc.ouchies.map((o) => ({ ...o, type: 0, color: OUCHIE_COLOR })),
    ...sc.swoons.map((s) => ({ ...s, type: 12, color: OUCHIE_COLOR })),
  ];
  for (const w of all) {
    const pose = writerPose(frame - w.frame);
    if (!pose) continue;
    const xs = 2 - pose.stretch;
    const ys = pose.stretch + pose.kill;
    const alpha = clamp01(1 - pose.kill);
    if (xs <= 0 || ys <= 0 || alpha <= 0) continue;

    const x = w.x - Math.round(sc.camX) + pose.dx + 30;
    const y = w.y + pose.dy;
    if (w.type === 12) {
      if (!msg) continue;
      drawSpriteExt(ctx, msg, 13, x, y, xs, ys, 0, w.color, alpha);
      painted += 1;
      continue;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(xs, ys);
    drawSpriteText(ctx, sprites, FONTS.damage, String(w.damage), 0, 0, {
      halign: 'right', color: css(w.color),
    });
    ctx.restore();
    painted += 1;
  }
  return painted;
}

function drawEndingBox(ctx, sprites, sc, frame) {
  if (!sc.dialogueOpen || !sc.msgs.length) return;
  const m = sc.msgs[sc.msgs.length - 1];
  const bx0 = 24;
  const by0 = 312;
  const bx2 = 616;
  const by3 = 478;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    const jewel = Math.floor(frame / 10) % (corner.meta.frames ?? 8);
    drawSpriteExt(ctx, corner, jewel, bx0, by0, 2, 2, 0, null, 1);
    drawSpriteExt(ctx, corner, jewel, bx2 + 1, by0, -2, 2, 0, null, 1);
    drawSpriteExt(ctx, corner, jewel, bx0, by3 + 1, 2, -2, 0, null, 1);
    drawSpriteExt(ctx, corner, jewel, bx2 + 1, by3 + 1, -2, -2, 0, null, 1);
  }
  const writerX = bx0 + 36;
  const writerY = by0 + 26;
  const face = sprites.get(m.speaker === 'susie' ? 'spr_face_susie_alt' : 'spr_face_r_nohat');
  if (face) {
    const fx = m.speaker === 'susie' ? writerX + 16 - 5 : writerX + 16 - 15;
    const fy = m.speaker === 'susie' ? writerY + 10 : writerY + 10 - 10;
    drawSpriteExt(ctx, face, 0, fx, fy, 2, 2, 0, null, 1);
  }
  const font = loadFont('../assets/fonts', 'fnt_mainbig');
  if (font?.ready) {
    const lines = revealed(formatWriter(m.text, 26), Math.max(0, frame - m.frame), 1);
    for (let i = 0; i < lines.length; i++) {
      drawText(ctx, font, lines[i], writerX + 116, writerY + 8 + i * 36,
        { color: 'rgb(255,255,255)', advance: 16, special: 1 });
    }
  }
  ctx.restore();
}

export function drawKaizoEpilogue(ctx, st, sprites) {
  const sc = ensureEnding(st);
  const frame = st.frame ?? 0;
  const cam = Math.round(sc.camX ?? 0);
  const report = {
    cam, actors: 0, markers: 0, overlays: 0, afterimages: 0, writers: 0, box: false,
  };

  const vx = st.view?.x ?? 0;
  const vy = st.view?.y ?? 0;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = '#000';
  ctx.fillRect(-16, -16, VIEW_W + 32, VIEW_H + 32);

  ctx.translate(-vx, -vy);

  drawSnowBackdrop(ctx, cam, 0.1 * frame, sprites);

  const world = st.entities
    .filter((e) => e.alive && (e.type === endingActor || e.type === endingMarker))
    .sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0) || a.seq - b.seq);

  const ghosts = endingAfterimages(st);

  for (const e of world) {
    if (e.type === endingActor && e.who === 'knight') {

      for (const g of ghosts) {
        if (drawAfterimage(ctx, sprites, g, cam)) report.afterimages += 1;
      }
    }
    if (e.type === endingActor) {
      const [sx, sy] = objShakeOffset(sc, e.who, frame);
      let painted;
      if (sx || sy) {
        ctx.save();
        ctx.translate(sx, sy);
        painted = drawEndingActor(ctx, sprites, e, cam, frame);
        ctx.restore();
      } else {
        painted = drawEndingActor(ctx, sprites, e, cam, frame);
      }
      if (painted) report.actors += 1;
    } else if (drawMarker(ctx, sprites, e, cam)) {

      if ((e.image_xscale ?? 1) === OVERLAY_SCALE) report.overlays += 1;
      else report.markers += 1;
    }
  }

  ctx.restore();

  report.writers = drawWriters(ctx, sprites, sc, frame);
  report.writerRecords = sc.ouchies.length + sc.swoons.length;

  if (sc.dialogueOpen && sc.msgs.length) {
    drawEndingBox(ctx, sprites, sc, frame);
    report.box = true;
  }
  return report;
}

export function epilogueRalseiSprite(st) {
  return ensureEnding(st).actors.ra?.sprite ?? null;
}

export const SWOON_EASTER_EGG = SPR.ralseiSwoon;
