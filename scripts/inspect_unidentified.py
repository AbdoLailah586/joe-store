import json, os
from PIL import Image

with open('whatsapp_rapidocr_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

few = [it for it in data if len(it['texts']) <= 2]
print(f"Total with <= 2 texts: {len(few)}")
for it in few:
    print(f"[{it['index']:02d}] {it['file']} -> {it['texts']}")
