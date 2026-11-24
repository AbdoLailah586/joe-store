import requests, json, re

def search_ddg_images(query):
    url = 'https://duckduckgo.com/'
    params = {'q': query}
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    s = requests.Session()
    res = s.get(url, params=params, headers=headers)
    m = re.search(r'vqd=([\d-]+)', res.text) or re.search(r'vqd="([\d-]+)"', res.text)
    if not m:
        return []
    vqd = m.group(1)
    api = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={query}&vqd={vqd}&f=,,,&p=1"
    r = s.get(api, headers=headers)
    if r.status_code == 200:
        try:
            data = r.json()
            return [x['image'] for x in data.get('results', [])[:5]]
        except:
            return []
    return []

if __name__ == '__main__':
    print("Soundcore R50i NC:")
    for u in search_ddg_images("Soundcore R50i NC Anker official product image"):
        print(" ->", u)
