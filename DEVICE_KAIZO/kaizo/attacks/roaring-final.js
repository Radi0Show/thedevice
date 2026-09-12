


import { spawn, destroy } from '../../sim/entity.js';
import {
  lengthdirX, lengthdirY, pointDirection, pointDistance, scrApproach, gmlEq,
  gmlLte, lerp, sign,
} from '../../sim/gml.js';
import {
  gmlChoose, gmlIrandom, gmlIrandomRange, gmlRandom, gmlRandomRange,
} from '../../sim/rng.js';
import { scrLerpvar } from '../../sim/lerpvar.js';
import { cue, cueSustain, cueTune, cueStop } from '../../sim/audio.js';

import { roaringStar } from './roaring-final-star.js';

import { roaringknightSlash } from '../../sim/attacks/roaringknight-slash.js';
import { scrBulletInherit } from '../../sim/bullets/regularbullet.js';
import {
  screenPiece, scrAfterimage, knightCircle, particleGeneric, afterimageScreen,
  afterimageGrow,
} from '../../sim/fx.js';

import { masksOverlap, HEART_MASK } from '../../sim/masks.js';

import { scrDamageAllMaxhp } from '../party/damage.js';

import {
  havechar, hpOfChar, setHpOfChar, buildRoster, NORMAL_ROUTE_PARTY,
} from '../party/roster.js';

import { FINALSLASH_MASK, HEART_2PX_MASK } from './knight-stream.js';
import {
  screenshatterCreate, screenshatterClear,
} from './roaring-final-shatter.js';



const C_RED = [255, 0, 0];
const C_BLACK = [0, 0, 0];
const C_WHITE = [255, 255, 255];



const STREAK_UNIT = 4;

export const roaring2 = {
  name: 'obj_knight_roaring2',

  create(e, state) {

    e.image_xscale = 2;
    e.image_yscale = 2;


    e.image_speed = 0;
    e.image_index = 0;


    e.y -= 320;


    if (state.knight) {
      state.knight.chargeupcon = 2;

      state.knight.chargeuptimer = 0;
    }

    e.timer = 0;
    e.intensity = 1.5;
    e.attack_timer = 0;
    e.roaring_timer = 0;
    e.player_suck = 0.5;

    e.fake_x = 320;
    e.fake_y = 24;

    e.fake_alpha = 0;

    e.rand_angle = gmlIrandom(state.gmlRng, 360);

    e.rand_dist = 320;
    e.starcount_p1 = 0;
    e.starcount_p2 = 0;
    e.spinspeed = 1;
    e.star_angle1 = -1;
    e.star_angle2 = -1;
    e.star_angle3 = -1;
    e.ball_speed = 0;
    e.ball_darkness = 0;
    e.ballDarknessDelay = 0;


    e.darkness = 0;
    e.star_flicker = 2;
    e.intensify = 1.5;
    e.line_timer = -1;
    e.r = 128;
    e.g = 128;
    e.b = 128;
    e.bobble_count = 0;
    e.bobble_freq = 1;
    e.bobble_amp = 4;
    e.ball_counter = 0;
    e.hsv = 128;
    e.hsv_switch = false;
    e.stop = false;
    e.do_fake_screen = false;
    e.jumpimages = false;
    e.jumpUpDelay = -1;
    e.jumpUpFrom = 0;


    e.darknessDelay = 20;

    e.knight_sprite = 'spr_roaringknight_front';
    e.knight_sprite_image = 0;
    e.knight_sprite_speed = 0.5;

    e.bullet_list = [];


    if (state.soul) state.soul.boundaryup = 160;


    e.sound = -4;
    e.roaring_type = 0;
    e.fix_draw = 0;

    if (state.currentAc === 104) {
      e.roaring_type = 1;
      e.final_con = 0;
      e.final_lines = [];
      e.final_xs = 1;
      e.hideback = -4;
      e.fake_xoff = 0;
      e.fake_yoff = 0;
      e.final_hit = 0;

      e.final_kill = 0;
    }
    e.hp_surf = -4;
    e.hp_alpha = 0.5;
    e.hp_visible = 0;
    e.hp_y = 48;

    screenshatterClear(state);
  },

  step(e, state) {

    if (e.roaring_type === 1) {
      roaringFinal(e, state);
      return;
    }

    e.timer += 1;


    if (e.timer === 132) {
      e.stretchPitch = 0.1;
      cueSustain(state, 'snd_knight_stretch', e.stretchPitch);
    }

    if (e.timer > 132 && e.stretchPitch !== undefined) {
      e.stretchPitch += 0.000535;
      cueTune(state, 'snd_knight_stretch', e.stretchPitch);
    }


    if (state.soul) {
      const vx = state.view.x;
      const vy = state.view.y;
      if (state.soul.x < vx) state.soul.x = vx;
      if (state.soul.x > vx + 640 - 20) state.soul.x = vx + 640 - 20;
      if (state.soul.y < vy) state.soul.y = vy;
      if (state.soul.y > vy + 480) state.soul.y = vy + 480 - 20;
    }


    if (e.jumpimages) {
      const g = scrAfterimage(state, e);
      g.sprite_index = e.sprite_index;
      g.image_index = e.image_index;
      g.fadeSpeed = 0.08;
    }


    if (e.line_timer > -1) e.line_timer += 1;
    e.bobble_count += e.bobble_freq;

    if (e.darknessDelay > 0) {
      e.darknessDelay -= 1;
      if (e.darknessDelay === 0) scrLerpvar(state, spawn, e, 'darkness', 0, 1, 32);
    }


    const DELAYED_TWEEN = 15;
    if (e.timer === 118) { e.ballDarknessDelay = DELAYED_TWEEN; e.ballDarknessTo = 1; }
    if (e.ballDarknessDelay > 0) {
      e.ballDarknessDelay -= 1;
      if (e.ballDarknessDelay === 0) {
        const to = e.ballDarknessTo ?? 1;
        scrLerpvar(state, spawn, e, 'ball_darkness', 1 - to, to, 32, 1);
      }
    }



    e.renderX = state.view.x + e.fake_x;
    e.renderY = state.view.y + e.fake_y;


    e.knight_sprite_image += e.knight_sprite_speed;





    if (e.timer === 30) {

      const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
      if (gt) {
        const sw = 75 * gt.image_xscale;
        const sh = 75 * gt.image_yscale;
        scrLerpvar(state, spawn, gt, 'image_xscale', gt.image_xscale, 2560 / sw, 160, 1);
        scrLerpvar(state, spawn, gt, 'image_yscale', gt.image_yscale, 1920 / sh, 160, 1);
      }
    }

    if (e.timer === 80) {

      e.fake_alpha = 0;
      scrLerpvar(state, spawn, e, 'fake_alpha', 0, 1, 48, 1);
      scrLerpvar(state, spawn, e, 'fake_y', 24, 88, 48, 2);
    }

    if (e.timer <= 128) return;

    e.intensity = scrApproach(e.intensity, 4, 0.008);


    if (gmlEq(e.intensity, 3.66)) {

      e.ballDarknessDelay = 15;
      e.ballDarknessTo = 0;

      const c = spawn(state, knightCircle, {
        x: state.view.x + e.fake_x,
        y: state.view.y + e.fake_y + 55,
      });
      c.r = 0; c.g = 0; c.b = 0;
      c.r_goal = 255; c.g_goal = 255; c.b_goal = 255;
      c.fade_time = 48;
      c.circle_size = 480;
      c.size_goal = 0;
      c.growth = 10;
      c.draw_in_box = false;
      c.visible = false;
      c.destroyAt = 48;
      scrLerpvar(state, spawn, c, 'r_goal', 0, 255, 48, 0);
      scrLerpvar(state, spawn, c, 'g_goal', 0, 255, 48);
      scrLerpvar(state, spawn, c, 'b_goal', 0, 255, 48, 1);
    }


    if (e.timer % 3 === 0 && e.intensity < 3.9) {

      const ay = state.view.y + e.fake_y + 55 + gmlIrandomRange(state.gmlRng, -30, 30);
      const ax = state.view.x + e.fake_x + gmlIrandomRange(state.gmlRng, -30, 30);
      const g = spawn(state, afterimageScreen, { x: ax, y: ay });
      g.faderate = 0.1 / e.intensity;
      g.draw_end = true;
      g.xrate = -0.01;
      g.yrate = -0.01;
    }

    if (gmlEq(e.intensity, 3.74) && e.knight_sprite === 'spr_roaringknight_front') {
      e.knight_sprite = 'spr_roaringknight_front_flourish';
      e.knight_sprite_image = 0;
      e.knight_sprite_speed = 0;
      scrLerpvar(state, spawn, e, 'knight_sprite_image', 0, 4, 16);

      e.fakeAlphaDelay = 7;
    }
    if (e.fakeAlphaDelay > 0) {
      e.fakeAlphaDelay -= 1;
      if (e.fakeAlphaDelay === 0) {
        scrLerpvar(state, spawn, e, 'fake_alpha', 1, 0, 32);
      }
    }


    const DRAW_INRUSH_STREAKS = false;
    if (e.timer >= 136 && e.intensity < 3.75) {
      const randangle = gmlIrandom(state.gmlRng, 360);
      const randdistance = 480 + gmlIrandom(state.gmlRng, 80);
      const px = state.view.x + e.fake_x + lengthdirX(randdistance, randangle);
      const py = state.view.y + e.fake_y + 55 + lengthdirY(randdistance, randangle);
      const cx = state.view.x + e.fake_x;
      const cy = state.view.y + e.fake_y + 55;
      if (!DRAW_INRUSH_STREAKS) {

        void px; void py; void cx; void cy;
      } else {
      const p = spawn(state, particleGeneric, { x: px, y: py });
      p.not_outbound = false;
      p.sprite_index = 'spr_pixel_white_front';
      p.direction = pointDirection(px, py, cx, cy);
      p.image_angle = p.direction;
      p.image_xscale = 16 / STREAK_UNIT;
      p.image_yscale = 0.5;
      p.timer = 18;
      scrLerpvar(state, spawn, p, 'image_xscale', 320 / STREAK_UNIT, 2 / STREAK_UNIT, 16);
      scrLerpvar(state, spawn, p, 'image_yscale', 2, 0.1, 16);
      scrLerpvar(state, spawn, p, 'image_alpha', 1, 0.5, 16);
      scrLerpvar(state, spawn, p, 'x', px, cx, 8, 1);
      scrLerpvar(state, spawn, p, 'y', py, cy, 8, 1);
      }
    }

    if (e.roaring_timer < 1 && e.intensity < 4) {
      e.ball_speed = e.intensity * 3;
      if (e.intensity < 3.75) {
        e.player_suck = scrApproach(e.player_suck, 1, 0.1625);
      }
    }

    e.player_suck = scrApproach(e.player_suck, 0, 0.15);

    const heart = state.soul;
    if (heart) {
      const tx = state.view.x + e.fake_x;
      const ty = state.view.y + e.fake_y + 55;

      const hp0 = state.soulPrev ?? heart;

      const cvx = state.view.x;
      const cvy = state.view.y;
      let hpx = hp0.x;
      let hpy = hp0.y;
      if (hpx < cvx) hpx = cvx;
      if (hpx > cvx + 640 - 20) hpx = cvx + 640 - 20;
      if (hpy < cvy) hpy = cvy;
      if (hpy > cvy + 480) hpy = cvy + 480 - 20;
      const hp = { x: hpx, y: hpy };

      const roarRow = state.roarReplay?.get(state.frame);
      const tempdir = roarRow?.tempdir ?? pointDirection(hp.x + 10, hp.y + 10, tx, ty);
      heart.x += lengthdirX(e.player_suck, tempdir);
      heart.y += lengthdirY(e.player_suck, tempdir);

      let shx = 0;
      let shy = 0;
      for (const sh of state.entities) {
        if (sh.alive && sh.type.name === 'obj_shake' && sh.active === 0) {
          shx = sh.shakex;
          shy = sh.shakey;
        }
      }
      if (heart.x >= state.view.x + shx + 640 - 20) heart.x = state.view.x + shx + 640 - 20;
      if (heart.x <= 0) heart.x = 0;
      if (heart.y <= 0) heart.y = 0;
      const hfloor = state.view.y + shy + 320 - 20 + (heart.boundaryup ?? 0);
      if (heart.y >= hfloor) heart.y = hfloor;
    }

    e.attack_timer += 1;


    if (e.attack_timer === 4) {
      e.rand_dist = 600;
      e.starcount_p1 += 1;

      e.spinspeed = gmlChoose(state.gmlRng, [-1, 1]);

      if (e.starcount_p1 === 1 && e.intensity < 3.7) {
        if (e.intensity >= 2.7) {

          e.rand_angle += 9;
          for (const off of [0, 180]) {
            const a = e.rand_angle + off;
            fireRingStar(state, e, a, 16);
          }
        } else {

          e.rand_angle += 32;
          for (let i = 0; i < 6; i++) {
            e.rand_angle += 60;
            fireRingStar(state, e, e.rand_angle, 8 + e.intensity);
          }
        }
      }

      if (e.starcount_p1 === 3 || e.intensity >= 2.7) e.starcount_p1 = 0;


      if (e.intensity >= 3 && e.intensity < 4) {
        const vx = state.view.x;
        const vy = state.view.y;
        for (const d of state.entities) {
          if (!d.alive || d.type.name !== 'obj_knight_roaring_star') continue;
          if (d.x < vx - 60) d.x = vx - 60;
          if (d.x > vx + 640 + 60) d.x = vx + 640 + 60;
          if (d.y < vy - 60) d.y = vy - 60;
          if (d.y > vy + 480 + 60) d.y = vy + 480 + 60;
        }
      }

      e.attack_timer = Math.floor(-1 + e.intensity);
    }


    if (e.intensity === 4) {
      e.roaring_timer += 1;

      if (e.roaring_timer < 169) {
        if (e.roaring_timer === 9) {

          if (state.soul) state.soul.mask = HEART_2PX_MASK;


          e.fake_alpha = 1;

          scrLerpvar(state, spawn, e, 'knight_sprite_image', 4, 6, 4);
          e.player_suck = Math.min(e.player_suck, -6);
          e.ball_speed = -32;
          e.ball_darkness = 1;
          scrLerpvar(state, spawn, e, 'bobble_freq', 1, 3, 8);
          cue(state, 'snd_knight_roar', 1);


          const flash = spawn(state, knightCircle, {
            x: state.view.x + e.fake_x,
            y: state.view.y + e.fake_y + 55,
          });
          flash.r = 255; flash.g = 255; flash.b = 255;
          flash.draw_in_box = false;
          flash.visible = false;


          e.roarGhosts = { left: 8, rate: 2, next: 0 };


          const burst = state.roarBurstSpeeds ?? null;
          for (let a = 0; a < 8; a++) {
            const spd = burst
              ? (burst[a] ?? 8.5)
              : 8.5 + gmlRandom(state.gmlRng, 2);
            fireRoarStar(state, e, a * 45, spd, 1.2);
          }
        }

        if (e.roarGhosts && e.roarGhosts.left > 0) {
          if (e.roarGhosts.next <= 0) {
            spawn(state, afterimageScreen, {
              x: state.view.x + e.fake_x,
              y: state.view.y + e.fake_y + 55,
            });
            e.roarGhosts.next = e.roarGhosts.rate;
          }
          e.roarGhosts.next -= 1;
          e.roarGhosts.left -= 1;
        }


        if (e.roaring_timer % 3 === 0) {

          const ay = state.view.y + e.fake_y + 55 + gmlIrandomRange(state.gmlRng, -30, 30);
          const ax = state.view.x + e.fake_x + gmlIrandomRange(state.gmlRng, -30, 30);
          const g = spawn(state, afterimageScreen, { x: ax, y: ay });
          g.xrate = 0.015;
          g.yrate = 0.015;
          g.faderate = 0.025;
          g.draw_end = true;
        }

        if (e.roaring_timer === 15) {

          e.knight_sprite = 'spr_roaringknight_front_roar';
          e.knight_sprite_image = 0;
          e.knight_sprite_speed = 0.5;
        }

        if (e.roaring_timer >= 9) e.player_suck = Math.min(e.player_suck, -3);

        if (e.roaring_timer > 15 && e.roaring_timer % 5 === 0) {

          cue(state, 'snd_stardrop', 0.5, 0.5);

          let fan;
          if (state.roarFans) {
            fan = state.roarFans[state.roarFanIndex++] ?? {
              rand: 0, s1: 6.5, s2: 8.5, s3: 8.5,
            };
          } else {
            fan = { rand: gmlIrandom(state.gmlRng, 10) };
          }
          e.rand_angle += 60 + fan.rand;


          e.star_angle1 = e.rand_angle;
          e.star_angle2 = e.rand_angle + 20;
          e.star_angle3 = e.rand_angle - 20;

          fireRoarStar(state, e, e.star_angle1, fan.s1 ?? (6.5 + gmlRandom(state.gmlRng, 2)), 1.6);
          fireRoarStar(state, e, e.star_angle2, fan.s2 ?? (8.5 + gmlRandom(state.gmlRng, 2)), 1.6);
          fireRoarStar(state, e, e.star_angle3, fan.s3 ?? (8.5 + gmlRandom(state.gmlRng, 2)), 1.6);
        }
      }

      if (e.roaring_timer === 181) {
        e.knight_sprite = 'spr_roaringknight_front_flourish';
        e.knight_sprite_speed = 0;
        scrLerpvar(state, spawn, e, 'knight_sprite_image', 5.99, 0, 12);


        scrLerpvar(state, spawn, e, 'player_suck', e.player_suck, 0, 24);
        for (const d of starsNewestFirst(state)) {
          d.friction = 0.5;
          e.bullet_list.push(d);
        }
      }

      if (e.roaring_timer === 275) {

        e.sprite_index = 'spr_roaringknight_front_slash';
        e.knight_sprite = 'spr_roaringknight_front_slash';
        scrLerpvar(state, spawn, e, 'knight_sprite_image', 0, 2, 8);
        scrLerpvar(state, spawn, e, 'image_index', 0, 2, 8);
        scrLerpvar(state, spawn, e, 'bobble_amp', 4, 0, 24);
        e.line_timer = 0;
        scrLerpvar(state, spawn, e, 'r', 128, 255, 16);
        scrLerpvar(state, spawn, e, 'g', 128, 0, 16);
        scrLerpvar(state, spawn, e, 'b', 128, 0, 16);
      }

      if (e.roaring_timer === 299) {

        e.x = state.view.x + e.fake_x;
        e.y = state.view.y + e.fake_y + 20;
        const gt299 = state.entities.find(
          (x) => x.alive && x.type.name === 'obj_growtangle',
        );
        if (gt299) {
          gt299.image_xscale = 0;
          gt299.image_yscale = 0;
        }
        scrLerpvar(state, spawn, e, 'knight_sprite_image', 2, 5, 6);
        scrLerpvar(state, spawn, e, 'image_index', 2, 5, 6);
        e.do_fake_screen = true;
        cue(state, 'snd_knight_cut', 1);


        const cut = spawn(state, roaringknightSlash, {
          x: state.view.x + 320 - lengthdirX(-160, 117),
          y: state.view.y + 240 - lengthdirY(-160, 117),
        });
        cut.direction = 117;
        cut.image_xscale = 4;
        cut.xscale = 4;
        cut.image_angle = 117;
        cut.width *= 4;
        cut.slashdir = -1;
        scrBulletInherit(e, cut);


        e.jumpimages = true;
        scrLerpvar(state, spawn, e, 'y', e.y, e.y + 40, 16, 1, 'out');
        e.jumpUpDelay = 16;
        e.jumpUpFrom = e.y + 40;
      }

      if (e.jumpUpDelay > 0) {
        e.jumpUpDelay -= 1;
        if (e.jumpUpDelay === 0) {
          scrLerpvar(state, spawn, e, 'y', e.jumpUpFrom, e.jumpUpFrom - 360, 24, 1, 'in');
        }
      }

      if (e.roaring_timer === 363) {

        e.jumpimages = false;
        const enemy = state.entities.find(
          (x) => x.alive && x.type.name === 'obj_knight_enemy',
        );
        if (enemy) {
          e.x = enemy.x;
          e.y = enemy.y;
        }
        e.sprite_index = 'spr_knight_warp';
        e.image_index = 5;
        e.image_speed = 0;
        scrLerpvar(state, spawn, e, 'image_index', 5, 8, 8);
      }

      if (e.roaring_timer === 375) {

        const knight = state.entities.find(
          (x) => x.alive && x.type.name === 'obj_knight_enemy',
        );
        if (knight) knight.image_alpha = 1;

        if (state.knight) state.knight.chargeupcon = 0;

        if (knight) knight.siner2 = 0;


        const gt = state.entities.find(
          (x) => x.alive && x.type.name === 'obj_growtangle',
        );
        if (gt) {
          gt.growcon = 3;
          gt.timer = 0;
        }

        state.turntimer = -1;
      }

      if (e.roaring_timer >= 182 && e.bullet_list.length) {

        const bul = e.bullet_list.shift();
        if (bul && bul.alive) bul.con = 1;
      }
    }


    if (e.roaring_timer < 1) {
      const tx = state.view.x + e.fake_x;
      const ty = state.view.y + e.fake_y + 55;
      for (const d of state.entities) {
        if (!d.alive || d.type.name !== 'obj_knight_roaring_star') continue;

        if (e.roaring_timer < 180) {
          const scale = Math.max(0.2, 0.0058823529411764705 * pointDistance(d.x, d.y, tx, ty));
          d.image_xscale = scale;
          d.image_yscale = scale;
          d.direction = pointDirection(d.x, d.y, tx, ty);

          const step = d.speed * 0.625 * (1 / e.intensity);
          const swirl = d.direction + 90 * d.spinspeed;
          d.x += lengthdirX(step, swirl);
          d.y += lengthdirY(step, swirl);
        }

        if (pointDistance(d.x, d.y, tx, ty) < 12) destroy(d);
      }
    }
  },





  beginStep(e) {
    if (!e.stop) e.star_flicker = 2 - e.star_flicker;
  },



  draw(e) {
    if (e.roaring_type !== 1 || e.stop) return;
    e.knight_sprite_image += e.knight_sprite_speed;
  },

  endStep(e, state) {

    if (state.soul && (e.timer ?? 0) > 128) {
      const heart = state.soul;

      if (heart.x >= state.view.x + 640 - 20) heart.x = state.view.x + 640 - 20;
      if (heart.x <= 0) heart.x = 0;
      if (heart.y <= 0) heart.y = 0;
      const hfloor = state.view.y + 320 - 20 + (heart.boundaryup ?? 0);
      if (heart.y >= hfloor) heart.y = hfloor;
    }


    if (e.do_fake_screen && !e.stop) {
      e.stop = true;

      for (const k of state.entities) {
        if (k.alive && k.type.name === 'obj_knight_pointing_starchild') destroy(k);
      }


      const left = spawn(state, screenPiece, {
        x: state.view.x + 160,
        y: state.view.y + 240,
      });
      left.piece = 0;
      left.direction = 180;
      left.gravity_direction = 180;
      left.gravityDelay = 12;
      scrLerpvar(state, spawn, left, 'speed', 15, 0.5, 12, 1, 'out');

      const right = spawn(state, screenPiece, {
        x: state.view.x + 480,
        y: state.view.y + 240,
      });
      right.piece = 1;
      right.direction = 0;
      right.gravity_direction = 0;
      right.gravityDelay = 12;
      scrLerpvar(state, spawn, right, 'speed', 14, 0.5, 12, 1, 'out');


      if (state.soul) {
        destroy(state.soul);
        state.soul = null;
      }
    }

    if (e.stop) return;


    if (e.roaring_type === 1) return;

    e.ball_counter += e.ball_speed;
    if (e.ball_counter < 0) e.ball_counter += 1800;
    if (e.ball_counter > 1800) e.ball_counter -= 1800;

    if (!e.hsv_switch) e.hsv += 1;
    else e.hsv -= 1;
    if (e.hsv >= 288) e.hsv_switch = true;
    if (e.hsv <= 128) e.hsv_switch = false;

    if (e.intensity < 3.75) e.intensify = e.intensity;
    else e.intensify = scrApproach(e.intensify, 0, 0.1);
  },



  cleanUp(e, state) {
    const knight = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_knight_enemy',
    );
    if (knight) {
      knight.image_alpha = 1;
      knight.siner2 = 0;
    }
    if (state.knight) state.knight.chargeupcon = 0;
    cueStop(state, 'snd_knight_stretch');
    cueStop(state, 'snd_knight_roar');
    cueStop(state, 'snd_stardrop');
    cueStop(state, 'snd_knight_cut');
    roaringFinalCleanUp(state, e);
  },
};


function starsNewestFirst(state) {
  return state.entities
    .filter((d) => d.alive && d.type.name === 'obj_knight_roaring_star')
    .sort((a, b) => b.seq - a.seq);
}



function fireRoarStar(state, e, direction, speed, finalScale) {
  const d = spawn(state, roaringStar, {
    x: state.view.x + e.fake_x,
    y: state.view.y + e.fake_y + 55,
  });
  d.wall_destroy = false;
  d.bottomfade = false;
  d.destroyonhit = false;
  d.direction = direction;
  d.speed = speed;
  d.image_xscale = 0.1;
  d.image_yscale = 0.1;
  scrLerpvar(state, spawn, d, 'image_xscale', 0.1, finalScale, 32);
  scrLerpvar(state, spawn, d, 'image_yscale', 0.1, finalScale, 32);
  return d;
}



function fireRingStar(state, e, angle, speed) {
  const cx = state.view.x + e.fake_x;
  const cy = state.view.y + e.fake_y;
  const d = spawn(state, roaringStar, {
    x: cx + lengthdirX(e.rand_dist, angle),
    y: cy + lengthdirY(e.rand_dist, angle),
  });
  d.wall_destroy = false;
  d.destroyonhit = false;
  d.bottomfade = false;

  d.spinspeed = 1;

  d.image_index = 0;
  d.image_speed = 0;
  d.image_xscale = 2;
  d.image_yscale = 2;
  d.direction = pointDirection(d.x, d.y, cx, cy + 55);
  d.speed = speed;
  d.friction = -0.1;
  return d;
}




function sideb(state) {
  return state.kaizo?.sideb ? 1 : 0;
}



const GROWTANGLE_SPRITE = 75;



export const finalSlashLine = {
  name: 'kaizo_roaring_finalslash_line',

  create(e) {
    e.image_speed = 0;
    e.image_index = 0;
    e.image_xscale = 1;
    e.image_yscale = 1;
    e.image_angle = 0;
    e.flag = '';
    e.sprite_index = 'spr_roaringknight_finalslash_mask';

    e.mask = FINALSLASH_MASK;
    e.image_blend = C_RED;
  },
};



export const hidebackCover = {
  name: 'kaizo_roaring_hideback',

  create(e) {
    e.image_speed = 0;
    e.image_index = 0;
    e.image_alpha = 1;
    e.image_xscale = 640;
    e.image_yscale = 480;
    e.image_blend = C_BLACK;
    e.sprite_index = 'spr_pxwhite';
  },
};



function finaleDamageAllMaxhp(state, fraction, ignoreDefend, cannotFell) {
  const k = (state.kaizo ??= {});
  const hadRoster = !!k.roster;
  if (!hadRoster) k.roster = buildRoster(NORMAL_ROUTE_PARTY, { sideb: !!k.sideb });
  try {
    return scrDamageAllMaxhp(state, fraction, ignoreDefend, cannotFell);
  } finally {
    if (!hadRoster) delete k.roster;
  }
}



function fireFinaleStar(state, e, sx, sy, opts) {
  const d = spawn(state, roaringStar, { x: sx, y: sy });
  d.startype = opts.startype;
  d.outbound = false;
  d.spec = 1;
  d.wall_destroy = false;
  d.destroyonhit = false;
  d.bottomfade = false;
  d.spinspeed = 0;
  d.image_index = 0;
  d.image_speed = 0;
  d.image_xscale = opts.scale;
  d.image_yscale = opts.scale;
  d.speed = 0;
  d.direction = opts.direction;
  if (opts.distance !== undefined) d.distance = opts.distance;
  d.rotspeed = e.attack_spd * e.attack_spdir;
  return d;
}


function finaleStars(state) {
  return state.entities
    .filter((d) => d.alive && d.type.name === 'obj_knight_roaring_star')
    .sort((a, b) => b.seq - a.seq);
}



function roaringFinal(e, state) {

  if (e.hp_visible) {
    if (e.hp_y > 0.5) e.hp_y = lerp(e.hp_y, 0, 0.5);
    else e.hp_y = 0;
  }


  const heart = state.soul;
  const cvx = state.view.x;
  const cvy = state.view.y;
  if (heart) {
    heart.mask = HEART_2PX_MASK;
    if (heart.x < cvx) heart.x = cvx;
    if (heart.x > cvx + 640 - 20) heart.x = cvx + 640 - 20;
    if (heart.y < cvy) heart.y = cvy;
    if (heart.y > cvy + 480 - 20) heart.y = cvy + 480 - 20;
  }


  const knightX = cvx + e.fake_x + e.fake_xoff;
  const knightY = cvy + e.fake_y + 55 + e.fake_yoff;


  if (e.jumpimages) {
    const g = scrAfterimage(state, e);
    g.sprite_index = e.sprite_index;
    g.image_index = e.image_index;
    g.fadeSpeed = 0.08;
  }
  e.timer += 1;
  if (e.line_timer > -1) e.line_timer += 1;
  e.bobble_count += e.bobble_freq;

  if (e.final_con === 0) {

    e.player_suck = 0;

    if (e.timer === 30) {

      state.invc = 0.8;

      for (const gt of state.entities) {
        if (!gt.alive || gt.type.name !== 'obj_growtangle') continue;
        scrLerpvar(state, spawn, gt, 'image_xscale', gt.image_xscale,
          2560 / (GROWTANGLE_SPRITE * gt.image_xscale), 160, 1, 'out');
        scrLerpvar(state, spawn, gt, 'image_yscale', gt.image_yscale,
          1920 / (GROWTANGLE_SPRITE * gt.image_yscale), 160, 1, 'out');
      }
    }

    if (e.timer === 80) {

      scrLerpvar(state, spawn, e, 'fake_alpha', 0, 1, 48, 1, 'out');
      scrLerpvar(state, spawn, e, 'fake_y', 24, 88, 48, 2, 'out');
    }

    if (e.timer >= 120) {
      e.final_con = 1;

      e.timer = -1;
      e.attack_timer = 0;
      e.attack_max = 10;
      e.attack_dir = 0;
      e.attack_grav = 8;
      e.attack_spd = 0.5;
      e.attack_spdir = 1;
      e.attack_con = 0;
      e.attack_ind = 0;
      e.attack_sep = 15;
      e.attack_arr = [];
      e.attack_mult = 1;
    }
  } else if (e.final_con === 1) {

    if (e.timer > 16 && e.attack_con < 2) {
      e.intensity = scrApproach(e.intensity, 3.5, 0.015);
      e.ball_speed = e.intensity * 3;

      e.player_suck = scrApproach(e.player_suck, 1, 0.0125);

      if ((e.timer % 3) === 0) {

      }


      const randangle = gmlIrandom(state.gmlRng, 360);
      const randmult = 0.1 + (e.intensity / 10);
      const randdistance = (320 + gmlIrandom(state.gmlRng, 80)) * randmult;
      void randangle; void randmult; void randdistance;
    }

    if (e.timer === 0) {

      e.finalBallDarknessDelay = 15;
    }
    if (e.finalBallDarknessDelay > 0) {
      e.finalBallDarknessDelay -= 1;
      if (e.finalBallDarknessDelay === 0) {
        scrLerpvar(state, spawn, e, 'ball_darkness', 0, 1, 32, 1, 'out');
      }
    }

    if (e.timer === 16) {

      e.hideback = spawn(state, hidebackCover, { x: cvx, y: cvy });
      e.sound = 'snd_knight_beam';
      e.beamPitch = 0.08;
      cueSustain(state, 'snd_knight_beam', 0.08);
    }

    if (e.timer > 16 && e.sound !== -4 && e.attack_con < 2) {

      e.beamPitch += 0.0002;
      cueTune(state, 'snd_knight_beam', e.beamPitch);
    }

    const diststart = 640;

    if (gmlEq(e.attack_con, 0)) {

      if (e.timer > 16) {
        e.attack_timer += 1;

        e.attack_max = 14 - (e.intensity * 3);
        e.attack_grav = scrApproach(e.attack_grav, 12.5, 0.02);
        e.attack_spd = scrApproach(e.attack_spd, 1.5, 0.015);
      }
      const staramt = sideb(state) ? 8 : 7;
      const stardist = 360 / staramt;
      if (e.attack_timer >= e.attack_max) {
        e.attack_ind += 1;

        e.attack_timer -= (e.attack_max + (7 - (e.intensity / 2.75)));
        e.attack_spdir = -e.attack_spdir;
        e.attack_dir += (stardist / 3);
        e.attack_dir %= 360;
        for (let i = 0; i < staramt; i++) {
          const rot = (360 / staramt) * i;
          const bulang = rot + e.attack_dir;
          fireFinaleStar(
            state, e,
            knightX + lengthdirX(diststart, bulang),
            knightY + lengthdirY(diststart, bulang),
            { startype: 1, scale: 2, direction: bulang, distance: diststart },
          );
        }
      }

      if ((e.attack_ind % 3) === 0 && gmlLte(12.5, e.attack_grav) && e.attack_timer <= 0) {

        e.attack_mult = 1;
        e.attack_spdir = 1.5;
        e.attack_spd = 1.5;
        e.attack_con = 1;
        e.attack_max = 10;
        scrLerpvar(state, spawn, e, 'fake_y', e.fake_y, e.fake_y + 72, 80, 2, 'out');
        e.knight_sprite = 'spr_roaringknight_front_flourish';
        e.knight_sprite_image = 0;
        e.knight_sprite_speed = 0;
        scrLerpvar(state, spawn, e, 'knight_sprite_image', 0, 4, 30);
      }
    } else if (gmlEq(e.attack_con, 1)) {

      if (e.timer > 16) {
        let maxinc = 0.125;
        let spdinc = 0.0061;
        let gravinc = 0.021;
        if (sideb(state)) {

          maxinc *= 0.55;
          spdinc *= 0.55;
          gravinc *= 0.55;
        }
        e.attack_timer += 1;
        e.attack_max = scrApproach(e.attack_max, 3, maxinc);
        e.attack_grav = scrApproach(e.attack_grav, 18, gravinc);
        e.attack_spd = scrApproach(e.attack_spd, 3, spdinc);
        e.attack_spdir = scrApproach(e.attack_spdir, 3, spdinc);
      }
      const staramt = sideb(state) ? 8 : 7;
      const stardist = 360 / staramt;
      void stardist;
      if (e.attack_timer >= e.attack_max) {
        e.attack_ind += 1;

        e.attack_timer -= e.attack_max;
        e.attack_dir += ((e.attack_spdir / 1.25) * e.attack_mult);
        e.attack_dir %= 360;
        for (let i = 0; i < staramt; i++) {
          const rot = (360 / staramt) * i;
          const bulang = rot + e.attack_dir;
          fireFinaleStar(
            state, e,
            knightX + lengthdirX(diststart, bulang),
            knightY + lengthdirY(diststart, bulang),
            { startype: 1, scale: 2, direction: bulang, distance: diststart },
          );
        }
      }
      if (e.attack_grav >= 18) {

        e.attack_con = 1.5;
        scrLerpvar(state, spawn, e, 'attack_con', 1.5, 2, 16);
        scrLerpvar(state, spawn, e, 'intensity', e.intensity, 4, 10);
        scrLerpvar(state, spawn, e, 'ball_darkness', e.ball_darkness, 0.5, 15);

      }
    } else if (e.attack_con < 2) {

      e.beamPitch = (e.beamPitch ?? 0.08) + 0.02;
      cueTune(state, 'snd_knight_beam', e.beamPitch);
    } else if (gmlEq(e.attack_con, 2)) {

      scrLerpvar(state, spawn, e, 'player_suck', e.player_suck, 0, 20);
      scrLerpvar(state, spawn, e, 'ball_darkness', e.ball_darkness, 0, 4);
      e.attack_con = 2.1;
      scrLerpvar(state, spawn, e, 'attack_con', 2.1, 2.5, 20);
      cue(state, 'snd_great_shine', 0.8, 0.7);
      cue(state, 'snd_great_shine', 1.2, 0.85);
    } else if (gmlEq(e.attack_con, 2.5)) {

      e.attack_con = 2.51;
      scrLerpvar(state, spawn, e, 'fake_y', e.fake_y, e.fake_y + 240, 25, 2, 'out');
      scrLerpvar(state, spawn, e, 'attack_con', 2.51, 3, 8);
    } else if (gmlEq(e.attack_con, 3)) {

      cueStop(state, 'snd_knight_beam');
      e.sound = -4;
      cue(state, 'snd_knight_roar', 0.9, 0.5);
      cue(state, 'snd_knight_roar', 0.75, 0.5);
      cue(state, 'snd_knight_roar', 0.5, 0.5);
      e.final_con = 2;
      e.attack_con = 0;

      e.player_suck = 18;

      e.timer = 1000;
      scrLerpvar(state, spawn, e, 'knight_sprite_image', 4, 6, 3);
      for (const d of finaleStars(state)) destroy(d);
    }


    if (heart && e.final_con === 1) {

      const hp0 = state.soulPrev ?? heart;
      let hpx = hp0.x;
      let hpy = hp0.y;
      if (hpx < cvx) hpx = cvx;
      if (hpx > cvx + 640 - 20) hpx = cvx + 640 - 20;
      if (hpy < cvy) hpy = cvy;
      if (hpy > cvy + 480 - 20) hpy = cvy + 480 - 20;
      const tempdir = pointDirection(hpx + 10, hpy + 10, knightX, knightY);
      heart.x += lengthdirX(e.player_suck, tempdir);
      heart.y += lengthdirY(e.player_suck, tempdir);
    }
  } else if (e.final_con === 2) {

    const spdmult = Math.min(e.attack_grav / 17, 1);
    const tm = e.timer - 1000;

    if (tm === 1) {
      e.ball_speed = -32;
      e.ball_darkness = 1;
      scrLerpvar(state, spawn, e, 'bobble_freq', 1, 3, 8);
      const c = spawn(state, knightCircle, { x: knightX, y: knightY });
      c.r = 255;
      c.g = 255;
      c.b = 255;
      c.draw_in_box = false;
      e.attack_spd = 4.5;
      e.attack_dir = 64;
      e.attack_spdir = 1;
      if (!sideb(state)) {
        e.attack_timer = 11;
        e.attack_max = 11;
        e.attack_grav = 17;

        scrLerpvar(state, spawn, e, 'attack_max', 11, 9, 220);
        scrLerpvar(state, spawn, e, 'attack_grav', 17, 18.2, 209);
      } else {
        e.attack_timer = 10;
        e.attack_max = 10;

        scrLerpvar(state, spawn, e, 'attack_max', 10, 8, 220);
        scrLerpvar(state, spawn, e, 'attack_grav', 17, 18.2, 209);
      }
    } else if (tm >= 4) {

      if (gmlEq(e.attack_max, 9 - sideb(state))) {
        if (e.knight_sprite === 'spr_roaringknight_front_roar') {
          e.knight_sprite = 'spr_roaringknight_front_flourish';
          e.knight_sprite_image = 6;
          e.knight_sprite_speed = 0;

          scrLerpvar(state, spawn, e, 'knight_sprite_image', 6, 0, 35);
          scrLerpvar(state, spawn, e, 'ball_speed', e.ball_speed, e.ball_speed / 16, 70);
          scrLerpvar(state, spawn, e, 'bobble_freq', 3, 1, 60);
          scrLerpvar(state, spawn, e, 'attack_grav', e.attack_grav, 0, 70);
          scrLerpvar(state, spawn, e, 'player_suck', e.player_suck, 0, 70);
          scrLerpvar(state, spawn, e, 'intensity', e.intensity, 0, 30);
        }
        if (gmlEq(e.knight_sprite_image, 0)) {
          e.fix_draw = 1;
          e.sprite_index = 'spr_roaringknight_front_slash';
          e.final_con = 3;
          e.knight_sprite = 'spr_roaringknight_front_slash';
          e.attack_max = 8;
          scrLerpvar(state, spawn, e, 'fake_y', e.fake_y, 170, 40, 2, 'out');
          scrLerpvar(state, spawn, e, 'knight_sprite_image', 0, 2.5, 41);
        }
      } else {

        e.player_suck = scrApproach(e.player_suck, 2.5, 1);
      }

      e.attack_timer += spdmult;

      if (tm === 4) {
        for (const rates of [[0.03, 0.02], [0.06, 0.04], [0.09, 0.08]]) {
          const g = spawn(state, afterimageScreen, { x: knightX, y: knightY });
          g.xrate = rates[0];
          g.yrate = rates[0];
          g.faderate = rates[1];
          g.draw_end = true;
        }
        e.knight_sprite = 'spr_roaringknight_front_roar';
        e.knight_sprite_image = 0;
        e.knight_sprite_speed = 0.35;
      }

      if (e.attack_timer >= e.attack_max) {
        cue(state, 'snd_stardrop', 0.5, 0.5);
        const starscale = 1.18;
        const asep = 124;
        const asepB = asep * 2;
        let leftB = -asepB;
        let rightB = 640 + asepB;

        e.attack_ind += 1;
        e.attack_timer -= e.attack_max;
        e.attack_dir += (asep / 4);
        e.attack_dir %= asep;
        e.attack_ind = sign(e.attack_spdir);
        if (e.attack_spdir === -1) {

          const stuff = [leftB, rightB];
          leftB = stuff[1];
          rightB = stuff[0];
        }
        let i = leftB;

        while (i !== rightB) {
          const xx = cvx + i + (e.attack_dir * e.attack_spdir);

          const yy = cvy + 480 + 80 + (24 * e.attack_ind);
          e.attack_ind = -e.attack_ind;
          fireFinaleStar(state, e, xx, yy, {
            startype: 2, scale: starscale, direction: 0,
          });
          i = scrApproach(i, rightB, asep);
        }
        e.attack_spdir = -e.attack_spdir;
      }
    }


    if (heart) heart.y -= e.player_suck;
  } else if (e.final_con === 3) {
    finalCut(e, state, heart, cvx, cvy);
  }

  finaleStarDrive(e, state, knightX, knightY);
  finaleGhostPin(e, state, cvx, cvy);
  finaleDrawBookkeeping(e, state);
}



function finalCut(e, state, heart, cvx, cvy) {
  const spdmult = Math.min(e.attack_grav / 17, 1);
  void spdmult;

  if (gmlEq(e.attack_con, 0)) {

    if (e.knight_sprite === 'spr_roaringknight_front_slash') {
      if (e.knight_sprite_image >= 2.5) {
        cue(state, 'snd_knight_cut', 1, 0.8);
        cue(state, 'snd_knight_cut', 0.6, 0.6);
        e.attack_con = 1;
        e.knight_sprite_image = 2.5;
        e.attack_timer = 0;
      }
    }
  } else if (gmlEq(e.attack_con, 1)) {

    e.attack_timer += 1;
    e.knight_sprite_image = scrApproach(e.knight_sprite_image, 5, 1);
    e.sprite_index = e.knight_sprite;
    e.image_index = e.knight_sprite_image;
    if (gmlEq(e.knight_sprite_image, 3.5)) {

      cue(state, 'snd_explosion_firework', 1, 0.8);
      cue(state, 'snd_explosion_firework', 0.6, 0.6);
      cue(state, 'snd_explosion_firework', 0.8, 0.6);
      for (const d of finaleStars(state)) {
        d.spec = 0;
        d.outbound = true;
        d.con = 101;
      }
    }
    if (e.attack_timer === 45) {
      e.attack_con = 2;
      e.attack_timer = 0;
      e.attack_ind = 0;
    }
  } else if (gmlEq(e.attack_con, 2)) {

    e.attack_timer += 1;
    if ((e.attack_timer % 2) === 0) {

      const jx = gmlIrandomRange(state.gmlRng, -48, 48);
      const jy = gmlIrandomRange(state.gmlRng, -36, 36);
      scrLerpvar(state, spawn, e, 'fake_xoff', e.fake_xoff, jx, 2);
      scrLerpvar(state, spawn, e, 'fake_yoff', e.fake_yoff, jy, 2);
      e.attack_ind += 1;
      e.final_xs = -e.final_xs;
      e.knight_sprite_image = 4;
      e.knight_sprite_speed = -1;
      cueStop(state, 'snd_knight_cut2');
      cue(state, 'snd_knight_cut2');
      for (let r = 0; r < 2; r++) {
        const lx = gmlIrandom(state.gmlRng, 639);
        const ly = gmlIrandom(state.gmlRng, 419);
        const lr = gmlIrandom(state.gmlRng, 360);
        const line = spawn(state, finalSlashLine, { x: lx, y: ly });
        line.flag = 'finalslash';
        line.mask = FINALSLASH_MASK;

        line.image_xscale = 0.2;
        line.image_yscale = 800;
        line.image_angle = lr;
        line.image_blend = C_RED;

        line.visible = false;

        e.final_lines.push(line);

        gmlRandomRange(state.gmlRng, -8, 8);
        gmlRandomRange(state.gmlRng, -8, 8);
      }
    }
    if (e.attack_ind >= 15) {

      cue(state, 'snd_knight_jump', 0.6, 0.9);
      cue(state, 'snd_knight_jump', 0.85, 0.9);
      e.attack_con = 3;
      e.attack_timer = 0;
      e.knight_sprite_speed = 0;
      e.knight_sprite_image = 1;
      scrLerpvar(state, spawn, e, 'fake_xoff', e.fake_xoff, 0, 28, 2, 'out');

      scrLerpvar(state, spawn, e, 'fake_yoff', e.fake_yoff, 100 - e.fake_y, 28, 2, 'out');
      scrLerpvar(state, spawn, e, 'knight_sprite_image', 1, 2.4, 28);
    }
  } else if (gmlEq(e.attack_con, 3)) {

    const finalY = e.fake_y + e.fake_yoff;
    e.attack_max = (4 + Math.abs(finalY - 100)) / 4;
    e.attack_timer += 1;
    if (e.attack_timer >= e.attack_max) {
      e.attack_timer = 0;
    }
    if (finalY <= 100) {
      e.attack_timer = 0;
      e.attack_con = 4;
      scrLerpvar(state, spawn, e, 'knight_sprite_image', 2, 5, 3);
    }
  } else if (gmlEq(e.attack_con, 4)) {

    e.attack_timer += 1;

    if (e.attack_timer === 1) {

      cueStop(state, 'snd_knight_jump');
      cue(state, 'snd_knight_cut', 0.8, 0.8);
      cue(state, 'snd_knight_cut2', 0.6, 0.8);
      for (let i = 0; i < e.final_lines.length; i++) {
        const line = e.final_lines[i];
        if (!line || !line.alive) continue;
        line.image_blend = C_WHITE;
        line.image_xscale = 0.4;

      }
    }

    if (e.attack_timer === 2) {
      e.final_hit = 0;
      e.final_kill = 0;
      for (let i = 0; i < e.final_lines.length; i++) {
        const hitbox = e.final_lines[i];

        e.image_xscale = 0.3;
        if (hitbox && hitbox.alive) {

          const hit = !!heart && masksOverlap(
            heart.mask ?? HEART_MASK, heart.x, heart.y,
            FINALSLASH_MASK, hitbox.x + cvx, hitbox.y + cvy,
            hitbox.image_xscale, hitbox.image_yscale, hitbox.image_angle,
          );
          if (hit) {
            if (state.invTimer < 0) {
              e.final_hit = 1;

              finaleDamageAllMaxhp(state, 0.75, 1, 0);
              state.invTimer = state.invc * 30;
            }
          }
        }

        let wiped = true;
        for (let c = 1; c <= 4; c++) {
          if (havechar(state, c) && !(hpOfChar(state, c) < 0)) wiped = false;
        }
        if (wiped) {
          e.final_kill = 1;

          for (let c = 1; c <= 4; c++) setHpOfChar(state, c, 1);

        }
        e.image_xscale = 0.2;
      }
    }

    if (e.attack_timer === 3) {
      e.attack_con = 5;
      e.attack_timer = 0;
    }
  } else if (gmlEq(e.attack_con, 5)) {

    e.attack_con = 6;

    if (e.final_hit) e.attack_timer = -6;
    if (e.hideback && e.hideback !== -4 && e.hideback.alive) {

      e.hideback.depth = -999;
      if (e.final_kill === 0) {
        scrLerpvar(state, spawn, e.hideback, 'image_alpha', 1, 0, 45);
      }
    }

    screenshatterCreate(state, { finalHit: !!e.final_hit });
    if (state.knight) {
      state.knight.image_alpha = 1;
      state.knight.state = 0;
    }
    cue(state, 'snd_impact', 1, 0.6);
    e.stop = true;
    for (const gt of state.entities) {
      if (!gt.alive || gt.type.name !== 'obj_growtangle') continue;
      gt.visible = false;
      gt.growcon = 3;
      gt.timer = 0;
    }
    for (const k of state.entities) {
      if (k.alive && k.type.name === 'obj_knight_pointing_starchild') destroy(k);
    }
    if (heart) heart.visible = false;
  } else if (gmlEq(e.attack_con, 6)) {

    e.attack_timer += 1;
    if (e.attack_timer === 1) {
      cue(state, 'snd_glassbreak', 0.75, 0.8);
      cue(state, 'snd_glassbreak', 0.5, 0.75);
      cue(state, 'snd_glassbreak', 0.4, 0.7);
    }

    state.turntimer = 4;

    if (e.final_kill && e.attack_timer > 1) {

      e.attack_timer = 2;
      const remaining = state.knight?.shatter_sprs?.length ?? 0;
      if (remaining === 0) {
        (state.kaizo ??= {}).finalFailure = true;
        state.turntimer = -1;
        if (heart) {
          destroy(heart);
          state.soul = null;
        }
      }
    }

    if (e.attack_timer >= 60) {

      state.turntimer = -1;
      if (heart) {
        destroy(heart);
        state.soul = null;
      }
    }
  }


  e.sprite_index = e.knight_sprite;
  e.image_index = e.knight_sprite_image;
}



function finaleStarDrive(e, state, knightX, knightY) {
  for (const d of finaleStars(state)) {
    if (d.startype === 1) {
      let maxscale = 2.4;
      let addscale = 0.2;
      if (gmlEq(e.attack_con, 0)) {

      } else if (gmlEq(e.attack_con, 1)) {
        maxscale = 2.5;
        addscale = 0.3;
        if (e.attack_grav > 13) addscale += ((e.attack_grav - 13) * 0.007);
        if (sideb(state)) {

          maxscale = 2.4;
          addscale = 0.2;
          if (e.attack_grav > 13) addscale += ((e.attack_grav - 13) * 0.005);
        }
      } else if (e.attack_con < 3) {
        maxscale = 2.5;
        addscale = 0.342;
        if (sideb(state)) {
          maxscale = 2.4;
          addscale = 0.2;
          if (e.attack_grav > 13) addscale += ((e.attack_grav - 13) * 0.005);
        }
      }
      const diststart = 640;
      const scalefac = diststart / maxscale;
      d.direction += (d.rotspeed * e.attack_mult);
      d.distance -= e.attack_grav;
      d.image_xscale = Math.max(d.distance / scalefac, 0.1) + addscale;
      d.image_yscale = Math.max(d.distance / scalefac, 0.1) + addscale;
      d.x = knightX + lengthdirX(d.distance, d.direction);
      d.y = knightY + lengthdirY(d.distance, d.direction);
      if (d.distance <= 0) {
        d.x = knightX;
        d.y = knightY;

        if (d.distance <= -0.25) destroy(d);
      }
    } else if (d.startype === 2) {
      const sm = Math.min(e.attack_grav / 17, 1);
      d.x += (d.rotspeed * sm);
      d.y -= e.attack_grav;

      if (d.y <= -120) destroy(d);
    }
  }
}



function finaleGhostPin(e, state, cvx, cvy) {
  for (const g of state.entities) {
    if (!g.alive || g.type !== afterimageGrow) continue;
    if (typeof g.target === 'number' && g.target < -1) {
      g.x = cvx + e.fake_x + e.fake_xoff;
      g.y = ((cvy + e.fake_y + (Math.sin(e.bobble_count * 0.1) * e.bobble_amp)) - 10)
        + 55 + e.fake_yoff;
    }
  }
}



function finaleDrawBookkeeping(e, state) {
  if (e.stop) return;
  e.ball_counter += e.ball_speed;
  if (e.ball_counter < 0) e.ball_counter += 1800;
  if (e.ball_counter > 1800) e.ball_counter -= 1800;

  if (sideb(state)) {
    e.hsv += 1;
  } else {
    if (!e.hsv_switch) e.hsv += 1;
    else e.hsv -= 1;
    if (e.hsv >= 288) e.hsv_switch = true;
    if (e.hsv <= 128) e.hsv_switch = false;
  }
  if (e.intensity < 3.75) e.intensify = e.intensity;
  else e.intensify = scrApproach(e.intensify, 0, 0.1);
}



export function roaringFinalCleanUp(state, e) {
  if (!e || e.roaring_type !== 1) return;
  for (let i = 0; i < (e.final_lines ?? []).length; i++) {
    const line = e.final_lines[i];
    if (line && line !== -4 && line.alive) destroy(line);
  }
  e.final_lines = [];
  if (e.hideback && e.hideback !== -4 && e.hideback.alive) destroy(e.hideback);
  e.hideback = -4;
  void state;
}
