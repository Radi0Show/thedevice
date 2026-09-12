



export function cue(state, name, pitch = 1, gain = 1) {
  if (!state.audioCues) state.audioCues = [];
  state.audioCues.push({ name, pitch, gain, frame: state.frame });
}



const SOUND_FRAMES = {
  snd_knight_cut: 31,
  snd_knight_jump: 46,
};

export function cueIfIdle(state, name, pitch = 1, gain = 1) {
  if (!state.audioBusy) state.audioBusy = Object.create(null);
  const until = state.audioBusy[name] ?? -Infinity;
  if (state.frame < until) return;
  const hold = SOUND_FRAMES[name];
  if (hold !== undefined) state.audioBusy[name] = state.frame + hold;
  cue(state, name, pitch, gain);
}



export function cueLoop(state, name, pitch = 1, gain = 1) {
  if (!state.audioCues) state.audioCues = [];
  state.audioCues.push({ name, pitch, gain, loop: true, frame: state.frame });
}



export function cueSustain(state, name, pitch = 1, gain = 1) {
  if (!state.audioCues) state.audioCues = [];
  state.audioCues.push({ name, pitch, gain, sustain: true, frame: state.frame });
}


export function cueTune(state, name, pitch) {
  if (!state.audioCues) state.audioCues = [];
  state.audioCues.push({ name, pitch, tune: true, frame: state.frame });
}

export function cueStop(state, name) {
  if (!state.audioCues) state.audioCues = [];
  state.audioCues.push({ name, stop: true, frame: state.frame });
}


export function drainCues(state) {
  const out = state.audioCues ?? [];
  state.audioCues = [];
  return out;
}
