


import { ACTION_DEFEND, TP_DEFEND, isUp, PARTY } from './damage.js';
import { scrTensionheal } from './tension.js';
import { cue } from './audio.js';
import { useItem, takeItem, applyItem, ITEMS } from './items.js';
import {
  spellInfo, spellListFor, actsFor, canAfford, spellCost, castSpell, holdBreath,
} from './spells.js';
import {
  FACE_IDLE, FACE_ATTACK, FACE_SPELL, FACE_ITEM, FACE_DEFEND, FACE_ACT,
  HERO_SPELL, HERO_ITEM, HERO_ACT, heroAct,
} from './heroes.js';
import { ACT_PAGES } from './dialogue.js';


const MENU_KEYS = ['left', 'right', 'up', 'down', 'confirm', 'cancel', 'focus', 'button3'];





function recordItem(state, c, slot, target) {

  const id = takeItem(state, slot, bagOf(state));
  if (id === null) return null;
  state.charaction[c] = 4;


  if (ITEMS[id]?.kind === 'tension') {
    applyItem(state, id, target);
    return ITEMS[id]?.name ?? 'Item';
  }

  state.pendingItem = state.pendingItem ?? [];
  state.pendingItem[c] = { id, target };
  return ITEMS[id]?.name ?? 'Item';
}

function recordSpell(state, c, id, target) {
  const cost = spellCost(state, c, id);
  if (state.tension < cost) return null;
  state.tension -= cost;
  state.charaction[c] = 2;
  state.pendingSpell = state.pendingSpell ?? [];
  state.pendingSpell[c] = { id, target };
  return `${spellInfo(state, id).name}!`;
}


function setFace(state, c, face) {
  const h = state.heroes?.[c];
  if (h) h.faceaction = face;
}



export const CHAR_COLOR = [
  [0, 255, 255],
  [255, 0, 255],
  [0, 255, 0],
];



export const BUTTONS = [
  { x: 15, sprite: () => 'spr_btfight', name: 'FIGHT' },

  { x: 50, sprite: (c) => (c === 0 ? 'spr_btact' : 'spr_bttech'), name: (c) => (c === 0 ? 'ACT' : 'MAGIC') },
  { x: 85, sprite: () => 'spr_btitem', name: 'ITEM' },
  { x: 120, sprite: () => 'spr_btspare', name: 'SPARE' },
  { x: 155, sprite: () => 'spr_btdefend', name: 'DEFEND' },
];



export const PARTY_SPRITES = [
  { head: 'spr_headkris', name: 'spr_bnamekris' },
  { head: 'spr_headsusie', name: 'spr_bnamesusie' },
  { head: 'spr_headralsei', name: 'spr_bnameralsei' },
];

export function createMenu() {
  return {
    open: false,

    charturn: 0,

    selected: [0, 0, 0],

    mmy: [0, 0, 0],

    siner: 0,

    held: {},


    onebuffer: 0,
    twobuffer: 0,

    justClosed: false,

    needsCommit: false,


    submenu: null,
    itemIndex: 0,


    tempitem: [[], [], []],

    temptension: [0, 0, 0],

    gridIndex: 0,

    pending: null,

    targetIndex: 0,

    lastItem: null,

    fight: [false, false, false],
  };
}



function slide(menu, c, raised) {
  if (raised) {
    if (menu.mmy[c] > -32) menu.mmy[c] -= 2;
    if (menu.mmy[c] > -24) menu.mmy[c] -= 4;
    if (menu.mmy[c] > -16) menu.mmy[c] -= 6;
    if (menu.mmy[c] > -8) menu.mmy[c] -= 8;

    if (menu.mmy[c] < -32) menu.mmy[c] = -64;
  } else if (menu.mmy[c] < -14) {
    menu.mmy[c] += 15;
  } else {
    menu.mmy[c] = 0;
  }
}


export function bagOf(state) {
  return state.menu.tempitem[state.menu.charturn] ?? state.inventory;
}



function nextHero(menu, state) {
  const prev = menu.charturn;
  menu.charturn += 1;
  if (menu.charturn > 2) return;
  menu.tempitem[menu.charturn] = [...menu.tempitem[prev]];
  menu.temptension[menu.charturn] = state.tension;
}



function prevHero(menu, state) {
  if (menu.charturn <= 0) return false;

  const from = menu.charturn;
  let to = -1;
  if (from === 1) {
    if (isUp(state, 0)) to = 0;
  } else if (from === 2) {
    if (isUp(state, 1)) to = 1;
    else if (isUp(state, 0)) to = 0;
  }
  if (to < 0) return false;
  menu.charturn = to;
  const c = menu.charturn;
  state.tension = menu.temptension[c] ?? state.tension;
  menu.tempitem[c] = c === 0 ? [...state.inventory] : [...menu.tempitem[c - 1]];
  state.charaction[c] = 0;

  if (state.pendingSpell) state.pendingSpell[c] = null;
  if (state.pendingItem) state.pendingItem[c] = null;
  if (state.pendingAct?.c === c) state.pendingAct = null;

  setFace(state, c, FACE_IDLE);
  menu.fight[c] = false;
  menu.submenu = null;
  menu.pending = null;
  return true;
}



export function endTurnItems(state) {
  const menu = state.menu;
  const last = Math.min(menu.charturn, 2);
  state.inventory = [...(menu.tempitem[last] ?? state.inventory)];
  for (let i = 0; i < 3; i++) menu.tempitem[i] = [...state.inventory];
  for (let i = 0; i < 3; i++) menu.temptension[i] = state.tension;
}



export function listRows(state) {
  const menu = state.menu;
  const c = menu.charturn;
  if (menu.submenu === 'item') {
    return bagOf(state).map((id) => {
      const it = ITEMS[id];
      return { label: it?.name ?? '', descb: it?.desc ?? '', id, usable: true };
    });
  }
  if (menu.submenu === 'magic') {

    return (spellListFor(state, c) ?? []).map((id) => ({
      label: spellInfo(state, id).name,
      descb: spellInfo(state, id).descb,
      id,

      usable: canAfford(state, id, c),
    }));
  }
  if (menu.submenu === 'actgrid') {

    return (actsFor(state, c) ?? [])
      .map((a, i) => ({
        label: a.name, descb: a.descb, id: i, usable: a.usable ?? true, cost: a.cost ?? 0,
      }))
      .filter(() => !(c === 1 && state.actCounts?.susieUsed));
  }
  return [];
}



export function stepMenu(state, input) {
  const menu = state.menu;
  menu.justClosed = false;
  menu.siner += 2;


  const wasOne = menu.onebuffer;
  const wasTwo = menu.twobuffer;
  menu.onebuffer = (menu.onebuffer ?? 0) - 1;
  menu.twobuffer = (menu.twobuffer ?? 0) - 1;
  void wasOne; void wasTwo;

  for (let c = 0; c < 3; c++) slide(menu, c, menu.open && menu.charturn === c);

  if (!menu.open) {

    menu.onebuffer = (menu.onebuffer ?? 0) - 1;
    menu.twobuffer = (menu.twobuffer ?? 0) - 1;
    return false;
  }


  const edges = {};
  for (const k of MENU_KEYS) {
    const down = !!input[k];
    edges[k] = down && !menu.held[k];
    menu.held[k] = down;
  }
  const rawPressed = (k) => edges[k] ?? false;


  const confirmEdge = rawPressed('confirm');
  const cancelEdge = rawPressed('cancel');
  let confirmFired = null;
  let cancelFired = null;
  const evalConfirm = () => {
    if (confirmFired === null) {

      const gate = menu.submenu ? menu.onebuffer : menu.twobuffer;
      confirmFired = confirmEdge && gate < 0;

      if (confirmFired) menu.onebuffer = 1;
    }
    return confirmFired;
  };
  const evalCancel = () => {
    if (cancelFired === null) {
      cancelFired = cancelEdge && menu.onebuffer < 0;
      if (cancelFired) menu.twobuffer = 1;
    }
    return cancelFired;
  };

  let confirmLeft = null;
  let cancelLeft = null;
  const pressed = (k) => {
    if (k === 'confirm') {
      if (confirmLeft === false) return false;
      confirmLeft = false;
      return evalConfirm();
    }
    if (k === 'cancel') {
      if (cancelLeft === false) return false;
      cancelLeft = false;
      return evalCancel();
    }
    return rawPressed(k);
  };


  let moveNoise = false;
  let selNoise = false;

  const c = menu.charturn;


  if (menu.submenu === 'target') {

    if (pressed('up') || pressed('left')) {
      menu.targetIndex = (menu.targetIndex + 2) % 3;
      moveNoise = true;
    }
    if (pressed('down') || pressed('right')) {
      menu.targetIndex = (menu.targetIndex + 1) % 3;
      moveNoise = true;
    }
    if (pressed('cancel')) {

      menu.submenu = menu.pending?.from ?? 'item';
      menu.pending = null;
      moveNoise = true;
    } else if (pressed('confirm')) {
      const p = menu.pending;
      const t = menu.targetIndex;
      let did = null;
      if (p?.kind === 'item') {

        const nm = recordItem(state, c, p.slot, t);
        did = nm ? `${nm}!` : null;
      } else if (p?.kind === 'spell') {
        did = recordSpell(state, c, p.id, t);
      }
      if (did) {
        menu.lastItem = did;

        menu.pending = null;
        menu.submenu = null;
        state.charaction[c] = 0;
        cue(state, 'snd_select');
        nextHero(menu, state);
        if (!skipFallen(state)) {
          menu.charturn = 0;
          menu.open = false;
          menu.justClosed = true;
          menu.needsCommit = true;
          return true;
        }
      } else {
        cue(state, 'snd_error');
      }
    }
    if (moveNoise) cue(state, 'snd_menumove');
    return false;
  }


  if (menu.submenu === 'enemy') {
    if (pressed('cancel')) {
      menu.submenu = null;
      setFace(state, c, FACE_IDLE);
      moveNoise = true;
    } else if (pressed('confirm')) {
      menu.submenu = null;
      menu.fight[c] = true;

      state.charaction[c] = 1;

      cue(state, 'snd_select');
      nextHero(menu, state);
      if (!skipFallen(state)) {
        menu.charturn = 0;
        menu.open = false;
        menu.justClosed = true;
        menu.needsCommit = true;
        return true;
      }
    }
    if (moveNoise) cue(state, 'snd_menumove');
    return false;
  }


  if (menu.submenu === 'actpick') {
    if (pressed('cancel')) {
      menu.submenu = null;
      setFace(state, c, FACE_IDLE);
      moveNoise = true;
    } else if (pressed('confirm')) {

      menu.submenu = 'actgrid';
      menu.gridIndex = 0;
      menu.itemIndex = 0;
      cue(state, 'snd_select');
    }
    if (moveNoise) cue(state, 'snd_menumove');
    return false;
  }


  if (menu.submenu === 'item' || menu.submenu === 'magic' || menu.submenu === 'actgrid') {
    const rows = listRows(state);
    const n = rows.length;
    if (n === 0) {
      menu.submenu = null;
    } else {

      const filled = (i) => i >= 0 && i < n;
      const coord = menu.gridIndex;


      if (pressed('left') || pressed('right')) {
        const other = coord % 2 === 0 ? coord + 1 : coord - 1;
        if (filled(other)) {
          menu.gridIndex = other;
          moveNoise = true;
        }
      }
      if (pressed('down')) {
        if (coord < 10 && filled(coord + 2)) {
          menu.gridIndex = coord + 2;
          moveNoise = true;
        } else if (coord === 5 && filled(6) && !filled(7)) {
          menu.gridIndex = 6;
          moveNoise = true;
        }
      }
      if (pressed('up') && coord > 1) {
        menu.gridIndex = coord - 2;
        moveNoise = true;
      }
      while (menu.gridIndex > 0 && !filled(menu.gridIndex)) menu.gridIndex -= 1;
      menu.itemIndex = menu.gridIndex;


      const gridConfirm = pressed('confirm');
      if (!gridConfirm && pressed('cancel')) {

        menu.submenu = null;
        menu.gridIndex = 0;
        moveNoise = true;
      } else if (gridConfirm) {
        const row = rows[menu.gridIndex];
        if (!row || !row.usable) {
          cue(state, 'snd_error');
        } else if (menu.submenu === 'actgrid') {


          state.pendingAct = { c, act: row.id };

          if (row.cost > 0) state.tension -= row.cost;
          menu.submenu = null;

          heroAct(state, c, HERO_ACT);
          selNoise = true;
          nextHero(menu, state);
          if (!skipFallen(state)) {
            menu.charturn = 0;
            menu.open = false;
            menu.justClosed = true;
            menu.needsCommit = true;
            return true;
          }
        } else {

          const needsTarget = menu.submenu === 'magic'
            ? spellInfo(state, row.id)?.target === 1
            : ITEMS[row.id]?.target === 'one';
          if (needsTarget) {
            menu.pending = menu.submenu === 'magic'
              ? { kind: 'spell', id: row.id, from: 'magic' }
              : { kind: 'item', slot: menu.gridIndex, from: 'item' };

            menu.targetIndex = c;
            menu.submenu = 'target';
            selNoise = true;
          } else {

            const did = menu.submenu === 'magic'
              ? recordSpell(state, c, row.id, c)
              : (() => {
                const nm = recordItem(state, c, menu.gridIndex, c);
                return nm ? `${nm}!` : null;
              })();
            if (!did) {
              cue(state, 'snd_error');
            } else {
              menu.lastItem = did;

              menu.submenu = null;

              selNoise = true;
              nextHero(menu, state);
              if (!skipFallen(state)) {
                menu.charturn = 0;
                menu.open = false;
                menu.justClosed = true;
                return true;
              }
            }
          }
        }
      }
    }
    if (moveNoise) cue(state, 'snd_menumove');
    if (selNoise) cue(state, 'snd_select');
    return false;
  }

  if (pressed('left')) {
    menu.selected[c] = (menu.selected[c] + BUTTONS.length - 1) % BUTTONS.length;
    moveNoise = true;
  }
  if (pressed('right')) {
    menu.selected[c] = (menu.selected[c] + 1) % BUTTONS.length;
    moveNoise = true;
  }


  const rowConfirm = pressed('confirm');
  if (pressed('cancel')) {
    if (prevHero(menu, state)) moveNoise = true;
    else cue(state, 'snd_error');
  }

  if (rowConfirm) {

    const nameOf = BUTTONS[menu.selected[c]].name;
    const chosen = typeof nameOf === 'function' ? nameOf(c) : nameOf;
    if (chosen === 'FIGHT') {

      menu.submenu = 'enemy';
      menu.gridIndex = 0;
      setFace(state, c, FACE_ATTACK);
      cue(state, 'snd_select');
      return false;
    }

    if (chosen === 'MAGIC' || chosen === 'ACT') {
      const isAct = chosen === 'ACT' || (chosen === 'MAGIC' && c === 0);
      const listName = isAct ? 'actgrid' : 'magic';
      if (listRows({ ...state, menu: { ...menu, submenu: listName } }).length === 0) {
        cue(state, 'snd_error');
        return false;
      }

      menu.submenu = isAct ? 'actpick' : 'magic';
      menu.gridIndex = 0;
      menu.itemIndex = 0;
      setFace(state, c, isAct ? FACE_ACT : FACE_SPELL);
      cue(state, 'snd_select');
      return false;
    }
    if (chosen === 'ITEM' && bagOf(state).length === 0) {

      cue(state, 'snd_error');
      return false;
    }
    if (chosen === 'ITEM') {

      menu.submenu = 'item';
      menu.gridIndex = 0;
      menu.itemIndex = 0;

      setFace(state, c, FACE_ITEM);
      cue(state, 'snd_select');
      return false;
    }
    state.charaction[c] = chosen === 'DEFEND' ? ACTION_DEFEND : 0;

    if (chosen === 'DEFEND') {
      scrTensionheal(state, TP_DEFEND);

      setFace(state, c, FACE_DEFEND);
    } else {
      setFace(state, c, FACE_IDLE);
    }
    selNoise = true;

    nextHero(menu, state);
    if (!skipFallen(state)) {
      menu.charturn = 0;
      menu.open = false;
      menu.justClosed = true;
      menu.needsCommit = true;
      if (selNoise) cue(state, 'snd_select');
      return true;
    }
  }

  if (moveNoise) cue(state, 'snd_menumove');
  if (selNoise) cue(state, 'snd_select');


  menu.onebuffer = (menu.onebuffer ?? 0) - 1;
  menu.twobuffer = (menu.twobuffer ?? 0) - 1;
  return false;
}



function skipFallen(state) {
  while (state.menu.charturn < 3 && !isUp(state, state.menu.charturn)) {
    state.menu.charturn += 1;
  }
  if (state.menu.charturn < 3) return true;

  endTurnItems(state);
  return false;
}


export function openMenu(state) {
  state.menu.open = true;

  for (let i = 0; i < 3; i++) {
    state.charaction[i] = 0;
    setFace(state, i, FACE_IDLE);
  }

  state.menu.selected = [0, 0, 0];

  for (const k of MENU_KEYS) {
    state.menu.held[k] = !!(state.prevInput?.[k]);
  }
  state.menu.charturn = 0;
  state.menu.submenu = null;
  state.menu.pending = null;
  state.menu.gridIndex = 0;
  state.menu.itemIndex = 0;
  state.menu.fight = [false, false, false];

  for (let i = 0; i < 3; i++) {
    state.menu.tempitem[i] = [...state.inventory];
    state.menu.temptension[i] = state.tension;
  }

  if (!skipFallen(state)) {
    state.menu.charturn = 0;
    state.menu.open = false;
  }
}

export { skipFallen };
