


import { gmlRandom, gmlRandomRange } from '../rng.js';
import { spawn, destroy } from '../entity.js';
import { scrLerpvar } from '../lerpvar.js';

export const swordTunnelAnim = {
  name: 'obj_knight_swordtunnelanim',

  create(e, state) {
    e.con = 0;
    e.timer = 0;
    e.siner = 0;
    e.animindex = 0;
    e.sprite_index = 'spr_roaringknight_point_ol';
    e.image_speed = 0;
    e.image_index = 0;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.drawtrail = true;
    e.shadowtimer = 0;
    e.dir = 4;
    e.fadeaudio = 0;
    e.fadeaudio2 = 0;
    e.shinkafade = 0;
    e.leafpitch = 1;
    e.endtimer = 0;
    e.componentMotion = true;
    e.hspeed = 0;
    e.vspeed = 0;
    e.ystart = e.y;


    const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
    e.depth = (gt ? gt.depth : 5) - 1;
  },

  step(e, state) {
    if (e.con === 0) {

      if (e.timer < 60 && e.timer % 3 === 0 && state.gmlRng) {
        gmlRandom(state.gmlRng, 0.2);
        gmlRandom(state.gmlRng, 0.2);
      }
      e.timer += 1;

      if (e.timer === 1) {
        scrLerpvar(state, spawn, e, 'image_index', 0, 4, 10);
        scrLerpvar(state, spawn, e, 'dir', 4, -18, 40, 2);
      }
      if (e.timer === 20) {
        scrLerpvar(state, spawn, e, 'image_alpha', 1, 0, 10);
        e.hspeed = -4;
      }
      if (e.timer === 26) e.drawtrail = 0;
      if (e.timer === 60) {
        e.timer = 0;
        e.con = 1;
      }
    }

    if (e.con === 1) {
      e.timer += 1;

      if (e.timer % 3 === 0 && state.gmlRng) {
        gmlRandomRange(state.gmlRng, 0, 0.2);
        gmlRandomRange(state.gmlRng, 0, 0.2);
      }
    }


    if (state.turntimer - 1 < 10) {
      e.endtimer = (e.endtimer ?? 0) + 1;
      e.image_alpha = 1;
      const knight = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      if (knight) e.x = knight.x;
      if (e.endtimer === 1) {
        e.sprite_index = 'spr_roaringknight_ball_transition_sword';
        e.image_index = 5;
        e.image_speed = 0.5;
      }
      if (e.endtimer === 8) {
        destroy(e);
        return;
      }
    }

    e.siner += 1;
    e.y = e.ystart + Math.sin(e.siner / 16) * 8;
  },
};
