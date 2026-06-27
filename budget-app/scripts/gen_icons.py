#!/usr/bin/env python3
"""Generate PWA / iOS icons for 우리집 가계부 (no external deps beyond Pillow)."""
from PIL import Image, ImageDraw

BLUE = (49, 130, 246)
WHITE = (255, 255, 255)


def rounded(size, radius):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BLUE)
    return img, d


def draw_icon(size):
    img, d = rounded(size, int(size * 0.22))
    s = size / 512.0
    # white "wallet / plus" mark: a rounded card with a plus
    cx, cy = size / 2, size / 2
    cw, ch = 232 * s, 168 * s
    d.rounded_rectangle([cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2],
                        radius=int(34 * s), fill=WHITE)
    # blue strip (card band)
    d.rounded_rectangle([cx - cw / 2, cy - 14 * s, cx + cw / 2, cy + 22 * s],
                        radius=int(8 * s), fill=BLUE)
    # plus sign on top-right circle
    pr = 54 * s
    pcx, pcy = cx + cw / 2 - 6 * s, cy - ch / 2 - 6 * s
    d.ellipse([pcx - pr, pcy - pr, pcx + pr, pcy + pr], fill=WHITE)
    bar = 26 * s
    th = 7 * s
    d.rounded_rectangle([pcx - bar, pcy - th, pcx + bar, pcy + th], radius=int(th), fill=BLUE)
    d.rounded_rectangle([pcx - th, pcy - bar, pcx + th, pcy + bar], radius=int(th), fill=BLUE)
    return img


def apple_icon(size):
    # iOS adds its own rounding/masking, so use a full blue square background.
    base = Image.new("RGBA", (size, size), BLUE)
    icon = draw_icon(size)
    base.alpha_composite(icon)
    return base.convert("RGB")


OUT = __file__.rsplit("/", 2)[0] + "/public"
draw_icon(192).save(OUT + "/icon-192.png")
draw_icon(512).save(OUT + "/icon-512.png")
apple_icon(180).save(OUT + "/apple-touch-icon.png")
print("icons written to", OUT)
