


import { HEART_MASK, HEART_RECT, HEART_RECT_WALL, masksOverlap } from './masks.js';

export { HEART_MASK };

export function placeMeetingSolid(state, x, y) {

  const raw = state.soul?.mask ?? HEART_MASK;
  const heartMask = raw === HEART_RECT ? HEART_RECT_WALL : raw;
  for (const o of state.entities) {
    if (!o.alive || !o.isSolid || !o.mask) continue;

    if (masksOverlap(heartMask, x, y, o.mask, o.x, o.y,
        o.image_xscale, o.image_yscale, o.image_angle ?? 0)) {
      return true;
    }
  }
  return false;
}
