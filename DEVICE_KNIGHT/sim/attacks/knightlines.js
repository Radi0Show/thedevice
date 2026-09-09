


import { spawn, destroy } from '../entity.js';
import {
  scrApproach, pointDirection, lengthdirX, lengthdirY, gmlMedian, gmlEq,
} from '../gml.js';
import { gmlRandom, gmlIrandom, gmlIrandomRange, gmlChoose } from '../rng.js';
import {
  scrBulletInit, regularbulletCreate, regularbulletStep, collidebulletOther15,
} from '../bullets/regularbullet.js';
import { scrLerpvar } from '../lerpvar.js';
import { scrAfterimage, afterimage } from '../fx.js';
import { SLASHTUNNEL_MASK, enginePairHit } from '../masks.js';
import { roaringknightSlash } from './roaringknight-slash.js';
import { cue } from '../audio.js';


function boxOf(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
}
function getBox(state, which) {
  const gt = boxOf(state);
  if (!gt) return which === 0 || which === 2 || which === 4 ? state.view.x + 320 : state.view.y + 170;
  const hw = (gt.image_xscale ?? 2) * 75 * 0.5;
  const hh = (gt.image_yscale ?? 2) * 75 * 0.5;
  switch (which) {
    case 0: return gt.x + hw;
    case 1: return gt.y - hh;
    case 2: return gt.x - hw;
    case 3: return gt.y + hh;
    case 4: return gt.x;
    default: return gt.y;
  }
}

export const tunnelslashBullet = {
  name: 'obj_bullet_knight_tunnelslash',

  create(e, state) {
    regularbulletCreate(e, state);
    e.element = 5;
    e.destroyonhit = 0;
    e.image_xscale = 4;
    e.image_yscale = 1;
    e.image_alpha = 0.25;
    e.xspeed = 0;
    e.timer = 0;
    e.totalspin = 0;
    e.new_x = e.x;
    e.new_y = e.y;
    e.boxdir = 0;
    e.aim = 0;
  },

  alarm: {

    0(e, state) {

      e.boxdir = gmlMedian(180, pointDirection(
        e.x, e.y,
        getBox(state, 2) + getBox(state, 4) * 0.5,
        getBox(state, 1) + getBox(state, 5) * 0.5,
      ));

      e.new_x = e.x + lengthdirX(90, e.boxdir + 180);
      e.new_y = e.y + lengthdirY(90, e.boxdir + 180);
      scrLerpvar(state, spawn, e, 'x', e.x, e.new_x, 8, 2);
      scrLerpvar(state, spawn, e, 'y', e.y, e.new_y, 8, 2);

      if (gmlIrandom(state.gmlRng, 5)) {
        e.aim = pointDirection(e.new_x, e.new_y,
          state.soul.x + 10,
          state.soul.y + 10 + gmlIrandomRange(state.gmlRng, -60, 60));
      } else {
        e.aim = pointDirection(e.new_x, e.new_y, state.soul.x + 10, state.soul.y + 10);
      }

      e.totalspin = 640 + gmlIrandom(state.gmlRng, 80);
    },
  },

  step(e, state) {
    regularbulletStep(e, state);
    e.timer += 1;
    e.image_alpha = scrApproach(e.image_alpha, 1, 0.25);
    e.image_xscale = scrApproach(e.image_xscale, 1, 1);


    if (e.totalspin) {
      e.totalspin *= 0.8;
      e.direction = e.aim + e.totalspin;
      e.image_angle = e.direction;
    }


    if (!(e.alarm[0] > 0.5) && e.totalspin < 1) {
      if (e.speed === 0) e.speed = 4;
      else e.speed = scrApproach(e.speed, 20, 2);
    }


    if (e.x <= getBox(state, 2) + 12
      && e.y > getBox(state, 1) + 8 && e.y < getBox(state, 3) - 8) {
      e.speed = 0;
    } else if (e.x > getBox(state, 2) + 50
      || e.y <= getBox(state, 1) + 8 || e.y >= getBox(state, 3) - 8) {

      const a = scrAfterimage(state, e);
      a.fadeSpeed = 0.1;
      a.image_alpha = 0.4;
    }
  },

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, SLASHTUNNEL_MASK);
  },

  other15: collidebulletOther15,
};

export const knightTunnelSlasher = {
  name: 'obj_knight_tunnel_slasher',

  create(e, state) {
    e.sprite_index = 'spr_roaringknight_attack_ol';
    e.image_speed = 0;
    e.image_index = 1;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.push_left = 4;
    e.timer = 0;
    e.fulltimer = 0;

    e.individuality = gmlRandom(state.gmlRng, 100);
    e.behavior = 'prepare';
    e.damage = 206;
  },

  step(e, state) {
    e.fulltimer += 1;

    if (e.behavior === 'prepare') {
      e.image_index = scrApproach(e.image_index, 2.8, 0.2);
      if (e.push_left) {
        e.x -= e.push_left;
        e.push_left *= 0.8;
        if (e.push_left < 1) e.push_left = 1;
      }

      if (gmlEq(e.image_index, 2.8)) e.timer += 1;
      if (e.timer === 16) {
        e.push_left = 4;
        e.behavior = 'slash';
        e.timer = 0;
        e.image_index = 3;
      }
    }

    if (e.behavior === 'slash') {
      if (e.timer < 20) e.image_index = scrApproach(e.image_index, 5.6, 0.4);
      e.timer += 1;
      if (e.push_left) {

        e.x += e.push_left;
        e.push_left *= 0.9;
      }

      if (e.timer % 2 === 0 && e.timer < 24) {
        const offset = Math.sin(e.timer + e.individuality) * 100;
        const temptime = e.timer;
        cue(state, 'snd_smallswing', 3, 1);
        const sx = getBox(state, 0) + 50 + gmlRandom(state.gmlRng, 20) - e.timer * 2;

        const sy = getBox(state, 1) + getBox(state, 5) * 0.5 + offset;
        const slash = spawn(state, roaringknightSlash, { x: sx, y: sy });
        slash.direction = 240 + gmlRandom(state.gmlRng, 60);
        slash.image_angle = slash.direction;


        const b = spawn(state, tunnelslashBullet, { x: sx, y: sy });
        b.sprite_index = 'spr_roaringknight_slash_tunnel';
        b.direction = gmlChoose(state.gmlRng, [slash.direction, slash.direction + 180]);
        b.speed = 0;
        b.damage = e.damage;

        b.image_angle = slash.direction;
        b.alarm[0] = 32 + temptime * 4;
      }

      if (e.timer === 20) e.image_index -= 1;
      if (e.timer === 24) {
        e.sprite_index = 'spr_roaringknight_point_ol';
        e.image_index = 0;
      }
      if (e.timer > 32 && e.timer < 56) {
        e.image_index = scrApproach(e.image_index, 4, 0.35);
        e.push_left = 1;
      }
    }

    if (e.fulltimer % 2 === 0) {
      const fade = scrAfterimage(state, e);
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.speed = 4;
      fade.direction = 0;
    }
  },
};



export function launchKnightlines(state, x, y) {
  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );

  const gt = boxOf(state);
  if (gt) {
    gt.x -= 70;
    gt.image_xscale = 2.5;

    gt.init = false;
  }
  if (state.soul) state.soul.x -= 70;
  if (knight) knight.image_alpha = 0;

  const e = spawn(state, knightTunnelSlasher, {
    x: x ?? knight?.x ?? 0,
    y: y ?? knight?.y ?? 0,
  });
  return e;
}

export { afterimage };
