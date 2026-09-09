


import { rgb } from './draw/gm.js';
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

export function drawTensionBar(ctx, state, sprites) {

  if (state.knight?.endCutscene > 0) return;
  const font = loadFont();
  const entry = sprites.get('spr_tensionbar');
  if (!entry || !entry.frames.length) return;
  const bg = entry.frames[Math.min(1, entry.frames.length - 1)];

  const X = barX(state.frame ?? 0);
  const w = bg.width;
  const h = bg.height;
  const tension = state.tension ?? 0;
  const max = 250;


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

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(X, Y);
  ctx.drawImage(bg, 0, 0);

  const fill = (value, style) => {
    const top = h - (value / max) * h;
    ctx.fillStyle = style;
    ctx.fillRect(3, top, w - 1 - 3, h - 1 - top);
  };

  if (trail.current > 0 || trail.apparent > 0) {

    const maxed = trail.maxed;
    if (trail.apparent < trail.current) {
      fill(trail.current, RED);
      fill(trail.apparent, ORANGE);
    } else if (trail.apparent > trail.current) {
      fill(trail.apparent, WHITE);
      fill(trail.current, maxed ? MAXED : ORANGE);
    } else {
      fill(trail.current, maxed ? MAXED : ORANGE);
    }
  }

  const marker = sprites.get('spr_tensionmarker');
  if (marker && marker.frames[0] && trail.current > 0) {
    ctx.drawImage(marker.frames[0], 3, h - (trail.current / max) * h);
  }
  ctx.drawImage(entry.frames[0], 0, 0);
  const cutout = sprites.get('spr_tensionbar_cutout');
  if (cutout && cutout.frames[0]) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(cutout.frames[0], 0, 0);
    ctx.restore();
  }
  ctx.restore();


  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const logo = sprites.get('spr_tplogo');
  if (logo && logo.frames[0]) ctx.drawImage(logo.frames[0], X - 30, Y + 30);


  const tamt = Math.floor((trail.apparent / max) * 100);

  trail.maxed = false;
  if (tamt < 100) {
    drawText(ctx, font, String(tamt), X - 30, Y + 70, { color: '#ffffff' });
    drawText(ctx, font, '%', X - 25, Y + 95, { color: '#ffffff' });
  } else {

    trail.maxed = true;
    drawText(ctx, font, 'M', X - 28, Y + 70, { color: '#ffff00' });
    drawText(ctx, font, 'A', X - 24, Y + 90, { color: '#ffff00' });
    drawText(ctx, font, 'X', X - 20, Y + 110, { color: '#ffff00' });
  }
  ctx.restore();
}
