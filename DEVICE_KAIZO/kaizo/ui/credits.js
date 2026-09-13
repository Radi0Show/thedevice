

import { CREDITS } from '../../sim/modes.js';

export const ENDERCAT_ROW = {
  role: 'Creator of the original mod',
  who: 'ENDERCAT',
  link: 'gamebanana.com/mods/662826',
};

export const KAIZO_CREDITS = (() => {
  const rows = [...CREDITS];
  const wander = rows.findIndex((r) => r.who === 'WandeR');

  const at = wander >= 0
    ? wander + 1
    : Math.max(0, rows.findIndex((r) => !r.who) + 1 || rows.length);
  rows.splice(at, 0, ENDERCAT_ROW);
  return rows;
})();
