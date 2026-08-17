// SNAPSHOT of knight-sim's sim/scenes/single.js ATTACK_MENU, taken 2026-08-17.
//
// DEVICE_INDEX imports the LIVE table from the vendored sim first, so once
// the projects are merged this file is dead weight that can never drift into
// the page. It exists only for the pre-merge, self-contained state — the
// index has to render while the sim is not connected. If you edit the
// roster upstream, this copy does not matter; if the live import ever fails
// in production, the provenance line the page prints will say SNAPSHOT.
export const SNAPSHOT_DATE = '2026-08-17';
export const ATTACK_MENU = [
  { id: 'stars', ac: 1, name: 'Stars', difficulties: [0, 1, 2], where: 'phase 1/2/3 opener' },
  { id: 'tracking11', ac: 11, name: 'Tracking Swords', difficulties: [0], where: 'phase 1 turn 2' },
  { id: 'flurry', ac: 2, name: 'Flurry (box splitter)', difficulties: [0, 1, 3], where: 'phase 1/2/3' },
  { id: 'tunnel', ac: 13, name: 'Sword Tunnel', difficulties: [0, 3, 4], where: 'phase 1/2/3' },
  { id: 'rotating', ac: 5, name: 'Rotating Slash', difficulties: [0, 1, 2], where: 'closes every phase' },
  { id: 'vortex', ac: 15, name: 'Sword Vortex + Tracking', difficulties: [0], where: 'phase 2 turn 4' },
  { id: 'tracking14', ac: 14, name: 'Tracking Swords (late)', difficulties: [0], where: 'phase 3 turn 3' },
  { id: 'roaring', ac: 9, name: 'ROARING', difficulties: [0], where: 'phase 4 finale' },
  { id: 'stream', ac: 4, name: 'X Attacks (stream)', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'swordfall', ac: 10, name: 'Swords Falling', difficulties: [0, 1], where: 'UNUSED', unused: true },
  { id: 'underbox', ac: 6, name: 'Orbs Under the Box', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'knightlines', ac: 20, name: 'Knightlines (spears)', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'swordslash', ac: 0, name: 'Swordslash (crescents)', difficulties: [0, 1], where: 'UNUSED', unused: true },
  { id: 'tunnel2', ac: 3, name: 'Sword Tunnel (revised)', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'combination', ac: 7, name: 'Combination', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'diagonal', ac: 12, name: 'Diagonal Bullets', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'rotating16', ac: 16, name: 'Rotating + Tracking', difficulties: [0], where: 'UNUSED', unused: true },
  { id: 'tracking17', ac: 17, name: 'Tracking Swords (multi)', difficulties: [0], where: 'UNUSED', unused: true },
];
