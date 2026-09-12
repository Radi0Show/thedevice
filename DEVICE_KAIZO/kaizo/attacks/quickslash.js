

import { spawn, destroy } from '../../sim/entity.js';
import {
  scrBulletInit, scrBulletInherit, collidebulletOther15,
} from '../../sim/bullets/regularbullet.js';

import { splitGrowtangle } from './flurry-split-growtangle.js';

import { spawnVerticalSplit } from './split-growtangle-vertical.js';

import { chainNext } from '../../sim/attacks/combination.js';
import { scrDamageMaxhp } from '../../sim/damage.js';
import {
  lerp, sign, scrApproach, scrMovetowards, lengthdirX, lengthdirY,
  pointDirection, pointDistance, angleDifference, mergeColor, gmlRound,
  gmlLte, GRAY, WHITE,
} from '../../sim/gml.js';
import { gmlRandom, gmlRandomRange, gmlIrandom } from '../../sim/rng.js';
import { enginePairHit } from '../../sim/masks.js';
import { kaizoMask } from '../data/masks.js';
import { getSwordcolor } from './kaizo-colors.js';
import { scrAfterimage } from '../../sim/fx.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { cue, cueStop } from '../../sim/audio.js';

function knightOf(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_knight_enemy');
}

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

function attackOf(state) {
  return state.entities.find(
    (e) => e.alive && e.type.name === 'obj_roaringknight_quickslash_attack',
  );
}

function gtMaxy(state) {
  const gt = box(state);
  if (!gt) return 0;
  return gt.y + ((gt.spriteHeight ?? 75 * gt.image_yscale) * 0.5);
}
function gtMiny(state) {
  const gt = box(state);
  if (!gt) return 0;
  return gt.y - ((gt.spriteHeight ?? 75 * gt.image_yscale) * 0.5);
}

function kaizoSideb(state) {
  return !!(state.kaizo && state.kaizo.sideb);
}

function maskWithPx(m) {
  if (!m.px) m.px = m.rows.map((r) => Array.from(r, (c) => c === '1'));
  return m;
}
export const QUICKSLASH_MARKER_GRADIENT_MASK = maskWithPx(
  kaizoMask('spr_rk_quickslash_marker_gradient'),
);

function ledger(state, entry) {
  if (!state.kaizo) state.kaizo = {};
  (state.kaizo.approx ??= []).push(entry);

}

function scrAfterimagefast(state, e) {
  const a = scrAfterimage(state, e);
  a.fadeSpeed = 0.08;
  return a;
}

function scrOrbitaroundpoint(s, cx, cy, ang) {
  const theta = pointDirection(cx, cy, s.x, s.y) + ang;
  const radius = pointDistance(cx, cy, s.x, s.y);
  s.x = cx + lengthdirX(radius, theta);
  s.y = cy + lengthdirY(radius, theta);
}

function scrDamageAllMaxhp(state, fraction, arg1, arg2) {
  if (state.invTimer >= 0) return 0;
  const prevRoaring = state.roaringActive;
  state.roaringActive = true;
  let total = 0;
  for (let ti = 0; ti < 3; ti++) {
    state.invTimer = -1;
    if (state.partyHp[ti] > 0) {
      total += scrDamageMaxhp(state, fraction, arg1, arg2, { target: ti, aoe: true });
    }
  }
  state.roaringActive = prevRoaring;
  state.invTimer = state.invc * 30;
  return total;
}

function cleanupController(e, state) {
  if (e.turn_type !== 'start' && e.turn_type !== 'short start' && e.turn_type !== 'short mid') {
    const k = knightOf(state);
    if (k) k.image_alpha = 1;
    state.turntimer = -1;
  }
}

export const quickslash = {
  name: 'obj_roaringknight_quickslash',

  create(e, state) {
    scrBulletInit(e);
    e.active = false;
    e.timer = 0;
    e.image_alpha = 0.1;
    e.image_speed = 0;
    e.slash = false;
    e.destroyonhit = false;
    e.thickness = 10;
    e.image_blend = GRAY;
    e.trailthickness = 10;
    e.xdir = 0;
    e.ydir = 0;
    e.xdraw = 250;
    e.ydraw = 250;
    e.init = false;
    e.flip = false;
    e.timer = 0;

    e.damage = 84;
    e.element = 5;

    e.target = 3;
    e.grazepoints = 5;

    e.chaosangleset = false;

    e.extra = 0;

    e.mask = QUICKSLASH_MARKER_GRADIENT_MASK;

    e.sprite_index = 'spr_rk_quickslash_marker';
    e.isBullet = true;

    void state;
  },

  step(e, state) {
    e.timer += 1;
    if (!e.init) {
      e.image_alpha = 1;
      e.xdir = lengthdirX(250, e.image_angle);
      e.ydir = lengthdirY(250, e.image_angle);
      e.init = true;

      const mg = attackOf(state);
      if (mg) e.max_timer = gmlRound(mg.slash_delay);
      e.timerA = 0.2 * e.max_timer;
      e.timerB = (1 / 3) * e.max_timer;
      e.timerC = e.max_timer - e.timerB;
      e.thickness = 0;
    }

    if (!e.slash) {
      if (e.timer <= e.timerA) {
        e.xdraw = e.xdir * (1 - (e.timer / e.timerA));
        e.ydraw = e.ydir * (1 - (e.timer / e.timerA));
        if (e.flip) {
          e.xdraw *= -1;
          e.ydraw *= -1;
        }
      } else {

        e.xdraw = 1 * -e.flip;
        e.ydraw = 1 * -e.flip;
      }

      e.thickness = scrApproach(e.thickness, 1.5, 0.5);
      e.trailthickness = e.thickness + 2;
      if (e.timer > e.timerB) {

        e.image_yscale = 0.4;

        e.image_blend = mergeColor(GRAY, getSwordcolor(state), (e.timer - e.timerB) / e.timerC);
      }
    }

    if (e.timer === e.max_timer) {
      e.image_blend = WHITE;
      e.active = true;
      e.slash = true;
      e.sprite_index = 'spr_rk_quickslash';
      e.image_speed = 1;
      e.image_index = 0;
      cueStop(state, 'snd_wideslash_low');
      cueStop(state, 'snd_knight_hurtb');

      cue(state, 'snd_wideslash_low', 0.9 + gmlRandom(state.gmlRng, 4) / 10, 0.8);
      cue(state, 'snd_knight_hurtb', 0.9 + gmlRandom(state.gmlRng, 4) / 10, 0.7);

      if (!e.extra) {
        const mg = attackOf(state);
        if (mg && mg.omae_wa_timer < 10) {
          quickslashAttack.other11(mg, state);
        }
      }
    }

    if (e.timer >= e.max_timer + 2) {
      e.active = false;
    }

    if (e.slash && e.timer >= e.max_timer + 4) {
      destroy(e);
    }
  },

  collides(e, heart, state) {
    if (state && state.replayContacts) return false;
    return enginePairHit(heart, e, e.mask);
  },

  other15: collidebulletOther15,
};

export const quickslashBig = {
  name: 'obj_roaringknight_quickslash_big',

  draw(e, state) {
    if (!(e.playerstrike === 1 || e.playerstrike === true)) return;
    const heart = state.soul;
    if (!heart || heart.alive === false) return;
    const rng = state.gmlRng;
    const xx = rng ? gmlIrandom(rng, 2) - 1 : 0;
    const yy = rng ? gmlIrandom(rng, 2) - 1 : 0;
    e.strikeJitter = { xx, yy };
  },

  create(e, state) {
    quickslash.create(e, state);
    e.element = 5;
    e.image_index = 1;
    e.thickness = 1;
    e.trailthickness = 1;
    e.destroyonhit = 0;
    e.playerstrike = 0;
    e.memheartx = 0;
    e.memhearty = 0;
    e.xdraw = 0;
    e.ydraw = 0;
    e.cuty = 8;
    e.grazepoints = 5;

    e.endtype = 0;
    const mg = attackOf(state);
    if (mg) e.endtype = mg.endtype;

    e.mask = QUICKSLASH_MARKER_GRADIENT_MASK;

    if (mg && mg.verticalcut === true) {
      const gt = box(state);
      if (gt) e.x = gt.xstart;
    }
  },

  step(e, state) {
    e.timer += 1;
    if (e.image_alpha < 1 && !e.slash) {
      e.image_alpha += 0.05;
    }
    if (!e.slash && e.timer > 20) {

      e.image_blend = mergeColor(WHITE, getSwordcolor(state), (e.timer - 20) / 19);
    }
    if (!e.slash) {

      if (e.image_angle === 90) {
        e.y -= 20;
        if (e.y < e.ystart - 66) {
          e.y += 66;
        }
        e.x = e.xstart;
      } else {
        e.x -= 20;
        if (e.x < e.xstart - 66) {
          e.x += 66;
        }
      }
    }
    if (e.timer === 38) {
      const mg = attackOf(state);
      if (mg) mg.final_slash_anim = true;
    }
    if (e.timer === 40) {
      e.x = e.xstart;
      e.image_blend = WHITE;
      e.active = true;
      e.slash = true;

      if (e.endtype === 0) {
        const gt = box(state);
        const sp = spawn(state, splitGrowtangle, { x: gt ? gt.x : e.x, y: gt ? gt.y : e.y });
        scrBulletInherit(e, sp);
        sp.target = 0;
        armKaizoSplitter(sp);
      } else {

        spawnVerticalSplit(state, e, scrBulletInherit);
      }
      e.sprite_index = 'spr_rk_quickslash';
      e.image_speed = 1;
      e.image_index = 0;
      e.image_yscale *= 2;
      cueStop(state, 'snd_wideslash_low');
      cueStop(state, 'snd_knight_hurtb');

      cue(state, 'snd_wideslash_low', 0.9 + gmlRandom(state.gmlRng, 4) / 10, 0.8);

      const mg = attackOf(state);
      if (mg) {
        mg.nodraw = false;
        quickslashAttack.other11(mg, state);
      }
    }

    let _delay = 0;
    if (e.endtype === 1) {
      _delay = 20;
    }

    if (e.timer === 42) {
      e.active = false;
    }

    if (e.timer === 42 + _delay && e.playerstrike === 1) {
      e.playerstrike = 0;
      const heart = state.soul;
      if (heart) heart.image_alpha = 1;

      const hp = state.soulPrev ?? heart;
      let _targetY = e.y;
      if (heart && hp.y > e.y) {
        _targetY += 75;
      } else {
        _targetY -= 75;
      }
      if (heart) {

        scrLerpvar(state, spawn, heart, 'y', hp.y, _targetY, 6);
      }
      scrDamageAllMaxhp(state, 0.5, true, false);

      destroy(e);
      return;
    }

    if (e.image_angle === 90) {
      const gt = box(state);
      if (gt) e.x = gt.xstart;
    }

    if (e.slash && e.timer >= 44) {
      if (!e.playerstrike) {
        if (state.soul) state.soul.image_alpha = 1;
        destroy(e);
      } else {
        e.image_alpha = 0;
      }
    }
  },

  collides(e, heart, state) {
    if (state && state.replayContacts) return false;
    return enginePairHit(heart, e, e.mask);
  },

  other15(e, state) {
    if (!(e.active === 1 || e.active === true)) return;
    const heart = state.soul;
    if (!heart) return;
    e.playerstrike = 1;
    e.active = 0;
    e.memheartx = heart.x;
    e.memhearty = heart.y;

    heart.image_alpha = 0;

    state.invTimer = -1;

    const off = heart.y - (e.y - 8);
    const t = Math.min(1, Math.max(0, (off - -16) / 32));
    e.cuty = Math.round(1 + (14 - 1) * t);
  },

  endStep(e, state) {
    if (e.playerstrike === 1) {
      const heart = state.soul;
      if (!heart) return;
      if (heart.x !== e.memheartx) heart.x = e.memheartx + sign(heart.x - e.memheartx);
      if (heart.y !== e.memhearty) heart.y = e.memhearty + sign(heart.y - e.memhearty);
      e.memheartx = heart.x;
      e.memhearty = heart.y;
    }
  },
};

function armKaizoSplitter(sp) {
  sp.con = 1;
  sp.timer = 0;
  sp.damage = 206;
}

export const quickslashAttack = {

  cleanUp: cleanupController,

  name: 'obj_roaringknight_quickslash_attack',

  create(e, state) {
    scrBulletInit(e);
    e.hell_surface = -4;
    e.spawn_speed = 20;
    e.spawn_range = 4;
    e.min_angle = 145;
    e.max_angle = 215;
    e.timer = 99;
    e.slash_count = 0;
    e.image_alpha = 1;
    e.image_xscale = 2;
    e.image_yscale = 2;

    e.depth = (typeof state.soul?.depth === 'number' ? state.soul.depth : 1) + 1;
    e.image_speed = 0;
    e.image_index = 1;
    e.animtimer = 5;
    e.count = 3;
    e.aetimer = 0;
    e.recoil = 0;
    e.final_slash_anim = false;
    e.slash_anim_count = 0;
    e.flip = false;

    e.flipped = -1;
    e.forward = 0;
    e.auto = false;
    e.flip_mode = true;
    e.turn_segment = -1;
    e.local_turntimer = 260;
    e.next_up = -1;
    e.next_next_up = -1;
    e.auto = true;

    e.knight = knightOf(state) ?? -4;
    e.anchor_x = e.x;
    e.anchor_y = e.y;
    e.done = false;
    e.omae_wa_con = 0;

    e.omae_wa_timer = 0;
    e.verticalcut = false;

    e.turn_type = 'full';
    e.slash_delay = 30;
    e.spawn_min = 5;
    e.spawn_yrange = -1;
    e.spawn_range = 32;
    e.spawn_phase = 1;
    e.spawn_speed = 10;
    e.spawn_rem = 0.25;
    e.spawn_delay = 15;
    e.timer = e.spawn_speed - 5;
    e.nodraw = false;
    e.local_turntimer = 600;
    if (kaizoSideb(state)) {

      e.spawn_speed = 12.4;
      e.spawn_rem = 0.4;
      e.timer = e.spawn_speed - 3;
      e.spawn_min = 6;
      e.spawn_range = 14;
    }

    {
      const knight = knightOf(state);
      const kphase = knight
        ? (knight.phase !== undefined ? knight.phase : state.knightPhase)
        : undefined;
      if (knight && kphase === 3) {
        e.timer = 20;
        e.spawn_yrange = 0;
        e.spawn_range = 12;
        e.spawn_phase = 0;
        e.spawn_speed = 45;
        e.spawn_min = 4;
        e.spawn_rem = 1;
        e.spawn_delay = 5;
      }
    }
    e.endtype = 0;

    e.sprite_index = 'spr_roaringknight_attack_ol';
  },

  init(e, state) {
    if (e.turn_type === 'full') {
      e.local_turntimer = 230;
      scrLerpvar(state, spawn, e, 'x', e.x, state.view.x + 415, 20, 2, 'out');
      scrLerpvar(state, spawn, e, 'y', e.y, state.view.y + 87, 20, 2, 'out');
    }
    if (e.turn_type === 'start') {
      e.local_turntimer = 172;
      e.spawn_speed = 16;
      scrLerpvar(state, spawn, e, 'x', e.x, state.view.x + 415, 10, 2, 'out');
      scrLerpvar(state, spawn, e, 'y', e.y, state.view.y + 87, 10, 2, 'out');
    }
    if (e.turn_type === 'end') {
      e.local_turntimer = 160;
      e.spawn_speed = 12;
      scrLerpvar(state, spawn, e, 'x', e.x, state.view.x + 417, 20, 2, 'out');
      scrLerpvar(state, spawn, e, 'y', e.y, state.view.y + 87, 20, 2, 'out');
    }
    if (e.turn_type === 'short start') {
      e.local_turntimer = 160;
      e.spawn_speed = 12;
      scrLerpvar(state, spawn, e, 'x', e.x, state.view.x + 415, 10, 2, 'out');
      scrLerpvar(state, spawn, e, 'y', e.y, state.view.y + 87, 10, 2, 'out');
    }
    if (e.turn_type === 'short mid') {
      e.local_turntimer = 160;
      e.spawn_speed = 12;
      scrLerpvar(state, spawn, e, 'x', e.x, state.view.x + 415, 10, 2, 'out');
      scrLerpvar(state, spawn, e, 'y', e.y, state.view.y + 87, 10, 2, 'out');
    }
    if (e.turn_type === 'short end') {
      e.local_turntimer = 160;
      e.spawn_speed = 10;
    }
  },

  other11(e, state) {

    if (e.flipped === -1) {
      e.image_xscale = -e.image_xscale;
      e.flipped = 1;
    }
    e.image_xscale = -e.image_xscale;
    const heart = state.soul;
    if (e.image_xscale < 0) {
      if (heart) e.x = heart.xstart + 10 + 340;
    } else {
      if (heart) e.x = (heart.xstart + 10) - 300;
    }

    if (e.image_alpha === 0) {
      const k = knightOf(state);
      if (k) k.image_alpha = 0;
      e.image_alpha = 1;
    }
    if (e.image_index >= 4) {
      e.image_index = 1;
    } else {
      e.image_index = 4;
    }
    e.animtimer = 0;
    if (e.slash_anim_count > 0) {
      e.aetimer = -1;
    }
    e.slash_anim_count += 1;
    if (e.final_slash_anim) {
      e.recoil = 6;
    } else {
      e.x -= 2;
    }

    if (e.final_slash_anim) {
      e.animtimer = 3;
      state.turntimer = 80;
      if (e.endtype === 1) {
        state.turntimer = 240;
      }
      e.image_index = 3;
      if (heart) e.x = heart.xstart + 10 + 280;
      e.image_xscale = -Math.abs(e.image_xscale);
    }

    const fade = scrAfterimagefast(state, e);
    const hs = -3 * e.image_xscale;
    fade.speed = Math.abs(hs);
    fade.direction = hs < 0 ? 180 : 0;
  },

  other12(e, state) {
    quickslashAttack.other11(e, state);
  },

  other13(e, state) {
    const gt = box(state);
    const heart = state.soul;

    if (!gt || !heart) return;

    const hp = state.soulPrev ?? heart;
    const knight = knightOf(state);
    const kx = knight ? knight.x : e.x;

    let _slash = spawn(state, quickslash, {
      x: gt.x + (e.flip ? 20 : -20),
      y: gt.y,
    });
    let _xx = kx + 100;
    let _minAngle = e.min_angle;
    let _maxAngle = e.max_angle;
    if (e.flip) {
      _minAngle -= 180;
      _maxAngle -= 180;
      _xx = gt.x - Math.abs(_xx - gt.x);
    }
    {
      const s = _slash;

      s.y = hp.y + 10 + gmlRandomRange(state.gmlRng, -e.spawn_range, e.spawn_range);
      let _targetdir = pointDirection(_xx, s.y, hp.x + 10, hp.y + 10);
      e.count += 1;
      s.flip = e.flip;
      if (s.flip) {
        _targetdir = angleDifference(_targetdir, 0);
      }
      if (s.flip) {
        s.image_xscale *= -1;
        scrOrbitaroundpoint(s, _xx, gt.y, _targetdir);
      } else {
        _targetdir -= 180;
        scrOrbitaroundpoint(s, _xx, gt.y, _targetdir);
      }

      s.y += gmlRandomRange(state.gmlRng, -e.spawn_yrange, e.spawn_yrange);
      s.y = Math.min(s.y, gtMaxy(state) - 2);
      s.y = Math.max(s.y, gtMiny(state) + 2);
      s.image_angle = _targetdir;
      s.direction = _targetdir;

      if (Math.floor(e.spawn_phase) === 2) {
        s.x = gt.x;
        cue(state, 'snd_noise', 0.4 + gmlRandomRange(state.gmlRng, -0.05, 0.05), 0.75);
        s.y = gmlRandomRange(state.gmlRng, gtMiny(state) + 5, gtMaxy(state) - 5);
        _targetdir = 180 - gmlRandomRange(state.gmlRng, -36, 36);
        s.image_angle = _targetdir;
        s.direction = _targetdir;
      }
    }

    if (kaizoSideb(state) && Math.floor(e.spawn_phase) !== 2) {
      _slash = spawn(state, quickslash, { x: gt.x, y: gt.y });
      _slash.extra = 1;
      _xx = kx + 100;
      _minAngle = e.min_angle;
      _maxAngle = e.max_angle;
      if (e.flip) {
        _minAngle -= 180;
        _maxAngle -= 180;
        _xx = gt.x - Math.abs(_xx - gt.x);
      }
      {
        const s = _slash;
        s.x = hp.x + 10 + gmlRandomRange(state.gmlRng, -e.spawn_range, e.spawn_range);

        let _targetdir = pointDirection(_xx, s.y, hp.x + 10, hp.y + 10);
        s.x += gmlRandomRange(state.gmlRng, -e.spawn_yrange, e.spawn_yrange);
        cue(state, 'snd_noise', 0.4 + gmlRandomRange(state.gmlRng, -0.05, 0.05), 0.75);
        s.y = gt.y;
        _targetdir = 90 + gmlRandomRange(state.gmlRng, -e.spawn_range, e.spawn_range);
        s.image_angle = _targetdir;
        s.direction = _targetdir;
      }
    }

    if (e.flip_mode) {
      e.flip = !e.flip;
    }
    e.min_angle = scrApproach(e.min_angle, 172, 2);
    e.max_angle = scrApproach(e.max_angle, 188, 2);
    if (e.spawn_range > 8) {
      e.spawn_range = scrApproach(e.spawn_range, 8, 1);
    }
    if (e.spawn_yrange === -1) {
      e.spawn_yrange = 44;
      if (kaizoSideb(state)) {
        e.spawn_yrange = 24;
      }
    }
    e.spawn_yrange = scrApproach(e.spawn_yrange, 0, 4);
  },

  alarm: {

    2(e, state) {
      ledger(state, {
        type: 1001,
        asked: `quickslash Alarm_2 chain handoff (next_up ${e.next_up})`,
        used: 'destroy without handoff',
        why: 'combination-chain segments are the ac-106 work item',
      });
      destroy(e, state);
    },
  },

  step(e, state) {
    e.local_turntimer -= 1;
    if (!e.auto) {
      return;
    }

    if (e.knight === -4 || !e.knight || !e.knight.alive) {
      e.knight = knightOf(state) ?? -4;
    }
    if (e.local_turntimer <= 50) {

      if (e.local_turntimer <= 10 && e.sprite_index !== 'spr_roaringknight_idle') {
        if (e.image_xscale < 0) {
          e.x -= 220;
        }
        e.image_xscale = Math.abs(e.image_xscale);
        e.sprite_index = 'spr_roaringknight_idle';
        e.image_index = 0;
      } else if (e.local_turntimer < 42 && e.image_xscale < 0) {
        e.image_index = 4;
      }
      const knight = knightOf(state);
      if (knight && e.x < knight.x) {
        e.x += 1;
      }
      let _local_turntimer = e.local_turntimer;
      if (_local_turntimer < 0) {
        _local_turntimer = 0;
      }
      if (e.knight !== -4 && e.knight) {
        e.y = lerp(e.y, e.knight.y, (50 - _local_turntimer) / 50);
      }

      if (e.endtype === 0) {
        if ((e.local_turntimer < -60 && e.turn_type !== 'short end')
          || (e.local_turntimer < -110 && e.turn_type === 'short end')) {
          state.turntimer = 0;
          destroy(e, state);
          return;
        }
      } else if (e.local_turntimer < -160) {
        state.turntimer = 0;
        destroy(e, state);
        return;
      }
    } else if (e.recoil !== 0) {

      e.x += e.recoil;
      e.recoil = scrMovetowards(e.recoil, 0.25 * sign(e.recoil), 0.5);
    }

    if ((e.local_turntimer < 120 || (e.local_turntimer < 150 && e.next_up === 4))
      && e.slash_count < 999 && (e.slash_count % 2) === 0 && !e.done) {
      e.slash_count = 999;
      if (e.turn_type === 'start' || e.turn_type === 'short start' || e.turn_type === 'short mid') {

        e.done = true;
        e.local_turntimer = 99999;
        e.slash_count = 1000;
        if (e.next_up > 0) {
          e.nodraw = true;
          e.auto = false;
        }
        chainNext(state, e, 'quickslash_step');

        e.next_up = -999;
        return;
      }
      e.slash_anim_count = 999;
      e.timer = -2;
    }
    if (e.slash_count > 999) {
      return;
    }
    if (e.slash_count === 999 && e.done) {
      return;
    }
    e.timer += 1;
    if (e.timer >= e.spawn_speed) {

      if (e.spawn_speed <= e.spawn_min) {

        if (e.spawn_phase === 1) {
          e.slash_count = 980;
          e.spawn_phase = 2;
          e.spawn_speed = 2;
          e.spawn_min = 2;

          e.timer = -7;
          return;
        }
        if (Math.floor(e.spawn_phase) === 2) {
          e.slash_count = 980;
          e.spawn_phase += 0.03;
          e.spawn_speed = 2;
          e.slash_delay = 40;

          if (gmlLte(2.27, e.spawn_phase)) {
            e.nodraw = true;
            e.timer = 0;
            e.spawn_phase = 0;
            e.spawn_speed = 15;
            e.slash_count = 999;
            return;
          }
        }
      } else {
        e.spawn_speed = scrApproach(e.spawn_speed, e.spawn_min, e.spawn_rem);
        e.slash_delay = e.spawn_speed + e.spawn_delay;
      }
      e.slash_count += 1;
      if (e.timer >= 0) {
        e.timer = 0;
      }
      if (e.slash_count === 1000) {

        const gt = box(state);
        if (gt) {
          spawn(state, quickslashBig, { x: gt.x + 33, y: gt.y });
        }
        if (e.local_turntimer > 135) {
          e.local_turntimer = 135;
        }
      } else {

        quickslashAttack.other13(e, state);
        if (e.slash_count === 999) {
          e.spawn_speed = 10;
        }
      }
    }
  },

  endStep(e, state) {
    if (!(e.image_alpha === 1 && !e.nodraw)) return;
    if (e.animtimer < 4) {
      e.animtimer += 1;
    } else if (e.image_index === 1 || e.image_index === 4 || e.image_index === 3) {
      e.image_index += 1;
    }
    e.aetimer += 1;
    if ((e.aetimer % 4) === 0 && e.image_alpha !== 0) {
      const gt = box(state);
      const fade = scrAfterimage(state, e);
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.02;

      const d = sign(e.x - (gt ? gt.x : e.x));
      fade.speed = Math.abs(2 * d);
      fade.direction = d < 0 ? 180 : 0;
      fade.depth = e.depth + (gt && e.x < gt.x ? 50 : 100);
    }

  },
};

function dcLike(damage) {
  return {
    damage: damage ?? -1,
    grazepoints: -1,
    timepoints: -1,
    inv: -1,

    target: 4,
    grazed: -1,
    grazetimer: -1,
    element: 'none',
  };
}

export function spawnQuickslash1001(state, opts = {}) {
  state.turntimer = 999999;
  const knight = knightOf(state);
  if (knight) knight.image_alpha = 0;
  const e = spawn(state, quickslashAttack, {
    x: knight ? knight.x : 425,
    y: knight ? knight.y : 78,
  });
  e.target = 3;
  scrBulletInherit(dcLike(opts.damage), e);
  return e;
}

export function spawnQuickslashTrue(state, opts = {}) {
  const knight = knightOf(state);
  if (knight) knight.image_alpha = 0;
  const e = spawn(state, quickslashAttack, {
    x: knight ? knight.x : 425,
    y: knight ? knight.y : 78,
  });
  scrBulletInherit(dcLike(opts.damage), e);

  e.difficulty = opts.difficulty ?? 0;
  if (kaizoSideb(state)) {
    e.endtype = 1;
  }
  e.turn_type = 'full';
  quickslashAttack.init(e, state);
  return e;
}

