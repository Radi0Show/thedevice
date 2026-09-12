


import { spawn, destroy } from '../../sim/entity.js';
import { clamp, lerp, scrApproach } from '../../sim/gml.js';
import { scrBulletInit, collidebulletOther15 } from '../../sim/bullets/regularbullet.js';
import { gmlChoose } from '../../sim/rng.js';

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}



function kaizoSideb(state) {
  return !!(state.kaizo && state.kaizo.sideb);
}



const KAIZO_DIAGONAL_DAMAGE = 103;

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

    e.damage = KAIZO_DIAGONAL_DAMAGE;


    const gt = box(state);
    if (gt) {
      const a = clamp(Math.abs(e.x - gt.x) / 300, 0, 1);
      const maxalpha = lerp(1.3, 0, a);
      e.image_alpha = lerp(maxalpha, 0, Math.abs(e.y - gt.y) / 200);
    }


    if (e.timer > 180) destroy(e);
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

    e.element = 5;
    e.rate = 44;
    e.verticalspeed = 6;
    e.horizontalspeed = -5;
    e.gapsize = 56;
    e.bulletcount = 24;

    e.timer = e.rate - 1;

    e.stoptime = 0;
    e.rownum = 0;
  },

  step(e, state) {
    e.timer += 1;

    e.damage = KAIZO_DIAGONAL_DAMAGE;

    if (e.timer === e.rate) {
      e.timer = 0;

      const gt = box(state);

      if (gt) {

        const vspeed = state.diagonalFlips
          ? state.diagonalFlips[state.diagonalIndex++]
          : gmlChoose(state.gmlRng, [e.verticalspeed, e.verticalspeed * -1]);


        let _hspeed = e.horizontalspeed;
        let _xoff = 6;
        let _xx = 300;
        if (kaizoSideb(state) && (e.rownum % 2) === 1) {
          _xx = -300;
          _hspeed = -e.horizontalspeed;
        }

        for (let i = 0; i < e.bulletcount; i++) {
          const inst = spawn(state, diagonalBullet, {
            x: gt.x + _xx,
            y: gt.y - 100 + e.gapsize * i,
          });
          inst.hspeed = _hspeed;
          inst.vspeed = vspeed;

          e.damage = KAIZO_DIAGONAL_DAMAGE;
          inst.damage = e.damage;

          if (kaizoSideb(state)) {
            inst.x += _xoff;
            _xoff = -_xoff;
          }
          if (vspeed > 0) {
            inst.y = inst.y - e.bulletcount * e.gapsize + 300;

            inst.x += _xoff * 2;
          }
        }

        e.rate -= 4;
        if (e.rate < 8) {

          e.stoptime = 1;
          e.rate = 8;
        }

        e.rownum += 1;
      }
    }


    if (e.stoptime) {
      e.horizontalspeed = scrApproach(e.horizontalspeed, 0, 0.05);
      for (const b of state.entities) {
        if (!b.alive || b.type.name !== 'obj_diagonal_bullet') continue;
        b.hspeed = scrApproach(b.hspeed, 0, 0.05);
      }
    }
  },
};
