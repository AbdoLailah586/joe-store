import os, glob, json
from PIL import Image

src_dir = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"
dest_dir = r"public\product-images"
os.makedirs(dest_dir, exist_ok=True)

def copy_and_compress(src_name, dest_name, max_w=1200):
    src_path = os.path.join(src_dir, src_name)
    dest_path = os.path.join(dest_dir, dest_name)
    im = Image.open(src_path)
    im.thumbnail((max_w, max_w))
    im.save(dest_path, quality=90)
    print(f"Saved {dest_path}")
    return f"/product-images/{dest_name}"

# 1. Hunter Promo Banner
banner_img = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.15 AM (2).jpeg", "banner-hunter-charging-series.jpg", max_w=1600)

# 2. Hunter 67W GaN Charger
hunter_67w_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.14 AM (1).jpeg", "hunter-67w-gan-box.jpg")

# 3. Hunter 45W Super Fast Charger
hunter_45w_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.14 AM (3).jpeg", "hunter-45w-gan-box.jpg")

# 4. Hunter 25W PD Adapter
hunter_25w_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.14 AM.jpeg", "hunter-25w-pd-box.jpg")

# 5. Hunter AI GaN 45W Smart Charger
hunter_ai_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.14 AM (2).jpeg", "hunter-ai-45w-gan-box.jpg")

# 6. Hunter 90W Desktop GaN Charger
hunter_90w_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.15 AM (3).jpeg", "hunter-90w-gan-desktop-box.jpg")

# 7. Oraimo FreePods 3C
oraimo_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.50.53 AM (1).jpeg", "oraimo-freepods-3c-box.jpg")
oraimo_img2 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.50.55 AM.jpeg", "oraimo-freepods-3c-features.jpg")

# 8. Soundcore R50i NC ANC Earbuds
soundcore_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.15 AM (1).jpeg", "soundcore-r50i-nc-box.jpg")

# 9. Hollyland Lark Wireless Microphone
hollyland_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.08 AM (2).jpeg", "hollyland-lark-wireless-mic-box.jpg")

# 10. Lito Wireless Power Bank 10000mAh
lito_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.09 AM (3).jpeg", "lito-wireless-powerbank-10k.jpg")

# 11. Multi-function Car Jump Starter & Air Pump
jumpstarter_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.09 AM.jpeg", "car-jumpstarter-airpump.jpg")

# 12. Smart World Tag (Apple Find My)
worldtag_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.10 AM (2).jpeg", "world-tag-apple-findmy.jpg")

# 13. K30 Strong Magnetic Car Phone Mount
k30_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.09 AM (1).jpeg", "k30-magnetic-car-mount.jpg")

# 14. Haino Teko Luxury AMOLED Smartwatch SQ-18 (3 Straps)
hainoteko_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.21 AM (1).jpeg", "haino-teko-sq18-amoled-box.jpg")

# 15. nabi Kids 5G Smartwatch GPS Video Call
nabi_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.20 AM.jpeg", "nabi-kids-smartwatch-gps-box.jpg")

# 16. Smart Ring Tasbih Bei Qi S7 Pro
tasbih_img1 = copy_and_compress("WhatsApp Image 2026-11-24 at 3.51.19 AM (3).jpeg", "tasbih-beiqi-s7pro-smartring.jpg")

print("All WhatsApp product photos processed successfully!")
