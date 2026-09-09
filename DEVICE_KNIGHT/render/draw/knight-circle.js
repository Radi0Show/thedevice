


export function drawKnightCircle(ctx, e, state, deps) {
  const { boxRect } = deps;
  const size = e.circle_size ?? 0;
  if (size <= 0 || e.image_alpha <= 0) return true;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, e.image_alpha));

  if (e.draw_in_box) {
    const r = boxRect(state);
    if (r) {
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
    }
  }

  const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, size);
  g.addColorStop(0, 'rgb(0,0,0)');
  g.addColorStop(1, `rgb(${Math.round(e.r)},${Math.round(e.g)},${Math.round(e.b)})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}
