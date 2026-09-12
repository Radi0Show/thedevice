



export const C_WHITE = 16777215;

export const NO_FOG = -1;

export function knightDrawCalls(state, e) {
  const k = state.knight;
  const out = [];
  if (!k || !e) return out;

  const spr = e.sprite_index ?? 'spr_roaringknight_idle';
  const xs = e.image_xscale ?? 1;
  const ys = e.image_yscale ?? 1;
  const ang = e.image_angle ?? 0;
  const alpha = e.image_alpha ?? 1;
  const blend = e.image_blend ?? C_WHITE;

  const siner = k.siner ?? 0;

  const sinerIdle = k.animState === 0 ? siner + (1 / 6) : siner;

  const offx = 0;
  const offy = 0;
  const shakex = k.shakex ?? 0;


  if (e.visible === false) return out;


  if (state.entities?.some((x) => x.alive && x.type?.name === 'obj_knight_swordtunnelanim')) {
    return out;
  }


  if (k.chargeupcon === 2) {
    out.push({
      tag: 'burnout', sprite: spr, index: siner, x: e.x, y: e.y,
      xs, ys, ang, blend, alpha: (10 - (k.chargeuptimer ?? 0)) / 10, fog: C_WHITE,
    });
    return out;
  }



  if (k.animState === 3 && (k.hurttimer ?? 0) >= 0) {
    const mod = k.endCutscene === 1 ? 3 : 2;
    const showIdle = ((k.hurttimer ?? 0) % mod) === 0 || !k.stronghurtanim;
    out.push(showIdle
      ? {
        tag: 'strobe_idle', sprite: spr, index: siner,
        x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 1, fog: NO_FOG,
      }
      : {
        tag: 'strobe_ball', sprite: 'spr_roaringknight_ball_transition', index: 7,
        x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 1, fog: NO_FOG,
      });
  }


  if (k.animState === 0) {
    out.push({ tag: 'base', sprite: spr, index: sinerIdle, x: e.x, y: e.y, xs, ys, ang, blend, alpha, fog: NO_FOG });
    if (k.flash) {
      out.push({
        tag: 'flash', sprite: spr, index: sinerIdle, x: e.x, y: e.y, xs, ys, ang, blend,
        alpha: (-Math.cos((k.fsiner ?? 0) / 5) * 0.4) + 0.6,

        fog: blend,
      });
    }
  }


  if ((k.whiteflash ?? 0) > 0) {
    if (k.animState === 3 && (k.hurttimer ?? 0) >= 0) {
      out.push({
        tag: 'wflash_hurt', sprite: 'spr_roaringknight_idle', index: 0,
        x: e.x + shakex + offx, y: e.y + offy, xs: 2, ys: 2, ang: 0, blend, alpha: 0.62, fog: C_WHITE,
      });
    }
    if (k.animState === 0) {
      out.push({
        tag: 'wflash_idle', sprite: spr, index: sinerIdle, x: e.x, y: e.y,
        xs, ys, ang, blend, alpha: 0.62, fog: C_WHITE,
      });
    }
  }


  if (k.chargeupcon === 1) {
    out.push({
      tag: 'chargeup', sprite: spr, index: sinerIdle, x: e.x, y: e.y,
      xs, ys, ang, blend, alpha: (k.chargeuptimer ?? 0) / 10, fog: C_WHITE,
    });
  }

  return out;
}
