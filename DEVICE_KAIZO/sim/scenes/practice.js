


import { spawn } from '../entity.js';
import { gmlLte } from '../gml.js';
import { battlebox, settleBox } from '../battlebox.js';
import { gmlCreate, gmlChoose, gmlIrandom, gmlRandom } from '../rng.js';
import { FIGHT_TABLE, launchAttack, openArena, clearTurn, nextTurn, phase4Entry, turnLength, deliverHeart } from './fight.js';
import { battleMsgFor, OPENING_MSG } from '../battlemsg.js';
import { createMenu, stepMenu, openMenu, bagOf } from '../menu.js';
import { partyWiped, PARTY as PARTY_STATS, isUp, PARTY_POS} from '../damage.js';
import { createFightBar, stepFightBar, fightTp } from '../fightbar.js';
import { endTurnItems } from '../menu.js';
import { applyItem } from '../items.js';
import { createHeroes, stepHeroes, heroAct, HERO_ATTACK, HERO_IDLE, HERO_ITEM, HERO_SPELL } from '../heroes.js';
import {
  advanceBalloon, advanceReply, clearDialogue, msgLines,
  textSoundChar,
} from '../dialogue.js';
import {
  spawnDmgNumber, stepDmgNumbers, resetDmgStack,
} from '../dmgnumbers.js';
import { spawnImpact, stepAttackVfx } from '../attackvfx.js';
import { stepRudeBuster, rudeBusterBusy } from '../rudebuster.js';
import { castSpell, resolveActPages } from '../spells.js';
import { needsSpellphase, createSpellphase, stepSpellphase } from '../spellphase.js';
import { rngNext } from '../rng.js';
import {
  fightDamage, damageKnight, advanceTurn, stepKnightAnim, tickChargeup, phase4Reached,
  endCutsceneReached, startEndCutscene, stepEndCutscene, DR_PHASE4, KNIGHT_MAXHP,
} from '../knight.js';
import { scrTensionheal } from '../tension.js';
import { cueLoop, cue, cueStop } from '../audio.js';
import { knightActor, partyActor, PARTY, KNIGHT, BOX } from '../actors.js';


export const IS_SANDBOX = true;
export const SANDBOX_NOTE =
  'THE REAL FIGHT ORDER — verified attacks, real difficulties, real HP · phase 4 opens at 5840';


const RTIMER_SPAWN = 12;


const ATTACKPRESS_HOLD = 50;
const ATTACKPRESS_FADE = 13;




const TURN_GAP = 1;







const turnClock = {
  name: 'turn_clock',
  stepOrder: -100,
  create(e) {},

  step(e, state) {

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
    if ((d?.started || d?.clockOn) && state.turntimer > 0) state.turntimer -= 1;
  },
};

const director = {
  name: 'fight_director',

  create(e, state) {
    e.phase = 1;
    e.turn = 0;

    state.downSeen = { kris: false, susie: false, ralsei: false };
    state.battlemsg = OPENING_MSG;
    e.owner = null;
    e.gap = TURN_GAP;
    e.started = false;
    e.clockOn = false;
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


    if (!state.gameOver && partyWiped(state)) {
      state.gameOver = true;
      state.menu.open = false;
    }
    if (state.gameOver) return;


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

    stepHeroes(state);

    stepKnightAnim(state);

    stepAttackVfx(state);

    const rudePress = !!state.input?.confirm && !e.rudeHeld;
    e.rudeHeld = !!state.input?.confirm;
    stepRudeBuster(state, rudePress);


    if (!e.musicStarted) {
      e.musicStarted = true;
      cueLoop(state, 'mus_knight');
    }


    if (e.pendingSwing) {
      for (const s of e.pendingSwing) {
        if (s.done || state.frame < s.at) continue;
        s.done = true;
        if (s.points <= 0) {

          spawnDmgNumber(state, KNIGHT.x, KNIGHT.ystart + 40, 0, s.c);
          continue;
        }
        const dealt = fightDamage(state, s.c, s.points);
        if (dealt > 0) {
          damageKnight(state, dealt);
          scrTensionheal(state, fightTp(s.points));
          spawnImpact(state, KNIGHT.x, KNIGHT.ystart + 40, s.c, s.points === 150,
            () => rngNext(state.rng));
        }
        spawnDmgNumber(state, KNIGHT.x, KNIGHT.ystart + 40, dealt, s.c);
      }
    }


    if (state.runMode === 'endless' && endCutsceneReached(state)) {
      state.knight.hp = KNIGHT_MAXHP;
      state.knight.haveusedroaring = false;
      e.phase = 1;
      e.turn = 0;
      e.turnsRun = 0;
    } else if (endCutsceneReached(state)) {
      startEndCutscene(state);
      state.menu.open = false;

    }

    stepEndCutscene(state);


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



    const entry = FIGHT_TABLE[e.phase][e.turn];
    state.phase = `phase ${e.phase} · turn ${e.turn + 1} · ${entry.name}`;

    state.phaseNum = state.knightPhase ?? e.phase;
    state.turnNum = e.turn;

    if (e.started) {
      e.elapsed += 1;


      const finished = gmlLte(state.turntimer, 0);
      if (!finished) return;

      e.started = false;
      e.clockOn = false;
      e.balloonDone = false;
      e.arenaOpen = false;

      if (state.soul) {
        state.soul.alive = false;
        state.soul = null;
      }

      e.gap = 15;
      e.spawnDelay = RTIMER_SPAWN;
      e.turnsRun += 1;
      clearTurn(state);


      {

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
      const nx = nextTurn(e.phase, e.turn);
      e.phase = nx.phase;
      e.turn = nx.turn;


      if (prevPhase === 4 && prevTurn === 2) {
        e.turn = e.resumeTurn ?? 0;
      }


      if (prevPhase === 3 && prevTurn === 4) state.knight.rotatingslash3used = true;


      if (state.runMode !== 'endless' && e.phase !== 4
        && phase4Reached(state) && !state.knight.haveusedroaring) {
        e.phase = 4;
        e.turn = phase4Entry(state.knight.rotatingslash3used);

        e.resumeTurn = nx.turn;

        state.knightPhase = 4;
        state.phaseNum = 4;
      }
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
      if (dismissed) {
        if (dlg.speaker === 'knight' && dlg.ballooncon) {

          advanceReply(dlg);
          e.talkWriter = { pos: 1, halted: false, pmb: 0, automash: 0, dead: false };
          e.talkTimer = 0;
        } else if (dlg.speaker === 'knight') {

          e.talkWriter = null;
          clearDialogue(dlg);
          e.talkTimer = 0;
          return;
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
        if (w.automash === 1) b2 = true;
      }

      if (!w.halted) {
        w.pos += 1;

        if (textSoundChar(dlg.text, w.pos - 1)) cue(state, 'snd_txtsus', 1, 1);
        if (w.pos > visible) w.halted = true;
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
      stepTalkWriter();
      return;
    }

    if (!e.menuShown) {
      e.menuShown = true;

      resetDmgStack(state);
      openMenu(state);

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


    if (e.spellphase === undefined) {
      e.spellphase = needsSpellphase(state) ? createSpellphase(state) : null;
      e.spellphaseDone = !e.spellphase;

      if (e.spellphase) return;
    }
    if (e.spellphase) {
      if (stepSpellphase(state, e.spellphase, e)) {

        e.spellphase = null;
        e.spellphaseDone = true;
      } else {
        return;
      }
    }

    if (state.menu.fight.some(Boolean) && !e.bar) {
      const order = [0, 1, 2].filter((c) => state.menu.fight[c] && isUp(state, c));

      if (order.length) {

        const rec = state.boltSchedules?.[state.boltIndex];
        if (rec) state.boltIndex += 1;
        e.bar = createFightBar(state.rng, order, true, rec);
      }
      e.resolved = [false, false, false];

      e.pendingSwing = [];
    }


    if (rudeBusterBusy(state)) return;
    if (state.pendingSpell) state.pendingSpell = [];
    if (state.pendingItem) state.pendingItem = [];


    if ((state.knight?.endCutscene ?? 0) > 0) {

      if ((state.knight?.endcon ?? 0) >= 2) {
        e.bar = null;
        state.fightBar = null;
        return;
      }

      if (e.bar) state.fightBar = e.bar;
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

        cueStop(state, 'snd_laz_c');
        cue(state, 'snd_laz_c', [1, 0.9, 1.15][c]);

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

      if (state.gmlRng) {
        let t = gmlChoose(state.gmlRng, [0, 1, 2]);
        const anyUp = [0, 1, 2].some((c) => isUp(state, c));
        if (anyUp) {
          while (!isUp(state, t)) t = gmlChoose(state.gmlRng, [0, 1, 2]);
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

        advanceTurn(state);

        state.knightPhase = e.phase;

        {
          const rowT = FIGHT_TABLE[e.phase];
          const lastT = e.turn === rowT.length - 1;
          state.phaseturn = e.phase === 4 ? (state.phaseturn ?? 0) : (lastT ? 0 : e.turn + 1);
        }
        const upcoming = FIGHT_TABLE[e.phase][e.turn];

        if (state.turntimer < 90) state.turntimer = 89;
        e.clockOn = true;
        openArena(state, upcoming);

        {
          const row2 = FIGHT_TABLE[e.phase];
          const isLast = e.turn === row2.length - 1;
          if ((e.phase === 1 || e.phase === 2) && isLast) state.knightPhase = e.phase + 1;
          else if (e.phase === 4 && isLast) state.knightPhase = 3;
          else state.knightPhase = e.phase;

          state.phaseNum = state.knightPhase;
        }

        if (upcoming?.name?.toLowerCase().includes('roaring') && state.knight) {
          state.knight.haveusedroaring = true;
          state.knight.damagereduction = DR_PHASE4;
        }
        const gt = state.entities.find((x) => x.alive && x.type.name === 'obj_growtangle');
        if (gt) gt.arenaOpened = upcoming.ac;

        e.arenaOpen = upcoming.ac !== -1;

        if (upcoming.ac !== -1 && !state.soul) deliverHeart(state, gt, upcoming.ac);
      }

      if (e.spawnDelay === 1) {
        const up = FIGHT_TABLE[e.phase][e.turn];
        const tl = turnLength(up.ac, up.difficulty);

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
    const entryNow = FIGHT_TABLE[e.phase][e.turn];

    if (entryNow?.name?.toLowerCase().includes('roaring')) {
      state.knight.haveusedroaring = true;
      state.knight.damagereduction = DR_PHASE4;
    }
    e.owner = launchAttack(state, entryNow);
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

export function buildPracticeScene(state, { seed = 12345 } = {}) {
  state.menu = createMenu();
  state.hp = 0;

  state.invTimer = 0;
  state.phase = 'practice';
  state.view = { x: 0, y: 0 };
  state.flag22 = 0;
  state.gmlRng = gmlCreate(seed);
  state.turntimer = 0;
  state.invc = 1;


  spawn(state, knightActor, { x: KNIGHT.x, y: KNIGHT.ystart });
  PARTY.forEach((p, i) => {
    spawn(state, partyActor, { x: p.x, y: p.y, sprite_index: p.sprite, depth: p.depth, slot: i });
  });

  settleBox(spawn(state, battlebox, { x: BOX.x, y: BOX.y }));

  state.soul = null;
  const d = spawn(state, director);
  spawn(state, turnClock, { director: d });
  return state;
}
