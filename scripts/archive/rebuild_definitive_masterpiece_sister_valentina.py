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

# 1. Background Mask & Edge-Bleed
# Background is neutral light grey (mean > 205)
is_bg = (src_bgr[:, :, 0] > 205) & (src_bgr[:, :, 1] > 205) & (src_bgr[:, :, 2] > 205)
fg_mask = (~is_bg).astype(np.uint8) * 255

# Clean minor noise
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

ys, xs = np.where(fg_mask > 0)
ymin, ymax = int(ys.min()), int(ys.max())
xmin, xmax = int(xs.min()), int(xs.max())
print(f"Foreground bounds: Y=[{ymin}, {ymax}], X=[{xmin}, {xmax}]")

# Dilate edge pixels for clean front texture without white halos
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
habit_img = Image.open(habit_path).convert('RGB')
habit_resized = cv2.resize(np.array(habit_img), (atlas_back_w, atlas_front_h), interpolation=cv2.INTER_AREA)
habit_resized = np.clip((habit_resized.astype(np.float32) / 255.0) ** 0.72 * 255.0, 0, 255).astype(np.uint8)

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
atlas_pil.save('public/textures/nun_perfect_atlas.png')
atlas_pil.save(os.path.join(art_dir, 'nun_masterpiece_atlas.png'))
print("Saved Master Texture Atlas!")

# 3. Coordinate System & UV Functions
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

        # Back quads (Proven correct CCW winding order from perfect_100_replica.py!)
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

# 4. CONTINUOUS HEAD, TORSO, COWL & GOWN AS ONE UNIFIED WATERTIGHT COLUMN
# This eliminates ALL neck holes and gaps permanently!
print("1. Modeling Unified Watertight Head, Torso, and Gown...")
K_main = 12
main_rf, main_rb = [], []

# Complete continuous steps from top of veil (y_px=18) to ground hem (y_px=1512):
body_steps = [
    # y_px, zc, x_min_px, x_max_px, rz_f, rz_b
    # Head & Veil
    (18,    0.000, 485, 540, 0.040, 0.040),  # Veil apex
    (50,   -0.005, 455, 570, 0.070, 0.070),  # Hood crown
    (90,   -0.005, 435, 590, 0.095, 0.090),  # Temples & hood
    (140,   0.004, 420, 608, 0.110, 0.100),  # Bleeding eyes level
    (180,   0.008, 412, 618, 0.115, 0.105),  # Nose & cheeks
    (215,   0.010, 405, 626, 0.115, 0.105),  # Bloody mouth
    (245,   0.016, 396, 638, 0.105, 0.100),  # Chin & jawline
    (270,   0.005, 388, 648, 0.095, 0.090),  # Throat / under-chin
    # Seamless transition to Cowl / Shoulders & Torso
    (290,   0.000, 375, 660, 0.088, 0.085),  # Collar junction
    (320,   0.000, 346, 687, 0.100, 0.095),  # Shoulder slope
    (360,   0.005, 315, 718, 0.120, 0.110),  # Cowl chest & brooch pins
    (410,   0.010, 295, 730, 0.135, 0.120),  # Chest & silver crucifix
    (460,   0.008, 320, 705, 0.130, 0.115),  # Mid bust / cowl lower rim
    (530,   0.000, 375, 650, 0.110, 0.095),  # Bodice beneath cowl
    (610,  -0.005, 402, 636, 0.090, 0.080),  # Cinched waist
    (700,  -0.005, 370, 668, 0.105, 0.090),  # Upper hips
    (800,  -0.005, 345, 692, 0.125, 0.110),  # Mid hips
    (920,   0.000, 318, 722, 0.150, 0.135),  # Upper skirt flare
    (1050,  0.000, 287, 752, 0.190, 0.170),  # Mid skirt flare
    (1180,  0.000, 252, 787, 0.230, 0.205),  # Lower skirt
    (1320,  0.000, 217, 823, 0.275, 0.245),  # Flare to hem
    (1440,  0.000, 195, 842, 0.320, 0.285),  # Hem contact
    (1512,  0.000, 185, 845, 0.345, 0.305),  # Solid ground contact
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

# Top dome cap for veil, bottom sealed apex for underskirt
add_smooth_column(main_rf, main_rb, cap_top=True, cap_bottom=True, top_dome=True, bottom_apex=True)

# 5. CONTINUOUS ANATOMICAL ARMS & HANDS WITH SOLID PALM & 4 ARTICULATED CLAWS
print("2. Modeling Continuous Solid Volumetric Arms & Claws...")
K_arm = 8

def build_complete_arm(is_right=False):
    sign = 1.0 if is_right else -1.0

    # Upper Arm & Flared Bell Sleeve (Y_px: 330 down to elbow 605)
    sleeve_steps = [
        # y_px, cx_px, rx_m, rz_m
        (330, 512 + sign * 185, 0.046, 0.046), # Shoulder socket under cowl
        (380, 512 + sign * 215, 0.056, 0.056),
        (440, 512 + sign * 250, 0.068, 0.066),
        (500, 512 + sign * 275, 0.082, 0.076),
        (560, 512 + sign * 288, 0.096, 0.086),
        (605, 512 + sign * 292, 0.098, 0.088), # Complete flare down to mid waist!
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

    # Top capped inside shoulder, bottom capped inside sleeve cuff
    add_smooth_column(s_rf, s_rb, cap_top=True, cap_bottom=True)

    # Forearm & Solid Palm: ONE CONTINUOUS COLUMN from Elbow (580) to Wrist (420) to Knuckles (330)
    # This guarantees ZERO wrist seam or hole!
    arm_hand_steps = [
        # y_px, cx_px, zw, rx_m, rz_m, is_palm
        (580, 512 + sign * 265, 0.045, 0.034, 0.030, False), # Emerging from inside bell sleeve
        (530, 512 + sign * 290, 0.070, 0.032, 0.028, False), # Mid forearm
        (470, 512 + sign * 315, 0.098, 0.029, 0.025, False), # Lower forearm
        (420, 512 + sign * 340, 0.128, 0.027, 0.023, True),  # Wrist
        (380, 512 + sign * 358, 0.150, 0.033, 0.020, True),  # Mid palm
        (350, 512 + sign * 372, 0.168, 0.038, 0.018, True),  # Knuckle base
        (330, 512 + sign * 380, 0.178, 0.042, 0.016, True),  # Knuckle arch
    ]
    h_rf, h_rb = [], []
    for y_px, cx_px, zw, rx, rz, is_palm in arm_hand_steps:
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
            uv = uv_skin_center # Authentic pale bloody undead skin on back of arm and hand!

            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)

        h_rf.append(rf)
        h_rb.append(rb)

    # Bottom capped inside sleeve elbow, top knuckle dome capped
    add_smooth_column(h_rf, h_rb, cap_top=True, cap_bottom=True, top_dome=True)

    # 4 Jointed Demonic Claws emerging from the solid knuckle arch
    claw_configs = [
        # (base_px, mid_px, tip_px, base_z, mid_z, tip_z, r_base, r_tip)
        # Thumb / inner claw
        ((512 + sign * 350, 335), (512 + sign * 360, 295), (512 + sign * 350, 255), 0.168, 0.185, 0.175, 0.009, 0.004),
        # Index claw
        ((512 + sign * 368, 330), (512 + sign * 374, 285), (512 + sign * 372, 240), 0.174, 0.195, 0.190, 0.009, 0.0035),
        # Middle claw
        ((512 + sign * 386, 332), (512 + sign * 402, 290), (512 + sign * 412, 250), 0.172, 0.190, 0.180, 0.0085, 0.0035),
        # Pinky / outer claw
        ((512 + sign * 404, 338), (512 + sign * 422, 305), (512 + sign * 436, 270), 0.164, 0.180, 0.160, 0.008, 0.003),
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

        # Claw base cap
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
shoe_l = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_l.apply_translation([-0.09, 0.022, 0.02])
shoe_l.visual.material = mat_dark

shoe_r = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_r.apply_translation([0.09, 0.022, 0.02])
shoe_r.visual.material = mat_dark

# Main body material
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
