import os, json, re

with open('catalog_intake_whatsapp.json', 'r', encoding='utf-8-sig') as f:
    raw = json.load(f)

items = []
for idx, d in enumerate(raw):
    f = d['file']
    t = d.get('text', '').replace('\n', ' ').strip()
    items.append((idx+1, f, t))

# Print grouped by pattern
for num, f, t in items:
    print(f"[{num}] {f} -> {t[:80]}")
