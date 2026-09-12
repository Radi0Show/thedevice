


import { createInput } from './state.js';


const KEYMAP = {
  ArrowLeft: ['left'],
  ArrowRight: ['right'],
  ArrowUp: ['up'],
  ArrowDown: ['down'],
  KeyA: ['left'],
  KeyD: ['right'],
  KeyW: ['up'],
  KeyS: ['down'],

  KeyX: ['focus', 'cancel'],

  ShiftLeft: ['focus'],
  ShiftRight: ['focus'],

  KeyZ: ['confirm'],
  Enter: ['confirm'],

  Escape: ['cancel'],

  KeyC: ['button3'],
};

export function bindKeyboard(target = window) {
  const held = new Set();
  const pressedSinceRead = new Set();

  const onDown = (ev) => {
    const actions = KEYMAP[ev.code];
    if (!actions) return;
    ev.preventDefault();
    for (const a of actions) {
      held.add(a);
      pressedSinceRead.add(a);
    }
  };
  const onUp = (ev) => {
    const actions = KEYMAP[ev.code];
    if (!actions) return;
    ev.preventDefault();
    for (const a of actions) held.delete(a);
  };
  const onBlur = () => {
    held.clear();
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);

  return {

    read() {
      const over = {};
      for (const a of held) over[a] = true;
      for (const a of pressedSinceRead) over[a] = true;
      pressedSinceRead.clear();
      return createInput(over);
    },
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
