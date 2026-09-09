


import { spawn, destroy } from '../entity.js';
import { cue } from '../audio.js';
import { clamp01, scrEaseOut } from '../gml.js';
import { STAR_FULL_MASK, scrPreciseHit, enginePairHit } from '../masks.js';
import { scrBulletInit, collidebulletOther15 } from '../bullets/regularbullet.js';
import { knightCatch } from '../knight.js';
import { scrChildbulletCopy } from '../childbullet.js';
import { pointingStarchild } from './pointing-starchild.js';

export const roaringStar = {
  name: 'obj_knight_roaring_star',



  stepOrder: -1,

  create(e, state) {
    scrBulletInit(e);
    e.image_xscale = 0;
    e.image_yscale = 0;
    e.even = false;
    e.destroyonhit = false;
    e.timer = 0;
    e.con = 0;
    e.growstart = 0;
    e.playSound = true;
    e.beamflicker = 0;
    e.split = 0;
    e.outbound = false;
    e.splitmax = 14;
    e.splitease = 0;
    e.finalx = 0;
    e.damage = 206;
    e.element = 5;
    e.sprite_index = 'spr_knight_bullet_star';
    e.isBullet = true;
    e.builtinMotion = true;
  },



  collides(e, heart, state) {
    if (state && state.replayContacts) return false;
    if (e.active !== 1 && e.active !== true) return false;

    if (!enginePairHit(heart, e, STAR_FULL_MASK)) return false;
    return scrPreciseHit(heart, e, STAR_FULL_MASK, 2);
  },



  other15(e, state) {
    if (e.active !== 1 && e.active !== true) return;
    if (state.roaringActive) knightCatch(state);
    else collidebulletOther15(e, state);

    if (e.destroyonhit === 1) destroy(e);
  },

  step(e, state) {

    const halfW = 64 * Math.abs(e.image_xscale);
    const halfH = 64 * Math.abs(e.image_yscale);
    const off =
      e.x < state.view.x - halfW ||
      e.x > state.view.x + 640 + halfW ||
      e.y < state.view.y - halfH ||
      e.y > state.view.y + 480 + halfH;

    if (off) {

      if (e.outbound) {
        destroy(e);
        return;
      }
    } else {
      e.outbound = true;
    }

    if (e.con === 1) {
      e.friction = 0.5;
      e.con += 1;
    } else if (e.con === 2) {
      if (e.speed === 0 && e.gravity === 0) {

        e.gravity = 0.1;
        e.gravity_direction = e.direction - 180;
        e.friction = 0;
      }
      e.timer += 1;
      if (e.timer >= 40 && !e.split) {
        e.timer = 0;
        e.con += 1;

        if (e.playSound) cue(state, 'snd_explosion_firework');
      }
      e.growstart = e.image_xscale;
    } else if (e.con === 2.5) {
      if (e.split === 1) {
        e.speed = 0;
        e.gravity = 0;
        e.sprite_index = 'spr_knight_bullet_star_top';
        e.timer = -10;
        e.split = 2;
      }
      e.timer += 1;
      e.splitease = scrEaseOut(clamp01(e.timer / 20), 4) * e.splitmax * e.image_xscale;
      if (e.timer === 20) {
        e.con = 3;
        e.timer = 0;
      }
    } else if (e.con === 3) {
      e.timer += 1;
      e.image_xscale = e.growstart + clamp01(e.timer / 2);
      e.image_yscale = e.growstart + clamp01(e.timer / 2);

      if (e.timer === 3) {
        let angle = 90;
        for (let i = 0; i < 6; i++) {
          let xx = e.x;
          let yy = e.y;
          if (e.split > 0) {

            if (i === 0 || i >= 4) {
              xx += (e.splitmax * e.image_xscale) / 2;
              yy += e.splitmax * e.image_xscale;
            } else {
              xx -= (e.splitmax * e.image_xscale) / 2;
              yy -= e.splitmax * e.image_xscale;
            }
          }

          const d = spawn(state, pointingStarchild, { x: e.x, y: e.y });

          scrChildbulletCopy(d, e);
          d.image_angle = angle;
          d.direction = angle;
          d.speed = 1;
          d.friction = -0.1;
          d.image_xscale = e.image_xscale * 0.5;
          d.image_yscale = e.image_yscale * 0.5;
          d.deceleration = 0.15;
          angle += i === 1 || i === 4 ? 57 : 66;
        }
      }

      if (e.timer >= 4) {
        if (globalThis.process?.env?.KNIGHT_RSTAR_DEBUG) {
          console.error(`[rstar] burst f=${state.frame} seq=${e.seq}`
            + ` (${e.x.toFixed(2)},${e.y.toFixed(2)})`);
        }
        destroy(e);
      }
    }
  },
};
