


import { drawSpriteExt } from './draw/gm.js';
import { loadFont, drawText } from './font.js';
import { revealed, formatWriter } from '../sim/dialogue.js';
import { PARTY } from '../sim/actors.js';

const HSPACE = 9;
const VSPACE = 20;

export function drawDialogue(ctx, state, sprites) {
  const dlg = state.dialogue;
  if (!dlg?.text) return;
  const font = loadFont('../assets/fonts', 'fnt_dotumche');
  if (!font?.ready) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);


  const ax = PARTY[1].x + 92;
  const ay = PARTY[1].y + 38;


  const formatted = formatWriter(dlg.text, 33);
  const fullLines = revealed(formatted, 1e9);
  const stringmax = Math.max(...fullLines.map((l) => l.length));
  const bw = stringmax * HSPACE + 10;

  const bh = (fullLines.length + 1) * VSPACE + 5;
  const writingX = ax + 5;

  const writingY = ay + 3 - bh / 2;
  const boxY = Math.floor(writingY);


  ctx.fillStyle = '#fff';
  ctx.fillRect(writingX - 10, boxY - 5, bw + 11, bh + 1);
  ctx.fillRect(writingX - 5, boxY - 10, bw + 1, bh + 11);


  const parts = sprites.get('spr_battleblcon_parts');
  if (parts) {
    const tailScale = bh < 40 ? 0.5 : 1;
    ctx.save();
    ctx.translate(ax - 20, ay);
    ctx.scale(-1, tailScale);
    drawSpriteExt(ctx, parts, 4, 0, 0, 1, 1, 0, null, 1);
    ctx.restore();
  }


  const lines = revealed(formatted, dlg.timer);
  for (let i = 0; i < lines.length; i++) {
    drawText(ctx, font, lines[i], writingX, writingY + i * VSPACE, {
      color: 'rgb(0,0,0)', advance: HSPACE,
    });
  }
  ctx.restore();
}
