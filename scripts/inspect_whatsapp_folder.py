import os, glob
from PIL import Image

folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"
files = sorted(glob.glob(os.path.join(folder, "*.jpeg")) + glob.glob(os.path.join(folder, "*.jpg")))

print(f"Total files in WhatsApp folder: {len(files)}")
for f in files[:15]:
    im = Image.open(f)
    print(os.path.basename(f), im.size)
