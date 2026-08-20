#!/usr/bin/env python3
"""THE VESSEL — regenerate assets/room/vessel_*.png from the kris_*.png set.

The room's player sprite becomes the grey, brown-haired vessel (the
character-creator look): monochrome body, brown hair, the scarf slash
remapped to a white chest stripe. This is a REGION-AWARE palette map over
the existing frames, so every pose and frame stays pixel-identical in
silhouette — only the colours move.

Regions, derived per frame rather than hardcoded:
  - the FACE is every #75fbed pixel (absent on the up-facing frames);
  - the HAIR is the dark navy in the head band — rows up to just below the
    lowest face row (up-frames: the top 40% of the sprite's bounding box);
  - everything else navy (outline, pants, boots) goes near-black;
  - the armour blues and the scarf become the sweater's greys and stripe.

Run it after changing PALETTE, then hard-refresh the room.
"""

import glob
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOM = os.path.join(HERE, '..', 'assets', 'room')

NAVY = (0x0b, 0x0b, 0x3b)      # hair + outline + pants, disambiguated by row
FACE = (0x75, 0xfb, 0xed)
ARMOR_MID = (0x6a, 0x7b, 0xc4)
ARMOR_HI = (0xc7, 0xe3, 0xf2)
SCARF = (0xeb, 0x00, 0x95)

PALETTE = {
    'hair':      (0x6b, 0x3a, 0x2e),   # warm brown
    'face':      (0xd8, 0xd8, 0xd8),   # pale grey
    'dark':      (0x20, 0x20, 0x24),   # outline / pants / boots
    'sweater':   (0x9a, 0x9a, 0x9a),   # the mid grey
    'sweater_hi':(0xec, 0xec, 0xec),   # the light grey
    'stripe':    (0xff, 0xff, 0xff),   # the scarf slash, now a chest stripe
}


def convert(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()

    # the head band: down/left/right frames carry the face; up frames don't
    face_rows = [y for y in range(h) for x in range(w) if px[x, y][:3] == FACE and px[x, y][3] > 0]
    opaque_rows = [y for y in range(h) for x in range(w) if px[x, y][3] > 0]
    top = min(opaque_rows)
    if face_rows:
        hair_bottom = max(face_rows) + 1
    else:
        hair_bottom = top + int((max(opaque_rows) - top) * 0.40)

    out = Image.new('RGBA', (w, h))
    po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                po[x, y] = (0, 0, 0, 0)
                continue
            rgb = (r, g, b)
            if rgb == NAVY:
                key = 'hair' if y <= hair_bottom else 'dark'
            elif rgb == FACE:
                key = 'face'
            elif rgb == ARMOR_MID:
                key = 'sweater'
            elif rgb == ARMOR_HI:
                key = 'sweater_hi'
            elif rgb == SCARF:
                key = 'stripe'
            else:
                # an unmapped colour is a loud error, not a silent pass-through
                raise SystemExit(f'{path}: unmapped colour #{r:02x}{g:02x}{b:02x} at {x},{y}')
            po[x, y] = (*PALETTE[key], a)
    return out


def main():
    frames = sorted(glob.glob(os.path.join(ROOM, 'kris_*.png')))
    if not frames:
        raise SystemExit('no kris_*.png frames found')
    for f in frames:
        out = convert(f)
        dest = f.replace('kris_', 'vessel_')
        out.save(dest)
        print('wrote', os.path.relpath(dest, os.path.join(HERE, '..')))


if __name__ == '__main__':
    main()
