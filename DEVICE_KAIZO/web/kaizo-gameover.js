

import { KNIGHT_GAMEOVER_SCRIPT, GAMEOVER_ENTRY } from '../render/title.js';

export const SIDEB_FIRSTLOSS_LINE = [
  ' YOUR ADVERSARY', '', 'IS STRONGER THAN', 'I EVER COULD HAVE', 'POSSIBLY IMAGINED.',
];
export const SIDEB_FIRSTLOSS_PAUSE = { 15: 6 };

export const SIDEB_CHOICES = [
  { name: ['PROCEED', '(PROCEED)'], x: 70, y: 180, con: 53 },
  { name: ['PROCEED', '(PROCEED)'], x: 190, y: 180, con: 53 },
];

export const CON_RETRY = 53;

export const CON_MOVE_ON = 55;

export const SIDEB_GAMEOVER_SCRIPT = {
  lines: KNIGHT_GAMEOVER_SCRIPT.lines.map(
    (l, i) => (i === 1 ? SIDEB_FIRSTLOSS_LINE : l),
  ),
  pauses: KNIGHT_GAMEOVER_SCRIPT.pauses.map(
    (p, i) => (i === 1 ? SIDEB_FIRSTLOSS_PAUSE : p),
  ),
  choices: SIDEB_CHOICES,
};

export const SIDEB_THIRDLOSS_LINES = [
  { con: 33, rows: [' BEYOND ALL ODDS', '', ' YOU WERE THERE.'], pauses: { 16: 6 } },
  { con: 34, rows: ['    THE END.'], pauses: {} },
  { con: 50, rows: ['YOU MUST PERSIST', 'A LITTLE LONGER.'], pauses: { 16: 6 } },
];

export const KAIZO_GAMEOVER_ENTRY = GAMEOVER_ENTRY.ALWAYS;

export function kaizoGameOverOptions({ sideb = false, finalFailure = false } = {}) {
  return {
    entry: KAIZO_GAMEOVER_ENTRY,
    script: sideb ? SIDEB_GAMEOVER_SCRIPT : KNIGHT_GAMEOVER_SCRIPT,
    marker: !finalFailure,
    glide: !finalFailure,
  };
}

export function gameOverOutcome(con) {
  return con === CON_MOVE_ON ? 'moveOn' : 'retry';
}
