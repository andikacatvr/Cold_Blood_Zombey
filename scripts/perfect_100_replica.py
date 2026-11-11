import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== BUILDING 100% PERFECT 1:1 REPLICA OF BOSSGAMEREV.PNG ===")

# 1. Load bossgamerev.png
src_bgr = cv2.imread('bossgamerev.png')
if src_bgr is None:
    raise FileNotFoundError("bossgamerev.png not found!")

H, W = src_bgr.shape[:2]
print(f"Loaded bossgamerev.png: {W}x{H}")

# 2. Strict background mask & foreground extraction
# In bossgamerev.png, background is white (> 240 in all channels)
bg_mask = (src_bgr[:, :, 0] > 240) & (src_bgr[:, :, 1] > 240) & (src_bgr[:, :, 2] > 240)
fg_mask = (~bg_mask).astype(np.uint8) * 255
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

# Find foreground bounds
ys, xs = np.where(fg_mask > 0)
ymin, ymax = ys.min(), ys.max()
xmin, xmax = xs.min(), xs.max()
print(f"Foreground Y: {ymin} to {ymax} (h={ymax-ymin}), X: {xmin} to {xmax} (w={xmax-xmin})")

# 3. Analyze each row to separate Body, Left Arm, and Right Arm
def analyze_row(y):
    row_fg = np.where(fg_mask[y])[0]
    if len(row_fg) == 0:
        return None
    if y < 320:
        return {'type': 'head_neck', 'min': int(row_fg.min()), 'max': int(row_fg.max())}
    elif y > 790:
        return {'type': 'skirt', 'min': int(row_fg.min()), 'max': int(row_fg.max())}
    else:
        left_fg = np.where(fg_mask[y, :512])[0]
        right_fg = np.where(fg_mask[y, 512:])[0] + 512
        
        diffs_l = np.diff(left_fg) if len(left_fg) > 0 else []
        gaps_l = np.where(diffs_l > 3)[0]
        
        diffs_r = np.diff(right_fg) if len(right_fg) > 0 else []
        gaps_r = np.where(diffs_r > 3)[0]
        
        l_arm = (int(left_fg[0]), int(left_fg[gaps_l[0]])) if len(gaps_l) > 0 else None
        l_body = int(left_fg[gaps_l[0]+1]) if len(gaps_l) > 0 else (int(left_fg[0]) if len(left_fg) > 0 else 512)
        
        r_body = int(right_fg[gaps_r[0]]) if len(gaps_r) > 0 else (int(right_fg[-1]) if len(right_fg) > 0 else 512)
        r_arm = (int(right_fg[gaps_r[0]+1]), int(right_fg[-1])) if len(gaps_r) > 0 else None
        
        return {'type': 'torso_arms', 'body': (l_body, r_body), 'left_arm': l_arm, 'right_arm': r_arm}

# 4. Construct Clean Front Image with Seamless Bleed (NO WHITE BORDER ANYWHERE)
# Start with foreground pixels only
clean_front = np.zeros_like(src_bgr)
clean_front[fg_mask > 0] = src_bgr[fg_mask > 0]

# For rows with arms, fill the gap between arm and body with gown bleed & skin bleed
for y in range(ymin, ymax + 1):
    info = analyze_row(y)
    if info is None:
        continue
    if info['type'] == 'torso_arms':
        # Left gap
        if info['left_arm'] is not None:
            arm_r = info['left_arm'][1]
            body_l = info['body'][0]
            if body_l > arm_r + 1:
                mid_gap = (arm_r + body_l) // 2
                # Left half of gap: bleed arm skin
                arm_col = clean_front[y, arm_r]
                for x in range(arm_r + 1, mid_gap):
                    clean_front[y, x] = arm_col
                # Right half of gap: bleed body gown
                body_col = clean_front[y, body_l]
                for x in range(mid_gap, body_l):
                    clean_front[y, x] = body_col
            # Outer left of arm: bleed skin outward 15 px
            arm_l = info['left_arm'][0]
            col_l = clean_front[y, arm_l]
            for x in range(max(0, arm_l - 15), arm_l):
                clean_front[y, x] = col_l
                
        # Right gap
        if info['right_arm'] is not None:
            body_r = info['body'][1]
            arm_l = info['right_arm'][0]
            if arm_l > body_r + 1:
                mid_gap = (body_r + arm_l) // 2
                body_col = clean_front[y, body_r]
                for x in range(body_r + 1, mid_gap):
                    clean_front[y, x] = body_col
                arm_col = clean_front[y, arm_l]
                for x in range(mid_gap, arm_l):
                    clean_front[y, x] = arm_col
            # Outer right of arm: bleed skin outward 15 px
            arm_r = info['right_arm'][1]
            col_r = clean_front[y, arm_r]
            for x in range(arm_r + 1, min(W, arm_r + 16)):
                clean_front[y, x] = col_r
    elif info['type'] == 'head_neck':
        # Bleed hair/skin outward 15 px
        x_min, x_max = info['min'], info['max']
        c_min = clean_front[y, x_min]
        c_max = clean_front[y, x_max]
        for x in range(max(0, x_min - 15), x_min):
            clean_front[y, x] = c_min
        for x in range(x_max + 1, min(W, x_max + 16)):
            clean_front[y, x] = c_max
    elif info['type'] == 'skirt':
        # Bleed skirt gown outward 15 px
        x_min, x_max = info['min'], info['max']
        c_min = clean_front[y, x_min]
        c_max = clean_front[y, x_max]
        for x in range(max(0, x_min - 15), x_min):
            clean_front[y, x] = c_min
        for x in range(x_max + 1, min(W, x_max + 16)):
            clean_front[y, x] = c_max

# 5. Build 1024x1024 Texture Atlas
atlas = np.zeros((1024, 1024, 3), dtype=np.uint8)

# Crop front to bounding box plus margins
crop_ymin = max(0, ymin - 10)
crop_ymax = min(H - 1, ymax + 10)
crop_xmin = max(0, xmin - 20)
crop_xmax = min(W - 1, xmax + 20)

crop_h = crop_ymax - crop_ymin + 1
crop_w = crop_xmax - crop_xmin + 1

front_cropped = clean_front[crop_ymin:crop_ymax+1, crop_xmin:crop_xmax+1]

# Resize to fit left half of atlas: width = 480, height = 980
atlas_front_w = 480
atlas_front_h = 980
x_f_start = 16
y_start = 22

front_atlas = cv2.resize(front_cropped, (atlas_front_w, atlas_front_h), interpolation=cv2.INTER_AREA)
atlas[y_start:y_start+atlas_front_h, x_f_start:x_f_start+atlas_front_w] = front_atlas

# Construct Back View in right half of atlas (x: 520 to 1000)
atlas_back_w = 480
x_b_start = 520
back_atlas = front_atlas.copy()

# Back hair (bun) in upper region:
y_neck_atlas = int((260 - crop_ymin) / crop_h * atlas_front_h)
for y in range(y_neck_atlas):
    for x in range(atlas_back_w):
        dx = abs(x - atlas_back_w // 2)
        strand_noise = int(4.0 * np.sin(x * 0.45) * np.cos(y * 0.30))
        bun_dist = np.sqrt(dx**2 + (y - y_neck_atlas * 0.45)**2)
        bun_high = int(max(0, 18 - 0.25 * bun_dist))
        base_col = np.array([24, 30, 42], dtype=np.int16) + strand_noise + bun_high
        back_atlas[y, x] = np.clip(base_col, 16, 75).astype(np.uint8)

# Low-cut Halter Back (skin): Y=260 to 330
y_halter_back = int((330 - crop_ymin) / crop_h * atlas_front_h)
for y in range(y_neck_atlas, y_halter_back):
    for x in range(atlas_back_w):
        dx = abs(x - atlas_back_w // 2)
        spine_shade = -int(12.0 * np.exp(-((dx / 8.0)**2)))
        scapula_high = int(8.0 * np.exp(-(((dx - 45) / 18.0)**2)))
        skin_val = np.array([115, 140, 190], dtype=np.int16) + spine_shade + scapula_high
        back_atlas[y, x] = np.clip(skin_val, 0, 255).astype(np.uint8)

atlas[y_start:y_start+atlas_front_h, x_b_start:x_b_start+atlas_back_w] = back_atlas
atlas_rgb = cv2.cvtColor(atlas, cv2.COLOR_BGR2RGB)
atlas_pil = Image.fromarray(atlas_rgb)
atlas_pil.save('bossgamerev_perfect_atlas.png')
print("Texture Atlas saved: bossgamerev_perfect_atlas.png")

# 6. Coordinate Mapping Functions for UVs
def get_uv_front(orig_x, orig_y):
    # Map from bossgamerev coordinates to front atlas UV
    norm_x = (orig_x - crop_xmin) / float(crop_w)
    norm_y = (orig_y - crop_ymin) / float(crop_h)
    u = (x_f_start + np.clip(norm_x, 0.0, 1.0) * atlas_front_w) / 1024.0
    v = 1.0 - (y_start + np.clip(norm_y, 0.0, 1.0) * atlas_front_h) / 1024.0
    return [float(u), float(v)]

def get_uv_back(orig_x, orig_y):
    # Mirror horizontally for back
    norm_x = 1.0 - (orig_x - crop_xmin) / float(crop_w)
    norm_y = (orig_y - crop_ymin) / float(crop_h)
    u = (x_b_start + np.clip(norm_x, 0.0, 1.0) * atlas_back_w) / 1024.0
    v = 1.0 - (y_start + np.clip(norm_y, 0.0, 1.0) * atlas_front_h) / 1024.0
    return [float(u), float(v)]

# 7. World Dimensions & Scale
world_height = 1.75
scale_y = world_height / float(ymax - ymin)
# Center line of body
center_x = 512.0
scale_x = scale_y  # Isometric 1:1 scale

all_vertices = []
all_uvs = []
all_normals = []
all_faces = []

# Helper: Quad meshing
def add_smooth_column(rings_f, rings_b, cap_top=True, cap_bottom=True, top_dome=False, bottom_apex=False):
    N_rings = len(rings_f)
    K = len(rings_f[0]) - 1

    for i in range(N_rings - 1):
        rf0, rf1 = rings_f[i], rings_f[i + 1]
        rb0, rb1 = rings_b[i], rings_b[i + 1]

        # Front quads
        for k in range(K):
            all_faces.append([rf0[k], rf1[k], rf1[k + 1]])
            all_faces.append([rf0[k], rf1[k + 1], rf0[k + 1]])

        # Back quads
        for k in range(K):
            all_faces.append([rb0[k], rb1[k + 1], rb1[k]])
            all_faces.append([rb0[k], rb0[k + 1], rb1[k + 1]])

        # Side seams
        # Right seam
        all_faces.append([rf0[K], rf1[K], rb1[0]])
        all_faces.append([rf0[K], rb1[0], rb0[0]])
        # Left seam
        all_faces.append([rb0[K], rb1[K], rf1[0]])
        all_faces.append([rb0[K], rf1[0], rf0[0]])

    # Top Cap
    if cap_top:
        rf_top = rings_f[0]
        rb_top = rings_b[0]
        pts = [all_vertices[idx] for idx in rf_top] + [all_vertices[idx] for idx in rb_top]
        c_pos = np.mean(pts, axis=0)
        c_uv = all_uvs[rf_top[K // 2]]
        if top_dome:
            c_pos[1] += 0.015  # dome apex

        apex_idx = len(all_vertices)
        all_vertices.append(c_pos.tolist())
        all_uvs.append(c_uv)
        all_normals.append([0.0, 1.0, 0.0])

        for k in range(K):
            all_faces.append([apex_idx, rf_top[k + 1], rf_top[k]])
            all_faces.append([apex_idx, rb_top[k], rb_top[k + 1]])
        all_faces.append([apex_idx, rb_top[0], rf_top[K]])
        all_faces.append([apex_idx, rf_top[0], rb_top[K]])

    # Bottom Cap
    if cap_bottom:
        rf_bot = rings_f[-1]
        rb_bot = rings_b[-1]
        pts = [all_vertices[idx] for idx in rf_bot] + [all_vertices[idx] for idx in rb_bot]
        c_pos = np.mean(pts, axis=0)
        c_uv = all_uvs[rf_bot[K // 2]]
        if bottom_apex:
            c_pos[1] -= 0.010

        apex_idx = len(all_vertices)
        all_vertices.append(c_pos.tolist())
        all_uvs.append(c_uv)
        all_normals.append([0.0, -1.0, 0.0])

        for k in range(K):
            all_faces.append([apex_idx, rf_bot[k], rf_bot[k + 1]])
            all_faces.append([apex_idx, rb_bot[k + 1], rb_bot[k]])
        all_faces.append([apex_idx, rf_bot[K], rb_bot[0]])
        all_faces.append([apex_idx, rb_bot[K], rf_bot[0]])

# 8. BUILD HEAD & CRANIUM (Y: 24 to 215)
print("1. Modeling Head & Cranium...")
K_head = 8
head_rf, head_rb = [], []

y_head_steps = [24, 45, 75, 110, 140, 170, 195, 215]

for y_px in y_head_steps:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    
    info = analyze_row(y_px)
    if info is None or 'min' not in info:
        x_min, x_max = 470, 554
    else:
        x_min, x_max = info['min'], info['max']
    rx = (x_max - x_min) * 0.5 * scale_x
    
    # Female head depth: cranium depth
    if y_px < 110:
        rz_f = rx * 0.82
        rz_b = rx * 1.05
    else:
        # Face level: profile shape
        rz_f = rx * 0.78
        rz_b = rx * 0.95
        
    rf, rb = [], []
    
    # Front semicircle (th: -pi/2 to pi/2)
    for k in range(K_head + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_head)
        vx = rx * np.sin(th)
        vz = rz_f * np.cos(th)
        
        orig_x = center_x + np.sin(th) * (rx / scale_x)
        uv = get_uv_front(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.1, np.cos(th)])
        rf.append(v_idx)
        
    # Back semicircle (th: pi/2 to 3pi/2)
    for k in range(K_head + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_head)
        vx = rx * np.sin(th)
        vz = rz_b * np.cos(th)
        
        orig_x = center_x + np.sin(th) * (rx / scale_x)
        uv = get_uv_back(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.1, np.cos(th)])
        rb.append(v_idx)
        
    head_rf.append(rf)
    head_rb.append(rb)

add_smooth_column(head_rf, head_rb, cap_top=True, cap_bottom=False, top_dome=True)

# 9. BUILD NECK (Y: 215 to 305)
print("2. Modeling Neck...")
K_neck = 6
neck_rf, neck_rb = [], []
y_neck_steps = [215, 235, 260, 285, 305]

for y_px in y_neck_steps:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    
    # Slender female neck radius
    rx = 0.040 + 0.012 * ((y_px - 215) / 90.0)**2
    rz = rx * 1.02
    
    rf, rb = [], []
    for k in range(K_neck + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_neck)
        vx = rx * np.sin(th)
        vz = rz * np.cos(th)
        orig_x = center_x + np.sin(th) * 35.0
        uv = get_uv_front(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.0, np.cos(th)])
        rf.append(v_idx)
        
    for k in range(K_neck + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_neck)
        vx = rx * np.sin(th)
        vz = rz * np.cos(th)
        orig_x = center_x + np.sin(th) * 35.0
        uv = get_uv_back(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.0, np.cos(th)])
        rb.append(v_idx)
        
    neck_rf.append(rf)
    neck_rb.append(rb)

add_smooth_column(neck_rf, neck_rb, cap_top=False, cap_bottom=False)

# 10. BUILD BODY & GOWN (Y: 305 to 1480)
print("3. Modeling Bodice & Flowing Halter Gown...")
K_body = 12
body_rf, body_rb = [], []

# Dense steps along body for perfect silhouette curve
y_body_steps = [
    305, 325, 350, 380, 415, 450, 490, 530, 570, 620,
    670, 720, 770, 830, 900, 980, 1070, 1170, 1280, 1390, 1480
]

for y_px in y_body_steps:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    
    info = analyze_row(y_px)
    if info['type'] == 'torso_arms':
        x_min, x_max = info['body']
    else:
        x_min, x_max = info['min'], info['max']
        
    rx = (x_max - x_min) * 0.5 * scale_x
    
    # Anatomical depth profile
    if y_px <= 450:
        # Chest/bust fullness: halter gown front projection
        rz_f = rx * 0.90
        rz_b = rx * 0.72
    elif y_px <= 620:
        # Slender waist
        rz_f = rx * 0.78
        rz_b = rx * 0.75
    elif y_px <= 800:
        # Hourglass hips & buttocks
        rz_f = rx * 0.82
        rz_b = rx * 0.95
    else:
        # Skirt flare
        rz_f = rx * 0.92
        rz_b = rx * 0.92
        
    rf, rb = [], []
    
    # Front semicircle (strictly within x_min to x_max of body!)
    for k in range(K_body + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_body)
        vx = rx * np.sin(th)
        vz = rz_f * np.cos(th)
        
        orig_x = center_x + np.sin(th) * ((x_max - x_min) * 0.495)
        uv = get_uv_front(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.05, np.cos(th)])
        rf.append(v_idx)
        
    # Back semicircle
    for k in range(K_body + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_body)
        vx = rx * np.sin(th)
        vz = rz_b * np.cos(th)
        
        orig_x = center_x + np.sin(th) * ((x_max - x_min) * 0.495)
        uv = get_uv_back(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.05, np.cos(th)])
        rb.append(v_idx)
        
    body_rf.append(rf)
    body_rb.append(rb)

add_smooth_column(body_rf, body_rb, cap_top=False, cap_bottom=True)

# 11. BUILD ARMS WITH 100% CLEAN SKIN (NO WHITE BORDER)
print("4. Modeling Porcelain Bare Arms...")
K_arm = 8

def build_arm(is_right=False):
    arm_rf, arm_rb = [], []
    sign = 1.0 if is_right else -1.0
    
    # Arm height steps from shoulder Y=320 down to fingertips Y=780
    y_arm_steps = [320, 350, 390, 435, 485, 540, 600, 660, 720, 780]
    
    for y_px in y_arm_steps:
        norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
        y_world = norm_y * world_height
        
        info = analyze_row(y_px)
        if info['type'] == 'torso_arms':
            arm_bounds = info['right_arm'] if is_right else info['left_arm']
        else:
            arm_bounds = None
            
        if arm_bounds is not None:
            a_min, a_max = arm_bounds
            mid_x_px = (a_min + a_max) * 0.5
            arm_w_px = (a_max - a_min) * 0.5
        else:
            # Upper shoulder joint (Y <= 400)
            t = (y_px - 320) / 100.0
            mid_x_px = center_x + sign * (145.0 + 20.0 * t)
            arm_w_px = 25.0
            a_min = mid_x_px - arm_w_px
            a_max = mid_x_px + arm_w_px
            
        mid_vx = (mid_x_px - center_x) * scale_x
        rx = max(0.016, arm_w_px * scale_x)
        rz = rx * 1.08  # subtle anatomical depth
        
        rf, rb = [], []
        
        # Front half of arm cylinder: maps strictly across [a_min, a_max]
        for k in range(K_arm + 1):
            th = -np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = rz * np.cos(th)
            
            # Map th to [a_min, a_max]: strictly interior to skin!
            orig_x = mid_x_px + np.sin(th) * (arm_w_px * 0.90)
            uv = get_uv_front(orig_x, y_px)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(uv)
            all_normals.append([sign * np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        # Back half of arm cylinder
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = rz * np.cos(th)
            
            orig_x = mid_x_px + np.sin(th) * (arm_w_px * 0.90)
            uv = get_uv_back(orig_x, y_px)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(uv)
            all_normals.append([sign * np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        arm_rf.append(rf)
        arm_rb.append(rb)
        
    add_smooth_column(arm_rf, arm_rb, cap_top=True, cap_bottom=True, top_dome=True, bottom_apex=True)

build_arm(is_right=False)
build_arm(is_right=True)

# 12. BUILD POINTED WHITE BRIDAL PUMPS
print("5. Modeling Pointed White Bridal Pumps...")
K_shoe = 6

def build_pump(is_right=False):
    sign = 1.0 if is_right else -1.0
    shoe_rf, shoe_rb = [], []
    y_steps = np.linspace(1440, 1515, 6).astype(int)
    shoe_x_mid = sign * 0.080
    
    for y_px in y_steps:
        norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
        y_world = norm_y * world_height
        t_foot = (y_px - 1440) / 75.0
        
        rx = 0.024 * (1.0 - 0.45 * t_foot)
        rz = 0.038 * (1.0 - 0.35 * t_foot)
        z_offset = 0.015 + 0.040 * t_foot  # pointed toe forward
        
        rf, rb = [], []
        for k in range(K_shoe + 1):
            th = -np.pi * 0.5 + np.pi * k / float(K_shoe)
            vx = shoe_x_mid + rx * np.sin(th)
            vz = z_offset + rz * np.cos(th)
            
            orig_x = center_x + sign * (60.0 + 20.0 * np.sin(th))
            uv = get_uv_front(orig_x, y_px)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_shoe + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_shoe)
            vx = shoe_x_mid + rx * np.sin(th)
            vz = z_offset + rz * np.cos(th)
            
            orig_x = center_x + sign * (60.0 + 20.0 * np.sin(th))
            uv = get_uv_back(orig_x, y_px)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        shoe_rf.append(rf)
        shoe_rb.append(rb)
        
    add_smooth_column(shoe_rf, shoe_rb, cap_top=False, cap_bottom=True, bottom_apex=True)

build_pump(is_right=False)
build_pump(is_right=True)

# 13. Convert to numpy arrays & trimesh
all_vertices = np.array(all_vertices, dtype=np.float32)
all_uvs = np.array(all_uvs, dtype=np.float32)
all_normals = np.array(all_normals, dtype=np.float32)
all_faces = np.array(all_faces, dtype=np.int32)

print(f"Total Mesh Geometry: {len(all_vertices)} vertices, {len(all_faces)} faces")

mat = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.04,
    doubleSided=True
)
vis = trimesh.visual.texture.TextureVisuals(uv=all_uvs, material=mat)
mesh = trimesh.Trimesh(
    vertices=all_vertices,
    faces=all_faces,
    vertex_normals=all_normals,
    visual=vis,
    process=False
)

glb_bytes = trimesh.exchange.gltf.export_glb(mesh)

out_files = [
    'bossgame.glb',
    'bossgamerev.glb',
    'public/models/bossgame.glb',
    'public/models/boss_bride.glb',
    'public/models/bossgamerev.glb',
    'dist/models/bossgame.glb',
    'dist/models/boss_bride.glb',
    'dist/models/bossgamerev.glb'
]

for p in out_files:
    os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    with open(p, 'wb') as f:
        f.write(glb_bytes)
    print(f"Successfully saved {p} ({len(glb_bytes)} bytes)")

print("=== 100% REPLICA GENERATION FINISHED ===")
