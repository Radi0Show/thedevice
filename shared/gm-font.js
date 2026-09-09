



export async function loadFont(base = './assets/gonermaker/', name = 'fnt_main') {
  const [meta, img] = await Promise.all([
    fetch(`${base}${name}.json`).then((r) => r.json()),
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`${name}.png missing`));
      i.src = `${base}${name}.png`;
    }),
  ]);
  const glyphs = new Map();
  for (const g of meta.glyphs) glyphs.set(g.c, g);
  return { img, glyphs, meta, tints: new Map() };
}



function tinted(font, color) {
  let page = font.tints.get(color);
  if (page) return page;
  page = document.createElement('canvas');
  page.width = font.img.width;
  page.height = font.img.height;
  const g = page.getContext('2d');
  g.drawImage(font.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, page.width, page.height);
  font.tints.set(color, page);
  return page;
}


function blit(ctx, font, code, x, y, alpha, color) {
  const g = font.glyphs.get(code);
  if (!g || g.w <= 0 || g.h <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(color ? tinted(font, color) : font.img,
    g.x, g.y, g.w, g.h, Math.round(x + g.offset), Math.round(y), g.w, g.h);
}



export function drawCharSpecial2(ctx, font, ch, x, y, specfade, siner, color = null) {
  const code = ch.codePointAt(0);
  const near = (0.3 + Math.sin(siner / 14) * 0.1) * specfade;
  const far = (0.08 + Math.sin(siner / 14) * 0.04) * specfade;
  blit(ctx, font, code, x, y, 1 * specfade, color);
  blit(ctx, font, code, x + 1, y, near, color);
  blit(ctx, font, code, x - 1, y, near, color);
  blit(ctx, font, code, x, y + 1, near, color);
  blit(ctx, font, code, x, y - 1, near, color);
  blit(ctx, font, code, x + 1, y + 1, far, color);
  blit(ctx, font, code, x - 1, y - 1, far, color);
  blit(ctx, font, code, x - 1, y + 1, far, color);
  blit(ctx, font, code, x + 1, y - 1, far, color);
  ctx.globalAlpha = 1;
}


export function drawText(ctx, font, text, x, y, { color = null, alpha = 1 } = {}) {
  let pen = x;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const g = font.glyphs.get(code);
    if (!g) continue;
    blit(ctx, font, code, pen, y, alpha, color);
    pen += g.shift;
  }
  ctx.globalAlpha = 1;
  return pen - x;
}


export function textWidth(font, text) {
  let w = 0;
  for (const ch of String(text)) {
    const g = font.glyphs.get(ch.codePointAt(0));
    if (g) w += g.shift;
  }
  return w;
}
