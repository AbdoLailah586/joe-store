import json
import os
import re
from PIL import Image

src_dir = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\جرابات"
dest_dir = r"public\product-images"
os.makedirs(dest_dir, exist_ok=True)

with open('catalog_intake_cases.json', 'r', encoding='utf-8-sig') as f:
    cases_ocr = json.load(f)

print(f"Total photos in cases folder: {len(cases_ocr)}")

# Exclude photos already added with 3D renders
already_added_files = {
    'IMG_20261120_190739_731.jpg', # Carrio Mesh
    'IMG_20261120_190802_305.jpg', # Apple Silicone
    'IMG_20261120_190811_204.jpg', # XINREEU
    'IMG_20261120_190829_196.jpg', # iPefet
    'IMG_20261120_190828_149.jpg', # Gear4
}

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

processed_products = []
seen_slugs = set()

# Process each photo into a product
for idx, entry in enumerate(cases_ocr):
    fname = entry.get('file', '')
    if fname in already_added_files:
        continue

    raw_text = entry.get('text', '')
    lines = entry.get('lines', [])
    full_text = ' '.join(lines) if lines else raw_text

    # Extract price (default 250 if not detected)
    price_match = re.search(r'(\d{2,4})\.00', full_text)
    price = int(price_match.group(1)) if price_match else 250
    if price < 50 or price > 2000:
        price = 250

    # Extract model
    model = 'iPhone 17 Pro Max'
    for pat, mname in model_patterns:
        if re.search(pat, full_text, re.IGNORECASE):
            model = mname
            break

    # Extract title / brand from Joe Store sticker
    brand = 'Joe Store'
    title_match = re.search(r'COVER\s+([A-Z0-9_\s\u0600-\u06FF]+)', full_text, re.IGNORECASE)
    detected_title = title_match.group(0).strip() if title_match else ''
    
    # Clean up title
    detected_title = re.sub(r'\d+\.?\d*', '', detected_title).strip()
    detected_title = re.sub(r'#.*', '', detected_title).strip()

    if 'CARBOON VIPZ' in full_text.upper() or 'VIPZ' in full_text.upper():
        brand = 'VIPZ'
        name_ar = f'جراب كفر VIPZ كربون فايبر أنيق - {model}'
        name_en = f'VIPZ Carbon Fiber Case - {model}'
    elif 'NEW CASE' in full_text.upper():
        brand = 'New Case'
        name_ar = f'جراب كفر New Case بيزنس ماج سيف - {model}'
        name_en = f'New Case Business MagSafe Case - {model}'
    elif 'HDCI' in full_text.upper():
        brand = 'HDCI'
        name_ar = f'جراب كفر HDCI جلد فاخر ماج سيف - {model}'
        name_en = f'HDCI Luxury Leather MagSafe Case - {model}'
    elif 'TADAGEE' in full_text.upper():
        brand = 'Tadagee'
        name_ar = f'جراب كفر Tadagee جلد بمحفظة كروت مدمجة - {model}'
        name_en = f'Tadagee Leather Wallet Drop Protection Case - {model}'
    elif 'TOMY' in full_text.upper() or 'HILFIGER' in full_text.upper():
        brand = 'Tommy Hilfiger'
        name_ar = f'جراب كفر Tommy Hilfiger رياضي فاخر - {model}'
        name_en = f'Tommy Hilfiger Sports Racing Case - {model}'
    elif 'KARL' in full_text.upper() or 'LAGERFELD' in full_text.upper():
        brand = 'Karl Lagerfeld'
        name_ar = f'جراب كفر Karl Lagerfeld ماج سيف - {model}'
        name_en = f'Karl Lagerfeld Designer MagSafe Case - {model}'
    elif 'GUESS' in full_text.upper():
        brand = 'Guess'
        name_ar = f'جراب كفر Guess فاشون فاخر - {model}'
        name_en = f'Guess Fashion Luxury Case - {model}'
    elif 'PITAKA' in full_text.upper() or 'PITARA' in full_text.upper():
        brand = 'Pitaka'
        name_ar = f'جراب كفر ألياف أراميد Pitaka فائق النحافة - {model}'
        name_en = f'Pitaka Ultra-Slim Magnetic Aramid Case - {model}'
    elif 'FLOWERS' in full_text.upper():
        brand = 'Fashion'
        name_ar = f'جراب كفر ديزاين ورود وملمس ناعم - {model}'
        name_en = f'Floral Designer Protective Case - {model}'
    elif 'SILCON' in full_text.upper() or 'SILICONE' in full_text.upper():
        brand = 'Apple'
        name_ar = f'جراب كفر سيليكون ناعم ماج سيف - {model}'
        name_en = f'Soft Touch Silicone MagSafe Case - {model}'
    elif 'BUTTERFLY' in full_text.upper() or 'BUTIERFLY' in full_text.upper():
        brand = 'Fashion'
        name_ar = f'جراب كفر ديزاين فراشات أنيق - {model}'
        name_en = f'Butterfly Pattern Protective Case - {model}'
    elif 'MAGIC MASK' in full_text.upper():
        brand = 'Magic'
        name_ar = f'جراب كفر Magic Mask مقاوم للصدمات - {model}'
        name_en = f'Magic Mask Shockproof Case - {model}'
    elif 'QY NEW' in full_text.upper():
        brand = 'QY'
        name_ar = f'جراب كفر QY New الشفاف المقاوم للخدش - {model}'
        name_en = f'QY New Scratch Resistant Case - {model}'
    elif 'MAGNA' in full_text.upper() or 'MAGESAF' in full_text.upper():
        brand = 'MagSafe'
        name_ar = f'جراب كفر ماج سيف مغناطيسي شفاف - {model}'
        name_en = f'Magnetic Clear MagSafe Case - {model}'
    else:
        name_ar = f'جراب كفر حماية فاخر {detected_title} - {model}'.strip()
        name_en = f'Luxury Protective Case - {model}'

    # Unique slug / ID
    base_slug = f"case-{re.sub(r'[^a-z0-9]+', '-', brand.lower())}-{re.sub(r'[^a-z0-9]+', '-', model.lower())}"
    slug = f"prod-{base_slug}-{idx+1}"
    
    # Process & save image
    img_filename = f"{slug}.jpg"
    dest_path = os.path.join(dest_dir, img_filename)
    src_path = os.path.join(src_dir, fname)

    try:
        im = Image.open(src_path)
        im.thumbnail((1200, 1600))
        im.save(dest_path, quality=88)
        img_url = f"/product-images/{img_filename}"
    except Exception as e:
        print(f"Error copying {fname}: {e}")
        continue

    # Extract barcode
    bc_match = re.search(r'#?(\d{10,14})', full_text)
    barcode = bc_match.group(1) if bc_match else f"280{idx:08d}"

    old_price = int(price * 1.3)
    discount_pct = int(round((old_price - price) / old_price * 100))

    processed_products.append({
        'id': slug,
        'sku': f"CASE-{brand.upper()[:4]}-{model.replace(' ', '').upper()[:8]}-{idx+1:03d}",
        'name_ar': name_ar,
        'name_en': name_en,
        'category': 'cases_protection',
        'brand': brand,
        'price': price,
        'old_price': old_price,
        'discount_label': f"{discount_pct}% خصم",
        'cost_price': int(price * 0.65),
        'stock_quantity': 15,
        'is_active': True,
        'is_featured': False,
        'is_preowned': False,
        'warranty': 'ضمان استبدال ضد عيوب الصناعة',
        'colors': json.dumps([{'name_ar': 'ألوان متعددة حسب التشكيلة', 'name_en': 'Assorted Colors', 'hex': '#2C2C2E'}]),
        'storage_options': json.dumps([]),
        'images': json.dumps([img_url]),
        'specs': json.dumps({
            'الموديل المتوافق': model,
            'الماركة': brand,
            'الخامة': 'مواد عالية الجودة مقاومة للصدمات والخدوش',
            'حماية الكاميرات والشاشة': 'حواف بارزة لحماية العدسات والشاشة',
            'الباركود': barcode,
            'الصورة المرجعية بالمحل': fname
        }),
        'raw_source': fname,
        'model_name': model,
    })

print(f"Successfully processed {len(processed_products)} case products!")
with open('catalog_intake/all_cases_ready.json', 'w', encoding='utf-8') as f:
    json.dump(processed_products, f, ensure_ascii=False, indent=2)

print("Saved catalog_intake/all_cases_ready.json")
