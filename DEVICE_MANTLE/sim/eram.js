// THE EMBED SURFACE — the one function a host page calls to run the whole
// sword route on its own canvas.
//
// This is the contract DEVICE_MENU will use (thedevice's INTEGRATION.md
// § Connect eram-sim): the host hands over a canvas and a base path,
// everything the sim fetches is relative to that base, audio can be
// injected or created here, and the campaign chains all seven levels
// itself. No DOM is touched beyond the given canvas; no globals beyond the
// debug `window.__board` the levels already expose.
//
//   const eram = await mountEram(tvCanvas, {
//     base: './DEVICE_MANTLE/assets/',
//     onLevelChange: (n, title) => ...,   // the TV can label itself
//     onExit: () => ...,                  // the route finished (level 7's
//   });                                   // chest) — hand the TV back
//   eram.jump(3);                         // debug: start a given level
//   eram.stop();                          // tear down mid-run
//
// The host page's own chrome (level buttons, HUD readouts, CRT/sound
// toggles) is optional sugar on top of `eram.board` — index.html is the
// reference implementation and the bug-test harness.

import { runBoard } from './board.js';
import { createAudio } from './audio.js';

export async function mountEram(canvas, opts = {}) {
  const base = opts.base ?? 'assets/';
  const audio = opts.audio ?? createAudio(base);
  const index = await fetch(`${base}levels/index.json`).then((r) => r.json());

  let board = null;
  let stopped = false;

  async function start(number) {
    if (stopped) return;
    const entry = index.find((e) => e.number === number);
    if (!entry) {
      // past the last level: the route is done
      if (opts.onExit) opts.onExit();
      return;
    }
    if (board) board.stop();
    if (opts.onLevelChange) opts.onLevelChange(entry.number, entry.title);
    const level = await fetch(`${base}levels/${entry.file}`).then((r) => r.json());
    board = await runBoard(canvas, level, {
      base, audio,
      onComplete: (n) => {
        // The game leaves for rooms outside the route here; the campaign
        // hands you the next level.
        setTimeout(() => { if (!stopped) start(n + 1); }, 2000);
      },
    });
  }

  await start(opts.startLevel ?? 1);

  return {
    get board() { return board; },
    get levels() { return index; },
    audio,
    jump(n) { return start(n); },
    stop() {
      stopped = true;
      if (board) board.stop();
      board = null;
    },
  };
}
