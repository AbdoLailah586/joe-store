import json

with open('catalog_intake_whatsapp.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

print(f"Total WhatsApp items: {len(data)}")
for i, item in enumerate(data[:35]):
    txt = item.get('text', '').replace('\n', ' ')
    if txt.strip():
        print(f"[{i}] {item.get('file')}: {txt[:120]}")
