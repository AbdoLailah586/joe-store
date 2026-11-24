import os, json, re

with open('catalog_intake_whatsapp.json', 'r', encoding='utf-8-sig') as f:
    ocr_data = json.load(f)

for idx, it in enumerate(ocr_data):
    fname = it.get('file', '')
    txt = it.get('text', '')
    lines = it.get('lines', [])
    full = ' '.join(lines) if lines else txt
    full_clean = full.replace('\n', ' ')
    print(f"[{idx+1}] {fname} -> {full_clean}")
