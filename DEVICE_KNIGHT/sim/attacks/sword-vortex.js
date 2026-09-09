


import { spawn } from '../entity.js';
import { lengthdirX, lengthdirY, lerp } from '../gml.js';
import { scrBulletInit, collidebulletOther15 } from '../bullets/regularbullet.js';
import { gmlChoose, gmlIrandom } from '../rng.js';

const HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315];

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

function manager(state) {
  return state.entities.find(
    (e) => e.alive && e.type.name === 'obj_sword_vortex_manager',
  );
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
  },

  step(e, state) {
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
    e.variant = 3;
    e.firstsword = false;
    e.swordcount = 0;
    e.multiswordcon = 0;
    e.multiswordcount = 0;
    e.centermovescon = 0;
    e.centermovestimer = 0;
    e.swordcirclecenterx = gt ? gt.x : 320;
    e.swordcirclecentery = gt ? gt.y : 170;
    e.startx = e.swordcirclecenterx;
    e.starty = e.swordcirclecentery;
    e.targetx = 0;
    e.targety = 0;
    e.setcount = 0;
    e.setdirection = new Array(50).fill(-1);
    scrBulletInit(e);


    e.rate = 11;
    e.ratedecay = 0;
    e.rateminimum = 1;
    e.maxswords = 6;
    e.multiswordmax = 2;
    e.multiswordframes = 1;
    e.sinpower = 17;
    e.sinspeed = 22;
    e.startinglen = 80;
    e.shrinkrate = 0;
    e.centermoves = 1;
    e.movespeed = 60;
    for (let i = 1; i <= 6; i++) e.setdirection[i] = i % 2 === 1 ? 0 : 180;

    e.timer = e.rate - 5;
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
          : (gt ? gt.x : 320) - 60 + gmlIrandom(state.gmlRng, 120);
        e.targety = rec
          ? rec.y
          : (gt ? gt.y : 170) - 60 + gmlIrandom(state.gmlRng, 120);
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
