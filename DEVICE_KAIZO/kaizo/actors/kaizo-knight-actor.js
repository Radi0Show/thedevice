

import { knightActor, KNIGHT } from '../../sim/actors.js';
import { spawn } from '../../sim/entity.js';
import { afterimage } from '../../sim/fx.js';
import { nextAfterimageColor } from '../attacks/kaizo-colors.js';

export const kaizoKnightActor = {
  ...knightActor,

  create(e, state) {
    knightActor.create?.(e, state);

    e.rgbafterimages = 1;
    e.afterimagecon = 0;
  },

  step(e, state) {

    const before = new Set();
    for (const x of state.entities) {
      if (x.alive && x.type?.name === 'obj_afterimage') before.add(x);
    }

    knightActor.step?.(e, state);

    for (const x of state.entities) {
      if (!x.alive || x.type?.name !== 'obj_afterimage' || before.has(x)) continue;
      if (x.sprite_index === 'spr_roaringknight_idle') {

        x.sprite_index = kaizoIdlesprite(e, state.knight, { atStep: true });
      }
    }

    if ((state.knight?.animState ?? 0) === 10 && e.visible !== false) {
      e.aetimer += 1;
      if ((e.aetimer % 4) === 0) {
        const a = spawn(state, afterimage, { x: e.x, y: e.y });
        a.sprite_index = e.sprite_index;
        a.image_index = e.image_index;
        a.image_alpha = 0.6;
        a.fadeSpeed = 0.02;
        a.hspeed = 2;
        a.image_speed = 0;
        a.image_xscale = e.image_xscale;
        a.image_yscale = e.image_yscale;
        a.depth = e.depth + 1;
      }
    }

    if (!e.rgbafterimages) return;
    for (const x of state.entities) {
      if (!x.alive || x.type?.name !== 'obj_afterimage' || before.has(x)) continue;

      const { con, color } = nextAfterimageColor(e.afterimagecon ?? 0);
      e.afterimagecon = con;
      x.image_blend = color;
    }
  },

  draw(e, state) {
    knightActor.draw?.(e, state);
    const kb = state.knight;
    const roaring = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_knight_roaring2',
    );
    if (e.visible === false || !roaring) return;

    if (!(typeof state.turntimer === 'number' && state.turntimer < 5)) return;
    e.siner2 += 1;
    const drawRuns = kb
      && kb.chargeupcon !== 2
      && !state.entities.some(
        (x) => x.alive && x.type.name === 'obj_knight_swordtunnelanim',
      );
    if (drawRuns && (kb.animState === 0 || kb.animState === 3)) {
      e.y = e.ystart + Math.cos(e.siner2 / 8) * 8;
    }
  },
};

export function kaizoIdlesprite(e, k, { atStep = false } = {}) {
  const b = k?.blockanim ?? 0;
  const blockPose = atStep
    ? (b === 1 || (b === 2 && (k?.blocktimer ?? 0) < 14))
    : b === 2;
  if (blockPose) return 'spr_roaringknight_block_ol';
  return e?.idlesprite ?? 'spr_roaringknight_idle';
}

export function kaizoBlockStepTail(state) {
  const k = state.knight;
  if (!k) return;
  const kz = (state.kaizo ??= {});
  const prev = kz.blockanimPrev ?? 0;
  const b = k.blockanim ?? 0;

  if (b === 2 && k.blocktimer === 1) {

    const fired = k.animState === 3
      ? k.hurtshake === 0
      : (k.hurtshake ?? 0) >= 1;
    k.whiteflash = 2;
    k.animState = 3;
    k.hurttimer = 30 - 1;
    k.shakex = 5;
    if (fired) {

      k.shakex = -(5 - 1);
      k.hurtshake = 0;
    } else {
      k.hurtshake = 1;
    }

    const e = state.entities.find((x) => x.alive && x.type?.name === 'obj_knight_enemy');
    if (e) {
      for (const vspeed of [3, -3]) {
        const g = spawn(state, afterimage, { x: e.x, y: e.y });
        g.sprite_index = 'spr_roaringknight_block_ol';
        g.image_index = e.image_index ?? 0;
        g.image_blend = e.image_blend;
        g.image_speed = 0;
        g.image_xscale = e.image_xscale ?? 1;
        g.image_yscale = e.image_yscale ?? 1;
        g.image_angle = e.image_angle ?? 0;
        g.depth = (e.depth ?? 0) + 1;
        g.speed = 3;
        g.direction = vspeed > 0 ? 270 : 90;
        g.friction = 0.15;
      }
    }
  }

  if (prev === 2 && b === 0) {

    if (k.animState === 3) {

      if (k.hurtshake === 0) {
        let s = -(k.shakex ?? 0);
        if (s > 0) s += 1;
        if (s < 0) s -= 1;
        k.shakex = s;
        k.hurtshake = 1;
      } else if ((k.hurtshake ?? 0) > 0) {
        k.hurtshake -= 1;
      }
      k.hurttimer = -1;
      k.animState = 0;
    } else {
      k.hurttimer = 0;
    }
  }

  kz.blockanimPrev = b;
}

export function kaizoMonsterXY(state) {
  const e = state.entities?.find(
    (x) => x.alive && x.type?.name === 'obj_knight_enemy',
  );
  const sx = e?.image_xscale ?? 2;
  const sy = e?.image_yscale ?? 2;
  return {
    x: KNIGHT_X + (KNIGHT_SPRITE_W * sx) / 2 - 14,
    y: KNIGHT_YSTART + (KNIGHT_SPRITE_H * sy) / 2 - 44,
  };
}

const KNIGHT_SPRITE_W = 117;
const KNIGHT_SPRITE_H = 115;
const KNIGHT_X = KNIGHT.x;
const KNIGHT_YSTART = KNIGHT.ystart;

export function applyKaizoIdleRecolor(state) {
  const e = state?.type ? state : state?.entities?.find(
    (x) => x.alive && x.type?.name === 'obj_knight_enemy',
  );
  if (e) e.idlesprite = 'spr_roaringknight_idle2';
  return e ?? null;
}
