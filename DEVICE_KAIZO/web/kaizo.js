

import { createState, stepFrame } from '../sim/index.js';
import { drain } from '../sim/clock.js';
import {
  buildKaizoScene, KAIZO_NOTE, KAIZO_VERSIONS, kaizoEndingRouteFor,
} from '../kaizo/scenes/kaizo-fight.js';

import {
  createKaizoEpilogue, stepKaizoEpilogue, kaizoEpilogueReport,
} from './kaizo-epilogue.js';

import {
  resolveKaizoMusic, KAIZO_MUS_NAMES, CUE_ARRIVAL,
  openModeSelect, modeSelectChoicerUp, modeSelectChoose, modeSelectHintDone,
  modeSelectReady, modeSelectKnightMode,
  MODE_CHOICES_EN, CHOICE_RETURN, CHOICE_NOHIT,
} from './kaizo-prefight.js';
import { getSwordcolor } from '../kaizo/attacks/kaizo-colors.js';
import { decodeReplay } from '../sim/replay.js';
import {
  createTitle, stepTitle, MODES, CREDITS, creditLink, armUnused, partyTabs,
} from '../sim/modes.js';
import {
  loadProceed, saveProceed, weirdRouteTabs, weirdRouteGear,
  gearOverrideFromTabs, padLoadout, PROCEED_VERSION, PROCEED_SHATTER_SPRITE,
} from '../kaizo/ui/proceed.js';
import { encodeConfig, decodeConfig, NONE } from '../sim/share.js';
import { WEAPONS, ARMOR, canEquip } from '../sim/equipment.js';
import { ITEMS } from '../sim/items.js';
import { drawTitle, drawGameOver, stepGameOver, makeGameOver } from '../render/title.js';

import { kaizoGameOverOptions, gameOverOutcome } from './kaizo-gameover.js';
import { knightGameOverRestore } from '../kaizo/party/roster.js';

import { clearAllFreeze } from '../kaizo/party/freeze.js';
import { drawBackground } from '../render/background.js';
import { ATTACK_MENU } from '../sim/scenes/single.js';
import { bindKeyboard } from '../input/keyboard.js';
import { bindTouch } from '../input/touch.js';
import { bindGamepad } from '../input/gamepad.js';
import { createRenderer } from '../render/canvas.js';
import { createIntroScene, stepIntroScene } from '../sim/intro.js';
import { drawIntroScene } from '../render/draw/intro-fx.js';
import { createVictoryScene, stepVictoryScene } from '../sim/victory-scene.js';
import { drawVictoryScene } from '../render/draw/victory-scene.js';
import { createTvTurnoff, stepTvTurnoff } from '../sim/tvturnoff.js';
import { drawTvTurnoff } from '../render/draw/tvturnoff.js';
import { createAudio } from '../render/audio.js';
import { deltaruneMultiplier } from '../render/windowsize.js';
import { drainCues } from '../sim/audio.js';
import { resetTensionBar } from '../render/tensionbar.js';

import { KAIZO_DRAW_OVERRIDES } from '../kaizo/render/index.js';

import { KAIZO_SHATTER_OVERRIDE } from '../kaizo/ui/shatter-draw.js';

console.log(KAIZO_NOTE);

const canvas = document.getElementById('game');

function boot(msg) {
  console.log('[kaizo boot] ' + msg);
}
boot('loading sprites…');

const renderer = await createRenderer(canvas, {
  overrides: { ...KAIZO_DRAW_OVERRIDES, ...KAIZO_SHATTER_OVERRIDE },
});
const ctx = renderer.ctx;

async function loadKaizoOverlay(sprites) {
  const base = new URL('../kaizo/assets/sprites/', import.meta.url).href;
  let manifest;
  try {
    const res = await fetch(`${base}manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    console.warn(`kaizo sprite overlay not loaded (${err.message}) — `
      + 'kaizo-only sprites will draw from their collision masks. '
      + 'Build it with: node kaizo/tools/pack-kaizo-sprites.mjs');
    return 0;
  }
  const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  let added = 0;
  await Promise.all(Object.entries(manifest).map(async ([name, meta]) => {
    const frames = (await Promise.all(meta.files.map((f) => loadImage(base + f)))).filter(Boolean);
    if (!frames.length) return;
    sprites.set(name, { meta, frames });

    renderer.spriteFrames[name] = frames.length;
    renderer.spriteRate[name] = meta.playbacktype === 'FramesPerSecond'
      ? (meta.playback ?? 30) / 30
      : (meta.playback ?? 1);
    added += 1;
  }));
  return added;
}
boot('merging the kaizo overlay…');
const overlayCount = await loadKaizoOverlay(renderer.sprites);
console.log(`kaizo sprite overlay: ${overlayCount} sprites merged`);

let scalingMode = 'fit';

function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const availW = window.innerWidth * dpr;
  const availH = window.innerHeight * dpr;
  const fit = Math.min(availW / renderer.VIEW_W, availH / renderer.VIEW_H);
  let scale = fit;
  if (scalingMode === 'pixel' && fit >= 1) {

    const m = deltaruneMultiplier(
      window.screen?.width ?? window.innerWidth,
      window.screen?.height ?? window.innerHeight,
      renderer.VIEW_W,
      renderer.VIEW_H,
    );
    scale = Math.min(m * dpr, Math.floor(fit));
  }
  canvas.style.width = `${(renderer.VIEW_W * scale) / dpr}px`;
  canvas.style.height = `${(renderer.VIEW_H * scale) / dpr}px`;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

if (window.matchMedia) {
  const watchDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => { fitCanvas(); watchDpr(); }, { once: true });
  };
  watchDpr();
}

const keyboard = bindKeyboard(window);
const gamepad = bindGamepad();

let syncOpenedLink = null;
const touch = bindTouch({
  pad: document.getElementById('dpad'),
  buttons: [
    { el: document.getElementById('btnZ'), actions: ['confirm'] },
    { el: document.getElementById('btnX'), actions: ['focus', 'cancel'] },
    { el: document.getElementById('btnR'), actions: ['reset'] },
  ],
  onReset: () => reset(),
  onExit: () => exitRun(),

  onAction: (a) => {
    if (a !== 'confirm' || title.mode !== null) return;
    const s = title.settings;
    if (!s || s.page !== 'credits') return;
    const href = creditLink(CREDITS[s.cursor] ?? {});
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
    syncOpenedLink = href;
  },
});

const keys = {
  read() {
    const k = keyboard.read();
    const g = gamepad.read();
    const t = touch.read();
    for (const a of Object.keys(g)) if (g[a]) k[a] = true;
    for (const a of Object.keys(t)) if (t[a]) k[a] = true;
    return k;
  },
};

const params = new URLSearchParams(location.search);

const explicitVersion = params.get('v');
let versionId = KAIZO_VERSIONS[(explicitVersion ?? 'C').toUpperCase()]
  ? (explicitVersion ?? 'C').toUpperCase()
  : 'C';

let weirdRoute = false;
function enterWeirdRoute() {
  weirdRoute = true;
  versionId = PROCEED_VERSION;
  title.party = weirdRouteTabs();
  title.gear = savedProceed.gear ?? weirdRouteGear();
}

let modeSelect = null;

let knightModeName;

function build(st) {

  buildKaizoScene(st, {
    version: versionId,
    gear: weirdRoute ? gearOverrideFromTabs(title.party, title.gear) : undefined,

    mode: knightModeName,
  });
}

function loadoutGear() {
  return weirdRoute
    ? padLoadout(title.gear)
    : title.gear.map((g) => ({ weapon: g.weapon, armor: [...g.armor] }));
}

const replayToken = params.get('replay');
let replay = null;
if (replayToken) {
  try {
    replay = decodeReplay(replayToken);
    if (replay.meta.mode === 'practice') {

      console.error('bad replay token: a SINGLE-attack run; this page has no kaizo attack table');
      replay = null;
    }
  } catch (err) {
    console.error(`bad replay token: ${err.message}`);
  }
}

boot('building the title…');
const title = createTitle();

const SETTINGS_KEY = 'knightsim.settings';
const KAIZO_SETTINGS_KEY = 'kaizoknight.settings';

let kaizoPracticeSaved = 0;
try {

  const saved = JSON.parse(
    localStorage.getItem(KAIZO_SETTINGS_KEY) ?? localStorage.getItem(SETTINGS_KEY) ?? 'null',
  );
  if (saved?.gear?.length === 3) {
    title.gear = saved.gear.map((g) => ({ weapon: g.weapon | 0, armor: (g.armor ?? []).map((a) => a | 0) }));
  }
  if (Array.isArray(saved?.bag)) {

    const bag = saved.bag.map((v) => v | 0).slice(0, 12);
    while (bag.length < 12) bag.push(0);
    title.bag = bag;
  }

  if (saved?.volumes && (saved.v | 0) >= 1) {
    title.volumes.music = Math.max(0, Math.min(100, saved.volumes.music | 0));
    title.volumes.sfx = Math.max(0, Math.min(100, saved.volumes.sfx | 0));
  }
  if (typeof saved?.shake === 'boolean') title.shake = saved.shake;
  if (saved?.scaling === 'fit' || saved?.scaling === 'pixel') title.scaling = saved.scaling;

  if (typeof saved?.swapZX === 'boolean') title.swapZX = saved.swapZX;

  if (saved?.prac) kaizoPracticeSaved = 1;
} catch {   }

const kaizoPractice = params.get('prac') !== null
  ? (params.get('prac') !== '0' ? 1 : 0)
  : kaizoPracticeSaved;

const savedProceed = loadProceed();
armUnused(title, { ...savedProceed, sprite: PROCEED_SHATTER_SPRITE });
if (title.unused.taken && !explicitVersion) enterWeirdRoute();

async function probeMusFiles() {
  const names = new Set();
  let manifest = {};
  try {
    const r = await fetch(new URL('../assets/audio/index.json', import.meta.url).href);
    if (r.ok) {
      const list = await r.json();

      if (Array.isArray(list)) {
        for (const n of list) { names.add(`${n}.ogg`); manifest[n] = `${n}.ogg`; }
      } else if (list && typeof list === 'object') {
        manifest = list;
        for (const v of Object.values(list)) names.add(v);
      }
    }
  } catch {   }
  await Promise.all(KAIZO_MUS_NAMES.map(async (n) => {
    try {
      const r = await fetch(new URL(`../kaizo/assets/audio/${n}`, import.meta.url).href,
        { method: 'HEAD' });
      if (r.ok) names.add(n);
    } catch {   }
  }));
  return { names, manifest };
}
boot('routing the music…');
const { names: musFiles, manifest: baseAudioManifest } = await probeMusFiles();

const kaizoMusic = resolveKaizoMusic({
  musFiles,
  baseManifest: baseAudioManifest,
  flag456: versionId === PROCEED_VERSION,
  kaizoDirUrl: new URL('../kaizo/assets/audio/', import.meta.url).href,
});

console.log(`[kaizo] kaizo_set_music("knight.ogg") -> ${kaizoMusic.fight.verdict}`
  + ` (playing ${kaizoMusic.fight.file ?? 'nothing'})`);
console.log(`[kaizo] kaizo_set_music("knight_appears.ogg") -> ${kaizoMusic.arrival.verdict}`);
if (kaizoMusic.fight.deviation) console.log(`[kaizo] ${kaizoMusic.fight.deviation}`);
const audio = createAudio({ overrides: kaizoMusic.overrides });

boot(`version ${versionId} — ${KAIZO_VERSIONS[versionId].name}`);
if (KAIZO_VERSIONS[versionId].note) console.log(KAIZO_VERSIONS[versionId].note);

const sharedCfg = decodeConfig(params.get('cfg'), {
  weaponOk: (id, c) => id === 0 || (!!WEAPONS[id] && canEquip('weapon', id, c)),
  armorOk: (id, c) => id === 0 || (!!ARMOR[id] && canEquip('armor', id, c)),
  itemOk: (id) => !!ITEMS[id],
  modeCount: MODES.length,
  attackCount: ATTACK_MENU.length,
});
if (sharedCfg) {

  if (sharedCfg.gear && !weirdRoute) title.gear = sharedCfg.gear;
  if (sharedCfg.bag) title.bag = sharedCfg.bag;

  if (sharedCfg.attack !== null) title.attackIndex = sharedCfg.attack;
  if (sharedCfg.difficulty !== null) {
    const entry = ATTACK_MENU[title.attackIndex];

    const di = Math.min(sharedCfg.difficulty, entry.difficulties.length - 1);
    title.difficultyIndex = Math.max(0, di);
  }

  if (sharedCfg.mode !== null && MODES[sharedCfg.mode].id !== 'single') {
    title.mode = MODES[sharedCfg.mode].id;
  }
}

let state = createState({
  seed: replay ? replay.meta.seed : Number(params.get('seed') ?? 12345),
  traceBulletSlots: 0,

  bag: title.bag,
});
state.spriteFrames = renderer.spriteFrames;
state.spriteRate = renderer.spriteRate;

state.loadout.gear = loadoutGear();
build(state);

const skip = Number(params.get('frames') ?? (replay ? replay.frames : 0));
if (skip > 0) {
  const idle = keys.read();

  for (let i = 0; i < skip; i++) {
    stepFrame(state, replay ? replay.inputAt(i) : idle);
  }
}

let acc = 0;
let last = performance.now();

let inputMask = {};
function gatedKeys() {
  const raw = keys.read();
  const out = { ...raw };
  for (const k of Object.keys(inputMask)) {
    if (!raw[k]) delete inputMask[k];
    else out[k] = false;
  }
  return out;
}

function maskHeldInput() {
  inputMask = {};
  const raw = keys.read();
  for (const k of Object.keys(raw)) if (raw[k]) inputMask[k] = true;
}

function reset() {

  audio.stopAll();

  maskHeldInput();

  resetTensionBar();

  const vistaFs = state?.vistaFsBase ?? 0;
  state = createState({
    seed: (Math.floor(performance.now()) % 100000) + 1,
    traceBulletSlots: 0,

    bag: title.bag,
  });

  state.runMode = runMode;
  state.vistaFsBase = vistaFs;

  state.loadout.gear = loadoutGear();

  state.flag12 = title.shake ? 0 : 1;
  state.spriteFrames = renderer.spriteFrames;
  state.spriteRate = renderer.spriteRate;
  build(state);
  acc = 0;
}

function exitRun() {

  if (modeSelect) hideModeSelect();
  if (title.mode === null) return;
  over = null;
  introSeq = null;
  cutsceneSeq = null;

  epilogueSeq = null;
  tvOff = null;
  title.mode = null;
  title.pickingAttack = false;
  title.pickingDifficulty = false;
  reset();
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyR') reset();
  if (e.code === 'Escape') exitRun();
});

function applySettings() {
  audio.setVolumes(title.volumes.music / 100, title.volumes.sfx / 100);

  state.flag12 = title.shake ? 0 : 1;
  if (scalingMode !== title.scaling) {
    scalingMode = title.scaling;
    fitCanvas();
  }

  document.getElementById('touch')?.classList.toggle('swap', title.swapZX);
}

function persistSettings() {
  try {
    localStorage.setItem(KAIZO_SETTINGS_KEY, JSON.stringify({
      v: 1,

      ...(weirdRoute ? {} : { gear: title.gear }),
      bag: title.bag,
      volumes: title.volumes,
      shake: title.shake,
      scaling: title.scaling,
      swapZX: title.swapZX,

      prac: kaizoPractice,
    }));
  } catch {   }

  saveProceed(title.unused, weirdRoute ? title.gear : (savedProceed.gear ?? null));
  applySettings();
}

if (sharedCfg) applySettings(); else persistSettings();

const deepMode = params.get('mode');
if (replay || (deepMode && deepMode !== 'practice')) title.mode = 'normal';

if (skip > 0) title.mode = 'normal';

function shareUrl() {
  const modeIndex = title.mode ? MODES.findIndex((m) => m.id === title.mode) : NONE;
  const cfg = encodeConfig({
    mode: modeIndex < 0 ? NONE : modeIndex,
    attack: title.attackIndex,
    difficulty: title.difficultyIndex,
    gear: title.gear,
    bag: title.bag,
  });
  const url = new URL(location.href);

  url.search = '';
  url.searchParams.set('cfg', cfg);
  return url.toString();
}

function shareSetup() {
  const url = shareUrl();
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {   }
    ta.remove();
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).catch(fallback);
  } else {
    fallback();
  }
}

const KAIZO_WORDMARK = () => [
  ['KAIZO', getSwordcolor(state)],
  [' KNIGHT SIMULATOR', [255, 255, 255]],
];

let over = null;

let tvOff = null;

let cutsceneSeq = null;

let epilogueSeq = null;

let hitlessDeaths = 0;

let introSeq = null;

const modeSelectEl = document.getElementById('modeselect');
const modeSelectRowsEl = document.getElementById('modeselect-rows');
const modeSelectMsgEl = document.getElementById('modeselect-msg');

function hideModeSelect() {
  modeSelect = null;
  if (modeSelectEl) modeSelectEl.hidden = true;
  if (modeSelectRowsEl) modeSelectRowsEl.replaceChildren();
  if (modeSelectMsgEl) modeSelectMsgEl.textContent = '';
}

function modeSelectReturn() {
  hideModeSelect();
  title.mode = null;
  audio.play([{ name: 'snd_select', pitch: 1, gain: 1 }]);
}

function renderModeSelectRows() {
  if (!modeSelectRowsEl) return;
  modeSelectRowsEl.replaceChildren();
  MODE_CHOICES_EN.forEach((label, choice) => {
    const b = document.createElement('button');
    b.type = 'button';

    b.textContent = label.replace(/^\n+/, '');
    b.addEventListener('click', () => chooseMode(choice));
    modeSelectRowsEl.append(b);
  });
  if (modeSelectMsgEl) modeSelectMsgEl.textContent = '';
}

function chooseMode(choice) {
  if (!modeSelect) return;
  audio.play([{ name: 'snd_select', pitch: 1, gain: 1 }]);
  modeSelectChoose(modeSelect, choice);
  if (choice === CHOICE_RETURN) { modeSelectReturn(); return; }
  if (choice === CHOICE_NOHIT) {

    if (modeSelectRowsEl) modeSelectRowsEl.replaceChildren();
    if (modeSelectMsgEl) modeSelectMsgEl.textContent = modeSelect.w.msg[0].replace('/%', '');
    if (modeSelectRowsEl) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'OK';
      b.addEventListener('click', () => {
        modeSelectHintDone(modeSelect);
        finishModeSelect();
      });
      modeSelectRowsEl.append(b);
    }
    return;
  }
  finishModeSelect();
}

function finishModeSelect() {
  if (!modeSelect || !modeSelectReady(modeSelect.pf)) return;
  knightModeName = modeSelectKnightMode(modeSelect);
  console.log(`[kaizo] global.knight_mode = ${modeSelect.w.knight_mode} (${knightModeName})`);
  hideModeSelect();
  startRun();
}

function beginRun() {
  modeSelect = openModeSelect({
    kaizoPractice,
    flag456: versionId === PROCEED_VERSION,
  });
  if (modeSelectReady(modeSelect.pf)) { finishModeSelect(); return; }

  modeSelectChoicerUp(modeSelect);
  renderModeSelectRows();
  if (modeSelectEl) modeSelectEl.hidden = false;
}

function startRun() {
  runMode = title.mode;

  if (runMode === 'normal' || runMode === 'hitless') {
    introSeq = createIntroScene();

    maskHeldInput();
  }

  state.runMode = runMode;
  reset();
}

let runMode = title.mode ?? 'normal';

function frame(now) {
  lastFrameRun = now;
  const elapsed = now - last;
  last = now;

  if (modeSelect) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
    drawBackground(ctx, state, renderer.sprites);
    drawTitle(ctx, title, renderer.sprites, ATTACK_MENU, { title: KAIZO_WORDMARK() });
    requestAnimationFrame(frame);
    return;
  }

  {
    const pe = gamepad.driverEdges();
    if (pe.reset) reset();
    if (pe.exit) exitRun();
  }

  if (!title.mode) {
    const { steps: ts, accumulator: ta } = drain(acc, elapsed);
    acc = ta;
    for (let i = 0; i < ts; i++) {
      const r = stepTitle(title, gatedKeys(), ATTACK_MENU);
      if (r.moved) audio.play([{ name: 'snd_menumove', pitch: 1, gain: 1 }]);
      if (r.selected) audio.play([{ name: 'snd_select', pitch: 1, gain: 1 }]);

      if (r.error) audio.play([{ name: 'snd_error', pitch: 1, gain: 1 }]);

      if (r.link) {

        if (r.link === syncOpenedLink) syncOpenedLink = null;
        else window.open(r.link, '_blank', 'noopener,noreferrer');
      }

      if (r.share) shareSetup();

      if (r.press) saveProceed(title.unused, weirdRoute ? title.gear : (savedProceed.gear ?? null));

      if (r.shatter) {
        audio.play([
          { name: 'snd_glassbreak', pitch: 0.5, gain: 1 },
          { name: 'snd_glassbreak', pitch: 0.44, gain: 1 },
        ]);
      }

      if (r.proceed && !weirdRoute) {
        enterWeirdRoute();
        saveProceed(title.unused, title.gear);
        console.log(`[kaizo] PROCEED — version ${versionId}: `
          + `${KAIZO_VERSIONS[versionId].name}`);

        reset();
      }
      if (title.dirty) {
        title.dirty = false;
        persistSettings();
      }
      if (r.chosen) {

        if (title.mode === 'single') {
          title.mode = null;
          audio.play([{ name: 'snd_error', pitch: 1, gain: 1 }]);
        } else {

          beginRun();
        }
        break;
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
    drawBackground(ctx, state, renderer.sprites);
    drawTitle(ctx, title, renderer.sprites, ATTACK_MENU, { title: KAIZO_WORDMARK() });
    requestAnimationFrame(frame);
    return;
  }

  if (introSeq && !introSeq.done) {

    if (!introSeq.musicStarted && kaizoMusic.arrival.playable) {
      introSeq.musicStarted = true;
      audio.play([{ name: CUE_ARRIVAL, pitch: 1, gain: 1, loop: true }]);
    }
    const { steps: is, accumulator: ia } = drain(acc, elapsed);
    acc = ia;
    for (let i = 0; i < is; i++) {
      const input = gatedKeys();
      if (input.confirm || input.cancel) {
        introSeq.done = true;

        maskHeldInput();
        break;
      }
      const cues = [];
      stepIntroScene(introSeq, cues);
      if (cues.length) audio.play(cues);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);

    drawBackground(ctx, state, renderer.sprites);
    drawIntroScene(ctx, introSeq, renderer.sprites);
    if (introSeq.done) {

      state.vistaFsBase = introSeq.bg.fountain_speed;

      audio.stopLoop(CUE_ARRIVAL);
      introSeq = null;
      maskHeldInput();
    }
    requestAnimationFrame(frame);
    return;
  }

  if (epilogueSeq) {
    const { steps: es, accumulator: ea } = drain(acc, elapsed);
    acc = ea;
    for (let i = 0; i < es; i++) {
      const input = gatedKeys();
      if (input.cancel) { epilogueSeq.done = true; break; }

      const cues = stepKaizoEpilogue(epilogueSeq, input);
      if (cues.length) audio.play(cues);
      if (epilogueSeq.done) break;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
    drawBackground(ctx, state, renderer.sprites);

    const white = Math.max(0, 1 - epilogueSeq.t / 20);
    if (white > 0) {
      ctx.globalAlpha = white;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (epilogueSeq.done) {

      console.log('[kaizo] epilogue terminal —', JSON.stringify(kaizoEpilogueReport(epilogueSeq)));
      audio.stopLoop('wind_highplace');
      audio.stopLoop('board_ocean');
      epilogueSeq = null;
      maskHeldInput();
      tvOff = createTvTurnoff();
    }
    requestAnimationFrame(frame);
    return;
  }

  if (cutsceneSeq) {
    const { steps: cs, accumulator: ca } = drain(acc, elapsed);
    acc = ca;
    for (let i = 0; i < cs; i++) {
      const input = gatedKeys();
      if (input.cancel) {
        cutsceneSeq.done = true;
      }
      const cues = [];
      stepVictoryScene(cutsceneSeq, input, cues);

      for (const c of cues) {
        if (!c.music) continue;
        if (c.music === 'wind') {
          audio.play([{ name: 'wind_highplace', pitch: 0.5, gain: 1, loop: true }]);
        } else if (c.music === 'stop') {
          audio.stopLoop('wind_highplace');
        }
      }
      const sound = cues.filter((c) => !c.music);
      if (sound.length) audio.play(sound);
      if (cutsceneSeq.done) break;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
    drawBackground(ctx, state, renderer.sprites);
    if (!cutsceneSeq.done) {
      drawVictoryScene(ctx, cutsceneSeq, renderer.sprites);

      const white = Math.max(0, 1 - cutsceneSeq.t / 20);
      if (white > 0) {
        ctx.globalAlpha = white;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, renderer.VIEW_W, renderer.VIEW_H);
        ctx.globalAlpha = 1;
      }
    } else {

      cutsceneSeq = null;
      maskHeldInput();
      tvOff = createTvTurnoff();
    }
    requestAnimationFrame(frame);
    return;
  }

  if (tvOff) {
    const { steps: ts2, accumulator: ta2 } = drain(acc, elapsed);
    acc = ta2;
    for (let i = 0; i < ts2; i++) {
      const cues = [];
      stepTvTurnoff(tvOff, cues);
      for (const c of cues) {
        if (c.stop) audio.stopLoop(c.name);
        else audio.play([c]);
      }
      if (tvOff.done) break;
    }
    drawTvTurnoff(ctx, tvOff, renderer.sprites);

    if (tvOff.done) exitRun();
    requestAnimationFrame(frame);
    return;
  }

  if (over) {
    const { steps: gs, accumulator: ga } = drain(acc, elapsed);
    acc = ga;
    for (let i = 0; i < gs; i++) {
      const r = stepGameOver(over, gatedKeys());
      if (r.moved) audio.play([{ name: 'snd_menumove', pitch: 1, gain: 1 }]);

      if (r.chosen !== undefined) {
        audio.play([{ name: 'snd_select', pitch: 1, gain: 1 }]);
        audio.stopLoop('audio_drone');
        over = null;

        const outcome = gameOverOutcome(r.con);

        for (const charId of knightGameOverRestore(r.con).getchar) {
          if (!title.party) continue;
          if (title.party.some((t) => (t.charId ?? t.char + 1) === charId)) continue;
          const tab = partyTabs(null).find((t) => (t.charId ?? t.char + 1) === charId);
          if (tab) title.party.push(tab);
        }
        if (outcome === 'retry') {

          reset();
        } else {

          exitRun();
        }
        break;
      }
    }
    renderer.draw(state);
    if (over) drawGameOver(ctx, over, renderer.sprites);
    requestAnimationFrame(frame);
    return;
  }

  {
    const { steps, accumulator } = drain(acc, elapsed);
    acc = accumulator;
    for (let i = 0; i < steps; i++) {
      const input = gatedKeys();

      const hpBefore = state.partyHp[0] + state.partyHp[1] + state.partyHp[2];
      const caughtBefore = state.soul?.alive && state.soul.image_alpha === 0;
      stepFrame(state, input);
      audio.play(drainCues(state));

      if (!tvOff && !cutsceneSeq && !epilogueSeq && (state.endFade ?? 0) >= 1) {
        maskHeldInput();
        if (kaizoEndingRouteFor(state) === 'bside') {
          epilogueSeq = createKaizoEpilogue(state);
          console.log('[kaizo] B-SIDE EPILOGUE — con '
            + `${epilogueSeq.con} (${epilogueSeq.route}); the A-Side knighting is NOT played. `
            + 'It runs and sounds; its visuals are unpainted (G-15).');
        } else {
          cutsceneSeq = createVictoryScene();
        }
      }

      const hpNow = state.partyHp[0] + state.partyHp[1] + state.partyHp[2];
      const caughtNow = state.soul?.alive && state.soul.image_alpha === 0;
      if (runMode === 'hitless' && (hpNow < hpBefore || (caughtNow && !caughtBefore))) {
        hitlessDeaths += 1;
        reset();
        break;
      }

      if (state.knight?.endcon === 2 && state.kaizo && !state.kaizo.freezeSwept) {
        state.kaizo.freezeSwept = true;
        clearAllFreeze(state);
      }

      if (state.gameOver || state.kaizo?.finalFailure) {
        if (runMode === 'endless' || runMode === 'hitless') {
          reset();
        } else {

          const scripted = !!state.kaizo?.finalFailure;
          audio.stopAll();
          if (!scripted) audio.play([{ name: 'snd_hurt1', pitch: 1, gain: 1 }]);
          renderer.draw(state);
          const shot = document.createElement('canvas');
          shot.width = renderer.VIEW_W;
          shot.height = renderer.VIEW_H;
          shot.getContext('2d').drawImage(canvas, 0, 0);

          maskHeldInput();

          audio.stopLoop('mus_knight');
          audio.play([{ name: 'audio_drone', pitch: 1, gain: 1, loop: true }]);

          over = makeGameOver(
            shot,
            (state.soul?.x ?? renderer.VIEW_W / 2) + 2 - (state.view?.x ?? 0),
            (state.soul?.y ?? 170) + 2 - (state.view?.y ?? 0),
            kaizoGameOverOptions({
              sideb: !!state.kaizo?.sideb,
              finalFailure: !!state.kaizo?.finalFailure,
            }),
          );
        }
        break;
      }
    }
  }

  renderer.draw(state);

  requestAnimationFrame(frame);
}

let lastFrameRun = performance.now();
boot('starting…');
requestAnimationFrame(frame);

let rafTick = performance.now();
const rafProbe = () => { rafTick = performance.now(); requestAnimationFrame(rafProbe); };
requestAnimationFrame(rafProbe);
let fallback = null;
setInterval(() => {
  const stale = performance.now() - rafTick > 500;
  const visible = document.visibilityState === 'visible';
  if (stale && visible && !fallback) {
    fallback = setInterval(() => frame(performance.now()), 33);
  } else if (!stale && fallback) {
    clearInterval(fallback);
    fallback = null;
  }
}, 250);

const swOff = params.has('nosw');
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !swOff) {

  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url)).catch(() => {});
} else if ('serviceWorker' in navigator && swOff) {
  navigator.serviceWorker.getRegistrations()
    .then((rs) => Promise.all(rs.map((r) => r.unregister())))
    .then(() => caches.keys())
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('kaizoknight-')).map((k) => caches.delete(k))))
    .then(() => console.log('[kaizo] ?nosw — service worker unregistered and its caches dropped'))
    .catch(() => {});
}
