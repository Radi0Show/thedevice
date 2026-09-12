

import { spawn, destroy } from '../../sim/entity.js';
import { cue } from '../../sim/audio.js';
import { gmlChoose } from '../../sim/rng.js';
import { clamp01, gmlEq, scrApproach, mergeColor, GRAY, WHITE } from '../../sim/gml.js';

import { KAIZO_TELEGRAPH_COLOR } from './kaizo-colors.js';
import { STAR_MASK, scrPreciseHit, enginePairHit } from '../../sim/masks.js';
import { scrChildbulletCopy } from '../../sim/childbullet.js';
import { scrBulletInit, collidebulletOther15 } from '../../sim/bullets/regularbullet.js';
import { scrDamageAll } from '../../sim/damage.js';
import { pointingStarchild } from './stars-pointing-starchild.js';

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

    e.blast_arr = [];
    e.blast_stars = 6;
    e.stay = 0;

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

    if (!e.init) {
      const kaizoSideb = !!(state.kaizo && state.kaizo.sideb);

      if (e.difficulty === 0 || gmlEq(e.difficulty, 3.3)) {
        e.sprite_index = 'spr_knight_bullet_star_easy';
      }
      e.blast_dir = [90, 147, 213, 270, 327, 33];
      e.blast_stars = 6;
      e.split_blast = 0;
      if (e.difficulty === 3 || gmlEq(e.difficulty, 3.2)) {
        e.blast_dir = state?.gmlRng
          ? gmlChoose(state.gmlRng, [[90, 213, 327], [147, 270, 33]])
          : [90, 213, 327];
        e.blast_stars = 3;
      }
      if (gmlEq(e.difficulty, 3.3)) {
        e.blast_dir = state?.gmlRng
          ? gmlChoose(state.gmlRng, [
            [90, 147, 213, 270, 327, 33],
            [147, 213, 270, 327, 33, 90],
          ])
          : [90, 147, 213, 270, 327, 33];
        e.blast_stars = 6;
        e.split_blast = 1;
      }
      if (!kaizoSideb) {
        if (gmlEq(e.difficulty, 3.1)) {
          e.blast_dir = state?.gmlRng
            ? gmlChoose(state.gmlRng, [
              [0, 72, 144, 216, 288],
              [36, 108, 180, 252, 324],
            ])
            : [0, 72, 144, 216, 288];
          e.blast_stars = 5;
        }
      }
      e.init = true;
    }

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

        if (gmlEq(e.difficulty, 3.3)) {
          e.image_xscale -= e.growspeed / 2;
          e.image_yscale -= e.growspeed / 2;
        }
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

        for (let i = 0; i < e.blast_stars; i++) {
          const d = spawn(state, pointingStarchild, { x: e.x, y: e.y });

          scrChildbulletCopy(d, e);
          d.image_angle = e.blast_dir[i];
          d.direction = e.blast_dir[i];
          let _scale = e.image_xscale * 0.5;
          _scale = Math.min(_scale, 1);
          d.image_xscale = _scale;
          d.image_yscale = _scale;
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

            if (gmlEq(e.difficulty, 3.1)) d.speed = 4.75;
            else d.speed = 4.5;

            if (e.split_blast) {
              if (i % 2 === 1) {
                d.speed = 1.5;
                d.lifetime = 30;
              } else {
                _scale += 0.35;
                d.image_xscale = _scale;
                d.image_yscale = _scale;
              }
            }
          }
        }

        e.burst = e.blast_stars;
        e.active = false;
      }
      if (e.timer >= 4) {
        destroy(e);
      }
    }
  },

  endStep(e, state) {

    let color = mergeColor(GRAY, KAIZO_TELEGRAPH_COLOR, clamp01(e.timer / 30));

    if (e.stay === 1) {
      e.growspeed = scrApproach(e.growspeed, 0, 0.0005);
      if (e.speed > 2.2) e.speed = scrApproach(e.speed, 2.2, 0.01);
      e.timer += 1;

      color = mergeColor(WHITE, KAIZO_TELEGRAPH_COLOR, clamp01(e.timer / 30));
    }

    e.image_blend = color;
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
