


import { spawn, destroy } from '../entity.js';
import { lengthdirX, lengthdirY, scrApproach } from '../gml.js';
import { gmlIrandomRange, gmlIrandom, gmlChoose } from '../rng.js';
import { scrBulletInit, regularbulletCreate, regularbulletStep, collidebulletOther15 } from '../bullets/regularbullet.js';
import { STREAMDIAMOND_MASK, enginePairHit } from '../masks.js';


export const knightStreamline = {
  name: 'obj_knight_streamline',

  create(e) {
    e.x1 = e.x;
    e.y1 = e.y;
    e.x2 = e.x;
    e.y2 = e.y;
    e.width = 4;
    e.width_goal = 4;
    e.line_length = 0;
    e.timer = 0;

    e.isBullet = false;
  },

  step(e) {
    e.timer += 1;
    if (e.timer === 6) e.width_goal = 0;
    if (e.timer >= 12) destroy(e);
  },



  endStep(e) {
    e.line_length = scrApproach(e.line_length, 400, 60);
    e.width = scrApproach(e.width, e.width_goal,
      Math.min(Math.abs(e.width_goal - e.width) * 0.5, 16));
    e.x1 = e.x + lengthdirX(200, e.direction);
    e.y1 = e.y + lengthdirY(200, e.direction);
    e.x2 = e.x1 + lengthdirX(e.line_length, e.direction + 180);
    e.y2 = e.y1 + lengthdirY(e.line_length, e.direction + 180);
  },
};


export const streamDiamond = {
  name: 'obj_bullet_stream_diamond',

  create(e, state) {
    regularbulletCreate(e, state);
    e.sprite_index = 'spr_diamondbullet';

    e.visible = false;
    e.isBullet = true;
    e.builtinMotion = true;
  },

  step: regularbulletStep,

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, STREAMDIAMOND_MASK);
  },

  other15: collidebulletOther15,
};


export const bulletKnightStream = {
  name: 'obj_bullet_knight_stream',

  create(e) {
    e.x1 = e.x;
    e.y1 = e.y;
    e.x2 = e.x;
    e.y2 = e.y;
    e.width = 8;
    e.width_goal = 8;
    e.line_length = 0;
    e.timer = 0;
    e.can_do_slashes = true;
    e.isBullet = false;
  },

  step(e, state) {
    e.timer += 1;

    if (e.timer >= 20 && e.timer < 40) {
      if (e.timer < 24) {
        e.width_goal = 64 + Math.sin(e.timer * 2.35) * 16;
      } else {
        e.width_goal = 32 + Math.sin(e.timer * 2.35) * 16;
      }
    } else if (e.timer >= 40) {
      e.width_goal = 0;
    } else if (e.timer > 8) {
      e.width_goal = 0;
    }


    if (e.timer > 15 && e.timer % 8 === 0 && e.timer < 40) {
      for (const side of [270, 90]) {
        for (let a = 1; a < 4; a++) {
          const b = spawn(state, streamDiamond, {
            x: e.x1 + lengthdirX(60 * a, e.direction + side),
            y: e.y1 + lengthdirY(60 * a, e.direction + side),
          });
          b.direction = e.direction + 180;
          b.speed = 15;
          b.image_angle = e.direction;
        }
      }
    }

    if (e.timer === 50) destroy(e);
  },


  endStep: knightStreamline.endStep,
};

export const knightStream = {
  name: 'obj_knight_stream',

  create(e, state) {
    scrBulletInit(e);

    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_speed = 0;
    e.slash_angle = 90 + gmlIrandomRange(state.gmlRng, -45, 45);
    e.timer = 0;
  },

  step(e, state) {
    e.timer += 1;

    if (e.timer === 20) {
      const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
      const gx = gt ? gt.x : state.view.x + 320;
      const gy = gt ? gt.y : state.view.y + 170;
      let xoff = 0;
      let yoff = 0;

      const planeShift = gmlChoose(state.gmlRng, [true, false]);
      if (planeShift) xoff = gmlIrandomRange(state.gmlRng, -40, 40);
      else yoff = gmlIrandomRange(state.gmlRng, -40, 40);

      for (const dir of [e.slash_angle, 180 - e.slash_angle]) {
        const b = spawn(state, bulletKnightStream, { x: gx + xoff, y: gy + yoff });
        b.direction = dir;
        b.speed = 0;
      }
    }


    const sprout = { 23: 60, 26: 120, 29: 180 }[e.timer];
    if (sprout !== undefined) {
      for (const beam of state.entities) {
        if (!beam.alive || beam.type.name !== 'obj_bullet_knight_stream') continue;
        if (!beam.can_do_slashes) continue;
        for (const sign of [1, -1]) {
          const l = spawn(state, knightStreamline, {
            x: beam.x + sign * lengthdirX(sprout, beam.direction + 270),
            y: beam.y + sign * lengthdirY(sprout, beam.direction + 270),
          });
          l.direction = beam.direction;
          l.speed = 0;
        }
        if (e.timer === 29) beam.can_do_slashes = false;
      }
    }

    if (e.timer === 45) {
      e.slash_angle += 25 + gmlIrandom(state.gmlRng, 25);
      if (e.slash_angle > 70) e.slash_angle -= 40;
      e.timer = 0;
    }
  },
};
