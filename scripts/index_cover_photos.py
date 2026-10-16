"""Create temporary visual contact sheets for catalog review; originals are unchanged."""
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
source, target = map(Path, sys.argv[1:3])
target.mkdir(parents=True, exist_ok=True)
files = sorted(source.glob('*.jpg'))
for offset in range(0, len(files), 9):
    sheet = Image.new('RGB', (1500, 2070), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, file in enumerate(files[offset:offset+9], offset+1):
        with Image.open(file) as original:
            photo = ImageOps.exif_transpose(original)
            photo.thumbnail((500, 660))
            x, y = ((index-1)%3)*500, (((index-1)%9)//3)*690
            sheet.paste(photo, (x+(500-photo.width)//2,y))
            draw.text((x+8,y+664),f'{index:03} {file.name}',fill='black')
    sheet.save(target / f'sheet-{offset//9+1:02}.jpg', quality=92)
print(f'{len(files)} photos in {(len(files)+8)//9} review sheets')
