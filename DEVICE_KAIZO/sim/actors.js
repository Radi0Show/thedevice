import { spawn } from './entity.js';
import { afterimage } from './fx.js';





export const knightActor = {
  name: 'obj_knight_enemy',



  endStep(e, state) {

    {
      const kb = state.knight;

      if (kb && kb.chargeupcon === 2) {
        kb.chargeuptimer = (kb.chargeuptimer ?? 0) + 1;
        if (kb.chargeuptimer === 10) {
          kb.chargeupcon = 3;
          e.image_alpha = 0;
          e.fog = false;
        }
        return;
      }

    }
    if (state.currentAc !== 0) return;
    if (!state.soul || !state.soul.alive) return;
    if (state.soul.x > state.view.x + 165) state.soul.x = state.view.x + 165;
  },
  create(e) {
    e.sprite_index = 'spr_roaringknight_idle';
    e.image_index = 0;
    e.image_speed = 0;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_alpha = 1;
    e.depth = 88;

    e.siner2 = 1;
    e.aetimer = 0;
    e.ystart = KNIGHT.ystart;
    e.isActor = true;
  },

  draw(e, state) {
    const kb = state.knight;
    if (e.visible !== false
      && !state.entities.some((x) => x.alive && x.type.name === 'obj_knight_roaring2')) {
      e.siner2 += 1;
    }
    const drawRuns = kb
      && e.visible !== false
      && kb.chargeupcon !== 2
      && !state.entities.some(
        (x) => x.alive && x.type.name === 'obj_knight_swordtunnelanim',
      );
    if (drawRuns && (kb.animState === 0 || kb.animState === 3)) {
      e.y = e.ystart + Math.cos(e.siner2 / 8) * 8;
    }
  },
  step(e, state) {
    const k = state.knight;
    const roaring = state.entities.some(
      (x) => x.alive && x.type.name === 'obj_knight_roaring2',
    );





    if (k) {

      const drawRuns = e.visible !== false
        && k.chargeupcon !== 2
        && !state.entities.some(
          (x) => x.alive && x.type.name === 'obj_knight_swordtunnelanim',
        );
      if (drawRuns) {
        if (!k.becomeflash) k.flash = 0;
        k.becomeflash = 0;
      }

      const selecting = !!(state.menu?.open
        && (state.menu.submenu === 'enemy'
          || state.menu.submenu === 'actpick'
          || state.menu.submenu === 'actgrid'));
      if (selecting) {
        if (!k.flash) k.fsiner = 0;
        k.flash = 1;
        k.becomeflash = 1;
      }

      if (drawRuns && k.animState === 0) {
        k.fsiner = (k.fsiner ?? 0) + 1;

        k.siner = (k.siner ?? 0) + (1 / 6);
      }
    }


    if (state.entities.some(
      (x) => x.alive && x.type.name === 'obj_knight_swordtunnelanim',
    )) return;


    const posed = !!k && k.animState !== 0 && k.animState !== 3;
    if (!posed) e.x = KNIGHT.x;


    if (state.pacifyFail) {
      const pf = state.pacifyFail;
      const merge = (a, b, amt) => {
        const ch = (v, n) => (v >> n) & 255;
        const mix = (n) => Math.round(ch(a, n) + (ch(b, n) - ch(a, n)) * amt) & 255;
        return mix(0) | (mix(8) << 8) | (mix(16) << 16);
      };
      const C_BLUE = 16711680;
      const C_WHITE = 16777215;
      if (pf.con === 6) {
        e.image_blend = merge(e.image_blend ?? C_WHITE, C_BLUE, 0.12);
        pf.alarm -= 1;
        if (pf.alarm <= 0) { pf.con = 8; pf.alarm = 8; }
      } else if (pf.con === 8) {
        e.image_blend = merge(e.image_blend ?? C_WHITE, C_WHITE, 0.16);
        pf.alarm -= 1;
        if (pf.alarm <= 0) { e.image_blend = C_WHITE; state.pacifyFail = null; }
      }
    }

    const strobeMod = k?.endCutscene > 0 ? 3 : 2;
    const strobing = k?.animState === 3 && k.stronghurtanim
      && (k.hurttimer % strobeMod) !== 0;

    if (k?.chargeupcon === 2) {

      e.sprite_index = 'spr_roaringknight_idle';
      e.image_index = 0;
      e.fog = true;
      e.image_alpha = (10 - k.chargeuptimer) / 10;

      return;
    }
    e.fog = false;


    if (!posed) {
      if (k?.blockanim) {
        e.sprite_index = 'spr_roaringknight_block_ol';
      } else if (strobing) {
        e.sprite_index = 'spr_roaringknight_ball_transition';
        e.image_index = 7;
      } else {
        e.sprite_index = 'spr_roaringknight_idle';
      }
    }


    if (k && k.animState !== 0 && k.animState !== 3) return;
    e.y = e.ystart + Math.cos(e.siner2 / 8) * 8;
    e.aetimer += 1;
    if (e.aetimer % 4 !== 0) return;

    if (!e.image_alpha || e.visible === false) return;

    if (k?.chargeupcon) return;

    if (roaring && (k?.animState ?? 0) === 0) return;

    const a = spawn(state, afterimage, { x: e.x, y: e.y });

    if (k?.animState === 3 && k.stronghurtanim && k.hurttimer % 2 !== 0) {
      a.sprite_index = 'spr_roaringknight_ball_transition';
      a.image_index = 7;
    } else {
      a.sprite_index = 'spr_roaringknight_idle';
      a.image_index = e.image_index;
    }
    a.image_alpha = 0.6;
    a.fadeSpeed = 0.02;
    a.image_speed = 0;
    a.image_xscale = e.image_xscale;
    a.image_yscale = e.image_yscale;
    a.depth = e.depth + 1;

    a.componentMotion = true;
    a.hspeed = 2;
    a.vspeed = 0;
  },
};


export const partyActor = {
  name: 'actor_party',
  create(e) {
    e.image_index = 0;

    e.image_speed = 0;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.image_alpha = 1;
    e.isActor = true;
  },
  step(e, state) {

    e.visible = !(e.slot === 1 && state.rude?.anim);
    const h = state.heroes?.[e.slot];
    if (!h || !h.sprite) return;
    e.sprite_index = h.sprite;

    const n = state.spriteFrames?.[h.sprite] ?? 0;
    e.image_index = n > 1 ? ((h.index % n) + n) % n : 0;
  },
};

export const PARTY = [
  { sprite: 'spr_krisb_idle', x: 126, y: 104, depth: 200 },
  { sprite: 'spr_susieb_idle', x: 80, y: 142, depth: 180 },
  { sprite: 'spr_ralsei_idle', x: 58, y: 190, depth: 160 },
];

export const KNIGHT = { x: 425, ystart: 78 };


export const BOX = { x: 320, y: 170 };



export const SOUL_START = { x: 314, y: 162 };
