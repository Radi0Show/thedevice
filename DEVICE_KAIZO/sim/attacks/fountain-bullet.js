


import { HEART_MASK, FOUNTAIN_MASK, masksOverlap } from '../masks.js';
import {
  regularbulletCreate,
  regularbulletStep,
  collidebulletOther15,
} from '../bullets/regularbullet.js';

export const fountainBullet = {
  name: 'obj_roaringknight_fountain_bullet',

  create(e, state) {
    regularbulletCreate(e, state);
    e.element = 5;
    e.speed_mult = 0;
    e.top_speed = 0;
    e.image_xscale = 1;
    e.image_yscale = 1;
    e.active = false;

    e.destroy_on_hit = false;
    e.grazepoints = 5;
  },

  step(e, state) {
    regularbulletStep(e, state);
    if (e.speed_mult < 1) {
      e.speed_mult += 0.2;
      if (!e.active && e.speed_mult >= 0.1) {
        e.active = true;
      }
      e.speed = e.speed_mult * e.top_speed;
    }
  },

  collides(e, heart) {
    return masksOverlap(
      heart.mask ?? HEART_MASK, heart.x, heart.y,
      FOUNTAIN_MASK, e.x, e.y, e.image_xscale, e.image_yscale, e.image_angle,
    );
  },

  other15: collidebulletOther15,
};
