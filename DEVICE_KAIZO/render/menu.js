

import { drawSpriteExt, rgb, c_white } from './draw/gm.js';
import { writerLines } from '../sim/dialogue.js';
import { PARTY } from '../sim/damage.js';
import {
  BUTTONS, listRows, charColorFor, charIdForSlot, partyArtFor, partyNameFor,
  slotOccupied,
} from '../sim/menu.js';
import { spellCost, spellInfo, actsFor } from '../sim/spells.js';
import { gmlRound } from '../sim/gml.js';
import { MAX_TENSION } from '../sim/tension.js';
import { KNIGHT_MAXHP } from '../sim/knight.js';
import { drawSpriteText, FONTS } from './text.js';
import { loadFont, drawText, textWidth, textHeight, styleColors } from './font.js';

const BP = 152;
const CHUNK = [0, 213, 426];
const PANEL_W = 212;

const B_OFFSET = 336;

const MAROON = 'rgb(128,0,0)';

const BCOLOR = [0, 0, 128];

function selectionMatrix(ctx, x, y, siner, color) {
  ctx.save();
  ctx.fillStyle = rgb(color);
  ctx.fillRect(x, y, 210, 3);
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const m = siner + i * (10 * Math.PI);
    ctx.globalAlpha = Math.max(0, Math.min(1, Math.sin(m / 60)));
    const line = (lx, y0, y1) => {
      ctx.beginPath();
      ctx.moveTo(lx, y0);
      ctx.lineTo(lx, y1);
      ctx.stroke();
    };
    line(x, y - 3, y + 33);
    line(x + 211, y - 3, y + 33);
    if (Math.cos(m / 60) < 0) {
      line(x - Math.sin(m / 60) * 30 + 30, y, y + 33);
      line(x + 210 + Math.sin(m / 60) * 30 - 30, y, y + 33);
    }
  }
  ctx.restore();
}

const BLEND_GRAY = [128, 128, 128];
const CHARTIME_XSLASH = 11;

function partnerStrip(state) {
  const heads = [];
  let xoff = 0;
  for (let slot = 0; slot < 3; slot++) {

    if (charIdForSlot(state, slot) === 1) continue;
    if (!slotOccupied(state, slot)) continue;
    const alive = (state.partyHp?.[slot] ?? 0) > 0;
    heads.push({
      head: partyArtFor(state, slot).head,
      hx: 28 + xoff,
      hy: 380,
      cx: 44 + xoff,
      cy: 391,

      blend: alive ? BLEND_GRAY : null,
    });
    xoff += 30;
  }

  return { heads, charoffset: 30 * heads.length };
}

function drawItemList(ctx, state, sprites, font, siner) {
  const menu = state.menu;

  const rows = listRows(state);
  const coord = menu.gridIndex ?? 0;
  const page = coord > 5 ? 1 : 0;
  const local = coord - page * 6;

  const icx = local % 2 === 1 ? 230 : 10;
  const icy = local > 3 ? 445 : local > 1 ? 415 : 385;
  const heart = sprites.get('spr_heart');
  if (heart) drawSpriteExt(ctx, heart, 0, icx, icy, 1, 1, 0, null, 1);

  const isAct = menu.submenu === 'actgrid';
  const actRows = isAct ? (actsFor(state, menu.charturn) ?? []) : null;
  const cross = isAct ? sprites.get('spr_tenna_x') : null;

  for (let i = 0; i < 3; i++) {
    for (let col = 0; col < 2; col++) {
      const idx = page * 6 + i * 2 + col;
      const row = rows[idx];
      if (!row) continue;

      const xoffset = col === 0 ? 0 : 230;
      const yoffset = i * 30;

      let charoffset = 0;
      if (actRows?.[idx]?.actor === CHARTIME_XSLASH) {
        const strip = partnerStrip(state);
        charoffset = strip.charoffset;
        for (const h of strip.heads) {
          const head = sprites.get(h.head);
          if (head) {
            drawSpriteExt(ctx, head, 0, h.hx + xoffset, h.hy + yoffset, 1, 1, 0, h.blend, 1);
          }

          if (cross) {
            drawSpriteExt(ctx, cross, 1, h.cx + xoffset, h.cy + yoffset, 0.7, 0.7, 6, h.blend, 1);
            drawSpriteExt(ctx, cross, 1, h.cx + xoffset, h.cy + yoffset, 0.7, 0.7, 4, h.blend, 1);
          }
        }
      }

      const w = textWidth(font, row.label);

      const xscale = isAct
        ? Math.min(1, Math.max(0.5, (206 - charoffset) / Math.max(1, w)))
        : (w > 0 ? Math.min(1, 200 / w) : 1);

      drawText(ctx, font, row.label, 30 + charoffset + xoffset, 375 + yoffset,
        { xscale, color: row.usable ? '#ffffff' : 'rgb(128,128,128)' });
    }
  }

  const arrow = sprites.get('spr_morearrow');
  const bob = Math.sin(siner / 10) * 2;
  if (arrow) {
    if (page === 0 && rows.length > 6) {
      drawSpriteExt(ctx, arrow, 0, 470, 445 + bob, 1, 1, 0, null, 1);
    } else if (page === 1) {
      drawSpriteExt(ctx, arrow, 0, 470, 395 - bob, 1, -1, 0, null, 1);
    }
  }

  const sel = rows[coord];
  if (sel) {
    const lh = textHeight(font) || 26;
    const lines = (sel.descb ?? '').split('#');
    for (let i = 0; i < lines.length; i++) {
      drawText(ctx, font, lines[i], 496, 375 + i * lh, { color: 'rgb(128,128,128)' });
    }
  }

  if (menu.submenu === 'magic' && sel && spellInfo(state, sel.id)) {

    const charged = spellCost(state, menu.charturn, sel.id);
    const price = Number.isFinite(charged) ? charged : (spellInfo(state, sel.id)?.cost ?? 0);
    const pct = Math.floor((price / MAX_TENSION) * 100);
    drawText(ctx, font, `${pct}% TP`, 496, 440, { color: 'rgb(255,160,64)' });
  }

  if (isAct && (sel?.cost ?? 0) > 0) {
    const pct = gmlRound(((sel.cost ?? 0) / MAX_TENSION) * 100);
    drawText(ctx, font, `${pct}% TP`, 500, 440, { color: 'rgb(255,160,64)' });
  }
}

function statusOverlay(state) {
  const o = state.partyStatusBar;
  if (!o || !Array.isArray(o.values) || typeof o.color !== 'string') return null;
  return o;
}

function drawTargetPicker(ctx, state, sprites, font) {

  const menu = state.menu;
  const heart = sprites.get('spr_heart');
  const overlay = statusOverlay(state);
  for (let i = 0; i < 3; i++) {

    if (!slotOccupied(state, i)) continue;
    const y = 375 + i * 30;

    const maxhp = state.partyMaxhp?.[i] ?? PARTY[i].maxhp;

    drawText(ctx, font, partyNameFor(state, i), 80, y, { color: '#ffffff' });
    ctx.fillStyle = '#800000';
    ctx.fillRect(400, y + 5, 101, 16);
    const hp = state.partyHp?.[i] ?? 0;
    let hpPct = (hp / maxhp) * 100;
    if (hpPct <= -100) hpPct = -100;
    ctx.fillStyle = '#00ff00';
    if (hpPct >= 0) ctx.fillRect(400, y + 5, hpPct + 1, 16);
    else ctx.fillRect(400 + hpPct, y + 5, -hpPct + 1, 16);

    const amount = overlay?.values?.[i] ?? 0;
    if (overlay && amount > 0) {
      const lx = 400 + ((hp - amount) / maxhp) * 100;
      const rx = 400 + (hp / maxhp) * 100;
      ctx.fillStyle = overlay.color;
      ctx.fillRect(lx, y + 5, rx - lx, 16);
    }
  }
  if (heart) {
    drawSpriteExt(ctx, heart, 0, 55, 385 + menu.targetIndex * 30, 1, 1, 0, null, 1);
  }
}

function drawEnemyRow(ctx, state, sprites, font) {

  const heart = sprites.get('spr_heart');
  if (heart) drawSpriteExt(ctx, heart, 0, 55, 385, 1, 1, 0, null, 1);

  drawText(ctx, font, 'Knight', 80, 375, { color: '#ffffff' });

  ctx.fillStyle = MAROON;
  ctx.fillRect(420, 380, 80, 15);
  const hp = state.knight?.hp ?? KNIGHT_MAXHP;
  ctx.fillStyle = 'rgb(0,255,0)';
  ctx.fillRect(420, 380, Math.max(0, (hp / KNIGHT_MAXHP) * 80), 15);

  drawText(ctx, font, 'HP', 424, 364, { yscale: 0.5, color: '#ffffff' });
  drawText(ctx, font, '???', 424, 380, { yscale: 0.5, color: '#ffffff' });
}

function panelRise(frame) {
  if (frame >= 12) return 0;
  let bp = 0;
  for (let i = 0; i < frame; i++) {
    if (bp < 151) {
      const d = 152 - bp;
      bp += d < 40 ? Math.round(d / 2.5) : 30;
    } else {
      bp = 152;
    }
  }
  return 152 - bp;
}

export function drawMenu(ctx, state, sprites) {
  const menu = state.menu;
  if (!menu) return;

  if (state.knight?.endCutscene > 0) return;

  const top = 480 - BP;
  const rise = panelRise(state.frame ?? 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (rise) ctx.translate(0, rise);

  ctx.fillStyle = '#000000';
  ctx.fillRect(-10, top - 4, 710, 481 - (top - 4));
  ctx.fillStyle = rgb(BCOLOR);
  ctx.fillRect(-10, top - 3, 710, 1);
  ctx.fillRect(-10, top + 34, 710, 2);

  const panels = state.partySprites?.length ?? 3;

  const chunks = state.partyChunks ?? CHUNK;
  for (let c = 0; c < panels; c++) {
    const chunk = chunks[c] ?? CHUNK[c];
    const mmy = menu.mmy[c];

    const color = charColorFor(state, c);
    const active = menu.open && menu.charturn === c;

    ctx.fillStyle = rgb(active ? color : [128, 128, 128]);
    ctx.fillRect(chunk, top - 3 + mmy, PANEL_W, top - 2 - (top - 3 + mmy));
    ctx.fillStyle = '#000000';
    ctx.fillRect(chunk + 2, top - 1 + mmy, 208, 34);

    if (active && menu.submenu) {

      selectionMatrix(ctx, chunk, top, menu.siner, color);
    } else if (active) {
      selectionMatrix(ctx, chunk, top, menu.siner, color);

      for (let b = 0; b < BUTTONS.length; b++) {
        const spec = BUTTONS[b];
        const entry = sprites.get(spec.sprite(c));
        if (!entry) continue;
        const lit = menu.selected[c] === b ? 1 : 0;
        drawSpriteExt(ctx, entry, lit, chunk + spec.x, 485 - BP, 1, 1, 0, null, 1);
      }
    }

    const stats = partyArtFor(state, c);
    const head = sprites.get(stats.head);
    const name = sprites.get(stats.name);
    if (head) drawSpriteExt(ctx, head, 0, chunk + 13, B_OFFSET + mmy, 1, 1, 0, null, 1);
    if (name) drawSpriteExt(ctx, name, 0, chunk + 51, B_OFFSET + 3 + mmy, 1, 1, 0, null, 1);

    const hp = state.partyHp?.[c] ?? 0;
    const maxhp = state.partyMaxhp?.[c] ?? PARTY[c].maxhp;

    const shown = hp;
    let hpColor = '#ffffff';
    if (hp / maxhp <= 0.25) hpColor = '#ffff00';
    if (hp <= 0) hpColor = '#ff0000';

    const status = statusOverlay(state);
    const amount = status?.values?.[c] ?? 0;
    const currentColor = status && amount > 0 ? status.color : hpColor;
    drawSpriteText(ctx, sprites, FONTS.hp, shown, chunk + 160, B_OFFSET - 2 + mmy,
      { halign: 'right', color: currentColor });
    drawSpriteText(ctx, sprites, FONTS.hp, maxhp, chunk + 205, B_OFFSET - 2 + mmy,
      { halign: 'right', color: hpColor });

    const hpname = sprites.get('spr_hpname');
    if (hpname) drawSpriteExt(ctx, hpname, 0, chunk + 109, B_OFFSET + 11 + mmy, 1, 1, 0, null, 1);
    const slash = sprites.get('spr_hpslash');
    if (slash) drawSpriteExt(ctx, slash, 0, chunk + 159, B_OFFSET - 4 + mmy, 1, 1, 0, null, 1);

    ctx.fillStyle = MAROON;
    ctx.fillRect(chunk + 128, B_OFFSET + 11 + mmy, 75, 8);
    if (hp > 0) {
      ctx.fillStyle = rgb(color);
      ctx.fillRect(chunk + 128, B_OFFSET + 11 + mmy, Math.ceil((hp / maxhp) * 75), 8);

      if (status && amount > 0) {
        const lx = Math.ceil(((hp - amount) / maxhp) * 75);
        const rx = Math.ceil((hp / maxhp) * 75);
        ctx.fillStyle = status.color;
        ctx.fillRect(chunk + 128 + lx, B_OFFSET + 11 + mmy, rx - lx, 8);
      }
    }
  }

  if (rise) ctx.translate(0, -rise);
  const font = loadFont();

  if (
    menu.open &&
    (menu.submenu === 'item' || menu.submenu === 'magic' || menu.submenu === 'actgrid')
  ) {
    drawItemList(ctx, state, sprites, font, menu.siner);
  } else if (menu.open && menu.submenu === 'target') {
    drawTargetPicker(ctx, state, sprites, font);
  } else if (
    menu.open &&
    (menu.submenu === 'enemy' || menu.submenu === 'actpick'
      || menu.submenu === 'spellenemy' || menu.submenu === 'spare')
  ) {

    drawEnemyRow(ctx, state, sprites, font);
  } else if (menu.open) {

    if (menu.submenu && !warnedSubmenus.has(menu.submenu)) {
      warnedSubmenus.add(menu.submenu);
      console.error(
        `render/menu.js: no branch draws submenu '${menu.submenu}' — ` +
          'it will look like the button does nothing. See sim/menu.js for the names.',
      );
    }
    drawBattleMsg(ctx, state, font);
  }

  if (!menu.open && state.pendingAct) drawBattleMsg(ctx, state, font);

  ctx.restore();
}

const warnedSubmenus = new Set();

function drawBattleMsg(ctx, state, font) {
  if (!font?.ready || !state.battlemsg) return;

  const lh = 28;

  const { lines, styles } = writerLines(state.battlemsg, {
    charline: 33, timer: state.battlemsgTimer ?? 1e9, cps: 1,
  });
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;

    drawText(ctx, font, lines[i], 30, 376 + i * lh, {
      color: rgb(c_white), colors: styleColors(styles[i]), advance: 16, special: 1,
    });
  }
}
