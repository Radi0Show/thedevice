

import { spawn, destroy } from '../../sim/entity.js';
import {
  lerp, mergeColor, pointDirection, scrEaseIn, lengthdirX, lengthdirY, WHITE,
} from '../../sim/gml.js';
import {
  gmlRandom, gmlIrandom, gmlChoose, gmlRandomRange,
} from '../../sim/rng.js';
import { cue, cueStop } from '../../sim/audio.js';
import { scrShakescreen } from '../../sim/shake.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { enginePairHit } from '../../sim/masks.js';
import {
  regularbulletCreate, regularbulletStep, collidebulletOther15,
} from '../../sim/bullets/regularbullet.js';
import { getSwordcolor } from './kaizo-colors.js';
import { kaizoSideb } from './flurry-damage.js';

const SUNBOLT_MASK_RAW = {
  name: 'spr_sunbolt',
  w: 25,
  h: 9,
  originX: 16,
  originY: 4,
  bbox: [8, 3, 12, 5],
  rows: [
    '0000000000000000000000000',
    '0000000000000000000000000',
    '0000000000000000000000000',
    '0000000011111000000000000',
    '0000000011111000000000000',
    '0000000011111000000000000',
    '0000000000000000000000000',
    '0000000000000000000000000',
    '0000000000000000000000000',
  ],
};

export const SUNBOLT_MASK = (() => {
  const m = { ...SUNBOLT_MASK_RAW };
  m.px = m.rows.map((r) => Array.from(r, (c) => c === '1'));
  return m;
})();

function ledger(state, entry) {
  if (!state.kaizo) state.kaizo = {};
  (state.kaizo.approx ??= []).push(entry);
}

function heartOf(state) {
  return state.soul && state.soul.alive ? state.soul : null;
}

function orbOf(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_knight_lightorb') ?? null;
}

function quickslashControllerOf(state) {
  return state.entities.find(
    (e) => e.alive && e.type.name === 'obj_roaringknight_quickslash_attack',
  ) ?? null;
}

function knightOf(state) {
  return state.entities.find((e) => e.alive && e.type.name === 'obj_knight_enemy') ?? null;
}

function sparkCreateDraws(rng) {
  if (!rng) return;
  gmlIrandom(rng, 3);
  gmlChoose(rng, [WHITE]);
  gmlChoose(rng, [-1, 1]);
  gmlChoose(rng, [-1, 1]);
  gmlRandom(rng, 360);
}

function triangleCreateDraws(rng) {
  if (!rng) return;
  gmlRandom(rng, 360);
  gmlChoose(rng, [-1, 1]);
}

export const rouxlsPowerUpOrb = {
  name: 'obj_rouxls_power_up_orb',

  create(e) {
    e.init = 0;
    e.lifetime = 30;
    e.xx = e.x;
    e.yy = e.y;
    e.timer = 0;
    e.parenttarget = -1;
    e.thin = 0;
    e._type = 0;
    e.track_target = -4;
    e.xoff = 0;
    e.yoff = 0;
    e.distance_multiplier = 1;

    e.depth = 0;
  },

  draw(e, state) {
    const rng = state.gmlRng;
    const parent = e.parenttarget !== -1 && e.parenttarget && e.parenttarget.alive
      ? e.parenttarget : null;
    if (e.parenttarget !== -1 && !parent) {
      destroy(e, state);
      return;
    }
    if (parent) {
      e.xstart = parent.x;
      e.ystart = parent.y;
    }
    if (e.init === 0) {
      e.init = 1;
      if (e.thin) e.lifetime /= 2;
      if (e.track_target !== -4) { e.xstart = 0; e.ystart = 0; }
      let distance = (rng ? gmlRandomRange(rng, 70, 90) : 80) * e.distance_multiplier;
      if (e._type === 1) distance = rng ? gmlRandomRange(rng, 40, 45) : 42.5;
      e.xx = e.xstart + lengthdirX(distance, e.direction ?? 0);
      e.x = e.xx;
      e.yy = e.ystart + lengthdirY(distance, e.direction ?? 0);
      e.y = e.yy;
    }
    if (e.track_target !== -4 && e.track_target) {
      e.xoff = e.track_target.x;
      e.yoff = e.track_target.y;
    }
    e.timer += 1;
    if (e.timer > e.lifetime) {
      destroy(e, state);
      return;
    }
    const progress = e.timer / e.lifetime;
    e.x = lerp(e.xx, e.xstart, scrEaseIn(progress, 2)) + e.xoff;
    e.y = lerp(e.yy, e.ystart, scrEaseIn(progress, 2)) + e.yoff;
  },
};

export const knightBullethellBullet2 = {
  name: 'obj_knight_bullethell_bullet2',

  create(e, state) {
    regularbulletCreate(e, state);

    e.depth = 0;
    e.sprite_index = 'spr_sunbolt';

    e.mask = SUNBOLT_MASK;
  },

  step(e, state) {
    regularbulletStep(e, state);
  },

  collides(e, heart) {
    return enginePairHit(heart, e, SUNBOLT_MASK);
  },

  other15(e, state) {
    e.target = 0;
    e.damage = 103;
    collidebulletOther15(e, state);
  },
};

export const knightBullethell2 = {
  name: 'obj_knight_bullethell2',

  create(e, state) {
    e.timer = 0;
    e.con = 0;
    e.a = 0;
    e.b = 0;
    e.c = 0;
    e.dir = 90;
    e.spd = 20;
    e.frc = -0.04;

    e.depth = 0;
    e.visible = true;

    const target = heartOf(state);
    if (!target) {
      e.dir = 90;
      return;
    }

    const horiz = state.entities.find(
      (h) => h.alive && h.type.name === 'obj_knight_split_growtangle',
    );
    e.dir = pointDirection(e.x, e.y, target.x, target.y)
      - ((horiz && horiz.heart_y === -1) ? 24 : 50);
  },

  step(e, state) {
    const orb = orbOf(state);
    if (!orb) return;

    let dir = e.dir + Math.sin(e.timer / 10) * 15;
    if (orb.orbtype === 1) dir = e.dir;
    const heart = heartOf(state);
    if (heart && heart.y < e.y) dir -= 180;
    e.lastDir = dir;

    e.timer += 1;
    if (e.con === 0 && e.timer >= 0) {

      cueStop(state, 'snd_heartshot_dr_b');
      cue(state, 'snd_heartshot_dr_b', 0.8, 1);
      e.a = 0;
      e.b -= 0.1;
    }
    if (knightOf(state) && state.turntimer < 1) {
      destroy(e, state);
      return;
    }

    if (e.timer > 700) destroy(e, state);
  },
};

export const knightLightorb = {
  name: 'obj_knight_lightorb',

  create(e, state) {
    e.timer = 8;
    e.con = 0;
    e.siner = 0;
    e.ringcon = 0;
    e.count = 0;
    e.darken_alpha = 0;
    e.radius = 120;
    e.circle_alpha = 0;

    e.col = mergeColor(WHITE, getSwordcolor(state), 0.2);

    e.orbtype = kaizoSideb(state) ? 1 : 0;
    e.splitx = 0;

    e.depth = 0;
    e.image_blend = WHITE;

    e.drawScale = 0.8;
  },

  draw(e, state) {

    if (state.turntimer < 1) {
      destroy(e, state);
      for (const b of state.entities) {
        if (b.alive && b.type.name === 'obj_knight_bullethell2') destroy(b, state);
      }
      return;
    }

    const heart = heartOf(state);
    if (!heart) return;

    let scale = 0.8 + Math.sin(e.siner / 4) * 0.2;
    const rng = state.gmlRng;

    if (e.con === 0) {
      e.timer += 1;
      if (e.timer < 15 && e.darken_alpha < 0.35) e.darken_alpha += 0.05;
      if (e.timer > 15) e.darken_alpha -= 0.1;
      if (e.timer === 9) cue(state, 'snd_knight_stretch', 1.5, 0.6);
      if (e.timer % 3 === 0) scrShakescreen(state);

      if (rng) { gmlRandom(rng, 60); gmlRandom(rng, 60); }
      sparkCreateDraws(rng);

      if (e.timer < 40) {
        let aa = 0.25 - (e.timer / 100);
        if (aa < 0) aa = 0;
        e.flashAlpha = aa;
      } else {
        e.flashAlpha = 0;
      }

      if (e.timer < 18) {
        const d = spawn(state, rouxlsPowerUpOrb, { x: e.x, y: e.y });
        d.direction = rng ? gmlIrandom(rng, 360) : 0;
        d.lifetime = 12;
        d.depth = e.depth + 1;
        d.image_blend = e.image_blend;
      }

      scale = lerp(scale * 0.001, scale, e.timer / 40);
      if (e.timer === 40) {
        e.con = 1;
        e.timer = 0;
        cueStop(state, 'snd_knight_stretch');
        if (e.orbtype === 1) {

          spawn(state, knightBullethell2, { x: e.x - e.splitx, y: e.y });
          spawn(state, knightBullethell2, { x: e.x + e.splitx, y: e.y });
        }
      }

      if (e.orbtype === 1 && e.splitx < 60 && e.timer >= 30) e.splitx += 6;
    }

    if (e.con === 1) {
      e.timer += 1;
      let x2 = 0;
      if (e.orbtype === 1) x2 = e.splitx;
      let rep = 1;
      if (e.orbtype === 1) rep = 2;
      for (let r = 0; r < rep; r += 1) {

        triangleCreateDraws(rng);
        if (rng) { gmlRandom(rng, 0.5); gmlRandom(rng, 0.7); }

        if (rng) { gmlRandom(rng, 60); gmlRandom(rng, 60); }
        sparkCreateDraws(rng);

        if (e.timer % 10 === 0) {

          let basedir = 0;
          if (rng) {
            basedir = ((pointDirection(e.x + x2, e.y, heart.x + 10, heart.y + 10) + 36) - 2)
              + gmlIrandom(rng, 4);
          }
          e.count += 1;
          let n = 0;

          const ctrl = quickslashControllerOf(state);
          const knight = knightOf(state);
          const panic = (ctrl ? ctrl.local_turntimer < -60 : false)
            || (knight ? knight.difficulty === 0 : false);
          if (panic) {

            basedir = ((pointDirection(e.x + x2, e.y, heart.x + 10, heart.y + 10) + 36) - 30)
              + (rng ? gmlIrandom(rng, 60) : 0);
            if (e.count % 2 === 0) {
              basedir = pointDirection(e.x + x2, e.y, heart.x + 10, heart.y + 10);
            }
            for (let i = 0; i < 5; i += 1) {

              const spd = 5 + (rng ? gmlRandom(rng, 2) : 0);
              fireSunbolt(state, e.x + x2, e.y, basedir + (72 * n), spd);
              n += 1;
            }
          } else {

            if (e.count % 3 === 0 && x2 > 0) {
              basedir = pointDirection(e.x + x2, e.y, heart.x + 10, heart.y + 10);
            }
            if (e.count % 5 === 0 && x2 < 0) {
              basedir = pointDirection(e.x + x2, e.y, heart.x + 10, heart.y + 10);
            }
            for (let i = 0; i < 3; i += 1) {
              fireSunbolt(state, e.x + x2, e.y, basedir + (120 * n), 4.5);
              n += 1;
            }
          }

          cue(state, 'snd_stardrop', 1, 0.6 / rep);
        }

        x2 = e.splitx * -1;
      }
    }

    e.siner += 1;
    e.image_blend = (e.siner % 2 === 0) ? e.col : WHITE;
    e.drawScale = scale;

    e.drawSplit = (e.orbtype === 1 && e.con === 0 && e.timer > 29)
      || (e.orbtype === 1 && e.con === 1);

    if (state.turntimer < 1) {
      destroy(e, state);
      for (const b of state.entities) {
        if (b.alive && b.type.name === 'obj_knight_bullethell2') destroy(b, state);
      }
      return;
    }

    if (e.con === 0) {
      if (e.radius > 0) e.radius -= 4;
      if (e.circle_alpha < 0.4) e.circle_alpha += 0.1;
      e.discColor = getSwordcolor(state);
    }
  },
};

function fireSunbolt(state, x, y, direction, speed) {
  const b = spawn(state, knightBullethellBullet2, { x, y });

  b.direction = direction;
  b.speed = speed;
  b.sprite_index = 'spr_sunbolt';
  b.updateimageangle = 0;

  b.target = 0;
  b.damage = 166;

  b.updateimageangle = 1;
  b.image_angle = b.direction;
  b.gravity_direction = b.direction + 180;
  b.gravity = b.speed / 90;

  b.depth -= 100;

  scrLerpvar(state, spawn, b, 'gravity', b.gravity, 0, 30);
  return b;
}

export function spawnLightorb(state, x, y) {
  return spawn(state, knightLightorb, { x, y });
}

export { ledger as lightorbLedger };
