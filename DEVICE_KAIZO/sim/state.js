


import { freshParty } from './damage.js';
import { freshInventory } from './items.js';
import { createHeroes } from './heroes.js';
import { createDmgNumbers } from './dmgnumbers.js';
import { createAttackVfx } from './attackvfx.js';
import { createRudeBuster } from './rudebuster.js';
import { createDialogue } from './dialogue.js';
import { createKnight } from './knight.js';
import { createRng, gmlCreate } from './rng.js';

export function createState({ seed, traceBulletSlots = 0, bag = null } = {}) {
  if (!Number.isInteger(seed)) {
    throw new Error(`seed must be an integer, got ${seed}`);
  }

  return {

    frame: 0,

    seed,
    rng: createRng(seed),

    entities: [],
    nextSpawnSeq: 0,


    soul: null,
    hp: 0,
    invTimer: 0,


    view: { x: 0, y: 0 },
    flag22: 0,
    sp: 4,
    heartx: 0,
    hearty: 0,
    turntimer: 999,
    invc: 1,


    damageEnabled: true,

    partyHp: freshParty(),
    loadout: { shadowMantle: true },

    charaction: [0, 0, 0],


    chardead: [0, 0, 0],
    charmove: [1, 1, 1],
    charcantarget: [1, 1, 1],
    charspecial: [0, 0, 0],
    gameOver: false,

    knight: createKnight(),

    fightBar: null,

    heroes: createHeroes(),

    dmg: createDmgNumbers(),

    attackVfx: createAttackVfx(),

    rude: createRudeBuster(),

    dialogue: createDialogue(),

    tension: 0,

    inventory: freshInventory(bag),
    grazeTimer: 0,
    grazeCount: 0,


    chooseTable: null,
    chooseIndex: 0,


    gmlRng: gmlCreate(0),


    phase: 'none',


    eventPhase: 'init',


    input: null,

    traceBulletSlots,
    trace: [],


    counters: {
      collisionChecks: 0,
      unmaskedBullets: 0,
      collisionHits: 0,
      motionSteps: 0,
      alarmFires: 0,
    },
  };
}
