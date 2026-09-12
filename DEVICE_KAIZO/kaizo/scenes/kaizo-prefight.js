

import { gmlEq } from '../../sim/gml.js';

export const MUS_KNIGHT_APPEARS = 'knight_appears.ogg';
export const MUS_KNIGHT = 'knight.ogg';

export const MUS_ENDER_APPEARANCE = 'ender_theirappearance.ogg';
export const MUS_ENDER_THEIRTHEME = 'ender_theirtheme.ogg';
export const MUS_KAIZOKNIGHT = 'kaizoknight.ogg';
export const MUS_KAIZOKNIGHT_ALT = 'kaizoknight_alt.ogg';

export const KAIZO_MUS_ALT_STEM = 'kaizoknight_alt';

export function musFileExists(names) {
  const set = new Set(names);
  return (name) => set.has(name);
}

export function kaizoSetMusic(arg0 = '', opts = {}) {
  const { fileExists, flag456 = false, tempflag } = opts;
  if (typeof fileExists !== 'function') {

    throw new Error('kaizoSetMusic: opts.fileExists is required (file_exists over ../mus/)');
  }
  if (arg0 === '') return '';
  if (arg0 === MUS_KNIGHT_APPEARS) {
    return fileExists(MUS_ENDER_APPEARANCE) ? MUS_ENDER_APPEARANCE : arg0;
  }
  if (arg0 === MUS_KNIGHT) {
    if (fileExists(MUS_KAIZOKNIGHT)) {
      if (flag456) {
        if (fileExists(MUS_KAIZOKNIGHT_ALT)) {

          if (tempflag) tempflag[76] = 1;
          return MUS_KAIZOKNIGHT_ALT;
        }

        if (tempflag) tempflag[76] = 0;
        return KAIZO_MUS_ALT_STEM;

      }
      return MUS_KAIZOKNIGHT;
    }
    if (fileExists(MUS_ENDER_THEIRTHEME)) return MUS_ENDER_THEIRTHEME;
    return arg0;
  }

  return undefined;
}

export function kaizoMusicPlayable(result, fileExists) {
  return typeof result === 'string' && result !== '' && fileExists(result);
}

export const CHOICE_PRACTICE = 0;
export const CHOICE_NOHIT = 1;
export const CHOICE_STANDARD = 2;
export const CHOICE_RETURN = 3;

export const MODE_CHOICES_EN = Object.freeze([
  '\nPractice',
  '\nNo Hit',
  'Standard',
  'Return',
]);

export const MODE_CHOICES_JA = Object.freeze([
  '\n練習',
  '\nノーヒット\nモード',
  '通常モード',
  '装備',
]);

export const NOHIT_HINT_EN = '* (Press ESC at any time to exit No Hit mode.)/%';
export const NOHIT_HINT_JA = '＊（ESCキーを押すと&　ノーヒットモードを解除できます。)/%';

export const MSG_CHOICE4 = '\\C4';

export const MSG_CLEAR = '%%';

export const VANILLA_CHAR = Object.freeze([1, 2, 3]);

export const NOELLE_CHAR_ID = 4;
export const NOELLE_MIN_MAXHP = 120;

export function createPrefightGlobals(over = {}) {
  return {

    kaizo_practice: 0,

    kaizo_intro: 0,

    msc: 0,

    knight_mode: undefined,

    choice: undefined,

    char: [1, 2, 3],

    maxhp: [0, 160, 190, 140, 120],
    hp: [0, 160, 190, 140, 120],

    flag: {},

    tempflag: {},

    item: [],

    knight_battle_items: undefined,

    interact: 0,
    menuno: 0,
    msg: [],
    choicemsg: [],

    speaker: null,

    choicerUp: false,
    dialoguerUp: false,
    ...over,
  };
}

export function createPrefight(over = {}) {
  return {
    con: 2,

    doprac: 0,

    rem_char: [...VANILLA_CHAR],

    char_change: 0,

    alarm0: -1,

    japanese: false,

    effects: [],
    ...over,
  };
}

function emit(pf, type, detail) {
  const ev = { type, con: pf.con, ...detail };
  pf.effects.push(ev);
  return ev;
}

export function prefightStepTop(pf, w) {
  pf.doprac = w.kaizo_practice;
  if (w.maxhp[NOELLE_CHAR_ID] < NOELLE_MIN_MAXHP) {
    w.maxhp[NOELLE_CHAR_ID] = NOELLE_MIN_MAXHP;
    w.hp[NOELLE_CHAR_ID] = NOELLE_MIN_MAXHP;
    emit(pf, 'noelle-maxhp-floor', { maxhp: NOELLE_MIN_MAXHP });
  }
  return pf.doprac;
}

export function prefightConTwo(pf, w) {
  pf.rem_char = [w.char[0], w.char[1], w.char[2]];
  pf.char_change = 0;
  if (pf.rem_char[0] !== 1 || pf.rem_char[1] !== 2 || pf.rem_char[2] !== 3) {

    pf.char_change = 1;
    emit(pf, 'char-change-armed', { rem_char: [...pf.rem_char] });
  }
  pf.con = 3;
  return pf.char_change;
}

export function stepPrefight(pf, w) {
  const before = pf.effects.length;

  if (gmlEq(pf.con, 3.2)) {
    pf.con = 3.3;
    w.msc = -1;

    w.knight_mode = 0;
    w.kaizo_intro = 1;
    emit(pf, 'settings-save', { kaizo_intro: 1 });
    if (pf.doprac) {
      w.speaker = 'none';
      w.msg[0] = MSG_CHOICE4;
      const rows = pf.japanese ? MODE_CHOICES_JA : MODE_CHOICES_EN;
      w.choicemsg[0] = rows[0];
      w.choicemsg[1] = rows[1];
      w.choicemsg[2] = rows[2];
      w.choicemsg[3] = rows[3];

      w.dialoguerUp = true;
      emit(pf, 'choicer-open', { rows: [...rows], side: 1 });
    } else {

      w.choice = CHOICE_STANDARD;
      pf.con = 3.4;
      emit(pf, 'choicer-skipped', { choice: CHOICE_STANDARD });
    }
  }

  if (gmlEq(pf.con, 3.3) && w.choicerUp) {
    pf.con = 3.4;
    w.msg[0] = MSG_CLEAR;
  }

  if (gmlEq(pf.con, 3.4) && !w.choicerUp) {
    w.interact = 1;
    if (gmlEq(w.choice, CHOICE_RETURN)) {

      if (pf.char_change) {
        w.char = [pf.rem_char[0], pf.rem_char[1], pf.rem_char[2]];
      }
      w.tempflag[90] = 0;
      w.interact = 0;

      emit(pf, 'room-restart', { char: [...w.char] });

      return pf.effects.slice(before);
    }
    if (gmlEq(w.choice, CHOICE_NOHIT)) {
      w.speaker = 'none';
      w.msg[0] = pf.japanese ? NOHIT_HINT_JA : NOHIT_HINT_EN;
      w.dialoguerUp = true;
      pf.con = 3.5;
      w.knight_mode = w.choice;
      emit(pf, 'nohit-hint', { knight_mode: w.knight_mode });
    } else {

      pf.con = 4;
      w.knight_mode = w.choice;
      emit(pf, 'fight-start', { knight_mode: w.knight_mode });
    }
  }

  if (gmlEq(pf.con, 3.5) && !w.dialoguerUp) {
    pf.con = 4;
    emit(pf, 'fight-start', { knight_mode: w.knight_mode });
  }

  if (gmlEq(pf.con, 3.7)) {
    if (!gmlEq(w.menuno, 2)) {
      if (pf.char_change) {
        w.char = [...VANILLA_CHAR];
      }
      w.interact = 1;

      w.menuno = -1;
      pf.con = 2.2;
      pf.alarm0 = 5;
      emit(pf, 'equip-menu-rewind', { con: 2.2, alarm0: 5 });
    }
  }

  return pf.effects.slice(before);
}

export const BATTLE_START_COVER = Object.freeze({
  image_blend: 'c_black',
  depth: -999999999,

  scaleDivisor: 9,
  destroyAfterFrames: 25,
});

export function prefightBattleStart(pf, w, opts = {}) {
  const { fileExists, tempflag = w.tempflag } = opts;

  emit(pf, 'snd-free-all', {});

  if (gmlEq(w.knight_mode, CHOICE_STANDARD)) {
    w.knight_battle_items = [];
    for (let i = 0; i < 13; i++) w.knight_battle_items[i] = w.item[i];
    emit(pf, 'items-snapshot', { count: w.knight_battle_items.length });
  }
  w.flag[9] = 2;
  const track = kaizoSetMusic(MUS_KNIGHT, {
    fileExists,
    flag456: !!w.flag[456],
    tempflag,
  });
  emit(pf, 'batmusic', { track, playable: kaizoMusicPlayable(track, fileExists) });
  if (pf.char_change) {
    w.char = [pf.rem_char[0], pf.rem_char[1], pf.rem_char[2]];
    emit(pf, 'char-restored-for-fight', { char: [...w.char], cover: BATTLE_START_COVER });
  }
  w.flag[9] = 1;
  pf.con = 6;
  return track;
}

export function prefightArrivalTrack(w, fileExists) {
  return kaizoSetMusic(MUS_KNIGHT_APPEARS, { fileExists, flag456: !!w.flag[456] });
}

export function prefightConEight(pf, w) {
  if (pf.char_change) {
    w.char = [...VANILLA_CHAR];
    emit(pf, 'char-vanilla-for-aftermath', { char: [...w.char] });
  }
  return w.char;
}

export function restoreKnightBattleItems(w) {
  if (w.knight_battle_items === undefined) return 0;
  const n = w.knight_battle_items.length;
  for (let i = 0; i < n; i++) w.item[i] = w.knight_battle_items[i];
  w.knight_battle_items = [];
  return n;
}
