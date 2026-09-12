



export const KNIGHT_LINES = {
  6: "Heheh...",
  7: "Thing is,&you actually...",
  8: "You? You're all&damn alone...",
  9: "Even... even if&you knock me down...",
  10: "As long as Kris has got&a hand to lift me up with...",
  11: "So... give up.",
  12: "You know you can't&win... so... give up!",
  13: "... You won't even...",
  14: "... heh... heheheh...",
};



export const BALLOONCON = { 6: 1, 7: 2, 8: 3, 9: 4, 10: 6, 11: 0, 12: 0, 13: 7, 14: 8 };



export const BALLOON_CHAIN = { 8: 9 };


export const SUSIE_LINES = {
  1: "Didn't... think&we'd still be&standing, did you?",
  2: "You actually messed up,&picking a fight with US!",
  3: "Me? I got...&Kris and Ralsei&behind me.",
  4: "As long as Kris,&Ralsei, are here...",
  5: "As long as&I'm here...",
  6: "Heh... you're never gonna&win, you hear me?!",
  7: "... say a thing, huh...",
  8: "Man, I'm done talking.",
  9: "... people like you...&just piss me off.",
};



export const KNIGHT_ALONE = {
  9: "Even... even if&you knock them down...",
  10: "As long as I'm here to&lift them back up...",
};



export const ACT_PAGES = {
  check: ['* Kris analyzed the enemy!', "* But Kris&couldn't learn anything."],
  point: ['* Kris points into the distance.', '* Nothing happened.'],
  holdbreath_first: ['* Kris held their breath.&* Their heartbeat quickened.'
    + '&* The SOUL now moves faster.'],
  holdbreath_again: ['* Kris held their breath...&* Kris smiled.&* Nothing happened.'],

  susie: [
    '* Susie talked to the Knight!',
    "* I don't know what the hell you are, but...",
    '* Leave Toriel alone! You hear me!?',
    '* ...',
    "* ... Fine, you don't wanna listen?",
    '* Then we\'ll just. Have to do things the hard way.',
    '* (Susie will not ACT any more.)',
  ],

  ralsei: [
    '* Ralsei tried talking...',
    "* Please... please, don't do this...",
    '* If the Roaring happens, then... then...',
    '* Please... stop...!',
    '* (... but nothing happened.)',
  ],
  ralsei_again: [
    '* Ralsei tried talking...',
    '* Please, stop...',
    '* (... but nothing happened.)',
  ],
};


export const ACT_TEXT = {
  check: "* Kris analyzed the enemy!&* But Kris couldn't learn anything.",
  point: "* Kris points into the distance.&* Nothing happened.",
  holdbreath_first: "* Kris held their breath.&* Their heartbeat quickened."
    + "&* The SOUL now moves faster.",
  holdbreath_again: "* Kris held their breath...&* Kris smiled.&* Nothing happened.",
  susie: "* Susie talked to the Knight!",
  susie_done: "* (Susie will not ACT any more.)",
  ralsei: "* Ralsei tried talking...",
  ralsei_done: "* (... but nothing happened.)",
};





export const WRITER_COLORS = {
  R: [255, 0, 0],
  B: [0, 0, 255],
  Y: [255, 255, 0],
  G: [0, 255, 0],
  W: [255, 255, 255],
  X: [0, 0, 0],
  P: [128, 0, 128],
  M: [128, 0, 0],
  S: [255, 128, 255],
  V: [128, 255, 128],
  I: [129, 192, 255],
  k: [128, 128, 128],
};



export const WRITER_PAUSE = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 60, 8: 90, 9: 150 };



export const DEFAULT_STYLE = Object.freeze({ color: null, silent: false, shake: 0 });

const PARSE_CACHE = new Map();
const PARSE_CACHE_MAX = 512;



export function parseWriter(raw) {
  const src = String(raw);
  const hit = PARSE_CACHE.get(src);
  if (hit) return hit;

  const out = [];
  const style = [];
  const delay = [];

  let xcolor = null;
  let colorchange = 0;
  let silent = false;
  let shake = 0;
  let skippable = null;
  let halt = 0;
  let destroy = false;
  let nextmsg = 0;
  let codes = 0;
  let accrued = 0;
  let pending = 0;
  let cur = DEFAULT_STYLE;

  const restyle = () => {
    cur = (colorchange === 0 && !silent && shake === 0)
      ? DEFAULT_STYLE
      : Object.freeze({ color: colorchange ? xcolor : null, silent, shake });
  };
  const emit = (ch) => {
    out.push(ch);
    style.push(cur);
    delay.push(accrued);

    if (pending && ch !== '&') { accrued += pending; pending = 0; }
  };

  let n = 0;
  while (n < src.length) {
    const ch = src[n];
    if (ch === '`') {

      codes += 1;
      if (n + 1 < src.length) emit(src[n + 1]);
      n += 2;
      continue;
    }
    if (ch === '^') {
      codes += 1;
      pending += WRITER_PAUSE[src[n + 1]] ?? 0;
      n += 2;
      continue;
    }
    if (ch === '/') {
      codes += 1;
      halt = src[n + 1] === '%' ? 2 : 1;
      n += 1;
      continue;
    }
    if (ch === '%') {
      codes += 1;
      if (src[n - 1] === '/') halt = 2;
      if (src[n + 1] === '%') {

        destroy = true;
        n += 2;
        continue;
      }
      if (halt !== 2) nextmsg += 1;
      n += 1;
      continue;
    }
    if (ch === '\\') {

      codes += 1;
      const cmd = src[n + 1] ?? '';
      const arg = src[n + 2] ?? '';
      if (cmd === 'c') {
        colorchange = 1;
        if (arg === '0') xcolor = null;
        else if (arg === 'k') { xcolor = WRITER_COLORS.k; silent = true; shake = 1; }
        else if (WRITER_COLORS[arg]) xcolor = WRITER_COLORS[arg];
        restyle();
      } else if (cmd === 's') {
        if (arg === '0') skippable = false;
        if (arg === '1') skippable = true;
      } else if (cmd === 'C') {
        if (arg === '1' || arg === '2' || arg === '3' || arg === '4') halt = 5;
      }

      n += 3;
      continue;
    }
    emit(ch);
    n += 1;
  }

  const res = {
    text: out.join(''),
    style,
    delay,
    totalDelay: accrued,
    codes,
    halt,
    destroy,
    nextmsg,
    skippable,
  };
  if (PARSE_CACHE.size >= PARSE_CACHE_MAX) PARSE_CACHE.clear();
  PARSE_CACHE.set(src, res);
  return res;
}



export const msgLines = (s) => parseWriter(s).text.split('&');



function formatChars(cs, st, dl, charline) {
  let charpos = 0;
  let remspace = -1;
  let aster = false;
  const insert = (at, chars) => {
    const style = st[at - 1] ?? DEFAULT_STYLE;
    const delay = dl[at - 1] ?? 0;
    cs.splice(at, 0, ...chars);
    st.splice(at, 0, ...chars.map(() => style));
    dl.splice(at, 0, ...chars.map(() => delay));
  };
  for (let i = 0; i < cs.length; i++) {
    const ch = cs[i];
    if (ch === '&') {
      charpos = 0;
      remspace = -1;

      if (aster && cs[i + 1] !== '*') {
        insert(i + 1, ['|', '|']);
        charpos = 2;
        i += 2;
      }
      continue;
    }
    if (ch === ' ') remspace = i;
    if (ch === '*') aster = true;
    charpos += 1;
    if (charpos >= charline) {
      if (remspace > 2) {
        cs[remspace] = '&';
        i = remspace;
        charpos = 1;
        remspace = -1;
        if (aster) {
          insert(i + 1, ['|', '|']);
          i += 2;
          charpos = 2;
        }
      } else {
        insert(i + 1, ['&']);
        i += 1;
        charpos = 1;
        remspace = -1;
        if (aster) {
          insert(i + 1, ['|', '|']);
          i += 2;
          charpos = 2;
        }
      }
    }
  }
  return { text: cs.join(''), style: st, delay: dl };
}

export function formatWriter(text, charline = 33) {
  return formatWriterStyled(text, charline).text;
}



export function formatWriterStyled(text, charline = 33) {
  const p = parseWriter(text);
  return formatChars(p.text.split(''), p.style.slice(), p.delay.slice(), charline);
}


export const FIRST_BALLOON_TURN = 6;

export function createDialogue() {
  return { balloonturn: 0, ballooncon: 0, text: null, speaker: null, timer: 0 };
}



export function advanceBalloon(dlg, state) {

  const kHook = state.kaizo?.hooks?.advanceBalloon;
  if (kHook) return kHook(dlg, state);

  if (state.partyHp[1] <= 0) return null;
  dlg.balloonturn += 1;
  const n = dlg.balloonturn;
  let line = KNIGHT_LINES[n];
  if (!line) return null;

  if (KNIGHT_ALONE[n] && state.partyHp[0] < 1 && state.partyHp[2] < 1) {
    line = KNIGHT_ALONE[n];
  }

  const allDown = KNIGHT_ALONE[n] && state.partyHp[0] < 1 && state.partyHp[2] < 1;
  dlg.ballooncon = n === 9 && allDown ? 5 : (BALLOONCON[n] ?? 0);
  dlg.text = line;
  dlg.speaker = 'knight';
  dlg.timer = 0;
  return line;
}


export function advanceReply(dlg) {
  if (!dlg.ballooncon) return null;
  const con = dlg.ballooncon;
  const line = SUSIE_LINES[con] ?? null;

  dlg.ballooncon = BALLOON_CHAIN[con] ?? 0;
  dlg.text = line;
  dlg.speaker = dlg.ballooncon ? 'knight' : 'susie';
  dlg.timer = 0;
  return line;
}

export function clearDialogue(dlg) {
  dlg.text = null;
  dlg.speaker = null;
}



export const CHARS_PER_FRAME = 1;





function revealCount(text, delay, timer, cps) {
  const n = Math.floor(timer * cps);
  if (delay.length === 0 || delay[delay.length - 1] === 0) return n;

  let shown = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '&') continue;
    if (Math.floor((timer - delay[i]) * cps) < shown + 1) break;
    shown += 1;
  }
  return shown;
}

export function revealed(text, timer, cps = CHARS_PER_FRAME) {
  const p = parseWriter(text);
  const n = revealCount(p.text, p.delay, timer, cps);
  const lines = p.text.split('&');
  let left = n;
  const out = [];
  for (const line of lines) {
    if (left <= 0) break;
    out.push(line.slice(0, left));
    left -= line.length;
  }
  return out;
}



export function writerLines(text, { charline = 33, timer = 1e9, cps = CHARS_PER_FRAME } = {}) {
  const f = formatWriterStyled(text, charline);
  const n = revealCount(f.text, f.delay, timer, cps);
  const lines = [];
  const styles = [];
  let left = n;
  let i = 0;
  while (i <= f.text.length) {
    let end = f.text.indexOf('&', i);
    if (end === -1) end = f.text.length;
    if (left <= 0) break;
    const take = Math.min(end - i, left);
    lines.push(f.text.slice(i, i + take));
    styles.push(f.style.slice(i, i + take));
    left -= end - i;
    if (end === f.text.length) break;
    i = end + 1;
  }
  return { lines, styles };
}

export function dialogueDone(text, timer) {
  const p = parseWriter(text);
  return revealCount(p.text, p.delay, timer, CHARS_PER_FRAME)
    >= p.text.split('&').join('').length;
}



export function dialogueSkipTimer(text) {
  const p = parseWriter(text);

  return Math.ceil(p.text.split('&').join('').length / CHARS_PER_FRAME) + p.totalDelay;
}



const SILENT_CHARS = new Set([' ', '^', '!', '.', '?', ',', ':', '/', '\\', '|', '*']);

export function textSoundChar(text, timer, cps = CHARS_PER_FRAME) {

  const p = parseWriter(text);
  const s = p.text.split('&').join('\n');
  const pos = p.totalDelay === 0
    ? Math.floor(timer * cps)
    : revealCount(p.text, p.delay, timer, cps);
  if (pos < 1 || pos > s.length) return null;
  let ch = s[pos - 1];
  let at = pos - 1;

  if ((ch === '&' || ch === '\n') && cps >= 0.5) { ch = s[pos] ?? ''; at = pos; }

  if (p.style[at]?.silent) return null;
  if (!ch || SILENT_CHARS.has(ch)) return null;
  return ch;
}



export const TV_VOICE_COUNT = 9;
