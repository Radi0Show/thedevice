

export const SWORDCOLORS = {
  1: [68, 82, 255],
  2: [101, 122, 255],
  3: [149, 147, 255],
  default: [0, 0, 255],
};

export function getSwordcolor(state) {
  return SWORDCOLORS[state?.kaizo?.swordtype] ?? SWORDCOLORS.default;
}

export const KAIZO_TELEGRAPH_COLOR = [134, 162, 255];

export const RGB_AFTERIMAGE_CYCLE = [
  [255, 0, 0],
  [255, 160, 64],
  [255, 255, 0],
  [0, 255, 0],
  [0, 255, 255],
  [0, 0, 255],
  [128, 0, 128],
];

export function nextAfterimageColor(con) {
  const next = con + 1;
  return { con: next >= 7 ? 0 : next, color: RGB_AFTERIMAGE_CYCLE[next - 1] };
}
