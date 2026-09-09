


export const MODES = [
  {
    id: 'normal',
    name: 'NORMAL',
    blurb: 'The real fight, in order.',
  },
  {
    id: 'hitless',
    name: 'HITLESS',
    blurb: 'One hit and it starts over.',
  },
  {
    id: 'endless',
    name: 'ENDLESS',
    blurb: 'It never stops. The order loops.',
  },
  {
    id: 'single',
    name: 'SINGLE ATTACK',
    blurb: 'One attack, on repeat.',
  },
];



import { WEAPONS, ARMOR, canEquip, statsOf } from './equipment.js';
import { WEAPON_REFUSALS, ARMOR_REFUSALS } from './equip-refusals.js';
import { DEFAULT_GEAR, PARTY } from './damage.js';
import { ITEMS, ITEM_IDS, DEFAULT_BAG, INVENTORY_SIZE } from './items.js';



export const ITEM_PICKER = [0, ...ITEM_IDS];

export const SETTINGS_PAGES = [
  { id: 'audio', name: 'MUSIC / SFX' },
  { id: 'graphics', name: 'GRAPHICS' },

  { id: 'share', name: 'SHARE SETUP' },
  { id: 'unused', name: 'UNUSED' },
];



export const GEAR_PAGES = [
  { id: 'equip', name: 'WEAPONS / ARMOR' },
  { id: 'items', name: 'ITEMS' },
];



export const TITLE_EXTRAS = [
  { id: 'gear', name: 'GEAR / ITEMS' },
  { id: 'settings', name: 'SETTINGS' },
  { id: 'credits', name: 'CREDITS' },
];



export const CREDITS = [
  { role: 'Developer', who: 'Radi0', link: 'radi0.dev' },
  { role: 'Bug fixing and Playtesting', who: 'WandeR', link: 'wander22lstr.carrd.co' },
  { role: 'SUPPORT', who: '', link: 'ko-fi.com/shadowcrystaldev' },
];



export const creditLink = (row) => (row.link ? `https://${row.link}` : null);



export function pocketOf(kind, gear = null) {
  const table = kind === 'weapon' ? WEAPONS : ARMOR;
  const ids = Object.keys(table).map(Number).filter((id) => id !== 26 || kind !== 'weapon');
  return [0, ...ids];
}



export function wornBy(kind, id, gear) {
  if (!gear || id === 0) return [];
  return gear.flatMap((g, i) => (
    (kind === 'weapon' ? g.weapon === id : (g.armor ?? []).includes(id)) ? [i] : []
  ));
}

export function createTitle() {
  return {

    mode: null,
    index: 0,

    attackIndex: 0,

    pickingAttack: false,


    pickingDifficulty: false,
    difficultyIndex: 0,
    difficultyCount: 1,
    siner: 0,
    held: {},

    settings: null,

    gear: DEFAULT_GEAR.map((g) => ({ weapon: g.weapon, armor: [...g.armor] })),


    bag: [...DEFAULT_BAG],


    volumes: { music: 50, sfx: 50 },


    shake: true,


    scaling: 'fit',


    swapZX: false,

    dirty: false,
  };
}

function openSettings(title) {
  title.settings = {
    page: null,
    cursor: 0,
    shared: 0,
    equip: { stage: 'char', char: 0, row: 0, pocket: 0 },
    items: { stage: 'slots', slot: 0, pick: 0 },
  };
}





function openGear(title) {
  title.settings = {
    page: 'gearhub',
    root: true,
    cursor: 0,
    equip: { stage: 'char', char: 0, row: 0, pocket: 0 },
    items: { stage: 'slots', slot: 0, pick: 0 },
  };
}

function openCredits(title) {
  title.settings = {
    page: 'credits',
    root: true,
    cursor: 0,
    equip: { stage: 'char', char: 0, row: 0, pocket: 0 },
    items: { stage: 'slots', slot: 0, pick: 0 },
  };
}



function stepSettings(title, pressed) {
  const s = title.settings;
  const out = { moved: false, selected: false, error: false };


  const leavePage = () => {
    if (s.back) { s.page = s.back; s.back = null; }
    else if (s.root) title.settings = null;
    else s.page = null;
  };

  if (s.page === null) {

    if (s.shared > 0) s.shared -= 1;
    if (pressed('up')) { s.cursor = (s.cursor + SETTINGS_PAGES.length - 1) % SETTINGS_PAGES.length; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % SETTINGS_PAGES.length; out.moved = true; }
    if (pressed('cancel')) { title.settings = null; out.moved = true; return out; }
    if (pressed('confirm')) {
      const page = SETTINGS_PAGES[s.cursor].id;
      if (page === 'unused') { out.error = true; return out; }

      if (page === 'share') {
        out.share = true;
        out.selected = true;

        s.shared = 90;
        return out;
      }
      s.page = page;
      s.back = null;
      s.cursor = 0;
      s.equip = { stage: 'char', char: 0, row: 0, pocket: 0 };
      out.selected = true;
    }
    return out;
  }

  if (s.page === 'gearhub') {
    if (pressed('up')) { s.cursor = (s.cursor + GEAR_PAGES.length - 1) % GEAR_PAGES.length; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % GEAR_PAGES.length; out.moved = true; }

    if (pressed('cancel')) { title.settings = null; out.moved = true; return out; }
    if (pressed('confirm')) {
      s.page = GEAR_PAGES[s.cursor].id;

      s.back = 'gearhub';
      s.equip = { stage: 'char', char: 0, row: 0, pocket: 0 };
      s.items = { stage: 'slots', slot: 0, pick: 0 };
      out.selected = true;
    }
    return out;
  }


  if (s.page === 'items') {
    const it = s.items;
    if (it.stage === 'slots') {
      if (pressed('up') && it.slot >= 2) { it.slot -= 2; out.moved = true; }
      if (pressed('down') && it.slot <= INVENTORY_SIZE - 3) { it.slot += 2; out.moved = true; }

      if (pressed('left') || pressed('right')) {
        it.slot += it.slot % 2 === 0 ? 1 : -1;
        out.moved = true;
      }
      if (pressed('cancel')) { leavePage(); out.moved = true; }
      if (pressed('confirm')) {
        it.stage = 'pick';

        it.pick = Math.max(0, ITEM_PICKER.indexOf(title.bag[it.slot] ?? 0));
        out.selected = true;
      }
      return out;
    }

    if (pressed('up')) {
      it.pick = (it.pick + ITEM_PICKER.length - 1) % ITEM_PICKER.length;
      out.moved = true;
    }
    if (pressed('down')) {
      it.pick = (it.pick + 1) % ITEM_PICKER.length;
      out.moved = true;
    }
    if (pressed('cancel')) { it.stage = 'slots'; out.moved = true; }
    if (pressed('confirm')) {
      title.bag[it.slot] = ITEM_PICKER[it.pick];
      title.dirty = true;
      it.stage = 'slots';
      out.selected = true;
    }
    return out;
  }


  if (s.page === 'credits') {
    if (pressed('confirm')) {
      const href = creditLink(CREDITS[s.cursor]);
      if (href) { out.link = href; out.selected = true; }
      return out;
    }
    if (pressed('up')) { s.cursor = (s.cursor + CREDITS.length - 1) % CREDITS.length; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % CREDITS.length; out.moved = true; }

    if (pressed('cancel')) {
      leavePage();
      out.moved = true;
    }
    return out;
  }


  if (s.page === 'graphics') {

    const ROWS = 3;
    if (pressed('up')) { s.cursor = (s.cursor + ROWS - 1) % ROWS; out.moved = true; }
    if (pressed('down')) { s.cursor = (s.cursor + 1) % ROWS; out.moved = true; }
    const flipL = pressed('left');
    const flipR = pressed('right');
    const flipC = pressed('confirm');
    if (flipL || flipR || flipC) {
      if (s.cursor === 0) title.scaling = title.scaling === 'fit' ? 'pixel' : 'fit';
      else if (s.cursor === 1) title.shake = !title.shake;
      else title.swapZX = !title.swapZX;
      title.dirty = true;
      out.moved = true;
    }
    if (pressed('cancel')) { leavePage(); out.moved = true; }
    return out;
  }


  if (s.page === 'audio') {
    if (pressed('up') || pressed('down')) { s.cursor = 1 - s.cursor; out.moved = true; }
    const key = s.cursor === 0 ? 'music' : 'sfx';
    if (pressed('left')) {
      title.volumes[key] = Math.max(0, title.volumes[key] - 5);
      title.dirty = true;
      out.moved = true;
    }
    if (pressed('right')) {
      title.volumes[key] = Math.min(100, title.volumes[key] + 5);
      title.dirty = true;
      out.moved = true;
    }
    if (pressed('cancel')) { leavePage(); out.moved = true; }
    return out;
  }


  const eq = s.equip;
  if (eq.stage === 'char') {
    if (pressed('left')) { eq.char = (eq.char + 2) % 3; out.moved = true; }
    if (pressed('right')) { eq.char = (eq.char + 1) % 3; out.moved = true; }

    if (pressed('cancel')) {
      leavePage();
      out.moved = true;
    }
    if (pressed('confirm')) { eq.stage = 'slot'; eq.row = 0; out.selected = true; }
    return out;
  }
  if (eq.stage === 'slot') {
    if (pressed('up')) { eq.row = (eq.row + 2) % 3; out.moved = true; }
    if (pressed('down')) { eq.row = (eq.row + 1) % 3; out.moved = true; }
    if (pressed('cancel')) { eq.stage = 'char'; out.moved = true; }
    if (pressed('confirm')) {
      eq.stage = 'pocket';

      const kind = eq.row === 0 ? 'weapon' : 'armor';
      const cur = eq.row === 0 ? title.gear[eq.char].weapon : title.gear[eq.char].armor[eq.row - 1] ?? 0;
      const pocket = pocketOf(kind, title.gear);
      eq.pocket = Math.max(0, pocket.indexOf(cur));
      out.selected = true;
    }
    return out;
  }

  const kind = eq.row === 0 ? 'weapon' : 'armor';
  const pocket = pocketOf(kind, title.gear);
  if (pressed('up')) { eq.pocket = (eq.pocket + pocket.length - 1) % pocket.length; out.moved = true; }
  if (pressed('down')) { eq.pocket = (eq.pocket + 1) % pocket.length; out.moved = true; }

  if (out.moved) eq.comment = null;
  if (pressed('cancel')) { eq.stage = 'slot'; eq.comment = null; out.moved = true; }
  if (pressed('confirm')) {
    const id = pocket[eq.pocket];

    {
      const table = kind === 'weapon' ? WEAPON_REFUSALS : ARMOR_REFUSALS;
      const line = id !== 0 ? table[id]?.[String(eq.char + 1)] : null;
      eq.comment = line && line.trim() ? line : null;
    }
    if (id !== 0 && !canEquip(kind, id, eq.char)) { out.error = true; return out; }
    if (eq.row === 0) title.gear[eq.char].weapon = id;
    else {
      const armor = title.gear[eq.char].armor;
      while (armor.length < 2) armor.push(0);
      armor[eq.row - 1] = id;
    }
    title.dirty = true;
    eq.stage = 'slot';
    out.selected = true;
  }
  return out;
}


export function previewStats(title, char) {
  return statsOf(PARTY[char], title.gear[char]);
}



export function stepTitle(title, input, attacks) {
  const attackCount = Array.isArray(attacks) ? attacks.length : attacks;
  title.siner += 1;
  const pressed = (k) => {
    const down = !!input?.[k];
    const was = !!title.held[k];
    title.held[k] = down;
    return down && !was;
  };


  if (title.settings) {
    const r = stepSettings(title, pressed);
    return {
      moved: r.moved, chosen: false, selected: r.selected, error: r.error,
      link: r.link ?? null, share: r.share ?? false,
    };
  }


  const list = title.pickingDifficulty
    ? title.difficultyCount
    : title.pickingAttack ? attackCount : MODES.length + TITLE_EXTRAS.length;
  const cur = title.pickingDifficulty
    ? 'difficultyIndex'
    : title.pickingAttack ? 'attackIndex' : 'index';
  let moved = false;

  if (pressed('up')) {
    title[cur] = (title[cur] + list - 1) % list;
    moved = true;
  }
  if (pressed('down')) {
    title[cur] = (title[cur] + 1) % list;
    moved = true;
  }


  const cancelled = pressed('cancel');
  if (cancelled && title.pickingDifficulty) {
    title.pickingDifficulty = false;
    return { moved: true, chosen: false };
  }
  if (cancelled && title.pickingAttack) {
    title.pickingAttack = false;
    return { moved: true, chosen: false };
  }

  if (pressed('confirm')) {
    if (!title.pickingAttack && title.index >= MODES.length) {
      const extra = TITLE_EXTRAS[title.index - MODES.length];
      if (extra.id === 'credits') openCredits(title);
      else if (extra.id === 'gear') openGear(title);
      else openSettings(title);
      return { moved: false, chosen: false, selected: true };
    }
    if (!title.pickingAttack && MODES[title.index].id === 'single') {

      title.pickingAttack = true;
      return { moved: false, chosen: false, selected: true };
    }

    if (title.pickingAttack && !title.pickingDifficulty && Array.isArray(attacks)) {
      const entry = attacks[title.attackIndex];
      const count = entry?.difficulties?.length ?? 1;
      if (count > 1) {
        title.pickingDifficulty = true;
        title.difficultyIndex = 0;
        title.difficultyCount = count;
        return { moved: false, chosen: false, selected: true };
      }
    }
    title.mode = MODES[title.index].id;
    return { moved: false, chosen: true, selected: true };
  }

  return { moved, chosen: false };
}
