// fnt_8bit — the font the sword route's HUD strip draws with ("HP", "LV",
// "MAX", the scoreboard). A GameMaker font is a texture region plus one
// glyph rect per character; both extracted verbatim.

export async function loadFont(base) {
  const meta = await fetch(`${base}font/fnt_8bit.json`).then((r) => r.json());
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = `${base}font/fnt_8bit.png`;
  });
  const glyphs = new Map();
  for (const g of meta.glyphs) glyphs.set(g.c, g);

  /** Draw at (x, y), scale 1 to match the game's HUD coordinates. */
  function draw(ctx, text, x, y, { color = '#ffffff', scale = 1, align = 'left' } = {}) {
    let w = 0;
    for (const ch of text) w += (glyphs.get(ch.codePointAt(0))?.shift ?? 8) * scale;
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.save();
    // Tint by drawing through a coloured buffer only when needed.
    for (const ch of text) {
      const g = glyphs.get(ch.codePointAt(0));
      if (!g) { cx += 8 * scale; continue; }
      if (g.w > 0 && g.h > 0) {
        ctx.drawImage(img, g.x, g.y, g.w, g.h,
          cx + g.offset * scale, y, g.w * scale, g.h * scale);
      }
      cx += g.shift * scale;
    }
    ctx.restore();
    return w;
  }

  function width(text, scale = 1) {
    let w = 0;
    for (const ch of text) w += (glyphs.get(ch.codePointAt(0))?.shift ?? 8) * scale;
    return w;
  }

  return { draw, width, meta };
}
