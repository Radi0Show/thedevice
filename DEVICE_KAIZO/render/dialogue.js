


import { drawSpriteExt } from './draw/gm.js';
import { loadFont, drawText, styleColors } from './font.js';
import { writerLines } from '../sim/dialogue.js';
import { PARTY } from '../sim/actors.js';

const HSPACE = 9;
const VSPACE = 20;



export function balloonGeometry(text) {
  const ax = PARTY[1].x + 92;
  const ay = PARTY[1].y + 38;

  const styled = writerLines(text, { charline: 33, timer: 1e9 });
  const lines = styled.lines;
  const formatted = styled.formatted ?? lines.join('&');
  const stringmax = Math.max(...lines.map((l) => l.length));
  const bw = stringmax * HSPACE + 10;

  const bh = lines.length * VSPACE + 5;
  const writingX = ax + 5;

  const writingY = ay + 3 - bh / 2;
  const boxY = Math.floor(writingY);
  return {
    ax, ay, formatted, lines, bw, bh, writingX, writingY, boxY,

    tailScale: bh < 40 ? 0.5 : 1,
  };
}

export function drawDialogue(ctx, state, sprites) {
  const dlg = state.dialogue;
  if (!dlg?.text) return;
  const font = loadFont('../assets/fonts', 'fnt_dotumche');
  if (!font?.ready) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);


  const g = balloonGeometry(dlg.text);
  const { ax, ay, bw, bh, writingX, writingY, boxY, tailScale } = g;


  ctx.fillStyle = '#fff';
  ctx.fillRect(writingX - 10, boxY - 5, bw + 11, bh + 1);
  ctx.fillRect(writingX - 5, boxY - 10, bw + 1, bh + 11);


  const parts = sprites.get('spr_battleblcon_parts');
  if (parts) {
    ctx.save();
    ctx.translate(ax - 20, ay);
    ctx.scale(-1, tailScale);
    drawSpriteExt(ctx, parts, 4, 0, 0, 1, 1, 0, null, 1);
    ctx.restore();
  }


  const { lines, styles } = writerLines(dlg.text, { charline: 33, timer: dlg.timer });
  for (let i = 0; i < lines.length; i++) {
    drawText(ctx, font, lines[i], writingX, writingY + i * VSPACE, {
      color: 'rgb(0,0,0)', colors: styleColors(styles[i]), advance: HSPACE,
    });
  }
  ctx.restore();
}
