#!/usr/bin/env python3
"""Generate the OG card PNGs from the site's own pixel glyphs.

Reads GLYPHS out of shared/pixeltext.js — one source of truth for the face —
and writes og/*.png (1200x630). Stdlib only, so it runs anywhere Python does:
the PNG encoder below is the whole dependency story. Re-run after changing
the glyph table or adding a card; output is deterministic.

    python3 tools/gen-og.py
"""

import re
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GRAY = (128, 128, 128)
FAINT = (58, 58, 58)
SOUL = (255, 0, 0)

COLS, ROWS, ADVANCE = 5, 7, 6

HEART = [0b01100110, 0b11111111, 0b11111111, 0b11111111,
         0b01111110, 0b00111100, 0b00011000]


def load_glyphs():
    src = (ROOT / 'shared' / 'pixeltext.js').read_text()
    body = src[src.index('const GLYPHS'):src.index('};', src.index('const GLYPHS'))]
    glyphs = {}
    for m in re.finditer(r"^\s*(?:'(.)'|(\w)):\s*\[([^\]]*)\]", body, re.M):
        key = m.group(1) or m.group(2)
        glyphs[key] = [int(v.strip(), 0) for v in m.group(3).split(',')]
    if 'A' not in glyphs or len(glyphs['A']) != ROWS:
        sys.exit('failed to parse GLYPHS out of shared/pixeltext.js')
    return glyphs


class Canvas:
    def __init__(self):
        self.px = bytearray(W * H * 3)

    def rect(self, x, y, w, h, color):
        for yy in range(max(0, y), min(H, y + h)):
            row = (yy * W + max(0, x)) * 3
            for _ in range(max(0, min(W, x + w) - max(0, x))):
                self.px[row:row + 3] = bytes(color)
                row += 3

    def frame(self, x, y, w, h, t, color):
        self.rect(x, y, w, t, color)
        self.rect(x, y + h - t, w, t, color)
        self.rect(x, y, t, h, color)
        self.rect(x + w - t, y, t, h, color)

    def bitmap(self, rows, width, cx, y, scale, color):
        x0 = cx - (width * scale) // 2
        for ry, bits in enumerate(rows):
            for rx in range(width):
                if (bits >> (width - 1 - rx)) & 1:
                    self.rect(x0 + rx * scale, y + ry * scale, scale, scale, color)

    def text(self, glyphs, s, cx, y, scale, color):
        total = len(s) * ADVANCE - 1
        x = cx - (total * scale) // 2
        for ch in s.upper():
            rows = glyphs.get(ch, glyphs['?'])
            for ry in range(ROWS):
                for rx in range(COLS):
                    if (rows[ry] >> (COLS - 1 - rx)) & 1:
                        self.rect(x + rx * scale, y + ry * scale, scale, scale, color)
            x += ADVANCE * scale

    def png(self, path):
        def chunk(tag, data):
            return (struct.pack('>I', len(data)) + tag + data
                    + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))
        raw = b''.join(b'\0' + bytes(self.px[y * W * 3:(y + 1) * W * 3])
                       for y in range(H))
        path.write_bytes(
            b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def card(glyphs, title, sub):
    c = Canvas()
    c.rect(0, 0, W, H, BLACK)
    c.frame(40, 40, W - 80, H - 80, 4, FAINT)
    c.bitmap(HEART, 8, W // 2, 150, 8, SOUL)
    c.text(glyphs, title, W // 2, 270, 10 if len(title) > 10 else 14, WHITE)
    c.text(glyphs, sub, W // 2, 420, 4, GRAY)
    return c


def main():
    glyphs = load_glyphs()
    out = ROOT / 'og'
    out.mkdir(exist_ok=True)
    card(glyphs, 'THE DEVICE', 'SELECT A DEVICE.').png(out / 'device.png')
    card(glyphs, 'DEVICE_KNIGHT', 'THE ROARING KNIGHT').png(out / 'knight.png')
    for f in ('device.png', 'knight.png'):
        print(f'og/{f}: {(out / f).stat().st_size} bytes')


if __name__ == '__main__':
    main()
