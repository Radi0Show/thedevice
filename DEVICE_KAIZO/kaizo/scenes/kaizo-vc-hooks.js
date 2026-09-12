

import { gmlRound } from '../../sim/gml.js';
import { statFor, PARTY_POS } from '../../sim/damage.js';
import { castRudeBuster } from '../../sim/rudebuster.js';
import { krisMult } from '../../sim/knight.js';
import {
  launchVCAttack, openVCArena, vcTurnLength, vcMoveheartDest,
} from './kaizo-mod-launcher.js';
import {
  kaizoKnightActor, kaizoBlockStepTail, applyKaizoIdleRecolor,
} from '../actors/kaizo-knight-actor.js';
import { isUp as rosterIsUp, rosterSize, statFor as rosterStatFor } from '../party/roster.js';
import { applyKrisPartyMultiplier } from '../party/damage.js';
import { downMessages } from '../party/freeze.js';
import { armHpscene } from '../party/scenes.js';
import { kaizoGloomStep, kaizoGloomMessages } from '../party/gloom.js';
import { createKaizoHeroes, stepKaizoHeroes } from '../party/heroes.js';
import { VC_KNIGHT, VC_GATE_FRACTION, VC_LOOP, VC_PHASE4_DEFAULT } from '../versions/vc-script.js';

const GUARD_DROP = 0.4;

const VC_RUDEBUSTER_AIM = { dx: 60, dy: 90 };

const VC_KNIGHT_POS = { x: 425, y: 78 };

function vcCastSpell(state, slot, spellId) {
  if (spellId !== 4) return undefined;
  const st = statFor(state, slot);

  const base = Math.ceil(st.magic * 5 + st.at * 11 - VC_KNIGHT.df * 3);
  const dr = state.knight?.damagereduction ?? 0;
  const damage = Math.max(0, Math.ceil(base * (dr + 0.65)));
  const kn = state.entities.find((en) => en.alive && en.type?.name === 'obj_knight_enemy');
  const kx = (kn?.x ?? VC_KNIGHT_POS.x) + VC_RUDEBUSTER_AIM.dx;

  const ky = (kn?.y ?? VC_KNIGHT_POS.y) + VC_RUDEBUSTER_AIM.dy;
  castRudeBuster(state, PARTY_POS[slot].x, PARTY_POS[slot].y, damage, kx, ky);
  return 'Rude Buster!';
}

function installVCSpellSeam(state) {
  if (!state.kaizo) return;
  state.kaizo.hooks ??= {};
  state.kaizo.hooks.castSpell ??= vcCastSpell;
}

export const KAIZO_CHECK_PAGES = {
  A: {
    first: ['* Kris analyzed the enemy!', "* But the numbers didn't seem feasible..."],
    again: ["* Kris couldn't bear to check again."],
  },
  B: {
    first: ['* Kris tried to analyze the enemy, but they froze.', '* You brought this upon yourself.'],
    again: ['* Your actions were used up.'],
  },
};

function kaizoTurnEndMessages(state, { prevatk, phase, phase4turn }) {
  const kn = state.knight;
  const k = state.kaizo;
  if (!kn || !k) return;

  const sideb = !!k.sideb;
  const practicemode = !!k.practicemode;
  kn.didfullnohit ??= false;
  kn.turnsafternohit ??= 0;
  kn.lastpro ??= true;
  let msg = null;

  if (!(phase === 4 && phase4turn < 3)) {
    const d = downMessages(state);
    if (d.battlemsg !== null) msg = d.battlemsg;

    if (d.downcount === 0 && sideb) {
      const g = kaizoGloomMessages(state);
      if (g !== null) msg = g;
    }
  }

  if (prevatk === 'atk_RoaringDelta' && !practicemode) {
    msg = "* The enemy's guard falters, just for a moment...";
    if (kn.progamer === true) {
      msg = '* Kris coughed.&* The enemy pauses in wonder...';
    }

    if (sideb && kn.progamer === true) {
      msg = "\\ck* Well, aren't you something special...^2?&* Go ahead.";
      kn.didfullnohit = 1;
      kn.turnsafternohit = 0;
      kn.curhp = kn.hp;
      applyKaizoIdleRecolor(state);
    }
  } else if (kn.didfullnohit) {
    if (kn.progamer === true) {
      kn.turnsafternohit += 1;
      const t = kn.turnsafternohit;
      const fell = kn.curhp > kn.hp;
      if (t === 1) {
        if (fell) { msg = "\\ck* Come on now...&* That surely isn't your best hit."; kn.curhp = kn.hp; }
        else msg = '\\ck* Now what are you waiting for?';
        applyKaizoIdleRecolor(state);
      }
      if (t === 2) {
        if (fell) { msg = "\\ck* After all that, you're not putting your all into it...?"; kn.curhp = kn.hp; }
        else msg = '\\ck* The guts to play with such a feat^1.&* Intriguing...';
        applyKaizoIdleRecolor(state);
      }
      if (t === 3) {
        if (fell) { msg = '\\ck* Strange..^1.&* Very strange...'; kn.curhp = kn.hp; }
        else msg = '\\ck* If you insist on wasting your chance, so be it, I suppose.';
        applyKaizoIdleRecolor(state);
      }
      if (t >= 4) msg = '\\ck* ...';
    } else if (kn.curhp > kn.hp) {
      msg = '\\ck* And with a little mistake^1, the perfection falls...';
      kn.didfullnohit = false;
    } else {
      msg = '\\ck* A pity such a prime moment to strike was put to waste.';
      kn.didfullnohit = false;
    }
  }

  if (prevatk === 'atk_Multislash2' && !practicemode) {
    if (sideb && kn.progamer === true) msg = '\\ck* Not a scratch yet, hm...^1?&* Impressive.';
  }
  if (phase > 1 && k.didspell && k.nospellsaw) {
    k.nospellsaw = 0;
    msg = "\\ck* Couldn't keep up without spells after all, huh...^1?&* What a shame.";
  }
  if (!kn.progamer && kn.lastpro && !practicemode) {
    kn.lastpro = false;
    if (prevatk === 'atk_RoaringDelta') msg = '\\ck* So close^1, yet so far from perfection...';
  }

  if (msg !== null) state.battlemsg = msg;
}

export function vcHooks({ sideb = false, roster = null } = {}) {
  return {

    knightActor: kaizoKnightActor,

    ...(roster ? {
      party: {

        members: roster.map((m) => ({
          x: m.pos.x, y: m.pos.y, sprite: m.sprites.idle, depth: m.depth,
        })),
      },

      isUp: rosterIsUp,

      partyWiped: (state) => {
        const n = rosterSize(state);
        for (let i = 0; i < n; i++) if (rosterIsUp(state, i)) return false;
        return true;
      },
      createHeroes: createKaizoHeroes,

      stepHeroes: stepKaizoHeroes,
    } : {}),

    ...(sideb ? {

      knightEndStep: (state, { clockOn = false } = {}) => {
        kaizoGloomStep(state, { bullets: clockOn });
      },

      actPages: (state, c, actId, pages) => {
        if (c !== 0 || actId !== 0) return pages;
        const n = state.actCounts?.check ?? 1;
        return n === 1 ? KAIZO_CHECK_PAGES.B.first : KAIZO_CHECK_PAGES.B.again;
      },
    } : {}),
    openArena: (state, row) => {

      const kn = state.entities.find(
        (x) => x.alive && x.type?.name === 'obj_knight_enemy',
      );
      if (kn) kn.idlesprite = 'spr_roaringknight_idle';
      openVCArena(state, row, { sideb });
    },
    launch: (state, row) => launchVCAttack(state, row, { sideb }),
    turnLength: (row) => vcTurnLength(row, { sideb }),
    moveheartDest: (row, gt, view) => vcMoveheartDest(row, gt, view),

    phase4Reached: (state) => state.knight.hp <= VC_KNIGHT.maxhp * VC_GATE_FRACTION,

    endCutsceneReached: (state) => {
      const k = state.knight;
      if (k.animState !== 3 || !(k.hurttimer >= 0)) return false;

      if ((k.chargeupcon ?? 0) !== 0) return false;

      if (state.kaizo?.xslash?.dontKill) return false;
      if ((k.blockanim ?? 0) > 0) return false;
      return !!k.haveusedroaring && k.endCutscene === 0 && k.endcon !== 1
        && k.hp <= VC_KNIGHT.maxhp * 0.6;
    },

    advanceTurn: (state) => {
      const k = state.knight;
      if (state.kaizo.vars?.kaizo_finalstretch && k.damagereduction < 0.72) {
        k.damagereduction += 0.05;
      } else if (k.damagereduction >= 0.1 && k.damagereduction < 0.3) {
        k.damagereduction += 0.004;
      }
    },

    knightFirstStep: (state) => {

      installVCSpellSeam(state);
      if (state.knight?.damagereductiontimer !== 1) return;
      armHpscene(state);
    },

    postAnim: (state) => {
      const k = state.knight;
      if (k.damagereductiontimer === 1) k.damagereduction = 0.18;

      kaizoBlockStepTail(state);
    },

    fightDamage: (state, slot, accuracy) => {
      if (accuracy <= 0) return 0;
      const k = state.knight;
      const vars = (state.kaizo.vars ??= {});
      const blocked = accuracy < 150 && (vars.kaizo_block ?? true) && !k.endCutscene;

      if (accuracy >= 150) k.blockanim = 0;

      const hasRoster = !!state.kaizo?.roster;
      const at = (hasRoster ? rosterStatFor(state, slot) : statFor(state, slot)).at;
      let damage = gmlRound((at * accuracy) / 20 - VC_KNIGHT.df * 3);
      damage = Math.ceil(damage * k.damagereduction);
      if (slot === 0) {
        if (hasRoster) {

          damage = applyKrisPartyMultiplier(damage, state);
        } else {
          const alive = state.partyHp.filter((h) => h > 0).length;
          if (alive <= 1) damage = Math.ceil(damage * 2.5);
          else if (alive === 2) damage = Math.ceil(damage * 1.5);
        }
      }
      if (blocked) damage = Math.ceil(damage / 5);
      state.kaizo.lastHitBlocked = blocked;
      if (blocked && damage > 0) k.blockanim = 1;
      return Math.max(0, damage);
    },

    fightTp: (points, state) =>
      Math.round(points / (state.kaizo.lastHitBlocked ? 50 : 10)),

    onSelect: (state, row) => {
      const vars = (state.kaizo.vars ??= {});
      for (const [key, value] of row.setVars ?? []) {
        vars[key] = value;
        if (key === 'haveusedroaring') state.knight.haveusedroaring = !!value;
      }
    },

    advance: (state, e, { prevPhase, prevTurn }) => {
      const t = e.table;
      const vars = (state.kaizo.vars ??= {});
      const prevRowId = t[prevPhase]?.[prevTurn]?.id;

      let phase = prevPhase;
      let turn = prevTurn;
      const lastInPhase = prevTurn === t[prevPhase].length - 1;
      if (prevPhase === 4 && lastInPhase) {
        const r = vars.resume ?? { phase: 3, turn: 0 };
        phase = r.phase;
        turn = r.turn;
      } else if (!lastInPhase) {
        turn = prevTurn + 1;
      } else if (prevPhase === 3) {
        phase = VC_LOOP.phase;
        turn = VC_LOOP.turn;
      } else {
        phase = prevPhase + 1;
        turn = 0;
      }

      if (state.runMode !== 'endless' && prevPhase !== 4
        && state.knight.hp <= VC_KNIGHT.maxhp * VC_GATE_FRACTION
        && !state.knight.haveusedroaring) {

        vars.resume = { phase: prevPhase, turn: prevTurn };
        phase = 4;
        const entryId = vars.kaizo_phase4 ?? VC_PHASE4_DEFAULT;
        const idx = t[4].findIndex((r) => r.id === entryId);
        turn = idx >= 0 ? idx : 0;
      } else if (phase !== 4) {
        vars.resume = { phase, turn };
      }

      const gateTripped = phase === 4 && prevPhase !== 4;
      const row = t[phase][turn];
      if (row?.msg) state.battlemsg = row.msg;
      if (state.knight.haveusedroaring && prevRowId !== 'atk_RoaringDelta') {
        if (state.knight.hp <= VC_KNIGHT.maxhp * GUARD_DROP) {

          vars.kaizo_block = false;
          state.battlemsg = "* The enemy's guard has dropped. Make your move!";
        } else {
          state.battlemsg = '* A powerful hit should be enough! Make your move!';
        }
      }

      {
        let naturalNext;
        if (!lastInPhase) naturalNext = t[prevPhase][prevTurn + 1];
        else if (prevPhase === 3) naturalNext = t[VC_LOOP.phase][VC_LOOP.turn];
        else naturalNext = t[prevPhase + 1]?.[0];
        const prevatk = gateTripped ? (naturalNext?.id ?? prevRowId) : prevRowId;
        const knightPhaseNow = gateTripped ? 4 : prevPhase;
        const phase4turn = gateTripped ? 0 : (prevPhase === 4 ? prevTurn + 1 : 0);
        kaizoTurnEndMessages(state, { prevatk, phase: knightPhaseNow, phase4turn });
      }

      return { phase, turn, knightPhase: prevPhase };
    },
  };
}
