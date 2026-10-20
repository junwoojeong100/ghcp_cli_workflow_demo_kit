#!/usr/bin/env python3
"""Derives the slide/video screenshots from the raw UI captures made by ui_shots.js.

Reads  shots/<lang>/{before,after}-{customer,admin}.png   (2x device scale: customer 2560x1560, admin 2560x1040)
Writes crop-*.png   fixed crops used as the before/after screens at the end of the video and on the result slide
       deck-*-customer.png  the customer view without the 'Orders' card (1908x670; English 1908x761), used on the result slide

Language: DEMO_LANG=en (default) | ko.  Usage: python3 crop_shots.py [--check]  (--check compares with existing files and writes nothing)
"""
import os
import sys
from pathlib import Path

from PIL import Image

SESS = Path(__file__).resolve().parents[1]  # production-source/
LANG = os.environ.get("DEMO_LANG", "en").lower()
SHOTS = SESS / "shots" / ("ko" if LANG == "ko" else "en")

# English labels are longer, so the refund form wraps onto a second row and the result message sits lower: the English crop is taller.
CUSTOMER_H = 1190 if LANG == "en" else 1114
CUSTOMER_BOX = (320, 230, 320 + 1920, 230 + CUSTOMER_H)
ADMIN_BOX = (256, 211, 256 + 2048, 211 + 570)
DECK_X, DECK_W = 6, 1908
DECK_H = 761 if LANG == "en" else 670  # height of the customer montage on the result slide (deck/<lang>/build.js uses the same value)
GAP_BELOW_FIRST, GAP_ABOVE_LAST = 13, 36  # px of background kept around the removed 'Orders' card


def card_blocks(img):
    """Row ranges (start, end) of the white cards, found at a column inside the cards' padding."""
    bg = img.getpixel((2, 2))
    blocks, start = [], None
    for y in range(img.height):
        inside = img.getpixel((300, y)) != bg
        if inside and start is None:
            start = y
        elif not inside and start is not None:
            blocks.append((start, y - 1))
            start = None
    if start is not None:
        blocks.append((start, img.height - 1))
    return [b for b in blocks if b[1] - b[0] > 40]


def deck_customer(crop):
    blocks = card_blocks(crop)
    if len(blocks) < 3:
        raise SystemExit(f"expected 3 cards (customer, orders, refund) in the customer view, found {len(blocks)}: {blocks}")
    first_end, last_start = blocks[0][1], blocks[-1][0]
    top = crop.crop((0, 0, crop.width, first_end + 1 + GAP_BELOW_FIRST))
    bottom = crop.crop((0, last_start - GAP_ABOVE_LAST, crop.width, crop.height))
    out = Image.new("RGB", (crop.width, top.height + bottom.height), crop.getpixel((2, 2)))
    out.paste(top, (0, 0))
    out.paste(bottom, (0, top.height))
    out = out.crop((DECK_X, 0, DECK_X + DECK_W, out.height))
    canvas = Image.new("RGB", (DECK_W, DECK_H), crop.getpixel((2, 2)))
    canvas.paste(out.crop((0, 0, DECK_W, min(DECK_H, out.height))), (0, 0))
    return canvas


def main():
    check = "--check" in sys.argv
    results = {}
    for state in ("before", "after"):
        cust = Image.open(SHOTS / f"{state}-customer.png").convert("RGB")
        admin = Image.open(SHOTS / f"{state}-admin.png").convert("RGB")
        c = cust.crop(CUSTOMER_BOX)
        results[f"crop-{state}-customer.png"] = c
        results[f"crop-{state}-admin.png"] = admin.crop(ADMIN_BOX)
        results[f"deck-{state}-customer.png"] = deck_customer(c)
    bad = 0
    for name, im in results.items():
        target = SHOTS / name
        if check:
            same = target.exists() and Image.open(target).convert("RGB").tobytes() == im.tobytes() and Image.open(target).size == im.size
            print(("same     " if same else "DIFFERENT"), name, im.size)
            bad += 0 if same else 1
        else:
            im.save(target)
            print("wrote", target.relative_to(SESS), im.size)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
