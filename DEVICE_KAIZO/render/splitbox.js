import { c_gray as C_GRAY, tinted } from './draw/gm.js';


const SURF = 170;
const HALF = 85;


const ldx = (len, deg) => len * Math.cos((deg * Math.PI) / 180);
const ldy = (len, deg) => -len * Math.sin((deg * Math.PI) / 180);

const CHANGES = [-2, -1, 1, 2];



let shakeSeed = 0x2545f491;
function seedShake(frame) {

  let s = (frame + 1) * 0x9e3779b1;
  s ^= s >>> 15;
  s = Math.imul(s, 0x85ebca6b);
  s ^= s >>> 13;
  shakeSeed = (s >>> 0) || 1;
}
function shake() {
  shakeSeed ^= shakeSeed << 13;
  shakeSeed ^= shakeSeed >>> 17;
  shakeSeed ^= shakeSeed << 5;
  return ((shakeSeed >>> 0) % 3) - 1;
}


function choose4() {
  shakeSeed ^= shakeSeed << 13;
  shakeSeed ^= shakeSeed >>> 17;
  shakeSeed ^= shakeSeed << 5;
  return (shakeSeed >>> 0) % 4;
}

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = SURF;
  c.height = SURF;
  return c;
}

export function createSplitBox(sprites) {
  const bg = sprites.get('spr_battlebg_0');
  if (!bg || bg.frames.length < 2) return null;


  const source = makeCanvas();
  let blendKey = null;
  let seamColor = 'rgb(64,64,64)';
  function resetSource(blend) {
    blendKey = blend ? blend.join(',') : null;

    seamColor = blend
      ? `rgb(${Math.round(64 * blend[0] / 255)},${Math.round(64 * blend[1] / 255)},${Math.round(64 * blend[2] / 255)})`
      : 'rgb(64,64,64)';
    const g = source.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, SURF, SURF);
    g.imageSmoothingEnabled = false;
    const { ox, oy } = bg.meta;
    for (const f of [1, 0]) {
      g.save();
      g.translate(HALF, HALF);
      g.scale(2, 2);
      g.drawImage(blend ? tinted(bg.frames[f], blend) : bg.frames[f], -ox, -oy);
      g.restore();
    }
  }
  resetSource(null);


  let lastOrganism = null;
  let updateBox = false;

  const halfA = makeCanvas();
  const halfB = makeCanvas();


  let vChange = 0;
  let hChange = 0;
  const scratch = makeCanvas();

  function shearSource(angle, xoffset, yoffset, vertical) {
    const change = CHANGES[choose4()];
    const deviation = change - (vertical ? vChange : hChange);
    if (vertical) vChange = change;
    else hChange = change;

    const xmul = ldx(1, angle);
    const ymul = ldy(1, angle);

    const g = scratch.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, SURF, SURF);
    g.drawImage(halfA, -xmul * deviation, -ymul * deviation);
    g.drawImage(halfB, xmul * deviation, ymul * deviation);


    const abs = HALF + Math.abs(deviation);
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = seamColor;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(HALF + xoffset - xmul * abs, HALF + yoffset - ymul * abs);
    g.lineTo(HALF + xoffset + xmul * abs, HALF + yoffset + ymul * abs);
    g.stroke();
    g.restore();

    const sg = source.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, SURF, SURF);
    sg.drawImage(scratch, 0, 0);
  }



  function buildHalf(target, angle, xoffset, yoffset, vertical, side) {
    const g = target.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, SURF, SURF);

    const xmul = ldx(1, angle);
    const ymul = ldy(1, angle);
    const cx = HALF + xoffset;
    const cy = HALF + yoffset;

    const ex = (vertical ? 400 : 0) * side;
    const ey = (vertical ? 0 : 400) * side;

    g.save();
    g.beginPath();
    g.moveTo(cx - xmul * 400, cy - ymul * 400);
    g.lineTo(cx + xmul * 400, cy + ymul * 400);
    g.lineTo(cx + ex, cy + ey);
    g.closePath();
    g.clip();
    g.drawImage(source, 0, 0);
    g.restore();
    return target;
  }



  function draw(ctx, e, simFrame = 0) {

    const blend = e.image_blend;
    const key = blend ? blend.join(',') : null;
    if (e !== lastOrganism || key !== blendKey) {
      lastOrganism = e;
      resetSource(blend);
      vChange = 0;
      hChange = 0;

      updateBox = true;
    }
    const distance = e.distance ?? 0;
    const vertical = !!e.vertical;
    const diagonal = !!e.diagonal;

    let splid = vertical ? Math.round(distance) : 0;
    let dist = vertical ? 0 : Math.round(distance);
    let angle = (e.angle ?? 0) + (vertical ? 90 : 0);
    if (diagonal) {
      splid = Math.SQRT1_2 * distance;
      dist = splid;
      angle += 45;
    }

    const xoffset = e.xoffset ?? 0;
    const yoffset = e.yoffset ?? 0;

    if (distance === 0) {

      updateBox = true;
      ctx.drawImage(source, e.x - HALF, e.y - HALF);
      return;
    }


    if (updateBox) {
      updateBox = false;
      buildHalf(halfA, angle, xoffset, yoffset, vertical, -1);
      buildHalf(halfB, angle, xoffset, yoffset, vertical, 1);
      shearSource(angle, xoffset, yoffset, vertical);
    }


    seedShake(simFrame);
    const jx = distance > 0 ? shake() : 0;
    const jy = distance > 0 ? shake() : 0;
    const jx2 = distance > 0 ? shake() : 0;
    const jy2 = distance > 0 ? shake() : 0;


    if (diagonal && vertical) {
      ctx.drawImage(halfA, e.x - splid - HALF + jx, e.y + dist - HALF + jy);
      ctx.drawImage(halfB, e.x + splid - HALF + jx2, e.y - dist - HALF + jy2);
    } else {
      ctx.drawImage(halfA, e.x - splid - HALF + jx, e.y - dist - HALF + jy);
      ctx.drawImage(halfB, e.x + splid - HALF + jx2, e.y + dist - HALF + jy2);
    }


    if ((e.con ?? 0) <= 0) return;
    if (Math.round(distance) === 0) {

      return;
    }

    const flame = sprites.get('spr_rk_split_flame_edge');
    if (!flame || !flame.frames.length) return;

    const fi = Math.floor(e.flame_index ?? 0) % flame.frames.length;
    const img = flame.frames[fi];
    const { ox, oy } = flame.meta;

    const blit = (x, y, deg) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((-deg * Math.PI) / 180);
      ctx.scale(2, 2);

      ctx.drawImage(tinted(img, C_GRAY), -ox, -oy);
      ctx.restore();
    };

    if (vertical) {
      blit(e.x - dist - 1, e.y + 2, angle);
      blit(e.x + dist + 2, e.y, angle);
    } else {
      blit(e.x + 2, e.y - dist - 1, angle + 185);
      blit(e.x, e.y + dist + 2, angle);
    }
  }

  return { draw };
}
