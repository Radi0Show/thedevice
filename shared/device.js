


export const PREFS_KEY = 'thedevice.prefs';


export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return {
      seenIntro: p.seenIntro === true,
      flickerOK: p.flickerOK === true,

      soundOn: true,
    };
  } catch { return { seenIntro: false, flickerOK: false, soundOn: true }; }
}

export function savePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {   }
  applyPrefs(p);
}

export const reduceMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;


export function applyPrefs(p = loadPrefs()) {
  document.body.classList.toggle('flicker-ok', p.flickerOK && !reduceMotion);
}



let AC = null;
function blip(freq, dur, vol) {
  if (!loadPrefs().soundOn) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + dur);
  } catch {   }
}
export const sTalk    = () => blip(392 + Math.random() * 40, 0.045, 0.05);
export const sMove    = () => blip(660, 0.05, 0.06);
export const sConfirm = () => { blip(784, 0.07, 0.07); setTimeout(() => blip(988, 0.09, 0.07), 70); };
export const sDeny    = () => blip(110, 0.22, 0.09);


let typing = false, typeSkipFlag = false;

export const isTyping = () => typing;
export const skipType = () => { typeSkipFlag = true; };

export function typeInto(el, text, cps = 26) {
  return new Promise((resolve) => {
    if (reduceMotion) { el.textContent = text; resolve(); return; }
    typing = true; typeSkipFlag = false;
    el.textContent = '';
    let i = 0;
    const step = () => {
      if (typeSkipFlag) { el.textContent = text; typing = false; resolve(); return; }
      el.textContent += text[i];
      if (text[i] !== ' ' && i % 2 === 0) sTalk();
      i++;
      if (i < text.length) setTimeout(step, 1000 / cps);
      else { typing = false; resolve(); }
    };
    step();
  });
}

export const beat = (ms) =>
  new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
