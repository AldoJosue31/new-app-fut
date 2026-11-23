# Hoja de contacto de un bloque: python sheet.py <bloque> <desktop|mobile> [salida]
import sys, glob, os
from PIL import Image, ImageDraw
blk, dev = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else f'marketing/reel-promo/capture/out/sheet-{blk}-{dev}.jpg'
fs = sorted(f for f in glob.glob(f'marketing/reel-promo/capturas/{blk}/{dev}/*.png') if not f.endswith('.check.png') and not f.endswith('.completa.png'))
w, h, cols = (480, 300, 3) if dev == 'desktop' else (240, 520, 6)
rows = (len(fs) + cols - 1) // cols
W = Image.new('RGB', (w * cols, (h + 22) * rows), (10, 10, 10))
d = ImageDraw.Draw(W)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((w, h))
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    W.paste(im, (x, y + 22)); d.text((x + 6, y + 5), os.path.basename(f), fill=(255, 220, 0))
W.save(out, quality=82); print(out)
