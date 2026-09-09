


import { drawSpriteExt } from './gm.js';


function clipToBox(ctx, state) {
  const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
  if (!gt) return false;

  const hw = (gt.image_xscale ?? 2) * 37.5;
  const hh = (gt.image_yscale ?? 2) * 37.5;
  const minx = gt.x - hw + 5 + 4;
  const miny = gt.y - hh + 5 + 4;
  const maxx = gt.x + hw - 4 - 4;
  const maxy = gt.y + hh - 4 - 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(minx - state.view.x, miny - state.view.y, maxx - minx, maxy - miny);
  ctx.clip();
  return true;
}

function line(ctx, e, state, width, color) {
  if (!(width > 0)) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(e.x1 - state.view.x, e.y1 - state.view.y);
  ctx.lineTo(e.x2 - state.view.x, e.y2 - state.view.y);
  ctx.stroke();
}

export function drawKnightStream(ctx, e, state, deps) {
  const { sprites } = deps;
  if (!clipToBox(ctx, state)) return true;

  const alive = (n) => state.entities.filter((x) => x.alive && x.type.name === n);

  const pulse = Math.sin(state.frame * Math.PI);


  const diamond = sprites.get('spr_diamondbullet');
  if (diamond) {
    for (const b of alive('obj_bullet_stream_diamond')) {
      drawSpriteExt(ctx, diamond, 0, b.x - state.view.x, b.y - state.view.y,
        b.image_xscale ?? 1, b.image_yscale ?? 1, b.image_angle ?? 0, null,
        b.image_alpha ?? 1);
    }
  }


  for (const l of alive('obj_knight_streamline')) {
    line(ctx, l, state, l.width, 'rgb(128,128,128)');
  }
  const beams = alive('obj_bullet_knight_stream');
  for (const b of beams) line(ctx, b, state, b.width, 'rgb(255,0,0)');
  for (const b of beams) {
    if (b.width > 8) line(ctx, b, state, b.width * (0.8 + pulse * 0.2), 'rgb(128,0,0)');
  }
  for (const b of beams) {
    if (b.width > 8) line(ctx, b, state, b.width * (0.65 + pulse * 0.2), 'rgb(0,0,0)');
  }

  ctx.restore();
  return true;
}
