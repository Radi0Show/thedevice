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

// THE BACKGROUND HAS AN ORIGIN, AND IT IS NOT (0,0).
//
// `spr_gameshow_swordroutebg` carries ox=5, oy=5. GameMaker positions every
// draw relative to the origin, so `scr_dark_marker(0, 0, ...)` puts the
// sprite's top-left at (-10,-10) once the dark world's scale of 2 is in.
// Drawing it at a flat (0,0) — which is what this did at first — slid the
// whole room ten pixels down and right, and the giveaway was the TV glow:
// spr_gameshow_swordroute_tvglow has origin (0,0) and its trapezoid is cut
// to the screen exactly, so the light landed ten pixels off the hole it was
// supposed to be spilling out of.
const BG_ORIGIN_X = 5, BG_ORIGIN_Y = 5;
const BG_OFFSET_X = -BG_ORIGIN_X * 2, BG_OFFSET_Y = -BG_ORIGIN_Y * 2;

// The gap in that sprite, in room pixels, with the origin accounted for:
// sprite (69,21)-(260,164) -> (128,32) 384x288. The glow's top edge spans
// exactly 128..512, which is how this was confirmed.
const SCREEN_X = 128, SCREEN_Y = 32, SCREEN_W = 384, SCREEN_H = 288;
export const SCREEN = { x: SCREEN_X, y: SCREEN_Y, w: SCREEN_W, h: SCREEN_H };

const BWSPEED = 3;                     // obj_mainchara Create
const KRIS_W = 19 * SCALE, KRIS_H = 38 * SCALE;

// obj_swordroute_consolestarter: where Kris ends up, and where he came in.
const CONSOLE_SPOT_X = 300, CONSOLE_SPOT_Y = 298;
const ENTRY_X = 576;

// The blue the console boots to, straight out of the Step event.
const BOOT_BLUE = '#2F38B0';
// THE BOARD'S BLUE.
//
// obj_board_b2s_icedoor fills with `#3F48CC` — `draw_sprite_ext(spr_pxwhite,
// 0,0,0, 640,480, 0, #3F48CC, 1)`, the blue behind "AREN'T YOU FORGETTING
// SOMETHING IMPORTANT?". Flat and at full strength on a bright canvas it
// came out more electric than the screen in the game does, so this is the
// console's own boot blue instead: darker, still the game's, and the same
// value the set shows on its way up. One constant if it wants tuning again.
const BOARD_BLUE = '#2F38B0';

/**
 * THE DEVICES.
 *
 * One is built and named. The rest are listed in the cipher — an empty slot
 * that reads "JEVIL, COMING SOON" is a roadmap, and a roadmap is a promise
 * about a date. See shared/wingdings.js.
 */
const DEVICES = [
  { name: 'DEVICE_KNIGHT', href: '../DEVICE_KNIGHT/', ready: true },
  { name: 'DEVICE_JOKER', ready: false },
  { name: 'DEVICE_EMAIL', ready: false },
  { name: 'DEVICE_MANTLE', ready: false },
  { name: 'DEVICE_HAMMER', ready: false },
  { name: 'DEVICE_FIGURE', ready: false },
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

  // obj_tvturnoff_manager's two pieces: the bar that collapses and the dot
  // that pops. Missing assets must not stop the room loading, so the
  // transition degrades to a plain navigation.
  const tvBar = await loadImage(`${opts.tvBase ?? 'assets/tv/'}bar.png`).catch(() => null);
  const tvDot = await loadImage(`${opts.tvBase ?? 'assets/tv/'}dot.png`).catch(() => null);

  const [bg, consoleImg, tvglow, krisHold, ...rest] = await Promise.all([
    loadImage(`${base}bg.png`),
    loadImage(`${base}console.png`),
    loadImage(`${base}tvglow.png`),
    // THE PLAYER IS THE VESSEL — the grey, brown-haired one. The frames are
    // a region-aware palette map over the kris_* set (tools/make-vessel.py),
    // so every pose is silhouette-identical; only the colours moved.
    loadImage(`${base}vessel_hold.png`),
    ...['d', 'r', 'u', 'l'].flatMap((d) => [0, 1, 2, 3].map((f) => loadImage(`${base}vessel_${d}_${f}.png`))),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((f) => loadImage(`${base}static_${f}.png`)),
  ]);
  const walk = { d: rest.slice(0, 4), r: rest.slice(4, 8), u: rest.slice(8, 12), l: rest.slice(12, 16) };
  const statics = rest.slice(16, 24);

  /* ---------------- sound ---------------- */
  const soundOn = opts.soundOn !== false;
  const nocontroller = new Audio(`${base}nocontroller.wav`);
  const tvstatic = new Audio(`${base}tvstatic.wav`);
  nocontroller.volume = 0.4; tvstatic.volume = 0.35;
  // obj_tvturnoff_manager's two cues. Played in reverse order, because the
  // picture is.
  const tvBase = opts.tvBase ?? 'assets/tv/';
  const sndTvOff = new Audio(`${tvBase}tvturnoff.wav`);
  const sndTvOff2 = new Audio(`${tvBase}tvturnoff2.wav`);
  sndTvOff.volume = 0.5; sndTvOff2.volume = 0.5;
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
        if (d.ready) startLaunch(d.href);
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

  // THE WALK BOX IS MINE, and so is the furniture's collision.
  //
  // room_board_sword_intro contains no solids at all — eight instances, not
  // one of them a wall — because in the game you never walk here: the
  // console starter drives Kris to the console on a timer and the room is a
  // cutscene. Free movement is this site's addition, so the floor it walks
  // on and the things standing on it had to be described. The rectangles
  // below are fitted to the art, not read out of the room.
  const WALK = { x1: 110, x2: 620, y1: 250, y2: 340 };

  /**
   * The console, as a thing you cannot walk through.
   *
   * spr_gameshow_console is 99x45 drawn at 2 from (202,322), so it covers
   * x 202..400. Only its base blocks: a solid box the full height of the
   * sprite would also swallow the spot the game itself walks Kris to.
   */
  const SOLIDS = [
    // The console on the floor — sized to the ART, not the file.
    // console.png is 99x45 but the unit's opaque pixels occupy only
    // x 34..83, y 0..16 of it (the rest is transparent padding), so drawn
    // at (202,322) x2 the VISIBLE console is x 270..369, y 322..355. The
    // old box (x 206..396, y 380..414) was derived from the padded file:
    // it floated in empty floor BELOW the unit — an invisible wall you
    // could not cross, while the console itself could be walked over.
    // This box is the unit's footprint, feet allowed to its base edge.
    { x: 270, y: 336, w: 100, h: 18 },
  ];

  /**
   * Kris collides on his FEET, not his whole body.
   *
   * He is 38x76 with his head in the upper two thirds, and a box that size
   * cannot stand in front of anything — it would collide with the console
   * while his feet were still a body-length away from it. Overworld
   * characters resolve on a small box at the base, and so does this one.
   */
  const FEET = { inset: 8, height: 12 };
  const feetBox = (x, y) => ({
    x: x + FEET.inset,
    y: y + KRIS_H - FEET.height,
    w: KRIS_W - FEET.inset * 2,
    h: FEET.height,
  });

  const meets = (x, y) => {
    const f = feetBox(x, y);
    if (x < WALK.x1 || x + KRIS_W > WALK.x2 || y < WALK.y1 || y > WALK.y2) return true;
    return SOLIDS.some((s) =>
      f.x < s.x + s.w && f.x + f.w > s.x && f.y < s.y + s.h && f.y + f.h > s.y);
  };

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

  /* ---------------- THE SET TURNS ON, AND TAKES YOU WITH IT ----------------
   *
   * obj_tvturnoff_manager, backwards. Its Draw runs three phases:
   *
   *   con 0   5 frames  a white bar at scale (6, 10) fades in
   *   con 1   8 frames  yscale eases 10 -> 0.05: the picture collapses to a
   *                     line. snd_tvturnoff on frame 4.
   *   con 2  30 frames  xscale eases -> 0 while a dot pops to 0.4 over 5
   *                     frames and shrinks away again. snd_tvturnoff2.
   *
   * Run in reverse that is a set coming ON: a dot, a line thrown out of it,
   * the line opening into a full white field — and the navigation happens
   * under the white, so the page change is never seen. The sounds play in
   * reverse order for the same reason the picture does.
   */
  let launch = null;

  function startLaunch(href) {
    if (launch) return;
    launch = { href, t: 0, gone: false };
    play(sndTvOff2);
  }

  const LAUNCH_DOT = 10;      // the dot swelling out of nothing
  const LAUNCH_LINE = 12;     // the line thrown wide
  const LAUNCH_OPEN = 10;     // the field opening vertically
  const LAUNCH_TOTAL = LAUNCH_DOT + LAUNCH_LINE + LAUNCH_OPEN + 6;

  function stepLaunch() {
    if (!launch) return;
    launch.t += 1;
    if (launch.t === LAUNCH_DOT) play(sndTvOff);
    // The white is total by now, so the page can change underneath it.
    if (launch.t >= LAUNCH_TOTAL && !launch.gone) {
      launch.gone = true;
      if (opts.onLaunch) opts.onLaunch(launch.href);
      else location.href = launch.href;
    }
  }

  /** The reversed animation, drawn over the whole view. */
  function drawLaunch() {
    if (!launch) return;
    const t = launch.t;
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    const ease = (a, b, k) => a + (b - a) * Math.min(1, Math.max(0, k));

    // Phase 1 — the dot pops out of nothing and fades back down.
    if (tvDot && t < LAUNCH_DOT + LAUNCH_LINE) {
      const k = t / LAUNCH_DOT;
      const sc = k <= 1 ? ease(0, 0.4, k) : ease(0.4, 0, (t - LAUNCH_DOT) / LAUNCH_LINE);
      if (sc > 0) {
        ctx.drawImage(tvDot, cx - (tvDot.width * sc) / 2, cy - (tvDot.height * sc) / 2,
          tvDot.width * sc, tvDot.height * sc);
      }
    }

    // Phase 2 — the line is thrown wide; phase 3 — it opens into a field.
    if (tvBar && t >= LAUNCH_DOT) {
      const wk = Math.min(1, (t - LAUNCH_DOT) / LAUNCH_LINE);
      const hk = Math.max(0, (t - LAUNCH_DOT - LAUNCH_LINE) / LAUNCH_OPEN);
      const xs = ease(0, 6, wk);
      const ys = ease(0.05, 10, hk);
      const w = tvBar.width * xs, h = tvBar.height * ys;
      ctx.drawImage(tvBar, cx - w / 2, cy - h / 2, w, h);
    }

    // …and once it is wide open, plain white, so nothing shows through.
    if (t >= LAUNCH_DOT + LAUNCH_LINE + LAUNCH_OPEN) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
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
      const GLYPH_SCALE = 1;     // real Wingdings, 16x16, the font's own cell
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
    // THE TUBE'S FALLOFF. A flat fill reads as a printed panel; a screen is
    // brighter down the middle and loses its corners. This sits over
    // whatever the set happens to be showing, because it belongs to the
    // glass rather than to the picture.
    const vg = ctx.createRadialGradient(
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2, SCREEN_W * 0.18,
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2, SCREEN_W * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.62, 'rgba(0,0,16,0.20)');
    vg.addColorStop(1, 'rgba(0,0,12,0.52)');
    ctx.fillStyle = vg;
    ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // The picture goes down first; the room is drawn over it and its own
    // frame does the occluding.
    drawScreen();
    ctx.drawImage(bg, BG_OFFSET_X, BG_OFFSET_Y, bg.width * SCALE, bg.height * SCALE);

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

    drawLaunch();

    // (the "[ Z ] PLUG IN THE CONTROLLER" prompt is gone by request —
    // Z at the console still does the interaction, it is just unlabelled)
  }

  /* ---------------- the clock ---------------- */
  let raf = 0, acc = 0, last = performance.now();
  function frame(now) {
    acc += now - last;
    last = now;
    // A hidden tab pauses rAF but time keeps passing - without this
    // clamp the backlog replays at 8x on return (the fast-forward
    // burst). Coming back resumes at normal speed, dropping the gap.
    if (acc > MS_PER_FRAME * 4) acc = MS_PER_FRAME;
    let guard = 0;
    while (acc >= MS_PER_FRAME && guard++ < 8) {
      acc -= MS_PER_FRAME;
      stepKris();
      stepConsole();
      stepLaunch();
      if (notBuilt > 0) notBuilt -= 1;
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
    get launch() { return launch; },
    startLaunch,
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
