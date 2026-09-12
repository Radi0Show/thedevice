


import { gmlRound } from './gml.js';
import { gmlRandom } from './rng.js';
import { PARTY, statFor, scrDamage } from './damage.js';
import { cue, cueStop } from './audio.js';
import { scrShakescreen } from './shake.js';

export const KNIGHT_MAXHP = 7300;
export const KNIGHT_AT = 40;
export const KNIGHT_DF = 0;


export const DR_OPENING = 0.04;

export const DR_BASE = 0.2;
export const DR_PER_TURN = 0.01;
export const DR_CAP = 0.35;

export const DR_PHASE4 = 0.4;


export const PHASE4_GATE = 5840;

export function createKnight() {
  return {
    hp: KNIGHT_MAXHP,

    damagereduction: DR_OPENING,
    damagereductiontimer: 0,
    blocking: false,
    phase: 1,

    animState: 0,
    hurttimer: 0,
    stronghurtanim: false,
    whiteflash: 0,
    shakex: 0,
    blockanim: 0,
    blocktimer: 0,
    hurtamt: 0,
    holdbreathcount: 0,

    haveusedroaring: false,

    progamer: true,
    endCutscene: 0,
    endcon: 0,
  };
}



export function krisMult(state, slot) {
  if (slot !== 0) return 1;
  const susieDown = state.partyHp[1] < 0;
  const ralseiDown = state.partyHp[2] < 0;
  if (susieDown && ralseiDown) return 2;
  if (susieDown || ralseiDown) return 1;
  return 0.5;
}



export function fightDamage(state, slot, accuracy) {
  if (accuracy <= 0) return 0;
  const at = statFor(state, slot).at;
  let damage = gmlRound((at * accuracy) / 20 - KNIGHT_DF * 3);
  damage = Math.ceil(damage * state.knight.damagereduction);
  if (slot === 0) {
    const m = krisMult(state, 0);
    damage = m === 0.5 ? gmlRound(damage * 0.5) : damage * m;
  }
  return Math.max(0, damage);
}



export function spellDamage(state, slot) {
  const { at, magic } = statFor(state, slot);
  const base = Math.ceil(magic * 5 + at * 11 - KNIGHT_DF * 3);
  return Math.max(0, Math.ceil(base * (state.knight.damagereduction + 0.65)));
}



export const STRONGHURT_DAMAGE = 100;

export function damageKnight(state, amount) {
  if (amount <= 0) return 0;
  const k = state.knight;
  k.hp = Math.max(0, k.hp - amount);
  k.animState = 3;
  k.hurttimer = 30;
  k.shakex = 9;
  k.hurtamt = amount;
  if (amount >= (state.stronghurtDamage ?? STRONGHURT_DAMAGE)) {
    k.stronghurtanim = true;
  }
  return amount;
}





export function tickChargeup(state) {
  const k = state.knight;
  if (!k || k.chargeupcon !== 1) return;
  k.chargeuptimer = (k.chargeuptimer ?? 0) + 1;
  if (k.chargeuptimer === 1) cue(state, 'snd_knight_powerup_white');


  if (state.chargeupDrawTaken) {
    state.chargeupDrawTaken = false;
  } else if (k.chargeuptimer % 4 === 0 && k.chargeuptimer > 10 && state.gmlRng) {
    gmlRandom(state.gmlRng, 360);
  }

  if (k.chargeuptimer === 60) state.turntimer = 1;
}

export function stepKnightAnim(state) {
  const k = state.knight;
  if (!k) return;


  k.damagereductiontimer += 1;
  if (k.damagereductiontimer === 1) {
    k.damagereduction = DR_BASE;

    k.named = true;
  }

  if (k.whiteflash > 0) k.whiteflash -= 1;



  if (k.animState === 3) {
    k.hurttimer -= 1;
    if (k.hurttimer < 0) {
      k.animState = 0;
    } else {

      k.hurtshake = (k.hurtshake ?? 0) + 1;
      if (k.hurtshake > 1) {
        if (k.shakex > 0) k.shakex -= 1;
        if (k.shakex < 0) k.shakex += 1;
        k.shakex = -k.shakex;
        k.hurtshake = 0;
      }
    }
  }

  if (k.animState === 3 && k.hurttimer >= 0) {

    if (k.hurttimer === 29 && k.stronghurtanim && !k.endCutscene) {
      cue(state, 'snd_knight_hurtb');
    }
    if (k.hurttimer === 15) k.stronghurtanim = false;
  }



  if (k.blockanim === 1) {
    cueStop(state, 'snd_bell');
    cue(state, 'snd_bell');
    k.blockanim = 2;
    k.blocktimer = 0;
  }

  if (k.blockanim === 2) {
    k.blocktimer += 1;
    if (k.blocktimer >= 15) {
      k.blocktimer = 0;
      k.blockanim = 0;
    }
  }
}

export function advanceTurn(state) {
  const k = state.knight;
  if (k.damagereduction >= DR_BASE && k.damagereduction < DR_CAP) {
    k.damagereduction += DR_PER_TURN;
  }
}



export function knightCatch(state) {

  if (state.invTimer >= 0) return 0;
  let total = 0;
  for (let ti = 0; ti < 3; ti++) {
    const hp = state.partyHp[ti];
    if (hp <= 0) continue;
    let dmg = 40;
    if (hp > 1 && hp < 41) dmg = hp - 1;
    state.invTimer = -1;
    total += scrDamage(state, dmg, ti, { truedamage: true });
  }
  state.invTimer = state.invc * 30;
  return total;
}

export function phase4Reached(state) {
  return state.knight.hp <= PHASE4_GATE;
}



export function endCutsceneReached(state) {
  const k = state.knight;

  if (k.animState !== 3 || !(k.hurttimer >= 0)) return false;
  return !!k.haveusedroaring && k.endCutscene === 0 && k.endcon !== 1
    && k.hp <= PHASE4_GATE;
}


export function startEndCutscene(state) {
  const k = state.knight;
  if (k.endCutscene !== 0) return false;
  k.endCutscene = 1;
  k.endcon = 1;

  k.endtimer = -1;
  k.hurttimer = 999;
  k.stronghurtanim = true;
  k.animState = 3;

  state.tensionbarFly = { x: 38, hspeed: 0, friction: -0.4, alarm: -1 };

  scrShakescreen(state, { shakex: 30, shakey: 8, shakespeed: 2 });
  cue(state, 'snd_knight_hurt', 1, 0.8);
  cue(state, 'snd_knight_hurt', 0.7, 0.8);
  cue(state, 'snd_knight_hurt', 1.3, 0.8);

  cueStop(state, 'mus_knight');
  return true;
}




const FADESPEED = 1 / 15;

export function stepEndCutscene(state) {
  const k = state.knight;
  if (!k || k.endCutscene !== 1) return;

  if ((k.endtimer ?? 0) >= 0) k.shakex = 0;
  k.stronghurtanim = true;
  k.animState = 3;

  if (k.hurttimer === 15) k.stronghurtanim = false;

  if (state.tensionbarFly?.alarm > 0) {
    state.tensionbarFly.alarm -= 1;
    if (state.tensionbarFly.alarm === 0) state.tensionbarFly = null;
  }
  k.endtimer = (k.endtimer ?? 0) + 1;

  if (k.endtimer === 32) state.endFade = 0;
  if (k.endtimer >= 32) state.endFade = Math.fround(state.endFade + FADESPEED);
  if (k.endcon === 1 && k.endtimer > 45) {
    k.endcon = 2;
    state.fightBar = null;
    if (state.dmg) state.dmg.list = [];

    state.tensionbarFly.hspeed = -10;
    state.tensionbarFly.alarm = 15;
    state.fighting = 0;
  }
  if (state.tensionbarFly) {
    const f = state.tensionbarFly;

    if (!f.hspeed) return;

    f.hspeed = Math.fround(Math.sign(f.hspeed) * (Math.abs(f.hspeed) - f.friction));
    f.x = Math.fround(f.x + f.hspeed);
  }
}
