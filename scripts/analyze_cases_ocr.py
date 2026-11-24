import json
import os
import re

def analyze_ocr(json_path='catalog_intake_cases.json'):
    if not os.path.exists(json_path):
        print(f"File {json_path} does not exist yet.")
        return

    with open(json_path, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} items from {json_path}")

    items = []
    model_patterns = [
        (r'17\s*pro\s*max|17\s*promax|17\s*pm|ip\s*17\s*pro\s*max', 'iPhone 17 Pro Max'),
        (r'17\s*pro(?!max)|17\s*p(?!m)|ip\s*17\s*pro', 'iPhone 17 Pro'),
        (r'17\s*plus|ip\s*17\s*plus', 'iPhone 17 Plus'),
        (r'17(?!\s*pro|\s*plus|\s*pm)|ip\s*17(?!\s*pro)', 'iPhone 17'),
        (r'16\s*pro\s*max|16\s*promax|16\s*pm|ip\s*16\s*pro\s*max', 'iPhone 16 Pro Max'),
        (r'16\s*pro(?!max)|ip\s*16\s*pro', 'iPhone 16 Pro'),
        (r'16\s*plus|ip\s*16\s*plus', 'iPhone 16 Plus'),
        (r'16(?!\s*pro|\s*plus|\s*pm)|ip\s*16', 'iPhone 16'),
        (r'15\s*pro\s*max|15\s*promax|15\s*pm|ip\s*15\s*pro\s*max', 'iPhone 15 Pro Max'),
        (r'15\s*pro(?!max)|ip\s*15\s*pro', 'iPhone 15 Pro'),
        (r'15\s*plus|ip\s*15\s*plus', 'iPhone 15 Plus'),
        (r'15(?!\s*pro|\s*plus|\s*pm)|ip\s*15', 'iPhone 15'),
        (r'14\s*pro\s*max|14\s*promax|14\s*pm', 'iPhone 14 Pro Max'),
        (r'14\s*pro(?!max)', 'iPhone 14 Pro'),
        (r'14\s*plus', 'iPhone 14 Plus'),
        (r'14(?!\s*pro|\s*plus)', 'iPhone 14'),
        (r'13\s*pro\s*max', 'iPhone 13 Pro Max'),
        (r'13\s*pro', 'iPhone 13 Pro'),
        (r'13(?!\s*pro)', 'iPhone 13'),
        (r'12\s*pro\s*max', 'iPhone 12 Pro Max'),
        (r'12\s*pro', 'iPhone 12 Pro'),
        (r'12(?!\s*pro)', 'iPhone 12'),
        (r'11\s*pro\s*max', 'iPhone 11 Pro Max'),
        (r'11\s*pro', 'iPhone 11 Pro'),
        (r'11(?!\s*pro)', 'iPhone 11'),
        (r's24\s*ultra|s24u', 'Samsung Galaxy S24 Ultra'),
        (r's24\s*plus', 'Samsung Galaxy S24+'),
        (r's24(?!\s*ultra|\s*plus)', 'Samsung Galaxy S24'),
        (r's23\s*ultra|s23u', 'Samsung Galaxy S23 Ultra'),
        (r's23', 'Samsung Galaxy S23'),
        (r'a55', 'Samsung Galaxy A55'),
        (r'a35', 'Samsung Galaxy A35'),
        (r'a15', 'Samsung Galaxy A15'),
    ]

    for entry in data:
        fname = entry.get('file', '')
        raw_text = entry.get('text', '')
        lines = entry.get('lines', [])
        full_text = ' '.join(lines) if lines else raw_text

        # Detect phone model
        detected_model = None
        for pattern, mname in model_patterns:
            if re.search(pattern, full_text, re.IGNORECASE):
                detected_model = mname
                break

        # Detect price
        price_match = re.search(r'(\d{2,4})\.00', full_text)
        price = float(price_match.group(1)) if price_match else None

        # Detect barcode
        barcode_match = re.search(r'#?(\d{10,14})', full_text)
        barcode = barcode_match.group(1) if barcode_match else None

        # Detect Joe store item title
        title_match = re.search(r'COVER\s+([A-Z0-9_\s\u0600-\u06FF]+)', full_text, re.IGNORECASE)
        title = title_match.group(0).strip() if title_match else ''

        items.append({
            'file': fname,
            'model': detected_model or 'Unknown Model',
            'price': price,
            'barcode': barcode,
            'title': title,
            'snippet': full_text[:120].replace('\n', ' ')
        })

    # Summary
    from collections import Counter
    models_count = Counter(it['model'] for it in items)
    print("\n--- Breakdown by Phone Model ---")
    for m, c in models_count.most_common():
        print(f"  {m}: {c} images")

    # Group by barcode / title
    known_barcodes = {}
    for it in items:
        bc = it['barcode'] or it['file']
        if bc not in known_barcodes:
            known_barcodes[bc] = []
        known_barcodes[bc].append(it)

    print(f"\nTotal unique items / barcode groups: {len(known_barcodes)}")
    
    with open('catalog_intake/cases_parsed.json', 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print("Saved catalog_intake/cases_parsed.json")

if __name__ == '__main__':
    analyze_ocr()
