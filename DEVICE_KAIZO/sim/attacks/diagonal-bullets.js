


import { spawn, destroy } from '../entity.js';
import { clamp, lerp } from '../gml.js';
import { scrBulletInit, collidebulletOther15 } from '../bullets/regularbullet.js';
import { gmlChoose } from '../rng.js';

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

export const diagonalBullet = {
  name: 'obj_diagonal_bullet',

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.image_alpha = 0;
    scrBulletInit(e);
    e.destroyonhit = 0;

    e.sprite_index = 'spr_smallbullet';
    e.isBullet = true;
    e.componentMotion = true;
    e.hspeed = 0;
    e.vspeed = 0;
  },

  step(e, state) {
    e.timer += 1;


    const gt = box(state);
    if (gt) {
      const a = clamp(Math.abs(e.x - gt.x) / 300, 0, 1);
      const maxalpha = lerp(1.3, 0, a);
      e.image_alpha = lerp(maxalpha, 0, Math.abs(e.y - gt.y) / 200);
    }

    if (e.timer > 260) destroy(e);
  },

  other15: collidebulletOther15,
};

export const diagonalBulletManager = {
  name: 'obj_diagonal_bullet_manager',

  create(e, state) {

    e.isBullet = true;
    e.maskOff = true;
    e.timer = 0;
    e.con = 0;
    e.damage = 1;
    e.grazepoint = 2;
    e.timepoints = 2;
    e.inv = 0;
    e.target = 4;
    e.grazed = 0;
    e.grazetimer = 0;
    e.element = 0;
    e.rate = 44;
    e.verticalspeed = 6;
    e.horizontalspeed = -5;
    e.gapsize = 56;
    e.bulletcount = 24;

    e.timer = e.rate - 1;
  },

  step(e, state) {
    e.timer += 1;
    if (e.timer !== e.rate) return;
    e.timer = 0;

    const gt = box(state);
    if (!gt) return;


    const vspeed = state.diagonalFlips
      ? state.diagonalFlips[state.diagonalIndex++]
      : gmlChoose(state.gmlRng, [e.verticalspeed, e.verticalspeed * -1]);

    for (let i = 0; i < e.bulletcount; i++) {
      const inst = spawn(state, diagonalBullet, {
        x: gt.x + 300,
        y: gt.y - 100 + e.gapsize * i,
      });
      inst.hspeed = e.horizontalspeed;
      inst.vspeed = vspeed;
      inst.damage = e.damage;
      if (vspeed > 0) {
        inst.y = inst.y - e.bulletcount * e.gapsize + 300;
      }
    }

    e.rate -= 4;
    if (e.rate < 8) e.rate = 8;
  },
};
