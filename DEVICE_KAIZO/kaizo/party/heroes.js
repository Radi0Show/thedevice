

import { mergeColor } from '../../sim/gml.js';
import {
  FACE_IDLE, FACE_ATTACK, FACE_SPELL, FACE_ITEM, FACE_DEFEND, FACE_ACT,
  FACE_DEFEAT, HERO_IDLE, HERO_ATTACK, HERO_SPELL, HERO_ITEM, HERO_ACT,
  HERO_VICTORY,
} from '../../sim/heroes.js';
import { rosterSize, memberAt, isFrozen, charIdOf } from './roster.js';

import { heroCleanUp } from './freeze.js';

export {
  FACE_IDLE, FACE_ATTACK, FACE_SPELL, FACE_ITEM, FACE_DEFEND, FACE_ACT,
  FACE_DEFEAT, HERO_IDLE, HERO_ATTACK, HERO_SPELL, HERO_ITEM, HERO_ACT,
  HERO_VICTORY,
};

export const HEROFROZEN_NONE = -4;

export const HEROFROZEN_CLEANED = -99;

export function createKaizoHeroes(state) {
  const n = rosterSize(state);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      state: HERO_IDLE,
      faceaction: FACE_IDLE,
      siner: 0,
      attacktimer: 0,
      acttimer: 0,
      defendtimer: 0,
      hurttimer: 0,
      hurt: 0,
      index: 0,
      sprite: null,

      herofrozen: HEROFROZEN_NONE,

      blend: [255, 255, 255],

      frozenHidden: false,
    });
  }
  return out;
}

function stepHero(h, spec, down) {
  if (down) {
    h.sprite = spec.defeat;
    h.index = 0;
    return;
  }

  if (h.hurt > 0) {
    h.hurt -= 1;
    h.sprite = spec.hurt;
    h.index = 0;
    return;
  }

  if (h.state === HERO_IDLE) {
    h.acttimer = 0;
    let sprite = spec.idle;
    if (h.faceaction === FACE_ATTACK) sprite = spec.attackready;
    if (h.faceaction === FACE_ITEM) sprite = spec.itemready;
    if (h.faceaction === FACE_SPELL) sprite = spec.spellready;
    if (h.faceaction === FACE_ACT) sprite = spec.actready;
    if (h.faceaction === FACE_DEFEAT) sprite = spec.defeat;

    if (h.faceaction === FACE_DEFEND) {

      sprite = spec.defend;
      h.index = h.defendtimer;
      if (h.defendtimer < spec.defendframes) h.defendtimer += 0.5;
    } else {
      h.defendtimer = 0;
      h.index = h.siner / 5;
    }
    h.sprite = sprite;
    h.siner += 1;
    return;
  }

  const run = (frames, sprite) => {
    h.index = Math.min(h.attacktimer, frames);
    h.sprite = sprite;
    h.attacktimer += 0.5;
  };

  if (h.state === HERO_ATTACK) {
    h.siner += 1;
    run(spec.attackframes, spec.attack);
    if (h.attacktimer > spec.attackframes + 5) {
      h.state = HERO_IDLE;
      h.attacktimer = 0;
      h.faceaction = FACE_IDLE;
    }
    return;
  }
  if (h.state === HERO_SPELL) {
    run(spec.spellframes, spec.spell);
    if (spec.spellframes !== 0 && h.attacktimer > spec.spellframes + 8) {
      h.state = HERO_IDLE;
      h.attacktimer = 0;
      h.faceaction = FACE_IDLE;
    }
    return;
  }
  if (h.state === HERO_ITEM) {
    run(spec.itemframes, spec.item);
    if (h.attacktimer > spec.itemframes + 8) {
      h.state = HERO_IDLE;
      h.attacktimer = 0;
      h.faceaction = FACE_IDLE;
    }
    return;
  }
  if (h.state === HERO_ACT) {
    if (h.acttimer < spec.actframes) h.acttimer += 0.5;
    else h.acttimer += 0.5;
    h.sprite = spec.act;
    h.index = Math.min(h.acttimer, spec.actframes);
    if (h.acttimer >= spec.actreturnframes) {
      h.acttimer = 0;
      h.state = HERO_IDLE;
      h.faceaction = FACE_IDLE;
    }
    return;
  }
  if (h.state === HERO_VICTORY) {
    h.sprite = spec.victory;
    h.index = h.attacktimer;
    h.attacktimer += 0.5;
    return;
  }

  h.sprite = spec.idle;
}

export const GLOOM_COLOR = mergeColor([0, 0, 255], [38, 140, 172], 0.5);

export function gloomTint(gloom) {
  const gamt = Math.min(gloom / 150, 0.3);
  return mergeColor([255, 255, 255], GLOOM_COLOR, gamt);
}

export function stepKaizoHeroes(state) {
  if (!state.heroes) return;
  const n = rosterSize(state);
  const sideb = !!state.kaizo?.sideb;
  for (let c = 0; c < n; c++) {
    const h = state.heroes[c];
    const m = memberAt(state, c);
    if (!h || !m) continue;

    const frozen = isFrozen(state, c);
    if (frozen) {
      if (h.herofrozen === HEROFROZEN_NONE) {
        h.herofrozen = {
          sprite: m.sprites.frozen,
          x: m.pos.x,
          y: m.pos.y,
          depth: m.depth,
          image_index: 0,
          inbattle: 1,

          image_xscale: 2,
          image_yscale: 2,

          image_alpha: 1,

          age: 0,
        };
      }
      h.frozenHidden = true;
    } else {
      h.frozenHidden = false;
    }

    if (h.herofrozen && typeof h.herofrozen === 'object' && h.herofrozen.age < 20) {
      h.herofrozen.age += 1;
    }

    if (sideb && state.knight) {

      const g = state.kaizo?.gloomByChar?.[charIdOf(state, c)] ?? 0;
      h.blend = gloomTint(g);
    } else {
      h.blend = [255, 255, 255];
    }

    stepHero(h, m.spec, (state.partyHp?.[c] ?? 1) <= 0);
  }
}

export function cleanupKaizoHero(state, slot) {
  const h = state.heroes?.[slot];
  if (!h) return null;

  const r = heroCleanUp(state, slot);

  const charId = charIdOf(state, slot);
  if (state.kaizo?.freezeByChar) state.kaizo.freezeByChar[charId] = 0;

  if (h.herofrozen !== HEROFROZEN_NONE) {
    const leaked = h.herofrozen;
    h.herofrozen = HEROFROZEN_CLEANED;
    if (state.kaizo) {
      state.kaizo.leakedStatues = state.kaizo.leakedStatues ?? [];
      if (leaked && typeof leaked === 'object') state.kaizo.leakedStatues.push(leaked);
    }
  }
  return r;
}

export function heroAct(state, c, heroState) {
  const h = state.heroes?.[c];
  if (!h) return;
  h.state = heroState;
  h.attacktimer = 0;
  h.acttimer = 0;
}

export function heroHurt(state, c, frames = 12) {
  const h = state.heroes?.[c];
  if (h) h.hurt = frames;
}
