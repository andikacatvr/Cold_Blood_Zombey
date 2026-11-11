import cv2
import numpy as np
from PIL import Image

print("Building high-resolution PBR texture atlas for Boss Bride...")

# Load source image
src_bgr = cv2.imread('bossgame.png')
diff = np.abs(src_bgr.astype(float) - [253, 253, 253]).sum(axis=2)
mask = (diff > 16).astype(np.uint8) * 255
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

ys, xs = np.where(mask > 0)
ymin, ymax, xmin, xmax = ys.min(), ys.max(), xs.min(), xs.max()
bbox_h = ymax - ymin
bbox_w = xmax - xmin

# Inpaint 100% of background with nearest foreground color
dist, labels = cv2.distanceTransformWithLabels((255 - mask), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
fg_pts = np.argwhere(mask > 0)
nearest = fg_pts[labels - 1]
src_full_bled = src_bgr[nearest[:, :, 0], nearest[:, :, 1]]

# Target size for each half in 1024x1024 atlas
target_h = 960
target_w = int(bbox_w * (target_h / bbox_h))
if target_w > 490:
    target_w = 490
    target_h = int(bbox_h * (target_w / bbox_w))

char_crop = src_full_bled[ymin:ymax+1, xmin:xmax+1]
char_mask = mask[ymin:ymax+1, xmin:xmax+1]

front_bgr = cv2.resize(char_crop, (target_w, target_h), interpolation=cv2.INTER_AREA)
mask_scaled = cv2.resize(char_mask, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

# Initialize atlas with ivory dress color (NOT black or gray!)
# Sample average dress color
dress_sample = front_bgr[int(target_h*0.5):int(target_h*0.7), int(target_w*0.4):int(target_w*0.6)]
avg_ivory = dress_sample.mean(axis=(0,1)).astype(np.uint8)
print('Average ivory dress color (BGR):', avg_ivory)

atlas = np.full((1024, 1024, 3), avg_ivory, dtype=np.uint8)

# Place Front on Left (U: 0.0 to 0.5, centered at X=256)
x_f_start = 256 - target_w // 2
y_start = (1024 - target_h) // 2
atlas[y_start:y_start+target_h, x_f_start:x_f_start+target_w] = front_bgr

# Generate Back View on Right (U: 0.5 to 1.0, centered at X=768)
# Start from front and replace front-specific features with authentic back features
back_bgr = front_bgr.copy()

# 1. Back hair (Y: 0 to 18%): Rich dark brown textured hair
y_hair = int(target_h * 0.175)
hair_patch = front_bgr[int(target_h*0.02):int(target_h*0.07), int(target_w*0.35):int(target_w*0.65)]
hair_tile = cv2.resize(hair_patch, (target_w, y_hair), interpolation=cv2.INTER_CUBIC)
for y in range(y_hair):
    row_m = mask_scaled[y] > 0
    if np.any(row_m):
        back_bgr[y, row_m] = hair_tile[y, row_m]

# 2. Back neck & upper back (Y: 17.5% to 26%): Fair skin
y_skin = int(target_h * 0.26)
skin_patch = front_bgr[int(target_h*0.19):int(target_h*0.22), int(target_w*0.42):int(target_w*0.58)]
skin_tile = cv2.resize(skin_patch, (target_w, y_skin - y_hair), interpolation=cv2.INTER_CUBIC)
for idx, y in enumerate(range(y_hair, y_skin)):
    row_m = mask_scaled[y] > 0
    if np.any(row_m):
        back_bgr[y, row_m] = skin_tile[idx, row_m]

# Pearl necklace across back of neck (pearl beads)
y_pearl = int(target_h * 0.18)
for py in range(y_pearl - 1, y_pearl + 2):
    m_p = mask_scaled[py] > 0
    if np.any(m_p):
        xs_p = np.where(m_p)[0]
        # pearls every 4 pixels
        for px in range(xs_p.min() + 8, xs_p.max() - 8, 4):
            back_bgr[py-1:py+2, px-1:px+2] = [245, 245, 250]

# 3. Gown back (Y: 26% to 94%): Ivory satin fabric with corset spine seam
y_gown_end = int(target_h * 0.94)
for y in range(y_skin, y_gown_end):
    row_m = mask_scaled[y] > 0
    if np.any(row_m):
        xs_row = np.where(row_m)[0]
        x_mid = (xs_row.min() + xs_row.max()) // 2
        # spine corset seam line
        back_bgr[y, x_mid-1:x_mid+2] = np.clip(avg_ivory.astype(int) - 25, 0, 255).astype(np.uint8)

# Mirror back view so right arm matches right side
back_mirrored = cv2.flip(back_bgr, 1)

# Place Back on Right (centered at X=768)
x_b_start = 768 - target_w // 2
atlas[y_start:y_start+target_h, x_b_start:x_b_start+target_w] = back_mirrored

# Seamless edge fill across whole atlas (no dark borders anywhere)
for y in range(1024):
    y_idx = min(max(0, y - y_start), target_h - 1)
    col_f_l = front_bgr[y_idx, 0]
    col_f_r = front_bgr[y_idx, -1]
    col_b_l = back_mirrored[y_idx, 0]
    col_b_r = back_mirrored[y_idx, -1]
    
    atlas[y, :x_f_start] = col_f_l
    atlas[y, x_f_start+target_w:512] = col_f_r
    atlas[y, 512:x_b_start] = col_b_l
    atlas[y, x_b_start+target_w:] = col_b_r

atlas_rgb = cv2.cvtColor(atlas, cv2.COLOR_BGR2RGB)
atlas_pil = Image.fromarray(atlas_rgb)
atlas_pil.save('public/textures/boss/boss_perfect_atlas.png')
print("Successfully generated public/textures/boss/boss_perfect_atlas.png!")

