


import { spawn } from '../../sim/entity.js';
import { gmlShuffle } from '../../sim/rng.js';
import { cue } from '../../sim/audio.js';
import { knightWarp, knightWarpIn, knightWarpOut } from '../../sim/fx.js';

import { quickslashAttack } from './quickslash.js';
import { rotatingSlash } from './rotating-slash.js';
import { knightSwordfall } from './swordfall.js';
import { weirdBottomManager } from './underbox.js';

import { tunnelSlasher2 } from './sword-tunnel-revised.js';



export const KAIZO_COMBO_ATTACKS = {
  1: {
    name: 'obj_roaringknight_quickslash_attack',
    objectIndex: 366,
    type: quickslashAttack,
    source: 'kaizo',
  },
  2: {
    name: 'obj_knight_rotating_slash',
    objectIndex: 669,
    type: rotatingSlash,
    source: 'kaizo',
  },
  3: {
    name: 'obj_knight_tunnel_slasher_2_revised',
    objectIndex: 802,
    type: tunnelSlasher2,
    source: 'kaizo',
  },
  4: {
    name: 'obj_knight_swordfall',
    objectIndex: 630,
    type: knightSwordfall,
    source: 'kaizo',
  },
  5: {
    name: 'obj_knight_weird_bottom_manager',
    objectIndex: 1173,
    type: weirdBottomManager,
    source: 'kaizo',
  },
};



export const KAIZO_COMBO_ORDERS = {
  7: { first: 4, second: 2, third: 3, power: 1 },
  106: { first: 1, second: 2, third: 5, power: 1 },
};



export const KAIZO_COMBO_CREATE_DEFAULTS = {
  first: 4, second: 2, third: 3, power: 1,
};



export function kaizoComboOrderFor(ac) {
  return KAIZO_COMBO_ORDERS[ac] ?? KAIZO_COMBO_CREATE_DEFAULTS;
}


export function kaizoComboSequence(order) {
  return [order.first, order.second, order.third]
    .map((id) => KAIZO_COMBO_ATTACKS[id]?.name ?? `#${id}`);
}


function ledger(state, entry) {
  if (!state.kaizo) state.kaizo = {};
  (state.kaizo.approx ??= []).push(entry);
}

function knightOf(state) {
  return state.entities.find((k) => k.alive && k.type.name === 'obj_knight_enemy');
}



const CHAINED_ARMS = {
  obj_knight_weird_bottom_manager: {

    'short start': null,
    'short mid': (e, state) => {
      e.init_start = 2;
      e.init = 1;
      cue(state, 'snd_knight_teleport');
      e.local_turntimer = 170;
      e.image_alpha = 0;
      e.image_index = 5;
    },
    'short end': (e, state) => {
      e.init_start = 2;
      e.init = 1;
      cue(state, 'snd_knight_teleport');
      e.local_turntimer = 170;
      e.image_alpha = 0;
      e.image_index = 5;
    },
    end: (e, state) => {
      e.init_start = 2;
      e.init = 1;
      cue(state, 'snd_knight_teleport');
      e.local_turntimer = 200;
      e.image_alpha = 0;
      e.image_index = 5;
    },
  },
};



function applyChainedArm(state, next, entry) {
  const arms = CHAINED_ARMS[entry.name];
  const arm = arms ? arms[next.turn_type] : undefined;
  if (arm === undefined) {

    if (entry.type.init) entry.type.init(next, state);
    return { supplemented: false };
  }
  if (arm === null) {

    ledger(state, {
      type: 105,
      asked: `${entry.name} event_user(0) arm "${next.turn_type}"`,
      used: 'no setup',
      why: 'arm unreachable from either dispatched order; not translated',
    });
    return { supplemented: false };
  }
  arm(next, state);
  return { supplemented: true };
}



export function kaizoComboPromote(self, next) {
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
  return next;
}



export const KAIZO_CHAIN_SITES = {


  quickslash_step: {
    gml: 'gml_Object_obj_roaringknight_quickslash_attack_Step_0.gml:60-148',
    at: (state) => {
      const k = knightOf(state);
      return { x: (k ? k.x : 0) - 100, y: k ? k.y : 0 };
    },

    pre: {
      2: (n) => { n.x += 50; },
      3: (n) => { n.x += 25; },
      4: (n) => { n.x -= 50; },
      5: (n) => { n.x += 50; },
    },

    warp: (id) => id !== 5,
    warpEvent: 'in',
    post: {

      2: (n) => { n.timer = 4; },

      5: (n) => { n.alarm[0] = 1; n.init_start = 3; n.init = 4; },
    },

    self: (self, id) => {
      self.done = true;
      self.local_turntimer = 99999;
      self.slash_count = (id === 5 || id === 4) ? 993 : 999;
      if (id > 0) {
        self.nodraw = true;
        self.auto = false;
      }
    },
  },



  rotating_step: {
    gml: 'gml_Object_obj_knight_rotating_slash_Step_0.gml:64-196',
    at: (state) => {
      const k = knightOf(state);
      return { x: k ? k.x : 0, y: k ? k.y : 0 };
    },

    threshold: { 1: 240, 3: 220, 4: 'turn_limit_4', 5: 'turn_limit_4' },
    warp: (id) => id === 1 || id === 3 || id === 4,
    warpEvent: 'in',
    warpOffset: {
      1: { x: 50, y: -44 },
      3: { x: 25, y: -44 },
      4: { x: -60, y: -44 },
    },


    promote: {
      3: (self, next) => {
        next.turn_type = 'end';
        if (self.turn_segment === 0) {
          next.turn_type = 'short mid';
          next.turn_segment = 1;
          next.next_up = self.next_next_up;

          next.timer = -8;
        }
        if (self.turn_segment === 1) {
          next.turn_type = 'short mid';
          next.turn_segment = 2;
        }
        next.anchor_x = self.anchor_x;
        next.anchor_y = self.anchor_y;
        return next;
      },
    },
    post: {

      1: (n) => { n.timer = n.spawn_speed; },

      3: (n) => {
        if (n.turn_type === 'short mid' || n.turn_type === 'short end') {
          n.timer = -12;
          n.local_turntimer += 12;
        }
      },

      5: (n) => { n.init_start = 4; n.init = 8; },
    },
  },



  rotating_alarm2: {
    gml: 'gml_Object_obj_knight_rotating_slash_Alarm_2.gml',
    at: (state, self) => ({ x: self.x, y: self.y }),
    warp: () => false,
    post: {
      1: (n) => { n.timer = n.spawn_speed; },
    },
    unsupported: [2],
  },



  underbox_alarm2: {
    gml: 'gml_Object_obj_knight_weird_bottom_manager_Alarm_2.gml',
    at: (state, self) => ({ x: self.x, y: self.y }),
    warp: () => true,
    warpEvent: 'in',
    post: {
      1: (n) => { n.timer = n.spawn_speed; },
      4: (n) => { n.countdowner = 10; },
    },
    unsupported: [5],
  },



  tunnel_step: {
    gml: 'gml_Object_obj_knight_tunnel_slasher_2_revised_Step_0.gml:5-64',

    at: (state) => {
      const k = knightOf(state);
      return { x: (k ? k.x : 0) - 100, y: (k ? k.y : 0) - 88 };
    },

    pre: {
      4: (n) => { n.x -= 20; n.y -= 66; },
    },

    warp: (id) => id === 4,
    warpEvent: 'in',
    post: {

      5: (n) => { n.init_start = 3; n.init = 6; },
    },
    unsupported: [1, 2, 3],
    unsupportedWhy: 'ORIGINAL: this Step has blocks for next_up 4 and 5 only,'
      + ' so no other id hands on from here at all',
  },



  tunnel_alarm2: {
    gml: 'gml_Object_obj_knight_tunnel_slasher_2_revised_Alarm_2.gml',
    at: (state, self) => ({ x: self.x, y: self.y }),

    warp: () => false,
    pre: {

      1: (n) => {
        n.local_turntimer -= n.spawn_speed - n.timer;
        n.timer = n.spawn_speed;
      },
    },
    unsupported: [3],
  },


  swordfall_alarm3: {
    gml: 'gml_Object_obj_knight_swordfall_Alarm_3.gml',
    at: (state, self) => ({ x: self.x, y: self.y }),
    warp: (id) => id === 5,
    warpEvent: 'out',
    post: {
      3: (n) => { n.timer = -8; n.fake_timer = -8; },
      5: (n) => { n.alarm[0] = 1; },
    },
    unsupported: [4],
  },
};



export function kaizoChainNext(state, self, siteName = 'rotating_alarm2') {
  const site = KAIZO_CHAIN_SITES[siteName];
  if (!site) throw new Error(`kaizoChainNext: unknown handoff site ${siteName}`);

  const id = self.next_up;

  if (id === -999 || id === -1 || id === undefined) return null;

  if (site.unsupported && site.unsupported.includes(id)) {

    ledger(state, {
      type: 105,
      asked: `${siteName} -> segment ${id}`,
      used: 'nothing (the site\'s switch has no case for it)',
      why: site.unsupportedWhy
        ?? 'ORIGINAL: instance_create(x, y, -4); no dispatched order reaches it',
    });
    self.next_up = -999;
    return null;
  }

  const entry = KAIZO_COMBO_ATTACKS[id];
  if (!entry || !entry.type) {

    ledger(state, {
      type: 105,
      asked: `combination segment ${id}`,
      used: 'turn ended early',
      why: 'no module registered for that segment id',
    });
    const knight = knightOf(state);
    if (knight) knight.image_alpha = 1;
    state.turntimer = -1;
    self.next_up = -999;
    return null;
  }

  const at = site.at(state, self);
  const next = spawn(state, entry.type, { x: at.x, y: at.y });


  for (const f of ['damage', 'grazepoints', 'timepoints', 'inv', 'target']) {
    if (self[f] !== undefined && self[f] !== -1) next[f] = self[f];
  }
  if (self.grazed !== undefined && self.grazed !== -1) next.grazed = 0;
  if (self.grazetimer !== undefined && self.grazetimer !== -1) next.grazetimer = 0;
  if (self.element !== undefined) next.element = self.element;
  next.creatorid = self.creatorid;
  next.creator = self.creator;

  if (site.pre && site.pre[id]) site.pre[id](next, self, state);


  (site.promote?.[id] ?? kaizoComboPromote)(self, next);

  if (site.warp && site.warp(id)) {
    const off = (site.warpOffset && site.warpOffset[id]) || { x: 0, y: 0 };

    next.x += off.x;
    next.y += off.y;
    const w = spawn(state, knightWarp, { x: next.x, y: next.y });
    w.master = next;
    if (site.warpEvent === 'out') knightWarpOut(state, w);
    else knightWarpIn(state, w);
  }


  next.anchor_x = self.anchor_x;
  next.anchor_y = self.anchor_y;
  const armed = applyChainedArm(state, next, entry);

  if (site.post && site.post[id]) site.post[id](next, self, state);

  if (entry.source !== 'kaizo') {

    ledger(state, {
      type: 105,
      asked: `combination segment ${id} (${entry.name})`,
      used: `the verified sim module (${entry.why ?? 'no kaizo copy'})`,
      why: 'segment module not translated for kaizo yet',
    });
  }

  self.next_up = -999;
  state.kaizoComboSegments = (state.kaizoComboSegments ?? 0) + 1;
  state.kaizoComboArmSupplemented = armed.supplemented;
  return next;
}



export function launchKaizoCombination(state, order = KAIZO_COMBO_CREATE_DEFAULTS) {
  const knight = knightOf(state);

  if (knight) knight.image_alpha = 0;
  state.turntimer = 999999;
  state.kaizoComboSegments = 0;
  state.kaizoComboOrder = [order.first, order.second, order.third];


  const composition = order.power ?? 1;


  if (state.gmlRng) gmlShuffle(state.gmlRng, [2, 3, 4, 5]);

  const entry = KAIZO_COMBO_ATTACKS[order.first];
  if (!entry || !entry.type) {
    ledger(state, {
      type: 105,
      asked: `combination first segment ${order.first}`,
      used: 'nothing launched',
      why: 'no module registered for that segment id',
    });
    return null;
  }


  const first = spawn(state, entry.type, {
    x: knight ? knight.x : state.view.x + 425,
    y: knight ? knight.y : state.view.y + 78,
  });

  first.turn_type = composition === 1 ? 'short start' : 'start';
  first.turn_segment = composition ? 0 : -1;
  first.next_up = order.second;
  first.next_next_up = order.third;

  applyChainedArm(state, first, entry);
  first.creatorid = knight ?? null;
  first.creator = knight ?? null;
  state.kaizoComboSegments = 1;

  if (entry.source !== 'kaizo') {
    ledger(state, {
      type: 105,
      asked: `combination segment ${order.first} (${entry.name})`,
      used: `the verified sim module (${entry.why ?? 'no kaizo copy'})`,
      why: 'segment module not translated for kaizo yet',
    });
  }
  return first;
}
