

import { TOOTH_MASK, HEART_MASK, masksOverlap } from '../../sim/masks.js';
import {
  regularbulletCreate,
  regularbulletStep,
  collidebulletOther15,
} from '../../sim/bullets/regularbullet.js';
import { scrEaseIn, mergeColor, WHITE } from '../../sim/gml.js';

import { getSwordcolor, KAIZO_TELEGRAPH_COLOR } from './kaizo-colors.js';
import { gmlRandomRange } from '../../sim/rng.js';

export const splitBullet = {
  name: 'obj_roaringknight_split_bullet',

  create(e, state) {
    e.sprite_index = 'spr_roaringknight_tooth';
    regularbulletCreate(e, state);
    e.element = 5;
    e.speed_mult = 0;
    e.top_speed = 0;
    e.image_xscale = 1;
    e.image_yscale = 1;
    e.active = false;

    e.destroy_on_hit = false;

    e.grazepoints = 0;

    e.turn_timer = 0;
    e.turn_dir = 0;
    e.turn_start = false;

    e.grazed = 1;
    e.distance = 0;
    e.anim_timer = 0;

    e.coltimer = 0;
    e.fade_over = false;
    e.image_speed = 0;
  },

  draw(e, state) {
    if (e.visible === false) return;
    const rng = state.gmlRng;
    e.drawJitterYs = rng ? gmlRandomRange(rng, -0.1, 0.1) : 0;
    e.drawJitterXs = rng ? gmlRandomRange(rng, -0.1, 0.1) : 0;
  },

  step(e, state) {
    regularbulletStep(e, state);
    e.grazepoints = 3;

    const frames = state.spriteFrames?.[e.sprite_index] ?? 2;
    e.image_index = Math.floor(scrEaseIn(e.anim_timer, 2) * frames);
    if (e.anim_timer < 1) e.anim_timer += 0.1;

    if (e.speed_mult < 1) {
      e.speed_mult += 0.2;
      if (!e.active && e.speed_mult >= 0.1) {
        e.active = true;
      }
      e.speed = e.speed_mult * e.top_speed;
    }

    e.coltimer += 1;

    e.image_xscale = 1;
    e.image_yscale = 1;

    e.distance += e.speed;
  },

  endStep(e, state) {
    if (e.fade_over === false) {
      const quickslash = state.entities.some(
        (x) => x.alive && x.type.name === 'obj_roaringknight_quickslash_attack',
      );
      e.image_blend = quickslash
        ? mergeColor(getSwordcolor(state), WHITE, e.coltimer / 40)
        : mergeColor(KAIZO_TELEGRAPH_COLOR, WHITE, e.coltimer / 30);
    }

    if (e.image_blend[0] === 255 && e.image_blend[1] === 255 && e.image_blend[2] === 255) {
      e.fade_over = true;
    }
    if (e.fade_over === true) e.image_blend = WHITE;
  },

  collides(e, heart) {
    return masksOverlap(
      heart.mask ?? HEART_MASK, heart.x, heart.y,
      TOOTH_MASK, e.x, e.y, e.image_xscale, e.image_yscale, e.image_angle,
    );
  },

  other15: collidebulletOther15,
};
