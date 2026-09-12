


import { spawn, destroy } from './entity.js';

function setView(state, x, y) {

  if (state.flag12) return;
  state.view.x = x;
  state.view.y = y;
}

export const shakeObj = {
  name: 'obj_shake',

  create(e, state) {
    e.camera = 0;
    e.shakespeed = 1;
    e.shakesign = 1;
    e.shakex = 4;
    e.shakey = 4;
    e.siner = 0;
    e.active = 0;
    e.permashake = 0;
    e.beenset = 0;
    e.mycamerax = 0;
    e.mycameray = 0;


    const live = state.entities.filter(
      (x) => x.alive && x !== e && x.type.name === 'obj_shake',
    ).length;
    if (live >= 1) {
      e.active = -1;
      destroy(e);
    }
  },

  step(e, state) {
    if (e.active !== 0) return;

    e.beenset = 1;
    e.mycamerax = state.view.x;
    e.mycameray = state.view.y;
    setView(state, e.mycamerax + e.shakex, e.mycameray + e.shakey);
    e.shakesign = -e.shakesign;
    e.active = 1;
    e.alarm[0] = e.shakespeed;
  },

  alarm: {
    0(e, state) {
      setView(
        state,
        e.mycamerax + e.shakex * e.shakesign,
        e.mycameray + e.shakey * e.shakesign,
      );

      if (e.permashake === 0) {
        if (e.shakex > 0) e.shakex -= 1;
        if (e.shakey > 0) e.shakey -= 1;
      }

      e.shakesign = -e.shakesign;
      e.alarm[0] = e.shakespeed;

      if (e.shakex === 0 && e.shakey === 0) {

        if (e.beenset) setView(state, e.mycamerax, e.mycameray);
        destroy(e);
      }
    },
  },
};



export function scrShakescreen(state, opts = null) {

  if (!state.entities) return null;
  const e = spawn(state, shakeObj, { x: 0, y: 0 });
  if (opts && e) {
    if (opts.shakex !== undefined) e.shakex = opts.shakex;
    if (opts.shakey !== undefined) e.shakey = opts.shakey;
    if (opts.shakespeed !== undefined) e.shakespeed = opts.shakespeed;
  }
  return e;
}



export function viewFor(state, e) {
  const v = state.view;
  for (const sh of state.entities) {
    if (!sh.alive || sh.type.name !== 'obj_shake') continue;
    if (sh.active !== 0) continue;
    if (!(sh.seq > (e?.seq ?? Infinity))) continue;
    return { x: v.x + sh.shakex, y: v.y + sh.shakey };
  }
  return v;
}
