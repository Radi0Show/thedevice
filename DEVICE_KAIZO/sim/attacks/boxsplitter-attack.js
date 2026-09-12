


import { scrAfterimage } from '../fx.js';
import { spawn, destroy } from '../entity.js';
import { scrApproach, scrMovetowards, lerp, sign } from '../gml.js';
import { splitslash } from './splitslash.js';
import { gmlIrandom } from '../rng.js';

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

export const boxsplitterAttack = {
  name: 'obj_roaringknight_boxsplitter_attack',


  stepOrder: 0.25,

  create(e, state) {
    e.spawn_speed = 40;
    e.spawn_range = 4;
    e.min_angle = 145;
    e.max_angle = 215;
    e.timer = 200;
    e.slash_count = 0;
    e.image_alpha = 1;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_speed = 0;
    e.image_index = 1;
    e.animtimer = 5;


    e.sprite_index = 'spr_roaringknight_attack_ol';
    e.depth = 2;
    e.count = 3;
    e.aetimer = 0;
    e.recoil = 0;
    e.final_slash_anim = false;
    e.slash_anim_count = 0;
    e.flip = false;
    e.flipped = -1;
    e.forward = 0;
    e.flip_mode = true;
    e.turn_segment = -1;
    e.local_turntimer = 330;
    e.next_up = -1;
    e.next_next_up = -1;
    e.auto = true;
    e.splitbox = -4;
    e.anchor_x = e.x;
    e.anchor_y = e.y;
    e.done = false;
    e.omae_wa_con = 0;
    e.omae_wa_timer = 0;
    e.vertical = false;
    e.difficulty = 2;
    e.init = false;
    e.force_swap = -1;
    e.first_vertical = false;
    e.diagonal = false;
    e.force_oneside = e.difficulty0Force ?? gmlIrandom(state.gmlRng, 1);


    e.splitterRef = null;
  },



  init() {},

  step(e, state) {
    e.local_turntimer -= 1;

    if (!e.init) {
      if (e.difficulty === 0) {
        e.spawn_speed = 50;
      } else if (e.difficulty === 1) {
        e.spawn_speed = 46;

        e.force_swap = e.force_swap > 0 ? e.force_swap : gmlIrandom(state.gmlRng, 2) + 1;
      } else if (e.difficulty === 2) {
        e.spawn_speed = 31;
      }
      e.init = true;

      e.vertical = e.initVertical ?? gmlIrandom(state.gmlRng, 1);
    }

    if (!e.auto) return;


    if (e.image_alpha === 1) {
      if (e.animtimer < 4) e.animtimer += 1;
      else if (e.image_index === 1 || e.image_index === 4) e.image_index += 1;
    }

    if (e.local_turntimer <= 30) {

      if (e.local_turntimer <= 10 && e.sprite_index !== 'spr_roaringknight_idle') {
        if (e.image_xscale < 0) e.x -= 220;
        e.image_xscale = Math.abs(e.image_xscale);
        e.sprite_index = 'spr_roaringknight_idle';
        e.image_index = 0;
      } else if (e.local_turntimer < 22 && e.image_xscale < 0) {
        e.image_index = 4;
      }

      const knight = state.entities.find((x) => x.alive && x.type.name === 'obj_knight_enemy');
      if (knight && e.x < knight.x) e.x += 1;
      let lt = e.local_turntimer;
      if (lt < 0) lt = 0;
      if (knight) e.y = lerp(e.y, knight.y, (50 - lt) / 50);

      const splitter = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_split_growtangle',
      );
      if (e.local_turntimer < 0 && !(splitter && splitter.split)) {
        state.turntimer = 0;
        destroy(e);
      }
      return;
    }

    e.timer += 1;
    if (e.timer >= e.spawn_speed) {
      e.timer = 0;


      e.vertical = state.splitterVerticals
        ? state.splitterVerticals[state.splitterVIndex++]
        : gmlIrandom(state.gmlRng, 1);

      if (e.difficulty === 0 && !state.splitterVerticals) e.vertical = e.force_oneside;

      const at = e.splitterRef && e.splitterRef.alive ? e.splitterRef : box(state);
      const s = spawn(state, splitslash, { x: at ? at.x : e.x, y: at ? at.y : e.y });
      s.vertical = e.vertical;
      if (e.difficulty === 3) {
        s.diagonal = e.diagonal;
        if (e.diagonal) {
          e.timer = -4;
          e.diagonal = false;
        } else {
          e.diagonal = state.splitterDiagonals
            ? state.splitterDiagonals[state.splitterDIndex++]
            : gmlIrandom(state.gmlRng, 1);
        }
      }

      e.slash_count += 1;
      if (e.difficulty <= 2 && e.spawn_speed > 40) {
        e.spawn_speed = scrMovetowards(e.spawn_speed, 40, 3);
      }
      e.spawn_range = scrApproach(e.spawn_range, 60, 3);
    }
  },



  endStep(e, state) {
    if (e.image_alpha !== 1) return;
    e.aetimer += 1;
    if (e.aetimer % 4 !== 0) return;

    const gt = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_growtangle',
    );
    const fade = scrAfterimage(state, e);
    fade.image_alpha = 0.6;
    fade.fadeSpeed = 0.02;

    const dir = sign(e.x - (gt ? gt.x : e.x));
    fade.speed = Math.abs(2 * dir);
    fade.direction = dir < 0 ? 180 : 0;
    fade.depth = e.depth + (gt && e.x < gt.x ? 50 : 100);
  },
};
