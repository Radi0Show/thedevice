

import { spawn } from '../../sim/entity.js';
import {
  lengthdirX, lengthdirY, lerp, gmlEq, pointDirection, WHITE,
} from '../../sim/gml.js';

import { getSwordcolor } from './kaizo-colors.js';
import {
  scrBulletInit, collidebulletOther15, regularbulletCreate, regularbulletStep,
} from '../../sim/bullets/regularbullet.js';
import { gmlChoose, gmlIrandom } from '../../sim/rng.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { SWORDOL_MASK, HEART_MASK, masksOverlap } from '../../sim/masks.js';

const HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315];

export const SWORD_OL_ALT = 'spr_roaringknight_sword_ol_alt';

export function swordOlAliasHit(e, heart) {
  const m = e.mask;
  if (!m) return null;
  return masksOverlap(
    heart.mask ?? HEART_MASK, heart.x, heart.y,
    m, e.x, e.y, e.image_xscale, e.image_yscale, e.image_angle,
  );
}

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

function manager(state) {
  return state.entities.find(
    (e) => e.alive && e.type.name === 'obj_sword_vortex_manager',
  );
}

function iEx(state, name) {
  return state.entities.some((e) => e.alive && e.type.name === name);
}

export const swordVortex = {
  name: 'obj_sword_vortex',

  stepOrder: -1,

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.dir = 0;
    e.image_alpha = 0;
    scrBulletInit(e);
    e.destroyonhit = 0;
    e.damage = 10;
    e.grazepoints = 2;
    e.timepoints = 1;
    e.spinspeed = 4;
    e.speedtowardscenter = 0.4;
    e.len = 70;
    e.sinpower = 65;
    e.sinspeed = 24;
    e.shrinkrate = 0;
    e.lenstart = e.len;
    e.sprite_index = 'spr_roaringknight_sword_ol';
    e.isBullet = true;

    e.mask = SWORDOL_MASK;
  },

  step(e, state) {

    const cone = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_knight_pointing_cone',
    );
    if (cone) {
      e.image_blend = WHITE;
      e.sprite_index = SWORD_OL_ALT;
      e.depth = (cone.depth ?? 0) - 1;
    } else {
      e.image_blend = getSwordcolor(state);
    }

    e.image_alpha += 0.1;

    e.dir -= e.spinspeed * lerp(2, 1, e.len / 120);
    e.image_angle = e.dir - 90;

    const mg = manager(state);
    if (mg) {

      e.len = e.lenstart + Math.sin(mg.siner / e.sinspeed) * e.sinpower;
      e.x = mg.swordcirclecenterx + lengthdirX(e.len, e.dir);
      e.y = mg.swordcirclecentery + lengthdirY(e.len, e.dir);
      e.lenstart -= e.shrinkrate;
    }

    e.timer += 1;
    if (e.timer % 4 === 0) e.grazed = 0;
  },

  collides: swordOlAliasHit,

  other15: collidebulletOther15,
};

export const swordVortexManager = {
  name: 'obj_sword_vortex_manager',

  create(e, state) {

    e.isBullet = true;
    e.maskOff = true;
    const gt = box(state);
    e.timer = 0;
    e.siner = 0;
    e.con = 0;

    if (iEx(state, 'obj_knight_swordfall') || iEx(state, 'obj_knight_rotating_slash')) {
      e.variant = 4;
    } else {
      e.variant = 3;
    }
    if (state.currentAc === 20) e.variant = 3.1;

    e.firstsword = false;
    e.swordcount = 0;

    e.sinpower = 65;
    e.sinspeed = 24;
    e.startinglen = 70;
    e.shrinkrate = 0;
    e.multiswordmax = 0;
    e.multiswordframes = 0;
    e.multiswordcon = 0;
    e.multiswordcount = 0;
    e.centermoves = 0;
    e.centermovescon = 0;
    e.centermovestimer = 0;
    e.movespeed = 60;
    e.swordcirclecenterx = gt ? gt.x : 320;
    e.swordcirclecentery = gt ? gt.y : 170;
    e.startx = e.swordcirclecenterx;
    e.starty = e.swordcirclecentery;
    e.targetx = 0;
    e.targety = 0;
    e.setcount = 0;

    e.targetxoff = 0;
    e.targetyoff = 0;
    e.setdirection = new Array(50).fill(-1);
    scrBulletInit(e);

    e.rate = 1;

    if (gmlEq(e.variant, 3)) {
      e.rate = 11;
      e.ratedecay = 0;
      e.rateminimum = 1;
      e.maxswords = 6;
      e.multiswordmax = 2;
      e.multiswordframes = 1;
      e.sinpower = 17;
      e.sinspeed = 22;
      e.startinglen = 80;
      for (let i = 1; i <= 6; i++) e.setdirection[i] = i % 2 === 1 ? 0 : 180;
      e.centermoves = 1;
      e.movespeed = 60;
    }

    if (gmlEq(e.variant, 4)) {
      e.rate = 11;
      e.ratedecay = 0;
      e.rateminimum = 1;
      e.maxswords = 6;
      e.multiswordmax = 2;
      e.multiswordframes = 1;
      e.sinpower = 17;
      e.sinspeed = 22;
      e.startinglen = 80;
      for (let i = 1; i <= 6; i++) e.setdirection[i] = i % 2 === 1 ? 0 : 180;
    }

    e.timer = e.rate - 5;

    if (gmlEq(e.variant, 3.1)) {
      e.rate = 11;
      e.timer = 10;
      e.ratedecay = 0;
      e.rateminimum = 1;
      e.maxswords = 6;
      e.multiswordmax = 2;
      e.multiswordframes = 1;
      e.sinpower = 8;
      e.sinspeed = 10;
      e.startinglen = 90;
      for (let i = 1; i <= 6; i++) e.setdirection[i] = i % 2 === 1 ? 0 : 180;
      e.centermoves = 1;
      e.movespeed = 60;
      e.targetxoff = -25;
    }

    if (state.currentAc === 111) {
      e.movespeed = 120 - ((state.kaizo?.sideb ? 1 : 0) * 20);
    }
  },

  step(e, state) {
    e.timer += 1;
    e.siner += 1;

    const gt = box(state);

    const fire =
      (e.timer === e.rate && e.swordcount < e.maxswords) ||
      (e.timer === e.multiswordframes && e.multiswordcon === 1);

    if (fire) {
      const inst = spawn(state, swordVortex, {
        x: gt ? gt.x : 320,
        y: gt ? gt.y : 170,
      });

      inst.dir = gmlChoose(state.gmlRng, HEADINGS);
      inst.variant = e.variant;
      inst.sinpower = e.sinpower;
      inst.sinspeed = e.sinspeed;
      inst.len = e.startinglen;
      inst.lenstart = inst.len;
      inst.shrinkrate = e.shrinkrate;
      inst.damage = e.damage;
      inst.target = e.target;

      e.swordcount += 1;
      e.setcount += 1;
      if (e.setdirection[e.setcount] !== -1) inst.dir = e.setdirection[e.setcount];

      if (e.multiswordmax > 0) e.multiswordcount += 1;
      if (e.multiswordcon === 0 && e.multiswordmax > 0) e.multiswordcon = 1;
      if (e.multiswordcon === 1 && e.multiswordcount === e.multiswordmax) {
        e.multiswordcon = 0;
        e.multiswordcount = 0;
      }

      inst.x = inst.xstart + lengthdirX(inst.len, inst.dir);
      inst.y = inst.ystart + lengthdirY(inst.len, inst.dir);
      inst.image_angle = inst.dir - 90;

      e.rate -= e.ratedecay;
      if (e.rate < e.rateminimum) e.rate = e.rateminimum;
      e.timer = 0;
    }

    if (e.centermoves === 1) {
      if (e.centermovescon === 0) {
        e.startx = e.swordcirclecenterx;
        e.starty = e.swordcirclecentery;
        const rec = state.vortexTargets ? state.vortexTargets[state.vortexIndex++] : null;

        e.targetx = rec
          ? rec.x
          : (gt ? gt.x : 320) - 60 + gmlIrandom(state.gmlRng, 120) + e.targetxoff;
        e.targety = rec
          ? rec.y
          : (gt ? gt.y : 170) - 60 + gmlIrandom(state.gmlRng, 120) + e.targetyoff;
        e.centermovescon = 1;
      }
      if (e.centermovescon === 1) {
        e.centermovestimer += 1;
        e.swordcirclecenterx = lerp(e.startx, e.targetx, e.centermovestimer / e.movespeed);
        e.swordcirclecentery = lerp(e.starty, e.targety, e.centermovestimer / e.movespeed);
        if (e.centermovestimer === e.movespeed) {
          e.centermovestimer = 0;
          e.centermovescon = 0;
        }
      }
    }
  },
};

export function kaizoVortexendStep(e, state) {
  e.timer += 1;
  if (e.con === 0) {
    if (e.sndcon === 0) {

    }
    for (const b of state.entities) {
      if (b.alive && b.sndcon !== undefined) b.sndcon = 1;
    }

    const hx = state.soul && state.soul.alive ? state.soul.x : 310;
    const hy = state.soul && state.soul.alive ? state.soul.y : 160;
    let _pnt = pointDirection(e.x, e.y, hx + 10, hy + 10);
    scrLerpvar(state, spawn, e, 'x', e.x, e.x + lengthdirX(80, _pnt - 180), 16, 2, 'in');
    scrLerpvar(state, spawn, e, 'y', e.y, e.y + lengthdirY(80, _pnt - 180), 16, 2, 'in');
    _pnt += 360;
    scrLerpvar(state, spawn, e, 'image_angle', e.image_angle, _pnt, 16, 2, 'in');
    e.con = 1;
    e.timer = 0;
  } else if (e.con === 1) {
    if (e.timer === 20) {
      e.speed = -8;
      if (e.sndcon === 1) {

      }
      for (const b of state.entities) {
        if (b.alive && b.sndcon !== undefined) b.sndcon = 2;
      }
    }
    e.direction = e.image_angle;
    if (e.timer === 21) {
      scrLerpvar(state, spawn, e, 'speed', -8, 40, 15);

    }
    if (e.timer === 60) {
      state.turntimer = -1;
    }
  }
}

export const vortexendBullet = {
  name: 'obj_regularbullet',

  create(e, state) {
    regularbulletCreate(e, state);
  },

  step(e, state) {
    regularbulletStep(e, state);
    kaizoVortexendStep(e, state);
  },

  collides: swordOlAliasHit,

  other15: collidebulletOther15,
};

export function kaizoVortexendFreeze(state) {
  for (const sw of [...state.entities]) {
    if (!sw.alive || sw.type.name !== 'obj_sword_vortex') continue;
    const b = spawn(state, vortexendBullet, { x: sw.x, y: sw.y });
    b.timer = 0;
    b.sndcon = 0;
    b.con = 0;
    b.sprite_index = sw.sprite_index;
    b.mask = sw.mask;
    b.active = 1;
    b.image_angle = sw.image_angle;
    b.direction = sw.direction;
    b.image_xscale = sw.image_xscale;
    b.image_yscale = sw.image_yscale;
    b.image_blend = sw.image_blend;
    b.damage = sw.damage;
    b.destroyonhit = 0;
    b.wall_destroy = 0;

    sw.active = 0;
    sw.image_alpha = 0;
    sw.visible = false;
  }
  state.turntimer = 999;
}
