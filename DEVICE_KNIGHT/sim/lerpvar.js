


import { destroy } from './entity.js';
import { lerp, scrEaseOut, scrEaseIn, scrEaseInout } from './gml.js';

export const lerpvar = {
  name: 'obj_lerpvar',

  create(e) {
    e.variable = 0;
    e.varname = 'variable';
    e.pointa = 0;
    e.pointb = 0;
    e.time = 0;
    e.maxtime = 30;
    e.target = -1;
    e.init = 0;
    e.easetype = 0;
    e.easeinout = 'out';
    e.respectglobalinteract = false;
  },

  step(e, state) {

    if (!e.target || e.target === -1 || !e.target.alive) {
      destroy(e);
      return;
    }

    if (e.init === 0) {
      if (typeof e.pointa === 'string') e.pointa = e.target[e.varname];
      e.init = 1;
    }

    e.time += 1;

    if (e.easetype === 0) {
      e.target[e.varname] = lerp(e.pointa, e.pointb, e.time / e.maxtime);
    } else if (e.easeinout === 'out') {
      e.target[e.varname] = lerp(
        e.pointa,
        e.pointb,
        scrEaseOut(e.time / e.maxtime, e.easetype),
      );
    } else if (e.easeinout === 'in') {
      e.target[e.varname] = lerp(
        e.pointa,
        e.pointb,
        scrEaseIn(e.time / e.maxtime, e.easetype),
      );
    } else if (e.easeinout === 'inout') {

      e.target[e.varname] = lerp(
        e.pointa,
        e.pointb,
        scrEaseInout(e.time / e.maxtime, e.easetype),
      );
    } else {
      throw new Error(`lerpvar easeinout "${e.easeinout}" not translated`);
    }

    if (e.time >= e.maxtime) destroy(e);
  },
};



export function scrLerpvar(
  state, spawnFn, target, varname, pointa, pointb, maxtime, easetype, easeinout,
) {
  const t = spawnFn(state, lerpvar, { x: 0, y: 0 });
  t.target = target;
  t.varname = varname;
  t.pointa = pointa;
  t.pointb = pointb;
  t.maxtime = maxtime;
  if (easetype !== undefined) t.easetype = easetype;
  if (easeinout !== undefined) t.easeinout = easeinout;
  return t;
}
