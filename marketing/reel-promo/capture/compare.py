# Compara cada <estado>.png con su <estado>.check.png (render del HTML congelado).
import sys, glob, json
from PIL import Image, ImageChops
flt = sys.argv[1] if len(sys.argv) > 1 else ''
rows = []
for png in sorted(glob.glob('marketing/reel-promo/capturas/**/*.png', recursive=True)):
    if png.endswith('.check.png') or png.endswith('.completa.png') or 'piezas' in png or '_assets' in png or flt not in png: continue
    chk = png[:-4] + '.check.png'
    try:
        a = Image.open(png).convert('RGB'); b = Image.open(chk).convert('RGB')
    except FileNotFoundError:
        continue
    if a.size != b.size:
        rows.append((png, 'tamaño distinto')); continue
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)
    pct = 100 * d.histogram()[255] / (a.size[0] * a.size[1])
    rows.append((png.replace(chr(92), '/').split('capturas/')[1], round(pct, 2)))
for r in rows: print(f'{r[1]!s:>8}  {r[0]}')
