


import { spawn, destroy } from '../entity.js';
import { lengthdirX, lengthdirY, pointDirection, pointDistance, scrApproach, gmlEq } from '../gml.js';
import { gmlChoose, gmlIrandom, gmlIrandomRange, gmlRandom } from '../rng.js';
import { scrLerpvar } from '../lerpvar.js';
import { cue, cueSustain, cueTune } from '../audio.js';
import { roaringStar } from './roaring-star.js';
import { roaringknightSlash } from './roaringknight-slash.js';
import { scrBulletInherit } from '../bullets/regularbullet.js';
import {
  screenPiece, scrAfterimage, knightCircle, particleGeneric, afterimageScreen,
} from '../fx.js';



const STREAK_UNIT = 4;

export const roaring2 = {
  name: 'obj_knight_roaring2',

  create(e, state) {

    e.image_speed = 0;
    e.image_index = 0;


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
  },

  step(e, state) {
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

    e.image_xscale = 2;
    e.image_yscale = 2;




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
