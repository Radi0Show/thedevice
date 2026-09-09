


import { spawn, destroy } from '../entity.js';
import { masksOverlap, HEART_MASK, HEART_RECT, PXWHITE2_MASK } from '../masks.js';
import { scrTensionheal } from '../tension.js';
import { gearOf } from '../damage.js';
import { partyWearing } from '../equipment.js';
import { clamp, lerp, lengthdirX, lengthdirY, mergeColor, WHITE, RED } from '../gml.js';
import { scrBulletInit, collidebulletOther15 } from '../bullets/regularbullet.js';
import { gmlChoose } from '../rng.js';
import { cue } from '../audio.js';
import { afterimageGrow } from '../fx.js';

const HEADINGS = [0, 45, 90, 135, 180, 225, 270, 315];



export const trackingSlashExtraGraze = {
  name: 'obj_tracking_sword_slash_extra_graze',

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.image_xscale = 900;
    e.image_yscale = 7;
    e.visible = false;
  },

  step(e, state) {

    if ((state.invAtFrameStart ?? state.invTimer) >= 0) return;
    const heart = state.soul;
    if (!heart) return;

    const overlaps = (sx, sy) => masksOverlap(
      HEART_RECT, sx, sy, PXWHITE2_MASK, e.x, e.y, 900, 7, e.image_angle,
    );
    const hx = state.grazePrev ? state.grazePrev.x - 10 : heart.x;
    const hy = state.grazePrev ? state.grazePrev.y - 10 : heart.y;
    const bandHit = overlaps(hx, hy);
    if (!bandHit) return;

    const loadout = gearOf(state);
    let tp = 1 + partyWearing(loadout, 15) * 0.1 + partyWearing(loadout, 24) * 0.05;
    let time = 1 + partyWearing(loadout, 14) * 0.1;
    if (tp > 3) tp = 3;
    if (time > 3) time = 3;

    const variant1 = state.entities.some(
      (m) => m.alive && m.type.name === 'obj_tracking_swords_manager' && m.variant === 1,
    );
    const vortex = state.entities.some(
      (m) => m.alive && m.type.name === 'obj_sword_vortex_manager',
    );
    scrTensionheal(state, (variant1 || vortex ? 4 : 7) * tp);
    if (state.turntimer >= 10) state.turntimer -= (1 / 30) * time;
    destroy(e);
  },
};



export const trackingSwordSlash = {
  name: 'obj_tracking_sword_slash',

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.image_xscale = 900;
    e.image_yscale = 1;
    scrBulletInit(e);
    e.active = 1;
    e.destroyonhit = 0;
    e.damage = 1;

    const vortex = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_sword_vortex_manager',
    );
    const variantOne = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_tracking_swords_manager' && x.variant === 1,
    );
    e.grazepoints = (vortex || variantOne) ? 2 : 4;
    e.timepoints = 11;
    e.sprite_index = 'spr_pxwhite2';
    e.isBullet = true;
  },


  endStep(e) {
    e.timer += 1;
    if (e.timer === 3) destroy(e);
  },

  other15: collidebulletOther15,
};

export const trackingSword = {
  name: 'obj_tracking_sword1',

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.afterimagecon = 0;
    e.targetx = 0;
    e.targety = 0;
    e.variant = 0;
    e.image_alpha = 0;
    scrBulletInit(e);
    e.element = 5;
    e.fadetohalftime = 5;
    e.waittime = 10;
    e.fadetofulltime = 20;
    e.flashtime = 4;
    e.len = 120;
    e.lenstart = e.len;
    e.sprite_index = 'spr_roaringknight_sword_ol';
    e.image_xscale = 1;
    e.image_yscale = 1;

    e.isBullet = true;
  },

  step(e, state) {
    const heart = state.soul;

    if (!heart) return;

    if (!heart) return;


    if (e.con < 2) {
      const aim = state.grazePrev ?? { x: heart.x + 10, y: heart.y + 10 };
      e.x = aim.x + lengthdirX(e.len, e.direction);
      e.y = clamp(
        aim.y + lengthdirY(e.len, e.direction),
        state.view.y + 40,
        state.view.y + 320,
      );
    }

    if (e.con === 0) {
      e.timer += 1;
      if (e.timer === 1) cue(state, 'snd_knight_jump_quick', 1.3);
      e.image_alpha = lerp(0, 0.5, e.timer / e.fadetohalftime);

      if (e.image_alpha === 0.5) {
        e.con = 1;
        e.timer = 0;
      }
    }

    if (globalThis.process?.env?.KNIGHT_TRACK_DEBUG) {
      const f = globalThis.__simFrame;
      const [a, b] = globalThis.process.env.KNIGHT_TRACK_DEBUG.split('-').map(Number);
      if (f >= a && f <= (b ?? a)) {
        console.error(`[trk] f=${f} seq=${e.seq} con=${e.con} timer=${e.timer}`
          + ` len=${e.len} dir=${e.direction} x=${e.x}`);
      }
    }
    if (e.con === 1) {
      e.timer += 1;
      if (e.timer >= e.waittime) {
        const t = (e.timer - e.waittime) / e.fadetofulltime;
        e.image_alpha = lerp(0.8, 1, t);

        e.image_blend = mergeColor(WHITE, RED, e.timer / 30);

        e.len = lerp(e.len, e.lenstart + 10, t);
      }
      if (e.image_alpha === 1) {
        e.con = 2;
        e.timer = 0;

        const a = spawn(state, afterimageGrow, { x: e.x, y: e.y });
        a.sprite_index = e.sprite_index;
        a.image_angle = e.image_angle;
        a.image_blend = e.image_blend;
        a.xrate = 0.2;
        a.yrate = 0.2;
        a.fade = 0.3;
      }
    }

    if (e.con === 2) {
      e.timer += 1;
      if (e.timer === e.flashtime + 1) {
        e.con = 3;
        e.timer = 0;
      }
    }

    if (e.con === 3) {
      e.timer += 1;
      if (e.timer === 1) {
        e.afterimagecon = 1;
        e.targetx = e.x + lengthdirX(900, e.direction + 180);
        e.targety = e.y + lengthdirY(900, e.direction + 180);
        cue(state, 'snd_knight_cut2', 1.3);
      }
      if (e.timer === 2) {
        const s = spawn(state, trackingSwordSlash, { x: e.x, y: e.y });
        s.image_angle = e.image_angle;
        s.direction = e.direction;
        s.damage = e.damage;
        const s2 = spawn(state, trackingSlashExtraGraze, { x: e.x, y: e.y });
        s2.image_angle = e.image_angle;
        s2.direction = e.direction;

      }
      if (e.timer === 5) destroy(e);
    }
  },

  other15: collidebulletOther15,



  beginStep(e) {
    if (e.afterimagecon === 1 || e.afterimagecon === 2) e.afterimagecon += 1;
  },
};

export const trackingSwordsManager = {
  name: 'obj_tracking_swords_manager',


  stepOrder: -0.1,

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.variant = 0;
    e.firstsword = false;
    e.multiswordmax = 0;
    e.multiswordframes = 0;
    e.multiswordcon = 0;
    e.multiswordcount = 0;
    e.setcount = 0;
    e.setdirection = new Array(50).fill(-1);

    e.isBullet = true;
    e.maskOff = true;
    scrBulletInit(e);
    e.swordcount = 0;
    e.directionprev = new Array(8).fill(-1);
    e.wheelNudges = 0;
  },


  init(e, state, chainedType = null) {
    if (e.variant === 0) {
      e.rate = 32;
      e.ratedecay = 4;
      e.rateminimum = 16;
      e.maxswords = 99;
      e.multiswordmax = 0;
    }
    if (e.variant === 1) {

      e.rate = 50;
      e.ratedecay = 10;
      e.rateminimum = 6;
      e.maxswords = 5;
      e.multiswordmax = 0;
      e.rate = 24;
      e.ratedecay = 0;
      e.rateminimum = 24;
      e.maxswords = 99;
      e.multiswordmax = 0;
    }
    if (e.variant === 2) {
      e.rate = 24;
      e.ratedecay = 0;
      e.rateminimum = 24;
      e.maxswords = 99;
      e.multiswordmax = 2;
      e.multiswordframes = 4;
      const set = [0, 45, 90, 135, 180, 225, 270, 315, 0, 45];
      for (let i = 0; i < set.length; i++) e.setdirection[i + 1] = set[i];
    }
    if (e.variant === 3) {
      e.rate = 20;
      e.ratedecay = 4;
      e.rateminimum = 13;
      e.maxswords = 99;
      e.multiswordmax = 0;
    }


    if (chainedType === 104 || chainedType === 154) {
      e.rate = chainedType === 104 ? 55 : 24;
      e.ratedecay = chainedType === 104 ? 0 : 4;
      e.rateminimum = chainedType === 104 ? 24 : 16;
      e.maxswords = 99;
      e.multiswordmax = 0;
      if (chainedType === 104) e.multiswordframes = 0;
    }
    for (const dc of state.entities) {
      if (!dc.alive || dc.type.name !== 'obj_dbulletcontroller') continue;
      if (dc.dcType === 104) {
        e.rate = 55;
        e.ratedecay = 0;
        e.rateminimum = 24;
        e.maxswords = 99;
        e.multiswordmax = 0;
        e.multiswordframes = 0;
      }
      if (dc.dcType === 154) {
        e.rate = 24;
        e.ratedecay = 4;
        e.rateminimum = 16;
        e.maxswords = 99;
        e.multiswordmax = 0;
      }
    }

    e.timer = e.rate - 5;
  },

  step(e, state) {

    if (state.turntimer < 70) return;

    e.timer += 1;
    const fire =
      (e.timer === e.rate && e.swordcount <= e.maxswords) ||
      (e.timer === e.multiswordframes && e.multiswordcon === 1);
    if (!fire) return;

    const inst = spawn(state, trackingSword, { x: e.x, y: e.y });


    const rolledHeading = state.gmlRng ? gmlChoose(state.gmlRng, HEADINGS) : null;
    inst.direction = state.swordDirections && state.swordIndex < state.swordDirections.length
      ? state.swordDirections[state.swordIndex++]
      : rolledHeading;
    inst.variant = e.variant;
    inst.damage = e.damage;


    if (!state.swordDirectionsPostWheel) {
      for (let r = 0; r < 8; r++) {
        for (let i = 0; i < 8; i++) {
          if (inst.direction === e.directionprev[i]) {
            inst.direction += 45;

            e.wheelNudges = (e.wheelNudges ?? 0) + 1;
          }
        }
      }
    }

    inst.image_angle = inst.direction + 180;
    e.directionprev[e.swordcount] = inst.direction;


    for (let i = 1; i < 4; i++) {
      let a = i + e.swordcount;
      if (a > 7) a -= 7;
      e.directionprev[a] = -1;
    }

    e.swordcount += 1;
    if (e.swordcount > e.maxswords && e.variant === 0) state.turntimer = 70;
    if (e.swordcount > e.maxswords && e.variant === 1) state.turntimer = 120;
    if (e.swordcount > 7 && e.swordcount < e.maxswords) e.swordcount = 0;

    e.setcount += 1;

    const setdir = e.setcount < 50 ? e.setdirection[e.setcount] : -1;
    if (setdir !== -1) inst.direction = setdir;

    if (e.multiswordmax > 0) e.multiswordcount += 1;
    if (e.multiswordcon === 0 && e.multiswordmax > 0) e.multiswordcon = 1;
    if (e.multiswordcon === 1 && e.multiswordcount === e.multiswordmax) {
      e.multiswordcon = 0;
      e.multiswordcount = 0;
    }


    const heart = state.soul;

    if (!heart) return;

    if (!heart) return;

    {
      const aim = state.grazePrev ?? { x: heart.x + 10, y: heart.y + 10 };
      inst.x = aim.x + lengthdirX(inst.len, inst.direction);
      inst.y = aim.y + lengthdirY(inst.len, inst.direction);
    }
    inst.ystart = inst.y;
    inst.image_angle = inst.direction + 180;

    e.rate -= e.ratedecay;
    if (e.rate < e.rateminimum) e.rate = e.rateminimum;
    e.timer = 0;
  },
};
