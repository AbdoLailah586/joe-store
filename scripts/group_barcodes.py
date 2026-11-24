import json
import re
from collections import defaultdict

with open('catalog_intake_cases.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

barcode_groups = defaultdict(list)
no_barcode = []

for entry in data:
    fname = entry.get('file', '')
    raw_text = entry.get('text', '')
    lines = entry.get('lines', [])
    full_text = ' '.join(lines) if lines else raw_text

    # Extract 10-14 digit barcode
    bc_match = re.search(r'#?(\d{10,14})', full_text)
    # Extract price
    price_match = re.search(r'(\d{2,4})\.00', full_text)
    price = price_match.group(1) if price_match else ''
    
    # Extract cover name
    title_match = re.search(r'COVER\s+([A-Z0-9_\s\u0600-\u06FF]+)', full_text, re.IGNORECASE)
    title = title_match.group(0).strip() if title_match else ''

    item = {
        'file': fname,
        'price': price,
        'title': title,
        'text': full_text[:100].replace('\n', ' ')
    }

    if bc_match:
        bc = bc_match.group(1)
        barcode_groups[bc].append(item)
    else:
        no_barcode.append(item)

print(f"Total photos: {len(data)}")
print(f"Distinct barcodes found: {len(barcode_groups)}")
print(f"Photos with detected barcode: {sum(len(v) for v in barcode_groups.values())}")
print(f"Photos without detected barcode: {len(no_barcode)}")

print("\n--- Top Barcode Groups (Inventory SKUs) ---")
for bc, group in sorted(barcode_groups.items(), key=lambda x: len(x[1]), reverse=True):
    titles = set(x['title'] for x in group if x['title'])
    prices = set(x['price'] for x in group if x['price'])
    print(f"Barcode: {bc} | Count: {len(group)} photos | Price: {list(prices)} | Titles: {list(titles)[:2]}")
