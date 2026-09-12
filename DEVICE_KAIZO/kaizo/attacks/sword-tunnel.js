

import { spawn, destroy } from '../../sim/entity.js';

import { getSwordcolor, KAIZO_TELEGRAPH_COLOR } from './kaizo-colors.js';
import { viewFor } from '../../sim/shake.js';
import { afterimage, afterimageGrow } from '../../sim/fx.js';
import {
  lerp, lengthdirX, lengthdirY, mergeColor, pointDirection, scrAnglechange,
  gmlEq, WHITE,
} from '../../sim/gml.js';
import { scrBulletInit, collidebulletOther15 } from '../../sim/bullets/regularbullet.js';
import { HEART_MASK, masksOverlap } from '../../sim/masks.js';

import { KAIZO_DIAMONDBULLET_L_MASK } from './kaizo-hitboxes.js';
import { gmlChoose, gmlIrandom } from '../../sim/rng.js';
import { cue } from '../../sim/audio.js';
import { swordTunnelAnim } from './sword-tunnel-anim.js';

import { KAIZO_SMALLER_HEART_MASK } from './underbox.js';

export { swordTunnelHitbox } from '../../sim/attacks/sword-tunnel.js';

function box(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_growtangle');
}

export { getSwordcolor, KAIZO_TELEGRAPH_COLOR };

export const swordTunnelSword = {
  name: 'obj_sword_tunnel_sword',

  create(e, state) {
    scrBulletInit(e);
    e.grazepoints = 0.8;
    e.destroyonhit = 0;
    e.timer = 0;
    e.con = 0;
    e._maxspeed = 30;

    e.image_index = 2;
    e.image_speed = 0;
    e.mydirection = 180;

    e._speed = 6;
    e._gravity = 1;
    e.image_yscale = 0;
    e.randx = -20 + gmlIrandom(state.gmlRng, 40);
    e.randy = -20 + gmlIrandom(state.gmlRng, 40);
    e.targetangle = 0;
    e.anglespeed = 8;
    e.telegraph = 0;
    e.telegraphalpha = 0;

    e.delay = 0;
    e.delaystart = 0;
    e.jumpsnd = 0;
    e.cutsnd = 0;

    e.sprite_index = 'spr_knight_diamondbullet_l';

    e.mask = KAIZO_DIAMONDBULLET_L_MASK;
    e.isBullet = true;
  },

  step(e, state) {
    e._speed += e._gravity;
    if (e._speed > e._maxspeed) e._speed = e._maxspeed;

    let xadd = lengthdirX(1, e.mydirection);
    let yadd = lengthdirY(1, e.mydirection);

    if (e.con === 1) {
      e.timer += 1;
      const c = 10;
      if (e.timer === 1) {
        e._gravity = 0;

        if (!e.delaystart) e.telegraph = 1;
      }
      if (e.timer < 10 + c / 2) {
        e.anglespeed = lerp(8, 0, e.timer / (10 + c / 2));

        const hp = state.soulPrev ?? state.soul;
        if (hp) {
          const want = pointDirection(e.x, e.y, hp.x + 10 + e.randx, hp.y + 10 + e.randy);
          e.image_angle += scrAnglechange(e.image_angle, want, e.anglespeed);
        }
        e.targetangle += e.anglespeed;
      }

      if (e.timer === 1 + e.delaystart) e.telegraph = 1;
      e.direction = e.image_angle;
      if (e.timer < 10 + c) {
        e._speed = lerp(e._speed, 0, e.timer / 10);
      }
      const dtimer = e.timer - e.delaystart;
      if (dtimer >= 11 + c && dtimer < 15 + c) {

        if (!e.jumpsnd) {
          cue(state, 'snd_knight_jump', 0.8, 1);
          for (const s of state.entities) {
            if (s.alive && s.type.name === 'obj_sword_tunnel_sword'
              && s.delaystart === e.delaystart) s.jumpsnd = 1;
          }
        }
        e._speed = 2;
        xadd = lengthdirX(2, e.image_angle + 180);
        yadd = lengthdirY(2, e.image_angle + 180);
      }
      if (dtimer >= 15 + c && dtimer < 20 + c) {
        xadd = 0;
        yadd = 0;
      }
      if (dtimer === 20 + c) {
        const flare = spawn(state, afterimageGrow, { x: e.x, y: e.y });
        flare.sprite_index = e.sprite_index;
        flare.image_angle = e.image_angle;
        flare.image_blend = e.image_blend;
        flare.xrate = 0.4;
        flare.yrate = 0.4;
        flare.fade = 0.2;
      }
      if (dtimer >= 20 + c) {

        if (e.cutsnd === 0) {
          cue(state, 'snd_knight_cut', 0.8, 1);
          for (const s of state.entities) {
            if (s.alive && s.type.name === 'obj_sword_tunnel_sword'
              && s.delaystart === e.delaystart) s.cutsnd = 1;
          }
        }
        e.telegraph = 0;
        e.damage = 160;
        e._speed = 80;
        xadd = lengthdirX(1, e.image_angle);
        yadd = lengthdirY(1, e.image_angle);
      }
    }

    e.image_blend = WHITE;

    const heart = state.soul;

    if (!heart) return;

    const hp = state.soulPrev ?? heart;
    if (
      e.x > hp.x - 80 &&
      e.x < hp.x + 80 &&
      e.y < hp.y + 80 &&
      e.y > hp.y - 80
    ) {

      e.image_blend = getSwordcolor(state);
      const remx = e.x;
      const remy = e.y;
      const steps = Math.max(Math.floor(e._speed / 8), 1);
      for (let i = 0; i < steps; i++) {
        e.x += xadd * 8;
        e.y += yadd * 8;

        if (masksOverlap(
          heart.mask ?? HEART_MASK, hp.x, hp.y,
          KAIZO_DIAMONDBULLET_L_MASK, e.x, e.y,
          e.image_xscale, e.image_yscale, e.image_angle,
        )) {
          e.tunnelHits = (e.tunnelHits ?? 0) + 1;
          state.tunnelHits = (state.tunnelHits ?? 0) + 1;

          swordTunnelSword.other15(e, state);
        }
      }
      e.x = remx;
      e.y = remy;
    }

    e.x += xadd * e._speed;
    e.y += yadd * e._speed;

    const ghost = spawn(state, afterimage, {
      x: (e.x + e.xprevious) / 2,
      y: (e.y + e.yprevious) / 2,
    });
    ghost.sprite_index = e.sprite_index;
    ghost.image_index = e.image_index;
    ghost.image_angle = e.image_angle;
    ghost.image_xscale = e.image_xscale;
    ghost.image_yscale = e.image_yscale;
    ghost.image_alpha = 0.4;
    ghost.image_blend = e.con > 0 ? WHITE : e.image_blend;

    const vw = viewFor(state, e);
    if (e.x <= vw.x - 100) return destroy(e);
    if (e.x >= vw.x + 740) return destroy(e);
    if (e.y >= vw.y + 600) return destroy(e);
    if (e.y <= vw.y - 250) return destroy(e);

    if (e.con === 0) {
      e.image_yscale = lerp(e.image_yscale, e._speed / 20, 0.1);
    }
  },

  collides(e, heart) {

    return masksOverlap(
      heart.mask ?? HEART_MASK, heart.x, heart.y,
      KAIZO_DIAMONDBULLET_L_MASK, e.x, e.y,
      e.image_xscale, e.image_yscale, e.image_angle,
    );
  },

  endStep(e, state) {
    if (e.telegraph === 0 && e.telegraphalpha > 0) e.telegraphalpha -= 0.1;
    if (e.telegraph === 1 && e.telegraphalpha < 0.5) e.telegraphalpha += 0.05;

    if (e.delay > 0) {
      e.delay -= 1;
      e.telegraphalpha = -0.1;
    }

    if (e.con > 0) {

      for (const t of state.entities) {
        if (t.alive && t.type.name === 'obj_tracking_swords_manager') destroy(t);
      }
      const t = Math.min(e.timer, 10);

      if (e.image_blend === getSwordcolor(state)) {
        e.image_blend = mergeColor(getSwordcolor(state), WHITE, t / 10);
      }
    }
  },

  other15: collidebulletOther15,
};

export const swordTunnelManager = {
  name: 'obj_sword_tunnel_manager',

  create(e, state) {

    e.isBullet = true;
    e.maskOff = true;
    const gt = box(state);

    e.timer = -40 + gmlIrandom(state.gmlRng, 10);
    e.finishtimer = 0;

    const theKnight = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_knight_enemy',
    );
    const kd = theKnight?.difficulty ?? e.knightDifficulty;
    e.finishtimermax = kd === 3 ? 250 : 230;
    e.con = 0;

    e.swordx = state.view.x + 640 + 20;
    e.swordy = gt ? gt.y : 190;
    e.swordxrel = 340;
    e.swordyrel = 0;
    e.sworddirection = 180;
    e.swordcount = 0;
    e.setcount = gmlChoose(state.gmlRng, [2, 3, 4]);
    e.waitsetcount = gmlChoose(state.gmlRng, [1, 2, 3]);
    e.movedirection = gmlChoose(state.gmlRng, ['up', 'down']);
    e.tobymode = 0;
    e.tobytimer = 0;

    gmlIrandom(state.gmlRng, 6);
    e.difficulty = 0;
    e.stopsfxtimer = 0;
    e.tobyvolleymode = 0;
    e.tobyvolleycount = 0;
    e.tobyvolleymodeinitspeed = 1;

    e.shoutouttogreenknight = 0;
    e.woosh = -4;

    if (state.currentAc !== 101) {
      const knight = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_knight_enemy',
      );
      if (knight) {
        e.woosh = spawn(state, swordTunnelAnim, { x: knight.x, y: knight.y });
      }
    } else {
      e.timer = -1;
    }
    if (globalThis.process?.env?.KNIGHT_TUNNEL_DEBUG) {
      console.error(`[tun:create] f=${state.frame} ac=${state.currentAc}`
        + ` seed=${state.seed} spawnn=${state.spawnn}`
        + ` timer=${e.timer} (irandom10=${e.timer + 40}) set=${e.setcount}`
        + ` wait=${e.waitsetcount} dir=${e.movedirection} swordy=${e.swordy}`);
    }
  },

  init(e, state) {
    e.rate = 6;
    e.gapsize = 50;
    e.verticalchange = 15;
    e.tobymode = 0;
    e.maxswords = 999;
    if (e.difficulty === 0) {
      e.rate = 4;
      e.gapsize = 45;
      e.verticalchange = 10;
      e.tobymode = 0;
      e.maxswords = 999;
    }
    if (e.difficulty === 3) {
      e.rate = 4;
      e.gapsize = 45;
      e.verticalchange = 7;
      e.tobymode = 3;
      e.tobytimer = 0;
      e.maxswords = 999;
    }

    if (e.difficulty === 4) {
      e.rate = 4;
      e.gapsize = 40;
      e.verticalchange = 10;
      e.tobymode = 0;
      e.maxswords = 999;

      if (state?.kaizo?.sideb) {
        e.gapsize = 30;
      }
    }

    if (e.difficulty === 10) {
      e.rate = 4;
      e.gapsize = 220;
      e.verticalchange = 0;
      e.maxswords = 1500;
      e.tobymode = 0;
      e.tobytimer = 2;
      e.swordy += 50;
    }

    if (gmlEq(e.difficulty, 4.1)) {
      e.rate = 3;
      e.gapsize = 64;
      e.verticalchange = 8;
      e.tobymode = 0;
      e.maxswords = 999;
    }

    if (e.difficulty === 11) {
      e.rate = 3;
      e.gapsize = 92;
      e.verticalchange = 8;
      e.tobymode = 0;
      e.maxswords = 999;
      e.shoutouttogreenknight = 1;
      if (e.woosh && e.woosh !== -4 && e.woosh.alive) {
        e.woosh.vertical = true;
      }
    }
  },

  step(e, state) {
    e.timer += 1;
    e.finishtimer += 1;

    const gt = box(state);

    if (state.soul && state.soul.alive) {
      state.soul.mask = KAIZO_SMALLER_HEART_MASK;
    }

    if (e.finishtimer >= e.finishtimermax - 20) {
      for (const t of state.entities) {
        if (t.alive && t.type.name === 'obj_tracking_swords_manager') {
          t.rate = 9999;
          t.timer = -9999;
        }
      }
    }

    if (e.finishtimer === e.finishtimermax) {
      e.con = 1;
      for (const s of state.entities) {
        if (s.alive && s.type.name === 'obj_sword_tunnel_sword') {
          s.con = 1;

          if (s.holyfuck !== undefined) {
            s.delay = 24;
            s.delaystart = s.delay;
          }
        }
      }
    }

    if (e.timer >= e.rate && e.con === 0) {
      if (e.shoutouttogreenknight) {

        const gx = gt ? gt.x : state.view.x + 320;
        const gy = gt ? gt.y : state.view.y + 180;
        const sx = gx + (e.swordy - gy);
        const sy = gy - (e.swordx - gx);
        const a = spawn(state, swordTunnelSword, {
          x: sx - 50 - e.gapsize / 2,
          y: sy,
        });
        a.image_angle = 0;
        a.damage = e.damage;
        a.holyfuck = 1;
        a.mydirection += 90;
        const b = spawn(state, swordTunnelSword, {
          x: sx + 50 + e.gapsize / 2,
          y: sy,
        });
        b.image_angle = 180;
        b.mydirection += 90;
        b.holyfuck = 1;
        b.damage = e.damage;
      } else if (e.tobymode === 3) {

        e.tobytimer += 1;
        if (!e.tobyvolleymode) {

          e.verticalchange = Math.abs(Math.sin(e.tobytimer / 8)) * 5;
          e.gapsize = 34 + e.verticalchange * 1.4;
        }

        const cx = gt ? gt.x : 300;
        const cy = gt ? gt.y : 190;
        const dir = e.sworddirection;

        const sx = lengthdirX(e.swordxrel, dir + 180);
        const sy = lengthdirY(e.swordxrel, dir + 180);
        const syaddx = lengthdirX(e.swordy - cy, dir + 270);
        const syaddy = lengthdirY(e.swordy - cy, dir + 270);
        const sgapx = lengthdirX(e.gapsize, dir + 270) * 2;
        const sgapy = lengthdirY(e.gapsize, dir + 270) * 2;

        e.tobytimer += 1;

        const speedproportion = lerp(1, 0.8, Math.abs(lengthdirY(1, dir + 180)));
        const gravity =
          (2 * speedproportion - e.verticalchange / 15) * e.tobyvolleymodeinitspeed;

        const a = spawn(state, swordTunnelSword, {
          x: cx + sx - sgapx + syaddx,
          y: cy + sy - sgapy + syaddy,
        });
        a.image_angle = dir + 270;
        a.mydirection = dir;
        a.damage = e.damage;
        a._speed = -8 * speedproportion;
        a._gravity = gravity;

        const b = spawn(state, swordTunnelSword, {
          x: cx + sx + sgapx + syaddx,
          y: cy + sy + sgapy + syaddy,
        });
        b.image_angle = dir + 90;
        b.mydirection = dir;
        b.damage = e.damage;
        b._speed = -8 * speedproportion;
        b._gravity = gravity;

        e.sworddirection += 8;
      } else if (e.tobymode === 0) {
        const upper = spawn(state, swordTunnelSword, {
          x: e.swordx,
          y: e.swordy - 50 - e.gapsize / 2,
        });
        upper.image_angle = 270;
        upper.damage = e.damage;

        if (e.difficulty !== 10) {
          const lower = spawn(state, swordTunnelSword, {
            x: e.swordx,
            y: e.swordy + 50 + e.gapsize / 2,
          });
          lower.image_angle = 90;
          lower.damage = e.damage;
        }
      }

      if (globalThis.process?.env?.KNIGHT_TUNNEL_DEBUG) {
        console.error(`[tun] f=${globalThis.__simFrame} toby=${e.tobytimer}`
          + ` dir=${e.movedirection} sy=${e.swordy} sc=${e.swordcount}`
          + ` set=${e.setcount} wait=${e.waitsetcount} vc=${e.verticalchange}`);
      }
      if (e.movedirection === 'up') e.swordy -= e.verticalchange;
      if (e.movedirection === 'down') e.swordy += e.verticalchange;

      e.swordcount += 1;

      const boundary =
        (e.setcount === e.swordcount &&
          (e.movedirection === 'down' || e.movedirection === 'up')) ||
        (e.waitsetcount === e.swordcount && e.movedirection === 'none');

      if (boundary) {
        e.swordcount = 0;

        const rec = state.tunnelSets ? state.tunnelSets[state.tunnelIndex++] : null;
        e.setcount = rec ? rec.setcount : gmlChoose(state.gmlRng, [2, 3, 4]);
        e.waitsetcount = rec ? rec.waitsetcount : gmlChoose(state.gmlRng, [1, 2, 3]);

        if (e.movedirection === 'none') {
          e.movedirection = rec ? rec.movedirection : gmlChoose(state.gmlRng, ['up', 'down']);
        } else {
          e.movedirection = 'none';
        }

        const cy = gt ? gt.y : 190;
        if (e.movedirection === 'up' && e.swordy < cy - 20) e.movedirection = 'down';
        if (e.movedirection === 'down' && e.swordy > cy + 20) e.movedirection = 'up';
      }
    }

    if (e.difficulty === 10) {
      e.finishtimer = 0;
      e.tobytimer += 1;
      if (e.tobytimer >= 3) {
        e.tobytimer = 0;
        e.gapsize -= 2;
      }
      if (e.gapsize < 36) e.gapsize = 36;
    }

    if (e.timer >= e.rate && e.stopsfxtimer < 3) {
      if (e.con === 1) e.stopsfxtimer += 1;
      cue(state, 'snd_heavy_passing', 1.2, 0.3);
      e.timer = 0;
    }

    if (e.swordcount >= e.maxswords) destroy(e);
  },
};

export function launchSwordTunnel(state, { difficulty = 0, damage = 62, x, y } = {}) {
  const gt = box(state);
  const mg = spawn(state, swordTunnelManager, {
    x: x ?? (gt ? gt.x : state.view.x + 320),
    y: y ?? state.view.y,
  });
  mg.difficulty = difficulty;

  mg.knightDifficulty = difficulty;
  mg.damage = damage;
  swordTunnelManager.init(mg, state);
  return mg;
}
