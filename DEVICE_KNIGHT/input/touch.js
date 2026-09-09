


import { createInput } from './state.js';

const DEAD_ZONE = 0.28;

const HOLD_MS = 600;

export function bindTouch({ pad, buttons = [], onReset, onExit, onAction, holdMs = HOLD_MS } = {}) {
  const held = new Set();
  const pressedSinceRead = new Set();

  const byPointer = new Map();

  const holdTimers = new Map();

  const press = (id, actions) => {
    let mine = byPointer.get(id);
    if (!mine) byPointer.set(id, (mine = new Set()));
    for (const a of actions) {
      if (!mine.has(a)) {
        mine.add(a);
        pressedSinceRead.add(a);
      }
      held.add(a);
    }
  };
  const release = (id, keep = null) => {
    const mine = byPointer.get(id);
    if (!mine) return;
    for (const a of mine) {
      if (keep && keep.has(a)) continue;
      mine.delete(a);

      let stillHeld = false;
      for (const [, set] of byPointer) if (set.has(a)) stillHeld = true;
      if (!stillHeld) held.delete(a);
    }
    if (!keep) byPointer.delete(id);
  };


  const padDirs = (ev) => {
    const r = pad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = ev.clientX - cx;
    const dy = ev.clientY - cy;
    const radius = Math.min(r.width, r.height) / 2;
    if (Math.hypot(dx, dy) < radius * DEAD_ZONE) return [];

    const a = Math.atan2(dy, dx);
    const sector = Math.round(a / (Math.PI / 4));
    return [
      ['left'], ['left', 'up'], ['up'], ['up', 'right'],
      ['right'], ['right', 'down'], ['down'], ['down', 'left'],
      ['left'],
    ][sector + 4];
  };
  const onPadMove = (ev) => {
    ev.preventDefault();
    const dirs = new Set(padDirs(ev));
    release(ev.pointerId, dirs);
    press(ev.pointerId, dirs);
  };

  const capture = (el, id) => { try { el.setPointerCapture(id); } catch {   } };
  const onPadDown = (ev) => {
    capture(pad, ev.pointerId);
    onPadMove(ev);
  };
  const onPadUp = (ev) => {
    ev.preventDefault();
    release(ev.pointerId);
  };
  if (pad) {
    pad.addEventListener('pointerdown', onPadDown);
    pad.addEventListener('pointermove', onPadMove);
    pad.addEventListener('pointerup', onPadUp);
    pad.addEventListener('pointercancel', onPadUp);
  }


  for (const { el, actions } of buttons) {
    if (!el) continue;
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      capture(el, ev.pointerId);
      el.classList.add('down');
      if (actions.includes('reset')) {

        const id = ev.pointerId;
        const timer = setTimeout(() => {
          holdTimers.delete(id);
          onExit?.();
        }, holdMs);
        holdTimers.set(id, timer);
        return;
      }
      press(ev.pointerId, actions);

      for (const a of actions) onAction?.(a);
    });
    const up = (ev) => {
      ev.preventDefault();
      el.classList.remove('down');
      release(ev.pointerId);

      const timer = holdTimers.get(ev.pointerId);
      if (timer !== undefined) {
        clearTimeout(timer);
        holdTimers.delete(ev.pointerId);
        if (ev.type === 'pointerup') onReset?.();
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  return {

    read() {
      const over = {};
      for (const a of held) over[a] = true;
      for (const a of pressedSinceRead) over[a] = true;
      pressedSinceRead.clear();
      return createInput(over);
    },
  };
}
