// THE SPRITE ATLAS. Every frame the extraction wrote, loaded lazily by
// name, with the manifest's dims and origins — GameMaker positions
// everything relative to the origin and the PNGs cannot carry it.

export async function loadAtlas(base) {
  const manifest = await fetch(`${base}sprites/manifest.json`).then((r) => r.json());
  const cache = new Map();
  const tintCache = new Map();
  const missing = new Set();

  function frame(name, index = 0) {
    if (!name) return null;
    const key = `${name}_${index}`;
    if (cache.has(key)) return cache.get(key);
    if (missing.has(key)) return null;
    // Kick off the load; frames resolve within a frame or two of first use.
    const img = new Image();
    img.onload = () => cache.set(key, img);
    img.onerror = () => { missing.add(key); cache.delete(key); };
    img.src = `${base}sprites/${key}.png`;
    cache.set(key, null);
    return null;
  }

  /** Preload every frame of the named sprites; resolves when done. */
  async function preload(names) {
    const jobs = [];
    for (const name of names) {
      const m = manifest[name];
      if (!m) continue;
      for (let i = 0; i < m.frames; i++) {
        const key = `${name}_${i}`;
        jobs.push(new Promise((res) => {
          const img = new Image();
          img.onload = () => { cache.set(key, img); res(); };
          img.onerror = () => { missing.add(key); res(); };
          img.src = `${base}sprites/${key}.png`;
        }));
      }
    }
    await Promise.all(jobs);
  }

  /** image_blend: multiply by a colour, keeping the alpha. */
  function tinted(img, css) {
    const key = `${img.src}|${css}`;
    let c = tintCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = css;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0);
    tintCache.set(key, c);
    return c;
  }

  return { manifest, frame, preload, tinted, meta: (n) => manifest[n] ?? null };
}
