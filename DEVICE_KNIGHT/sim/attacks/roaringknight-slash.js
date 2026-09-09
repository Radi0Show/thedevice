


import { scrDamageAll, scrDamageSingle } from '../damage.js';
import { destroy } from '../entity.js';
import { scrHeartclamp } from '../heartclamp.js';
import { HEART_MASK, masksOverlap } from '../masks.js';
import { gmlChoose } from '../rng.js';



function chooseReplay(state, values) {
  if (state.chooseTable) {
    if (state.chooseIndex >= state.chooseTable.length) {
      throw new Error(
        'choose() replay table exhausted — this scenario needs more recorded RNG outcomes',
      );
    }
    return state.chooseTable[state.chooseIndex++];
  }
  return gmlChoose(state.gmlRng, values);
}


const SLASH_MASK = {
  name: 'spr_rk_quickslash_marker',
  w: 250,
  h: 46,
  originX: 125,
  originY: 23,
  bbox: [0, 22, 249, 22],
  px: Array.from({ length: 46 }, (_, y) =>
    y === 22 ? new Array(250).fill(true) : new Array(250).fill(false),
  ),
};

export const roaringknightSlash = {
  name: 'obj_roaringknight_slash',

  create(e, state) {

    e.grazed = 0;
    e.grazetimer = 0;
    e.destroyonhit = 1;
    e.target = 0;
    e.inv = 60;
    e.damage = 10;
    e.element = 0;
    e.grazepoints = 1;
    e.timepoints = 1;
    e.active = 1;
    e.updateimageangle = 0;


    e.active = true;
    e.element = 5;
    e.width = 24;
    e.grazepoints = 50;
    e.aoe = true;
    e.alarm[0] = 1;
    e.alarm[1] = 3;
    e.image_index = 2;
    e.image_speed = 0;
    e.image_yscale = 0.1;
    e.slashdir = chooseReplay(state, [-1, 1]);
    e.destroyonhit = false;

    e.isBullet = true;

    e.mask = SLASH_MASK;
    e.xscale = 1;
    e.image_angle = 0;
  },

  alarm: {
    0: () => {},
    1: (e) => {
      e.maskOff = true;
    },
  },


  collides(e, heart, state) {
    return masksOverlap(
      heart.mask ?? HEART_MASK, heart.x, heart.y,
      SLASH_MASK, e.x, e.y, e.xscale, e.image_yscale, e.image_angle,
    );
  },


  other15(e, state) {
    e.damage = 206;
    if (e.aoe === true) {
      e.damage = 75;
      e.target = 3;

    }
    if (e.active === 1 || e.active === true) {

      if (e.target === 3) {
        scrDamageAll(state, e.damage, { flurrySoftened: state.flurrySoftened === true });
      } else {
        scrDamageSingle(state, e.damage, e.target ?? 0, {
          flurrySoftened: state.flurrySoftened === true,
        });
      }
      if (e.destroyonhit === 1 || e.destroyonhit === true) {
        destroy(e);
      }
    }
  },


  endStep(e, state) {
    e.damage = 206;
    e.grazepoints = 50;

    if (!(e.alarm[0] > 0.5)) {

      e.width *= 0.66;
      e.image_alpha = (e.image_alpha ?? 1) * 0.66;
    }
    if (e.width < 12) {
      e.active = false;
    }
    if (e.width < 0.5) {
      destroy(e);
    }
    if (e.width > 4) {
      const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
      if (gt) {
        gt.x = gt.xstart + chooseReplay(state, [-2, -1, 0, 1, 2]);
        gt.y = gt.ystart + chooseReplay(state, [-2, -1, 0, 1, 2]);
      }
      if (globalThis.process?.env?.KNIGHT_JITTER_DEBUG) {
        const f = globalThis.__simFrame;
        const [a, b] = globalThis.process.env.KNIGHT_JITTER_DEBUG.split('-').map(Number);
        if (f >= a && f <= (b ?? a)) {
          console.error(`[jit] f=${f} slash seq=${e.seq} w=${e.width.toFixed(2)}`
            + ` gt=(${gt?.x},${gt?.y}) xstart=${gt?.xstart}`
            + ` soul_pre=${state.soul ? `${state.soul.x},${state.soul.y}` : 'NONE'}`);
        }
      }
      scrHeartclamp(state);
      if (globalThis.process?.env?.KNIGHT_JITTER_DEBUG) {
        const f = globalThis.__simFrame;
        const [a, b] = globalThis.process.env.KNIGHT_JITTER_DEBUG.split('-').map(Number);
        if (f >= a && f <= (b ?? a)) {
          console.error(`[jit]   post-clamp soul=${state.soul ? `${state.soul.x},${state.soul.y}` : 'NONE'}`);
        }
      }
    }
  },
};
