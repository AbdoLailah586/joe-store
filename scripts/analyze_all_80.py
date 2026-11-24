import json

with open('whatsapp_rapidocr_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    txt = ' | '.join(item['texts'])
    print(f"[{item['index']:02d}] {item['file']} -> {txt}")
