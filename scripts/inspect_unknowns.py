import json

with open('catalog_intake/cases_parsed.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

unknowns = [it for it in items if it['model'] == 'Unknown Model']
print(f'Total unknown: {len(unknowns)}')
for it in unknowns[:40]:
    print(f"{it['file']}: {it['snippet']}")
