import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== REBUILDING DEFINITIVE MASTERPIECE SISTER VALENTINA ===")

art_dir = r'C:\Users\tryfi\.gemini\antigravity\brain\d008bfb7-cdf3-42aa-93f6-a569a857cc5e'
src_path = 'Retro Low-Poly Undead Nun Asset.png'
if not os.path.exists(src_path):
    raise FileNotFoundError(f"Source '{src_path}' not found!")

src_bgr = cv2.imread(src_path)
H, W = src_bgr.shape[:2]
print(f"Loaded source image: {W}x{H}")

# 1. Precise Background Masking & Dark Edge Bleed
is_bg = (src_bgr[:, :, 0] > 200) & (src_bgr[:, :, 1] > 200) & (src_bgr[:, :, 2] > 200)
fg_mask = (~is_bg).astype(np.uint8) * 255

kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

ys, xs = np.where(fg_mask > 0)
ymin, ymax = int(ys.min()), int(ys.max())
xmin, xmax = int(xs.min()), int(xs.max())
print(f"Foreground bounds: Y=[{ymin}, {ymax}], X=[{xmin}, {xmax}]")

# Dilate edge pixels so UV sampling at silhouette borders never picks up grey background
clean_front = np.full_like(src_bgr, [22, 23, 26])
clean_front[fg_mask > 0] = src_bgr[fg_mask > 0]

cur_mask = (fg_mask > 0).copy()
for _ in range(16):
    up = np.roll(cur_mask, -1, axis=0); up[-1, :] = False
    down = np.roll(cur_mask, 1, axis=0); down[0, :] = False
    left = np.roll(cur_mask, -1, axis=1); left[:, -1] = False
    right = np.roll(cur_mask, 1, axis=1); right[:, 0] = False
    border = (~cur_mask) & (up | down | left | right)
    if not np.any(border): break
    by, bx = np.where(border)
    for y, x in zip(by, bx):
        for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and cur_mask[ny, nx]:
                clean_front[y, x] = clean_front[ny, nx]
                break
    cur_mask |= border

# 2. Master 1024x1024 Texture Atlas
crop_ymin = max(0, ymin - 10)
crop_ymax = min(H - 1, ymax + 10)
crop_xmin = max(0, xmin - 10)
crop_xmax = min(W - 1, xmax + 10)
crop_h = crop_ymax - crop_ymin + 1
crop_w = crop_xmax - crop_xmin + 1

cropped_front = clean_front[crop_ymin:crop_ymax+1, crop_xmin:crop_xmax+1]

atlas = np.full((1024, 1024, 3), [20, 22, 24], dtype=np.uint8)
atlas_front_w = 480
atlas_front_h = 980
x_f_start = 16
y_start = 22
x_b_start = 528
atlas_back_w = 480

front_scaled = cv2.resize(cropped_front, (atlas_front_w, atlas_front_h), interpolation=cv2.INTER_AREA)
atlas[y_start:y_start+atlas_front_h, x_f_start:x_f_start+atlas_front_w] = front_scaled

# Back View: Rich gothic nun habit cloth with draped black veil
habit_path = 'public/textures/sister_valentina_habit.png'
if os.path.exists(habit_path):
    habit_img = Image.open(habit_path).convert('RGB')
    habit_resized = cv2.resize(np.array(habit_img), (atlas_back_w, atlas_front_h), interpolation=cv2.INTER_AREA)
    habit_resized = np.clip((habit_resized.astype(np.float32) / 255.0) ** 0.75 * 255.0, 0, 255).astype(np.uint8)
else:
    habit_resized = np.full((atlas_front_h, atlas_back_w, 3), [28, 30, 32], dtype=np.uint8)

back_composite = habit_resized.copy()
cx_b = atlas_back_w // 2

# Draped veil covering back of head and upper shoulders in a flowing catenary curve
for y in range(int(atlas_front_h * 0.45)):
    for x in range(atlas_back_w):
        dx = abs(x - cx_b)
        drape_lim = 330.0 - 130.0 * (dx / float(cx_b)) ** 1.85
        if y <= drape_lim:
            wave = 3.0 * np.sin(x * 0.08) + 2.0 * np.cos(y * 0.05)
            dist_to_hem = drape_lim - y
            edge_shadow = 4.0 if dist_to_hem < 12 else 0.0
            veil_col = np.array([18, 19, 23], dtype=np.float32) + wave - edge_shadow
            back_composite[y, x] = np.clip(veil_col, 12, 35).astype(np.uint8)
        elif y <= drape_lim + 12:
            t = (y - drape_lim) / 12.0
            shadow_factor = 0.55 + 0.45 * t
            back_composite[y, x] = np.clip(back_composite[y, x].astype(np.float32) * shadow_factor, 0, 255).astype(np.uint8)

atlas[y_start:y_start+atlas_front_h, x_b_start:x_b_start+atlas_back_w] = back_composite

# Dedicated pale undead skin patch for back of hands & claws
skin_sample = front_scaled[140:170, 235:265]
skin_tile = cv2.resize(skin_sample, (26, 100), interpolation=cv2.INTER_AREA)
atlas[100:200, 498:524] = skin_tile

atlas_pil = Image.fromarray(cv2.cvtColor(atlas, cv2.COLOR_BGR2RGB))
os.makedirs('public/textures', exist_ok=True)
atlas_pil.save('public/textures/nun_perfect_atlas.png')
atlas_pil.save(os.path.join(art_dir, 'nun_masterpiece_atlas.png'))
print("Saved Master Texture Atlas!")

# 3. Coordinate System & Planar UV Mapping
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

        # Back quads (CCW winding pointing toward -Z)
        for k in range(K):
            all_faces.append([rb0[k], rb1[k + 1], rb1[k]])
            all_faces.append([rb0[k], rb0[k + 1], rb1[k + 1]])

        # Seams
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
            c_pos[1] += 0.018

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
            c_pos[1] -= 0.015

        apex_idx = len(all_vertices)
        all_vertices.append(c_pos.tolist())
        all_uvs.append(c_uv)
        all_normals.append([0.0, -1.0, 0.0])

        for k in range(K):
            all_faces.append([apex_idx, rf_bot[k], rf_bot[k + 1]])
            all_faces.append([apex_idx, rb_bot[k + 1], rb_bot[k]])
        all_faces.append([apex_idx, rf_bot[K], rb_bot[0]])
        all_faces.append([apex_idx, rb_bot[K], rf_bot[0]])

# 4. CONTINUOUS, ORGANIC HEAD, VEIL, SHOULDERS & BELL SKIRT
# Beautiful organic curves:
# - Head: smoothly rounded veil dome, perfectly framing the bloody undead face
# - Cowl: natural sloped human shoulders with mozzetta cape draping over the chest with silver cross
#   NO sharp horizontal wing flaps!
# - Waist: cinched at Y=610
# - Gown: dramatic wide Gothic bell silhouette flaring all the way to Y=1512
print("1. Modeling Organic Unified Head, Cowl, Torso, and Bell Gown...")
K_main = 14
main_rf, main_rb = [], []

body_steps = [
    # y_px, zc, x_min_px, x_max_px, rz_f, rz_b
    # 1. Rounded Crown of Veil
    (20,    0.000, 488, 536, 0.040, 0.045), # Apex
    (50,   -0.005, 452, 572, 0.065, 0.072), # Crown curve
    (80,   -0.005, 436, 588, 0.085, 0.090), # Upper temples & veil
    # 2. Face in Veil Hood (Soft elliptical framing)
    (130,   0.005, 424, 604, 0.100, 0.098), # Bleeding eyes
    (170,   0.008, 414, 616, 0.108, 0.102), # Nose & cheeks
    (210,   0.010, 404, 626, 0.110, 0.102), # Bloody mouth
    (245,   0.014, 396, 636, 0.102, 0.096), # Chin & jawline
    (270,   0.006, 388, 644, 0.092, 0.088), # Throat / collar junction
    # 3. Shoulders & Draped Mozzetta Cowl (Natural shoulder slope, NO horizontal wing flaps!)
    (295,   0.000, 370, 662, 0.090, 0.086), # Trapezius / upper collar
    (325,   0.002, 340, 692, 0.100, 0.096), # Shoulder slope
    (365,   0.006, 316, 716, 0.115, 0.106), # Deltoid & upper cowl
    (410,   0.010, 305, 725, 0.125, 0.115), # Mid cowl & Silver Crucifix
    (460,   0.008, 315, 715, 0.128, 0.115), # Lower cowl hem drape
    (520,   0.002, 345, 685, 0.118, 0.102), # Natural taper below cowl
    (580,  -0.004, 382, 648, 0.100, 0.088), # Approaching waist
    (620,  -0.005, 402, 628, 0.092, 0.080), # Cinched Gothic Waist
    # 4. Flared Victorian Gothic Bell Gown
    (700,  -0.005, 375, 660, 0.108, 0.092), # Upper hips
    (800,  -0.005, 348, 690, 0.128, 0.112), # Lower hips
    (920,   0.000, 318, 722, 0.155, 0.138), # Upper skirt flare
    (1050,  0.000, 285, 755, 0.192, 0.172), # Mid skirt flare
    (1180,  0.000, 250, 790, 0.235, 0.210), # Lower flare
    (1320,  0.000, 215, 825, 0.280, 0.250), # Full bell flare
    (1440,  0.000, 192, 846, 0.325, 0.290), # Hem contact
    (1512,  0.000, 182, 848, 0.345, 0.308), # Solid ground contact
]

for y_px, zc, x_min_px, x_max_px, rz_f, rz_b in body_steps:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    rx = (x_max_px - x_min_px) * 0.5 * scale_x
    row_cx = (x_min_px + x_max_px) * 0.5

    rf, rb = [], []

    for k in range(K_main + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_main)
        vx = (row_cx - center_x) * scale_x + rx * np.sin(th)
        vz = zc + rz_f * np.cos(th)
        uv = get_uv_front_planar(vx, y_world)

        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.02, np.cos(th)])
        rf.append(v_idx)

    for k in range(K_main + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_main)
        vx = (row_cx - center_x) * scale_x + rx * np.sin(th)
        vz = zc + rz_b * np.cos(th)
        uv = get_uv_back_planar(vx, y_world)

        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.02, np.cos(th)])
        rb.append(v_idx)

    main_rf.append(rf)
    main_rb.append(rb)

# Cap head dome and ground hem apex
add_smooth_column(main_rf, main_rb, cap_top=True, cap_bottom=True, top_dome=True, bottom_apex=True)

# 5. VOLUMETRIC BELL SLEEVES, FOREARMS, FLESHY PALM & DEMONIC CLAWS
print("2. Modeling Dramatic Gothic Bell Sleeves, Articulated Palms & Claws...")
K_arm = 8

def build_complete_arm(is_right=False):
    sign = 1.0 if is_right else -1.0

    # 1. Voluminous Gothic Bell Sleeves hanging down to waist (Y_px: 330 to 605)
    # The sleeve flares widely as it drops, creating that iconic dark romantic nun silhouette!
    sleeve_steps = [
        # y_px, cx_px, rx_m, rz_m
        (330, 512 + sign * 185, 0.048, 0.048), # Shoulder joint under cowl
        (380, 512 + sign * 215, 0.060, 0.058),
        (440, 512 + sign * 252, 0.076, 0.070),
        (500, 512 + sign * 280, 0.092, 0.082),
        (560, 512 + sign * 295, 0.106, 0.092),
        (605, 512 + sign * 300, 0.110, 0.096), # Dramatic wide bell cuff hanging down!
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

    # 2. Forearm & Fleshy Palm (Emerging upward from inside bell sleeve)
    # The hand has realistic volume and width, matching the 155px wide hand in the reference!
    arm_hand_steps = [
        # y_px, cx_px, zw, rx_m, rz_m
        (580, 512 + sign * 265, 0.050, 0.038, 0.034), # Inside sleeve cuff
        (520, 512 + sign * 290, 0.080, 0.036, 0.032), # Mid forearm
        (460, 512 + sign * 318, 0.115, 0.034, 0.030), # Lower forearm
        (410, 512 + sign * 342, 0.148, 0.036, 0.026), # Wrist
        (370, 512 + sign * 360, 0.170, 0.044, 0.024), # Fleshy Palm
        (340, 512 + sign * 372, 0.186, 0.052, 0.022), # Knuckle Arch
    ]
    h_rf, h_rb = [], []
    for y_px, cx_px, zw, rx, rz in arm_hand_steps:
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

        h_rf.append(rf)
        h_rb.append(rb)

    add_smooth_column(h_rf, h_rb, cap_top=True, cap_bottom=True, top_dome=True)

    # 3. Four Substantial, Articulated Demonic Claws (Matching reference pixel widths!)
    # In reference: Claws are thick, terrifying fingers curving upward and slightly inward
    claw_configs = [
        # (base_px, mid_px, tip_px, base_z, mid_z, tip_z, r_base, r_tip)
        # Inner Claw (Thumb)
        ((512 + sign * 340, 342), (512 + sign * 348, 305), (512 + sign * 342, 270), 0.180, 0.198, 0.185, 0.013, 0.006),
        # Index Claw
        ((512 + sign * 360, 338), (512 + sign * 368, 290), (512 + sign * 365, 245), 0.186, 0.208, 0.198, 0.014, 0.006),
        # Middle Claw
        ((512 + sign * 382, 340), (512 + sign * 398, 295), (512 + sign * 408, 255), 0.184, 0.202, 0.190, 0.0135, 0.0055),
        # Pinky / Outer Claw
        ((512 + sign * 402, 346), (512 + sign * 420, 312), (512 + sign * 432, 275), 0.176, 0.192, 0.172, 0.012, 0.005),
    ]

    for (bx, by), (mx, my), (tx, ty), bz, mz, tz, r_base, r_tip in claw_configs:
        def to_world(px, py, zw):
            xw = (px - center_x) * scale_x
            yw = (1.0 - (py - ymin) / float(ymax - ymin)) * world_height
            return np.array([xw, yw, zw], dtype=float)

        p_base = to_world(bx, by, bz)
        p_mid  = to_world(mx, my, mz)
        p_tip  = to_world(tx, ty, tz)

        claw_rings = [
            (p_base, r_base, bx, by),
            (p_mid,  (r_base + r_tip) * 0.58, mx, my),
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

                uv = get_uv_front_planar(vx, vy) if np.sin(ang) >= 0 else uv_skin_center

                v_idx = len(all_vertices)
                all_vertices.append([vx, vy, vz])
                all_uvs.append(uv)
                all_normals.append([np.cos(ang), 0.0, np.sin(ang)])
                ring_idx.append(v_idx)
            c_ring_indices.append(ring_idx)

        # Quads between rings
        for seg in range(2):
            r0 = c_ring_indices[seg]
            r1 = c_ring_indices[seg + 1]
            for s in range(6):
                s_next = (s + 1) % 6
                all_faces.append([r0[s], r1[s], r1[s_next]])
                all_faces.append([r0[s], r1[s_next], r0[s_next]])

        # Claw base cap (watertight base)
        base_apex = p_base - (p_mid - p_base) * 0.25
        base_uv = get_uv_front_planar(base_apex[0], base_apex[1])
        base_idx = len(all_vertices)
        all_vertices.append(base_apex.tolist())
        all_uvs.append(base_uv)
        all_normals.append([0.0, -1.0, 0.0])
        r_first = c_ring_indices[0]
        for s in range(6):
            s_next = (s + 1) % 6
            all_faces.append([base_idx, r_first[s_next], r_first[s]])

        # Claw tip apex
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

# Build complete arms for left and right
build_complete_arm(is_right=False)
build_complete_arm(is_right=True)

# 6. Nun Shoes / Boots
mat_dark = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.12, 0.12, 0.14, 1.0],
    roughnessFactor=0.92,
    metallicFactor=0.02,
    doubleSided=True
)
shoe_l = trimesh.creation.box(extents=[0.08, 0.045, 0.16])
shoe_l.apply_translation([-0.09, 0.022, 0.02])
shoe_l.visual.material = mat_dark

shoe_r = trimesh.creation.box(extents=[0.08, 0.045, 0.16])
shoe_r.apply_translation([0.09, 0.022, 0.02])
shoe_r.visual.material = mat_dark

# Main body mesh & materials
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
main_mesh.name = 'sister_valentina_body'

# Verify Watertightness
edge_groups = trimesh.grouping.group_rows(main_mesh.edges_sorted, require_count=1)
boundary_edges = main_mesh.edges_sorted[edge_groups]
print(f"=== WATERTIGHTNESS VERIFICATION ===")
print(f"Total vertices: {len(main_mesh.vertices)}")
print(f"Total faces: {len(main_mesh.faces)}")
print(f"Boundary edges count: {len(boundary_edges)}")
print(f"Is watertight: {len(boundary_edges) == 0}")

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

print(f"Successfully exported Sister Valentina GLB: {len(glb_bytes) / 1024:.1f} KB")
