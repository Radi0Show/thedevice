

import { spawn } from '../../sim/entity.js';
import { gmlLte } from '../../sim/gml.js';
import { soul } from '../../sim/soul.js';
import { HEART_RECT } from '../../sim/masks.js';
import { battlebox, settleBox } from '../../sim/battlebox.js';
import { gmlCreate, gmlChoose, gmlIrandom, gmlRandom } from '../../sim/rng.js';
import { launchAttack, openArena, clearTurn, phase4Entry, turnLength } from '../../sim/scenes/fight.js';
import { battleMsgFor, OPENING_MSG } from '../../sim/battlemsg.js';
import { createMenu, stepMenu, openMenu, bagOf } from '../../sim/menu.js';
import { partyWiped, PARTY as PARTY_STATS, isUp, PARTY_POS} from '../../sim/damage.js';
import { createFightBar, stepFightBar, fightTp } from '../../sim/fightbar.js';
import { endTurnItems } from '../../sim/menu.js';
import { applyItem } from '../../sim/items.js';
import { createHeroes, stepHeroes, heroAct, HERO_ATTACK, HERO_IDLE, HERO_ITEM, HERO_SPELL } from '../../sim/heroes.js';
import {
  advanceBalloon, advanceReply, clearDialogue, msgLines,
  textSoundChar,
} from '../../sim/dialogue.js';
import {
  spawnDmgNumber, stepDmgNumbers, resetDmgStack,
} from '../../sim/dmgnumbers.js';
import { spawnImpact, stepAttackVfx } from '../../sim/attackvfx.js';
import { stepRudeBuster, rudeBusterBusy } from '../../sim/rudebuster.js';
import { castSpell, resolveActPages } from '../../sim/spells.js';
import { needsSpellphase, createSpellphase } from '../../sim/spellphase.js';

import { stepKaizoSpellphase } from '../versions/kaizo-spellphase.js';
import {
  stepScenes, scrMnendturnScenes, sceneHijacksTurn, attachSceneKnight,
  applySceneHandbackCharturn,
} from '../party/scenes.js';
import { endingWatchEndcon } from './kaizo-ending.js';
import { rngNext } from '../../sim/rng.js';
import {
  fightDamage, damageKnight, advanceTurn, stepKnightAnim, tickChargeup, phase4Reached,
  endCutsceneReached, startEndCutscene, stepEndCutscene, DR_PHASE4, KNIGHT_MAXHP,
} from '../../sim/knight.js';
import { scrTensionheal } from '../../sim/tension.js';
import { cueLoop, cue, cueStop } from '../../sim/audio.js';
import { knightActor, partyActor, PARTY, KNIGHT, BOX, SOUL_START } from '../../sim/actors.js';
import { kaizoMonsterXY } from '../actors/kaizo-knight-actor.js';

function kaizoNextTurn(table, phase, turn) {
  const list = table[phase];
  if (turn + 1 < list.length) return { phase, turn: turn + 1 };
  if (phase === 3) return { phase: 3, turn: 0 };
  if (phase === 4) return { phase: 3, turn: 0 };
  return { phase: phase + 1, turn: 0 };
}

const RTIMER_SPAWN = 12;

const ATTACKPRESS_HOLD = 50;
const ATTACKPRESS_FADE = 13;

const TURN_GAP = 1;

export const SIDEB_OPENING_MSG = '* The Roaring Knight appeared^1.&* Something seems wrong.';

const moveheart = {
  name: 'obj_moveheart',
  create(e) {

    e.image_alpha = 0;
    e.image_speed = 0;
    e.flytime = 8;
    e.sprite_index = 'spr_dodgeheart';
  },

  step(e) {
    e.image_alpha = Math.min(1, (e.image_alpha ?? 0) + 0.334);
  },
  alarm: {
    0(e, state) {
      e.x = e.distx;
      e.y = e.disty;
      if (!state.soul) {
        state.soul = spawn(state, soul, { x: e.distx, y: e.disty });

        state.soul.mask = HEART_RECT;
      }
      e.alive = false;
    },
  },
};

function fireTurnEndAlarm(e, state) {
  e.endAlarm = 0;
  e.clockOn = false;

  if (state.kaizo?.sideb) scrMnendturnScenes(state);

  e.arenaOpen = false;
  if (e.pendingTurn) {
    e.phase = e.pendingTurn.phase;
    e.turn = e.pendingTurn.turn;
    e.pendingTurn = null;
  }
}

const turnClock = {
  name: 'turn_clock',
  stepOrder: -100,
  create(e) {},

  step(e, state) {

    const dir = e.director;
    if (dir && dir.endAlarm > 0) {
      dir.endAlarm -= 1;
      if (dir.endAlarm === 0) fireTurnEndAlarm(dir, state);
    }

    tickChargeup(state);

    const d = e.director;
    if (d?.started && state.soul && gmlLte(state.turntimer, 1) && state.turntimer > -900000) {

      spawnReturnHeart(state, state.soul.x, state.soul.y);
      state.soul.alive = false;
      state.soul = null;
    }
  },

  endStep(e, state) {

    const d = e.director;
    if (d?.started || d?.clockOn) state.turntimer -= 1;
  },
};

const director = {
  name: 'fight_director',

  create(e, state) {

    if (!e.hooks) e.hooks = {};
    e.phase = 1;
    e.turn = 0;

    state.downSeen = { kris: false, susie: false, ralsei: false };

    state.battlemsg = state.kaizo?.sideb ? SIDEB_OPENING_MSG : OPENING_MSG;
    e.owner = null;
    e.gap = TURN_GAP;
    e.started = false;
    e.clockOn = false;

    e.endAlarm = 0;
    e.pendingTurn = null;
    e.menuShown = false;
    e.soulHold = null;
    e.bar = null;
    e.barHold = 0;
    e.arenaOpen = false;
    e.spawnDelay = RTIMER_SPAWN;
    e.turnsRun = 0;
    e.elapsed = 0;
    e.drain = 0;
  },

  endStep(e, state) {

    if (state.battlemsg !== e.lastBattlemsg) {
      e.lastBattlemsg = state.battlemsg;
      state.battlemsgTimer = 0;
    } else {
      state.battlemsgTimer = (state.battlemsgTimer ?? 0) + 1;

      if (state.battlemsg
        && textSoundChar(state.battlemsg, state.battlemsgTimer)
        && !state.input?.focus) {
        cue(state, 'snd_text', 1, 1);
      }
    }

    if (!state.gameOver && (e.hooks.partyWiped ?? partyWiped)(state)) {
      state.gameOver = true;
      state.menu.open = false;
    }
    if (state.gameOver) return;

    if (globalThis.process?.env?.KAIZO_MENU_DEBUG_ISOLATION_TEST_DISABLED) {
      const m = state.menu ?? {};
      const bar = e.bar ?? e.fadingBar;
      const inp = state.input ?? {};
      const keys = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'button3', 'focus']
        .filter((k) => inp[k]).join('+');
      console.error(`[menu] f=${state.frame}`
        + ` clk=${e.clockOn ? 1 : 0} shown=${e.menuShown ? 1 : 0}`
        + ` open=${m.open ? 1 : 0} ct=${m.charturn} sub=${m.submenu ?? '-'}`
        + ` fight=${(m.fight ?? []).map((x) => (x ? 1 : 0)).join('')}`
        + ` bar=${bar ? `sched[${bar.bolts.map((b) => `${b.char}@${b.frame}${b.alive ? '' : 'x'}`).join(' ')}]`
          + `boltx${bar.boltx}/live${bar.bolts.filter((b) => b.alive).length}`
          + `/atk${bar.attacked.map((x) => (x ? 1 : 0)).join('')}/post${bar.posttimer ?? 0}`
          + `${bar.fade ? '/FADE' + (bar.fadeamt ?? 0).toFixed(2) : ''}` : '-'}`
        + ` sp=${e.spellphase ? 'T' + e.spellphase.spelltimer + '/' + (state.spelldelay ?? '-') + (e.spellphase.writer ? 'W' : '') : (e.spellphaseDone ? 'done' : '-')}`
        + ` bal=${e.balloonDone ? 1 : 0} dlg=${state.dialogue?.text ? 1 : 0}`
        + ` sd=${e.spawnDelay} gap=${e.gap} in=${keys || '.'}`);
    }

    if (e.fadingBar) {
      stepFightBar(e.fadingBar, !!state.input?.confirm);
      e.fadingBar.fadeamt = (e.fadingBar.fadeamt ?? 0) + 0.08;
      state.fightBar = e.fadingBar;
      if (e.fadingBar.fadeamt > 1) {
        e.fadingBar = null;
        state.fightBar = null;
      }
    }

    stepMenu(state, state.input ?? {});

    (e.hooks.stepHeroes ?? stepHeroes)(state);

    stepKnightAnim(state);

    e.hooks.knightFirstStep?.(state);

    if (state.kaizo?.sideb || (state.kaizo?.hpscene ?? 0) > 0) {

      attachSceneKnight(state);
      stepScenes(state);
    }

    e.hooks.postAnim?.(state);

    e.hooks.knightEndStep?.(state, { clockOn: e.clockOn });

    if (!e.musicStarted) {
      e.musicStarted = true;
      cueLoop(state, 'mus_knight');
    }

    if (sceneHijacksTurn(state)) return;

    if (typeof state.kaizo?.mnfight === 'number') state.kaizo.mnfight = e.clockOn ? 2 : 0;

    stepAttackVfx(state);

    const rudePress = !!state.input?.confirm && !e.rudeHeld;
    e.rudeHeld = !!state.input?.confirm;
    stepRudeBuster(state, rudePress);

    if (e.pendingSwing) {

      const mxy = kaizoMonsterXY(state);
      for (const s of e.pendingSwing) {
        if (s.done || state.frame < s.at) continue;
        s.done = true;
        if (s.points <= 0) {

          spawnDmgNumber(state, mxy.x, mxy.y, 0, s.c);
          continue;
        }
        const dealt = (e.hooks.fightDamage ?? fightDamage)(state, s.c, s.points);
        if (dealt > 0) {
          damageKnight(state, dealt);
          scrTensionheal(state, (e.hooks.fightTp ?? fightTp)(s.points, state));

          if (!state.kaizo?.lastHitBlocked) {
            spawnImpact(state, mxy.x, mxy.y, s.c, s.points === 150,
              () => rngNext(state.rng));
          }
        }
        spawnDmgNumber(state, mxy.x, mxy.y, dealt, s.c);
      }
    }

    const ecr = e.hooks.endCutsceneReached ?? endCutsceneReached;
    if (state.runMode === 'endless' && ecr(state)) {
      state.knight.hp = KNIGHT_MAXHP;
      state.knight.haveusedroaring = false;
      e.phase = 1;
      e.turn = 0;
      e.turnsRun = 0;
    } else if (ecr(state)) {
      startEndCutscene(state);
      state.menu.open = false;

    }

    stepEndCutscene(state);

    endingWatchEndcon(state);

    state.boardVisible = !!e.arenaOpen;

    const gtSolid = state.entities.find(
      (x) => x.alive && x.type.name === 'obj_growtangle',
    );
    if (gtSolid) gtSolid.isSolid = !!e.arenaOpen;
    if (state.menu.open && state.soul) {
      if (e.soulHold) {
        state.soul.x = e.soulHold.x;
        state.soul.y = e.soulHold.y;
      } else {
        e.soulHold = { x: state.soul.x, y: state.soul.y };
      }
    } else {
      e.soulHold = null;
    }

    const entry = e.table[e.phase][e.turn];
    state.phase = `KAIZO · phase ${e.phase} · turn ${e.turn + 1} · ${entry.name}`;

    state.phaseNum = state.knightPhase ?? e.phase;
    state.turnNum = e.turn;

    if (e.started) {
      e.elapsed += 1;

      const finished = gmlLte(state.turntimer, 0);
      if (!finished) return;

      e.started = false;
      e.balloonDone = false;

      if (state.soul) {

        state.invTimer += 1;
        state.soul.alive = false;
        state.soul = null;
      }

      const gtClose = state.entities.find(
        (x) => x.alive && x.type.name === 'obj_growtangle',
      );
      if (gtClose) gtClose.growcon = 3;

      e.endAlarm = 15;
      e.gap = 15;
      e.spawnDelay = RTIMER_SPAWN;
      e.turnsRun += 1;
      clearTurn(state);

      if (!e.hooks.advance) {

        const gateTrips = state.runMode !== 'endless' && e.phase !== 4
          && phase4Reached(state) && !state.knight?.haveusedroaring;
        let p4;
        if (gateTrips) p4 = 0;
        else if (e.phase === 4) p4 = e.turn + 1;
        else if (state.knight?.haveusedroaring) p4 = 3;

        const msg = battleMsgFor(e.phase, state.phaseturn ?? 0, {
          phase4turn: p4,
          partyHp: state.partyHp,
          haveusedroaring: state.knight?.haveusedroaring,
          progamer: state.knight?.progamer,
          downSeen: state.downSeen,
        });
        if (msg) state.battlemsg = msg;
      }

      const prevPhase = e.phase;
      const prevTurn = e.turn;

      if (e.hooks.advance) {
        const r = e.hooks.advance(state, e, { prevPhase, prevTurn });

        e.pendingTurn = { phase: r.phase, turn: r.turn };
        if (r.knightPhase !== undefined) {
          state.knightPhase = r.knightPhase;
          state.phaseNum = r.knightPhase;
        }
        return;
      }
      const nx = kaizoNextTurn(e.table, e.phase, e.turn);
      e.phase = nx.phase;
      e.turn = nx.turn;

      if (prevPhase === 4 && prevTurn === e.table[4].length - 1) {
        e.turn = e.resumeTurn ?? 0;
      }

      if (prevPhase === 3 && prevTurn === e.table[3].length - 1) state.knight.rotatingslash3used = true;

      if (state.runMode !== 'endless' && e.phase !== 4
        && phase4Reached(state) && !state.knight.haveusedroaring) {
        e.phase = 4;
        e.turn = phase4Entry(state.knight.rotatingslash3used);

        e.resumeTurn = nx.turn;

        state.knightPhase = 4;
        state.phaseNum = 4;
      }

      e.pendingTurn = { phase: e.phase, turn: e.turn };
      e.phase = prevPhase;
      e.turn = prevTurn;
      return;
    }

    e.gap -= 1;
    if (e.gap > 0) return;

    const stepTalkWriter = () => {

      const dlg = state.dialogue;

            const flag10 = state.textAutoMash !== false;

      if (!e.talkWriter) {
        e.talkWriter = { pos: 2, halted: false, pmb: 0, automash: 0, dead: false };
      }

      const b3Held = !!state.input?.button3;
      const cPress = b3Held && !e.talkHeld;
      e.talkHeld = b3Held;
      e.talkTimer = (e.talkTimer ?? 0) + 1;

      let dismissed = e.talkWriter.dead;
      if (!dismissed && dlg.speaker === 'knight' && cPress && e.talkTimer > 15) {

        dismissed = true;
      }

      const harnessKilledReply = dismissed && e.talkWriter.dead && state.recorderTalkSkip === true;
      if (dismissed) {
        if (dlg.speaker === 'knight' && dlg.ballooncon && !harnessKilledReply) {

          advanceReply(dlg);
          e.talkWriter = { pos: 1, halted: false, pmb: 0, automash: 0, dead: false };
          e.talkTimer = 0;
        } else if (dlg.speaker === 'knight') {

          e.talkWriter = null;
          clearDialogue(dlg);
          e.talkTimer = 0;
          return harnessKilledReply === true;
        } else {

          e.talkWriter = null;
          clearDialogue(dlg);
          e.talkTimer = 0;
          return;
        }
      }

      const w = e.talkWriter;
      const visible = msgLines(dlg.text).join('').length;
      let b1 = false;
      let b2 = false;
      const zPress = !!state.input?.confirm && !e.talkConfirmHeld;
      e.talkConfirmHeld = !!state.input?.confirm;
      if (zPress && w.pmb <= 0) b1 = true;
      if (state.input?.focus && w.pmb <= 0) b2 = true;

      if (flag10 && b3Held) {
        w.pmb = 3;
        w.automash = w.automash === 0 ? 1 : 0;
        if (w.automash === 0) b1 = true;

      }

      if (w.halted) w.haltAge = (w.haltAge ?? 0) + 1;

      if (!w.halted) {
        w.pos += 1;

        if (textSoundChar(dlg.text, w.pos - 1)) cue(state, 'snd_txtsus', 1, 1);
        if (w.pos > visible + 1) w.halted = true;
      }

      dlg.timer = Math.max(0, w.pos - 1);

      if (b2 && !w.halted) {
        w.pos = visible + 3;
        w.halted = true;
        dlg.timer = Math.max(0, w.pos - 1);
      }

      if (b1 && w.halted) {
        if (dlg.speaker === 'susie') {
          e.talkWriter = null;
          clearDialogue(dlg);
          e.talkTimer = 0;
          return;
        }
        w.dead = true;
      }
      w.pmb -= 1;

      if (globalThis.process?.env?.KNIGHT_TALK_DEBUG) {
        console.error(`[talk] f=${globalThis.__simFrame} spk=${dlg.speaker}`
          + ` pos=${w.pos}/${visible} halt=${w.halted ? 1 : 0} pmb=${w.pmb}`
          + ` dead=${w.dead ? 1 : 0} b1=${b1 ? 1 : 0} b2=${b2 ? 1 : 0} tt=${e.talkTimer}`);
      }
    };

    if (state.dialogue.text) {

      if (!stepTalkWriter()) return;
    }

    if (!e.menuShown) {
      e.menuShown = true;

      resetDmgStack(state);
      openMenu(state);

      applySceneHandbackCharturn(state);

      stepMenu(state, state.input ?? {});
      return;
    }
    if (state.menu.open) return;

    if (state.menu.needsCommit) {
      endTurnItems(state);
      state.menu.needsCommit = false;
    }

    if (state.pendingAct) {
      const a = state.pendingAct;
      if (!a.w) {

        a.pages = resolveActPages(state, a.c ?? 0, a.act ?? 0);

        a.pages = e.hooks.actPages?.(state, a.c ?? 0, a.act ?? 0, a.pages) ?? a.pages;
        a.w = { pos: 1, page: 0, halted: false, pmb: 0, automash: 0 };
      }
      const w = a.w;
      const visible = msgLines(a.pages[w.page]).join('').length;
      let b1 = false;
      let b2 = false;
      const zP = !!state.input?.confirm && !e.actConfirmHeld;
      e.actConfirmHeld = !!state.input?.confirm;
      if (zP && w.pmb <= 0) b1 = true;
      if (state.input?.focus && w.pmb <= 0) b2 = true;
      if (state.textAutoMash !== false && state.input?.button3) {
        w.pmb = 3;
        w.automash = w.automash === 0 ? 1 : 0;
        if (w.automash === 0) b1 = true;
        if (w.automash === 1) b2 = true;
      }
      if (!w.halted) {
        w.pos += 1;
        if (textSoundChar(a.pages[w.page], w.pos - 1)) cue(state, 'snd_text', 1, 1);
        if (w.pos > visible) w.halted = true;
      }
      if (b2 && !w.halted) {
        w.pos = visible + 3;
        w.halted = true;
      }
      if (b1 && w.halted) {
        if (w.page < a.pages.length - 1) {
          w.page += 1;
          w.pos = 1;
          w.halted = false;
        } else {

          state.pendingAct = null;
        }
      }
      w.pmb -= 1;
      state.battlemsg = a.pages[Math.min(w.page, a.pages.length - 1)];
      return;
    }

    if (state.kaizo?.hooks?.actBusy?.(state)) return;

    if (e.spellphase === undefined) {
      e.spellphase = needsSpellphase(state) ? createSpellphase(state) : null;
      e.spellphaseDone = !e.spellphase;

      if (e.spellphase) return;
    }
    if (e.spellphase) {

      const done = stepKaizoSpellphase(state, e.spellphase, e, {
        castSpell: (st, c, id, target) => {
          const r = castSpell(st, c, id, target, { alreadyPaid: true });

          const k = st.kaizo?.spelldelay;
          if (typeof k === 'number' && k !== st.spelldelay) st.spelldelay = k;
          return r;
        },
      });
      if (done) {
        e.spellphase = null;
        e.spellphaseDone = true;
      } else {
        return;
      }
    }

    if (e.spellphaseDone && state.menu.fight.some(Boolean) && !e.bar) {

      const up = e.hooks.isUp ?? isUp;
      const order = [0, 1, 2].filter((c) => state.menu.fight[c] && up(state, c));

      if (order.length) {

        const beforeSync = state.frame < (state.boltSkipBeforeFrame ?? 0);
        const rec = beforeSync ? null : state.boltSchedules?.[state.boltIndex];

        if (rec) state.boltIndex += 1;
        let useRec = rec;
        if (rec) {
          const recChars = [...new Set(rec.map((b) => b.char))].sort().join(',');
          const barChars = [...order].sort().join(',');
          if (recChars !== barChars) {
            useRec = null;
            if (!state.boltRosterWarned) state.boltRosterWarned = [];
            state.boltRosterWarned.push({ bar: state.boltIndex - 1, recChars, barChars });
          }
        }
        e.bar = createFightBar(state.rng, order, true, useRec);
      }
      e.resolved = [false, false, false];

      e.pendingSwing = [];
    }

    if (rudeBusterBusy(state)) return;
    if (state.pendingSpell) state.pendingSpell = [];
    if (state.pendingItem) state.pendingItem = [];

    if (e.bar && (state.knight?.endCutscene ?? 0) > 0) {

      if ((state.knight?.endcon ?? 0) >= 2) {
        e.bar = null;
        state.fightBar = null;
        return;
      }
      state.fightBar = e.bar;
      return;
    }
    if (e.bar) {

      stepFightBar(e.bar, !!state.input?.confirm);
      state.fightBar = e.bar;

      for (let c = 0; c < 3; c++) {
        if (!e.bar.attacked[c] || e.resolved[c]) continue;
        e.resolved[c] = true;
        const acc = e.bar.points[c];
        heroAct(state, c, HERO_ATTACK);

        if (acc === 150) {
          cueStop(state, 'snd_criticalswing');
          cue(state, 'snd_criticalswing');
        }
        e.pendingSwing.push({ at: state.frame + 11, c, points: acc, done: false });
      }
      if (!e.bar.done) return;

      if (!e.bar.holdDone) return;

      for (const h of state.heroes ?? []) {
        if (h.state === HERO_ATTACK) h.state = HERO_IDLE;
        h.attacked = false;
        h.itemed = false;
      }

      e.bar.fade = true;

      e.bar.fadeamt = 0.08;
      e.fadingBar = e.bar;
      e.barHold = 0;
      e.bar = null;
      state.menu.fight = [false, false, false];
      e.spellphase = undefined;

      return;
    }
    e.spellphase = undefined;

    if (!e.balloonDone) {
      e.balloonDone = true;

      e.talkEntries = (e.talkEntries ?? 0) + 1;

      if (state.gmlRng) {

        const upT = e.hooks.isUp ?? isUp;
        let t = gmlChoose(state.gmlRng, [0, 1, 2]);
        const anyUp = [0, 1, 2].some((c) => upT(state, c));
        if (anyUp) {
          while (!upT(state, t)) t = gmlChoose(state.gmlRng, [0, 1, 2]);
        }
      }
      advanceBalloon(state.dialogue, state);

      if (state.dialogue.text) {
        e.talkWriter = { pos: 1, halted: false, pmb: 0, automash: 0, dead: false };
        e.talkTimer = 0;
        stepTalkWriter();
      }
    }
    if (state.dialogue.text) return;

    if (e.spawnDelay > 0) {
      if (e.spawnDelay === RTIMER_SPAWN) {

        const leavingPhase = e.phase;
        (e.hooks.advanceTurn ?? advanceTurn)(state);

        if (!e.hooks.advance) state.knightPhase = leavingPhase;

        {
          const rowT = e.table[e.phase];
          const lastT = e.turn === rowT.length - 1;
          state.phaseturn = e.phase === 4 ? (state.phaseturn ?? 0) : (lastT ? 0 : e.turn + 1);
        }
        const upcoming = e.table[e.phase][e.turn];

        if (state.turntimer < 90) state.turntimer = 89;
        e.clockOn = true;
        (e.hooks.openArena ?? openArena)(state, upcoming);

        {
          const row2 = e.table[e.phase];
          const isLast = e.turn === row2.length - 1;
          if (e.hooks.advance) {

            state.knightPhase = e.phase;
          } else if ((e.phase === 1 || e.phase === 2) && isLast) state.knightPhase = e.phase + 1;
          else if (e.phase === 4 && isLast) state.knightPhase = 3;
          else state.knightPhase = e.phase;

          state.phaseNum = state.knightPhase;
        }

        if (e.hooks.onSelect) {

          e.hooks.onSelect(state, upcoming);
        } else if (upcoming?.name?.toLowerCase().includes('roaring') && state.knight) {
          state.knight.haveusedroaring = true;
          state.knight.damagereduction = DR_PHASE4;
        }
        const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
        if (gt) gt.arenaOpened = upcoming.ac;

        e.arenaOpen = upcoming.ac !== -1;

        if (upcoming.ac !== -1 && !state.soul) {

          state.invTimer = 0;
          const kris = PARTY[0];
          const mh = spawn(state, moveheart, { x: kris.x + 10, y: kris.y + 40 });

          state.heartBurst = { x: kris.x + 10, y: kris.y + 40, burst: 0 };

          if (e.hooks.moveheartDest) {
            const dest = e.hooks.moveheartDest(upcoming, gt, state.view);
            mh.distx = dest.x;
            mh.disty = dest.y;
          } else if (gt && upcoming.ac === 13) {
            mh.distx = gt.x - 40;
            mh.disty = gt.y - 8;
          } else {
            mh.distx = (gt ? gt.x : state.view.x + 320) - 10;
            mh.disty = (gt ? gt.y : state.view.y + 170) - 10;
          }
          const dist = Math.hypot(mh.distx - mh.x, mh.disty - mh.y);
          mh.builtinMotion = true;
          mh.speed = dist / 8;
          mh.direction = (Math.atan2(-(mh.disty - mh.y), mh.distx - mh.x) * 180) / Math.PI;
          mh.alarm[0] = 8;
        }
      }

      if (e.spawnDelay === 1) {
        const up = e.table[e.phase][e.turn];
        const tl = e.hooks.turnLength ? e.hooks.turnLength(up) : turnLength(up.ac, up.difficulty);

        const armed = tl - 1;
        if (tl > 0 && state.turntimer < armed) state.turntimer = armed;
        state.turntimerArmed = true;

        if (up.ac === -1 && state.knight) {
          state.knight.chargeupcon = 1;
          tickChargeup(state);
        }
      }
      e.spawnDelay -= 1;
      return;
    }

    e.menuShown = false;
    const entryNow = e.table[e.phase][e.turn];

    if (!e.hooks.onSelect && entryNow?.name?.toLowerCase().includes('roaring')) {
      state.knight.haveusedroaring = true;
      state.knight.damagereduction = DR_PHASE4;
    }
    e.owner = (e.hooks.launch ?? launchAttack)(state, entryNow);

    state.kaizo?.launched?.push({
      phase: e.phase, turn: e.turn, ac: entryNow.ac,
      difficulty: entryNow.difficulty, name: entryNow.name,
    });
    e.started = true;
    e.elapsed = 0;
    e.drain = 0;
  },
};

function spawnReturnHeart(state, x, y) {
  state.returnHeart = {
    x, y,
    tx: PARTY_POS[0].x + 10,
    ty: PARTY_POS[0].y + 40,
    t: 0,
    flytime: 8,
  };
}

export function buildKaizoTurnLoop(state, { seed = 12345, table, hooks = {} } = {}) {
  if (!table) throw new Error('buildKaizoTurnLoop needs a schedule table');
  state.menu = createMenu();
  state.hp = 0;

  state.invTimer = 0;
  state.phase = 'kaizo';
  state.view = { x: 0, y: 0 };
  state.flag22 = 0;
  state.gmlRng = gmlCreate(seed);
  state.turntimer = 0;
  state.invc = 1;

  spawn(state, hooks.knightActor ?? knightActor, { x: KNIGHT.x, y: KNIGHT.ystart });

  (hooks.party?.members ?? PARTY).forEach((p, i) => {
    spawn(state, partyActor, { x: p.x, y: p.y, sprite_index: p.sprite, depth: p.depth, slot: i });
  });

  settleBox(spawn(state, battlebox, { x: BOX.x, y: BOX.y }));

  state.soul = null;
  const d = spawn(state, director, { table, hooks });
  spawn(state, turnClock, { director: d });
  return state;
}
