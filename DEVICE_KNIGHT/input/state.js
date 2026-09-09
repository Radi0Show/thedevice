


export function createInput(over = {}) {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    focus: false,
    confirm: false,
    cancel: false,
    ...over,
  };
}

export const NO_INPUT = Object.freeze(createInput());



export function makeInputTable(spec) {
  const entries = [...spec].sort((a, b) => a.from - b.from);
  const cache = entries.map(({ from, ...buttons }) => createInput(buttons));

  return function inputAt(frame) {
    let chosen = NO_INPUT;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].from <= frame) chosen = cache[i];
      else break;
    }
    return chosen;
  };
}
