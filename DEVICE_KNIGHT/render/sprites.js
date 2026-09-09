



const BASE = new URL('../assets/sprites/', import.meta.url).href;


export const SPRITE_FOR = {
  obj_heart: 'spr_dodgeheart',
  obj_growtangle: 'spr_battlebg_0',
  obj_roaringknight_split_bullet: 'spr_roaringknight_tooth',
  obj_roaringknight_fountain_bullet: 'spr_rk_fountain_bullet',
  obj_roaringknight_slash: 'spr_rk_quickslash_marker',
  obj_knight_enemy: 'spr_roaringknight_idle',
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);

    img.onerror = () => resolve(null);
    img.src = src;
  });
}



export async function loadSprites(base = BASE) {
  const res = await fetch(base + 'manifest.json');
  if (!res.ok) throw new Error(`sprite manifest not found at ${base}manifest.json`);
  const manifest = await res.json();

  const out = new Map();
  const jobs = Object.entries(manifest).map(async ([name, meta]) => {
    const frames = await Promise.all(meta.files.map((f) => loadImage(base + f)));
    out.set(name, { meta, frames: frames.filter(Boolean) });
  });
  await Promise.all(jobs);
  return out;
}
