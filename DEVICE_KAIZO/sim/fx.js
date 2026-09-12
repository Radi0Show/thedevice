


import { spawn, destroy } from './entity.js';
import { scrApproach } from './gml.js';
import { scrLerpvar } from './lerpvar.js';
import { cue } from './audio.js';



export function scrAfterimage(state, e) {
  const a = spawn(state, afterimage, { x: e.x, y: e.y });
  a.sprite_index = e.sprite_index;
  a.image_index = e.image_index;
  a.image_blend = e.image_blend;
  a.image_speed = 0;
  a.depth = e.depth;
  a.image_xscale = e.image_xscale;
  a.image_yscale = e.image_yscale;
  a.image_angle = e.image_angle;
  return a;
}


export const afterimage = {
  name: 'obj_afterimage',

  create(e) {
    e.fadeSpeed = 0.04;
    e.image_alpha = e.image_alpha ?? 1;
    e.builtinMotion = true;
    e.depth = -50;
  },

  step(e) {
    e.image_alpha -= e.fadeSpeed;
    if (e.image_alpha < 0) destroy(e);
  },
};







export const oflash = {
  name: 'obj_oflash',

  create(e) {
    e.flashspeed = 1;
    e.siner = 0;
    e.target = null;
    e.image_speed = 0;
    e.flashcolor = [255, 255, 255];
    e.follow = false;
  },

  step(e) {
    if (e.target && e.target.alive) {
      e.image_index = e.target.image_index;
      e.sprite_index = e.target.sprite_index;
      if (e.follow) {
        e.x = e.target.x;
        e.y = e.target.y;
      }
    }
    e.siner += e.flashspeed;
    if (e.siner > 4 && Math.sin(e.siner / 3) < 0) destroy(e);
  },
};


export function scrOflash(state, target, { follow = false, color = null } = {}) {
  const e = spawn(state, oflash, { x: target.x, y: target.y });
  e.image_xscale = target.image_xscale;
  e.image_yscale = target.image_yscale;
  e.image_speed = 0;
  e.image_index = target.image_index;
  e.sprite_index = target.sprite_index;
  e.depth = (target.depth ?? 0) - 1;
  e.target = target;
  e.follow = follow;
  if (color) e.flashcolor = color;
  return e;
}



export const knightCircle = {
  name: 'obj_knight_circle',

  create(e) {
    e.circle_size = 0;
    e.r = e.r ?? 128;
    e.g = e.g ?? 0;
    e.b = e.b ?? 0;
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
    e.b = scrApproach(e.b, e.b_goal, 255 / e.fade_time);
    e.circle_size = scrApproach(e.circle_size, e.size_goal, e.growth);
  },
};



export const afterimageGrow = {
  name: 'obj_afterimage_grow',

  create(e) {
    e.xrate = 0.2;
    e.yrate = 0.2;
    e.fade = 0.1;
    e.destroytime = -1;
    e.image_speed = 0;
    e.target = -4;
  },

  step(e) {

    if (e.target && e.target !== -4 && e.target.alive) {
      e.x = e.target.x;
      e.y = e.target.y;
    }
    e.image_alpha -= e.fade;
    e.image_xscale += e.xrate;
    e.image_yscale += e.yrate;
    if (e.image_alpha < 0) return destroy(e);
    if (e.destroytime > -1) e.destroytime -= 1;
    if (e.destroytime === 0) destroy(e);
  },
};


export function scrAfterimageGrow(state, e) {
  const a = spawn(state, afterimageGrow, { x: e.x, y: e.y });
  a.sprite_index = e.sprite_index;
  a.image_index = e.image_index;
  a.image_blend = e.image_blend;
  a.image_speed = 0;
  a.depth = e.depth;
  a.image_xscale = e.image_xscale;
  a.image_yscale = e.image_yscale;
  a.image_angle = e.image_angle;
  return a;
}



export function scrAfterimageGrowAttached(state, e, target, blend, behind) {
  const a = scrAfterimageGrow(state, e);
  a.target = target;
  a.image_blend = blend;
  if (behind === true) a.depth = (e.depth ?? 0) - 1;
  return a;
}



export const knightWarp = {
  name: 'obj_knight_warp',

  create(e, state) {
    e.master = null;
    e.master_xoffset = 0;
    e.master_yoffset = 0;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_speed = 0;
    e.sprite_index = 'spr_knight_warp';
    e.image_index = 8;
    cue(state, 'snd_knight_teleport', 1, 1);
  },

  step(e) {
    if (e.master && e.master.alive) {
      e.x = e.master.x + e.master_xoffset;
      e.y = e.master.y + e.master_yoffset;
    }
  },

  alarm: {
    0(e) {
      if (e.master && e.master.alive) e.master.image_alpha = 1;
      destroy(e);
    },
    1(e) {
      destroy(e);
    },
  },
};


export function knightWarpIn(state, e) {
  if (e.master && e.master.alive) e.master.image_alpha = 0;
  e.image_index = 6;
  scrLerpvar(state, spawn, e, 'image_index', 5, 8, 4);
  e.alarm[0] = 4;
}


export function knightWarpOut(state, e) {
  if (e.master && e.master.alive) e.master.image_alpha = 0;
  e.image_index = 8;
  scrLerpvar(state, spawn, e, 'image_index', 8, 5, 4);
  e.alarm[1] = 4;
}



export const splitGrowtangleEffect = {
  name: 'obj_knight_split_growtangle_effect',

  create(e) {
    e.timer = 0;
    e.vertical = false;
    e.angle = 0;
    e.diagonal = false;
    e.xoffset = 0;
    e.yoffset = 0;
    e.image_speed = 0;
  },



  endStep(e) {
    e.timer += 1;
    if (e.timer === 10) destroy(e);
  },
};



export const screenPiece = {
  name: 'obj_marker_screenpiece',

  create(e) {
    e.image_speed = 0;
    e.builtinMotion = true;
    e.piece = 0;
    e.gravityDelay = -1;
    e.depth = -10000;
  },

  step(e) {

    if (e.gravityDelay > 0) {
      e.gravityDelay -= 1;
      if (e.gravityDelay === 0) e.gravity = 1;
    }
  },
};



export const particleGeneric = {
  name: 'obj_particle_generic',

  create(e) {
    e.fade_rate = e.fade_rate ?? 0;
    e.shrink_rate = e.shrink_rate ?? 0;
    e.timer = e.timer ?? -1;
    e.image_alpha = e.image_alpha ?? 1;
  },

  step(e) {
    e.image_alpha = scrApproach(e.image_alpha, 0, e.fade_rate);
    e.image_xscale = scrApproach(e.image_xscale, 0, e.shrink_rate);
    e.image_yscale = scrApproach(e.image_yscale, 0, e.shrink_rate);
    if (e.image_xscale === 0 || e.image_yscale === 0) { destroy(e); return; }
    if (e.image_alpha === 0) { destroy(e); return; }
    e.timer -= 1;
    if (e.timer === 0) destroy(e);
  },
};



export const afterimageScreen = {
  name: 'obj_afterimage_screen',

  create(e, state) {
    e.anchor_x = e.x - (state.view?.x ?? 0);
    e.anchor_y = e.y - (state.view?.y ?? 0);
    e.xscale = 1;
    e.yscale = 1;
    e.alpha = 0.5;
    e.xrate = e.xrate ?? 0.01;
    e.yrate = e.yrate ?? 0.01;
    e.faderate = e.faderate ?? 0.00625;
    e.draw_end = e.draw_end ?? false;
  },

  step(e) {
    e.xscale += e.xrate;
    e.yscale += e.yrate;
    e.alpha = scrApproach(e.alpha, 0, e.faderate);
    if (e.alpha === 0) destroy(e);
  },
};
