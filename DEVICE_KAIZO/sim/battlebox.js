import { mergeColor, gmlRound } from './gml.js';
import { spawn } from './entity.js';
import { afterimage } from './fx.js';


import { BATTLEBG_MASK, BATTLEBG_FIGHT_MASK, BATTLEBG_STRETCH_HITBOX_MASK } from './masks.js';



export function settleBox(gt) {
  gt.growcon = 2;
  gt.timer = gt.maxtimer;
  gt.image_xscale = gt.maxxscale;
  gt.image_yscale = gt.maxyscale;
  gt.image_angle = gt.target_angle;
  gt.image_alpha = 1;
  return gt;
}

export const battlebox = {
  name: 'obj_growtangle',

  stepOrder: 0.5,

  create(e, state) {

    if (e.maxxscale === undefined) e.maxxscale = 2;
    if (e.maxyscale === undefined) e.maxyscale = 2;
    e.isSolid = true;

    e.mask = BATTLEBG_MASK;


    e.image_blend = mergeColor([0, 128, 0], [0, 255, 0], 0.5);
    e.keep = 0;
    e.megakeep = 0;

    e.xstart = e.x;
    e.ystart = e.y;


    e.image_speed = 0;
    e.image_index = 0;

    e.growcon = 1;
    e.timer = 0;
    e.maxtimer = 15;
    e.target_angle = 0;
    e.growscale = 2;
    e.image_xscale = 0;
    e.image_yscale = 0;
    e.image_angle = 180;
    e.image_alpha = 0.3;
  },



  step(e, state) {

    if (!e.init) {
      e.init = true;
      if (e.visible !== false && (e.maxxscale !== 2 || e.maxyscale !== 2)) {
        e.customBox = true;

        if (e.maxxscale % 2 !== 0) e.maxxscale = gmlRound(e.maxxscale * 37.5) / 37.5;
        if (e.maxyscale % 2 !== 0) e.maxyscale = gmlRound(e.maxyscale * 37.5) / 37.5;
        e.mask = BATTLEBG_MASK;
      }
    }

    const growing =
      (e.timer < e.maxtimer && e.growcon === 1) || (e.timer > 0 && e.growcon === 3);
    if (!growing) return;

    if (e.growcon === 1) e.timer += 1;
    if (e.growcon === 3) e.timer -= 1;

    const sizer = e.timer / e.maxtimer;
    e.image_xscale = e.maxxscale * sizer;
    e.image_yscale = e.maxyscale * sizer;
    e.image_angle = 180 + 180 * sizer + e.target_angle;
    e.image_alpha = 0.5 + sizer * 0.5;


    if (e.visible !== false) {
      const d = spawn(state, afterimage, { x: e.x, y: e.y });
      d.sprite_index = e.sprite_index ?? 'spr_battlebg_0';
      const sc = sizer * e.growscale;
      d.image_xscale = sc;
      d.image_yscale = sc;
      d.image_angle = e.image_angle;
      d.image_alpha = 1 - e.image_alpha + 0.1;
      d.image_speed = 0;
      d.depth = e.depth - 1;

      d.image_blend = e.image_blend;
    }

    if (e.timer >= e.maxtimer && e.growcon === 1) {
      e.growcon = 2;
      e.image_angle = e.target_angle;
    }
    if (e.timer <= 0 && e.growcon === 3) e.growcon = 4;
  },


  endStep(e, state) {
    if (e.keep === 1) {
      const heart = state.soul;
      if (heart && heart.alive) {
        if (e.path_speed !== 0 || e.speed !== 0 || e.megakeep === 1) {

          const near = state.kaizo ? 1 : 5;
          const lborder = e.x - (e.mask.w * e.image_xscale) / 2;
          const rborder = e.x + (e.mask.w * e.image_xscale) / 2;
          const uborder = e.y - (e.mask.h * e.image_yscale) / 2;
          const dborder = e.y + (e.mask.h * e.image_yscale) / 2;
          if (heart.x < lborder + near) heart.x = lborder + near;
          if (heart.x > rborder - 22) heart.x = rborder - 22;
          if (heart.y < uborder + near) heart.y = uborder + near;
          if (heart.y > dborder - 22) heart.y = dborder - 22;
        }
      }
    }
  },
};
