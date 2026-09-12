


import { spawn, destroy } from '../entity.js';
import { scrApproach, pointDirection, clamp } from '../gml.js';
import { gmlRandom, gmlIrandom } from '../rng.js';
import { scrBulletInit, regularbulletCreate, regularbulletStep, collidebulletOther15 } from '../bullets/regularbullet.js';
import { scrLerpvar } from '../lerpvar.js';
import { SWORDOL_MASK, enginePairHit } from '../masks.js';
import { chainNext, registerComboAttack } from './combination.js';
import { cue } from '../audio.js';


const MAX_OLD = 3;

export const fallingSword = {
  name: 'obj_fallingsword',

  create(e, state) {
    regularbulletCreate(e, state);
    e.sprite_index = 'spr_roaringknight_sword_ol';
    e.slowing = 30;
    e.damage = 206;
    e.element = 5;
    e.grazepoints = 12;
    e.image_yscale = 0;
    e.alarm[0] = 1;
    e.destroyonhit = 0;
    e.image_alpha = 0;
    e.timer = 0;
    e.nosfx = false;
    e.old_x = new Array(MAX_OLD).fill(e.x);
    e.old_y = new Array(MAX_OLD).fill(e.y);
    e.old_angle = new Array(MAX_OLD).fill(e.image_angle ?? 0);
    e.speed_gain = 0.4;
    e.finalsword = false;
    e.isBullet = true;
    e.builtinMotion = true;
  },

  alarm: {

    0(e) {
      e.alarm[2] = 16;
      if (e.finalsword) e.alarm[3] = 10;
    },
    2() {},
    3() {},
  },

  step(e, state) {
    regularbulletStep(e, state);
    tickDelayed(state, e);
    e.timer += 1;

    if (!e.nosfx) {

      if (e.timer === 3) cue(state, 'snd_knight_fallingsword', 1, 1);
      if (e.timer === 31 && e.finalsword) {
        cue(state, 'snd_knight_fallingsword_big', 1, 1);
      }
    } else if (e.timer === 1) {
      cue(state, 'snd_heavy_passing', 1, 1);
    }


    for (let i = MAX_OLD - 1; i > 0; i--) {
      e.old_x[i] = e.old_x[i - 1];
      e.old_y[i] = e.old_y[i - 1];
      e.old_angle[i] = e.old_angle[i - 1];
    }
    e.old_x[0] = e.x;
    e.old_y[0] = e.y;
    e.old_angle[0] = e.image_angle;


    if (!(e.alarm[0] > 0.5)) {
      e.speed = scrApproach(e.speed, 18, 0.6 + e.speed_gain * Math.sign(e.speed));
    }

    if (e.speed > 0.5 && e.finalsword) e.speed += 2.4;
  },

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, SWORDOL_MASK);
  },

  other15: collidebulletOther15,
};


function dropSword(state, e, box) {

  const y = box.y - 110 + gmlRandom(state.gmlRng, 30);
  const x = box.x - 110 + gmlRandom(state.gmlRng, 220);
  const s = spawn(state, fallingSword, { x, y });

  const tx = clamp(box.x + 95 - gmlRandom(state.gmlRng, 190), x - 40, x + 40);
  s.image_angle = pointDirection(x, y, tx, box.y + 110);
  s.direction = s.image_angle;
  s.speed = -4;

  scrLerpvar(state, spawn, s, 'image_yscale', 0, -1, 8);
  delayedLerp(state, s, 8, 'image_yscale', -1, 1, 8);
  scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
  scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
  return s;
}




function delayedLerp(state, target, delay, varname, from, to, dur, easetype, easeinout) {
  (target.pendingLerps ??= []).push({ delay, varname, from, to, dur, easetype, easeinout });
}


function tickDelayed(state, e) {
  if (!e.pendingLerps || !e.pendingLerps.length) return;
  for (const p of e.pendingLerps) p.delay -= 1;
  const due = e.pendingLerps.filter((p) => p.delay <= 0);
  e.pendingLerps = e.pendingLerps.filter((p) => p.delay > 0);
  for (const p of due) {
    scrLerpvar(state, spawn, e, p.varname, p.from, p.to, p.dur, p.easetype, p.easeinout);
  }
}





export function swordfallDestroy(e, state) {
  const closing =
    e.turn_type !== 'start' &&
    e.turn_type !== 'short start' &&
    e.turn_type !== 'short mid';
  if (!closing) return;
  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );
  if (knight) knight.image_alpha = 1;
  state.turntimer = -1;
}

const KNIGHT_IDLE_SPRITE_W = 117;
const KNIGHT_IDLE_SPRITE_H = 115;

export const knightSwordfall = {
  name: 'obj_knight_swordfall',

  create(e, state) {
    scrBulletInit(e);

    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_speed = 0;
    e.sprite_index = 'spr_roaringknight_idle';
    e.swordcount = 1;
    e.countdowner = 29;
    e.countdown = 45;
    e.turn_type = 'full';
    e.turn_time = 160;
    e.local_turntimer = 0;
    e.anchor_x = e.x;
    e.anchor_y = e.y;
    e.dip = 2;
    e.difficulty = 0;
    e.forcexfix = false;
    e._siner = 0;
    e.done = false;
  },



  init(e, state) {
    if (e.turn_type === 'short start' || e.turn_type === 'short mid') {
      const short = e.turn_type === 'short start';
      e.local_turntimer = short ? 70 : 80;
      e.countdowner = short ? 10 : 20;
      e.countdown = 2;
      e.turn_time = 40;
      e.sprite_index = 'spr_roaringknight_point_ol';
      scrLerpvar(state, spawn, e, 'image_index', 0, 4, 8);
      const box = boxOf(state);
      if (box) {
        const hw = (box.image_xscale ?? 2) * 37.5;
        const hh = (box.image_yscale ?? 2) * 37.5;
        scrLerpvar(state, spawn, e, 'x', e.x, box.x + hw + 60, 20, 1);
        scrLerpvar(state, spawn, e, 'y', e.y, box.y - 110, 20, 1);
      }
      return;
    }
    if (e.turn_type === 'short end') {
      e.local_turntimer = 214;
      e.countdowner = 10;
      e.countdown = 20;
      e.alarm[5] = 4;
      return;
    }
    e.local_turntimer = 324;
    e.alarm[5] = 4;
  },

  alarm: {

    0(e, state) {

      const spriteWidth = KNIGHT_IDLE_SPRITE_W * e.image_xscale;
      const spriteHeight = KNIGHT_IDLE_SPRITE_H * e.image_yscale;
      const s = spawn(state, fallingSword, {
        x: e.x + (spriteWidth * 0.5),
        y: (e.y + (spriteHeight * 0.5)) - 30,
      });
      s.alarm[0] = 1;
      s.image_angle = -90;
      s.direction = 90;
      s.speed = -4;
      s.old_angle = [-90, -90, -90];
      s.image_xscale = 1.5;
      s.image_alpha = 1;
      s.nosfx = true;

      scrLerpvar(state, spawn, s, 'image_xscale', 1.5, 2, 49, 1);

      scrLerpvar(state, spawn, s, 'image_yscale', 0, -3, 4, 1);
      delayedLerp(state, s, 4, 'image_yscale', -3, 0, 5, 1, 'in');
      delayedLerp(state, s, 9, 'image_yscale', 0, 2.5, 6, 1, 'out');
      delayedLerp(state, s, 15, 'image_yscale', 2.5, 0, 7, 1, 'in');
      delayedLerp(state, s, 22, 'image_yscale', 0, -2.25, 8, 1, 'out');
      delayedLerp(state, s, 30, 'image_yscale', -2.25, 0, 9, 1, 'in');
      delayedLerp(state, s, 39, 'image_yscale', 0, 2, 10, 1, 'out');
    },


    1(e, state) {
      const box = boxOf(state);

      const y = box.y - 110 + gmlRandom(state.gmlRng, 30);
      const x = box.x - 55 + gmlRandom(state.gmlRng, 110);
      const s = spawn(state, fallingSword, { x, y });
      s.image_angle = pointDirection(x, y, box.x, box.y);
      s.direction = s.image_angle;
      s.speed = -6;
      s.speed_gain = 0.3;
      s.image_xscale = 2;
      s.finalsword = true;
      s.grazepoints = 30;
      scrLerpvar(state, spawn, s, 'image_yscale', 0, -2, 8);
      delayedLerp(state, s, 8, 'image_yscale', -2, 2, 8);
      scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
      scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
    },


    2(e, state) {
      e.dip = 0;
      const k = state.entities.find((x) => x.alive && x.type.name === 'obj_knight_enemy');
      e.x = (k ? k.x : e.x) + 10;
      e.image_xscale = 2;
      e.sprite_index = 'spr_roaringknight_sword_ol';
      e.image_angle = -90;
      e.forcexfix = true;
      e.returnT = 0;
      e.alarm[4] = 26;
    },



    3(e, state) {
      chainNext(state, e);
      swordfallDestroy(e, state);
      destroy(e);
    },


    4(e, state) {
      if (state.knight) state.knight.siner2 = e._siner;
      e.done = true;
      swordfallDestroy(e, state);
      destroy(e);
    },


    5(e) {
      e.slideT = 0;
      e.slideFromX = e.x;
      e.alarm[0] = 8;
    },
  },

  step(e, state) {
    e.local_turntimer -= 1;

    if (state.knight) state.knight.siner2 = 0;


    if (e.slideT !== undefined && e.slideT < 8) {
      e.slideT += 1;
      const t = e.slideT / 8;
      const out = 1 - (1 - t) * (1 - t);
      e.image_xscale = 2 * (1 - out);
      e.x = e.slideFromX + 110 * out;
    }

    if (e.returnT !== undefined) {
      e.returnT += 1;
      if (e.returnT === 9) {
        e.sprite_index = 'spr_roaringknight_attack_ol_center';
        e.image_angle = 0;
        e.image_yscale = 2;
      }
    }


    if (e.alarm[0] > 0.5) return;

    e.countdown -= 1;
    if (e.countdown !== 0) return;


    const ex = e.difficulty === 1 ? 30 : 0;
    if (e.local_turntimer < e.turn_time - ex) {
      e.countdown = 99999;
      e.local_turntimer = 99999;

      if (e.turn_type !== 'start' && e.turn_type !== 'short start'
        && e.turn_type !== 'short mid') {
        e.alarm[1] = 8;
        e.alarm[2] = 60;
      } else {
        scrLerpvar(state, spawn, e, 'image_index', 4, 0, 8);
        e.alarm[3] = 4;
      }
      return;
    }

    dropSword(state, e, boxOf(state));


    if (e.difficulty === 0) {
      e.countdowner = scrApproach(e.countdowner, 5, 5);
      e.countdown = e.countdowner - gmlIrandom(state.gmlRng, 1);
    } else {
      e.countdowner = scrApproach(e.countdowner, 4, 5);
      e.countdown = e.countdowner;
    }
  },
};

function boxOf(state) {
  const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
  return gt ? { x: gt.x, y: gt.y } : { x: state.view.x + 320, y: state.view.y + 170 };
}


registerComboAttack(4, knightSwordfall);
