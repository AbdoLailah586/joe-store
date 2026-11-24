import os, json
from PIL import Image

src_folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\WhatsApp Unknown 2026-11-24 at 3.54.17 AM"
dst_folder = r"C:\Users\abdol\OneDrive\Desktop\task\joe-store\public\product-images"
os.makedirs(dst_folder, exist_ok=True)

files = sorted([f for f in os.listdir(src_folder) if f.endswith('.jpeg') or f.endswith('.jpg') or f.endswith('.png')])

def save_optimized(src_name, target_filename, max_dim=1200, quality=88):
    src_path = os.path.join(src_folder, src_name)
    dst_path = os.path.join(dst_folder, target_filename)
    im = Image.open(src_path)
    im = im.convert('RGB')
    w, h = im.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        im = im.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
    im.save(dst_path, format='JPEG', quality=quality, optimize=True)
    return f"/product-images/{target_filename}"

# Map files to saved optimized filenames
print("Processing photos...")

# [1] Oraimo FreePods 3C back/features
img_freepods_features = save_optimized(files[0], "oraimo-freepods-3c-features.jpg")
# [2] Oraimo SpaceBuds Lite OTW-324
img_spacebuds_lite = save_optimized(files[1], "oraimo-spacebuds-lite-otw324.jpg")
# [3] Oraimo SpaceBuds Z OTW-425 ANC
img_spacebuds_z = save_optimized(files[2], "oraimo-spacebuds-z-otw425.jpg")
# [4] Oraimo FreePods 3C box
img_freepods_box = save_optimized(files[3], "oraimo-freepods-3c-box.jpg")
# [5] Oraimo Necklace Lite OEB-E3111
img_necklace_lite = save_optimized(files[4], "oraimo-necklace-lite-e3111.jpg")
# [6] Oraimo SpaceBuds N OTW-626N
img_spacebuds_n_1 = save_optimized(files[5], "oraimo-spacebuds-n-otw626n-1.jpg")
# [7] Hollyland Lark M2 box
img_lark_m2 = save_optimized(files[6], "hollyland-lark-wireless-mic-box.jpg")
# [8] Oraimo SpaceBuds N angle
img_spacebuds_n_2 = save_optimized(files[7], "oraimo-spacebuds-n-otw626n-2.jpg")
# [9] K30 Magnetic Car Mount
img_k30_mount = save_optimized(files[8], "k30-magnetic-car-mount.jpg")
# [10] M1 3-Axis Gimbal Stabilizer
img_m1_gimbal = save_optimized(files[9], "m1-3axis-gimbal-stabilizer.jpg")
# [11] Lito 5000mAh Powerbank
img_lito_5k = save_optimized(files[10], "lito-wireless-powerbank-5k.jpg")
# [12] Earldom JS02 Jumpstarter & Air Pump
img_jumpstarter = save_optimized(files[11], "car-jumpstarter-airpump.jpg")
# [13] Lito AI Wireless Mic
img_lito_mic = save_optimized(files[12], "lito-ai-wireless-mic.jpg")
# [14] World Tag Apple Find My
img_worldtag = save_optimized(files[13], "world-tag-apple-findmy.jpg")
# [15] Wavy Cute Case - Butterflies
img_wavy_butterfly = save_optimized(files[14], "case-wavy-butterflies.jpg")
# [16] Wavy Cute Case - Leopard Hearts
img_wavy_hearts = save_optimized(files[15], "case-wavy-leopard-hearts.jpg")
# [17] Lito 10000mAh Powerbank
img_lito_10k = save_optimized(files[16], "lito-wireless-powerbank-10k.jpg")
# [18] Sunfa Bow Case with Pearl Lanyard
img_sunfa_lanyard = save_optimized(files[17], "case-sunfa-bow-pearl-lanyard.jpg")
# [19] Santa Barbara Polo 4 colors
img_polo_4colors = save_optimized(files[18], "case-santa-barbara-polo-leather-4colors.jpg")
# [20] Santa Barbara Polo in hand
img_polo_hand = save_optimized(files[19], "case-santa-barbara-polo-leather-hand.jpg")
# [21] Sunfa Bow Case
img_sunfa_bow = save_optimized(files[20], "case-sunfa-bow-dots.jpg")
# [22] Wavy 4 cases in hand
img_wavy_4cases_hand = save_optimized(files[21], "case-wavy-collection-4in-hand.jpg")
# [23] 3D Bow Matte Case - Black
img_bow_black = save_optimized(files[22], "case-3d-embossed-bow-black.jpg")
# [24] 3D Bow Matte Case - Cream
img_bow_cream = save_optimized(files[23], "case-3d-embossed-bow-cream.jpg")
# [25] Santa Barbara Polo detail
img_polo_detail = save_optimized(files[24], "case-santa-barbara-polo-leather-detail.jpg")
# [26] Wavy 4 cases table view
img_wavy_4cases_table = save_optimized(files[25], "case-wavy-collection-table.jpg")
# [27] iPhone Clear Case MagSafe Camera Control
img_clear_case = save_optimized(files[26], "case-iphone-magsafe-clear-camera-control.jpg")
# [28] 3D Bow Matte Case - Wine Red
img_bow_winered = save_optimized(files[27], "case-3d-embossed-bow-winered.jpg")
# [29] Alpine Loop Straps 4 colors
img_alpine_straps = save_optimized(files[28], "strap-alpine-loop-titanium-ghook-4colors.jpg")
# [30] 3D Bow Matte Cases 5 colors palette
img_bow_5colors = save_optimized(files[29], "case-3d-embossed-bow-5colors-palette.jpg")
# [31] 3D Bow Matte Case - Pink with Lanyard
img_bow_pink_lanyard = save_optimized(files[30], "case-3d-embossed-bow-pink-lanyard.jpg")
# [32] Hunter 67W GaN Charger
img_hunter_67w = save_optimized(files[31], "hunter-67w-gan-box.jpg")
# [33] Hunter AI GaN 45W Voice Command Charger
img_hunter_ai_45w = save_optimized(files[32], "hunter-ai-45w-gan-box.jpg")
# [34] Hunter 45W PD + QC3.0 Charger
img_hunter_45w = save_optimized(files[33], "hunter-45w-gan-box.jpg")
# [35] Hunter 25W PD Adapter
img_hunter_25w = save_optimized(files[34], "hunter-25w-pd-box.jpg")
# [36] Soundcore R50i NC by Anker
img_soundcore_r50i_nc = save_optimized(files[35], "soundcore-r50i-nc-box.jpg")
# [37] Hunter Charging Series Overview Banner
img_hunter_series = save_optimized(files[36], "banner-hunter-charging-series.jpg")
# [38] Hunter 20W Mini & 90W Desktop GaN
img_hunter_20w_90w = save_optimized(files[37], "hunter-90w-gan-desktop-box.jpg")
img_hunter_20w = save_optimized(files[37], "hunter-20w-gan-mini-box.jpg")
# [39] X9 Pro 2 AMOLED Smart Watch
img_x9_pro2 = save_optimized(files[38], "smartwatch-x9-pro2-amoled.jpg")
# [40] Soundcore R50i True Wireless Earbuds
img_soundcore_r50i = save_optimized(files[39], "soundcore-r50i-earbuds-box.jpg")
# [41] W&O X10 Ultra Smart Watch
img_wo_x10_ultra = save_optimized(files[40], "smartwatch-wo-x10-ultra.jpg")
# [42] Camera Lens Plateau Protectors
img_lens_protector_colors = save_optimized(files[41], "camera-lens-plateau-protector-colors.jpg")
# [43] Apple Watch Bumper Cases with Screen Protector
img_applewatch_cases_set = save_optimized(files[42], "case-apple-watch-bumper-screen-set.jpg")
# [44] IA-OIS Camera Lens Protector Box
img_ia_ois_box = save_optimized(files[43], "camera-lens-protector-ia-ois-box.jpg")
# [45] Telzeal S11 Ultra 3 Robot Smart Watch
img_telzeal_s11 = save_optimized(files[44], "smartwatch-telzeal-s11-ultra3-robot.jpg")
# [46] Apple Watch Ultra with Bumper Case
img_applewatch_ultra_bumper = save_optimized(files[45], "case-apple-watch-ultra-bumper.jpg")
# [47] Apple Watch Case Box Front
img_applewatch_box_front = save_optimized(files[46], "case-apple-watch-packaging-front.jpg")
# [48] Hunter Foldable Magnetic Desktop Tripod
img_hunter_tripod = save_optimized(files[47], "hunter-magnetic-desktop-tripod.jpg")
# [49] Apple Watch Case Box Back
img_applewatch_box_back = save_optimized(files[48], "case-apple-watch-packaging-back.jpg")
# [50] Hunter Foldable Aluminum Laptop Stand
img_hunter_laptop_stand = save_optimized(files[49], "hunter-aluminum-laptop-stand.jpg")
# [51] nabi Kids Smart Watch Front Box
img_nabi_box_front = save_optimized(files[50], "nabi-kids-smartwatch-gps-box.jpg")
# [52] nabi Kids Smart Watch Side Box
img_nabi_box_side = save_optimized(files[51], "nabi-kids-smartwatch-side.jpg")
# [53] Bei Qi S7 Pro Ring Box Side
img_beiqi_side = save_optimized(files[52], "tasbih-beiqi-s7pro-box-side.jpg")
# [54] Bei Qi S7 Pro Ring Box Front
img_beiqi_front = save_optimized(files[53], "tasbih-beiqi-s7pro-smartring.jpg")
# [55] nabi Kids Top
img_nabi_top = save_optimized(files[54], "nabi-kids-smartwatch-top.jpg")
# [56] Bei Qi S7 Pro Ring in Palm
img_beiqi_palm = save_optimized(files[55], "tasbih-beiqi-s7pro-palm.jpg")
# [57] nabi Kids Angle
img_nabi_angle = save_optimized(files[56], "nabi-kids-smartwatch-angle.jpg")
# [58] Bei Qi S7 Pro Ring on Finger
img_beiqi_finger = save_optimized(files[57], "tasbih-beiqi-s7pro-finger.jpg")
# [59] Haino Teko AI Translation Ultra 3
img_ht_ai_ultra3 = save_optimized(files[58], "smartwatch-haino-teko-ai-robot-ultra3.jpg")
# [60] nabi Kids Back
img_nabi_back = save_optimized(files[59], "nabi-kids-smartwatch-back.jpg")
# [61] Haino Teko SQ-18 AMOLED
img_ht_sq18 = save_optimized(files[60], "haino-teko-sq18-amoled-box.jpg")
# [62] Haino Teko-29 AMOLED
img_ht_29 = save_optimized(files[61], "smartwatch-haino-teko-29-amoled.jpg")
# [63] nabi Kids Angle 3
img_nabi_angle3 = save_optimized(files[62], "nabi-kids-smartwatch-angle3.jpg")
# [64] Haino Teko SQ-17 Mini
img_ht_sq17_mini_1 = save_optimized(files[63], "smartwatch-haino-teko-sq17-mini-1.jpg")
# [65] nabi Kids Packaging Side
img_nabi_pkg_side = save_optimized(files[64], "nabi-kids-smartwatch-pkg-side.jpg")
# [66] Haino Teko RW-78 / KW-78
img_ht_rw78 = save_optimized(files[65], "smartwatch-haino-teko-rw78.jpg")
# [67] Haino Teko-26 AMOLED
img_ht_26 = save_optimized(files[66], "smartwatch-haino-teko-26-amoled.jpg")
# [68] Haino Teko Richard M10
img_ht_richard_m10 = save_optimized(files[67], "smartwatch-haino-teko-richard-m10.jpg")
# [69] Haino Teko CS-4 30 Days Battery
img_ht_cs4 = save_optimized(files[68], "smartwatch-haino-teko-cs4.jpg")
# [70] Haino Teko-16 Super Slim
img_ht_16 = save_optimized(files[69], "smartwatch-haino-teko-16-superslim.jpg")
# [71] Haino Teko-25 AMOLED
img_ht_25 = save_optimized(files[70], "smartwatch-haino-teko-25-amoled.jpg")
# [72] Haino Teko G19 Mini
img_ht_g19_mini = save_optimized(files[71], "smartwatch-haino-teko-g19-mini.jpg")
# [73] Haino Teko G15 Mini Series 10
img_ht_g15_mini = save_optimized(files[72], "smartwatch-haino-teko-g15-mini.jpg")
# [74] Haino Teko SQ-17 Mini Angle 2
img_ht_sq17_mini_2 = save_optimized(files[73], "smartwatch-haino-teko-sq17-mini-2.jpg")
# [75] Haino Teko-32 AMOLED
img_ht_32 = save_optimized(files[74], "smartwatch-haino-teko-32-amoled.jpg")
# [76] Haino Teko-33 AMOLED
img_ht_33 = save_optimized(files[75], "smartwatch-haino-teko-33-amoled.jpg")
# [77] Haino Teko FG-8 5G Android
img_ht_fg8 = save_optimized(files[76], "smartwatch-haino-teko-fg8-5g-android.jpg")
# [78] Haino Teko-5 Super Slim
img_ht_5_slim = save_optimized(files[77], "smartwatch-haino-teko-5-superslim.jpg")
# [79] Haino Teko FG-11 5G Android
img_ht_fg11 = save_optimized(files[78], "smartwatch-haino-teko-fg11-5g-android.jpg")
# [80] nabi Kids Final
img_nabi_final = save_optimized(files[79], "nabi-kids-smartwatch-final.jpg")

print("All 80 photos converted and optimized!")
