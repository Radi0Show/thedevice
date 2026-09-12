

import { spawn, destroy } from '../../sim/entity.js';
import {
  lengthdirX, lengthdirY, scrApproach, gmlEq, mergeColor, BLACK, GRAY,
} from '../../sim/gml.js';
import { gmlIrandomRange, gmlIrandom, gmlChoose, gmlRandomRange } from '../../sim/rng.js';
import { scrBulletInit, regularbulletCreate, regularbulletStep, collidebulletOther15 } from '../../sim/bullets/regularbullet.js';
import { SWORDOL_MASK, enginePairHit, masksOverlap } from '../../sim/masks.js';
import { kaizoMask } from '../data/masks.js';
import { getSwordcolor } from './kaizo-colors.js';
import { scrDamageSingle } from '../../sim/damage.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { scrAfterimage } from '../../sim/fx.js';
import { cue, cueSustain, cueTune, cueStop } from '../../sim/audio.js';

export { knightStreamline, streamDiamond } from '../../sim/attacks/knight-stream.js';
import { knightStreamline } from '../../sim/attacks/knight-stream.js';

function sideb(state) {
  return state.kaizo?.sideb ? 1 : 0;
}

export const FINALSLASH_MASK = {
  name: 'spr_roaringknight_finalslash_mask',
  w: 10,
  h: 10,
  originX: 5,
  originY: 5,
  bbox: [0, 0, 9, 9],
  px: Array.from({ length: 10 }, () => new Array(10).fill(true)),
};

function maskWithPx(m) {
  if (!m.px) m.px = m.rows.map((r) => Array.from(r, (c) => c === '1'));
  return m;
}

export const HEART_2PX_MASK = maskWithPx(kaizoMask('spr_dodgeheart_smaller_2px_mask'));

export function beamPlaceMeetingHeart(hb, heart) {
  return masksOverlap(
    HEART_2PX_MASK, heart.x, heart.y,
    FINALSLASH_MASK, hb.x, hb.y,
    hb.image_xscale ?? 1, hb.image_yscale ?? 1, hb.image_angle ?? 0,
  );
}

export const streamHitbox = {
  name: 'obj_bullet_stream_hitbox',

  create(e, state) {
    regularbulletCreate(e, state);
  },

  step: regularbulletStep,
};

export const streamSword = {
  name: 'obj_bullet_stream_sword',

  create(e, state) {
    regularbulletCreate(e, state);

    e.sprite_index = 'spr_roaringknight_sword_ol';

    e.visible = false;
    e.isBullet = true;
    e.builtinMotion = true;
  },

  step: regularbulletStep,

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, SWORDOL_MASK);
  },

  other15: collidebulletOther15,
};

export function bulletKnightStreamCleanUp(e, state) {
  if (e.hitbox && e.hitbox.alive) destroy(e.hitbox);

  if (e.lsnd !== -4) cueStop(state, 'snd_knight_laser');
}

export const bulletKnightStream = {
  name: 'obj_bullet_knight_stream',

  create(e, state) {

    scrBulletInit(e);
    e.active = false;
    e.x1 = e.x;
    e.y1 = e.y;
    e.x2 = e.x;
    e.y2 = e.y;
    e.width = 8;
    e.width_goal = 8;
    e.line_length = 0;
    e.timer = 0;
    e.can_do_slashes = true;

    e.depth = 0;

    const hb = spawn(state, streamHitbox, { x: e.x, y: e.y });
    e.hitbox = hb;
    e.lsnd = -4;
    hb.active = false;
    hb.sprite_index = 'spr_roaringknight_finalslash_mask';
    hb.visible = false;
    hb.destroyonhit = false;
    hb.wall_destroy = false;
    hb.damage = 62;
    hb.grazepoints = 1;
    hb.timepoints = 0;
    hb.image_xscale = 32;
    hb.image_yscale = 0;
    hb.image_angle = e.direction;
    hb.depth = 0;
    e.isBullet = true;
  },

  step(e, state) {
    e.timer += 1;
    if (e.timer === 20) {

      e.lsnd = 0.3;
      cueSustain(state, 'snd_knight_laser', 0.3, 0.6);
    }
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

    if (e.timer >= 20) {

      e.lsnd = e.lsnd - 0.01;
      cueTune(state, 'snd_knight_laser', e.lsnd);
      const _width = Math.min(e.width, 23);
      const hb = e.hitbox;

      if (hb && hb.alive) {
        hb.damage = 52;
        hb.visible = false;
        hb.image_alpha = 0;
        hb.depth = e.depth - 1;
        hb.image_xscale = 64;
        hb.image_yscale = _width / 10;
        hb.image_angle = e.direction;
        hb.target = 0;
        if (state.invTimer < 0) {

          const heart = state.soul;
          const heartPos = state.soulPrev ?? heart;
          if (heart && heart.alive && beamPlaceMeetingHeart(hb, heartPos)) {

            const hadShake = state.entities.some(
              (s) => s.alive && s.type.name === 'obj_shake',
            );

            scrDamageSingle(state, hb.damage, hb.target);

            collidebulletOther15(hb, state);
            if (!hadShake) {

              for (const s of state.entities) {
                if (s.alive && s.type.name === 'obj_shake') destroy(s);
              }
            }
            state.invTimer = 2;
          }
        }
      }

    }

    if (e.timer > 15 && e.timer % 4 === 0 && e.timer < 40 - sideb(state) * 3) {

      const mg = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_stream',
      );
      const _dist = mg.dist_diff;

      cueStop(state, 'snd_wing');
      cue(state, 'snd_wing', 1.25, 1);
      cue(state, 'snd_wing', 0.75, 1);
      cue(state, 'snd_wing', 0.5, 1);

      for (const side of [270, 90]) {
        for (let a = 1; a < 4; a++) {
          const b = spawn(state, streamSword, {
            x: e.x1 + lengthdirX(_dist * a, e.direction + side),
            y: e.y1 + lengthdirY(_dist * a, e.direction + side),
          });
          b.direction = e.direction + 180;
          b.speed = 15;

          b.timepoints = 0;
          b.grazepoints = 1;
          b.damage = 153;
          b.visible = false;

          b.image_angle = b.direction;

          b.image_blend = GRAY;
          b.friction = -0.8;
          b.destroyonhit = false;
        }
      }
    }

    if (e.timer === 50) {
      destroy(e);

      bulletKnightStreamCleanUp(e, state);
    }
  },

  endStep: knightStreamline.endStep,
};

function turnEndHandshake(e, state) {
  if (state.turntimer <= 16) {
    if (state.entities.some((b) => b.alive && b.type.name === 'obj_bullet_knight_stream')) {
      state.turntimer = 16;
    } else if (gmlEq(state.turntimer, 12)) {

      e.image_index = 0;
      e.imgtarget = -1;
      const knight = state.entities.find(
        (k) => k.alive && k.type.name === 'obj_knight_enemy',
      );

      if (knight) {
        scrLerpvar(state, spawn, e, 'x', e.x, knight.x, 11, 2, 'out');
        scrLerpvar(state, spawn, e, 'y', e.y, knight.y, 11, 2, 'out');
      }
    }
  }
}

export const knightStream = {
  name: 'obj_knight_stream',

  stepOrder: 0.75,

  create(e, state) {
    scrBulletInit(e);

    e.sprite_index = 'spr_roaringknight_attack_ol';
    e.depth = 0;

    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_speed = 0;

    e.slash_angle = 90 + gmlIrandomRange(state.gmlRng, -145, 145);
    e.timer = 0;
    e.fulltimer = 0;

    scrLerpvar(state, spawn, e, 'image_index', 0, 1, 10);
    e.imgtarget = -1;
    e.init = 0;
  },

  step(e, state) {
    e.timer += 1;
    e.fulltimer += 1;
    e.damage = 153;

    if (!e.init) {
      e.dist_diff = 54;
      e.time_diff = 3;
      e.slash_amt = 5;
      if (state.kaizo?.sideb) {
        e.dist_diff = 48;
        e.time_diff = 2;
      }
      e.init = 1;
    }

    if (e.imgtarget !== -1 && !gmlEq(e.image_index, e.imgtarget)) {
      e.image_index = scrApproach(e.image_index, e.imgtarget, 1);
    }

    if (e.timer === 20) {

      if (gmlEq(e.image_index, 1)) {
        e.imgtarget = 5;
      } else {
        e.imgtarget = 1;
      }
      e.image_index = 3;
      scrLerpvar(state, spawn, e, 'x', e.x,
        e.xstart + gmlRandomRange(state.gmlRng, -12, 12), 6, 2, 'out');
      scrLerpvar(state, spawn, e, 'y', e.y,
        e.ystart + gmlRandomRange(state.gmlRng, -48, 48), 6, 2, 'out');
      e.damage = 153;

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
      cue(state, 'snd_knight_cut');
    }

    for (let i = 0; i < e.slash_amt; i++) {
      if (e.timer === 22 + i * e.time_diff) {
        for (const beam of state.entities) {
          if (!beam.alive || beam.type.name !== 'obj_bullet_knight_stream') continue;
          if (!beam.can_do_slashes) continue;
          beam.damage = 153;
          for (const sign of [1, -1]) {
            const l = spawn(state, knightStreamline, {
              x: beam.x + sign * lengthdirX(e.dist_diff * i, beam.direction + 270),
              y: beam.y + sign * lengthdirY(e.dist_diff * i, beam.direction + 270),
            });
            l.direction = beam.direction;
            l.speed = 0;
          }
          if (i + 1 === e.slash_amt) beam.can_do_slashes = false;
        }
      }
    }

    if (e.timer === 45 - sideb(state) * 3 && state.turntimer > 16) {
      e.slash_angle += 25 + gmlIrandom(state.gmlRng, 25);
      if (e.slash_angle > 170) e.slash_angle -= 40;
      e.timer = 0;
    }

  },

  draw(e, state) {
    if (e.fulltimer % 2 === 0) {
      const fade = scrAfterimage(state, e);
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.speed = 3;
      fade.direction = 0;
      const knight = state.entities.find(
        (k) => k.alive && k.type.name === 'obj_knight_enemy',
      );
      fade.depth = (knight?.depth ?? 0) + 1;
    }
  },

  endStep(e, state) {
    turnEndHandshake(e, state);

    const _ds = mergeColor(getSwordcolor(state), BLACK, 0.5);
    for (const b of state.entities) {
      if (!b.alive || b.type.name !== 'obj_bullet_knight_stream') continue;
      b.image_blend = getSwordcolor(state);
      b.blend2 = _ds;
    }
  },
};
