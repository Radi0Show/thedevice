


import { drawSpriteExt, tintInto, rgb, mergeColor, c_black } from './draw/gm.js';
import { KNIGHT_MAXHP } from '../sim/knight.js';

const c_purple = [128, 0, 128];

const BASE_BLEND = [0x27, 0x29, 0x3f];


function hsv255(h, s, v) {
  const hh = ((h % 256) + 256) % 256;
  const i = Math.floor((hh / 256) * 6) % 6;
  const f = ((hh / 256) * 6) - Math.floor((hh / 256) * 6);
  const sv = s / 255;
  const vv = v;
  const p = vv * (1 - sv);
  const q = vv * (1 - sv * f);
  const t = vv * (1 - sv * (1 - f));
  const rgbv = [[vv, t, p], [q, vv, p], [p, vv, t], [p, q, vv], [t, p, vv], [vv, p, q]][i];
  return rgbv.map((x) => Math.max(0, Math.min(255, Math.round(x))));
}




function tiled(ctx, img, ox, oy, xs, ys, color, alpha, w, h) {
  const tw = img.width * xs;
  const th = img.height * ys;
  if (tw <= 0 || th <= 0) return;
  let sx = ox % tw;
  if (sx > 0) sx -= tw;
  let sy = oy % th;
  if (sy > 0) sy -= th;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  for (let x = sx; x < w; x += tw) {
    for (let y = sy; y < h; y += th) {
      ctx.drawImage(tint(img, color), x, y, tw, th);
    }
  }
  ctx.restore();
}


const tintCache = new Map();
function tint(img, color) {
  const key = `${img.src}|${color}`;
  let c = tintCache.get(key);
  if (c) return c;
  c = tintInto(document.createElement('canvas'), img, color);
  tintCache.set(key, c);
  return c;
}



let columnScratch = null;
let columnKey = null;
function columnTinted(img, sub, color) {
  const key = `${sub}|${color[0]},${color[1]},${color[2]}`;
  if (key !== columnKey || !columnScratch) {
    columnScratch ??= document.createElement('canvas');
    tintInto(columnScratch, img, color);
    columnKey = key;
  }
  return columnScratch;
}


function columnBlit(ctx, entry, src, x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.scale(2, 2);
  ctx.drawImage(src, -(entry.meta.ox ?? 0), -(entry.meta.oy ?? 0));
  ctx.restore();
}


function bar(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = rgb(color);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawBackground(ctx, state, sprites) {
  const fountain = sprites.get('spr_bg_fountain1');
  const gradient = sprites.get('spr_bg_knight_gradient');
  const column = sprites.get('spr_cc_fountainbg_white');

  if (!fountain?.frames[0] || !column?.frames.length) return;

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  const frame = state.frame ?? 0;

  const af = Math.min(1, frame / 120);


  const hp = state.knight?.hp ?? KNIGHT_MAXHP;
  const battleprog = 1 - ((hp - KNIGHT_MAXHP * 0.8) / KNIGHT_MAXHP) * 5;
  const oceanspeed = battleprog > 0.65 ? 2 : 1;

  const shakex = state.shakeX ?? 0;
  const shakey = state.shakeY ?? 0;
  const s = frame;


  const desicolor = hsv255(127.5 + (Math.sin(s / 90) * 255) / 2, 255, 255);


  tiled(ctx, fountain.frames[0], shakex - s * oceanspeed, shakey + s * oceanspeed,
    2, 2, c_purple, 0.5 * af * (battleprog + 0.3), W, H);
  tiled(ctx, fountain.frames[0], shakex - (s * oceanspeed) / 2, shakey - (s * oceanspeed) / 2,
    2, 2, c_purple, 0.35 * af * (battleprog + 0.2), W, H);


  if (gradient?.frames[0]) {
    drawSpriteExt(ctx, gradient, 0, shakex + W + 640, shakey + 90, -2, 2, 0, c_black, af);
    drawSpriteExt(ctx, gradient, 0, shakex, shakey + 90, 2, 2.05, 0, c_black, af);
  }


  bar(ctx, shakex - 40, shakey, 720, 90, c_black, 1);


  const blend = mergeColor(BASE_BLEND, desicolor, Math.max(0, Math.min(1, battleprog / 2)));
  bar(ctx, shakex + 138 + 50, shakey, 240, 90, mergeColor(blend, c_black, 0.8), af);

  const sub = Math.floor(s / 10) % column.frames.length;

  const col = columnTinted(column.frames[sub], sub, blend);
  for (let i = 1; i < 3; i++) {
    columnBlit(ctx, column, col,
      shakex + 138 - Math.sin(s / 20) * (i * 12), shakey, (i / 12) * af);
    columnBlit(ctx, column, col,
      shakex + 138 + Math.sin(s / 13) * (i * 6), shakey, (i / 12) * af);
  }
  columnBlit(ctx, column, col, shakex + 138, shakey, 1);


  bar(ctx, shakex - 40, shakey, 40, 480, c_black, 1);
  bar(ctx, shakex - 40, shakey - 20, 720, 20, c_black, 1);
}
