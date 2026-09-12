


import { cue } from './audio.js';
import { scrShakescreen } from './shake.js';



export const KRIS_IMPACT = 'spr_attack_cut1';


export const IMPACT = [
  { sprite: KRIS_IMPACT, speed: 0.334, maxindex: 3, shake: false },
  { sprite: 'spr_attack_mash2', speed: 0.5, maxindex: 4, shake: true },
  { sprite: 'spr_attack_slap1', speed: 0.5, maxindex: 4, shake: false },
];

export function createAttackVfx() {
  return [];
}



export function spawnImpact(state, x, y, slot, critical, rng) {
  const spec = IMPACT[slot];
  if (!spec) return;
  const { sprite } = spec;
  const r = () => (rng ? rng() : 0.5);
  state.attackVfx.push({

    x: x + r() * 6,
    y: y + r() * 6,
    sprite,
    index: 0,
    speed: spec.speed,
    maxindex: spec.maxindex,

    scale: critical ? 2.5 : 2,
    critical,
  });

  cue(state, 'snd_damage');

  if (spec.shake) {
    cue(state, 'snd_impact');
    scrShakescreen(state);
  }
}

export function stepAttackVfx(state) {
  const list = state.attackVfx;
  if (!list || !list.length) return;
  for (const v of list) {

    if (v.critical) v.scale += 0.1;
    v.index += v.speed;
  }

  state.attackVfx = list.filter((v) => v.index < v.maxindex);
}
