


import { rngChoose } from './rng.js';


export const BOLT_SPEED = 8;

export const BOLT_START = 30;

export const ROW_PITCH = 38;

export const BAR_X = 2;
export const BAR_Y = 365;



function buildBolts(rng, havechar, oneButton) {
  const charbolt = havechar.map((h) => (h ? 1 : 0));
  const bolttotal = charbolt.reduce((a, b) => a + b, 0);
  if (bolttotal === 0) return [];


  const diff = oneButton ? 12 : 10;


  const boltuse = [0, 0, 0];
  const bolts = [];

  for (let i = 0; i < bolttotal; i++) {
    let c = rngChoose(rng, [0, 1, 2]);
    while (!havechar[c]) c = rngChoose(rng, [0, 1, 2]);
    while (boltuse[c] >= charbolt[c]) {
      c = rngChoose(rng, [0, 1, 2]);
      while (!havechar[c]) c = rngChoose(rng, [0, 1, 2]);
    }
    bolts.push({ char: c, frame: 0, alive: true, red: false });
    boltuse[c] += 1;
  }


  let boltxoff = 0;
  let lastbolt = -1;
  for (let i = 0; i < bolttotal; i++) {
    boltxoff += lastbolt;
    bolts[i].frame = BOLT_START + boltxoff;
    if (i < bolttotal - 1 && lastbolt !== 0 && bolts[i].char !== bolts[i + 1].char) {

      lastbolt = rngChoose(rng, [0, diff, diff * 1.5]);
      bolts[i].red = true;
    } else {
      lastbolt = rngChoose(rng, [diff, diff * 1.5]);
    }
  }
  return bolts;
}



export function createFightBar(rng, order = [0, 1, 2], oneButton = true, recorded = null) {
  const havechar = [0, 1, 2].map((c) => (order.includes(c) ? 1 : 0));
  return {
    active: true,
    oneButton,
    boltx: 0,
    havechar,

    bolts: recorded ?? buildBolts(rng, havechar, oneButton),
    points: [0, 0, 0],

    pressbuffer: [0, 0, 0, 0],

    bursts: [],

    attacked: [false, false, false],

    held: false,
    heldPer: [false, false, false],
    imagetimer: 0,

    afterimages: [],
    done: false,
  };
}


function award(bar, bc, topclose) {

  if (globalThis.process?.env?.KNIGHT_BAR_DEBUG) {
    console.error(`[bar] f=${globalThis.__simFrame ?? '?'} boltx=${bar.boltx} char=${bc} close=${topclose}`);
  }
  const p = Math.abs(topclose);
  let gained;
  if (p === 0) gained = 150;
  else if (p === 1) gained = 120;
  else if (p === 2) gained = 110;
  else gained = 100 - p * 2;
  bar.points[bc] += gained;
  return { gained, critical: p === 0 };
}

function spawnBurst(bar, bolt, bc, critical) {
  bar.bursts.push({
    x: 80 + (bolt.frame - bar.boltx) * BOLT_SPEED,
    y: ROW_PITCH * bc,

    mag: critical ? 0.2 : 0.1,
    alpha: 1,
    xscale: 1,
    yscale: 1,
    critical,
    char: bc,
  });
}



export function boltCheckOneButton(bar) {
  let qualify = -1;
  let dualId = -1;
  let topclose = 999;
  for (let i = 0; i < bar.bolts.length; i++) {
    const b = bar.bolts[i];
    if (!b.alive) continue;
    const close = b.frame - bar.boltx;
    if (close < 15 && close > -5) {
      if (close === topclose) dualId = i;
      if (close < topclose) {
        topclose = close;
        qualify = i;
      }
    }
  }
  for (let k = 0; k < 4; k++) bar.pressbuffer[k] = 5;
  if (qualify === -1) return 0;

  let total = 0;
  const hit = (idx) => {
    const b = bar.bolts[idx];
    const { gained, critical } = award(bar, b.char, topclose);
    spawnBurst(bar, b, b.char, critical);
    b.alive = false;
    total += gained;
  };
  hit(qualify);
  if (dualId !== -1) hit(dualId);
  return total;
}


export function boltCheck(bar, char) {
  let qualify = -1;
  let topclose = 99;
  for (let i = 0; i < bar.bolts.length; i++) {
    const b = bar.bolts[i];
    if (b.char !== char || !b.alive) continue;
    const close = b.frame - bar.boltx;
    if (close < 15 && close > -5 && close < topclose) {
      topclose = close;
      qualify = i;
    }
  }

  bar.pressbuffer[char + 1] = 5;
  if (qualify === -1) return 0;
  const b = bar.bolts[qualify];
  const { gained, critical } = award(bar, char, topclose);
  spawnBurst(bar, b, char, critical);
  b.alive = false;
  return gained;
}



export function stepFightBar(bar, press = false, perChar = [false, false, false]) {

  if (!bar.active) return;

  for (const b of bar.bolts) {
    if (b.alive && b.frame - bar.boltx < -5) b.alive = false;
  }


  if (bar.imagetimer === 0) {
    for (const b of bar.bolts) {
      const close = b.frame - bar.boltx;
      if (b.alive && close >= 0) {
        bar.afterimages.push({
          x: 80 + close * BOLT_SPEED, y: ROW_PITCH * b.char, alpha: 0.4,
        });
      }
    }
  }


  for (const b of bar.bolts) {
    if (b.alive && b.frame - bar.boltx < -5) b.alive = false;
  }


  for (let i = 0; i < 3; i++) {
    if (!bar.havechar[i] || bar.attacked[i]) continue;
    if (!bar.bolts.some((b) => b.alive && b.char === i)) {
      bar.attacked[i] = true;
      break;
    }
  }

  if (bar.oneButton) {
    if (press && !bar.held) boltCheckOneButton(bar);
    bar.held = press;
  } else {
    for (let c = 0; c < 3; c++) {
      const down = perChar[c] && bar.havechar[c] === 1;
      if (down && !bar.heldPer[c]) boltCheck(bar, c);
      bar.heldPer[c] = down;
    }
  }

  bar.imagetimer = bar.imagetimer > 0 ? 0 : bar.imagetimer + 1;
  bar.boltx += 1;
  for (let k = 0; k < 4; k++) bar.pressbuffer[k] -= 1;


  for (const s of bar.bursts) {
    s.alpha -= 0.1;
    s.xscale += s.mag;
    s.yscale += s.mag;
    s.x += ((1 - 10 * s.xscale) * s.mag) / 2.7;
    s.y += ((1 - 38 * s.yscale) * s.mag) / 2.5;
  }
  bar.bursts = bar.bursts.filter((s) => s.alpha >= 0);


  for (const a of bar.afterimages) a.alpha -= 0.05;
  bar.afterimages = bar.afterimages.filter((a) => a.alpha > 0);

  if (bar.attacked.every((a, i) => a || !bar.havechar[i])) bar.done = true;


  if (bar.done) bar.posttimer = (bar.posttimer ?? 0) + 1;

  bar.holdDone = (bar.posttimer ?? 0) > 50;
}


export function boltScreenX(bar, bolt, originX) {
  return originX + 80 + (bolt.frame - bar.boltx) * BOLT_SPEED;
}


export function fightTp(accuracy) {
  return Math.round(accuracy / 10);
}
