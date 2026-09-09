



import { textSoundChar } from './dialogue.js';

const CAM_X = 2230;

export const VICTORY_LINES = [
  { speaker: 'susie', text: '* We.. we actually beat it?' },
  { speaker: 'susie', text: "* What, don't tell me you've had ENOUGH already?" },
  { speaker: 'susie', text: "* C'mon, we were just getting started!" },
  { speaker: 'susie', text: '* Heheh...' },
  { speaker: 'susie', text: '* Not so tough NOW, are you!?' },
  { speaker: 'ralsei', text: '* S-Susie!!!' },
  { speaker: 'ralsei', text: '* H.. how could you...' },
];

function actor(x, y, sprite) {
  return {
    x, y, sprite, index: 0, speed: 0, visible: true, flip: false,
    hspeed: 0, vspeed: 0, gravity: 0, friction: 0,
    lerp: null,
  };
}

export function createVictoryScene() {
  return {
    t: 0,
    done: false,
    toMenu: false,
    camX: CAM_X,
    camLerp: null,
    bg: { fountain_speed: 0.2 },

    white: { alpha: 1, black: false, visible: true, fade: 0 },
    slash: { x: 0, y: 0, visible: false },
    actors: {
      kris: actor(2356, 104, 'spr_krisr_dark'),
      susie: actor(2310, 142, 'spr_susie_walk_right_dw_unhappy'),
      ralsei: actor(2288, 190, 'spr_ralsei_walk_right_unhappy'),
    },
    knight: {
      x: 2655, ystart: 78, y: 78, siner2: 0,
      sprite: 'spr_roaringknight_idle_overworld_sword', index: 0, speed: 0.1,
      visible: true, hoverPause: false, frozen: false,
      shake: 0, jolt: [0, 0],
      hspeed: 0, friction: 0,
      lerpIndex: null,
    },
    warp: null,
    knightStatic: false,
    clash: null,
    hitFx: [],
    flash: null,
    shard: null,
    swoons: [],
    bigShake: 0,
    dialogue: null,
    lastConfirm: true,
    script: buildScript(),
    scriptIndex: 0,
    wait: 0,
    deferred: [],
    rng: 12345,
  };
}

function srand(sc) {
  sc.rng = (Math.imul(sc.rng, 1664525) + 1013904223) >>> 0;
  return sc.rng / 4294967296;
}
const choosePM = (sc) => [-20, -10, 10, 20][Math.floor(srand(sc) * 4)];

const ease = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inout: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
};


function buildScript() {
  return [
    ['w', 60],
    ['whiteFadeOut', 60], ['music', 'wind'],
    ['w', 120],
    ['knightFreeze'],
    ['w', 15], ['music', 'stop'],
    ['warpStart'],
    ['w', 125],
    ['w', 90],
    ['say', 0],
    ['pan', 2400, 30],
    ['susieWalk', 2510, 30],
    ['say', 1], ['say', 2],
    ['w', 30],
    ['clashStart'],
    ['waitClash'],
    ['pan', CAM_X, 60],
    ['w', 40],
    ['knightRecover'],
    ['w', 145],
    ['susieIdle'],
    ['say', 3],
    ['susieLaugh'],
    ['w', 60],
    ['say', 4],
    ['laughAgain'],
    ['w', 26],
    ['slashCut', 'susie'],
    ['w', 55],
    ['susieSlide'],
    ['w', 25], ['music', 'wind'],
    ['reveal', 'susie'],
    ['w', 60],
    ['say', 5],
    ['ralseiApproach'],
    ['w', 60],
    ['say', 6],
    ['music', 'stop'],
    ['slashCut', 'ralsei'],
    ['w', 90], ['music', 'wind'],
    ['reveal', 'ralsei'],
    ['w', 180],
    ['music', 'stop'],
    ['black'],
    ['knighting'],
    ['w', 90],
    ['unblack'], ['music', 'wind'],
    ['w', 30],
    ['knightingLower', 90],
    ['w', 120],
    ['music', 'stop'], ['black'],
    ['krisDown'],
    ['w', 120],
    ['unblack'],
    ['w', 120],
    ['end'],
  ];
}

function pushHitFx(sc, kx, ky, life, alpha) {
  sc.hitFx.push({ x: kx - 90, y: ky - 90, born: sc.t, life, alpha });
}

function fiveCuts(cues) {
  for (const p of [0.06, 0.1, 0.12, 0.18, 0.24]) {
    cues.push({ name: 'snd_knight_cut2', pitch: p, gain: 1 });
  }
}



function bigShake(sc, cues) {
  sc.shake = { x: 10, sign: -2, speed: 2, timer: 0, offset: 10 };
  sc.bigShake = 20;
  cues.push({ name: 'snd_impact', pitch: 1, gain: 1 });
  cues.push({ name: 'snd_closet_impact', pitch: 1, gain: 1 });
  cues.push({ name: 'snd_closet_impact', pitch: 0.5, gain: 1 });
  cues.push({ name: 'snd_bageldefeat', pitch: 0.8, gain: 0.8 });
  cues.push({ name: 'snd_damage', pitch: 1, gain: 1 });
  cues.push({ name: 'snd_glassbreak', pitch: 0.4, gain: 0.8 });
  cues.push({ name: 'snd_glassbreak', pitch: 0.3, gain: 0.6 });
}

function setTimeoutStep(sc, frames, fn) {
  sc.deferred.push({ at: sc.t + frames, fn });
}



export function stepVictoryScene(sc, input, cues) {
  if (sc.done) return;
  sc.t += 1;
  const A = sc.actors;
  const k = sc.knight;
  const confirmPressed = input.confirm && !sc.lastConfirm;
  sc.lastConfirm = !!input.confirm;


  if (!k.frozen && !k.hoverPause) {
    k.siner2 += 1;
    k.y = k.ystart + Math.cos(k.siner2 / 8) * 8;
  }
  if (k.speed) k.index += k.speed;
  if (k.lerpIndex) {
    const L = k.lerpIndex;
    L.t += 1;
    k.index = L.from + (L.to - L.from) * ease[L.curve](Math.min(1, L.t / L.dur));
    if (L.t >= L.dur) k.lerpIndex = null;
  }
  if (k.hspeed) {
    k.x += k.hspeed;
    k.hspeed = Math.max(0, k.hspeed - k.friction);
  }
  for (const key of Object.keys(A)) {
    const a = A[key];
    if (a.speed) a.index += a.speed;
    if (a.hspeed || a.vspeed) {
      a.x += a.hspeed;
      a.y += a.vspeed;
      a.vspeed += a.gravity;
      if (a.friction) {
        const s = Math.sign(a.hspeed);
        a.hspeed -= s * Math.min(Math.abs(a.hspeed), a.friction);
      }
    }
    if (a.lerp) {
      const L = a.lerp;
      L.t += 1;
      a[L.field] = L.from + (L.to - L.from) * ease[L.curve](Math.min(1, L.t / L.dur));
      if (L.t >= L.dur) a.lerp = null;
    }
    if (a.landing && a.y >= 142) {
      a.y = 142;
      a.vspeed = 0;
      a.gravity = 0;
      a.landing = false;
    }
  }
  if (sc.camLerp) {
    const L = sc.camLerp;
    L.t += 1;
    sc.camX = L.from + (L.to - L.from) * ease.inout(Math.min(1, L.t / L.dur));
    if (L.t >= L.dur) sc.camLerp = null;
  }
  if (sc.white.fade) {
    sc.white.alpha = Math.max(0, sc.white.alpha - 1 / sc.white.fade);
    if (sc.white.alpha === 0) { sc.white.fade = 0; sc.white.visible = false; }
  }
  if (sc.flash) {
    sc.flash.t += 1;
    if (sc.flash.t > 18) sc.flash = null;
  }
  if (sc.bigShake > 0) sc.bigShake -= 1;

  if (sc.shake) {
    const sh = sc.shake;
    sh.timer += 1;
    if (sh.timer >= sh.speed) {
      sh.timer = 0;
      sh.offset = sh.x * sh.sign;
      if (sh.x > 0) sh.x -= 1;
      sh.sign = -sh.sign;
      if (sh.x === 0) sc.shake = null;
    }
  }
  sc.bg.fountain_speed += 0.1;
  sc.hitFx = sc.hitFx.filter((f) => sc.t - f.born < f.life);
  sc.deferred = sc.deferred.filter((d) => {
    if (sc.t >= d.at) { d.fn(); return false; }
    return true;
  });


  if (sc.warp) {
    const w = sc.warp;
    w.timer += 1;
    if (w.timer === 1) {
      k.hoverPause = true;
      w.cache = [k.x, k.y];
      k.speed = 0;
      w.burstT = 0;
      cues.push({ name: 'snd_tv_static', pitch: 1, gain: 1 });
    }
    if (w.timer === 31 || w.timer === 56 || w.timer === 69 || w.timer === 82) {

      k.sprite = 'spr_roaring_knight_static';
      k.index = Math.floor(srand(sc) * 3);
      k.x += choosePM(sc);
      k.y += choosePM(sc);
      w.burstT = -1;
      cues.push({ name: 'snd_tv_static', pitch: 0.5 + srand(sc), gain: 1 });
    }
    if (w.burstT !== undefined && w.burstT !== null) {
      w.burstT += 1;
      if (w.burstT >= 1) {

        const st = w.burstT;
        k.sprite = 'spr_roaring_knight_overworld_warp';
        k.shake = 4;
        if (st === 1) k.index = 5;
        else if (st === 2) k.index = 6;
        else if (st === 3) k.index = 7;
        else if (st === 4) k.index = 8;
        else if (st < 10) k.index = 6 + Math.floor(srand(sc) * 3);
        else if (st === 10) k.index = 6;
        else if (st === 11) k.index = 5;
        else {
          k.index = 0;
          k.shake = 0;
          w.burstT = null;
        }
      }
    }
    if (w.timer === 95) {
      k.x = w.cache[0];
      k.y = w.cache[1];
      k.sprite = 'spr_roaring_knight_overworld_warp';
      k.index = 5;
      k.shake = 2;
      sc.knightStatic = true;
      sc.warp = null;
    }
  }
  if (sc.knightStatic && sc.t % 2 === 0) {

    k.index = 5 + Math.floor(srand(sc) * 3 + 2.8);
    k.jolt = [Math.floor(srand(sc) * 5) - 2, Math.floor(srand(sc) * 5) - 2];
  }


  if (sc.clash) {
    const c = sc.clash;
    const su = A.susie;
    c.timer += 1;
    if (c.timer === 1) {
      cues.push({ name: 'snd_jump', pitch: 1, gain: 1 });
      su.sprite = 'spr_susie_clash_jump';
      su.index = 1;
      su.speed = 0;
      su.vspeed = -14;
      su.gravity = 2;
      su.lerp = { field: 'hspeed', from: 0, to: 20, t: 0, dur: 5, curve: 'linear' };
      sc.flash = { t: 0, peak: 1 };
    }
    if (c.timer === 10) {
      c.shakeSeq = true;
      sc.bigShake = Math.max(sc.bigShake, 10);
      cues.push({ name: 'snd_laz_c', pitch: 0.7, gain: 1 });
      cues.push({ name: 'snd_heavyswing', pitch: 1, gain: 1 });
      cues.push({ name: 'snd_closet_impact', pitch: 0.9, gain: 1 });
      cues.push({ name: 'snd_impact', pitch: 0.7, gain: 1 });
      su.visible = false;
      su.lerp = null;
      su.hspeed = 0; su.vspeed = 0; su.gravity = 0;
      su.x = k.x - 30;
      su.y = k.y - 40;
      sc.knightStatic = false;
      k.jolt = [0, 0];
      k.sprite = 'spr_roaring_knight_susie_clash';
      k.index = 0;
      k.speed = 0.4;
      k.shake = 2;
    }
    if (c.shakeSeq) {
      c.shakeTimer += 1;
      if (c.shakeTimer % c.shakeTime === 1) {
        c.shakeTime -= 10;
        if (c.shakeTime <= 30) c.shakeSeq = false;
        sc.bigShake = Math.max(sc.bigShake, 10);
        pushHitFx(sc, k.x, k.y, 16, 1);
        pushHitFx(sc, k.x, k.y, 24, 0.5);
        cues.push({ name: 'snd_damage', pitch: 1, gain: 1 });
        cues.push({ name: 'snd_metal_hit_strong', pitch: 0.8, gain: 0.5 });
        cues.push({ name: 'snd_closet_impact', pitch: 0.9, gain: 1 });
        cues.push({ name: 'snd_impact', pitch: 0.7, gain: 1 });
        sc.flash = { t: 0, peak: 0.5 };
      }
    } else {
      if (c.timer === 300) {
        pushHitFx(sc, k.x, k.y, 12, 1);
        cues.push({ name: 'snd_damage', pitch: 1, gain: 1 });
        sc.flash = { t: 0, peak: 0.5 };
        k.hspeed = 8;
        k.friction = 2;
        k.shake = 0;
        k.index = 2;
        k.speed = 0;
      }
      if (c.timer === 320) {
        cues.push({ name: 'snd_laz_c', pitch: 0.9, gain: 1 });
        cues.push({ name: 'snd_glassbreak', pitch: 1, gain: 1 });
        cues.push({ name: 'snd_sparkle_glock', pitch: 1, gain: 1 });
        su.visible = true;
        su.sprite = 'spr_susie_clash_jump';
        su.index = 0;
        su.vspeed = -4;
        su.gravity = 2;
        su.hspeed = -14;
        k.sprite = 'spr_roaring_knight_clash_pull_back';
        k.index = 0;
        k.speed = 0;
        setTimeoutStep(sc, 4, () => { k.index = 1; });

        sc.shard = {
          x: k.x, y: k.y, hspeed: -7, vspeed: -8, gravity: 2,
          angle: 0, born: sc.t, shine: false,
        };
      }
      if (c.timer === 330) {
        su.sprite = 'spr_susieb_idle_serious';
        su.index = 0;
        su.speed = 0;

        su.friction = 2;
        su.landing = true;
      }
      if (c.timer === 340) {
        sc.clash = null;
        if (sc.shard) sc.shard.shine = true;
      }
    }
  }
  if (sc.shard) {
    const s = sc.shard;
    if (sc.t - s.born <= 16) {
      s.x += s.hspeed;
      s.y += s.vspeed;
      s.vspeed += s.gravity;
      s.angle += 64;
    }
  }


  if (sc.dialogue) {
    const d = sc.dialogue;
    d.timer += 1;
    const line = VICTORY_LINES[d.line];

    if (!input.cancel && textSoundChar(line.text, d.timer)) {
      if (line.speaker === 'susie') cues.push({ name: 'snd_txtsus', pitch: 1, gain: 1 });
      else cues.push({ name: 'snd_txtral', pitch: 1, gain: 1 });
    }
    const typed = d.timer >= line.text.length;
    if (typed && confirmPressed) sc.dialogue = null;
    else return;
  }


  if (sc.wait > 0) {
    sc.wait -= 1;
    if (sc.wait > 0) return;
  }
  while (sc.scriptIndex < sc.script.length) {
    const [op, a, b] = sc.script[sc.scriptIndex];
    if (op === 'w') { sc.scriptIndex += 1; sc.wait = a; break; }
    if (op === 'say') {
      sc.scriptIndex += 1;
      sc.dialogue = { line: a, timer: 0 };
      break;
    }
    if (op === 'waitClash') {
      if (sc.clash) break;
      sc.scriptIndex += 1;
      continue;
    }
    sc.scriptIndex += 1;
    switch (op) {
      case 'whiteFadeOut': sc.white.fade = a; break;
      case 'music': cues.push({ music: a }); break;
      case 'knightFreeze': k.frozen = true; break;
      case 'warpStart': sc.warp = { timer: 0, cache: null }; break;
      case 'pan': sc.camLerp = { from: sc.camX, to: a, t: 0, dur: b }; break;
      case 'susieWalk': {
        const su = A.susie;
        su.sprite = 'spr_susier_dark';
        su.index = 0;
        su.speed = 0.25;
        su.lerp = { field: 'x', from: su.x, to: a, t: 0, dur: b, curve: 'linear' };

        setTimeoutStep(sc, b + 1, () => { su.speed = 0; su.index = 0; });
        break;
      }
      case 'clashStart':
        sc.clash = { timer: 0, shakeSeq: false, shakeTimer: 0, shakeTime: 80 };
        break;
      case 'knightRecover':
        sc.knightStatic = false;
        k.jolt = [0, 0];
        k.shake = 0;
        k.sprite = 'spr_roaringknight_ball_transition_sword';
        k.speed = 0;
        k.lerpIndex = { from: 8, to: 5, t: 0, dur: 8, curve: 'linear' };
        k.frozen = false;
        k.hoverPause = false;
        setTimeoutStep(sc, 8, () => {
          k.sprite = 'spr_roaringknight_ball_fly';
          k.index = 0;
          k.speed = 0.4;
        });
        break;
      case 'susieIdle': {
        const su = A.susie;
        su.sprite = 'spr_susieb_idle';
        su.index = 0;
        su.speed = 0.334;
        break;
      }
      case 'susieLaugh': {
        const su = A.susie;

        su.flip = !su.flip;
        su.sprite = 'spr_susie_laugh_dw';
        su.index = 0;
        su.speed = 0.25;
        cues.push({ name: 'snd_suslaugh', pitch: 1, gain: 1 });
        break;
      }
      case 'laughAgain': {
        const su = A.susie;
        su.sprite = 'spr_susie_laugh_dw';
        su.speed = 0.25;

        cues.push({ name: 'snd_suslaugh', pitch: 1, gain: 1 });
        break;
      }
      case 'slashCut': {
        fiveCuts(cues);
        sc.white.black = true;
        sc.white.alpha = 1;
        sc.white.visible = true;
        sc.slash.visible = true;
        if (a === 'susie') {
          sc.slash.x = 2420; sc.slash.y = 182;
          k.x = sc.camX + 640 + 300;
          k.sprite = 'spr_roaringknight_idle_overworld';
          k.index = 0;
          k.speed = 0;
          const su = A.susie;

          su.flip = !su.flip;
          su.x = 2410; su.y = 142;
          su.sprite = 'spr_susie_dw_fell';
          su.index = 0; su.speed = 0;
        } else {
          sc.slash.x = 2408; sc.slash.y = 240;
          const ra = A.ralsei;
          ra.x = 2328; ra.y = 190;
          ra.sprite = 'spr_ralsei_defeat';
          ra.index = 0; ra.speed = 0;
        }
        break;
      }
      case 'susieSlide': {
        const su = A.susie;
        su.lerp = { field: 'x', from: su.x, to: 2310, t: 0, dur: 40, curve: 'in' };
        A.ralsei.sprite = 'spr_ralsei_shocked_behind';
        A.ralsei.index = 0;
        break;
      }
      case 'reveal': {
        bigShake(sc, cues);
        sc.white.visible = false;
        sc.slash.visible = false;
        const target = a === 'susie' ? A.susie : A.ralsei;
        sc.swoons.push({ x: target.x + 20, y: target.y + 30, born: sc.t });
        if (a === 'ralsei') {
          target.lerp = { field: 'x', from: target.x, to: 2280, t: 0, dur: 30, curve: 'out' };
        }
        break;
      }
      case 'ralseiApproach': {
        const ra = A.ralsei;
        ra.sprite = 'spr_ralsei_walk_right_unhappy';
        ra.speed = 0.25;

        const WALK = 8 * 10;
        ra.lerp = { field: 'x', from: ra.x, to: ra.x + WALK, t: 0, dur: 10, curve: 'linear' };

        setTimeoutStep(sc, 10, () => {
          ra.speed = 0;
          ra.index = 0;
          ra.sprite = 'spr_ralsei_walk_up';
        });
        break;
      }
      case 'black':
        sc.white.black = true;
        sc.white.alpha = 1;
        sc.white.visible = true;
        break;
      case 'unblack': sc.white.visible = false; break;
      case 'knighting':
        sc.knightStatic = false;
        k.sprite = 'spr_roaring_knight_kris_knighting';
        k.x = 2326;
        k.y = 44;
        k.hoverPause = true;
        k.index = 1;
        k.speed = 0;
        k.hspeed = 0;
        k.shake = 0;
        k.jolt = [0, 0];
        A.kris.visible = false;
        break;
      case 'knightingLower':
        k.lerpIndex = { from: 1, to: 4, t: 0, dur: a, curve: 'in' };
        break;
      case 'krisDown': {
        const kr = A.kris;
        kr.visible = true;
        kr.sprite = 'spr_krisb_defeat';
        kr.index = 0;
        k.sprite = 'spr_roaringknight_idle_overworld_sword';
        k.index = 0;
        k.speed = 0.1;
        k.x = 2655;
        k.hoverPause = false;
        break;
      }
      case 'end':
        sc.done = true;
        sc.toMenu = true;
        break;
    }
  }
}
