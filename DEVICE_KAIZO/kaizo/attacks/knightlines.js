

import { spawn, destroy } from '../../sim/entity.js';
import {
  scrApproach, pointDirection, pointDistance, lengthdirX, lengthdirY,
  gmlEq, gmlLte, gmlRound, clamp, mergeColor, WHITE, BLACK,
} from '../../sim/gml.js';

import { getSwordcolor } from './kaizo-colors.js';
import {
  gmlRandom, gmlIrandom, gmlRandomRange, gmlChoose, gmlU32,
} from '../../sim/rng.js';
import {
  regularbulletCreate, regularbulletStep, collidebulletOther15,
} from '../../sim/bullets/regularbullet.js';
import { lerpvar } from '../../sim/lerpvar.js';
import { scrAfterimage } from '../../sim/fx.js';
import {
  SWORDOL_MASK, HEART_MASK, masksOverlap, enginePairHit, grazeMaskAt,
} from '../../sim/masks.js';
import { roaringknightSlash } from '../../sim/attacks/roaringknight-slash.js';
import { tunnelslashBullet, afterimage } from '../../sim/attacks/knightlines.js';

import { KAIZO_SLASHTUNNEL_MASK } from './kaizo-hitboxes.js';
import { cue } from '../../sim/audio.js';
import { scrDamageSingle, gearOf } from '../../sim/damage.js';
import { grazeFactors } from '../../sim/equipment.js';
import { scrTensionheal } from '../../sim/tension.js';

export const kaizoTunnelslashBullet = Object.freeze({
  ...tunnelslashBullet,
  collides(e, heart) {

    if (e.active !== 1 && e.active !== true) return false;
    return enginePairHit(heart, e, KAIZO_SLASHTUNNEL_MASK);
  },
});

export { tunnelslashBullet, afterimage };

function boxOf(state) {
  return state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
}
function getBox(state, which) {
  const gt = boxOf(state);
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

function gtMinx(state) {
  const gt = boxOf(state);
  if (!gt) return state.view.x + 320 - 75;
  return gt.x - (75 * gt.image_xscale) / 2;
}
function gtMiny(state) {
  const gt = boxOf(state);
  if (!gt) return state.view.y + 170 - 75;
  return gt.y - (75 * gt.image_yscale) / 2;
}
function gtMaxy(state) {
  const gt = boxOf(state);
  if (!gt) return state.view.y + 170 + 75;
  return gt.y + (75 * gt.image_yscale) / 2;
}

export function kaizoIrandomRange(r, lo, hi) {

  const a = Math.round(lo);
  const b = Math.round(hi);

  const wLo = gmlU32(r);
  const wHi = gmlU32(r) & 0x7fffffff;
  const i63 = (BigInt(wHi) << 32n) | BigInt(wLo);
  return a + Number(i63 % BigInt(b - a + 1));
}

function kaizoSideb(state) {
  return state.kaizo?.sideb ? 1 : 0;
}

const DKGRAY = [64, 64, 64];

const AFTERIMAGE_TAG = [2, 0, 0];
const isTagged = (a) => Array.isArray(a.image_blend)
  && a.image_blend[0] === 2 && a.image_blend[1] === 0 && a.image_blend[2] === 0;

function damageWriterDoubleDraw(state) {
  for (const n of state.dmg?.list ?? []) {
    if (n.delaytimer !== 0) continue;
    n.delaytimer += 1;
    if (n.delaytimer === n.delay) {

      n.vspeed = -5 - gmlRandom(state.gmlRng, 2);
      n.vstart = n.vspeed;
      n.hspeed = 10;
    }
  }
}

const lerpvarEarly = { ...lerpvar, stepOrder: 1 };

function scrLerpvarEarly(state, target, varname, pointa, pointb, maxtime, easetype, easeinout) {
  const t = spawn(state, lerpvarEarly, { x: 0, y: 0 });
  t.target = target;
  t.varname = varname;
  t.pointa = pointa;
  t.pointb = pointb;
  t.maxtime = maxtime;
  if (easetype !== undefined) t.easetype = easetype;
  if (easeinout !== undefined) t.easeinout = easeinout;
  return t;
}

const scriptDelayed = {
  name: 'obj_script_delayed',
  create(e) {
    e.target = null;
    e.varname = '';
    e.value = undefined;
  },
  alarm: {
    0(e) {
      if (e.target && e.target.alive) e.target[e.varname] = e.value;
      destroy(e);
    },
  },
};

function scrVarDelay(state, target, varname, value, time) {
  const d = spawn(state, scriptDelayed, { x: 0, y: 0 });
  d.target = target;
  d.varname = varname;
  d.value = value;
  d.alarm[0] = time;
  return d;
}

export const carouselSword = {
  name: 'obj_regularbullet',

  create(e, state) {
    regularbulletCreate(e, state);
  },

  step(e, state) {
    regularbulletStep(e, state);
  },

  collides(e, heart) {
    if (e.active !== 1 && e.active !== true) return false;

    return enginePairHit(heart, e, SWORDOL_MASK);
  },

  other15: collidebulletOther15,
};

function carouselSwords(state) {
  const sw = state.entities
    .filter((x) => x.alive && x.type === carouselSword && x.flag !== undefined)
    .sort((a, b) => b.seq - a.seq);

  if (sw.length >= 3) state.kaizoCarouselOpened = true;
  if (!state.kaizoCarouselOpened && sw.length === 2) return sw.slice().reverse();
  return sw;
}

function sweepHitsHeart(state, s) {
  const heart = state.soul;
  if (!heart || !heart.alive) return false;
  const hp = state.soulPrev ?? heart;
  return masksOverlap(
    heart.mask ?? HEART_MASK, hp.x, hp.y,
    SWORDOL_MASK, s.x, s.y, s.image_xscale ?? 1, s.image_yscale ?? 1, s.image_angle ?? 0,
  );
}

function sweepHitsGrazebox(state, s, sizeFactor) {
  if (!state.soul || !state.soul.alive) return false;
  const gx = state.grazePrev ? state.grazePrev.x : state.soul.x + 10;
  const gy = state.grazePrev ? state.grazePrev.y : state.soul.y + 10;
  return masksOverlap(
    grazeMaskAt(sizeFactor), gx, gy,
    SWORDOL_MASK, s.x, s.y, s.image_xscale ?? 1, s.image_yscale ?? 1, s.image_angle ?? 0,
  );
}

function carouselStep(e, state) {
  const knightX = e.x + 120;
  const knightY = e.y + 76;
  const minX = gtMinx(state) + 16;
  e.timer += 1;
  e.fulltimer += 1;

  let swordsprite = 'spr_roaringknight_sword_ol';
  if (e.secretswords === 1) swordsprite = 'spr_roaringknight_sword_ol_alt';

  if (e.attack_con < 4) {
    if (state.turntimer > 0) state.turntimer = 999;
  }

  if (e.attack_con === 0) {

    if (e.timer === 1) {
      e.at_gshake = 0;
      e.at_swords = [];
      if (kaizoSideb(state)) {
        e.at_num = 34;
        e.at_delay = 1;
      } else {
        e.at_num = 18;
        e.at_delay = 3;
      }
      e.at_spin = 360 / e.at_num / e.at_delay;
    }
    e.image_speed = 0;
    e.image_index = 0;
    if (e.timer >= 2) {
      e.attack_con = 1;
      e.timer = 0;
      e.image_index = 1;
    }
  } else if (e.attack_con === 1) {

    if (e.image_index < 2) {
      e.image_index += 0.2;
    }
    if (e.timer % e.at_delay === 0 && e.at_num > 0) {
      e.at_num -= 1;
      cue(state, 'snd_swing', 3, 0.7);

      const s = spawn(state, carouselSword, { x: e.x, y: e.y });
      s.donehit = false;
      s.sprite_index = swordsprite;
      s.depth = e.depth - 1;
      s.image_alpha = 0;

      s.image_blend = BLACK;
      scrLerpvarEarly(state, s, 'image_alpha', 0, 1, 10);
      s.target = 0;
      s.damage = 210;
      s.grazepoints = 12.5;
      s.destroyonhit = 0;
      s.wall_destroy = 0;
      s.flag = 'A';
      s.ang = 90;
      s.aft = 0;
      s.yscale = 1.25;
      s.image_xscale = 1.25;
      s.image_yscale = 1.25;
      e.at_swords.push(s);
    }
    if (e.at_num <= 0) {
      e.attack_con = 2;
      e.timer = 13;
      e.atk_min = 1;
      if (kaizoSideb(state)) {
        e.atk_min = -3;
      }
    }
  } else if (e.attack_con === 2) {

    if (e.timer >= 15) {
      e.timer = Math.floor(e.atk_min);
      e.atk_min = scrApproach(e.atk_min, 8, 0.25);
      if (e.image_index > 3) {
        scrLerpvarEarly(state, e, 'image_index', 1, 2, 4);
      } else {
        scrLerpvarEarly(state, e, 'image_index', 4, 5, 4);
      }
      const rot = 15;
      const sr = 1 + kaizoSideb(state);
      for (let rep = 0; rep < sr; rep++) {
        if (e.at_swords.length > 0) {
          cue(state, 'snd_leaf_dodge', 0.8, 1 / sr);
          cue(state, 'snd_leaf_dodge', 0.75, 1 / sr);

          const swordID = gmlIrandom(state.gmlRng, e.at_swords.length - 1);
          const targetX = (boxOf(state)?.x ?? state.view.x + 320) + 160
            + gmlIrandom(state.gmlRng, 48);

          const slashY = kaizoIrandomRange(state.gmlRng, gtMiny(state) + 10, gtMaxy(state) - 10);
          let targetY = slashY + gmlRandomRange(state.gmlRng, -56, 56);
          targetY = clamp(targetY, gtMiny(state) - 12, gtMaxy(state) + 12);
          const slashdir = pointDirection(targetX, targetY, minX, slashY) + 1440;
          const s = e.at_swords[swordID];
          if (s && s.alive) {
            s.flag = 'B';
            s.blend_con = 0;
            s.blend1 = s.image_blend;
            s.blend2 = WHITE;
            s.targY = slashY;
            scrLerpvarEarly(state, s, 'x', s.x, targetX, rot, 2, 'out');
            scrLerpvarEarly(state, s, 'y', s.y, targetY, rot, 2, 'out');

            scrLerpvarEarly(state, s, 'direction',
              gmlChoose(state.gmlRng, [s.direction + 1080, s.direction + 1800]),
              slashdir, rot, 2, 'out');
            scrVarDelay(state, s, 'flag', 'C', rot + 1);
            scrVarDelay(state, s, 'blend_con', 0, rot + 1);

            scrVarDelay(state, s, 'blend1', WHITE, rot + 1);
            scrVarDelay(state, s, 'blend2', getSwordcolor(state), rot + 1);
            scrLerpvarEarly(state, s, 'blend_con', 0, 1, 10);
          } else {

          }
          e.at_swords.splice(swordID, 1);
        } else {
          e.attack_con = 3;
          e.timer = 0;
        }
      }
    }
  } else if (e.attack_con === 3) {

    if (e.timer >= 30) {
      state.turntimer = 0;
      e.attack_con = 4;

      knightTunnelSlasherCleanUp(e, state);
    }
  }

  if (e.attack_con > 0) {
    for (const s of carouselSwords(state)) {
      if (s.flag === 'A') {

        s.direction = gmlRandomRange(state.gmlRng, 176, 184);
        s.image_angle = s.direction;
        s.ang += e.at_spin;
        s.x = knightX + lengthdirX(24, s.ang);
        s.y = knightY + lengthdirY(100, s.ang);
        s.x -= gmlRound(knightY - s.y) / 8;
        s.depth = e.depth - lengthdirX(4, s.ang);
        if (process.env.KL_ORB) console.error(`[orb] f=${state.frame} seq=${s.seq} x=${s.x.toFixed(4)} y=${s.y.toFixed(4)} dir=${s.direction} depth=${s.depth.toFixed(3)}`);

        const dark = lengthdirX(-0.5, s.ang) + 0.5;
        s.image_blend = mergeColor(WHITE, DKGRAY, dark);
        if (!s.aft) {

          for (let r = 0; r < 2; r++) {
            const g = scrAfterimage(state, s);
            g.fadeSpeed = 0.08;
            const hs = gmlRandomRange(state.gmlRng, -2, 2);
            const vs = gmlRandomRange(state.gmlRng, -2, 2);

            g.speed = Math.sqrt(hs * hs + vs * vs);
            g.direction = pointDirection(0, 0, hs, vs);
          }
          s.aft = 1;
        }
      } else if (s.flag === 'B') {

        s.image_angle = s.direction;
        s.image_blend = mergeColor(s.blend1, s.blend2, s.blend_con);
      } else if (s.flag === 'C') {

        s.image_yscale = 0.3;

        if (gmlLte(1, s.blend_con)) {

          s.depth = e.depth - 5;
          if (e.attack_con === 3) {
            e.timer = 0;
          }
          scrLerpvarEarly(state, e, 'at_gshake', 4, 0, 4);
          const sr = 1 + kaizoSideb(state);
          cue(state, 'snd_knight_cut', 1, 1 / sr);
          cue(state, 'snd_impact', 1, 1 / sr);
          s.flag = 'D';
          const stepspd = 7.5;
          const afsteps = 4;
          let dist = pointDistance(s.x, s.y, minX, s.targY);
          const rep = Math.ceil(dist / stepspd);
          let repN = 0;
          const gf = grazeFactors(gearOf(state));
          for (let i = 0; i < rep; i++) {
            repN += 1;
            dist = pointDistance(s.x, s.y, minX, s.targY);
            const spd = Math.min(stepspd, dist);
            if (spd < 1) {
              s.x = minX;
              s.y = s.targY;
            } else {
              s.x += lengthdirX(spd, s.direction);
              s.y += lengthdirY(spd, s.direction);
              if (repN % afsteps === 1 && dist > afsteps * stepspd) {

                const g = scrAfterimage(state, s);
                g.fadeSpeed = 0.08;
                g.image_blend = AFTERIMAGE_TAG;
                g.image_yscale = s.image_yscale * 1.5;
                for (const a of state.entities) {
                  if (a.alive && a.type.name === 'obj_afterimage' && isTagged(a)) {
                    a.image_alpha -= a.fadeSpeed;
                  }
                }
              }
            }

            if (state.invTimer < 0 && !s.donehit) {
              if (sweepHitsHeart(state, s)) {
                s.donehit = 1;
              } else if (sweepHitsGrazebox(state, s, gf.size)) {
                if (s.grazed === 0) {
                  s.grazed = -1;
                  scrTensionheal(state, s.grazepoints * gf.tp);

                  cue(state, 'snd_graze');

                  state.grazeTimer = 10;
                }
              }
            }
          }

          s.grazed = 1;
          s.grazepoints = 0;
          s.image_yscale = s.yscale;
          for (const a of state.entities) {
            if (a.alive && a.type.name === 'obj_afterimage' && isTagged(a)) {

              a.image_blend = s.image_blend;
            }
          }
        }
        s.blend_con = scrApproach(s.blend_con, 1, 1 / (13 + kaizoSideb(state) * 2));

        s.image_blend = mergeColor(s.blend1, s.blend2, s.blend_con);
      } else if (s.flag === 'D') {

        if (s.donehit) {
          scrDamageSingle(state, s.damage, s.target ?? 0);
          s.donehit = false;
        }
      }
    }
  }

  if (e.fulltimer % 2 === 0) {
    const fade = scrAfterimage(state, e);
    fade.image_alpha = 0.6;
    fade.fadeSpeed = 0.04;
    fade.speed = 4;
    fade.direction = 0;
  }
}

export const knightTunnelSlasher = {
  name: 'obj_knight_tunnel_slasher',

  create(e, state) {
    e.sprite_index = 'spr_roaringknight_attack_ol';

    e.depth = e.depth ?? 0;
    e.image_speed = 0;
    e.image_index = 1;
    e.image_xscale = 2;
    e.image_yscale = 2;
    e.push_left = 4;
    e.timer = 0;
    e.fulltimer = 0;

    e.individuality = gmlRandom(state.gmlRng, 100);
    e.behavior = 'prepare';
    e.damage = 206;

    e.element = 5;
    e.boxpushcon = 0;
    e.boxpushstart = 0;
    e.attack_type = 0;
    e.attack_con = 0;

    e.secretswords = 0;

    if (gmlEq(state.currentAc ?? -1, 110)) e.attack_type = 1;
    if (e.attack_type === 1) {
      e.image_speed = 0;
      e.image_index = 0;
    }
  },

  step(e, state) {

    if (e.attack_type > 0) {
      if (e.attack_type === 1) {
        carouselStep(e, state);
      }
      return;
    }

    e.fulltimer += 1;
    e.damage = 206;

    if (e.boxpushstart === 1) {
      const gt = boxOf(state);
      if (e.boxpushcon > 89) {
        e.boxpushstart = -1;
      }
      if (e.boxpushcon < 33) {
        e.boxpushcon += 5;
        if (gt) gt.x -= 5;
        if (state.soul && state.soul.alive) state.soul.x -= 5;
      } else if (e.boxpushcon > 56) {
        e.boxpushcon += 2;
        if (gt) gt.x -= 2;
        if (state.soul && state.soul.alive) state.soul.x -= 2;
      } else {
        e.boxpushcon += 3;
        if (gt) gt.x -= 3;
        if (state.soul && state.soul.alive) state.soul.x -= 3;
      }
    }

    if (e.behavior === 'prepare') {
      e.damage = 206;
      e.image_index = scrApproach(e.image_index, 2.8, 0.2);
      if (e.push_left) {
        e.x -= e.push_left;
        e.push_left *= 0.8;
        if (e.push_left < 1) e.push_left = 1;
      }

      if (gmlEq(e.image_index, 2.8)) e.timer += 1;
      if (e.timer === 16) {
        e.push_left = 4;
        e.behavior = 'slash';
        e.timer = 0;
        e.image_index = 3;
      }
    }

    if (e.behavior === 'slash') {
      e.damage = 206;
      if (e.timer < 20) e.image_index = scrApproach(e.image_index, 5.6, 0.4);
      e.timer += 1;
      if (e.push_left) {

        e.x += e.push_left;
        e.push_left *= 0.9;
      }

      if (e.timer % 2 === 0 && e.timer < 24) {
        const offset = Math.sin(e.timer + e.individuality) * 100;
        const temptime = e.timer;
        cue(state, 'snd_smallswing', 3, 1);
        const sx = getBox(state, 0) + 50 + gmlRandom(state.gmlRng, 20) - e.timer * 2;

        const sy = getBox(state, 1) + getBox(state, 5) * 0.5 + offset;
        const slash = spawn(state, roaringknightSlash, { x: sx, y: sy });
        slash.direction = 240 + gmlRandom(state.gmlRng, 60);
        slash.image_angle = slash.direction;
        slash.damage = 206;

        const b = spawn(state, kaizoTunnelslashBullet, { x: sx, y: sy });
        b.sprite_index = 'spr_roaringknight_slash_tunnel';

        b.mask = KAIZO_SLASHTUNNEL_MASK;
        b.direction = gmlChoose(state.gmlRng, [slash.direction, slash.direction + 180]);
        b.speed = 0;

        b.image_angle = slash.direction;
        b.alarm[0] = 32 + temptime * 4;
        b.damage = 206;

      }

      if (e.timer === 20) e.image_index -= 1;
      if (e.timer === 24) {
        e.boxpushstart = 1;
        e.sprite_index = 'spr_roaringknight_point_ol';
        e.image_index = 0;
        e.damage = 206;
      }
      if (e.timer > 32 && e.timer < 56) {
        e.image_index = scrApproach(e.image_index, 4, 0.35);
        e.push_left = 1;
        e.damage = 206;
      }
    }

    if (e.fulltimer % 2 === 0) {
      const fade = scrAfterimage(state, e);
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.speed = 4;
      fade.direction = 0;
    }
  },

  endStep(e, state) {

    if (e.attack_type === 1 && e.attack_con > 1) {
      e.shake_x = gmlRandomRange(state.gmlRng, -e.at_gshake, e.at_gshake);
      e.shake_y = gmlRandomRange(state.gmlRng, -e.at_gshake, e.at_gshake);
      damageWriterDoubleDraw(state);
    }
  },

  draw(e, state) {
    if (e.attack_type !== 1) return;
    if (!(e.attack_con > 1 && e.attack_con < 4)) return;
    for (const gt of state.entities) {
      if (gt.alive && gt.type.name === 'obj_growtangle') gt.visible = false;
    }
    for (const a of state.entities) {
      if (a.alive && a.type.name === 'obj_afterimage'
        && a.sprite_index === 'spr_roaringknight_sword_ol_alt') a.visible = false;
    }
    for (const s of carouselSwords(state)) {
      if (s.flag === 'C' || s.flag === 'D') s.visible = false;
    }
    for (const t of state.entities) {
      if (t.alive && t.type.name === 'obj_tracking_sword1') t.visible = false;
    }
    if (state.soul && state.soul.alive) state.soul.visible = false;
  },
};

export function knightTunnelSlasherCleanUp(e, state) {
  for (const gt of state.entities) {
    if (gt.alive && gt.type.name === 'obj_growtangle') gt.visible = true;
  }
  if (state.soul && state.soul.alive) state.soul.visible = true;
}

export function launchKnightlines(state, x, y, opts = {}) {

  state.kaizoCarouselOpened = false;
  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );
  const gt = boxOf(state);

  if (gt && !(gt.growcon === 1 && gt.timer < gt.maxtimer)) gt.image_xscale = 2.5;
  if (knight) knight.image_alpha = 0;

  const e = spawn(state, knightTunnelSlasher, {
    x: x ?? knight?.x ?? 0,
    y: y ?? knight?.y ?? 0,
  });
  if (opts.damage !== undefined) e.damage = opts.damage;
  return e;
}
