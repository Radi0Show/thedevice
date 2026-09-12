


import { drawSpriteExt, rgb, c_white, mergeColor } from './draw/gm.js';
import { sliceShatter, drawShatterFragment } from './shatter.js';
import { loadFont, drawText, textWidth, textHeight } from './font.js';
import { VERSION } from '../web/version.js';
import {
  MODES, SETTINGS_PAGES, TITLE_EXTRAS, CREDITS, ITEM_PICKER, GEAR_PAGES,
  pocketOf, previewStats, wornBy, partyTabs, unusedRowStyle,
} from '../sim/modes.js';
import { ITEMS, INVENTORY_SIZE } from '../sim/items.js';
import { difficultyBlurb } from '../sim/scenes/single.js';
import { WEAPONS, ARMOR, canEquip, itemOf } from '../sim/equipment.js';

const BG = [0x27, 0x29, 0x3f];
const DIM = [128, 128, 138];
const HILITE = [255, 255, 0];

const W = 640;


function centred(ctx, font, text, y, color, scale = 1) {
  const w = textWidth(font, text) * scale;
  drawText(ctx, font, text, (W - w) / 2, y, { color: rgb(color), xscale: scale, yscale: scale });
}



function centredSegments(ctx, font, segs, y, scale = 1) {
  let total = 0;
  for (const seg of segs) total += textWidth(font, seg[0]) * scale;
  let x = (W - total) / 2;
  for (const [text, color] of segs) {
    drawText(ctx, font, text, x, y, { color: rgb(color), xscale: scale, yscale: scale });
    x += textWidth(font, text) * scale;
  }
}



export function drawTitle(ctx, title, sprites, attacks, opts = {}) {
  const font = loadFont();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);


  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (!font?.ready) {
    ctx.restore();
    return;
  }

  if (title.settings) {
    drawSettings(ctx, title, sprites, font);
    ctx.restore();
    return;
  }


  centredSegments(ctx, font, opts.title ?? [['BLACK KNIFE SIMULATOR', c_white]], 60, 1.6);

  const heart = sprites.get('spr_heart');
  const picked = attacks[title.attackIndex];
  let rows;
  let index;
  if (title.pickingDifficulty && picked) {

    rows = picked.difficulties.map((d, i) => ({
      name: `DIFFICULTY ${i + 1}`,
      blurb: difficultyBlurb(picked.ac, d),
    }));
    index = title.difficultyIndex;
    centred(ctx, font, picked.name.toUpperCase(), 136, DIM, 0.9);
  } else if (title.pickingAttack) {
    rows = attacks.map((a) => ({ name: a.name.toUpperCase(), blurb: a.where, unused: a.unused }));
    index = title.attackIndex;
  } else {
    rows = MODES.map((m) => ({ name: m.name, blurb: m.blurb }));
    index = title.index;
  }


  const WINDOW = 8;
  const pitch = rows.length > 6 ? 30 : 34;
  const top = title.pickingDifficulty ? 190 : 170;


  let first = 0;
  if (rows.length > WINDOW) {
    first = Math.min(
      Math.max(0, index - Math.floor(WINDOW / 2)),
      rows.length - WINDOW,
    );
  }
  const last = Math.min(rows.length, first + WINDOW);

  for (let i = first; i < last; i++) {
    const y = top + (i - first) * pitch;
    const on = i === index;
    const x = 160;
    if (on && heart) {

      const bob = Math.sin(title.siner / 6) * 1.5;
      drawSpriteExt(ctx, heart, 0, x - 30 + bob, y + 4, 1, 1, 0, null, 1);
    }

    const restColor = rows[i].unused ? DIM : c_white;

    const squeeze = Math.min(1, 250 / Math.max(1, textWidth(font, rows[i].name)));
    drawText(ctx, font, rows[i].name, x, y, { color: rgb(on ? HILITE : restColor), xscale: squeeze });
    if ((title.pickingAttack || title.pickingDifficulty) && rows[i].blurb) {
      drawText(ctx, font, rows[i].blurb, 430, y + 3, { color: rgb(DIM), yscale: 0.75, xscale: 0.75 });
    }
  }


  const arrow = sprites.get('spr_morearrow');
  if (arrow && rows.length > WINDOW) {
    const bob = Math.sin(title.siner / 10) * 2;
    if (first > 0) {
      drawSpriteExt(ctx, arrow, 0, 300, top - 22 - bob, 1, -1, 0, null, 1);
    }
    if (last < rows.length) {
      drawSpriteExt(ctx, arrow, 0, 300, top + WINDOW * pitch - 6 + bob, 1, 1, 0, null, 1);
    }
  }


  if (!title.pickingAttack) {
    for (let i = 0; i < TITLE_EXTRAS.length; i++) {
      const y = top + MODES.length * pitch + 30 + i * pitch;
      const on = title.index === MODES.length + i;
      if (on && heart) {
        const bob = Math.sin(title.siner / 6) * 1.5;
        drawSpriteExt(ctx, heart, 0, 160 + bob, y + 4, 1, 1, 0, null, 1);
      }
      drawText(ctx, font, TITLE_EXTRAS[i].name, 190, y,
        { color: rgb(on ? HILITE : DIM) });
    }
  }




  drawText(ctx, font, `v${VERSION}`, 8, 462, {
    color: rgb(DIM), xscale: 0.6, yscale: 0.6,
  });
  ctx.restore();
}



const SLOT_NAMES = ['WEAPON', 'ARMOR 1', 'ARMOR 2'];





let shatterCache = { key: null, slices: [] };

function unusedShatterSlices(entry, name, font, w, h, red) {
  const key = `${name}|${w}x${h}|${red.join(',')}|${entry?.frames?.length ?? 0}`;
  if (shatterCache.key === key) return shatterCache.slices;
  const slices = sliceShatter(entry, {
    width: w,
    height: h,
    blend: red,

    paint: (g) => drawText(g, font, name, 0, 0, { color: rgb(c_white) }),
  });
  shatterCache = { key, slices };
  return slices;
}



function drawUnusedShatter(ctx, font, sprites, style, shatter, x, y) {
  if (!shatter) return;
  const entry = style.sprite ? sprites.get(style.sprite) : null;

  if (!entry) return;
  const w = textWidth(font, style.name);
  const h = textHeight(font) || 30;
  const slices = unusedShatterSlices(entry, style.name, font, w, h, style.red);
  if (!slices.length) return;
  for (const f of shatter.frags) {
    if (!f.alive) continue;
    drawShatterFragment(ctx, slices[f.i % slices.length], x + f.dx, y + f.dy);
  }
}



function drawUnusedRow(ctx, font, small, style, x, y, on, siner) {
  if (style.shattering) return;
  const name = style.name;
  const h = textHeight(font) || 30;


  const base = style.taken ? style.red

    : style.dim ? DIM
      : mergeColor(DIM, style.red, style.heat);
  const colour = on
    ? (style.taken ? style.red : mergeColor(HILITE, style.red, style.heat))
    : base;

  const breathe = style.taken ? Math.sin(siner / 8) * 0.8 : 0;

  drawText(ctx, font, name, x + breathe + style.shake, y, { color: rgb(colour) });


}

function drawSettings(ctx, title, sprites, font) {
  const s = title.settings;
  const heart = sprites.get('spr_heart');
  const bob = Math.sin(title.siner / 6) * 1.5;

  if (s.page === null) {
    const unusedStyle = unusedRowStyle(title);
    const unusedRow = SETTINGS_PAGES.findIndex((p) => p.id === 'unused');
    centred(ctx, font, 'SETTINGS', 60, c_white, 1.4);
    for (let i = 0; i < SETTINGS_PAGES.length; i++) {
      const y = 170 + i * 40;
      const on = i === s.cursor;
      const unused = SETTINGS_PAGES[i].id === 'unused';

      if (on && heart && !unusedStyle.shattering) {
        drawSpriteExt(ctx, heart, 0, 160 + bob, y + 4, 1, 1, 0, null, 1);
      }
      if (unused) {

        drawUnusedRow(ctx, font, loadFont('../assets/fonts', 'fnt_main'),
          unusedStyle, 190, y, on, title.siner);
      } else {
        drawText(ctx, font, SETTINGS_PAGES[i].name, 190, y,
          { color: rgb(on ? HILITE : c_white) });
      }
    }

    if (s.shared > 0) {
      const small = loadFont('../assets/fonts', 'fnt_main');
      const row = SETTINGS_PAGES.findIndex((p) => p.id === 'share');
      if (small?.ready && row >= 0) {
        drawText(ctx, small, 'link copied', 420, 170 + row * 40 + 6,
          { color: rgb(HILITE) });
      }
    }
    centred(ctx, font, 'Z  open      X  back', 448, DIM, 0.75);

    drawUnusedShatter(ctx, font, sprites, unusedStyle, title.unused?.shatter,
      190, 170 + unusedRow * 40);
    return;
  }


  if (s.page === 'gearhub') {
    centred(ctx, font, 'GEAR / ITEMS', 60, c_white, 1.4);
    for (let i = 0; i < GEAR_PAGES.length; i++) {
      const y = 190 + i * 40;
      const on = i === s.cursor;
      if (on && heart) drawSpriteExt(ctx, heart, 0, 160 + bob, y + 4, 1, 1, 0, null, 1);
      drawText(ctx, font, GEAR_PAGES[i].name, 190, y,
        { color: rgb(on ? HILITE : c_white) });
    }
    centred(ctx, font, 'Z  open      X  back', 448, DIM, 0.75);
    return;
  }

  if (s.page === 'items') {
    const small = loadFont('../assets/fonts', 'fnt_main');
    const it = s.items;
    centred(ctx, font, 'ITEMS', 60, c_white, 1.4);


    const describe = (id, x, y) => {
      if (!small?.ready) return;
      const item = ITEMS[id];
      const lines = item ? item.desc.split('#') : ['empty slot'];
      lines.forEach((line, i) => {
        drawText(ctx, small, line, x, y + i * 20, { color: rgb(DIM) });
      });
    };

    if (it.stage === 'slots') {
      const COL = [60, 340];
      for (let i = 0; i < INVENTORY_SIZE; i++) {
        const x = COL[i % 2];
        const y = 140 + Math.floor(i / 2) * 32;
        const on = i === it.slot;
        const item = ITEMS[title.bag[i] ?? 0];
        if (on && heart) drawSpriteExt(ctx, heart, 0, x - 30 + bob, y + 4, 1, 1, 0, null, 1);

        drawText(ctx, font, item ? item.name : '- - -', x, y,
          { color: rgb(on ? HILITE : (item ? c_white : DIM)) });
      }
      describe(title.bag[it.slot] ?? 0, 60, 350);
      centred(ctx, font, 'arrows  move      Z  change      X  back', 448, DIM, 0.75);
      return;
    }


    centred(ctx, font, `SLOT ${it.slot + 1}`, 104, DIM, 0.9);
    const WIN = 9;
    const first = Math.min(
      Math.max(0, it.pick - Math.floor(WIN / 2)),
      Math.max(0, ITEM_PICKER.length - WIN),
    );
    for (let r = 0; r < WIN && first + r < ITEM_PICKER.length; r++) {
      const idx = first + r;
      const entry = ITEMS[ITEM_PICKER[idx]];
      const y = 140 + r * 32;
      const on = idx === it.pick;
      if (on && heart) drawSpriteExt(ctx, heart, 0, 130 + bob, y + 4, 1, 1, 0, null, 1);
      drawText(ctx, font, entry ? entry.name : '- - -', 160, y,
        { color: rgb(on ? HILITE : c_white) });
    }
    describe(ITEM_PICKER[it.pick], 400, 140);


    const arrow = sprites.get('spr_morearrow');
    if (arrow) {
      const abob = Math.sin(title.siner / 10) * 2;

      if (first > 0) drawSpriteExt(ctx, arrow, 0, 560, 150 - abob, 1, -1, 0, null, 1);
      if (first + WIN < ITEM_PICKER.length) {
        drawSpriteExt(ctx, arrow, 0, 560, 140 + WIN * 32 - 8 + abob, 1, 1, 0, null, 1);
      }
    }
    centred(ctx, font, 'arrows  move      Z  set      X  back', 448, DIM, 0.75);
    return;
  }

  if (s.page === 'credits') {

    const small = loadFont('../assets/fonts', 'fnt_main');
    centred(ctx, font, 'CREDITS', 60, c_white, 1.4);

    const PITCH = 78;
    for (let i = 0; i < CREDITS.length; i++) {
      const y = 150 + i * PITCH;
      const on = i === s.cursor;
      const row = CREDITS[i];

      const nameY = row.who ? y + 22 : y + 11;
      if (on && heart) drawSpriteExt(ctx, heart, 0, 90 + bob, nameY + 4, 1, 1, 0, null, 1);

      if (row.who && small?.ready) {
        drawText(ctx, small, row.role, 120, y, { color: rgb(on ? HILITE : DIM) });
      }
      drawText(ctx, font, row.who || row.role, 120, nameY,
        { color: rgb(on ? HILITE : c_white) });

      if (row.link && small?.ready) {
        drawText(ctx, small, on ? `Z    ${row.link}` : row.link, 120, nameY + 30,
          { color: rgb(on ? HILITE : DIM) });
      }
    }
    centred(ctx, font, 'arrows  move      X  back', 448, DIM, 0.75);
    return;
  }

  if (s.page === 'graphics') {
    centred(ctx, font, 'GRAPHICS', 60, c_white, 1.4);

    const rows = [
      { name: 'SCREEN SIZE', value: title.scaling === 'fit' ? 'FULL' : 'SMALL' },
      { name: 'SCREEN SHAKE', value: title.shake ? 'ON' : 'OFF' },

      { name: 'TOUCH BUTTONS', value: title.swapZX ? 'X / Z' : 'Z / X' },
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 190 + i * 60;
      const on = i === s.cursor;
      if (on && heart) drawSpriteExt(ctx, heart, 0, 110 + bob, y + 4, 1, 1, 0, null, 1);
      drawText(ctx, font, rows[i].name, 140, y, { color: rgb(on ? HILITE : c_white) });
      drawText(ctx, font, rows[i].value, 420, y, { color: rgb(on ? HILITE : c_white) });
    }
    centred(ctx, font, 'arrows  toggle      X  back', 448, DIM, 0.75);
    return;
  }

  if (s.page === 'audio') {
    centred(ctx, font, 'MUSIC / SFX', 60, c_white, 1.4);
    const rows = [
      { name: 'MUSIC', value: title.volumes.music },
      { name: 'SFX', value: title.volumes.sfx },
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 190 + i * 60;
      const on = i === s.cursor;
      if (on && heart) drawSpriteExt(ctx, heart, 0, 110 + bob, y + 4, 1, 1, 0, null, 1);
      drawText(ctx, font, rows[i].name, 140, y, { color: rgb(on ? HILITE : c_white) });

      ctx.fillStyle = 'rgb(64,64,72)';
      ctx.fillRect(280, y + 4, 200, 14);
      ctx.fillStyle = on ? 'rgb(255,255,0)' : 'rgb(255,255,255)';
      ctx.fillRect(280, y + 4, rows[i].value * 2, 14);
      drawText(ctx, font, String(rows[i].value), 500, y, { color: rgb(on ? HILITE : c_white) });
    }
    centred(ctx, font, 'arrows  adjust      X  back', 448, DIM, 0.75);
    return;
  }


  const eq = s.equip;
  centred(ctx, font, 'WEAPONS / ARMOR', 40, c_white, 1.2);


  const HEADS = ['spr_headkris', 'spr_headsusie', 'spr_headralsei', 'spr_headnoelle'];
  const tabs = partyTabs(title);

  const tabStep = 90;
  const tabX0 = 290 - ((tabs.length - 1) * tabStep) / 2;
  for (let c = 0; c < tabs.length; c++) {
    const x = tabX0 + c * tabStep;
    const head = sprites.get(tabs[c].head ?? HEADS[tabs[c].char] ?? HEADS[0]);
    const on = eq.char === c;
    if (head) {
      ctx.save();
      ctx.globalAlpha = on ? 1 : 0.45;
      drawSpriteExt(ctx, head, 0, x, 80, 2, 2, 0, null, 1);
      ctx.restore();
    }
    drawText(ctx, font, tabs[c].name, x - 4, 130, {
      color: rgb(on ? HILITE : DIM), xscale: 0.75, yscale: 0.75,
    });
    if (on && eq.stage === 'char' && heart) {
      drawSpriteExt(ctx, heart, 0, x + 8, 158 + bob, 1, 1, 0, null, 1);
    }
  }


  const gear = title.gear[eq.char];
  for (let r = 0; r < 3; r++) {
    const y = 190 + r * 34;
    const id = r === 0 ? gear.weapon : gear.armor[r - 1] ?? 0;
    const it = r === 0 ? itemOf('weapon', id) : itemOf('armor', id);
    const on = eq.stage !== 'char' && eq.row === r;
    if (on && eq.stage === 'slot' && heart) {
      drawSpriteExt(ctx, heart, 0, 120 + bob, y + 4, 1, 1, 0, null, 1);
    }
    drawText(ctx, font, SLOT_NAMES[r], 150, y, { color: rgb(on ? HILITE : DIM), xscale: 0.85, yscale: 0.85 });
    drawText(ctx, font, it?.name ?? '(Nothing)', 300, y, { color: rgb(on ? HILITE : c_white), xscale: 0.85, yscale: 0.85 });
  }


  const st = previewStats(title, eq.char);
  drawText(ctx, font, `AT ${st.at}   DF ${st.df}   MG ${st.magic}`, 150, 300,
    { color: rgb(DIM), xscale: 0.85, yscale: 0.85 });


  if (eq.comment) {
    drawText(ctx, font, eq.comment, 150, 330,
      { color: rgb(DIM), xscale: 0.85, yscale: 0.85 });
  }


  if (eq.stage === 'pocket') {
    const kind = eq.row === 0 ? 'weapon' : 'armor';
    const pocket = pocketOf(kind, title.gear);
    const table = kind === 'weapon' ? WEAPONS : ARMOR;

    const win = 7;
    let first = Math.max(0, Math.min(eq.pocket - 3, pocket.length - win));
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(360, 150, 260, 270);
    for (let i = 0; i < Math.min(win, pocket.length); i++) {
      const idx = first + i;
      const id = pocket[idx];
      const y = 160 + i * 34;
      const on = idx === eq.pocket;
      const name = id === 0 ? '(Nothing)' : table[id]?.name ?? '?';

      const ok = id === 0 || canEquip(kind, id, tabs[eq.char].char);
      if (on && heart) drawSpriteExt(ctx, heart, 0, 370 + bob, y + 4, 1, 1, 0, null, 1);

      const tag = wornBy(kind, id, title.gear).map((c) => (tabs[c]?.name ?? '?')[0]).join(' ');
      const tagW = tag ? textWidth(font, tag) * 0.7 : 0;
      const tagX = 612 - tagW;

      const w = textWidth(font, name) * 0.85;
      const room = tag ? Math.min(200, tagX - 8 - 400) : 200;
      const squeeze = Math.min(1, room / w);
      drawText(ctx, font, name, 400, y, {
        color: rgb(on ? HILITE : (ok ? c_white : DIM)),
        xscale: 0.85 * squeeze, yscale: 0.85,
      });
      if (tag) {
        drawText(ctx, font, tag, tagX, y + 2, { color: rgb(DIM), xscale: 0.7, yscale: 0.7 });
      }
    }

    const selId = pocket[eq.pocket];
    if (selId !== 0) {
      const it = table[selId];
      const bits = [];
      if (it.at) bits.push(`AT ${it.at > 0 ? '+' : ''}${it.at}`);
      if (it.df) bits.push(`DF ${it.df > 0 ? '+' : ''}${it.df}`);
      if (it.magic) bits.push(`MG ${it.magic > 0 ? '+' : ''}${it.magic}`);
      if (it.ability) bits.push(it.ability);
      drawText(ctx, font, bits.join('  ') || '—', 400, 424,
        { color: rgb(DIM), xscale: 0.7, yscale: 0.7 });
    }
  }

  centred(ctx, font,
    eq.stage === 'char' ? 'arrows  pick character      Z  edit      X  back'
      : eq.stage === 'slot' ? 'arrows  pick slot      Z  change      X  back'
        : 'arrows  pick      Z  equip      X  back',
    448, DIM, 0.75);
}





const easeOut2 = (t) => -t * (t - 2);


const GLIDE_START = 80;
const GLIDE_TIME = 30;
const GLIDE_X = 312;
const GLIDE_Y = 80;


const FAILURE_AT = 150;




const KNIGHT_LINES = [
  ['     VERY', '', '  INTERESTING.'],
  [' YOUR LOSS HERE', '', '     IS ALL', '', ' BUT GUARANTEED.'],
  ['    AND YET', '', ' YOU PERSIST...'],
  ['IF YOU ARE SO', 'DETERMINED', 'TO TRY ONCE MORE'],
  ['      THEN', '', 'SHALL WE HASTEN?'],
];



const GAMEOVER_RATE = 2;
const PAUSE_FRAMES = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 60, 8: 90, 9: 150 };

const KNIGHT_PAUSES = [
  { 9: 6 },
  { 15: 6, 27: 6 },
  { 11: 6 },
  {},
  { 10: 6 },
];



function typedCount(script, n, t) {
  const chars = script.lines[n].join('').length;
  const pauses = script.pauses[n] ?? {};
  let frames = 0;
  for (let i = 0; i < chars; i++) {
    frames += GAMEOVER_RATE;
    if (pauses[i]) frames += PAUSE_FRAMES[pauses[i]];
    if (frames > t) return { shown: i, done: false };
  }
  return { shown: chars, done: true };
}


const LINE_GAP = 30;


function typedFrames(script, n) {
  const chars = script.lines[n].join('').length;
  const pauses = script.pauses[n] ?? {};
  let frames = 0;
  for (let i = 0; i < chars; i++) {
    frames += GAMEOVER_RATE;
    if (pauses[i]) frames += PAUSE_FRAMES[pauses[i]];
  }
  return frames;
}


function revealRows(rows, shown) {
  let left = shown;
  return rows.map((r) => {
    if (left <= 0) return '';
    const out = r.slice(0, left);
    left -= r.length;
    return out;
  });
}



const CHOICES = [
  { name: ['GO BACK', '(FIGHT AGAIN)'], x: 70, y: 180, con: 53 },
  { name: ['GO FORWARD', '(MOVE ON)'], x: 190, y: 180, con: 55 },
];



export const KNIGHT_GAMEOVER_SCRIPT = {
  lines: KNIGHT_LINES,
  pauses: KNIGHT_PAUSES,
  choices: CHOICES,
};



export const GAMEOVER_ENTRY = { ALWAYS: 'always', GUARDED: 'after-first-attempt' };



const ROOM_SCALE = 2;
const rx = (v) => v * ROOM_SCALE;


const C_YELLOW = [255, 255, 0];

export function drawGameOver(ctx, over, sprites) {

  const font = loadFont('../assets/fonts', 'fnt_main');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);


  if (over.t < 30 && over.shot) {
    ctx.drawImage(over.shot, 0, 0);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  const heart = sprites.get('spr_heart');


  if (over.t >= 30 && over.t < FAILURE_AT && heart) {
    drawSpriteExt(ctx, heart, 0, over.x, over.y, 1, 1, 0, null, 1);
  }

  if (over.t >= FAILURE_AT) drawFailure(ctx, over, font, heart);

  ctx.restore();
}



function drawFailure(ctx, over, font, heart) {
  const t = over.t - FAILURE_AT;


  if (heart && over.marker !== false) {
    const a = over.choiceT >= 0 ? Math.max(0, 1 - over.choiceT / 15) : 1;
    if (a > 0) drawSpriteExt(ctx, heart, 0, rx(156), rx(40), 1, 1, 0, null, a);
  }

  if (!font?.ready) return;


  const script = over.script ?? KNIGHT_GAMEOVER_SCRIPT;
  const which = Math.min(over.line, script.lines.length - 1);
  const line = revealRows(
    script.lines[which], typedCount(script, which, over.lineT ?? 0).shown,
  );
  if (over.choiceT < 0 && t > 2) {
    line.forEach((s, i) => {

      drawText(ctx, font, s, rx(70), rx(80) + i * rx(20),

        { color: rgb(c_white), advance: 12, xscale: ROOM_SCALE,
          yscale: ROOM_SCALE, special: 2, siner: over.t });
    });
  }

  if (over.choiceT < 0) return;


  const fadebuffer = Math.max(0, 20 - over.choiceT);
  const xfade = Math.min(1, Math.max(0, (10 - fadebuffer) / 10));
  const yoff = rx(20) * (1 - Math.min(1, over.choiceT / 20));
  if (xfade <= 0) return;


  const lineH = textHeight(font) * ROOM_SCALE;
  script.choices.forEach((c, i) => {
    const color = rgb(over.cur === i ? C_YELLOW : c_white);
    c.name.forEach((s, k) => {
      drawText(ctx, font, s, rx(c.x), rx(c.y) + yoff + k * lineH,
        { color, xscale: ROOM_SCALE, yscale: ROOM_SCALE, alpha: xfade });
    });
  });
}



export function stepGameOver(over, keys = {}) {
  over.t += 1;


  if (over.t > GLIDE_START && over.t <= GLIDE_START + GLIDE_TIME) {
    const p = easeOut2((over.t - GLIDE_START) / GLIDE_TIME);
    over.x = over.x0 + (GLIDE_X - over.x0) * p;
    over.y = over.y0 + (GLIDE_Y - over.y0) * p;
  }

  if (over.t < FAILURE_AT) return {};

  const t = over.t - FAILURE_AT;


  const skipHeld = !!(keys.confirm || keys.focus || keys.cancel || keys.button3);
  const skipEdge = skipHeld && !over.heldSkip;
  over.heldSkip = skipHeld;

  const script = over.script ?? KNIGHT_GAMEOVER_SCRIPT;

  if (over.choiceT < 0) {
    if (t <= 2) return {};
    over.lineT = (over.lineT ?? 0) + 1;
    if (skipHeld) {
      over.lineT = Math.max(over.lineT, typedFrames(script, over.line));
    }
    const { done } = typedCount(script, over.line, over.lineT);
    if (!done) return {};
    over.gap = (over.gap ?? 0) + 1;

    if (over.gap < LINE_GAP && !skipEdge) return {};
    over.gap = 0;
    over.lineT = 0;
    if (over.line < script.lines.length - 1) {
      over.line += 1;
      return { advanced: true };
    }

    over.choiceT = 0;
    return { advanced: true };
  }

  over.choiceT += 1;


  const xmax = script.choices.length - 1;
  const left = !!keys.left && !over.heldLeft;
  const right = !!keys.right && !over.heldRight;
  over.heldLeft = !!keys.left;
  over.heldRight = !!keys.right;

  let moved = false;
  if (left && over.cur !== 0) { over.cur = Math.max(0, over.cur - 1); moved = true; }
  if (right && over.cur !== xmax) { over.cur = over.cur < 0 ? 0 : over.cur + 1; moved = true; }

  const pressed = !!keys.confirm && !over.heldConfirm;
  over.heldConfirm = !!keys.confirm;

  if (pressed && over.cur >= 0 && over.choiceT > 20) {

    return { chosen: over.cur, con: script.choices[over.cur]?.con };
  }
  return { moved };
}



export function makeGameOver(shot, x, y, opts = {}) {
  const entry = opts.entry ?? GAMEOVER_ENTRY.ALWAYS;
  if (entry === GAMEOVER_ENTRY.GUARDED && !((opts.attempts ?? 0) > 0)) return null;
  return {
    t: opts.glide === false ? FAILURE_AT : 0,
    shot,
    x,
    y,
    x0: x,
    y0: y,
    script: opts.script ?? KNIGHT_GAMEOVER_SCRIPT,
    marker: opts.marker !== false,

    line: 0,
    lineT: 0,
    gap: 0,
    choiceT: -1,
    cur: -1,
    heldConfirm: false,
    heldLeft: false,
    heldRight: false,
    heldSkip: false,
  };
}
