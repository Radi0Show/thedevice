

import { createState, stepFrame } from '../sim/index.js';
import { spawn } from '../sim/entity.js';
import { gmlCreate } from '../sim/rng.js';
import { drainCues } from '../sim/audio.js';
import {
  ensureEnding, ptb02Con8, ptb02Alarm0, enterEnding, kaizoEndingDriver,
  endingTerminal, endingReport,
  FLAG_KNIGHT_OUTCOME, FLAG_KNIGHT_VIOLENCED,
} from '../kaizo/scenes/kaizo-ending.js';

export function epilogueCueName(name) {
  return typeof name === 'string' && name.endsWith('.ogg') ? name.slice(0, -4) : name;
}

export function createKaizoEpilogue(fightState) {
  const seed = Number.isInteger(fightState?.seed) ? fightState.seed : 1;
  const st = createState({ seed, traceBulletSlots: 0 });
  st.gmlRng = fightState?.gmlRng ?? gmlCreate(seed);
  st.kaizo = {
    sideb: !!fightState?.kaizo?.sideb,
    funni: !!fightState?.kaizo?.funni,
  };
  ensureEnding(st);
  const won = fightState?.kaizo?.flag ?? {};
  st.kaizo.flag[FLAG_KNIGHT_OUTCOME] = won[FLAG_KNIGHT_OUTCOME] ?? 0;
  st.kaizo.flag[FLAG_KNIGHT_VIOLENCED] = won[FLAG_KNIGHT_VIOLENCED] ?? 0;

  const fork = ptb02Con8(st);
  ptb02Alarm0(st);
  const head = enterEnding(st);

  spawn(st, kaizoEndingDriver, {});
  return { st, con: fork.con, route: fork.route, head, t: 0, done: false };
}

export function stepKaizoEpilogue(ep, input) {
  if (!ep || ep.done) return [];
  ep.t += 1;
  stepFrame(ep.st, input);
  if (endingTerminal(ep.st).terminal) ep.done = true;
  return drainCues(ep.st).map((c) => ({ ...c, name: epilogueCueName(c.name) }));
}

export function kaizoEpilogueReport(ep) {
  return { t: ep.t, done: ep.done, route: ep.route, head: ep.head, ...endingReport(ep.st) };
}
