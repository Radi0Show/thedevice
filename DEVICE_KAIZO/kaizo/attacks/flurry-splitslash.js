

import { spawn, destroy } from '../../sim/entity.js';
import { kaizoScrDamageMaxhp, kaizoSideb } from './flurry-damage.js';
import {
  clamp01, lerp, lengthdirX, lengthdirY, scrEaseOut, sign,
  mergeColor, BLACK, WHITE,
} from '../../sim/gml.js';

import { KAIZO_TELEGRAPH_COLOR } from './kaizo-colors.js';
import { scrBulletInit, scrBulletInherit } from '../../sim/bullets/regularbullet.js';

import { scrDarkMarker } from '../../sim/attacks/splitslash.js';
import { QUICKSLASH_SHAPE, scrPreciseHitRotatedRect } from '../../sim/masks.js';
import { splitGrowtangle } from './flurry-split-growtangle.js';
import { gmlChoose, gmlRandom, gmlRandomRange, gmlRandomsign, gmlIrandom } from '../../sim/rng.js';
import { afterimage } from '../../sim/fx.js';
import { cue, cueStop } from '../../sim/audio.js';

function manager(state) {
  return state.entities.find(
    (e) => e.alive && e.type.name === 'obj_roaringknight_boxsplitter_attack',
  );
}

function organism(state) {
  return state.entities.find(
    (e) => e.alive && e.type.name === 'obj_knight_split_growtangle',
  );
}

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

function boxDepth(state) {
  const gt = box(state);
  return gt && typeof gt.depth === 'number' ? gt.depth : 0;
}

export const splitslash = {
  name: 'obj_roaringknight_splitslash',

  stepOrder: -0.6,

  create(e, state) {
    scrBulletInit(e);
    e.active = false;
    e.timer = 0;
    e.image_alpha = 1;
    e.image_speed = 0;
    e.slash = false;
    e.destroyonhit = false;
    e.thickness = 10;

    e.image_blend = BLACK;
    e.xdir = 0;
    e.ydir = 0;
    e.xdraw = 250;
    e.ydraw = 250;
    e.init = false;

    e.flip = state.flipTable ? state.flipTable[state.flipIndex++] : gmlChoose(state.gmlRng, [-1, 1]);

    e.damage = 206;
    e.element = 5;
    e.grazepoints = 10;
    e.vertical = false;
    e.memheartx = 0;
    e.memhearty = 0;
    e.playerstrike = false;
    e.cuty = 1;
    e.xoffset = 0;
    e.yoffset = 0;
    e.angleoffset = 0;

    e.startdepth = e.depth ?? 0;
    e.difficulty = 0;

    e.slashmarker = null;
    e.slice_delay = 5;
    e.hurt_delay = 15;
    e.diagonal = false;

    e.image_angle = 0;
    e.image_xscale = 1;
    e.image_yscale = 1;
    e.isBullet = true;
  },

  draw(e, state) {
    splitslash.animationEnd(e);
    if (e.visible === false) return;
    if (!(e.playerstrike === 1 || e.playerstrike === true)) return;
    const heart = state.soul;
    if (!heart || heart.alive === false) return;
    const rng = state.gmlRng;
    const xx = rng ? gmlIrandom(rng, 2) - 1 : 0;
    const yy = rng ? gmlIrandom(rng, 2) - 1 : 0;
    e.strikeJitter = { xx, yy };
  },

  step(e, state) {
    e.timer += 1;

    if (!e.init) {
      e.init = true;

      e.startdepth = e.depth ?? 0;
      e.depth = boxDepth(state) + 10;

      e.slashmarker = scrDarkMarker(state, e.x, e.y, 'spr_rk_quickslash_upper');
      e.slashmarker.depth = boxDepth(state) + 50;
      e.slashmarker.image_speed = 0;
      e.slashmarker.image_alpha = 0;

      const rec = state.slashParams ? state.slashParams[state.slashIndex++] : null;

      e.angleoffset = rec ? rec.angleoffset : gmlRandomRange(state.gmlRng, -2, 2);
      if (!rec && kaizoSideb(state)) {
        const mgd = manager(state);
        if (mgd && mgd.difficulty === 3) {
          e.angleoffset = gmlRandomRange(state.gmlRng, -12, 12);
        }
      }

      const mg = manager(state);
      const odd = mg ? mg.slash_count % 2 === 1 : false;

      if (e.diagonal) {
        e.direction = odd ? -45 : 45;
        e.vertical = odd;
        e.image_angle = e.direction;
        e.xoffset = rec ? rec.xoffset : gmlRandomRange(state.gmlRng, -2, 2) * 2;
        e.yoffset = rec ? rec.yoffset : gmlRandomRange(state.gmlRng, -2, 2) * 2;
      } else if (e.vertical) {
        e.direction = odd ? -90 : 90;
        e.image_angle = e.direction;

        e.xoffset = rec ? rec.xoffset : gmlRandomRange(state.gmlRng, -4, 4) * 2;
      } else {

        e.yoffset = rec ? rec.yoffset : gmlRandomRange(state.gmlRng, -4, 4) * 2;
      }

      e.slashmarker.image_angle = e.image_angle;
    }

    for (const s of state.entities) {
      if (s.alive && s !== e
        && s.type.name === 'obj_roaringknight_splitslash' && s.playerstrike) {
        e.timer -= 1;
      }
    }

    if (!e.slash) {
      e.image_blend = mergeColor(BLACK, KAIZO_TELEGRAPH_COLOR, clamp01(e.timer / 20));
    }

    if (!e.slash) {
      e.slashmarker.image_alpha = 0;
    } else {
      e.slashmarker.x = e.x;
      e.slashmarker.y = e.y;
      e.slashmarker.image_index = e.image_index;
      e.slashmarker.image_blend = e.image_blend;
      e.slashmarker.image_alpha = e.image_alpha;
    }

    if (e.timer <= 15) {
      e.thickness = lerp(10, 1, scrEaseOut(e.timer / 15, 4));
    }

    if (e.timer === 29) {
      e.depth = e.startdepth ?? 0;
    }

    if (e.timer === 30) {
      e.x = e.xstart;
      e.y = e.ystart;
      if (e.image_angle === 90) e.image_yscale *= -1;
      e.image_angle += e.angleoffset;
      e.x += e.xoffset;
      e.y += e.yoffset;

      e.image_blend = WHITE;
      e.active = true;
      e.slash = true;

      let splitter = organism(state);
      if (!splitter) {
        const gt = box(state);
        splitter = spawn(state, splitGrowtangle, { x: gt ? gt.x : e.x, y: gt ? gt.y : e.y });

        scrBulletInherit(e, splitter);
        splitter.grazepoints = 5;
        const mg = manager(state);
        if (mg) {
          mg.splitterRef = splitter;
          splitter.difficulty = mg.difficulty;
        }
      }

      splitter.xoffset = e.xoffset;
      splitter.yoffset = e.yoffset;
      splitter.angle = e.angleoffset;
      splitter.vertical = e.vertical;
      splitter.diagonal = e.diagonal;
      splitter.con = 1;
      splitter.timer = 0;

      e.sprite_index = 'spr_rk_quickslash';
      e.image_speed = 1;
      e.image_index = 0;
      e.image_yscale *= 2;

      let angle = e.image_angle;
      if (e.image_xscale < 0) angle += 180;
      const dirx = lengthdirX(60, angle);
      const diry = lengthdirY(60, angle);
      for (let i = 0; i < 16; i++) {
        const d = spawn(state, afterimage, {
          x: e.xstart + e.xoffset,
          y: e.ystart + e.yoffset,
        });
        d.speed = gmlRandomRange(state.gmlRng, 10, 20);
        d.direction = e.image_angle + ((20 - d.speed) * gmlRandomsign(state.gmlRng)) / 2 + 180;
        d.speed += gmlRandomRange(state.gmlRng, -2, 2);
        if (i % 2 === 0) {
          d.direction -= 180;
          d.speed *= 0.75;
          d.x += dirx;
          d.y += diry;
        } else {
          d.x -= dirx;
          d.y -= diry;
        }
        d.image_angle = d.direction;
        d.sprite_index = 'spr_knight_slash_mark';
        d.image_alpha = 1;
        d.image_xscale = d.speed / 10;
        d.image_yscale = 0.1;
        d.friction = 0.5;
        d.fadeSpeed += gmlRandom(state.gmlRng, 0.02);
      }

      const mgr = manager(state);
      if (mgr) {
        mgr.image_index = mgr.image_index >= 4 ? 1 : 4;
        mgr.animtimer = 0;
      }

      cueStop(state, 'snd_wideslash_low');
      cueStop(state, 'snd_knight_hurtb');
      cue(state, 'snd_wideslash_low', 0.9 + gmlRandom(state.gmlRng, 4) / 10, 0.8);
    }

    if (e.timer === 34) {
      e.active = false;
    }

    if (e.slash && e.timer >= 34 && !e.playerstrike) {

      if (e.slashmarker) destroy(e.slashmarker);
      destroy(e);
      return;
    }

    if (e.timer === 35 + e.hurt_delay && e.playerstrike) {

      const mgh = manager(state);
      if (mgh) {
        mgh.timer -= e.hurt_delay;
        mgh.local_turntimer += e.hurt_delay;
      }
      e.playerstrike = 0;

      if (state.soul) state.soul.image_alpha = 1;

      if (e.target !== 3) kaizoScrDamageMaxhp(state, 1, true, false, { target: 0 });

      state.invTimer = state.invc * 30;

      if (e.slashmarker) destroy(e.slashmarker);
      destroy(e);
    }
  },

  collides(e, heart, state) {

    if (state && state.replayContacts) return false;
    if (e.active !== true && e.active !== 1) return false;
    return scrPreciseHitRotatedRect(heart, e, QUICKSLASH_SHAPE, 2);
  },

  other15(e, state) {
    this.onHit(e, state);
  },

  onHit(e, state) {
    const heart = state.soul;

    if (!heart) return;
    e.playerstrike = 1;
    e.active = 0;
    e.memheartx = heart.x;
    e.memhearty = heart.y;

    state.invTimer = -1;

    heart.image_alpha = 0;

    const off = heart.y - (e.y - 8);
    e.cuty = Math.round(1 + (14 - 1) * clamp01((off - -16) / 32));

    const splitter = organism(state);
    if (splitter) {
      splitter.split_delay = 5;
      e.hurt_delay = splitter.split_wait;
    }

  },

  endStep(e, state) {
    if (e.playerstrike === 1) {
      const heart = state.soul;
      if (heart.x !== e.memheartx) heart.x = e.memheartx + sign(heart.x - e.memheartx);
      if (heart.y !== e.memhearty) heart.y = e.memhearty + sign(heart.y - e.memhearty);
      e.memheartx = heart.x;
      e.memhearty = heart.y;
    }

    if (e.playerstrike === 1) {
      const otherStriking = state.entities.some(
        (s) => s.alive && s !== e
          && s.type.name === 'obj_roaringknight_splitslash' && s.playerstrike,
      );
      if (!otherStriking) {
        const mg = manager(state);
        if (mg) {
          mg.timer -= 1;
          mg.local_turntimer += 1;
        }
      }
    }
  },

  animationEnd(e) {
    if (e.slash && e.visible !== false && e.timer >= 34 && (e.playerstrike === 1 || e.playerstrike === true)) {
      e.image_alpha = 0;
    }
  },
};
