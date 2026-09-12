

function css(c, rgbOf) {
  if (Array.isArray(c)) return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  if (typeof c === 'number') {
    const [r, g, b] = rgbOf(c);
    return `rgb(${r},${g},${b})`;
  }
  return 'rgb(255,255,255)';
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function drawOrbBodyPlaceholder(ctx, x, y, scale, blend, alpha, rgbOf) {
  const r = 25 * Math.abs(scale);
  if (!(r > 0.5) || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.strokeStyle = css(blend, rgbOf);
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawObjKnightLightorb(ctx, e, state, helpers) {
  const { sprites, blit, rgbOf, defer } = helpers;

  if ((state.turntimer ?? 1) < 1) return true;

  const flash = e.flashAlpha ?? 0;
  if (e.con === 0 && flash > 0) {
    const entry = sprites.get('spr_zapper_tvturnoff1');
    if (entry) {
      blit(entry.frames[0], entry.meta.ox, entry.meta.oy,
        e.x, e.y, 40, flash, 0, 1, null);
    }
  }

  const scale = e.drawScale ?? 0.8;
  const blend = e.image_blend ?? [255, 255, 255];
  const alpha = e.image_alpha ?? 1;
  if (e.drawSplit) {
    drawOrbBodyPlaceholder(ctx, e.x + (e.splitx ?? 0), e.y, scale, blend, alpha, rgbOf);
    drawOrbBodyPlaceholder(ctx, e.x - (e.splitx ?? 0), e.y, scale, blend, alpha, rgbOf);
  } else {
    drawOrbBodyPlaceholder(ctx, e.x, e.y, scale, blend, alpha, rgbOf);
  }

  if (e.con === 0 && (e.radius ?? 0) > 0 && (e.circle_alpha ?? 0) > 0) {
    ctx.save();
    ctx.globalAlpha = clamp01(e.circle_alpha);
    ctx.fillStyle = css(e.discColor ?? blend, rgbOf);
    ctx.beginPath();
    ctx.arc(e.x, e.y, Math.max(1, e.radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const dark = e.darken_alpha ?? 0;
  if (dark > 0) {
    defer(() => {
      const tile = sprites.get('spr_board_blacktile');
      if (tile) {
        blit(tile.frames[0], tile.meta.ox, tile.meta.oy, 0, 0, 100, 100, 0, clamp01(dark), null);
      } else {

        ctx.save();
        ctx.globalAlpha = clamp01(dark);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 1600, 1600);
        ctx.restore();
      }
    });
  }

  return true;
}
