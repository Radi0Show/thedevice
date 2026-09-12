


const fontCaches = new Map();



export function loadFont(base = new URL('../assets/fonts', import.meta.url).href, name = 'fnt_mainbig') {
  if (fontCaches.has(name)) return fontCaches.get(name);
  const f = { ready: false, glyphs: new Map(), img: null, meta: null };
  fontCaches.set(name, f);

  fetch(new URL(`${base}/${name}.json`, import.meta.url))
    .then((r) => r.json())
    .then((meta) => {
      f.meta = meta;
      for (const g of meta.glyphs) f.glyphs.set(g.c, g);
      const img = new Image();
      img.onload = () => { f.img = img; f.ready = true; };
      img.src = new URL(`${base}/${name}.png`, import.meta.url).href;
    })
    .catch(() => {   });

  return f;
}


export function textWidth(font, text) {
  if (!font || !font.glyphs.size) return 0;
  let w = 0;
  let prev = null;
  for (const ch of String(text)) {
    const g = font.glyphs.get(ch.codePointAt(0));
    if (!g) continue;
    if (prev && prev.kern) w += prev.kern[ch.codePointAt(0)] ?? 0;
    w += g.shift;
    prev = g;
  }
  return w;
}


export function textHeight(font) {
  if (!font || !font.meta) return 0;
  let h = 0;
  for (const g of font.meta.glyphs) if (g.h > h) h = g.h;
  return h;
}



export function drawText(ctx, font, text, x, y, {
  xscale = 1, yscale = 1, color = null, alpha = 1, halign = 'left',

  colors = null,

  advance = null,

  special = 0,

  siner = 0,
} = {}) {
  if (!font || !font.ready || !font.img) return;

  let pen = x;
  if (halign !== 'left') {
    const w = textWidth(font, text) * xscale;
    pen -= halign === 'center' ? w / 2 : w;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;

  let prev = null;
  let at = 0;
  for (const ch of String(text)) {
    const col = (colors && colors[at] != null) ? colors[at] : color;
    at += ch.length;
    if (advance != null && ch === '|') {
      pen += advance * xscale;
      continue;
    }
    const code = ch.codePointAt(0);
    const g = font.glyphs.get(code);
    if (!g) continue;
    if (prev && prev.kern) pen += (prev.kern[code] ?? 0) * xscale;
    if (g.w > 0 && g.h > 0) {
      const gx = pen + g.offset * xscale;
      const blit = (src, dx, dy, a) => {
        ctx.globalAlpha = a;
        ctx.drawImage(src, g.x, g.y, g.w, g.h, dx, dy, g.w * xscale, g.h * yscale);
      };

      if (special === 1) blit(shadowPage(font), gx + xscale, y + yscale, alpha);

      if (special === 2) {
        const page = col ? tintedPage(font, col) : font.img;
        const near = (0.3 + Math.sin(siner / 14) * 0.1) * alpha;
        const far = (0.08 + Math.sin(siner / 14) * 0.04) * alpha;
        blit(page, gx + xscale, y, near);
        blit(page, gx - xscale, y, near);
        blit(page, gx, y + yscale, near);
        blit(page, gx, y - yscale, near);
        blit(page, gx + xscale, y + yscale, far);
        blit(page, gx - xscale, y - yscale, far);
        blit(page, gx - xscale, y + yscale, far);
        blit(page, gx + xscale, y - yscale, far);
      }
      blit(col ? tintedPage(font, col) : font.img, gx, y, alpha);
    }
    pen += (advance != null ? advance : g.shift) * xscale;
    prev = g;
  }
  ctx.restore();
}



export function styleColors(style) {
  if (!style || !style.some((s) => s && s.color)) return null;
  return style.map((s) => (s && s.color ? `rgb(${s.color[0]},${s.color[1]},${s.color[2]})` : null));
}



const shadowCache = new Map();
function shadowPage(font) {
  const key = font.meta?.name ?? 'font';
  let c = shadowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = font.img.width;
  c.height = font.img.height;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (const gl of font.meta.glyphs) {
    if (!(gl.w > 0 && gl.h > 0)) continue;
    const grad = g.createLinearGradient(0, gl.y, 0, gl.y + gl.h);
    grad.addColorStop(0, 'rgb(64,64,64)');
    grad.addColorStop(1, 'rgb(0,0,128)');
    g.fillStyle = grad;
    g.fillRect(gl.x, gl.y, gl.w, gl.h);
  }

  g.globalCompositeOperation = 'destination-in';
  g.drawImage(font.img, 0, 0);
  shadowCache.set(key, c);
  return c;
}


const pageCache = new Map();
function tintedPage(font, color) {
  const key = `${font.meta?.name}|${color}`;
  let c = pageCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = font.img.width;
  c.height = font.img.height;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(font.img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(font.img, 0, 0);
  pageCache.set(key, c);
  return c;
}
