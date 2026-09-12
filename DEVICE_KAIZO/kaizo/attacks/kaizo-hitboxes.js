

import { kaizoMask } from '../data/masks.js';

function withPx(m) {
  if (!m.px) m.px = m.rows.map((r) => Array.from(r, (c) => c === '1'));
  return m;
}

export const KAIZO_SLASHTUNNEL_MASK = withPx(kaizoMask('spr_roaringknight_slash_tunnel'));

export const KAIZO_DIAMONDBULLET_L_MASK = withPx(kaizoMask('spr_knight_diamondbullet_l'));
