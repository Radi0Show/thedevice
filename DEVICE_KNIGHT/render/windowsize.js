

export function deltaruneMultiplier(displayW, displayH, frameW = 640, frameH = 480) {
  let m = 1;
  for (let w = 2; w < 12; w += 1) {
    if (displayW > frameW * w && displayH > frameH * w) m = w;
  }
  return m;
}
