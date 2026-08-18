// THE ROOM THE GAME IS PLAYED IN — room_board_sword_intro.
//
// Chapter 3 puts Kris in front of a television with a console on the floor
// and a controller in his hands, and the board game is what is ON the
// screen. This is that room: the same background, the same console, the
// same walk, and the same boot sequence — and here the thing that boots is
// this website.
//
// Everything is read out of the game, not styled to match:
//
//   obj_gameshow_swordroute        builds the room — bg at (0,0), the
//                                  console at (202,322), the TV glow at
//                                  (0,320), Kris at (300,298)
//   obj_swordroute_consolestarter  the boot: a blue field, a logo, then
//                                  "NO CONTROLLER" over snd_nes_nocontroller,
//                                  and static if you have not got one
//   obj_mainchara                  the walk — bwspeed 3, running +2/+4/+5
//                                  in the dark world at runtimer 0/10/60
//   scr_darksize()                 every dark-world sprite draws at scale 2
//
// THE SCREEN IS A HOLE. spr_gameshow_swordroutebg has a 192x144 gap in it
// where the television's picture belongs — 384x288 at (138,42) once the
// sprite is drawn at its dark-world scale. Screen content is painted first
// and the room is drawn over the top, so the frame of the TV occludes it
// exactly the way the art intends.

import { loadFont, drawText, textWidth } from './gm-font.js';
import { drawWingdings, wingdingsWidth, wingdingsHeight } from './wingdings.js';

const VIEW_W = 640, VIEW_H = 480;
const MS_PER_FRAME = 1000 / 30;
const SCALE = 2;                       // scr_darksize()

// The gap in the background sprite, in room pixels.
const SCREEN_X = 138, SCREEN_Y = 42, SCREEN_W = 384, SCREEN_H = 288;
export const SCREEN = { x: SCREEN_X, y: SCREEN_Y, w: SCREEN_W, h: SCREEN_H };

const BWSPEED = 3;                     // obj_mainchara Create
const KRIS_W = 19 * SCALE, KRIS_H = 38 * SCALE;

// obj_swordroute_consolestarter: where Kris ends up, and where he came in.
const CONSOLE_SPOT_X = 300, CONSOLE_SPOT_Y = 298;
const ENTRY_X = 576;

// The blue the console boots to, straight out of the Step event.
const BOOT_BLUE = '#2F38B0';
// The board screen's own fill: `draw_sprite_ext(spr_pxwhite, 0,0,0, 640,480,
// 0, #3F48CC, 1)` in obj_board_b2s_icedoor's Draw — the blue behind
// "AREN'T YOU FORGETTING SOMETHING IMPORTANT?".
const BOARD_BLUE = '#3F48CC';

/**
 * THE DEVICES.
 *
 * One is built and named. The rest are listed in the cipher — an empty slot
 * that reads "JEVIL, COMING SOON" is a roadmap, and a roadmap is a promise
 * about a date. See shared/wingdings.js.
 */
const DEVICES = [
  { name: 'DEVICE_KNIGHT', href: '../DEVICE_KNIGHT/', ready: true },
  { name: 'DEVICE_JEVIL', ready: false },
  { name: 'DEVICE_SPAMTON', ready: false },
  { name: 'DEVICE_MANTLE', ready: false },
  { name: 'DEVICE_GERSON', ready: false },
  { name: 'DEVICE_PINK', ready: false },
];

const FACE_DOWN = 0, FACE_RIGHT = 1, FACE_UP = 2, FACE_LEFT = 3;
const FACE_KEY = ['d', 'r', 'u', 'l'];

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(`${src} missing`));
    i.src = src;
  });
}

export async function runRoom(canvas, opts = {}) {
  const base = opts.base ?? 'assets/room/';
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;

  // fnt_8bit — "AdventureBoard", the board's own face, monospaced at 16.
  const boardFont = await loadFont(opts.mantleBase ?? 'assets/mantle/', 'fnt_8bit');

  const [bg, consoleImg, tvglow, krisHold, ...rest] = await Promise.all([
    loadImage(`${base}bg.png`),
    loadImage(`${base}console.png`),
    loadImage(`${base}tvglow.png`),
    loadImage(`${base}kris_hold.png`),
    ...['d', 'r', 'u', 'l'].flatMap((d) => [0, 1, 2, 3].map((f) => loadImage(`${base}kris_${d}_${f}.png`))),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((f) => loadImage(`${base}static_${f}.png`)),
  ]);
  const walk = { d: rest.slice(0, 4), r: rest.slice(4, 8), u: rest.slice(8, 12), l: rest.slice(12, 16) };
  const statics = rest.slice(16, 24);

  /* ---------------- sound ---------------- */
  const soundOn = opts.soundOn !== false;
  const nocontroller = new Audio(`${base}nocontroller.wav`);
  const tvstatic = new Audio(`${base}tvstatic.wav`);
  nocontroller.volume = 0.4; tvstatic.volume = 0.35;
  const play = (a) => { if (soundOn) { a.currentTime = 0; a.play().catch(() => {}); } };
  const stop = (a) => { a.pause(); a.currentTime = 0; };

  /* ---------------- input ---------------- */
  const held = new Set();
  const pressed = new Set();
  const KEYMAP = {
    arrowup: 'u', arrowdown: 'd', arrowleft: 'l', arrowright: 'r',
    w: 'u', s: 'd', a: 'l', d: 'r', z: 'z', enter: 'z', x: 'x', shift: 'x',
  };
  const onKey = (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();

    // THE BOARD HAS THE KEYS ONCE IT IS UP.
    if (screenState === 'device') {
      if (k === 'u') deviceSel = (deviceSel + DEVICES.length - 1) % DEVICES.length;
      if (k === 'd') deviceSel = (deviceSel + 1) % DEVICES.length;
      if (k === 'z') {
        const d = DEVICES[deviceSel];
        if (d.ready) opts.onLaunch ? opts.onLaunch(d.href) : (location.href = d.href);
        else notBuilt = 90;   // three seconds of saying so
      }
      return;
    }

    if (!held.has(k)) pressed.add(k);
    held.add(k);
  };
  const onKeyUp = (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (k) held.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);

  /* ---------------- Kris ---------------- */
  const kris = {
    x: ENTRY_X, y: CONSOLE_SPOT_Y,
    facing: FACE_LEFT,                 // the room starts him walking in
    imageIndex: 0,
    runtimer: 0,
    frozen: false,
    holding: false,
  };

  // THE WALK BOX IS MINE, and it is the one invented thing in this file.
  //
  // room_board_sword_intro contains no solids at all — eight instances, not
  // one of them a wall — because in the game you never walk here: the
  // console starter drives Kris to the console on a timer and the room is a
  // cutscene. Free movement is this site's addition, so the floor it walks
  // on had to be described, and this is a rectangle fitted to the lit floor
  // in the background art rather than anything read out of the room.
  const WALK = { x1: 110, x2: 620, y1: 250, y2: 340 };   // x2 clears the game's own entry at 576
  const meets = (x, y) => x < WALK.x1 || x + KRIS_W > WALK.x2 || y < WALK.y1 || y > WALK.y2;

  /* ---------------- the console, and the boot ----------------
     con mirrors obj_swordroute_consolestarter's own: idle, then the
     sequence, then the site. */
  let con = 'idle';
  let timer = 0;
  // While the site has the screen it also has the keyboard: Kris holds
  // still rather than walking around behind a menu he is operating.
  let suspended = false;
  // Which device the board is pointed at. The board takes the keys while it
  // is up, which is also why Kris stops walking.
  let deviceSel = 0;
  let plugged = false;
  let notBuilt = 0;          // frames left on the "not built" line
  let screenState = 'nocontroller';   // what the television is showing
  let staticTimer = 0;
  let onBooted = opts.onBooted ?? (() => {});
  let booted = false;

  /**
   * Is Kris standing in front of the console, facing it?
   *
   * Measured against the console's own footprint — spr_gameshow_console is
   * 99 wide at (202,322), so it covers x 202..400 once scaled — with a
   * margin either side. Facing up is the part that carries meaning; the
   * walk box is only 90 tall, so anywhere in it is "in front of".
   */
  function atConsole() {
    const cx = kris.x + KRIS_W / 2;
    return cx > 170 && cx < 440 && kris.facing === FACE_UP;
  }

  function stepKris() {
    if (kris.frozen || suspended) return;
    const pr = held.has('r') ? 1 : 0, pl = held.has('l') ? 1 : 0;
    const pd = held.has('d') ? 1 : 0, pu = held.has('u') ? 1 : 0;

    // Running: obj_mainchara's dark-world ramp, +2 then +4 then +5.
    const running = held.has('x');
    if (running && (pr || pl || pd || pu)) kris.runtimer += 1; else kris.runtimer = 0;
    let wspeed = BWSPEED;
    if (running) {
      wspeed = BWSPEED + 2;
      if (kris.runtimer > 10) wspeed = BWSPEED + 4;
      if (kris.runtimer > 60) wspeed = BWSPEED + 5;
    }

    let px = 0, py = 0, pressdir = -1;
    if (pr) { px = wspeed; pressdir = FACE_RIGHT; }
    if (pl) { px = -wspeed; pressdir = FACE_LEFT; }
    if (pd) { py = wspeed; pressdir = FACE_DOWN; }
    if (pu) { py = -wspeed; pressdir = FACE_UP; }
    if (pressdir !== -1) kris.facing = pressdir;

    if (px && meets(kris.x + px, kris.y)) px = 0;
    if (py && meets(kris.x, kris.y + py)) py = 0;
    kris.x += px;
    kris.y += py;

    // image_speed 0.25 while walking; standing still resets to the first
    // frame, which is the pose the room starts him in.
    if (px || py) kris.imageIndex += 0.25; else kris.imageIndex = 0;
  }

  function stepConsole() {
    // THE PROMPT. Standing at the console facing it and pressing Z is the
    // whole interaction: it is the moment the controller goes in.
    if (con === 'idle') {
      if (pressed.has('z') && atConsole()) {
        pressed.clear();
        plugged = true;
        kris.frozen = true;
        kris.holding = true;
        kris.x = CONSOLE_SPOT_X;
        kris.y = CONSOLE_SPOT_Y;
        kris.facing = FACE_UP;
        con = 'static';
        timer = 0;
        stop(nocontroller);
        play(tvstatic);
        screenState = 'static';
      }
      return;
    }

    timer += 1;

    // snd_tv_static, then the blue field the console boots into, then the
    // site. The beats are the real object's, shortened only where it waits
    // on dialogue this room does not have.
    if (con === 'static' && timer >= 24) {
      stop(tvstatic);
      con = 'blue';
      timer = 0;
      screenState = 'blue';
    }
    if (con === 'blue' && timer >= 30) {
      con = 'logo';
      timer = 0;
      screenState = 'logo';
    }
    if (con === 'logo' && timer >= 60 && !booted) {
      booted = true;
      con = 'device';
      screenState = 'device';
      onBooted();
    }
  }

  /* ---------------- drawing ---------------- */
  function drawScreen() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
    ctx.clip();

    if (screenState === 'nocontroller') {
      ctx.fillStyle = BOOT_BLUE;
      ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
      // The console's own words, and the reason this room is here.
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO CONTROLLER', SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2);
    } else if (screenState === 'static') {
      // spr_static_effect, at the four corners the Draw event tiles it to,
      // advancing half a frame at a time.
      staticTimer += 0.5;
      const f = statics[Math.floor(staticTimer) % statics.length];
      ctx.fillStyle = '#000';
      ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
      for (let y = SCREEN_Y; y < SCREEN_Y + SCREEN_H; y += 128 * SCALE) {
        for (let x = SCREEN_X; x < SCREEN_X + SCREEN_W; x += 128 * SCALE) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(f, x, y, 128 * SCALE, 128 * SCALE);
        }
      }
      ctx.globalAlpha = 1;
    } else if (screenState === 'blue') {
      ctx.fillStyle = BOOT_BLUE;
      ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
    } else if (screenState === 'device') {
      // THE BOARD, on the television. The board screen's own blue, the
      // board's own font, and one line per device — the built one legible,
      // the rest in the cipher.
      ctx.fillStyle = BOARD_BLUE;
      ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);

      const cx = SCREEN_X + SCREEN_W / 2;
      const ADV = 16;            // fnt_8bit is monospaced at 16
      const GLYPH_SCALE = 2;     // 7x9 at 2 = 14x18, inside the 16x20 cell
      const FONT_H = 20;         // fnt_8bit's glyph box
      const lineH = 34;

      const widthOf = (d) => (d.ready ? textWidth(boardFont, d.name)
                                      : wingdingsWidth(d.name, ADV));
      const maxW = Math.max(...DEVICES.map(widthOf));

      // SCROLL ONLY IF THE LIST OUTGROWS THE SCREEN. Six names fit today;
      // this keeps the selected line on screen if more are ever added,
      // rather than quietly running off the bottom of the television.
      const listH = DEVICES.length * lineH;
      const pad = 26;
      const room = SCREEN_H - pad * 2;
      let scroll = 0;
      if (listH > room) {
        const want = deviceSel * lineH + lineH / 2 - room / 2;
        scroll = Math.max(0, Math.min(listH - room, want));
      }
      const top = SCREEN_Y + (listH > room ? pad : Math.round((SCREEN_H - listH) / 2)) - scroll;

      ctx.save();
      ctx.beginPath();
      ctx.rect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
      ctx.clip();

      DEVICES.forEach((d, i) => {
        const y = top + i * lineH;
        if (y + lineH < SCREEN_Y || y > SCREEN_Y + SCREEN_H) return;
        const chosen = i === deviceSel;
        const colour = chosen ? '#ffff00'
          : (d.ready ? '#ffffff' : 'rgba(255,255,255,0.66)');
        const x = Math.round(cx - widthOf(d) / 2);

        // Both kinds of glyph sit on the same optical line: the font's box
        // is 20 tall and the cipher's is 18, so the shorter one takes the
        // difference as a one-pixel nudge instead of riding high.
        if (d.ready) {
          drawText(ctx, boardFont, d.name, x, y, { color: colour });
        } else {
          const dy = Math.round((FONT_H - wingdingsHeight(GLYPH_SCALE)) / 2);
          drawWingdings(ctx, d.name, x, y + dy,
            { scale: GLYPH_SCALE, advance: ADV, color: colour });
        }

        // THE CURSOR SITS ON THE LINE'S MIDDLE. It is a 6px square centred
        // on the 20px glyph box, in one column off the widest name, so it
        // runs straight down instead of stepping in and out.
        if (chosen) {
          const size = 6;
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(Math.round(cx - maxW / 2) - 20,
                       Math.round(y + (FONT_H - size) / 2), size, size);
        }
      });
      ctx.restore();
    } else if (screenState === 'logo') {
      ctx.fillStyle = BOOT_BLUE;
      ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('THE DEVICE', SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2);
    }
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // The picture goes down first; the room is drawn over it and its own
    // frame does the occluding.
    drawScreen();
    ctx.drawImage(bg, 0, 0, bg.width * SCALE, bg.height * SCALE);

    // obj_gameshow_swordroute: the glow the television throws on the room,
    // additive, tinted by whatever the screen is showing.
    if (screenState !== 'off') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = screenState === 'static' ? 0.25 : 0.5;
      ctx.drawImage(tvglow, 0, 320, tvglow.width * SCALE, tvglow.height * SCALE);
      ctx.restore();
    }

    ctx.drawImage(consoleImg, 202, 322, consoleImg.width * SCALE, consoleImg.height * SCALE);

    const sprite = kris.holding
      ? krisHold
      : walk[FACE_KEY[kris.facing]][Math.floor(kris.imageIndex) % 4];
    ctx.drawImage(sprite, Math.round(kris.x), Math.round(kris.y), KRIS_W, KRIS_H);

    // NOTHING IS WRITTEN UNDER THE LIST. It used to say PRESS Z, which is
    // an instruction on a screen that is meant to be a list of names.
    if (screenState === 'device' && notBuilt > 0) {
      const line = 'NOT BUILT';
      const w = textWidth(boardFont, line);
      drawText(ctx, boardFont, line,
        Math.round(SCREEN_X + SCREEN_W / 2 - w / 2), SCREEN_Y + SCREEN_H - 34,
        { color: '#ffff00' });
    }

    // The prompt, only where it means something.
    if (con === 'idle' && atConsole()) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ Z ] PLUG IN THE CONTROLLER', VIEW_W / 2, 430);
    }
  }

  /* ---------------- the clock ---------------- */
  let raf = 0, acc = 0, last = performance.now();
  function frame(now) {
    acc += now - last;
    last = now;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) {
      acc -= MS_PER_FRAME;
      stepKris();
      stepConsole();
      pressed.clear();
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // A RETURNING VISITOR WALKS IN ON A SET THAT IS ALREADY ON.
  // Making them plug the controller in again every visit would turn the
  // ritual into a toll. The first time is the ritual; after that the
  // television is simply on, and Kris is already holding the thing.
  if (opts.alreadyBooted) {
    plugged = true;
    kris.holding = true;
    kris.frozen = false;
    kris.x = CONSOLE_SPOT_X;
    kris.y = CONSOLE_SPOT_Y;
    kris.facing = FACE_UP;
    con = 'device';
    screenState = 'device';
    booted = true;
    setTimeout(() => onBooted(), 0);
  } else {
    // The television is already on and already complaining when you walk in.
    play(nocontroller);
  }

  window.__room = {
    get kris() { return kris; },
    get con() { return con; },
    get screen() { return screenState; },
    get plugged() { return plugged; },
    atConsole,
    get deviceSel() { return deviceSel; },
    suspend(v = true) { suspended = v; },
    press: (k, on = true) => { if (on) { held.add(k); pressed.add(k); } else held.delete(k); },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      stop(nocontroller); stop(tvstatic);
    },
  };
  return window.__room;
}
