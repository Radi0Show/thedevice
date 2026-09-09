


import { createInput } from './state.js';

const DEADZONE = 0.5;

function livePads() {
  const list = (typeof navigator !== 'undefined' && navigator.getGamepads)
    ? navigator.getGamepads()
    : [];
  const out = [];
  for (const p of list) if (p && p.connected) out.push(p);
  return out;
}

export function bindGamepad() {

  let startWas = false;
  let selectWas = false;

  return {

    read() {
      const over = {};
      for (const p of livePads()) {
        const b = (i) => !!p.buttons?.[i]?.pressed;
        const ax = (i) => p.axes?.[i] ?? 0;
        if (b(12) || ax(1) < -DEADZONE) over.up = true;
        if (b(13) || ax(1) > DEADZONE) over.down = true;
        if (b(14) || ax(0) < -DEADZONE) over.left = true;
        if (b(15) || ax(0) > DEADZONE) over.right = true;
        if (b(0)) over.confirm = true;
        if (b(1)) {
          over.focus = true;
          over.cancel = true;
        }
        if (b(2) || b(3)) over.button3 = true;
        if (b(4) || b(5)) over.focus = true;
      }
      return createInput(over);
    },



    driverEdges() {
      let start = false;
      let select = false;
      for (const p of livePads()) {
        if (p.buttons?.[9]?.pressed) start = true;
        if (p.buttons?.[8]?.pressed) select = true;
      }
      const edges = { exit: start && !startWas, reset: select && !selectWas };
      startWas = start;
      selectWas = select;
      return edges;
    },

    connected() {
      return livePads().length > 0;
    },

    dispose() {},
  };
}
