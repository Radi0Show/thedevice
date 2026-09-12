

import {
  kaizoSetMusic,
  kaizoMusicPlayable,
  musFileExists,
  MUS_KNIGHT,
  MUS_KNIGHT_APPEARS,
  MUS_KAIZOKNIGHT,
  MUS_KAIZOKNIGHT_ALT,
  MUS_ENDER_THEIRTHEME,
  MUS_ENDER_APPEARANCE,
  KAIZO_MUS_ALT_STEM,
  CHOICE_PRACTICE,
  CHOICE_NOHIT,
  CHOICE_STANDARD,
  CHOICE_RETURN,
  MODE_CHOICES_EN,
  createPrefight,
  createPrefightGlobals,
  prefightStepTop,
  prefightConTwo,
  stepPrefight,
} from '../kaizo/scenes/kaizo-prefight.js';

export const KAIZO_MUS_NAMES = Object.freeze([
  MUS_KAIZOKNIGHT,
  MUS_KAIZOKNIGHT_ALT,
  MUS_ENDER_THEIRTHEME,
  MUS_ENDER_APPEARANCE,
]);

export const CUE_FIGHT = 'mus_knight';
export const CUE_ARRIVAL = 'knight_appears';

export const STEM_FALLBACK_NOTE =
  'kaizo_set_music returned the extension-less stem "kaizoknight_alt" '
  + '(kaizoknight_alt.ogg is absent). The real mod hands that to a patched '
  + 'snd_init that can resolve it from the data file\'s sound table; this '
  + 'page cannot, so it plays kaizoknight.ogg instead of nothing.';

export function resolveKaizoMusic({
  musFiles,
  baseManifest = {},
  flag456 = false,
  kaizoDirUrl = '',
} = {}) {
  const fileExists = musFileExists(musFiles);
  const overrides = {};

  const decide = (arg0, cue) => {

    const tempflag = {};
    const verdict = kaizoSetMusic(arg0, { fileExists, flag456, tempflag });
    const playable = kaizoMusicPlayable(verdict, fileExists);
    let file = verdict;
    let deviation = null;
    if (!playable) {
      if (verdict === KAIZO_MUS_ALT_STEM) {
        deviation = STEM_FALLBACK_NOTE;

        file = MUS_KAIZOKNIGHT;
      } else {

        file = null;
      }
    }

    if (file && baseManifest[cue] !== file) {
      overrides[cue] = KAIZO_MUS_NAMES.includes(file) ? `${kaizoDirUrl}${file}` : file;
    }
    return {
      arg0, cue, verdict, playable, file, deviation, tempflag76: tempflag[76],
    };
  };

  const arrival = decide(MUS_KNIGHT_APPEARS, CUE_ARRIVAL);
  const fight = decide(MUS_KNIGHT, CUE_FIGHT);
  return { overrides, arrival, fight };
}

export { CHOICE_PRACTICE, CHOICE_NOHIT, CHOICE_STANDARD, CHOICE_RETURN, MODE_CHOICES_EN };

export const MODE_NAME_BY_CHOICE = Object.freeze({
  [CHOICE_PRACTICE]: 'practice',
  [CHOICE_NOHIT]: 'nohit',
  [CHOICE_STANDARD]: 'standard',
});

export function openModeSelect({ kaizoPractice = 0, char = [1, 2, 3], flag456 = false } = {}) {
  const w = createPrefightGlobals({
    kaizo_practice: kaizoPractice ? 1 : 0,
    char: [...char],
    flag: { 456: flag456 ? 1 : 0 },
  });
  const pf = createPrefight();
  prefightStepTop(pf, w);
  prefightConTwo(pf, w);
  pf.con = 3.2;

  const effects = stepPrefight(pf, w);
  return { pf, w, effects };
}

export function modeSelectChoicerUp({ pf, w }) {
  w.choicerUp = true;
  return stepPrefight(pf, w);
}

export function modeSelectChoose({ pf, w }, choice) {
  w.choice = choice;
  w.choicerUp = false;
  return stepPrefight(pf, w);
}

export function modeSelectHintDone({ pf, w }) {
  w.dialoguerUp = false;
  return stepPrefight(pf, w);
}

export function modeSelectReady(pf) {
  return pf.con === 4;
}

export function modeSelectKnightMode({ w }) {
  return w.knight_mode === undefined ? undefined : MODE_NAME_BY_CHOICE[w.knight_mode];
}
