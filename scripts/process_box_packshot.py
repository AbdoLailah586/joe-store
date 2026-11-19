import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

# Load original uploaded photo
img_path = r'C:/Users/abdol/.gemini/antigravity/brain/74619036-7810-40f9-a9ed-3c89c33befa6/.user_uploaded/media_1795115228271_af950704.jpg'
img = cv2.imread(img_path)
h, w = img.shape[:2]

# The front face of the box is approximately bounded by 4 points:
# Top-Left: (35, 170)
# Top-Right: (635, 75)
# Bottom-Right: (705, 850)
# Bottom-Left: (160, 930)

pts_src = np.array([
    [30, 165],
    [640, 75],
    [710, 855],
    [155, 935]
], dtype=np.float32)

# Destination size for upright rectangular packaging packshot
out_w = 600
out_h = 800
pts_dst = np.array([
    [0, 0],
    [out_w - 1, 0],
    [out_w - 1, out_h - 1],
    [0, out_h - 1]
], dtype=np.float32)

# Perspective Transform
M = cv2.getPerspectiveTransform(pts_src, pts_dst)
warped = cv2.warpPerspective(img, M, (out_w, out_h), flags=cv2.INTER_LANCZOS4)

# Create a clean mask with slightly rounded box corners and anti-aliased edge
mask = np.ones((out_h, out_w), dtype=np.uint8) * 255
# Border cleanup (inset 4px to remove any outer table pixel)
cv2.rectangle(mask, (0, 0), (out_w-1, out_h-1), 0, thickness=4)
mask = cv2.GaussianBlur(mask, (5, 5), 0)

# Convert to PIL for studio compositing
box_pil = Image.fromarray(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB))
mask_pil = Image.fromarray(mask)

# Enhance box image: slight contrast & sharpness
enhancer = ImageEnhance.Contrast(box_pil)
box_pil = enhancer.enhance(1.08)
enhancer = ImageEnhance.Sharpness(box_pil)
box_pil = enhancer.enhance(1.2)

# Put box on pure white 1000x1000 canvas with a soft ground shadow
canvas_size = 1000
canvas = Image.new('RGBA', (canvas_size, canvas_size), (255, 255, 255, 255))

# Generate soft drop shadow
shadow_offset_x = 0
shadow_offset_y = 35
shadow_w = int(out_w * 0.95)
shadow_h = 45
shadow = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
shadow_layer = Image.new('RGBA', (shadow_w, shadow_h), (30, 30, 30, 90))
shadow_mask = Image.new('L', (shadow_w, shadow_h), 0)
shadow_cv = np.zeros((shadow_h, shadow_w), dtype=np.uint8)
cv2.ellipse(shadow_cv, (shadow_w//2, shadow_h//2), (shadow_w//2 - 10, shadow_h//2 - 5), 0, 0, 360, 255, -1)
shadow_mask = Image.fromarray(cv2.GaussianBlur(shadow_cv, (21, 21), 0))

box_x = (canvas_size - out_w) // 2
box_y = (canvas_size - out_h) // 2 - 20

# Paste shadow
canvas.paste(shadow_layer, (box_x + (out_w - shadow_w)//2, box_y + out_h - 15), mask=shadow_mask)

# Paste clean box with mask
canvas.paste(box_pil, (box_x, box_y), mask=mask_pil)

# Save high quality clean packshot
output_path = r'public/product-images/onmust-zolo-30w-box-clean.png'
canvas.convert('RGB').save(output_path, 'PNG', quality=95)
print('Successfully generated clean packshot:', output_path)

# Also generate the isolated charger packshot
# The charger is in the center of the warped image
# Crop charger from warped
charger_crop = warped[220:560, 140:480]
charger_gray = cv2.cvtColor(charger_crop, cv2.COLOR_BGR2GRAY)
_, c_thresh = cv2.threshold(charger_gray, 185, 255, cv2.THRESH_BINARY_INV)
num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(c_thresh)
if len(stats) > 1:
    largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    c_mask = np.zeros_like(charger_gray)
    c_mask[labels == largest] = 255
    contours, _ = cv2.findContours(c_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(c_mask, contours, -1, 255, -1)
    c_mask = cv2.GaussianBlur(c_mask, (5, 5), 0)
    
    c_pil = Image.fromarray(cv2.cvtColor(charger_crop, cv2.COLOR_BGR2RGB))
    c_mask_pil = Image.fromarray(c_mask)
    
    c_canvas = Image.new('RGB', (800, 800), (255, 255, 255))
    cw, ch = c_pil.size
    # scale up charger slightly
    scale = 1.3
    c_pil_scaled = c_pil.resize((int(cw * scale), int(ch * scale)), Image.LANCZOS)
    c_mask_scaled = c_mask_pil.resize((int(cw * scale), int(ch * scale)), Image.LANCZOS)
    
    cx = (800 - c_pil_scaled.width) // 2
    cy = (800 - c_pil_scaled.height) // 2
    
    # Ground shadow for charger
    cs_w = int(c_pil_scaled.width * 0.75)
    cs_h = 35
    cs_layer = Image.new('RGBA', (cs_w, cs_h), (20, 20, 20, 80))
    cs_cv = np.zeros((cs_h, cs_w), dtype=np.uint8)
    cv2.ellipse(cs_cv, (cs_w//2, cs_h//2), (cs_w//2 - 5, cs_h//2 - 3), 0, 0, 360, 255, -1)
    cs_mask = Image.fromarray(cv2.GaussianBlur(cs_cv, (15, 15), 0))
    
    c_canvas.paste(cs_layer, (cx + (c_pil_scaled.width - cs_w)//2, cy + c_pil_scaled.height - 20), mask=cs_mask)
    c_canvas.paste(c_pil_scaled, (cx, cy), mask=c_mask_scaled)
    
    charger_out = r'public/product-images/onmust-zolo-30w-unit-clean.png'
    c_canvas.save(charger_out, 'PNG', quality=95)
    print('Successfully generated clean charger unit:', charger_out)
