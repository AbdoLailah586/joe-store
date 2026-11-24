import os, json, glob
from PIL import Image

folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"
files = sorted([f for f in os.listdir(folder) if f.endswith('.jpeg') or f.endswith('.jpg') or f.endswith('.png')])

with open('catalog_intake_whatsapp.json', 'r', encoding='utf-8-sig') as f:
    ocr_data = {it['file']: it.get('text', '') for it in json.load(f)}

print(f"Total files in folder: {len(files)}")

# Let's map each file to an item or product group
# We will inspect file by file
