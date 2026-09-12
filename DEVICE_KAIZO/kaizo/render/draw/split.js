

import { drawSpriteExt, tinted, ldx, ldy } from '../../../render/draw/gm.js';
import {
  scrEaseOut, clamp01, lerp, mergeColor, BLACK, WHITE, pointDirection, pointDistance,
} from '../../../sim/gml.js';

import { KAIZO_TELEGRAPH_COLOR, getSwordcolor } from '../../attacks/kaizo-colors.js';

const VIEW_W = 640;
const VIEW_H = 480;

const HELL = 142;

const asColor = (c) => (Array.isArray(c) ? c : null);

function frameOf(entry, sub) {
  if (!entry || !entry.frames || !entry.frames.length) return null;
  const n = entry.frames.length;
  return entry.frames[(((Math.floor(sub) | 0) % n) + n) % n] ?? null;
}

function makeSurface(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
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

function drawSpriteGeneral(ctx, entry, sub, left, top, width, height, x, y, xs, ys, rot, blend, alpha) {
  const img = frameOf(entry, sub);
  if (!img || width === 0 || height === 0 || xs === 0 || ys === 0) return;
  const src = blend ? tinted(img, blend) : img;
  const sx0 = Math.min(left, left + width);
  const sy0 = Math.min(top, top + height);
  const sw = Math.abs(width);
  const sh = Math.abs(height);

  const dx0 = Math.min(0, width);
  const dy0 = Math.min(0, height);
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.translate(x, y);
  if (rot) ctx.rotate((-rot * Math.PI) / 180);
  ctx.scale(xs, ys);
  ctx.drawImage(src, sx0, sy0, sw, sh, dx0, dy0, sw, sh);
  ctx.restore();
}

function drawSpritePartExtRot(ctx, entry, sub, left, top, width, height, x, y, xs, ys, rot, blend, alpha) {
  if (!entry || !entry.meta) return;
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  const xoffset = (entry.meta.ox ?? 0) * xs;
  const yoffset = (entry.meta.oy ?? 0) * ys;
  const newx = left * xs;
  const newy = top * ys;
  const theta = pointDirection(xoffset, yoffset, newx, newy) + rot;
  const radius = pointDistance(xoffset, yoffset, newx, newy);
  const xx = x + ldx(radius, theta);
  const yy = y + ldy(radius, theta);
  drawSpriteGeneral(ctx, entry, sub, left, top, width / xs - left, height / ys - top,
    xx, yy, xs, ys, rot, blend, alpha);
}

function drawSpriteTiledExt(ctx, entry, sub, x, y, xs, ys, blend, alpha, W, H) {
  const img = frameOf(entry, sub);
  if (!img) return;
  const tw = (entry.meta?.w ?? img.width) * xs;
  const th = (entry.meta?.h ?? img.height) * ys;
  if (!(tw > 0) || !(th > 0)) return;
  const src = blend ? tinted(img, blend) : img;
  let startX = ((((x - (entry.meta?.ox ?? 0) * xs) % tw) + tw) % tw);
  if (startX > 0) startX -= tw;
  let startY = ((((y - (entry.meta?.oy ?? 0) * ys) % th) + th) % th);
  if (startY > 0) startY -= th;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  for (let ty = startY; ty < H; ty += th) {
    for (let tx = startX; tx < W; tx += tw) {
      ctx.drawImage(src, tx, ty, tw, th);
    }
  }
  ctx.restore();
}

function blendDestAlphaAdd(hell, flow, draw) {
  const fg = flow.g;
  fg.setTransform(1, 0, 0, 1, 0, 0);
  fg.globalCompositeOperation = 'source-over';
  fg.globalAlpha = 1;
  fg.clearRect(0, 0, HELL, HELL);
  draw(fg);
  fg.globalCompositeOperation = 'destination-in';
  fg.drawImage(hell.c, 0, 0);
  fg.globalCompositeOperation = 'source-over';
  const hg = hell.g;
  hg.globalCompositeOperation = 'lighter';
  hg.drawImage(flow.c, 0, 0);
  hg.globalCompositeOperation = 'source-over';
}

function drawSurfacePart(ctx, surf, left, top, width, height, x, y) {
  if (!(width > 0) || !(height > 0)) return;
  ctx.drawImage(surf, left, top, width, height, x, y, width, height);
}

function findAlive(state, name) {
  return state.entities.find((x) => x.alive && x.type.name === name);
}

const hellSurfaces = new WeakMap();
function hellSurfacesFor(helpers) {
  let s = hellSurfaces.get(helpers);
  if (!s) {
    s = { hell: makeSurface(HELL, HELL), flow: makeSurface(HELL, HELL) };
    hellSurfaces.set(helpers, s);
  }
  return s;
}

function drawHellSurfaceKaizo(ctx, state, helpers) {
  const gt = findAlive(state, 'obj_growtangle');
  if (!gt) return;
  const pending = state.entities.filter(
    (s) => s.alive && s.type.name === 'obj_roaringknight_splitslash' && !s.slash,
  );
  if (!pending.length) return;

  const { sprites } = helpers;
  const px = sprites.get('spr_pxwhite10_center');
  const flowSprite = sprites.get('spr_knight_bullet_flow');

  const { hell, flow } = hellSurfacesFor(helpers);
  const hg = hell.g;
  hg.setTransform(1, 0, 0, 1, 0, 0);
  hg.globalCompositeOperation = 'source-over';
  hg.globalAlpha = 1;
  hg.clearRect(0, 0, HELL, HELL);

  for (const s of pending) {
    const t = clamp01((s.timer ?? 0) / 30);
    const ease = scrEaseOut(t, 3);
    const spin = (ease * 15 - 15) * (s.flip ?? 1);
    const blend = asColor(s.image_blend) ?? BLACK;
    const backing = mergeColor(BLACK, blend, 0.5);
    const size = lerp(4, 0, ease);
    const length = t * 90;
    if (px) {
      drawSpriteExt(hg, px, 0, 71 + (s.xoffset ?? 0), 71 + (s.yoffset ?? 0),
        length, size, spin + (s.image_angle ?? 0) + (s.angleoffset ?? 0), backing, 1);
    }
    if (flowSprite) {
      const timer = s.timer ?? 0;
      blendDestAlphaAdd(hell, flow, (fg) => {
        drawSpriteTiledExt(fg, flowSprite, 2, timer, timer, 0.25, 0.25, blend, 1, HELL, HELL);
      });
      blendDestAlphaAdd(hell, flow, (fg) => {
        drawSpriteTiledExt(fg, flowSprite, 2, -timer + 40, -timer + 40, 0.25, 0.25, blend, 1, HELL, HELL);
      });
    }
  }

  const hx = gt.x - 71;
  const hy = gt.y - 71;
  helpers.defer(() => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    ctx.drawImage(hell.c, hx, hy);
    ctx.restore();
  });
}

export function drawObjRoaringknightBoxsplitterAttack(ctx, e, state, helpers) {
  if (e.image_alpha > 0) helpers.drawSelf(e, state);
  drawHellSurfaceKaizo(ctx, state, helpers);
  return true;
}

drawObjRoaringknightBoxsplitterAttack.ownsHellSurface = true;

const SPLITSLASH_BACKING = mergeColor(BLACK, KAIZO_TELEGRAPH_COLOR, 0.5);

export function drawObjRoaringknightSplitslash(ctx, e, state, helpers) {

  for (const s of state.entities) {
    if (s.alive && s !== e && s.type.name === 'obj_roaringknight_splitslash' && s.playerstrike) {
      return true;
    }
  }
  const { sprites } = helpers;

  if (e.slash) {
    helpers.drawSelf(e, state);
  } else {

    const px = sprites.get('spr_pxwhite10_center');
    const mg = findAlive(state, 'obj_roaringknight_boxsplitter_attack');
    const growtangle = mg
      ? (mg.splitterRef && mg.splitterRef.alive ? mg.splitterRef : findAlive(state, 'obj_growtangle'))
      : (findAlive(state, 'obj_knight_split_growtangle') ?? findAlive(state, 'obj_growtangle'));
    if (px && growtangle) {
      const ease = scrEaseOut(clamp01((e.timer ?? 0) / 30), 3);
      const spin = (ease * 15 - 15) * (e.flip ?? 1);
      const size = lerp(4, 0, ease);
      const length = ease * 180;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawSpriteExt(ctx, px, 0, growtangle.x + (e.xoffset ?? 0), growtangle.y + (e.yoffset ?? 0),
        length, size, spin + (e.image_angle ?? 0) + (e.angleoffset ?? 0), SPLITSLASH_BACKING, 1);
      ctx.restore();
    }
  }

  if (e.playerstrike === 1 || e.playerstrike === true) {
    const heart = state.soul;
    if (heart && heart.alive !== false) {
      const frame = state.frame ?? 0;

      const dx = e.strikeJitter ? e.strikeJitter.xx : irandomFrame(helpers.frandCanvas, frame, 0x51a5 + e.seq * 2 + 1, 2) - 1;
      const dy = e.strikeJitter ? e.strikeJitter.yy : irandomFrame(helpers.frandCanvas, frame, 0x51a5 + e.seq * 2 + 2, 2) - 1;
      const fade = remapClamped(45, 55, 1, 0, e.timer ?? 0);

      const hs = sprites.get(heart.sprite_index) ?? sprites.get('spr_dodgeheart');
      if (hs) drawSpriteExt(ctx, hs, 0, heart.x + dx, heart.y + dy, 1, 1, 0, null, 1);
      const slice = sprites.get('spr_rk_slash_heartslice');

      if (slice) drawSpriteExt(ctx, slice, e.cuty ?? 1, heart.x + dx, heart.y + dy, 1, 1, 0, null, fade);
    }

  }
  return true;
}

export function drawObjRoaringknightSplitBullet(ctx, e, state, helpers) {
  if (e.coltimer === undefined) {

    const frame = state.frame ?? 0;
    const coltimer = Math.max(0, frame - (e.bornFrame ?? frame) - 1);
    const quickslash = state.entities.some(
      (s) => s.alive && s.type.name === 'obj_roaringknight_quickslash_attack',
    );
    const blend = quickslash
      ? mergeColor(getSwordcolor(state), WHITE, coltimer / 40)
      : mergeColor(KAIZO_TELEGRAPH_COLOR, WHITE, coltimer / 30);

    helpers.drawSelf(Object.create(e, { image_blend: { value: blend } }), state);
    return true;
  }
  helpers.drawSelf(e, state);
  return true;
}

const snapshots = new WeakMap();

export function drawObjKnightSplitGrowtangleEffect(ctx, e, state, helpers) {
  const { sprites } = helpers;

  let snap = snapshots.get(e);
  if (!snap) {
    snap = makeSurface(VIEW_W, VIEW_H);
    snap.g.drawImage(ctx.canvas, 0, 0);
    snapshots.set(e, snap);
  }
  const angle = e.angle ?? 0;
  const xmul = ldx(1, angle);
  const ymul = ldy(1, angle);

  const timer = e.timer ?? 0;
  const fade = (10 - timer) / 10;
  const htimer = (e.vertical ? 0 : timer) * xmul;
  const vtimer = (e.vertical ? timer : 0) * ymul;

  const entry = sprites.get(e.sprite_index ?? 'spr_battlebg_0');
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  if (entry && entry.frames && entry.frames.length) {
    const spriteWidth = (entry.meta?.w ?? entry.frames[0].width) * xs;
    const spriteHeight = (entry.meta?.h ?? entry.frames[0].height) * ys;
    let splitwidth = spriteWidth;
    let splitheight = spriteHeight;
    let splitleft = 0;
    let splittop = 0;
    if (e.vertical) {
      splitleft = spriteWidth / 2;
      splitwidth /= 2;
    } else {
      splittop = spriteHeight / 2;
      splitheight /= 2;
    }
    const blend = asColor(e.image_blend);
    const part = (left, top, mul, alpha) => drawSpritePartExtRot(ctx, entry, 0,
      left, top, splitwidth, splitheight,
      e.x + htimer * mul, e.y + vtimer * mul, xs, ys, 0, blend, alpha);
    part(0, 0, -8, clamp01(fade));
    part(0, 0, -6, clamp01(fade));
    part(0, 0, -4, fade);
    part(splitleft, splittop, 8, clamp01(fade));
    part(splitleft, splittop, 6, clamp01(fade));
    part(splitleft, splittop, 4, fade);
  }

  const camx = state.view?.x ?? 0;
  const camy = state.view?.y ?? 0;
  const sx = e.x - camx;
  const sy = e.y - camy;
  ctx.save();
  ctx.globalAlpha = clamp01(fade / 2);
  if (e.vertical) {
    drawSurfacePart(ctx, snap.c, 0, 0, sx, VIEW_H, camx, camy - timer * 8);

    drawSurfacePart(ctx, snap.c, 0, 0, VIEW_W - sx, VIEW_H, e.x, camy + timer * 8);
  } else {
    drawSurfacePart(ctx, snap.c, 0, 0, VIEW_W, sy, camx - timer * 8, camy);
    drawSurfacePart(ctx, snap.c, 0, sy, VIEW_W, VIEW_H - sy, camx + timer * 8, e.y);
  }
  ctx.restore();

  const px = sprites.get('spr_pxwhite10_center');
  if (px) {
    let a = angle;
    if (e.vertical) a += 90;
    if (e.diagonal) a += 45;
    const fx = e.x + (e.xoffset ?? 0);
    const fy = e.y + (e.yoffset ?? 0);
    drawSpriteExt(ctx, px, 0, fx, fy, 50, fade, a, null, 1);
    drawSpriteExt(ctx, px, 0, fx, fy, 50, fade * 1.4, a, null, 0.5);
  }

  return true;
}
