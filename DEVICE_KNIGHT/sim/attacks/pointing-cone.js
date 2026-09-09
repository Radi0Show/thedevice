


import { scrMovetowards, scrEaseIn, scrEaseOut, lerp } from '../gml.js';
import { cue } from '../audio.js';
import { scrAfterimage } from '../fx.js';
import { gmlIrandom, gmlIrandomRange, gmlRandomRange } from '../rng.js';



function dragStep(e, state, gt, heart) {
  if (e.knockback !== 0) {
    const kb = scrEaseIn(e.knockback / 10, 5) * 10;
    e.gt_x -= kb;
    e.knockback = scrMovetowards(e.knockback, 0, 0.5);
    e.fakeGtXoff = gmlRandomRange(state.gmlRng, -1, 1) * (kb / 10);
    e.fakeGtYoff = gmlRandomRange(state.gmlRng, -1, 1) * (kb / 10);
  } else {
    e.gt_x -= e.angle / e.target_angle / 2;
    e.fakeGtXoff = gmlRandomRange(state.gmlRng, -1, 1) * (e.angle / e.target_angle);
    e.fakeGtYoff = gmlRandomRange(state.gmlRng, -1, 1) * (e.angle / e.target_angle);
  }

  if (gt) gt.x = Math.round(e.gt_x);
  if (gt && heart) heart.x = Math.min(heart.x, gtMaxX(gt) - 22);
}

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}


function gtMaxX(gt) {
  return gt.x + (gt.mask.w * gt.image_xscale) / 2;
}

export const pointingCone = {
  name: 'obj_knight_pointing_cone',

  stepOrder: -1,

  create(e, state) {

    {
      const k = state.entities.find((x) => x.alive && x.type.name === 'obj_knight_enemy');
      if (k) k.visible = false;
    }

    e.sprite_index = 'spr_roaringknight_point_ol';

    e.image_speed = 0;
    e.image_index = 0;
    e.image_number = 5;
    const gt = box(state);
    e.angle = 0;
    e.target_angle = 60;
    e.tween = 0;
    e.angle_lerp = 0;
    e.image_xscale = 2;
    e.image_yscale = 2;

    const knight = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_knight_enemy',
    );
    if (knight) {
      knight.visible = false;
      e.aetimer = knight.aetimer ?? 0;
    } else {
      e.aetimer = 0;
    }

    e.afterimage_spread = 0;

    e.yoff = 2 + gmlIrandom(state.gmlRng, 60);
    e.con = 0;
    e.difficulty = 0;

    e.timer = 1;
    e.timerb = 0;
    e.gt_x = gt ? gt.x : 320;
    e.knockback = 0;
    e.endtimer = 120;
    e.xstart = e.x;
    e.ystart = e.y;
  },

  step(e, state) {
    const gt = box(state);
    const heart = state.soul;

    if (!heart) return;
    e.timerb += 1;

    if (e.timerb === 3) {
      for (let i = 0; i < 3; i++) cue(state, 'snd_knight_drawpower', 1.3);
    }
    if (e.timerb === 120) {
      for (let i = 0; i < 3; i++) cue(state, 'snd_knight_star_explosion_close', 0.7, 2);
    }

    if (e.con === 4) {

      if (e.tween === 0) {
        e.con = 5;

        const kv = state.entities.find((x) => x.alive && x.type.name === 'obj_knight_enemy');
        if (kv) kv.visible = true;
      }
      const knight = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      if (knight) {
        e.x = lerp(e.x, knight.x, 0.15);
        e.y = lerp(e.y, knight.y, 0.15);
      }
    } else if (e.tween < 1) {
      e.tween = scrMovetowards(e.tween, 1, 0.05);
      const ease = scrEaseOut(e.tween, 4);
      if (gt) {
        e.x = lerp(e.xstart, gt.x + 115, ease);
        e.y = lerp(e.ystart, gt.y - 56, ease);
      }
    }


    if (e.con < 2) return;

    if (state.turntimer <= e.endtimer) {

      if (e.angle_lerp === 1) {

        const list = state.entities
          .filter((s) => s.alive && s.type.name === 'obj_knight_pointing_star')
          .reverse();
        let count = 0;
        for (const s of list) {
          s.con = 1;
          s.timer = -count;
          count += 1;
        }
        e.knockback = 10;
      }


      if (e.angle_lerp === 0 && e.con < 3) {
        e.timer = 10;
        e.con = 3;

        e.yoff = 120 + gmlIrandomRange(state.gmlRng, -60, 60);
      }
      e.angle_lerp = scrMovetowards(e.angle_lerp, 0, 0.1);
      e.angle = lerp(0, e.target_angle, scrEaseIn(e.angle_lerp, 6));
    } else if (e.angle < e.target_angle) {

      e.angle_lerp = scrMovetowards(e.angle_lerp, 1, 0.025);
      e.angle = lerp(0, e.target_angle, scrEaseOut(e.angle_lerp, 6));
    } else {
      e.x += 0.25;
    }

    dragStep(e, state, gt, heart);
  },


  endStep(e, state) {

    e.aetimer += 1;
    if (e.con <= 4 && e.aetimer % 4 === 0) {
      const ai = scrAfterimage(state, e);
      ai.image_alpha = 0.6;
      ai.fadeSpeed = 0.02;
      ai.builtinMotion = true;
      ai.speed = 2 + e.afterimage_spread / 30;
      ai.direction = (Math.sin(e.aetimer) * e.angle) / 2;
      const knight = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      ai.depth = (knight ? knight.depth : 88) + 1;
      if (e.con === 4) e.afterimage_spread = scrMovetowards(e.afterimage_spread, 0, 20);
      if (e.con >= 1) e.afterimage_spread += 1;
    }


    const last = (e.image_number ?? 5) - 1;
    if (e.con >= 3) {
      if (e.image_index === last) e.image_index -= 1;
      else if (e.image_index > 0) e.image_index -= 0.25;
    } else if (e.image_index < last) {
      e.image_index += 0.5;
    }

    if (e.con <= 1) {
      if (e.con === 0) e.con = 1;
      e.timer += 1;
      if (e.timer >= 30) {

        cue(state, 'snd_rocket_long', 0.6);
        e.timer = 0;
        e.con = 2;
      }
    }


    if (e.con === 3 && e.timer > 0) {
      e.timer -= 1;
      if (e.timer === 0) e.con = 4;
    }
  },
};
