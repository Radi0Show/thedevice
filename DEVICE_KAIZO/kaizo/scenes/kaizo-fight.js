

import { buildKaizoTurnLoop } from './kaizo-practice.js';
import { vcHooks } from './kaizo-vc-hooks.js';
import { kaizoVortexendFreeze } from '../attacks/sword-vortex.js';
import {
  installRoster, WEIRD_ROUTE_PARTY, NORMAL_ROUTE_PARTY, maxhpOfChar, charIdOf,
  CHAR_NONE, CHAR_KRIS, CHAR_NOELLE,
} from '../party/roster.js';
import { scrKaizoTarget, kaizoKnightTarget, kaizoDamageHooks } from '../party/damage.js';
import { kaizoAdvanceBalloon } from '../party/freeze.js';
import { createKaizoHeroes } from '../party/heroes.js';
import { installKaizoMenu } from '../party/spells.js';
import { VC_TABLE, VD_TABLE, VC_KNIGHT } from '../versions/vc-script.js';
import { tensionbarDraw } from '../party/tensionbar.js';
import { ensureEnding, FLAG_WEIRD_ROUTE } from './kaizo-ending.js';
import { spawn } from '../../sim/entity.js';
import { PARTY } from '../../sim/damage.js';
import { VICTORY_LINES, buildVictoryScript, setVictoryVariant } from '../../sim/victory-scene.js';

export const KAIZO_NOTE =
  'KAIZO KNIGHT — a recreation of EnderCat8\'s "Kaizo Roaring Knight" mod '
  + '(v2.3.3): its schedule, attacks and party, diffed frame by frame against '
  + 'recordings of the mod. Not the real fight, not our design; every '
  + 'approximation is ledgered.';

export const KAIZO_TABLE = {
  1: [
    { ac: 1, difficulty: 2, name: 'Stars', kaizo: 'max verified difficulty (homing starchildren)' },
    { ac: 10, difficulty: 0, name: 'Swordfall', kaizo: 'UNUSED content, no oracle' },
    { ac: 2, difficulty: 3, name: 'Flurry', kaizo: 'phase-3 variant moved up' },
    { ac: 13, difficulty: 4, name: 'Sword Tunnel', kaizo: 'max verified difficulty' },
    { ac: 5, difficulty: 2, name: 'Rotating Slash', kaizo: 'max verified difficulty' },
  ],
  2: [
    { ac: 0, difficulty: 0, name: 'Swordslash', kaizo: 'UNUSED content, no oracle' },
    { ac: 15, difficulty: 0, name: 'Sword Vortex' },
    { ac: 4, difficulty: 0, name: 'Knight Stream', kaizo: 'UNUSED content, no oracle' },
    { ac: 3, difficulty: 0, name: 'Sword Tunnel (revised)', kaizo: 'UNUSED content, no oracle' },
    { ac: 5, difficulty: 2, name: 'Rotating Slash' },
  ],
  3: [
    { ac: 6, difficulty: 0, name: 'Underbox', kaizo: 'UNUSED content, no oracle' },
    { ac: 20, difficulty: 0, name: 'Knightlines', kaizo: 'UNUSED content, no oracle' },
    { ac: 14, difficulty: 0, name: 'Tracking Swords' },
    { ac: 7, difficulty: 0, name: 'Combination', kaizo: 'UNUSED chain: swordfall -> rotating -> tunnel-revised' },
    { ac: 5, difficulty: 2, name: 'Rotating Slash' },
  ],
  4: [
    { ac: 5, difficulty: 2, name: 'Rotating Slash' },
    { ac: -1, difficulty: 1, name: 'Charge-up' },
    { ac: 9, difficulty: 0, name: 'ROARING' },
  ],
};

export const KAIZO_VERSIONS = {

  A: {
    name: 'KAIZO: AUTHENTIC (the invented remix — NOT the mod)',
    table: KAIZO_TABLE,
    invented: 'schedule only',
    note: 'KAIZO: AUTHENTIC — the original invented remix: vanilla attacks on an '
      + 'invented schedule. Not the mod; the recreation is ?v=C.',
  },

  C: {
    name: 'KAIZO ROARING KNIGHT v2.3.3 — the recreation (the page\'s default)',
    table: VC_TABLE,
    hooks: () => vcHooks({ sideb: false }),
    knight: VC_KNIGHT,
    invented: 'nothing — recreation of EnderCat8\'s mod (approx ledgered)',
  },

  D: {
    name: 'KAIZO: ORACLE B-SIDE (Weirder Route — Kris & Noelle, WIP)',
    table: VD_TABLE,
    party: WEIRD_ROUTE_PARTY,
    hooks: (roster) => vcHooks({ sideb: true, roster }),
    knight: VC_KNIGHT,
    invented: 'nothing — recreation of EnderCat8\'s mod (approx ledgered)',
  },
};

const KAIZO_VICTORY_LINE_EDITS = {

  4: { was: '* Not so tough NOW, are you!?', text: '* Not so tough NOW, are y' },

  6: { was: '* H.. how could you...', text: '* H.. how cou' },
};

export const KAIZO_VICTORY_LINES = Object.freeze(VICTORY_LINES.map((line, i) => {
  const edit = KAIZO_VICTORY_LINE_EDITS[i];
  if (!edit) return line;
  if (line.text !== edit.was) {
    throw new Error(
      `kaizo victory line ${i}: expected the vanilla text ${JSON.stringify(edit.was)}, `
      + `found ${JSON.stringify(line.text)} — the mod's truncation is derived from it `
      + 'and would now cut a different sentence. Re-read Step_0:1026/1070.',
    );
  }
  return Object.freeze({ speaker: line.speaker, text: edit.text, noWait: true });
}));

export const KAIZO_CUT_VOLUME = 12;

export const KAIZO_KNIGHTING_SLASH_XY = Object.freeze([2420, 150]);

export function buildKaizoVictoryScript() {
  const script = buildVictoryScript();
  const at = (pred, what) => {
    const i = script.findIndex(pred);
    if (i < 0) throw new Error(`kaizo victory script: ${what} is not in the vanilla script`);
    return i;
  };

  const laugh = at(([op]) => op === 'laughAgain', "the second laugh ('laughAgain')");
  const after = script[laugh + 1];
  if (!(after && after[0] === 'w' && after[1] === 26)) {
    throw new Error("kaizo victory script: expected ['w', 26] after 'laughAgain' (c_wait(26))");
  }
  script.splice(laugh, 2);

  const knighting = at(([op]) => op === 'knighting', "the knighting ('knighting')");
  script.splice(knighting, 1,
    ['knightingSlash'],
    ['w', 90],
    ['music', 'wind'],
    ['reveal', 'kris'],
  );

  const down = at(([op]) => op === 'krisDown', "the final reveal ('krisDown')");
  script[down] = ['krisFell'];

  return script;
}

export const KAIZO_VICTORY_OPS = Object.freeze({

  knightingSlash(sc, a, b, cues, api) {
    const k = sc.knight;
    const kr = sc.actors.kris;

    k.sprite = 'spr_roaring_knight_kris_knighting';

    cues.push({ music: 'stop' });
    api.fiveCuts(cues, sc.cutVolume);

    sc.white.black = true;
    sc.white.alpha = 1;
    sc.white.visible = true;
    const [sx, sy] = KAIZO_KNIGHTING_SLASH_XY;
    sc.slash.x = sx;
    sc.slash.y = sy;
    sc.slash.visible = true;

    kr.x = kr.x;
    kr.y = kr.y;
    kr.sprite = 'spr_kris_fell';
    kr.index = 0;
    kr.speed = 0;

    kr.visible = true;
  },

  krisFell(sc, a, b, cues, api) {
    const kr = sc.actors.kris;
    const k = sc.knight;
    kr.visible = true;
    kr.sprite = 'spr_kris_fell';
    kr.index = 0;
    k.sprite = 'spr_roaringknight_idle_overworld_sword';
    k.index = 0;
    k.speed = 0.1;
    k.x = 2655;
    k.hoverPause = false;
  },
});

export const KAIZO_VICTORY_VARIANT = Object.freeze({
  name: 'kaizo-v233-aside',
  lines: KAIZO_VICTORY_LINES,
  cutVolume: KAIZO_CUT_VOLUME,
  ops: KAIZO_VICTORY_OPS,
  get script() { return buildKaizoVictoryScript(); },
});

export const KAIZO_TOK3_GEAR = [
  { weapon: 16, armor: [1, 10] },
  { weapon: 17, armor: [1, 10] },
  { weapon: 18, armor: [1, 10] },
];

export const KNIGHT_MODE_PRACTICE = 0;
export const KNIGHT_MODE_NOHIT = 1;
export const KNIGHT_MODE_STANDARD = 2;

export const KNIGHT_MODES = {
  practice: KNIGHT_MODE_PRACTICE,
  nohit: KNIGHT_MODE_NOHIT,
  standard: KNIGHT_MODE_STANDARD,
};

function healPartyToMax(state) {
  if (!Array.isArray(state.partyHp)) return;
  for (let slot = 0; slot < state.partyHp.length; slot++) {
    const charId = charIdOf(state, slot);

    if (charId === CHAR_NONE) continue;
    const m = maxhpOfChar(state, charId)
      || state.partyMaxhp?.[slot]
      || PARTY[slot]?.maxhp;
    if (typeof m === 'number' && m > 0) state.partyHp[slot] = m;
  }
}

export function applyKnightMode(state, knightMode) {

  let practicemode = false;
  let nohitmode = false;

  if (knightMode !== undefined && knightMode !== null) {
    if (knightMode === KNIGHT_MODE_PRACTICE) practicemode = true;
    if (knightMode === KNIGHT_MODE_NOHIT) {
      nohitmode = true;

      healPartyToMax(state);
    }
  }
  if (state.knight) {
    state.knight.practicemode = practicemode;
    state.knight.nohitmode = nohitmode;
  }
  if (state.kaizo) {
    state.kaizo.practicemode = practicemode;
    state.kaizo.nohitmode = nohitmode;

    state.kaizo.knightMode = knightMode ?? null;
  }
  return { practicemode, nohitmode };
}

export function buildKaizoScene(state, { version = 'A', mode, gear } = {}) {
  const v = KAIZO_VERSIONS[version];

  if (v.knight && !v.party && !state.loadout?.gear) {
    state.loadout = { ...(state.loadout ?? {}), gear: KAIZO_TOK3_GEAR };
  }

  if (v.knight && state.textAutoMash === undefined) state.textAutoMash = true;

  if (v.knight) state.stronghurtDamage = 10000;

  setVictoryVariant(v.knight ? KAIZO_VICTORY_VARIANT : null);

  (state.survivesTurn ??= new Set())
    .add('kaizo_tensionbar_draw')
    .add('kaizo_spell_controller');
  if (version === 'D') spawn(state, tensionbarDraw, { x: 0, y: 0 });

  state.kaizo = {
    version,

    note: v.note ?? KAIZO_NOTE,
    table: v.table,
    scheduleActive: true,
    launched: [],
    approx: [],

    vars: v.knight ? { kaizo_block: true } : {},

    sideb: kaizoSidebFor(version),

    hooks: v.knight ? { vortexendHandoff: kaizoVortexendFreeze } : {},
  };

  let roster = null;
  if (v.party) {
    const marker = state.kaizo;
    installRoster(state, { charIds: v.party, sideb: kaizoSidebFor(version), gear: gear ?? null });
    roster = state.kaizo.roster;
    state.kaizo = { ...marker, ...state.kaizo };

    installKaizoMenu(state);

    const CHARBOX_ART = {
      1: { head: 'spr_headkris', name: 'spr_bnamekris' },
      2: { head: 'spr_headsusie', name: 'spr_bnamesusie' },
      3: { head: 'spr_headralsei', name: 'spr_bnameralsei' },
      4: { head: 'spr_headnoelle', name: 'spr_bnamenoelle' },
    };
    state.partySprites = roster.map((m) => CHARBOX_ART[m.charId] ?? CHARBOX_ART[1]);
    state.partyMaxhp = roster.map((m) => m.maxhp);

    for (let slot = roster.length; slot < 3; slot++) {
      state.partyHp[slot] = 0;
      state.chardead[slot] = 1;
      state.charcantarget[slot] = 0;
      state.charmove[slot] = 0;
      state.charaction[slot] = 0;
      state.charspecial[slot] = 0;
    }

    state.heroes = createKaizoHeroes(state);

    state.kaizo.hooks ??= {};
    const dmgHooks = kaizoDamageHooks();
    for (const name of Object.keys(dmgHooks)) state.kaizo.hooks[name] ??= dmgHooks[name];
    state.kaizo.hooks.advanceBalloon ??= kaizoAdvanceBalloon;
  }

  state.kaizo.hooks ??= {};

  if (v.knight) state.kaizo.hooks.knightTarget ??= kaizoKnightTarget;

  buildKaizoTurnLoop(state, {
    seed: state.seed,
    table: v.table,
    hooks: v.hooks ? v.hooks(roster) : {},
  });

  if (v.knight && state.knight) state.knight.hp = v.knight.maxhp;

  const knightMode = typeof mode === 'string' ? KNIGHT_MODES[mode] : mode;
  if (typeof mode === 'string' && knightMode === undefined) {
    throw new Error(`buildKaizoScene: unknown mode "${mode}" (practice | nohit | standard)`);
  }
  applyKnightMode(state, knightMode);

  ensureEnding(state);

  return state;
}

export function kaizoSidebFor(version) {
  return version === 'D';
}

export function kaizoEndingRouteFor(versionOrState) {
  if (typeof versionOrState === 'string') {
    return kaizoSidebFor(versionOrState) ? 'bside' : 'aside';
  }
  const k = versionOrState?.kaizo;
  if (!k) return 'aside';
  const flag = k.flag?.[FLAG_WEIRD_ROUTE];
  const sideb = flag === undefined ? !!k.sideb : !!flag;
  return sideb ? 'bside' : 'aside';
}
