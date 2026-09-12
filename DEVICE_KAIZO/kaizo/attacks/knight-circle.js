

import { destroy } from '../../sim/entity.js';
import { scrApproach } from '../../sim/gml.js';

export const kaizoKnightCircle = {
  name: 'obj_knight_circle',

  create(e) {
    e.circle_size = 0;

    e.r = e.r ?? 0;
    e.g = e.g ?? 0;
    e.b = e.b ?? 128;
    e.r_goal = 0;
    e.g_goal = 0;
    e.b_goal = 0;
    e.fade_time = 28;
    e.size_goal = 960;
    e.growth = 40;
    e.color_1 = 0;
    e.draw_in_box = e.draw_in_box ?? true;
    e.image_alpha = 1;
    e.depth = -60;
  },

  step(e, state) {

    const held = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_knight_roaring_fx',
    );
    if (!held) e.image_alpha -= 0.1;
    if (e.image_alpha < 0) {
      destroy(e);
      return;
    }

    e.g = scrApproach(e.g, e.g_goal, 255 / e.fade_time);
    e.r = scrApproach(e.r, e.r_goal, 255 / e.fade_time);
    e.circle_size = scrApproach(e.circle_size, e.size_goal, e.growth);

    if (e.r === 0 && e.b === 0 && e.b === 0) destroy(e);
  },
};
