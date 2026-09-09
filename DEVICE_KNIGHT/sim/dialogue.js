



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


export const msgLines = (s) => String(s).split('&');



export function formatWriter(text, charline = 33) {
  let s = String(text);
  let charpos = 0;
  let remspace = -1;
  let aster = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '&') {
      charpos = 0;
      remspace = -1;

      if (aster && s[i + 1] !== '*') {
        s = `${s.slice(0, i + 1)}||${s.slice(i + 1)}`;
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
        s = `${s.slice(0, remspace)}&${s.slice(remspace + 1)}`;
        i = remspace;
        charpos = 1;
        remspace = -1;
        if (aster) {
          s = `${s.slice(0, i + 1)}||${s.slice(i + 1)}`;
          i += 2;
          charpos = 2;
        }
      } else {
        s = `${s.slice(0, i + 1)}&${s.slice(i + 1)}`;
        i += 1;
        charpos = 1;
        remspace = -1;
        if (aster) {
          s = `${s.slice(0, i + 1)}||${s.slice(i + 1)}`;
          i += 2;
          charpos = 2;
        }
      }
    }
  }
  return s;
}


export const FIRST_BALLOON_TURN = 6;

export function createDialogue() {
  return { balloonturn: 0, ballooncon: 0, text: null, speaker: null, timer: 0 };
}



export function advanceBalloon(dlg, state) {

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



export function revealed(text, timer, cps = CHARS_PER_FRAME) {
  const n = Math.floor(timer * cps);
  const lines = msgLines(text);
  let left = n;
  const out = [];
  for (const line of lines) {
    if (left <= 0) break;
    out.push(line.slice(0, left));
    left -= line.length;
  }
  return out;
}

export function dialogueDone(text, timer) {
  return Math.floor(timer * CHARS_PER_FRAME) >= msgLines(text).join('').length;
}



export function dialogueSkipTimer(text) {
  return Math.ceil(msgLines(text).join('').length / CHARS_PER_FRAME);
}



const SILENT_CHARS = new Set([' ', '^', '!', '.', '?', ',', ':', '/', '\\', '|', '*']);

export function textSoundChar(text, timer, cps = CHARS_PER_FRAME) {

  const s = msgLines(text).join('\n');
  const pos = Math.floor(timer * cps);
  if (pos < 1 || pos > s.length) return null;
  let ch = s[pos - 1];

  if ((ch === '&' || ch === '\n') && cps >= 0.5) ch = s[pos] ?? '';
  if (!ch || SILENT_CHARS.has(ch)) return null;
  return ch;
}



export const TV_VOICE_COUNT = 9;
