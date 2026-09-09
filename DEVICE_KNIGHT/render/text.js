



export const FONTS = {
  hp: { sprite: 'spr_numbersfontsmall', map: '0123456789-+', prop: false, sep: 2 },
  damage: { sprite: 'spr_numbersfontbig', map: '0123456789', prop: true, sep: 0 },
};


function advance(entry, font, index) {
  const img = entry.frames[index];
  const w = font.prop && img ? img.width : entry.meta.w ?? (img ? img.width : 0);
  return w + font.sep;
}

export function measureText(sprites, font, text) {
  const entry = sprites.get(font.sprite);
  if (!entry || !entry.frames.length) return 0;
  let total = 0;
  for (const ch of String(text)) {
    const i = font.map.indexOf(ch);
    if (i < 0 || i >= entry.frames.length) continue;
    total += advance(entry, font, i);
  }
  return total > 0 ? total - font.sep : 0;
}



export function drawSpriteText(ctx, sprites, font, text, x, y, {
  halign = 'left', color = null, alpha = 1,
} = {}) {
  const entry = sprites.get(font.sprite);
  if (!entry || !entry.frames.length) return;

  let cx = x;
  if (halign === 'right') cx -= measureText(sprites, font, text);
  else if (halign === 'center') cx -= measureText(sprites, font, text) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  for (const ch of String(text)) {
    const i = font.map.indexOf(ch);
    if (i < 0 || i >= entry.frames.length) continue;
    const img = entry.frames[i];
    if (img) {
      if (color) {

        ctx.drawImage(tintedGlyph(img, color), cx, y);
      } else {
        ctx.drawImage(img, cx, y);
      }
    }
    cx += advance(entry, font, i);
  }
  ctx.restore();
}


const glyphCache = new Map();
function tintedGlyph(img, color) {
  const key = `${img.src}|${color}`;
  let c = glyphCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  glyphCache.set(key, c);
  return c;
}
