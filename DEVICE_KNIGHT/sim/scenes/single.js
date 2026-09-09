


import { spawn, destroy } from '../entity.js';
import { battlebox, settleBox } from '../battlebox.js';
import { gmlCreate } from '../rng.js';
import { knightActor, partyActor, PARTY, KNIGHT, BOX } from '../actors.js';
import { launchAttack, openArena, clearTurn, deliverHeart, FIGHT_TABLE } from './fight.js';
import { createMenu } from '../menu.js';
import { freshParty, scrRevive, partyWiped } from '../damage.js';
import { cueLoop } from '../audio.js';
import { COMBO_ATTACKS } from '../attacks/combination.js';


const COMBO_SEGMENT_NAMES = new Set(Object.values(COMBO_ATTACKS).map((a) => a.name));



export const ATTACK_MENU = [
  { id: 'stars', ac: 1, name: 'Stars', difficulties: [0, 1, 2], where: 'phase 1/2/3 opener' },
  { id: 'tracking11', ac: 11, name: 'Tracking Swords', difficulties: [0], where: 'phase 1 turn 2' },
  { id: 'flurry', ac: 2, name: 'Flurry (box splitter)', difficulties: [0, 1, 3], where: 'phase 1/2/3' },
  { id: 'tunnel', ac: 13, name: 'Sword Tunnel', difficulties: [0, 3, 4], where: 'phase 1/2/3' },
  { id: 'rotating', ac: 5, name: 'Rotating Slash', difficulties: [0, 1, 2], where: 'closes every phase' },
  { id: 'vortex', ac: 15, name: 'Sword Vortex + Tracking', difficulties: [0], where: 'phase 2 turn 4' },
  { id: 'tracking14', ac: 14, name: 'Tracking Swords (late)', difficulties: [0], where: 'phase 3 turn 3' },
  { id: 'roaring', ac: 9, name: 'ROARING', difficulties: [0], where: 'phase 4 finale' },
  { id: 'stream', ac: 4, name: 'X Attacks (stream)', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'swordfall', ac: 10, name: 'Swords Falling', difficulties: [0, 1], where: 'UNUSED', unused: true },
  { id: 'underbox', ac: 6, name: 'Orbs Under the Box', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'knightlines', ac: 20, name: 'Knightlines (spears)', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'swordslash', ac: 0, name: 'Swordslash (crescents)', difficulties: [0, 1], where: 'UNUSED', unused: true },

  { id: 'tunnel2', ac: 3, name: 'Sword Tunnel (revised)', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'combination', ac: 7, name: 'Combination', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'diagonal', ac: 12, name: 'Diagonal Bullets', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'rotating16', ac: 16, name: 'Rotating + Tracking', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'tracking17', ac: 17, name: 'Tracking Swords (multi)', difficulties: [0], where: 'UNUSED', unused: true },
];

export function menuEntry(id) {
  return ATTACK_MENU.find((a) => a.id === id) ?? ATTACK_MENU[0];
}



export function difficultyBlurb(ac, diff) {
  const phases = [];
  for (const p of [1, 2, 3, 4]) {
    for (const row of FIGHT_TABLE[p]) {
      if (row.ac === ac && row.difficulty === diff && !phases.includes(p)) phases.push(p);
    }
  }
  if (!phases.length) return 'UNUSED';
  return `phase ${phases.join(' & ')}`;
}

const GAP = 45;
const DRAIN = 90;

const RTIMER_SPAWN = 12;

const director = {
  name: 'practice_director',

  create(e, state) {
    e.started = false;
    e.gap = GAP;
    e.drain = 0;
    e.elapsed = 0;
    e.owner = null;
    e.runs = 0;
    e.musicStarted = false;

    state.currentAc = state.practiceEntry.ac;
  },

  step(e, state) {

    if (e.rebuild) {
      e.rebuild = false;
      settleBox(spawn(state, battlebox, { x: BOX.x, y: BOX.y }));
    }
  },
  endStep(e, state) {

    if (!state.gameOver && partyWiped(state)) state.gameOver = true;
    if (state.gameOver) return;

    if (!e.musicStarted) {
      e.musicStarted = true;
      cueLoop(state, 'mus_knight');
    }
    if (e.started && state.turntimer > 0) state.turntimer -= 1;

    const entry = state.practiceEntry;
    state.phase = `${entry.name} · difficulty ${entry.difficulty} · run ${e.runs}`;

    if (e.started) {
      e.elapsed += 1;

      if (e.owner && !e.owner.alive) {
        const next = state.entities.find(
          (x) => x.alive && COMBO_SEGMENT_NAMES.has(x.type.name),
        );
        if (next) e.owner = next;
      }
      const ownerAlive = e.owner && e.owner.alive;
      const bulletsLeft = state.entities.some(
        (x) => x.alive && x.isBullet && x.type.name !== 'obj_heart',
      );

      const timeUp = state.turntimer <= 0 || !ownerAlive;
      if (timeUp) e.drain += 1;
      if (!(timeUp && (!bulletsLeft || e.drain >= DRAIN))) return;

      e.started = false;
      e.gap = GAP;
      e.runs += 1;

      state.partyHp = freshParty();

      for (let i = 0; i < 3; i++) scrRevive(state, i);
      state.invTimer = -1;
      clearTurn(state);

      if (state.soul?.alive) destroy(state.soul);
      state.soul = null;
      const oldGt = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_growtangle',
      );
      if (oldGt) destroy(oldGt);
      e.rebuild = true;

      state.currentAc = state.practiceEntry.ac;
      return;
    }

    e.gap -= 1;

    if (e.gap === RTIMER_SPAWN) {
      openArena(state, state.practiceEntry);

      const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
      if (gt) gt.arenaOpened = state.practiceEntry.ac;

      if (!state.soul) deliverHeart(state, gt, state.practiceEntry.ac);
    }
    if (e.gap > 0) return;
    e.owner = launchAttack(state, state.practiceEntry);
    e.started = true;
    e.elapsed = 0;
    e.drain = 0;
  },
};



export function buildSingleAttackScene(state, { seed = 12345, attack = 'stars', difficulty = 0 } = {}) {
  const m = menuEntry(attack);

  state.menu = createMenu();
  state.hp = 0;
  state.invTimer = -1;
  state.view = { x: 0, y: 0 };
  state.flag22 = 0;
  state.gmlRng = gmlCreate(seed);
  state.turntimer = 0;
  state.invc = 1;
  state.practiceEntry = {
    ac: m.ac,
    name: m.name,
    difficulty: m.difficulties.includes(difficulty) ? difficulty : m.difficulties[0],
  };
  state.phase = m.name;

  spawn(state, knightActor, { x: KNIGHT.x, y: KNIGHT.ystart });
  for (const p of PARTY) {
    spawn(state, partyActor, { x: p.x, y: p.y, sprite_index: p.sprite, depth: p.depth });
  }

  settleBox(spawn(state, battlebox, { x: BOX.x, y: BOX.y }));

  state.soul = null;
  spawn(state, director);
  return state;
}
