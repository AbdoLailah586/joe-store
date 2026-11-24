import os, glob, json, re
from PIL import Image

folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"
json_path = "catalog_intake_whatsapp.json"

with open(json_path, 'r', encoding='utf-8-sig') as f:
    ocr_data = json.load(f)

print(f"Total OCR items: {len(ocr_data)}")

# Let's inspect all items and identify the products
products = []
for it in ocr_data:
    fname = it.get('file', '')
    txt = it.get('text', '')
    lines = it.get('lines', [])
    full = ' '.join(lines) if lines else txt
    
    # Check for keywords
    kw = []
    if re.search(r'freepods|oraimo|heavybass|3c', full, re.IGNORECASE):
        kw.append('Oraimo FreePods 3C')
    if re.search(r'hollyland|lark', full, re.IGNORECASE):
        kw.append('Hollyland Lark Wireless Mic')
    if re.search(r'lito|wireless bank|10000', full, re.IGNORECASE):
        kw.append('Lito Wireless Power Bank 10000mAh')
    if re.search(r'jump starter|air pump', full, re.IGNORECASE):
        kw.append('Jump Starter & Air Pump')
    if re.search(r'world tag|find my', full, re.IGNORECASE):
        kw.append('World Tag (Apple Find My)')
    if re.search(r'hunter.*67w|67w', full, re.IGNORECASE):
        kw.append('Hunter 67W GaN Charger')
    if re.search(r'hunter.*45w|45w', full, re.IGNORECASE):
        kw.append('Hunter 45W GaN Charger')
    if re.search(r'hunter.*25w|25w', full, re.IGNORECASE):
        kw.append('Hunter 25W PD Charger')
    if re.search(r'hunter.*40w|40w', full, re.IGNORECASE):
        kw.append('Hunter 40W Charger')
    if re.search(r'hunter', full, re.IGNORECASE) and not kw:
        kw.append('Hunter Fast Charger')
    if re.search(r'k30|magnetic bracket', full, re.IGNORECASE):
        kw.append('K30 Magnetic Car Mount / Bracket')

    print(f"{fname}: {kw} | Snippet: {full[:60].replace('\n', ' ')}")
