import os, requests
from PIL import Image
import io

dst_dir = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\public\product-images"
os.makedirs(dst_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

items = [
    # Oraimo
    {
        'id': 'prod-oraimo-freepods-3c',
        'url': 'https://cdn-img.oraimo.com/fit-in/600x600/NG/album/oeb-e104dc/oeb-e104dc-black.png',
        'filename': 'oraimo-freepods-3c-studio.png'
    },
    {
        'id': 'prod-oraimo-spacebuds-z',
        'url': 'https://cdn-img.oraimo.com/fit-in/600x600/GH/product/2024/11/01/spacebuds-z-otw-625-en-black.png',
        'filename': 'oraimo-spacebuds-z-studio.png'
    },
    {
        'id': 'prod-oraimo-spacebuds-lite',
        'url': 'https://cdn-img.oraimo.com/fit-in/600x600/MA/product/2026/04/14/OTW-631-SPACEGREY-MAIN.png',
        'filename': 'oraimo-spacebuds-lite-studio.png'
    },
    {
        'id': 'prod-oraimo-spacebuds-n',
        'url': 'https://cdn-img.oraimo.com/fit-in/600x600/GH/product/2025/01/09/spacebuds-neo-otw-323.png',
        'filename': 'oraimo-spacebuds-n-studio.png'
    },
    # Anker Soundcore
    {
        'id': 'prod-soundcore-r50i-nc',
        'url': 'https://m.media-amazon.com/images/I/31FIYiUTnQL._SL1500_.jpg',
        'filename': 'soundcore-r50i-nc-studio.jpg'
    },
    {
        'id': 'prod-soundcore-r50i-earbuds',
        'url': 'https://m.media-amazon.com/images/I/312jjo35ViL._SL1500_.jpg',
        'filename': 'soundcore-r50i-earbuds-studio.jpg'
    },
    # Hollyland
    {
        'id': 'prod-hollyland-lark-wireless-mic',
        'url': 'https://cdn.hollyland.com/file/product/6301/larkm2-banner-pe.jpg',
        'filename': 'hollyland-lark-m2-studio.jpg'
    },
    # Earldom
    {
        'id': 'prod-car-jumpstarter-airpump',
        'url': 'https://earldom.com/cdn/shop/files/earldom-8000mah-car-jump-starter-with-air-compressor-et-js02-black.png?v=1782895509&width=800',
        'filename': 'earldom-js02-studio.png'
    },
    # Bei Qi / iQibla Smart Ring
    {
        'id': 'prod-tasbih-beiqi-s7pro-smartring',
        'url': 'http://iqibla.com/cdn/shop/files/J01Tblack.png?v=1766479907&width=2048',
        'filename': 'tasbih-beiqi-s7pro-studio.png'
    },
    # Smart World Tag
    {
        'id': 'prod-world-tag-apple-findmy',
        'url': 'https://www.imgadgets.com/cdn/shop/files/WorldTag_1080-0_2.jpg?v=1726249166&width=1780',
        'filename': 'world-tag-apple-findmy-studio.jpg'
    },
    # M1 3-Axis Gimbal
    {
        'id': 'prod-m1-gimbal-stabilizer',
        'url': 'https://cdn.salla.sa/zvpqVg/7882adff-9562-4d2d-827a-37939992482d-1000x1000-X9i6OQ20bBjI29HnU058JLTpKyMUyV3ZFbuBxXua.png',
        'filename': 'm1-gimbal-stabilizer-studio.png'
    },
    # Lito Powerbank
    {
        'id': 'prod-lito-wireless-powerbank-10k',
        'url': 'https://www.litoscreen.com/uploadfile/202503/28/53daa2062534f3bf31d486fbde713fe1_medium.jpg',
        'filename': 'lito-wireless-powerbank-10k-studio.jpg'
    },
    {
        'id': 'prod-lito-wireless-powerbank-5k',
        'url': 'https://www.litoscreen.com/uploadfile/202503/28/53daa2062534f3bf31d486fbde713fe1_medium.jpg',
        'filename': 'lito-wireless-powerbank-5k-studio.jpg'
    },
    # Haino Teko Smartwatches
    {
        'id': 'prod-haino-teko-rw78',
        'url': 'https://static.wixstatic.com/media/312472_9ac5fd1337d84ef0a9a0d49eab3ac87e~mv2.jpg',
        'filename': 'smartwatch-haino-teko-rw78-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-sq18-amoled',
        'url': 'https://static.wixstatic.com/media/312472_1c3d69097cd1483d9e4973eebe8c41f1~mv2.jpg',
        'filename': 'haino-teko-sq18-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-richard-m10',
        'url': 'https://static.wixstatic.com/media/312472_af151586b6ac4b239e4c36af48ef2ccd~mv2.jpeg',
        'filename': 'smartwatch-haino-teko-richard-m10-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-cs4',
        'url': 'https://static.wixstatic.com/media/312472_73b4d8eca52645b49f9df15bc4755a55~mv2.png',
        'filename': 'smartwatch-haino-teko-cs4-studio.png'
    },
    {
        'id': 'prod-haino-teko-26',
        'url': 'https://static.wixstatic.com/media/312472_7bf87ec3483a4811a1494356d40314e5~mv2.jpg',
        'filename': 'smartwatch-haino-teko-26-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-16',
        'url': 'https://static.wixstatic.com/media/312472_f939ecdf3d77454a8da2b384847fd0bc~mv2.jpeg',
        'filename': 'smartwatch-haino-teko-16-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-fg8-5g-android',
        'url': 'https://static.wixstatic.com/media/312472_452d7a459932409ab8e87871b55d63be~mv2.jpg',
        'filename': 'smartwatch-haino-teko-fg8-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-fg11-5g-android',
        'url': 'https://static.wixstatic.com/media/312472_53576b68834d4bb2b1ef0dd98220a0a6~mv2.png',
        'filename': 'smartwatch-haino-teko-fg11-studio.png'
    },
    {
        'id': 'prod-haino-teko-32',
        'url': 'https://smartglaw.com/wp-content/uploads/2026/01/Haino-Teko-32-Curved-WaterProof-1.jpg',
        'filename': 'smartwatch-haino-teko-32-studio.jpg'
    },
    {
        'id': 'prod-haino-teko-33',
        'url': 'https://vontx.com/cdn/shop/files/hainoteko-33-smartwatch-hero.png?v=1793736950&width=800',
        'filename': 'smartwatch-haino-teko-33-studio.png'
    },
    # W&O
    {
        'id': 'prod-wo-x10-ultra-smartwatch',
        'url': 'https://smartglaw.com/wp-content/uploads/2024/09/WO-X10-Ultra-3-Curved-Display.jpg',
        'filename': 'smartwatch-wo-x10-ultra-studio.jpg'
    },
    # Telzeal
    {
        'id': 'prod-telzeal-s11-ultra3-robot',
        'url': 'https://smartglaw.com/wp-content/uploads/2025/06/Telzeal-S11-Ultra3.jpg',
        'filename': 'smartwatch-telzeal-s11-ultra3-studio.jpg'
    },
    # nabi Kids
    {
        'id': 'prod-nabi-kids-smartwatch-gps',
        'url': 'https://smartglaw.com/wp-content/uploads/2026/09/Nabi-Z18-5G-Kids-watch.jpg',
        'filename': 'smartwatch-nabi-kids-studio.jpg'
    }
]

downloaded_map = {}

for it in items:
    pid = it['id']
    url = it['url']
    fname = it['filename']
    outpath = os.path.join(dst_dir, fname)
    
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200 and len(r.content) > 1000:
            im = Image.open(io.BytesIO(r.content))
            im_format = 'PNG' if fname.endswith('.png') else 'JPEG'
            
            # Convert RGBA to RGB for JPEG
            if im_format == 'JPEG' and im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGB')
            
            # Resize if unnecessarily large
            w, h = im.size
            if max(w, h) > 1400:
                scale = 1400 / max(w, h)
                im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
            
            im.save(outpath, format=im_format, quality=90, optimize=True)
            saved_rel = f"/product-images/{fname}"
            downloaded_map[pid] = saved_rel
            print(f"✅ Downloaded & saved: [{pid}] -> {saved_rel} ({im.size})")
        else:
            print(f"❌ Failed ({r.status_code}): {url}")
    except Exception as e:
        print(f"⚠️ Error downloading {url}: {e}")

import json
with open('scraped_images_map.json', 'w', encoding='utf-8') as f:
    json.dump(downloaded_map, f, ensure_ascii=False, indent=2)

print(f"\nDone! Downloaded {len(downloaded_map)} official product images.")
