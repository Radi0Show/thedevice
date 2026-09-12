


import { spawn, destroy } from '../entity.js';
import { cue } from '../audio.js';
import { gmlChoose } from '../rng.js';
import { clamp01 } from '../gml.js';
import { STAR_MASK, scrPreciseHit, enginePairHit } from '../masks.js';
import { scrChildbulletCopy } from '../childbullet.js';
import { scrBulletInit, collidebulletOther15 } from '../bullets/regularbullet.js';
import { scrDamageAll } from '../damage.js';
import { pointingStarchild } from './pointing-starchild.js';

export const pointingStar = {
  name: 'obj_knight_pointing_star',

  create(e, state) {
    scrBulletInit(e);

    e.sprite_index = 'spr_knight_bullet_star';
    e.growspeed = 0.02;
    e.image_xscale = 0;
    e.image_yscale = 0;
    e.even = false;
    e.destroyonhit = false;
    e.timer = 0;
    e.con = 0;
    e.growstart = 0;
    e.playSound = true;
    e.damage = 1;
    e.grazepoints = 2;
    e.element = 5;
    e.difficulty = 0;
    e.grazetimer = 0;
    e.side = 0;
    e.init = false;
    e.rotation = 0;


    e.dir = state?.gmlRng ? gmlChoose(state.gmlRng, [-1, 1]) : 1;

    e.isBullet = true;
    e.builtinMotion = true;
    e.speed = 0;
    e.direction = 0;
    e.image_angle = 0;

    e.maskOff = false;

    e.mask = STAR_MASK;
    e.burst = 0;
  },

  step(e, state) {

    const halfW = (64 * Math.abs(e.image_xscale)) / 2;
    const halfH = (64 * Math.abs(e.image_yscale)) / 2;
    if (
      e.x < state.view.x - halfW ||
      e.y < state.view.y - halfH ||
      e.y > state.view.y + 480 + halfH
    ) {
      destroy(e);
      return;
    }

    if (!e.init) e.init = true;

    e.grazetimer += 1;
    if (e.grazetimer % 4 === 0) e.grazed = 0;

    if (e.con === 0) {
      e.image_xscale += e.growspeed;
      e.image_yscale += e.growspeed;
    } else if (e.con === 1) {
      e.friction = 0.5;
      e.con += 1;
    } else if (e.con === 2) {
      e.maskOff = false;
      if (e.speed === 0) {

        e.gravity = 0.1;
        e.gravity_direction = e.direction - 180;
        e.friction = 0;
      }
      e.timer += 1;
      if (e.timer >= 40) {
        e.timer = 0;
        e.con += 1;

        if (e.playSound) cue(state, 'snd_explosion_firework');
      }
      e.growstart = e.image_xscale;
    } else if (e.con === 3) {
      e.timer += 1;
      e.image_xscale = e.growstart + clamp01(e.timer / 2);
      e.image_yscale = e.growstart + clamp01(e.timer / 2);

      if (e.timer === 3) {

        let angle = 90;
        if (e.difficulty === 2) angle += e.side;

        for (let i = 0; i < 6; i++) {
          const d = spawn(state, pointingStarchild, { x: e.x, y: e.y });

          scrChildbulletCopy(d, e);
          d.image_angle = angle;
          d.direction = angle;

          if (e.difficulty === 0 && i % 2 === 1) {

            d.speed = 1;
            d.lifetime = 30;
          } else {
            d.speed = 4;
          }

          d.image_xscale = e.image_xscale * 0.5;
          d.image_yscale = e.image_yscale * 0.5;
          d.deceleration = 0.15;

          if (e.difficulty === 2 && i % 3 > 0) {

            d.difficulty = -1;
            d.lifetime = 30;
            d.speed = 2;
            if (i === 1 || i === 4) {
              d.speed /= 3;
              d.minspeed /= 3;
              d.deceleration /= 3;
            } else {
              d.speed *= 2 / 3;
              d.minspeed *= 2 / 3;
              d.deceleration *= 2 / 3;
            }
            d.sprite_index = 'spr_knight_starchild_trail';
          } else {

            d.difficulty = e.difficulty;
          }


          if (i === 1 || i === 4) angle += e.difficulty === 2 ? 180 : 48;
          else angle += e.difficulty === 2 ? 0 : 66;
        }

        e.burst = 6;
        e.active = false;
      }
      if (e.timer >= 4) {
        destroy(e);
      }
    }
  },



  collides(e, heart) {

    if (!enginePairHit(heart, e, STAR_MASK)) return false;
    return scrPreciseHit(heart, e, STAR_MASK, 3);
  },

  other15: starOther15,
};



export function starOther15(e, state) {
  if (e.active !== 1 && e.active !== true) return;
  e.damage = 75;
  e.target = 3;
  scrDamageAll(state, e.damage, { aoe: true, element: 5 });

  if (e.destroyonhit === 1) destroy(e);
}
