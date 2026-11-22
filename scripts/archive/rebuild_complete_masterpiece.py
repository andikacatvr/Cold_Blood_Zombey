import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== REBUILDING COMPLETE MASTERPIECE SISTER VALENTINA ===")

art_dir = r'C:\Users\tryfi\.gemini\antigravity\brain\d008bfb7-cdf3-42aa-93f6-a569a857cc5e'
src_bleed_path = os.path.join(art_dir, 'nun_bleed_zero_fringe.png')
im_bleed = Image.open(src_bleed_path).convert('RGB')
bleed_np = np.array(im_bleed)
H, W = bleed_np.shape[:2]

# Load clean alpha to get exact bounds
src_clean_rgba = os.path.join(art_dir, 'nun_clean_floodfill.png')
im_rgba = Image.open(src_clean_rgba)
arr_rgba = np.array(im_rgba)
alpha = arr_rgba[:, :, 3]

ys, xs = np.where(alpha > 0)
ymin, ymax = int(ys.min()), int(ys.max())
xmin, xmax = int(xs.min()), int(xs.max())
print(f"Bounds: Y=[{ymin}, {ymax}], X=[{xmin}, {xmax}]")

# =========================================================
# 1. BUILD MASTER 1024x1024 TEXTURE ATLAS
# =========================================================
crop_ymin = max(0, ymin - 10)
crop_ymax = min(H - 1, ymax + 10)
crop_xmin = max(0, xmin - 10)
crop_xmax = min(W - 1, xmax + 10)
crop_h = crop_ymax - crop_ymin + 1
crop_w = crop_xmax - crop_xmin + 1

cropped_front = bleed_np[crop_ymin:crop_ymax+1, crop_xmin:crop_xmax+1]

atlas = np.full((1024, 1024, 3), [20, 22, 24], dtype=np.uint8)
atlas_front_w = 480
atlas_front_h = 980
x_f_start = 16
y_start = 22
x_b_start = 528
atlas_back_w = 480

front_scaled = cv2.resize(cropped_front, (atlas_front_w, atlas_front_h), interpolation=cv2.INTER_AREA)
atlas[y_start:y_start+atlas_front_h, x_f_start:x_f_start+atlas_front_w] = front_scaled

# Back View: Habit cloth and elegantly draped black veil (U-shaped flowing drape)
habit_path = 'public/textures/sister_valentina_habit.png'
habit_img = Image.open(habit_path).convert('RGB')
habit_resized = cv2.resize(np.array(habit_img), (atlas_back_w, atlas_front_h), interpolation=cv2.INTER_AREA)
habit_resized = np.clip((habit_resized.astype(np.float32) / 255.0) ** 0.70 * 255.0, 0, 255).astype(np.uint8)

back_composite = habit_resized.copy()
cx_b = atlas_back_w // 2

# Elegant U-shaped nun veil draping down the back of head and shoulders down to mid-back
# Veil extends down to y ~ 340 in the center, tapering up to y ~ 200 at the shoulders
for y in range(int(atlas_front_h * 0.45)):
    for x in range(atlas_back_w):
        dx = abs(x - cx_b)
        # Parabolic/catenary drape curve: center hangs lower (y_center ~ 340), shoulders higher (y ~ 200)
        drape_lim = 340.0 - 140.0 * (dx / float(cx_b)) ** 1.8
        if y <= drape_lim:
            # Inside the draped black veil
            # Add subtle vertical fabric wave and grain
            wave = 3.0 * np.sin(x * 0.08) + 2.0 * np.cos(y * 0.05)
            # Soft shadow towards veil hem
            dist_to_hem = drape_lim - y
            edge_shadow = 4.0 if dist_to_hem < 12 else 0.0
            veil_col = np.array([18, 19, 23], dtype=np.float32) + wave - edge_shadow
            back_composite[y, x] = np.clip(veil_col, 12, 35).astype(np.uint8)
        elif y <= drape_lim + 10:
            # Soft shadow beneath the veil hem falling onto the habit
            t = (y - drape_lim) / 10.0
            shadow_factor = 0.55 + 0.45 * t
            back_composite[y, x] = np.clip(back_composite[y, x].astype(np.float32) * shadow_factor, 0, 255).astype(np.uint8)

atlas[y_start:y_start+atlas_front_h, x_b_start:x_b_start+atlas_back_w] = back_composite

# Dedicated pale undead skin patch for back of hands & claws (x: 498 to 524, y: 100 to 200)
# Sampled from genuine pale bloody nun skin in front_scaled
skin_sample = front_scaled[140:170, 235:265]
skin_tile = cv2.resize(skin_sample, (26, 100), interpolation=cv2.INTER_AREA)
atlas[100:200, 498:524] = skin_tile

atlas_pil = Image.fromarray(atlas)
atlas_pil.save('public/textures/nun_perfect_atlas.png')
atlas_pil.save(os.path.join(art_dir, 'nun_masterpiece_atlas.png'))
print("Saved masterpiece texture atlas!")

# =========================================================
# 2. WORLD DIMENSIONS & UV COORDINATE MAPPERS
# =========================================================
world_height = 1.85
scale_y = world_height / float(ymax - ymin)
center_x = 512.0
scale_x = scale_y

def get_uv_front_planar(vx, vy):
    orig_x = center_x + vx / scale_x
    orig_y = ymin + (1.0 - vy / world_height) * (ymax - ymin)
    norm_x = (orig_x - crop_xmin) / float(crop_w)
    norm_y = (orig_y - crop_ymin) / float(crop_h)
    u = (x_f_start + np.clip(norm_x, 0.0, 1.0) * atlas_front_w) / 1024.0
    v = 1.0 - (y_start + np.clip(norm_y, 0.0, 1.0) * atlas_front_h) / 1024.0
    return [float(u), float(v)]

def get_uv_back_planar(vx, vy):
    orig_x = center_x + vx / scale_x
    orig_y = ymin + (1.0 - vy / world_height) * (ymax - ymin)
    norm_x = 1.0 - (orig_x - crop_xmin) / float(crop_w)
    norm_y = (orig_y - crop_ymin) / float(crop_h)
    u = (x_b_start + np.clip(norm_x, 0.0, 1.0) * atlas_back_w) / 1024.0
    v = 1.0 - (y_start + np.clip(norm_y, 0.0, 1.0) * atlas_front_h) / 1024.0
    return [float(u), float(v)]

# Pale bloody skin UV for hands
uv_skin_center = [511.0 / 1024.0, 1.0 - 150.0 / 1024.0]

all_vertices = []
all_uvs = []
all_normals = []
all_faces = []

def add_smooth_column(rings_f, rings_b, cap_top=True, cap_bottom=True, top_dome=False, bottom_apex=False):
    N_rings = len(rings_f)
    K = len(rings_f[0]) - 1

    for i in range(N_rings - 1):
        rf0, rf1 = rings_f[i], rings_f[i + 1]
        rb0, rb1 = rings_b[i], rings_b[i + 1]

        # Front quads (Normal points outward toward +Z)
        for k in range(K):
            all_faces.append([rf0[k], rf1[k], rf1[k + 1]])
            all_faces.append([rf0[k], rf1[k + 1], rf0[k + 1]])

        # Back quads (Normal points outward toward -Z, NEVER culled!)
        for k in range(K):
            all_faces.append([rb0[k], rb1[k], rb1[k + 1]])
            all_faces.append([rb0[k], rb1[k + 1], rb0[k + 1]])

        # Side seams (+X and -X outward)
        all_faces.append([rf0[K], rf1[K], rb1[0]])
        all_faces.append([rf0[K], rb1[0], rb0[0]])
        all_faces.append([rb0[K], rb1[K], rf1[0]])
        all_faces.append([rb0[K], rf1[0], rf0[0]])

    if cap_top:
        rf_top = rings_f[0]
        rb_top = rings_b[0]
        pts = [all_vertices[idx] for idx in rf_top] + [all_vertices[idx] for idx in rb_top]
        c_pos = np.mean(pts, axis=0)
        c_uv = all_uvs[rf_top[K // 2]]
        if top_dome:
            c_pos[1] += 0.015

        apex_idx = len(all_vertices)
        all_vertices.append(c_pos.tolist())
        all_uvs.append(c_uv)
        all_normals.append([0.0, 1.0, 0.0])

        for k in range(K):
            all_faces.append([apex_idx, rf_top[k], rf_top[k + 1]])
            all_faces.append([apex_idx, rb_top[k], rb_top[k + 1]])
        all_faces.append([apex_idx, rf_top[K], rb_top[0]])
        all_faces.append([apex_idx, rb_top[K], rf_top[0]])

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
            all_faces.append([apex_idx, rf_bot[k + 1], rf_bot[k]])
            all_faces.append([apex_idx, rb_bot[k + 1], rb_bot[k]])
        all_faces.append([apex_idx, rb_bot[0], rf_bot[K]])
        all_faces.append([apex_idx, rf_bot[0], rb_bot[K]])

# =========================================================
# 3. HEAD & WIMPLE (Y: 20 to 290)
# =========================================================
K_head = 10
head_rf, head_rb = [], []

head_steps_cfg = [
    # y_px, zc, x_min_px, x_max_px, rz_f, rz_b
    (20,   0.000, 485, 540, 0.040, 0.040), # Veil apex
    (50,  -0.005, 455, 570, 0.070, 0.070), # Upper hood crown
    (90,  -0.005, 435, 590, 0.095, 0.090), # Forehead & temple hood
    (140,  0.004, 420, 608, 0.110, 0.100), # Bleeding eyes level
    (180,  0.008, 412, 618, 0.115, 0.105), # Cheeks & nose
    (215,  0.010, 405, 626, 0.115, 0.105), # Bloody mouth
    (245,  0.016, 396, 638, 0.105, 0.100), # Chin & jaw
    (270,  0.005, 388, 648, 0.095, 0.090), # Under chin / throat
    (290,  0.000, 375, 660, 0.085, 0.080), # Collar junction (seamless with torso!)
]

for y_px, zc, x_min_px, x_max_px, rz_f, rz_b in head_steps_cfg:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    rx = (x_max_px - x_min_px) * 0.5 * scale_x
    row_cx = (x_min_px + x_max_px) * 0.5
    
    rf, rb = [], []

    for k in range(K_head + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_head)
        vx = (row_cx - center_x) * scale_x + rx * np.sin(th)
        vz = zc + rz_f * np.cos(th)
        uv = get_uv_front_planar(vx, y_world)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.0, np.cos(th)])
        rf.append(v_idx)

    for k in range(K_head + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_head)
        vx = (row_cx - center_x) * scale_x + rx * np.sin(th)
        vz = zc + rz_b * np.cos(th)
        uv = get_uv_back_planar(vx, y_world)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.0, np.cos(th)])
        rb.append(v_idx)

    head_rf.append(rf)
    head_rb.append(rb)

add_smooth_column(head_rf, head_rb, cap_top=True, cap_bottom=False, top_dome=True)

# =========================================================
# 4. TORSO, COWL CAPE & FLOWING GOWN (Y: 290 to 1515)
# Volumetric cape wraps around shoulders and back seamlessly!
# =========================================================
K_body = 12
body_rf, body_rb = [], []

body_steps_cfg = [
    # y_px, x_min_px, x_max_px, rz_f, rz_b
    (290,  375, 660, 0.085, 0.085), # Collar junction (seamless with head!)
    (320,  346, 687, 0.100, 0.095), # Cowl shoulder slope
    (360,  315, 718, 0.120, 0.110), # Cowl chest & brooch pins
    (410,  295, 730, 0.135, 0.120), # Chest & silver crucifix
    (460,  320, 705, 0.130, 0.115), # Mid bust / cowl lower rim
    (530,  375, 650, 0.110, 0.095), # Bodice beneath cowl
    (610,  402, 636, 0.090, 0.080), # Cinched waist
    (700,  370, 668, 0.105, 0.090), # Upper hips
    (800,  345, 692, 0.125, 0.110), # Mid hips
    (920,  318, 722, 0.150, 0.135), # Upper skirt flare
    (1050, 288, 752, 0.175, 0.160), # Mid skirt flare
    (1180, 258, 782, 0.205, 0.185), # Lower skirt
    (1320, 222, 818, 0.240, 0.215), # Flare to hem
    (1440, 195, 842, 0.275, 0.245), # Hem
    (1510, 185, 845, 0.295, 0.265), # Ground contact
]

for y_px, x_min_px, x_max_px, rz_f, rz_b in body_steps_cfg:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    rx = (x_max_px - x_min_px) * 0.5 * scale_x
    row_cx = (x_min_px + x_max_px) * 0.5
    
    rf, rb = [], []

    for k in range(K_body + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_body)
        vx = (row_cx - center_x) * scale_x + rx * np.sin(th)
        vz = rz_f * np.cos(th)
        uv = get_uv_front_planar(vx, y_world)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.02, np.cos(th)])
        rf.append(v_idx)

    for k in range(K_body + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_body)
        vx = (row_cx - center_x) * scale_x + rx * np.sin(th)
        vz = rz_b * np.cos(th)
        uv = get_uv_back_planar(vx, y_world)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.02, np.cos(th)])
        rb.append(v_idx)

    body_rf.append(rf)
    body_rb.append(rb)

# Solid sealed underskirt cap at the bottom
add_smooth_column(body_rf, body_rb, cap_top=False, cap_bottom=True, bottom_apex=True)

# =========================================================
# 5. INTEGRATED 3D ARMS: BELL SLEEVE, FOREARM, SOLID PALM & 4 DEMONIC CLAW FINGERS
# =========================================================
K_arm = 8

def build_complete_arm_and_hand(is_right=False):
    sign = 1.0 if is_right else -1.0
    
    # 1. Bell Sleeve (Jubah Lengan Bawah)
    # Starts at shoulder (Y=330) and flares down to wide elbow cuff (Y=560)
    sleeve_steps = [
        # y_px, cx_px, rx_m, rz_m
        (330, 512 + sign * 185, 0.042, 0.042),
        (380, 512 + sign * 220, 0.052, 0.052),
        (440, 512 + sign * 255, 0.065, 0.062),
        (500, 512 + sign * 285, 0.078, 0.072),
        (560, 512 + sign * 300, 0.092, 0.082), # Flared bell cuff
    ]
    s_rf, s_rb = [], []
    for y_px, cx_px, rx, rz in sleeve_steps:
        norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
        yw = norm_y * world_height
        mid_vx = (cx_px - center_x) * scale_x
        rf, rb = [], []
        
        for k in range(K_arm + 1):
            th = -np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = 0.040 + rz * np.cos(th)
            uv = get_uv_front_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = 0.040 + rz * np.cos(th)
            uv = get_uv_back_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        s_rf.append(rf)
        s_rb.append(rb)
        
    add_smooth_column(s_rf, s_rb, cap_top=True, cap_bottom=True)

    # 2. Forearm (Lengan Bawah)
    # Emerges from inside sleeve cuff (Y=540) angling up to wrist (Y=420)
    forearm_steps = [
        # y_px, cx_px, zw, rx_m, rz_m
        (420, 512 + sign * 340, 0.125, 0.026, 0.022), # Wrist
        (460, 512 + sign * 320, 0.095, 0.028, 0.025), # Lower forearm
        (500, 512 + sign * 300, 0.070, 0.030, 0.028), # Mid forearm
        (540, 512 + sign * 280, 0.045, 0.032, 0.030), # Elbow inside sleeve
    ]
    a_rf, a_rb = [], []
    for y_px, cx_px, zw, rx, rz in forearm_steps:
        norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
        yw = norm_y * world_height
        mid_vx = (cx_px - center_x) * scale_x
        rf, rb = [], []
        
        for k in range(K_arm + 1):
            th = -np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = zw + rz * np.cos(th)
            uv = get_uv_front_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = zw + rz * np.cos(th)
            # Back of forearm gets authentic pale undead skin UV!
            uv = uv_skin_center
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        a_rf.append(rf)
        a_rb.append(rb)
        
    add_smooth_column(a_rf, a_rb, cap_top=False, cap_bottom=True)

    # 3. Solid 3D Palm (Telapak Tangan Utuh)
    # Connects seamlessly from wrist (Y=420) to knuckles (Y=330)
    palm_steps = [
        # y_px, cx_px, zw, rx_m, rz_m
        (330, 512 + sign * 375, 0.170, 0.038, 0.016), # Knuckle line (broad flattened palm)
        (360, 512 + sign * 365, 0.155, 0.034, 0.018), # Mid palm
        (390, 512 + sign * 352, 0.140, 0.030, 0.020), # Palm base
        (420, 512 + sign * 340, 0.125, 0.026, 0.022), # Wrist connection
    ]
    p_rf, p_rb = [], []
    for y_px, cx_px, zw, rx, rz in palm_steps:
        norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
        yw = norm_y * world_height
        mid_vx = (cx_px - center_x) * scale_x
        rf, rb = [], []
        
        for k in range(K_arm + 1):
            th = -np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = zw + rz * np.cos(th)
            uv = get_uv_front_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = zw + rz * np.cos(th)
            uv = uv_skin_center
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        p_rf.append(rf)
        p_rb.append(rb)
        
    add_smooth_column(p_rf, p_rb, cap_top=True, cap_bottom=False)

    # 4. 4 Solid 3D Demonic Claw Fingers (4 Cakar Iblis 3D Beruas)
    # Real landmark positions from reference asset:
    # Each claw has Base (Knuckle) -> Mid Joint -> Sharp Demonic Tip
    claw_configs = [
        # (base_px, mid_px, tip_px, base_z, mid_z, tip_z, r_base, r_tip)
        # Thumb / inner claw
        ((512 + sign * 350, 335), (512 + sign * 360, 295), (512 + sign * 350, 255), 0.165, 0.180, 0.170, 0.009, 0.004),
        # Index claw
        ((512 + sign * 368, 330), (512 + sign * 372, 285), (512 + sign * 370, 240), 0.170, 0.190, 0.185, 0.009, 0.0035),
        # Middle claw
        ((512 + sign * 386, 332), (512 + sign * 400, 290), (512 + sign * 410, 250), 0.168, 0.185, 0.175, 0.0085, 0.0035),
        # Pinky / outer claw
        ((512 + sign * 402, 338), (512 + sign * 420, 305), (512 + sign * 435, 270), 0.160, 0.175, 0.155, 0.008, 0.003),
    ]

    for (bx, by), (mx, my), (tx, ty), bz, mz, tz, r_base, r_tip in claw_configs:
        # Convert to world coordinates
        def to_world(px, py, zw):
            xw = (px - center_x) * scale_x
            yw = (1.0 - (py - ymin) / float(ymax - ymin)) * world_height
            return np.array([xw, yw, zw], dtype=float)

        p_base = to_world(bx, by, bz)
        p_mid  = to_world(mx, my, mz)
        p_tip  = to_world(tx, ty, tz)

        # Build 3 rings of 6 vertices along the claw
        claw_rings = [
            (p_base, r_base, bx, by),
            (p_mid,  (r_base + r_tip) * 0.55, mx, my),
            (p_tip,  r_tip, tx, ty),
        ]
        
        c_ring_indices = []
        for p_center, rad, px_img, py_img in claw_rings:
            ring_idx = []
            for s in range(6):
                ang = 2.0 * np.pi * s / 6.0
                vx = p_center[0] + rad * np.cos(ang)
                vy = p_center[1] + rad * np.sin(ang) * 0.5
                vz = p_center[2] + rad * np.sin(ang) * 0.8
                
                # Front-facing half gets front planar UV, back half gets skin center UV
                uv = get_uv_front_planar(vx, vy) if np.sin(ang) >= 0 else uv_skin_center
                
                v_idx = len(all_vertices)
                all_vertices.append([vx, vy, vz])
                all_uvs.append(uv)
                all_normals.append([np.cos(ang), 0.0, np.sin(ang)])
                ring_idx.append(v_idx)
            c_ring_indices.append(ring_idx)
            
        # Faces between ring 0 & 1, and ring 1 & 2
        for seg in range(2):
            r0 = c_ring_indices[seg]
            r1 = c_ring_indices[seg + 1]
            for s in range(6):
                s_next = (s + 1) % 6
                all_faces.append([r0[s], r1[s], r1[s_next]])
                all_faces.append([r0[s], r1[s_next], r0[s_next]])
                
        # Close the sharp claw tip
        tip_apex = p_tip + (p_tip - p_mid) * 0.25
        tip_uv = get_uv_front_planar(tip_apex[0], tip_apex[1])
        tip_idx = len(all_vertices)
        all_vertices.append(tip_apex.tolist())
        all_uvs.append(tip_uv)
        all_normals.append([0.0, 1.0, 0.0])
        r_last = c_ring_indices[-1]
        for s in range(6):
            s_next = (s + 1) % 6
            all_faces.append([tip_idx, r_last[s], r_last[s_next]])

# Build complete arms, palms, and claws for both left and right
build_complete_arm_and_hand(is_right=False)
build_complete_arm_and_hand(is_right=True)

# Nun shoes
mat_dark = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.12, 0.12, 0.14, 1.0],
    roughnessFactor=0.92,
    metallicFactor=0.02,
    doubleSided=True
)
shoe_l = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_l.apply_translation([-0.09, 0.022, 0.02])
shoe_l.visual.material = mat_dark

shoe_r = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_r.apply_translation([0.09, 0.022, 0.02])
shoe_r.visual.material = mat_dark

mat_atlas = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.04,
    doubleSided=True
)

vis_main = trimesh.visual.texture.TextureVisuals(uv=np.array(all_uvs), material=mat_atlas)
main_mesh = trimesh.Trimesh(
    vertices=np.array(all_vertices),
    faces=np.array(all_faces),
    visual=vis_main,
    process=False
)
main_mesh.name = 'nun_body'

all_scene_meshes = [main_mesh, shoe_l, shoe_r]
scene = trimesh.Scene(all_scene_meshes)

out_glb_public = 'public/models/sister_valentina.glb'
out_glb_root = 'sister_valentina.glb'
out_glb_dist = 'dist/models/sister_valentina.glb'

glb_bytes = trimesh.exchange.gltf.export_glb(scene)
with open(out_glb_public, 'wb') as f: f.write(glb_bytes)
with open(out_glb_root, 'wb') as f: f.write(glb_bytes)
if os.path.exists('dist/models'):
    with open(out_glb_dist, 'wb') as f: f.write(glb_bytes)

print(f"Exported Complete Masterpiece Sister Valentina GLB: {len(glb_bytes) / 1024:.1f} KB")
