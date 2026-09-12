

import { spawn, destroy } from '../../sim/entity.js';
import { splitGrowtangleEffect } from '../../sim/fx.js';
import { cue } from '../../sim/audio.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { kaizoSideb } from './flurry-damage.js';

import { splitFlameMarker } from '../../sim/attacks/split-growtangle.js';
export { splitFlameMarker };
import { splitBullet } from './flurry-split-bullet.js';
import {
  scrEaseIn, scrEaseOut, scrMovetowards, inverselerp, sign,
  lengthdirX, lengthdirY, pointDirection, angleDifference, WHITE, GRAY,
} from '../../sim/gml.js';
import { gmlChoose, gmlRandomRange, gmlIrandomRange } from '../../sim/rng.js';

import { scrBulletInherit } from '../../sim/bullets/regularbullet.js';

function baseDepth(e) {
  return e.depth ?? 0;
}

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

function gtMiny(state) {
  const gt = box(state);
  return gt ? gt.y - (75 * gt.image_yscale) / 2 : 0;
}
function gtMaxy(state) {
  const gt = box(state);
  return gt ? gt.y + (75 * gt.image_yscale) / 2 : 0;
}

function eventUser1(e, state) {
  e.boxgone = true;
  const gt = box(state);
  if (!gt || gt.customBox) return;
  gt.visible = true;
  gt.x = gt.xstart;
  gt.y = gt.ystart;
  gt.customBox = true;
  gt.customBoxFromSplit = true;
  gt.growscale = 1;
}

function eventUser0(e) {
  e.timer = 0;
  e.con += 1;
}

export const splitGrowtangle = {
  name: 'obj_knight_split_growtangle',

  cleanUp(e, state) {
    eventUser1(e, state);
    if (e.markers) for (const m of e.markers) if (m && m.alive) destroy(m, state);
  },

  stepOrder: -0.5,

  create(e, state) {
    const gt = box(state);

    e.image_xscale = gt ? gt.image_xscale : 2;
    e.image_yscale = gt ? gt.image_yscale : 2;

    e.markers = [0, 1].map((i) => {
      const m = spawn(state, splitFlameMarker, {
        x: e.x + (i === 0 ? 2 : 0),
        y: e.y + (i === 0 ? -1 : 2),
      });
      m.sprite_index = 'spr_rk_split_flame_big';
      m.image_speed = 0.5;
      m.image_xscale = 2;
      m.image_yscale = 2;
      m.image_angle = i === 0 ? 180 : 0;
      m.image_blend = GRAY;
      m.depth = baseDepth(e) + 10;
      return m;
    });

    e.image_blend = gt ? gt.image_blend : WHITE;
    e.con = 0;
    e.timer = 0;
    e.distance = 0;
    e.old_distance = 0;
    if (gt) gt.visible = false;
    e.heart_y = 0;
    e.heart_x = 0;
    e.split_dist = 50;
    e.slow = 4;
    e.fast = 8;
    e.child_bullet = [];
    e.count = 0;
    e.flame_index = 0;
    e.split = false;
    e.vertical = false;
    e.diagonal = false;
    e.launch_force = 0;
    e.open_time = 45;
    e.boxgone = false;
    e.max_distance = 70;
    e.split_delay = 0;
    e.vshift = 0;
    e.hshift = 0;
    e.xoffset = 0;
    e.yoffset = 0;
    e.angle = 0;
    e.h_change = 0;
    e.v_change = 0;
    e.update_box = false;
    e.difficulty = 0;
    e.split_wait = 5;
    e.split_hold = 30;
    e.init = false;
    e.bullet_count = 13;
    e.bullet_range = 144;
    e.disable_on_close = true;
  },

  draw(e, state) {
    if (e.visible === false) return;
    const rng = state.gmlRng;
    const irr = () => (rng ? gmlIrandomRange(rng, -1, 1) : 0);
    const open = e.distance > 0;
    const xx = open ? irr() : 0;
    const yy = open ? irr() : 0;
    const xx2 = open ? irr() : 0;
    const yy2 = open ? irr() : 0;
    e.drawJitter = { xx, yy, xx2, yy2 };
    if (e.distance === 0) e.update_box = true;
    if (e.distance !== 0 && e.update_box) {
      const change = rng ? gmlChoose(rng, [-2, -1, 1, 2]) : 1;
      if (e.vertical) {
        e.drawDeviation = change - e.v_change;
        e.v_change = change;
      } else {
        e.drawDeviation = change - e.h_change;
        e.h_change = change;
      }
      e.update_box = false;
    }
  },

  step(e, state) {

    e.split_seen = e.split;

    if (!e.init) {
      if (e.difficulty === 2) {
        e.split_wait = 4;
        e.split_hold = 26;
      }

      if (e.difficulty === 5) {
        e.max_distance = 172;
        e.split_hold = 50;
        e.bullet_count = 14;
      }

      e.damage = 206;
      if (!kaizoSideb(state)) {
        if (e.difficulty === 2) e.damage = 155;
        if (e.difficulty === 5) e.damage = 135;
      }

      e.split_wait = 5;
      e.init = true;
    }

    if (e.con === 0) {
      e.con = 1;
    }
    e.timer += 1;
    e.old_distance = e.distance;

    if (e.con === 1) {

      if (e.timer <= 1) {
        const fx = spawn(state, splitGrowtangleEffect, { x: e.x, y: e.y });
        fx.angle = e.angle;
        fx.diagonal = e.diagonal;
        fx.xoffset = e.xoffset;
        fx.yoffset = e.yoffset;
        fx.vertical = e.vertical;
        fx.image_xscale = e.image_xscale;
        fx.image_yscale = e.image_yscale;
        fx.image_blend = e.image_blend;
        fx.sprite_index = e.sprite_index;

        fx.depth = baseDepth(e) - 100;
      }

      if (e.timer >= e.split_wait + e.split_delay) {
        if (e.disable_on_close) {
          for (const b of state.entities) {
            if (b.alive && b.type.name === 'obj_roaringknight_split_bullet') {

              scrLerpvar(state, spawn, b, 'image_alpha', 1, 0, 12);
              b.active = false;
            }
          }
          e.child_bullet = [];
          e.count = 0;
        }

        cue(state, 'snd_knight_boxbreak', 1.1);

        eventUser0(e);

        const heart = state.soul;

        if (!heart) return;
        if (e.diagonal) {
          const hd = pointDirection(
            e.x + e.xoffset, e.y + e.yoffset, heart.x + 10, heart.y + 10,
          );
          const cutNormal = (e.angle ?? 0) + (e.vertical ? 45 : -45);
          if (Math.abs(angleDifference(cutNormal, hd)) < 90) {
            e.heart_x = 1;
            e.heart_y = e.vertical ? -1 : 1;
          } else {
            e.heart_x = -1;
            e.heart_y = e.vertical ? 1 : -1;
          }
        } else {
          e.heart_x = heart.x + 10 < e.x + e.xoffset ? -1 : 1;
          e.heart_y = heart.y + 10 < e.y + e.yoffset ? -1 : 1;
        }

        if (e.split_delay > 0) cue(state, 'snd_chargeshot_fire', 0.5);
        cue(state, 'snd_chargeshot_fire');

        e.split_delay = 0;

        const range = e.bullet_range;
        let total = e.bullet_count;
        let odd = false;
        if (e.bullet_count % 2 === 1) {
          odd = true;
          total += 1;
        }
        let flip = gmlChoose(state.gmlRng, [true, false]);
        const trueangle = e.vertical ? e.angle + 90 : e.angle;
        const xrange = lengthdirX(range, trueangle);
        let yrange = lengthdirY(range, trueangle);
        const xshift = xrange / (total / 2 - 1);
        let yshift = yrange / (total / 2 - 1);
        let xstart = e.x - xrange / 2;
        let ystart = e.y - yrange / 2;
        let weight = 0;
        let direction = 0;

        let waves = 1;
        let wave = 0;
        let Ytype = 0;
        if (e.difficulty === 5) {
          Ytype = 1;
          waves = 2;
          yrange += 19.5;
          yshift += 3.25;
        }

        for (let w = 0; w < waves; w++) {
          const bulletoffset = e.bullet_count * wave;
          xstart = e.x - xrange / 2;
          ystart = e.y - yrange / 2;
          e.count = bulletoffset;
          for (let i = 0; i < e.bullet_count; i++) {
            if (!e.diagonal && i === total / 2) {
              xstart = e.x - xrange / 2;
              ystart = e.y - yrange / 2;
              if (odd) {
                xstart += xshift / 2;
                ystart += yshift / 2;
              }
              weight = 0;
              flip = !flip;
            }
            if (weight === 0) {
              weight = gmlChoose(state.gmlRng, [-2, -1, 1, 2]);
            }
            const speedClass = inverselerp(-1, 1, sign(-weight));

            let b;
            if (e.diagonal) {
              b = spawn(state, splitBullet, { x: e.x, y: e.y });
            } else if (Ytype === 0) {
              b = spawn(state, splitBullet, { x: xstart, y: ystart });
            } else {
              const height = gtMaxy(state) - gtMiny(state) - 8;
              const heightdif = height / Math.floor(e.bullet_count / 2);
              const bulY = i % (e.bullet_count / 2);
              const Yoff = bulY * heightdif;
              const bY = gtMiny(state) + 15 + Yoff;
              b = spawn(state, splitBullet, { x: xstart, y: bY });
            }

            b.image_speed = 0.5;
            b.depth = baseDepth(e) + 1;
            b.image_xscale = 2;
            b.image_yscale = 2;
            b.active = false;
            b.speed = 0;
            let tsp = [5, 2.85];
            if (kaizoSideb(state)) {

              b.speed = 0.5;
              tsp = [5, 3.35];
            }
            if (waves === 1) {

              b.friction = speedClass === 1 ? -0.3 : -0.15;
              const topspeed = speedClass === 1 ? tsp[0] : tsp[1];
              b.top_speed = topspeed + gmlRandomRange(state.gmlRng, -0.12, 0.12);
            } else if (waves >= 2) {

              let div = speedClass === 1 ? 0 : 1;
              const maxwave = waves * 2;
              div += wave * 2;
              const max = 10;
              const spd = max - (max / maxwave) * div;
              const topspeed = spd;
              b.friction = 0;
              b.top_speed = topspeed;
              b.depth = baseDepth(e) - 1;
              scrLerpvar(state, spawn, b, 'speed', 0, topspeed, 5);
              scrLerpvar(state, spawn, b, 'friction', 0, -0.36, 57);

              if (spd === 0) b.x = -9999;
            }

            if (e.diagonal) direction += 360 / e.bullet_count;
            else if (e.vertical) direction = flip ? 180 : 0;
            else direction = flip ? 90 : -90;

            b.direction = direction;
            b.image_angle = direction;
            scrBulletInherit(e, b);
            b.grazed = -1;
            e.child_bullet[e.count] = b;
            e.count += 1;

            if (Math.abs(weight) === 1) {
              weight = gmlChoose(state.gmlRng, [1, 2]) * sign(-weight);
            } else {
              weight = scrMovetowards(weight, 0, 1);
            }
            xstart += xshift;
            ystart += yshift;
          }

          wave += 1;
        }
      }
    }

    const hold = e.diagonal ? e.split_hold + 2 : e.split_hold;

    if (e.con === 2) {
      e.split = true;
      if (e.timer === 7) {
        for (let i = 0; i < e.count; i++) {
          const b = e.child_bullet[i];
          if (b && b.alive) {
            b.depth = baseDepth(e) - 10;
            b.active = true;
            b.grazed = 0;
          }
        }
      }
      if (e.timer <= hold / 2) {
        e.distance = scrEaseOut(e.timer / (e.split_hold / 2), 3) * e.max_distance;
        const heart = state.soul;

        if (!heart) return;
        if (e.diagonal) {
          heart.x += (e.distance - e.old_distance) * e.heart_x * 1;
          heart.y += (e.distance - e.old_distance) * e.heart_y * 1;
        } else if (e.vertical) {
          heart.x += (e.distance - e.old_distance) * e.heart_x * 1.25;
        } else {
          heart.y += (e.distance - e.old_distance) * e.heart_y * 1.25;
        }
      } else {
        eventUser0(e);
      }
    }

    if (e.con === 3) {
      e.distance = e.max_distance - scrEaseIn(e.timer / (e.split_hold / 2), 3) * e.max_distance;
      if (e.timer >= hold / 2) {
        if (e.vertical || e.diagonal) {
          e.vshift = gmlIrandomRange(state.gmlRng, -3, 3);
        } else {
          e.hshift = gmlIrandomRange(state.gmlRng, -3, 3);
        }
        if (e.diagonal) e.hshift = e.vshift;
        eventUser0(e);
      }
    }

    if (e.con === 4) {
      e.distance = scrMovetowards(e.distance, 0, 12);
      if (e.distance === 0) {

        e.con = -1;
        e.split = false;
        if (e.difficulty === 3) {
          if (e.split_wait > 3) e.split_wait -= 1;
          if (e.split_hold > 26) e.split_hold -= 2;
        } else {
          if (e.split_wait > 5) e.split_wait -= 1;
          if (e.split_hold > 30) e.split_hold -= 2;
        }

        cue(state, 'snd_locker');
      }
    }

    if (e.markers && e.markers.length === 2) {
      const [m0, m1] = e.markers;
      const d = Math.round(e.distance);
      if (e.diagonal) {
        m0.image_angle = e.vertical ? -45 : 225;
        m1.image_angle = e.vertical ? 135 : 45;
        const sq = Math.SQRT1_2 * d;
        m0.x = e.x - sq - 1 + e.xoffset;
        m1.x = e.x + sq + 3 + e.xoffset;
        m0.y = e.y - sq - 1 + e.yoffset;
        m1.y = e.y + sq + 3 + e.yoffset;
      } else if (e.vertical) {
        m0.image_angle = -90;
        m1.image_angle = 90;
        m0.x = e.x - d - 1 + e.xoffset;
        m1.x = e.x + d + 3 + e.xoffset;
        m0.y = e.y - 1 + e.yoffset;
        m1.y = e.y + 3 + e.yoffset;
      } else {
        m0.image_angle = 180;
        m1.image_angle = 0;
        m0.y = e.y - d - 1 + e.yoffset;
        m1.y = e.y + d + 3 + e.yoffset;
        m0.x = e.x - 1 + e.xoffset;
        m1.x = e.x + 3 + e.xoffset;
      }
    }

    const gt = box(state);
    if (gt) {
      if (e.distance > 0) gt.x = -9999;
      else gt.x = gt.xstart;
    }
  },

  endStep(e, state) {
    e.flame_index = (e.flame_index ?? 0) + 0.5;

    const heart = state.soul;
    if (!heart) return;
    const gt = box(state);
    if (!heart || !gt) return;

    let dist = Math.round(e.distance);
    if (e.con === 0) dist = 0;

    let sw = e.vertical ? dist : 0;
    let sh = e.vertical ? 0 : dist;
    if (e.diagonal) {
      sw = Math.sqrt(0.5) * dist;
      sh = Math.sqrt(0.5) * dist;
    }

    const tlx = gt.xstart - 70 - sw;
    const tly = gt.ystart - 70 - sh;
    const brx = gt.xstart + 52 + sw;
    const bry = gt.ystart + 52 + sh;

    const distChange = Math.sqrt(0.5) * (dist - Math.round(e.old_distance));
    let startX = 0;
    let startY = 0;
    if (e.diagonal && distChange !== 0) {
      startX = heart.x;
      startY = heart.y;
    }

    if (heart.x < tlx) heart.x = tlx;
    if (heart.x > brx) heart.x = brx;
    if (heart.y < tly) heart.y = tly;
    if (heart.y > bry) heart.y = bry;

    if (e.diagonal && distChange !== 0) {
      const cx = Math.max(-Math.abs(distChange), Math.min(Math.abs(distChange), heart.x - startX));
      const cy = Math.max(-Math.abs(distChange), Math.min(Math.abs(distChange), heart.y - startY));
      if (cx !== 0) {
        if (!e.vertical) heart.y += cx;
        else heart.y -= cx;
      }
      if (cy !== 0) {
        if (!e.vertical) heart.x += cy;
        else heart.x -= cy;
      }
    }

    heart.x = Math.round(heart.x);
    heart.y = Math.round(heart.y);
  },
};
