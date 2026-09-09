


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

      if (opts.onExit) opts.onExit();
      return;
    }
    if (board) board.stop();
    if (opts.onLevelChange) opts.onLevelChange(entry.number, entry.title);
    const level = await fetch(`${base}levels/${entry.file}`).then((r) => r.json());
    board = await runBoard(canvas, level, {
      base, audio,
      onComplete: (n) => {

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
