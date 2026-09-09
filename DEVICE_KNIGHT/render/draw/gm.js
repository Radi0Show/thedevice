



export const ldx = (len, deg) => len * Math.cos((deg * Math.PI) / 180);

export const ldy = (len, deg) => -len * Math.sin((deg * Math.PI) / 180);

export const c_white = [255, 255, 255];
export const c_gray = [128, 128, 128];
export const c_red = [255, 0, 0];
export const c_black = [0, 0, 0];


export function mergeColor(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

export const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;



const tintCache = new Map();



const TINT_CACHE_CAP = 2048;
function remember(key, c) {
  if (tintCache.size >= TINT_CACHE_CAP) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
}



export function tintInto(dst, img, color) {
  if (dst.width !== img.width || dst.height !== img.height) {
    dst.width = img.width;
    dst.height = img.height;
  }
  const g = dst.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, dst.width, dst.height);
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = rgb(color);
  g.fillRect(0, 0, dst.width, dst.height);

  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return dst;
}

export function tinted(img, color) {
  if (!img) return null;

  if (!Array.isArray(color)) {
    throw new TypeError(
      `tinted() needs an [r,g,b] array, got ${JSON.stringify(color)}`,
    );
  }

  if (color[0] === 255 && color[1] === 255 && color[2] === 255) return img;

  const key = img.src ? `${img.src}|${color[0]},${color[1]},${color[2]}` : null;
  if (key) {
    const hit = tintCache.get(key);
    if (hit) return hit;
  }
  const c = tintInto(document.createElement('canvas'), img, color);
  if (key) remember(key, c);
  return c;
}





export function fogged(img, color) {
  if (!img) return null;
  if (!Array.isArray(color)) {
    throw new TypeError(`fogged() needs an [r,g,b] array, got ${JSON.stringify(color)}`);
  }
  const key = img.src ? `fog|${img.src}|${color[0]},${color[1]},${color[2]}` : null;
  if (key) {
    const hit = tintCache.get(key);
    if (hit) return hit;
  }
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = rgb(color);
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  if (key) remember(key, c);
  return c;
}

export function drawSpriteExt(ctx, entry, sub, x, y, xs, ys, angleDeg, color, alpha, fog = false) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[((sub | 0) % entry.frames.length + entry.frames.length) % entry.frames.length];
  if (!img) return;
  const src = color ? (fog ? fogged(img, color) : tinted(img, color)) : img;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  if (angleDeg) ctx.rotate((-angleDeg * Math.PI) / 180);
  ctx.scale(xs, ys);
  ctx.drawImage(src, -(entry.meta.ox ?? 0), -(entry.meta.oy ?? 0));
  ctx.restore();
}



export function drawSpriteExtNineSlice(ctx, entry, sub, x, y, xs, ys, angleDeg, color, alpha, guide) {
  if (!entry || !entry.frames.length) return;
  const img = entry.frames[((sub | 0) % entry.frames.length + entry.frames.length) % entry.frames.length];
  if (!img) return;
  const w = img.width;
  const h = img.height;
  const W = w * xs;
  const H = h * ys;
  if (!(W > 0) || !(H > 0)) return;
  const src = color ? tinted(img, color) : img;
  const g = guide;
  const cw = Math.min(g, W / 2);
  const ch = Math.min(g, H / 2);
  const ew = W - 2 * cw;
  const eh = H - 2 * ch;
  const sw = w - 2 * g;
  const sh = h - 2 * g;
  const ox = -(entry.meta.ox ?? 0) * xs;
  const oy = -(entry.meta.oy ?? 0) * ys;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  if (angleDeg) ctx.rotate((-angleDeg * Math.PI) / 180);
  const slice = (sx, sy, sW, sH, dx, dy, dW, dH) => {
    if (sW <= 0 || sH <= 0 || dW <= 0 || dH <= 0) return;
    ctx.drawImage(src, sx, sy, sW, sH, ox + dx, oy + dy, dW, dH);
  };

  slice(0, 0, g, g, 0, 0, cw, ch);
  slice(w - g, 0, g, g, W - cw, 0, cw, ch);
  slice(0, h - g, g, g, 0, H - ch, cw, ch);
  slice(w - g, h - g, g, g, W - cw, H - ch, cw, ch);

  slice(g, 0, sw, g, cw, 0, ew, ch);
  slice(g, h - g, sw, g, cw, H - ch, ew, ch);
  slice(0, g, g, sh, 0, ch, cw, eh);
  slice(w - g, g, g, sh, W - cw, ch, cw, eh);

  slice(g, g, sw, sh, cw, ch, ew, eh);
  ctx.restore();
}





const beamGradients = new WeakMap();

export function drawBeamColor(ctx, x, y, length, width, angle, color, alpha, circle = false) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (circle) {
    ctx.fillStyle = rgb(color);
    ctx.beginPath();
    ctx.arc(x + ldx(length, angle), y + ldy(length, angle), width / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  let perCtx = beamGradients.get(ctx);
  if (!perCtx) beamGradients.set(ctx, (perCtx = new Map()));
  const key = `${rgb(color)}|${Math.round(length)}`;
  let g = perCtx.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, 0, Math.round(length), 0);
    g.addColorStop(0, rgb(color));
    g.addColorStop(1, 'rgb(0,0,0)');
    perCtx.set(key, g);
  }
  ctx.translate(x, y);
  ctx.rotate((-angle * Math.PI) / 180);
  const half = (width / 2) * Math.PI / 180;
  const ex = length * Math.cos(half);
  const ey = length * Math.sin(half);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ex, -ey);
  ctx.lineTo(ex, ey);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}



export function drawOutline(ctx, entry, e, dist, color, alpha) {
  let xA = dist;
  let xB = 0;
  let yA = 0;
  let yB = dist;
  if (e.image_angle % 90 !== 0) {
    xA = ldx(dist, e.image_angle);
    xB = ldx(dist, e.image_angle + 90);
    yA = ldy(dist, e.image_angle + 90);
    yB = ldy(dist, e.image_angle);
  }
  const a = e.image_alpha * alpha;
  for (const [dx, dy] of [[xA, yA], [-xA, -yA], [xB, yB], [-xB, -yB]]) {
    drawSpriteExt(ctx, entry, e.image_index, e.x + dx, e.y + dy,
      e.image_xscale, e.image_yscale, e.image_angle, color, a);
  }
}


export function pingpong(v, n) {
  if (n === 0) return v;
  const m = ((v % (n * 2)) + n * 2) % (n * 2);
  return m > n ? n * 2 - m : m;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);






const customBoxBakes = new Map();
function customBoxBake(entry, maxxscale, maxyscale, blend) {
  const key = `${maxxscale}|${maxyscale}|${blend ? blend.join(',') : ''}`;
  let c = customBoxBakes.get(key);
  if (c) return c;
  c = document.createElement('canvas');

  c.width = Math.max(1, Math.round((entry.meta.w ?? 75) * maxxscale / 2));
  c.height = Math.max(1, Math.round((entry.meta.h ?? 75) * maxyscale / 2));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  drawSpriteExtNineSlice(g, entry, 0,
    (entry.meta.ox ?? 0) * maxxscale / 2, (entry.meta.oy ?? 0) * maxyscale / 2,
    maxxscale / 2, maxyscale / 2, 0, blend, 1, 2);
  customBoxBakes.set(key, c);
  return c;
}

export function drawGrowtangle(ctx, e, sprites, fallbackName) {

  const entry = sprites.get(e.sprite_index ?? fallbackName);
  if (!entry || entry.frames.length < 2) return false;


  const custom = !!e.customBox && (e.maxxscale !== 2 || e.maxyscale !== 2);
  const hitbox = custom ? sprites.get('spr_battlebg_stretch_hitbox') : null;
  if (!custom || !hitbox || hitbox.frames.length < 2) {
    drawSpriteExt(ctx, entry, 1, e.x, e.y,
      e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, e.image_alpha);
    return false;
  }


  drawSpriteExtNineSlice(ctx, hitbox, 1, e.x, e.y,
    e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, e.image_alpha, 4);


  const growing = (e.growcon === 1 && e.timer < e.maxtimer) || (e.growcon === 3 && e.timer > 0);
  if (growing) {
    const bake = customBoxBake(entry, e.maxxscale, e.maxyscale, e.image_blend);
    const sc = (e.timer / e.maxtimer) * (e.growscale ?? 2);
    if (sc > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, e.image_alpha));
      ctx.translate(e.x, e.y);
      if (e.image_angle) ctx.rotate((-e.image_angle * Math.PI) / 180);
      ctx.scale(sc, sc);

      ctx.drawImage(bake, -(entry.meta.ox ?? 0) * e.maxxscale / 2, -(entry.meta.oy ?? 0) * e.maxyscale / 2);
      ctx.restore();
    }
  } else {

    drawSpriteExtNineSlice(ctx, hitbox, 0, e.x, e.y,
      e.image_xscale, e.image_yscale, e.image_angle, e.image_blend, e.image_alpha, 4);
  }
  return true;
}
