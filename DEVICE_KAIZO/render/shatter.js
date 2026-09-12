


import { rgb } from './draw/gm.js';



export function shatterFragmentCount(entry) {
  return entry?.frames?.length ?? 0;
}



export function sliceShatter(entry, { width, height, blend, paint = null, count = 0 }) {
  const total = shatterFragmentCount(entry);
  if (!total || !(width > 0) || !(height > 0)) return [];
  const n = count > 0 ? Math.min(count, total) : total;


  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const source = document.createElement('canvas');
  source.width = w;
  source.height = h;
  const sg = source.getContext('2d');
  sg.imageSmoothingEnabled = false;
  if (paint) {

    const art = document.createElement('canvas');
    art.width = w;
    art.height = h;
    const ag = art.getContext('2d');
    ag.imageSmoothingEnabled = false;
    paint(ag, w, h);
    sg.drawImage(art, 0, 0);
    if (blend) {
      sg.globalCompositeOperation = 'multiply';
      sg.fillStyle = rgb(blend);
      sg.fillRect(0, 0, w, h);
      sg.globalCompositeOperation = 'destination-in';
      sg.drawImage(art, 0, 0);
      sg.globalCompositeOperation = 'source-over';
    }
  } else {
    sg.fillStyle = rgb(blend ?? [255, 255, 255]);
    sg.fillRect(0, 0, w, h);
  }

  const out = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('canvas');
    c.width = source.width;
    c.height = source.height;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(source, 0, 0);

    g.globalCompositeOperation = 'destination-in';
    g.drawImage(entry.frames[i], 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    out.push(c);
  }
  return out;
}



export function drawShatterFragment(ctx, image, x, y, {
  ox = 0, oy = 0, xscale = 1, yscale = 1, angle = 0, alpha = 1,
} = {}) {
  if (!image || !(alpha > 0)) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if (angle) ctx.rotate((-angle * Math.PI) / 180);
  if (xscale !== 1 || yscale !== 1) ctx.scale(xscale, yscale);
  ctx.drawImage(image, -ox, -oy);
  ctx.restore();
}
