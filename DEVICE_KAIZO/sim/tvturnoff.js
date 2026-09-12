



export const TV_CON1_END = 8;
export const TV_CON2_END = 30;

export function createTvTurnoff() {
  return {
    con: 0,
    timer: 0,
    timer2: 0,
    alpha1: 1,
    xscale1: 10,
    yscale1: 10,
    xscale2: 0.1,
    yscale2: 0.1,
    done: false,
  };
}


function lerp(a, b, t) {
  return a + (b - a) * t;
}



export function stepTvTurnoff(tv, cues) {
  if (tv.done) return;

  if (tv.con === 0) {
    tv.timer += 1;
    tv.alpha1 = lerp(0, 1, tv.timer / 5);

    if (tv.timer === 5) {
      tv.con = 1;
      tv.timer = 0;
    }
    return;
  }

  if (tv.con === 1) {
    tv.timer += 1;
    if (tv.timer === 4) cues.push({ name: 'snd_tvturnoff', pitch: 1, gain: 1 });
    tv.yscale1 = lerp(tv.yscale1, 0.05, tv.timer / 8);
    if (tv.timer === TV_CON1_END) {
      tv.con = 2;
      tv.timer = 0;
      cues.push({ name: 'snd_tvturnoff2', pitch: 1, gain: 1 });

      cues.push({ name: 'mus_knight', stop: true, music: true });
    }
    return;
  }

  if (tv.con === 2) {
    tv.timer += 1;
    const timing = 10;
    if (tv.timer <= timing) {
      tv.xscale1 = lerp(tv.xscale1, 0, tv.timer / timing);
      tv.yscale1 = lerp(tv.yscale1, 0.01, tv.timer / timing);
    }
    tv.timer2 += 1;
    const timing2 = 5;
    if (tv.timer2 <= timing2) {
      tv.xscale2 = lerp(tv.xscale2, 0.4, tv.timer2 / timing2);
      tv.yscale2 = lerp(tv.yscale2, 0.4, tv.timer2 / timing2);
    } else {
      tv.xscale2 = lerp(tv.xscale2, 0, (tv.timer2 - timing2) / timing2);
      tv.yscale2 = lerp(tv.yscale2, 0, (tv.timer2 - timing2) / timing2);
    }
    if (tv.timer === TV_CON2_END) {
      tv.con = 3;
      tv.timer = 0;
      tv.done = true;
    }
  }
}
