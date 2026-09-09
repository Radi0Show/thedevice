



import { scrEaseOut } from './gml.js';


export function createIntroFx(x, y) {
  return {
    x,
    y,
    timer: 0,
    frame: 0,
    spin: 1,
    counter: 0,
    attack_speed: 0,
    sprite_index: 'spr_roaringknight_shift_ol',
    image_index: 1,
    image_speed: 0,
    image_xscale: 2,
    image_yscale: 2,
    fxState: 'intro',
    whiteout: false,
    whiteout_counter: 0,
    shudder: 0,
    bar: 0,
    roarendtimer: 0,
    roarendtimermax: 190,
    crushTimer: -1,
    circleFlash: 0,
    done: false,
  };
}



export function stepIntroFx(e, cues, sc) {
  if (e.done) return;
  e.frame += 1;
  if (e.shudder) e.shudder -= 1;

  if (e.crushTimer >= 0 && e.crushTimer < 96) e.crushTimer += 1;
  if (e.circleFlash > 0) e.circleFlash += 1;

  if (e.whiteout) {

    e.whiteout_counter = Math.min(1, e.whiteout_counter + 1 / 48);

    if (e.fxState === 'intro') e.inrushLast = e.frame;
  }

  if (e.fxState === 'intro') {
    e.timer += 1;
    if (e.timer === 8) e.shudder = 999;
    if (e.timer === 16) e.crushTimer = 0;
    if (e.timer === 24) {
      e.whiteout = true;
      cues.push({ name: 'snd_knight_stretch', pitch: 0.75, gain: 1 });
    }
    if (e.timer === 32) e.shudder = 999;
    if (e.timer === 64) {
      e.fxState = 'roaring';
      e.timer = -20;
    }
  }

  if (e.fxState === 'roaring') {
    e.timer += 1;
    if (e.timer === 16 && !e.attack_speed) e.bar = 24;

    if (sc && e.timer % 3 === 0 && e.attack_speed > 0) {
      sc.ghosts.push({ born: sc.t, faderate: 0.05 });
    }
    if (e.timer === 24 - e.attack_speed) {
      if (e.attack_speed === 0) {
        e.sprite_index = 'spr_roaringknight_pose_ol';
        e.image_index = 0;
        e.image_speed = 0.5;
        cues.push({ name: 'snd_knight_roar', pitch: 1, gain: 1 });
        e.whiteout = false;
        e.circleFlash = 1;
        if (sc) {

          sc.circle = { size: 0, r: 255, g: 255, b: 255, alpha: 1 };

          for (let d = 2; d <= 8; d += 2) {
            sc.ghostSchedule.push({ at: sc.t + d, faderate: 0.00625 });
          }
        }
      } else {
        cues.push({ name: 'snd_knight_puff', pitch: 0.15, gain: 1 });
      }
    }
    if (e.timer === 28 - e.attack_speed) {
      e.spin *= -1;
      e.counter += 1;
      e.attack_speed = Math.min(14, e.attack_speed + 1);
      if (e.counter < 30) e.timer = 0;
    }
    e.roarendtimer += 1;
    if (e.roarendtimer >= e.roarendtimermax) e.done = true;
  }


  if (e.image_speed) e.image_index = (e.image_index + e.image_speed) % 2;


  if (e.bar) {
    e.bar *= 0.65;
    if (e.bar < 0.5) e.bar = 0;
  }
}




export const CAM_X = 2230;

export function createIntroScene() {
  return {
    t: 0,
    phase: 'tableau',
    phaseT: 0,
    camX: CAM_X,
    done: false,

    actors: {
      kris: { x: 2356, y: 104, sprite: 'spr_krisb_idle', index: 0, speed: 0.2 },
      susie: { x: 2310, y: 142, sprite: 'spr_susie_idle_serious', index: 0, speed: 0.2 },
      ralsei: { x: 2288, y: 190, sprite: 'spr_ralsei_walk_right_unhappy', index: 0, speed: 0 },
    },

    knight: {
      x: 2670,
      ystart: 100,
      y: 100,
      siner2: 0,
      aetimer: 0,
      visible: true,
      sprite: 'spr_roaringknight_idle_overworld',
      index: 0,
      speed: 0.1,

      draw_sword: false,
      draw_timer: 0,
      sword_active: false,
      sword_appear: false,
      sword_flash: true,
      sword_alpha: 0,
      alpha_siner: 0,
      y_base_pos: 0,
      y_base_from: 0,
      y_base_t: -1,
      grab_hand: false,
      stampIndex: 0,
      stampTimer: 0,
      battle_ready: false,
    },
    marker: null,
    fx: null,
    circle: null,
    ghosts: [],
    ghostSchedule: [],
    bg: { fountain_speed: 0.2, fadeAlpha: 1 },
  };
}


const ACTOR_STAMPS = [2, 2, 2, 2, 2, 4, 2, 2];

const MARKER_DELAYS = [8, 1, 6, 6];


export function stepIntroScene(sc, cues) {
  if (sc.done) return;
  sc.t += 1;
  sc.phaseT += 1;
  const k = sc.knight;


  k.siner2 += 1;
  k.y = k.ystart + Math.cos(k.siner2 / 8) * 8;
  if (k.speed && !k.draw_sword) k.index += k.speed;


  for (const key of Object.keys(sc.actors)) {
    const a = sc.actors[key];
    if (a.speed) a.index += a.speed;
  }


  sc.bg.fountain_speed += 0.1;


  while (sc.ghostSchedule.length && sc.ghostSchedule[0].at <= sc.t) {
    sc.ghosts.push({ born: sc.t, faderate: sc.ghostSchedule.shift().faderate });
  }

  sc.ghosts = sc.ghosts.filter((g) => 0.5 - (sc.t - g.born) * g.faderate > 0);


  if (sc.circle) {
    const c = sc.circle;
    c.g = Math.max(0, c.g - 255 / 28);
    c.b = Math.max(0, c.b - 255 / 28);
    c.size = Math.min(960, c.size + 40);
    if (!sc.fx || sc.fx.done) {
      c.alpha -= 0.1;
      if (c.alpha < 0) sc.circle = null;
    }
  }

  switch (sc.phase) {
    case 'tableau':

      if (sc.phaseT >= 31) {
        k.visible = false;

        sc.fx = createIntroFx(k.x - sc.camX + 20, k.y - 20);
        sc.phase = 'roar';
        sc.phaseT = 0;
      }
      break;
    case 'roar':
      stepIntroFx(sc.fx, cues, sc);
      if (sc.fx.done) {
        k.visible = true;
        k.sprite = 'spr_roaringknight_idle_overworld';
        k.index = 0;
        sc.phase = 'reappear';
        sc.phaseT = 0;
      }
      break;
    case 'reappear':

      if (sc.phaseT >= 2) {
        k.draw_sword = true;
        sc.phase = 'sword';
        sc.phaseT = 0;
      }
      break;
    case 'sword': {

      k.aetimer += 1;

      if (k.y_base_t >= 0 && k.y_base_t < 15) {
        k.y_base_t += 1;
        const t = k.y_base_t / 15;
        k.y_base_pos = k.y_base_from - 266 * scrEaseOut(t, -1);
        k.sword_alpha = scrEaseOut(t, 4);
      }
      if (k.sword_appear) k.alpha_siner += 1.5;


      k.index += k.speed;

      if (k.aetimer % 4 === 0) {
        k.draw_timer += 1;
        if (k.draw_timer === 1) {
          k.sword_active = true;
          k.sprite = 'spr_roaringknight_sword_appear';
          k.index = 0;
          k.speed = 0.3;
        }
        if (k.draw_timer === 3) {

          k.speed = 0;
          k.sword_appear = true;
          k.y_base_from = k.y + 152;
          k.y_base_pos = k.y_base_from;
          k.y_base_t = 0;
        }
        if (k.draw_timer === 8) {
          k.sword_flash = false;
          k.sword_appear = false;
        }
        if (k.draw_timer === 12) {
          k.sprite = 'spr_roaringknight_sword_appear_new';
          k.index = 0;
          k.grab_hand = true;
          k.stampIndex = 0;
          k.stampTimer = ACTOR_STAMPS[0];
        }
        if (k.grab_hand && !k.battle_ready) {
          k.stampTimer -= 1;
          if (k.stampTimer <= 0) {
            k.stampIndex += 1;
            if (k.stampIndex >= ACTOR_STAMPS.length) {
              k.battle_ready = true;
            } else {
              k.stampTimer = ACTOR_STAMPS[k.stampIndex];
              k.index = k.stampIndex;
            }
          }
        }
      }
      if (k.battle_ready) {

        k.visible = false;
        sc.marker = { index: 7, delayIndex: 0, timer: 0 };
        sc.phase = 'marker';
        sc.phaseT = 0;
      }
      break;
    }
    case 'marker': {
      const m = sc.marker;
      m.timer -= 1;
      if (m.timer <= 0) {
        m.delayIndex += 1;
        m.index = 7 + m.delayIndex;
        if (m.index >= 11) {

          sc.phase = 'entry';
          sc.phaseT = 0;

          k.hoverPause = true;

          sc.glide = {
            fromX: k.x,
            fromY: k.y,
            toX: sc.camX + 425,
            toY: k.y,
          };

          sc.actors.kris.sprite = 'spr_kris_sword_jump_down';
          sc.actors.susie.sprite = 'spr_susier_wall';
          sc.actors.ralsei.sprite = 'spr_ralsei_walk_right';
          for (const key of Object.keys(sc.actors)) {
            sc.actors[key].index = 0;
            sc.actors[key].speed = 0;
          }
          sc.flightGhosts = [];
        } else {
          m.timer = MARKER_DELAYS[m.delayIndex];
        }
      }
      break;
    }
    case 'entry': {

      const t = Math.min(1, sc.phaseT / 20);
      k.x = sc.glide.fromX + (sc.glide.toX - sc.glide.fromX) * t;
      k.y = sc.glide.fromY + (sc.glide.toY - sc.glide.fromY) * t;


      if (sc.phaseT < 10) {
        for (const key of Object.keys(sc.actors)) {
          const a = sc.actors[key];
          sc.flightGhosts.push({
            sprite: a.sprite, index: Math.floor(a.index), x: a.x, y: a.y, born: sc.t,
          });
        }
      }
      sc.flightGhosts = sc.flightGhosts.filter((g) => 0.5 - (sc.t - g.born) * 0.04 > 0);


      if (sc.phaseT === 10) {
        cues.push({ name: 'snd_impact', pitch: 1, gain: 0.7 });
        cues.push({ name: 'snd_weaponpull_fast', pitch: 1, gain: 0.8 });
        sc.actors.kris.sprite = 'spr_krisb_attack';
        sc.actors.susie.sprite = 'spr_susieb_attack';
        sc.actors.ralsei.sprite = 'spr_ralsei_battleintro';
        for (const key of Object.keys(sc.actors)) {
          sc.actors[key].index = 0;
          sc.actors[key].speed = 0.5;
        }
      }


      if (sc.phaseT >= 25) {
        sc.done = true;
      }
      break;
    }
  }
}
