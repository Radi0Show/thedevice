


import { rgb, tinted } from './draw/gm.js';
import { drawSpriteText, FONTS } from './text.js';
import { loadFont, drawText } from './font.js';


function barX(frame) {
  let x = -40;
  let sp = 13;
  for (let i = 0; i < frame; i++) {
    sp -= 1;
    if (sp <= 0) return 38;
    x += sp;
  }
  return x;
}
const Y = 40;


const ORANGE = 'rgb(255,128,0)';
const RED = 'rgb(255,0,0)';
const WHITE = 'rgb(255,255,255)';

const MAXED = 'rgb(255,191,0)';


const trail = { apparent: 0, current: 0, changetimer: 0, maxed: false };

export function resetTensionBar() {
  trail.apparent = 0;
  trail.current = 0;
  trail.changetimer = 0;
  trail.maxed = false;
}



function skinOf(state) {
  return state.tensionBar ?? null;
}

export function drawTensionBar(ctx, state, sprites) {

  if (state.knight?.endCutscene > 0) return;
  const font = loadFont();
  const skin = skinOf(state);

  const entry = sprites.get(skin?.bar ?? 'spr_tensionbar');
  if (!entry || !entry.frames.length) return;
  const bg = entry.frames[Math.min(1, entry.frames.length - 1)];

  const X = barX(state.frame ?? 0);
  const w = bg.width;
  const h = bg.height;
  const tension = state.tension ?? 0;
  const max = 250;


  const pair = skin?.trail ?? trail;
  if (!skin?.trail) {

    if (Math.abs(trail.apparent - tension) < 20) trail.apparent = tension;
    if (trail.apparent < tension) trail.apparent += 20;
    if (trail.apparent > tension) trail.apparent -= 20;


    if (trail.apparent !== trail.current) {
      trail.changetimer += 1;
      if (trail.changetimer > 15) {
        const d = trail.apparent - trail.current;
        if (d > 0) trail.current += 2;
        if (d > 10) trail.current += 2;
        if (d > 25) trail.current += 3;
        if (d > 50) trail.current += 4;
        if (d > 100) trail.current += 5;
        if (d < 0) trail.current -= 2;
        if (d < -10) trail.current -= 2;
        if (d < -25) trail.current -= 3;
        if (d < -50) trail.current -= 4;
        if (d < -100) trail.current -= 5;
        if (Math.abs(trail.apparent - trail.current) < 3) trail.current = trail.apparent;
      }
    } else {
      trail.changetimer = 0;
    }
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(X, Y);
  ctx.drawImage(bg, 0, 0);

  const fill = (value, style) => {
    const top = h - (value / max) * h;
    ctx.fillStyle = style;
    ctx.fillRect(3, top, w - 1 - 3, h - 1 - top);
  };

  if (pair.current > 0 || pair.apparent > 0) {

    const maxed = pair.maxed;
    if (pair.apparent < pair.current) {
      fill(pair.current, RED);
      fill(pair.apparent, ORANGE);
    } else if (pair.apparent > pair.current) {
      fill(pair.apparent, WHITE);
      fill(pair.current, maxed ? MAXED : ORANGE);
    } else {
      fill(pair.current, maxed ? MAXED : ORANGE);
    }
  }

  const marker = sprites.get('spr_tensionmarker');
  if (marker && marker.frames[0] && pair.current > 0) {
    ctx.drawImage(marker.frames[0], 3, h - (pair.current / max) * h);
  }
  ctx.drawImage(entry.frames[0], 0, 0);
  const cutout = sprites.get(skin?.cutout ?? 'spr_tensionbar_cutout');
  if (cutout && cutout.frames[0]) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(cutout.frames[0], 0, 0);
    ctx.restore();
  }

  if (skin?.markers?.length) {
    for (const m of skin.markers) {
      const ent = sprites.get(m.sprite);
      const img = ent?.frames?.[Math.abs(Math.floor(m.subimage ?? 0)) % (ent?.frames?.length || 1)];
      if (!img) continue;
      const alpha = m.alpha ?? 1;
      if (!(alpha > 0)) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.translate(m.x, m.y);
      ctx.scale(m.xscale ?? 1, m.yscale ?? 1);
      ctx.drawImage(m.blend ? tinted(img, m.blend) : img, -(ent.meta?.ox ?? 0), -(ent.meta?.oy ?? 0));
      ctx.restore();
    }
  }
  ctx.restore();


  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const yoff = skin?.yoff ?? 0;
  const logo = skin?.tplogo === false ? null : sprites.get('spr_tplogo');
  if (logo && logo.frames[0]) ctx.drawImage(logo.frames[0], X - 30, Y + 30);


  const tamt = Math.floor((pair.apparent / max) * 100);

  if (!skin?.trail) trail.maxed = false;
  if (tamt < 100) {
    drawText(ctx, font, String(tamt), X - 30, Y + 70 + yoff, { color: '#ffffff' });
    drawText(ctx, font, '%', X - 25, Y + 95 + yoff, { color: '#ffffff' });
  } else {

    if (!skin?.trail) trail.maxed = true;
    drawText(ctx, font, 'M', X - 28, Y + 70, { color: '#ffff00' });
    drawText(ctx, font, 'A', X - 24, Y + 90, { color: '#ffff00' });
    drawText(ctx, font, 'X', X - 20, Y + 110, { color: '#ffff00' });
  }
  ctx.restore();
}
