import re

with open('src/data/seedProducts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

ids = re.findall(r"id:\s*['\"]([^'\"]+)['\"]", content)
print(f"Total seed products: {len(ids)}")
for pid in ids:
    if 'case' in pid.lower() or 'cover' in pid.lower():
        print(f"Case product: {pid}")
