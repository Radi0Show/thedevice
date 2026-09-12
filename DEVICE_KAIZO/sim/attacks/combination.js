


import { spawn, destroy } from '../entity.js';
import { gmlShuffle } from '../rng.js';



export const COMBO_ATTACKS = {
  1: { name: 'obj_roaringknight_quickslash_attack', type: null },
  2: { name: 'obj_knight_rotating_slash', type: null },
  3: { name: 'obj_knight_tunnel_slasher_2_revised', type: null },
  4: { name: 'obj_knight_swordfall', type: null },
  5: { name: 'obj_knight_weird_bottom_manager', type: null },
};


export function registerComboAttack(id, type) {
  if (COMBO_ATTACKS[id]) COMBO_ATTACKS[id].type = type;
}


export const COMBO_ORDER = { first: 4, second: 2, third: 3, power: 1 };



export function chainNext(state, self, siteName) {

  if (siteName !== undefined) {
    const hook = state.kaizo?.hooks?.comboChainNext;
    if (hook) return hook(state, self, siteName);
  }

  if (self.next_up === -999 || self.next_up === -1 || self.next_up === undefined) {
    return null;
  }
  const entry = COMBO_ATTACKS[self.next_up];
  if (!entry) return null;
  if (!entry.type) {

    state.comboUntranslated = entry.name;
    const knight = state.entities.find(
      (k) => k.alive && k.type.name === 'obj_knight_enemy',
    );
    if (knight) knight.image_alpha = 1;
    state.turntimer = -1;
    return null;
  }

  const next = spawn(state, entry.type, { x: self.x, y: self.y });
  next.turn_type = 'end';
  if (self.turn_segment === 0) {
    next.turn_type = 'short mid';
    next.turn_segment = 1;
    next.next_up = self.next_next_up;
  }
  if (self.turn_segment === 1) {
    next.turn_type = 'short end';
    next.turn_segment = 2;
  }
  next.anchor_x = self.anchor_x;
  next.anchor_y = self.anchor_y;
  if (entry.type.init) entry.type.init(next, state);
  state.comboSegments = (state.comboSegments ?? 0) + 1;
  return next;
}



export function launchCombination(state) {
  const knight = state.entities.find(
    (k) => k.alive && k.type.name === 'obj_knight_enemy',
  );
  if (knight) knight.image_alpha = 0;
  state.turntimer = 999999;
  state.comboSegments = 0;
  state.comboUntranslated = null;


  gmlShuffle(state.gmlRng, [2, 3, 4, 5]);

  const composition = COMBO_ORDER.power;
  const entry = COMBO_ATTACKS[COMBO_ORDER.first];
  if (!entry?.type) {
    state.comboUntranslated = entry?.name ?? 'unknown';
    return null;
  }
  const first = spawn(state, entry.type, {
    x: knight?.x ?? state.view.x + 425,
    y: knight?.y ?? state.view.y + 78,
  });
  first.turn_type = composition === 1 ? 'short start' : 'start';
  first.turn_segment = composition ? 0 : -1;
  first.next_up = COMBO_ORDER.second;
  first.next_next_up = COMBO_ORDER.third;
  if (entry.type.init) entry.type.init(first, state);
  state.comboSegments = 1;
  return first;
}


export function comboSequence() {
  return [COMBO_ORDER.first, COMBO_ORDER.second, COMBO_ORDER.third]
    .map((id) => COMBO_ATTACKS[id]?.name ?? `#${id}`);
}

export { destroy };
