

import { spawn, destroy } from '../../sim/entity.js';

import { swordfallDestroy } from '../../sim/attacks/swordfall.js';
import { scrApproach, pointDirection, clamp, gmlEq, gmlRound, WHITE, gmlLt } from '../../sim/gml.js';
import { gmlRandom, gmlIrandom, gmlIrandomRange } from '../../sim/rng.js';
import { scrBulletInit, regularbulletCreate, regularbulletStep, collidebulletOther15 } from '../../sim/bullets/regularbullet.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { SWORDOL_MASK, enginePairHit } from '../../sim/masks.js';
import { kaizoMask } from '../data/masks.js';
import { getSwordcolor } from './kaizo-colors.js';
import { chainNext } from '../../sim/attacks/combination.js';
import { cue } from '../../sim/audio.js';

const MAX_OLD = 3;

function maskWithPx(m) {
  if (!m.px) m.px = m.rows.map((r) => Array.from(r, (c) => c === '1'));
  return m;
}

export const KAIZO_HEART_2PX_MASK = maskWithPx(
  kaizoMask('spr_dodgeheart_smaller_2px_mask'),
);

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

    e.speed_max = 18;
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

    if (e.alarm[0] === -1) {
      let _gain = e.speed_gain;

      if (gmlLt(e.speed, 0)) _gain = 0.4;
      e.speed = scrApproach(e.speed, e.speed_max, 0.6 + _gain * Math.sign(e.speed));
    }

    if (e.speed > 0.5 && e.finalsword) e.speed += 2.4;
  },

  endStep(e, state) {
    e.image_blend = getSwordcolor(state);
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

  if (e.difficulty === 11) {
    s.x = state.soul.x + 10 + gmlIrandomRange(state.gmlRng, -24, 24);
  }

  if (e.difficulty === 5) {
    s.x = state.soul.xstart + 10 + gmlIrandomRange(state.gmlRng, -100, 100);
  }

  if (e.difficulty === 11) {

    s.image_angle = pointDirection(s.x, s.y, state.soul.x + 10, state.soul.y + 10);
  } else {

    const tx = clamp(box.x + 95 - gmlRandom(state.gmlRng, 190), s.x - 20, s.x + 20);
    s.image_angle = pointDirection(s.x, s.y, tx, box.y + 110);
  }
  if (e.difficulty === 5) {

    s.image_angle = 270;
    s.speed_gain = 2;
    s.speed_max = 36;
  }
  s.direction = s.image_angle;
  s.speed = -4;

  scrLerpvar(state, spawn, s, 'image_yscale', 0, -1, 8);

  delayedLerp(state, s, 8 - 1, 'image_yscale', -1, 1, 8);
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

function getBox(state, which) {
  const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
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

const KNIGHT_IDLE_SPRITE_W = 117;
const KNIGHT_IDLE_SPRITE_H = 115;

export const knightSwordfall = {
  name: 'obj_knight_swordfall',

  destroyEvent: swordfallDestroy,

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

    e.element = 5;
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
      if (e.difficulty === 0) {

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
      }
      if (e.difficulty === 1) {

        {

          const y = box.y - 110 + gmlRandom(state.gmlRng, 30);
          const x = box.x + 55 - gmlRandom(state.gmlRng, 40);
          const s = spawn(state, fallingSword, { x, y });

          s.image_angle = pointDirection(s.x, s.y, box.x, box.y);
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
        }
        {

          const y = box.y - 110 + gmlRandom(state.gmlRng, 30);
          const x = box.x - 55 + gmlRandom(state.gmlRng, 40);
          const s = spawn(state, fallingSword, { x, y });

          s.image_angle = pointDirection(s.x, s.y, box.x, box.y);
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
        }
      }
      if (e.difficulty === 10) {

        {
          const x = getBox(state, 2) - 80;
          const y = getBox(state, 1) + 40;
          const s = spawn(state, fallingSword, { x, y });
          s.image_angle = pointDirection(s.x, s.y, getBox(state, 4), getBox(state, 5) + 36);
          s.direction = s.image_angle;
          s.speed = -6;
          s.speed_gain = 0.3;
          s.image_xscale = 2;
          scrLerpvar(state, spawn, s, 'image_yscale', 0, -2, 8);
          delayedLerp(state, s, 8, 'image_yscale', -2, 2, 8);
          scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
          scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
          s.finalsword = true;
          s.grazepoints = 30;
        }
        {
          const x = getBox(state, 0) + 80;
          const y = getBox(state, 1) + 40;
          const s = spawn(state, fallingSword, { x, y });
          s.image_angle = pointDirection(s.x, s.y, getBox(state, 4), getBox(state, 5) + 36);
          s.direction = s.image_angle;
          s.speed = -6;
          s.speed_gain = 0.3;
          s.image_xscale = 2;
          scrLerpvar(state, spawn, s, 'image_yscale', 0, -2, 8);
          delayedLerp(state, s, 8, 'image_yscale', -2, 2, 8);
          scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
          scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
          s.finalsword = true;
          s.grazepoints = 30;
        }
      }
      if (e.difficulty === 11) {

        const y = box.y - 110 + gmlRandom(state.gmlRng, 30);
        const x = box.x - 55 + gmlRandom(state.gmlRng, 110);
        const s = spawn(state, fallingSword, { x, y });
        s.x = state.soul.x + 10 + gmlIrandomRange(state.gmlRng, -48, 48);
        s.image_angle = pointDirection(s.x, s.y, state.soul.x + 10, state.soul.y + 10);
        s.direction = s.image_angle;
        s.speed = -6;
        s.speed_gain = 0.3;
        s.image_xscale = 2;
        scrLerpvar(state, spawn, s, 'image_yscale', 0, -2, 8);
        delayedLerp(state, s, 8, 'image_yscale', -2, 2, 8);
        scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
        scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
        s.finalsword = true;
        s.grazepoints = 30;
      }
      if (e.difficulty === 5) {

        const y = box.y - 110 + gmlRandom(state.gmlRng, 30);
        const x = box.x - 110 + gmlRandom(state.gmlRng, 220);
        const s = spawn(state, fallingSword, { x, y });
        s.x = state.soul.xstart + 10 + gmlIrandomRange(state.gmlRng, -100, 100);

        s.image_angle = 270;
        s.speed_gain = 2;
        s.speed_max = 36;
        s.direction = s.image_angle;
        s.speed = -4;
        scrLerpvar(state, spawn, s, 'image_yscale', 0, -1, 8);
        delayedLerp(state, s, 8, 'image_yscale', -1, 1, 8);
        scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
        scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
      }
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
      chainNext(state, e, 'swordfall_alarm3');
      destroy(e, state);
    },

    4(e, state) {
      if (state.knight) state.knight.siner2 = e._siner;
      e.done = true;
      destroy(e, state);
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

    if (state.soul) state.soul.mask = KAIZO_HEART_2PX_MASK;

    if (state.frame % 4 === 0 && e.sprite_index !== 'spr_roaringknight_sword_ol'
      && (e.image_alpha ?? 1) !== 0
      && !(e.alarm[5] > 0.5) && !(e.alarm[2] > 0.5)) {
      e.image_blend = WHITE;
    }

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

    if (gmlEq(state.currentAc, 102)) {
      if (e.local_turntimer < 120) {
        for (const c of state.entities) {
          if (c.alive && c.type.name === 'obj_knight_weird_circle') {
            c.alarm[0] = 999;
            c.alarm[1] = 999;
          }
        }
      }
    }

    if (e.alarm[0] > 0.5) return;

    e.countdown -= 1;
    if (e.countdown !== 0) return;

    let ex = 0;
    if (e.difficulty === 1) ex = 30;
    if (e.difficulty === 5) ex = 75;
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

    if (e.difficulty === 10) {

      let _swinc = 0.125;
      if (state.kaizo?.sideb) _swinc = 0.08;
      if (e.sword_xp === undefined) {
        e.sword_xp = -_swinc;
        e.sword_dr = 1;
      }
      const _boxR = state.soul.xstart + 150;
      const _boxL = state.soul.xstart - 150;
      const _boxT = getBox(state, 1) - 20;
      const _gtw = _boxR - _boxL;
      let _swx = _boxL + _gtw * e.sword_xp;
      const _swy = _boxT;
      {
        const s = spawn(state, fallingSword, { x: _swx, y: _swy });
        s.image_angle = 270 + 15 * e.sword_dr;
        s.direction = s.image_angle;
        s.speed = -4;
        scrLerpvar(state, spawn, s, 'image_yscale', 0, -1, 8);

        delayedLerp(state, s, 8 - 1, 'image_yscale', -1, 1, 8);
        scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
        scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
      }
      _swx = _boxR - _gtw * e.sword_xp;
      {
        const s = spawn(state, fallingSword, { x: _swx, y: _swy });
        s.image_angle = 270 + 15 * -e.sword_dr;
        s.direction = s.image_angle;
        s.speed = -4;
        scrLerpvar(state, spawn, s, 'image_yscale', 0, -1, 8);
        delayedLerp(state, s, 8 - 1, 'image_yscale', -1, 1, 8);
        scrLerpvar(state, spawn, s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1);
        scrLerpvar(state, spawn, s, 'image_alpha', 0, 1, 16, 1);
      }
      e.sword_xp += _swinc * 2 * e.sword_dr;
      if (e.sword_xp > 1 || e.sword_xp < 0) {
        e.sword_xp += _swinc;
        e.sword_dr = -e.sword_dr;
      }
    } else {
      dropSword(state, e, boxOf(state));
    }

    if (e.difficulty === 5) {

      if (e.countdowner > 14) {
        e.countdowner = 14;
      }
      e.countdowner = scrApproach(e.countdowner, 8, 0.4);
      e.countdown = gmlRound(e.countdowner - gmlIrandom(state.gmlRng, 1));
    }
    if (e.difficulty === 0) {
      e.countdowner = scrApproach(e.countdowner, 5, 5);
      e.countdown = e.countdowner - gmlIrandom(state.gmlRng, 1);
    }
    if (e.difficulty === 1) {
      e.countdowner = scrApproach(e.countdowner, 4, 5);
      e.countdown = e.countdowner;
    }
    if (e.difficulty === 10) {

      e.countdown = 12 - (state.kaizo?.sideb ? 1 : 0) * 3;
    }
    if (e.difficulty === 11) {

      e.countdowner = scrApproach(e.countdowner, 8, 4);
      e.countdown = e.countdowner;
    }
  },

  endStep(e, state) {
    if (e.sprite_index === 'spr_roaringknight_sword_ol') {
      e.image_blend = getSwordcolor(state);
    }
  },

  draw(e) {
    if (e.visible === false) return;
    if (e.forcexfix && e.sprite_index === 'spr_roaringknight_attack_ol_center') {
      e._siner += 1;
    }
  },
};

function boxOf(state) {
  const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
  return gt ? { x: gt.x, y: gt.y } : { x: state.view.x + 320, y: state.view.y + 170 };
}

