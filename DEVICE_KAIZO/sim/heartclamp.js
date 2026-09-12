


function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function scrHeartclamp(state, arg0 = 0, arg1 = 0) {
  const gt = state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
  if (!gt) return;

  const heart = state.soul;
  if (!heart || !heart.alive) return;

  const xthick = gt.image_xscale * 2 + 1;
  const ythick = gt.image_yscale * 2 + 1;
  const halfW = (gt.mask.w * gt.image_xscale) * 0.5;
  const halfH = (gt.mask.h * gt.image_yscale) * 0.5;

  heart.x = clamp(heart.x, gt.x - halfW + xthick + arg0, gt.x + halfW - (20 + xthick + arg0));
  heart.y = clamp(heart.y, gt.y - halfH + ythick + arg1, gt.y + halfH - (20 + ythick + arg1));
}
