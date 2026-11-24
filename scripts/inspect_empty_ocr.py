import os
from PIL import Image

folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"

# Let's inspect images that had low/empty OCR
empty_indices = [10, 13, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 39, 41, 42, 43, 46, 48, 50, 53, 55, 56, 58, 64]

import json
with open('catalog_intake_whatsapp.json', 'r', encoding='utf-8-sig') as f:
    ocr_data = json.load(f)

for idx in empty_indices:
    it = ocr_data[idx-1]
    fname = it['file']
    fpath = os.path.join(folder, fname)
    im = Image.open(fpath)
    # Get colors or basic info
    colors = im.getcolors(maxcolors=1000)
    print(f"[{idx}] {fname} size={im.size}")
