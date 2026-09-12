

export function scrChildbulletCopy(child, parent) {
  for (const f of [
    'damage', 'grazepoints', 'timepoints', 'inv', 'target',
    'grazed', 'grazetimer',
  ]) {
    const v = parent[f];
    if (v !== undefined && v !== -1) child[f] = v;
  }
  child.element = parent.element;
  return child;
}
