import requests

test_urls = [
    'https://cdn-img.oraimo.com/fit-in/600x600/NG/album/oeb-e104dc/oeb-e104dc-black.png',
    'https://cdn-img.oraimo.com/fit-in/600x600/GH/product/2024/11/01/spacebuds-z-otw-625-en-black.png',
    'https://m.media-amazon.com/images/I/31FIYiUTnQL._SL1500_.jpg',
    'https://static.wixstatic.com/media/312472_9ac5fd1337d84ef0a9a0d49eab3ac87e~mv2.jpg',
    'https://static.wixstatic.com/media/312472_1c3d69097cd1483d9e4973eebe8c41f1~mv2.jpg',
    'https://static.wixstatic.com/media/312472_af151586b6ac4b239e4c36af48ef2ccd~mv2.jpeg',
    'https://static.wixstatic.com/media/312472_73b4d8eca52645b49f9df15bc4755a55~mv2.png',
    'https://static.wixstatic.com/media/312472_452d7a459932409ab8e87871b55d63be~mv2.jpg',
    'https://static.wixstatic.com/media/312472_53576b68834d4bb2b1ef0dd98220a0a6~mv2.png'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
for u in test_urls:
    try:
        r = requests.get(u, headers=headers, timeout=10)
        print(f"[{r.status_code}] {u[:60]}... len={len(r.content)} type={r.headers.get('content-type')}")
    except Exception as e:
        print(f"[ERR] {u[:60]}... {e}")
