



export const FACE_IDLE = 0;
export const FACE_ATTACK = 1;
export const FACE_SPELL = 2;
export const FACE_ITEM = 3;
export const FACE_DEFEND = 4;
export const FACE_ACT = 6;
export const FACE_DEFEAT = 9;


export const HERO_IDLE = 0;
export const HERO_ATTACK = 1;
export const HERO_SPELL = 2;
export const HERO_ITEM = 4;
export const HERO_ACT = 6;
export const HERO_VICTORY = 7;



export const HERO_SPRITES = [
  {
    name: 'KRIS',
    idle: 'spr_krisb_idle',
    defend: 'spr_krisb_defend',
    hurt: 'spr_krisb_hurt',
    attackready: 'spr_krisb_attackready',
    attack: 'spr_krisb_attack',
    item: 'spr_krisb_item',
    itemready: 'spr_krisb_itemready',
    actready: 'spr_krisb_actready',
    act: 'spr_krisb_act',

    spellready: 'spr_krisb_actready',
    spell: 'spr_krisb_act',
    defeat: 'spr_krisb_defeat',
    victory: 'spr_krisb_victory',
    attackframes: 6, itemframes: 6, defendframes: 5,
    actframes: 7, actreturnframes: 10, spellframes: 10,
  },
  {
    name: 'SUSIE',
    idle: 'spr_susieb_idle',
    defend: 'spr_susieb_defend',
    hurt: 'spr_susieb_hurt',
    attackready: 'spr_susieb_attackready',
    attack: 'spr_susieb_attack',
    item: 'spr_susieb_item',
    itemready: 'spr_susieb_itemready',
    actready: 'spr_susieb_actready',
    act: 'spr_susieb_act',
    spellready: 'spr_susieb_spellready',
    spell: 'spr_susieb_spell',
    defeat: 'spr_susieb_defeat',
    victory: 'spr_susieb_victory',

    attackframes: 5, itemframes: 5, defendframes: 5,
    actframes: 7, actreturnframes: 10, spellframes: 8,
  },
  {
    name: 'RALSEI',
    idle: 'spr_ralsei_idle',
    defend: 'spr_ralsei_defend',
    hurt: 'spr_ralsei_hurt_fixed',
    attackready: 'spr_ralsei_attackready',
    attack: 'spr_ralsei_attack',
    item: 'spr_ralsei_item',
    itemready: 'spr_ralsei_itemready',
    actready: 'spr_ralsei_actready',
    act: 'spr_ralsei_act',
    spellready: 'spr_ralsei_spellready',
    spell: 'spr_ralsei_spell',
    defeat: 'spr_ralsei_defeat',
    victory: 'spr_ralsei_victory',

    attackframes: 6, itemframes: 6, defendframes: 7,
    actframes: 7, actreturnframes: 10, spellframes: 10,
  },
];

export function createHeroes() {
  return [0, 1, 2].map(() => ({
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

    itemed: false,
    spelltimer: 0,
  }));
}



function stepHero(h, spec, down) {
  stepHeroPose(h, spec, down);


  if (h.spelltimer > 0) {
    h.spelltimer -= 1;
    if (h.spelltimer === 0) {
      if (spec.spellframes > 0) h.faceaction = FACE_IDLE;
      h.state = HERO_IDLE;
      h.attacktimer = 0;
    }
  }
}



function stepHeroPose(h, spec, down) {

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

  const arm = () => {
    if (!h.itemed) {
      h.itemed = true;
      h.spelltimer = 16;
    }
  };

  if (h.state === HERO_SPELL) {
    arm();
    run(spec.spellframes, spec.spell);
    return;
  }
  if (h.state === HERO_ITEM) {
    arm();
    run(spec.itemframes, spec.item);
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

export function stepHeroes(state) {
  if (!state.heroes) return;
  for (let c = 0; c < 3; c++) {

    stepHero(state.heroes[c], HERO_SPRITES[c], (state.partyHp?.[c] ?? 1) <= 0);
  }
}


export function heroAct(state, c, heroState) {
  const h = state.heroes?.[c];
  if (!h) return;
  h.state = heroState;
  h.attacktimer = 0;
  h.acttimer = 0;

  h.itemed = false;
  h.spelltimer = 0;
}


export function heroHurt(state, c, frames = 12) {
  const h = state.heroes?.[c];
  if (h) h.hurt = frames;
}
