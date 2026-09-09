


import { drawSpriteExt, c_white } from './draw/gm.js';

export function drawGraze(ctx, state, sprites) {
  const t = state.grazeTimer ?? 0;
  if (t <= 0 || !state.soul) return;
  const entry = sprites.get('spr_grazeappear');
  if (!entry || !entry.frames.length) return;

  const x = state.soul.x + 10;
  const y = state.soul.y + 10;
  drawSpriteExt(ctx, entry, 0, x, y, 1, 1, 0, c_white, t / 6);
  if (entry.frames.length > 3) {
    drawSpriteExt(ctx, entry, 3, x, y, 1, 1, 0, c_white, t / 6 - 0.2);
  }


  const size = state.grazeSize ?? 1;
  if (size > 1) {
    drawSpriteExt(ctx, entry, 0, x, y, size, size, 0, c_white, t / 6);
    if (entry.frames.length > 3) {
      drawSpriteExt(ctx, entry, 3, x, y, size, size, 0, c_white, t / 6 - 0.2);
    }
  }
}
