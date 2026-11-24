import os, glob
from PIL import Image

folder = r'C:\Users\abdol\OneDrive\Desktop\task\joe-store\جرابات'
files = sorted(glob.glob(os.path.join(folder, '*.jpg')) + glob.glob(os.path.join(folder, '*.jpeg')) + glob.glob(os.path.join(folder, '*.png')))

print(f"Total files: {len(files)}")

# Print info on first 15 files and sample across the folder
samples = files[0:10] + files[50:55] + files[100:105] + files[200:205] + files[300:305]

for idx, p in enumerate(samples):
    im = Image.open(p)
    print(f"[{idx}] {os.path.basename(p)}: size={im.size}")
