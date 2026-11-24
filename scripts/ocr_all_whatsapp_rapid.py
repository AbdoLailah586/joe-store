import os, json
from rapidocr_onnxruntime import RapidOCR

engine = RapidOCR()
folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"
files = sorted([f for f in os.listdir(folder) if f.endswith('.jpeg') or f.endswith('.jpg') or f.endswith('.png')])

out = []
for idx, f in enumerate(files):
    p = os.path.join(folder, f)
    res, _ = engine(p)
    txts = [x[1] for x in res] if res else []
    line = f"[{idx+1}] {f} -> {' | '.join(txts)}"
    print(line)
    out.append({'index': idx+1, 'file': f, 'texts': txts})

with open('whatsapp_rapidocr_results.json', 'w', encoding='utf-8') as fp:
    json.dump(out, fp, ensure_ascii=False, indent=2)
