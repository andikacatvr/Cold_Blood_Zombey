import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== REBUILDING PERFECT PS1 BOSS BRIDE - PERFECT HEAD, PROFILE, HAIR & BODY ===")

# 1. Load source image
src_bgr = cv2.imread('bossgame.png')
if src_bgr is None:
    raise FileNotFoundError("bossgame.png not found!")

diff = np.abs(src_bgr.astype(float) - [253, 253, 253]).sum(axis=2)
mask = (diff > 16).astype(np.uint8) * 255
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

ys, xs = np.where(mask > 0)
ymin, ymax = ys.min(), ys.max()
xmin, xmax = xs.min(), xs.max()
bbox_h = ymax - ymin
bbox_w = xmax - xmin
center_x = (xmin + xmax) / 2.0

dist, labels = cv2.distanceTransformWithLabels((255 - mask), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
fg_pts = np.argwhere(mask > 0)
nearest = fg_pts[labels - 1]
src_bled = src_bgr[nearest[:, :, 0], nearest[:, :, 1]].copy()

brunette_hair = np.array([20, 26, 35], dtype=np.uint8)
avg_skin = np.array([115, 140, 190], dtype=np.uint8)

# 1. Top of head (Y: 0 to 110): 100% pure rich brunette hair across entire width
for y in range(0, 110):
    for x in range(350, 680):
        src_bled[y, x] = brunette_hair

# 2. Face & Hair (Y: 110 to 220):
# Fill hair outside central face so sides of head are 100% rich brunette hair
for y in range(110, 220):
    for x in range(350, 680):
        # Keep face inside [465, 555]
        if x < 465 or x > 555:
            src_bled[y, x] = brunette_hair
        else:
            # If bright white veil ribbon inside face, clean it
            if src_bgr[y, x].mean() > 215:
                if x < 475 or x > 545:
                    src_bled[y, x] = brunette_hair
                else:
                    src_bled[y, x] = avg_skin

# 3. Neck area (Y: 220 to 285): smooth porcelain skin across neck, brunette hair outside neck
for y in range(220, 285):
    for x in range(350, 680):
        if 470 <= x <= 555:
            # In neck: ensure smooth porcelain skin without white veil ribbons
            if src_bgr[y, x].mean() > 200 or src_bgr[y, x].mean() < 70:
                src_bled[y, x] = avg_skin
        else:
            # Outside neck: brunette hair
            src_bled[y, x] = brunette_hair

target_h = 960
target_w = 362

front_crop = src_bled[ymin:ymax+1, xmin:xmax+1].copy()
mask_crop = mask[ymin:ymax+1, xmin:xmax+1].copy()

front_resized = cv2.resize(front_crop, (target_w, target_h), interpolation=cv2.INTER_AREA)
mask_resized = cv2.resize(mask_crop, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

# Clean and build back view
back_resized = front_resized.copy()

# 1. Back of head hair (Y_src: 22 to 260) -> 100% full rich brunette hair across entire width!
y_neck_px = int((260 - ymin) / bbox_h * target_h)
for y in range(y_neck_px):
    back_resized[y, :] = brunette_hair

# 2. Porcelain fair skin on low-cut back (Y_src: 260 to 370)
y_strapless_back = int((370 - ymin) / bbox_h * target_h)
for y in range(y_neck_px, y_strapless_back):
    back_resized[y, :] = avg_skin

# Pearl necklace at collarbone / neck base (Y_src: 288)
y_pearl = int((288 - ymin) / bbox_h * target_h)
for px in range(target_w // 2 - 35, target_w // 2 + 35, 4):
    back_resized[y_pearl-1:y_pearl+3, px-1:px+3] = [245, 245, 250]

# 3. Gown back with spine corset seam (Y_src: 370 to 1420)
y_dress_end = int((1420 - ymin) / bbox_h * target_h)
for y in range(y_strapless_back, y_dress_end):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        mid_x = target_w // 2
        back_resized[y, mid_x-1:mid_x+2] = [170, 175, 185]

back_mirrored = cv2.flip(back_resized, 1)

# Assemble 1024x1024 Atlas with neutral dark brunette background to prevent any white bleeding
atlas_bgr = np.full((1024, 1024, 3), [20, 26, 35], dtype=np.uint8)
x_f_start = 256 - target_w // 2
x_b_start = 768 - target_w // 2
y_start = (1024 - target_h) // 2

atlas_bgr[y_start:y_start+target_h, x_f_start:x_f_start+target_w] = front_resized
atlas_bgr[y_start:y_start+target_h, x_b_start:x_b_start+target_w] = back_mirrored

for y in range(1024):
    y_cl = min(max(0, y - y_start), target_h - 1)
    atlas_bgr[y, :x_f_start] = front_resized[y_cl, 0]
    atlas_bgr[y, x_f_start+target_w:512] = front_resized[y_cl, -1]
    atlas_bgr[y, 512:x_b_start] = back_mirrored[y_cl, 0]
    atlas_bgr[y, x_b_start+target_w:] = back_mirrored[y_cl, -1]

atlas_rgb = cv2.cvtColor(atlas_bgr, cv2.COLOR_BGR2RGB)
atlas_pil = Image.fromarray(atlas_rgb)
atlas_path = 'public/textures/boss/boss_atlas_flawless.png'
atlas_pil.save(atlas_path)
print(f"Atlas saved to {atlas_path}!")

world_height = 1.82 # meters
scale_y = world_height / bbox_h
scale_x = scale_y

all_vertices = []
all_uvs = []
all_normals = []
all_faces = []

def map_uv_general(img_x, norm_y, is_front=True):
    norm_px_x = np.clip((img_x - xmin) / bbox_w, 0.0, 1.0)
    norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0

    if is_front:
        u = (x_f_start + norm_px_x * target_w) / 1024.0
    else:
        u = (x_b_start + (1.0 - norm_px_x) * target_w) / 1024.0

    v = 1.0 - norm_atlas_y
    return [u, v]

def add_smooth_column(rings_f, rings_b, cap_top=True, cap_bottom=True, top_dome=False, bottom_apex=False):
    K_seg = len(rings_f[0]) - 1

    # Connect front quads
    for i in range(len(rings_f) - 1):
        rf_c = rings_f[i]
        rf_n = rings_f[i + 1]
        for k in range(K_seg):
            c0, c1 = rf_c[k], rf_c[k + 1]
            n0, n1 = rf_n[k], rf_n[k + 1]
            all_faces.append([c0, n0, c1])
            all_faces.append([c1, n0, n1])

    # Connect back quads
    for i in range(len(rings_b) - 1):
        rb_c = rings_b[i]
        rb_n = rings_b[i + 1]
        for k in range(K_seg):
            c0, c1 = rb_c[k], rb_c[k + 1]
            n0, n1 = rb_n[k], rb_n[k + 1]
            all_faces.append([c0, n0, c1])
            all_faces.append([c1, n0, n1])

    if cap_top:
        top_rf = rings_f[-1]
        top_rb = rings_b[-1]
        top_pts = [all_vertices[idx] for idx in top_rf]
        mid_x = np.mean([p[0] for p in top_pts])
        top_y = top_pts[0][1] + (0.003 if top_dome else 0.006)

        # Front cap apex vertex MUST use FRONT UV
        top_uv_f = all_uvs[top_rf[K_seg // 2]]
        af_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, 0.002])
        all_uvs.append(top_uv_f)
        all_normals.append([0.0, 1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([af_idx, top_rf[k], top_rf[k + 1]])

        # Back cap apex vertex MUST use BACK UV
        top_uv_b = all_uvs[top_rb[K_seg // 2]]
        ab_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, -0.002])
        all_uvs.append(top_uv_b)
        all_normals.append([0.0, 1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([ab_idx, top_rb[k], top_rb[k + 1]])

    if cap_bottom:
        bot_rf = rings_f[0]
        bot_rb = rings_b[0]
        bot_pts = [all_vertices[idx] for idx in bot_rf]
        mid_x = np.mean([p[0] for p in bot_pts])
        bot_y = bot_pts[0][1] - (0.005 if bottom_apex else 0.002)

        bot_uv_f = all_uvs[bot_rf[K_seg // 2]]
        bf_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, 0.002])
        all_uvs.append(bot_uv_f)
        all_normals.append([0.0, -1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([bf_idx, bot_rf[k + 1], bot_rf[k]])

        bot_uv_b = all_uvs[bot_rb[K_seg // 2]]
        bb_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, -0.002])
        all_uvs.append(bot_uv_b)
        all_normals.append([0.0, -1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([bb_idx, bot_rb[k + 1], bot_rb[k]])

# ==============================================================================
# 1. HEAD & BEAUTIFUL ANATOMICAL FACE PROFILE (Seamless Oval Cranium & Hair)
# ==============================================================================
print("1. Modeling Head (Smooth Feminine Skull, Natural Profile, Seamless Hair)...")
head_rf, head_rb = [], []
K_head = 10
head_y_steps = np.linspace(280, 25, 36).astype(int)

for y_px in head_y_steps:
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height

    # Calculate smooth anatomical head and neck contours
    if y_px < 90:
        # Hair bun & crown top
        t = (y_px - 25) / (90 - 25)
        rx = 0.024 * (1 - t) + 0.070 * t
        rz_front = rx * 0.88
        rz_back = rx * 1.05
    elif y_px < 160:
        # Forehead & temples
        t = (y_px - 90) / (160 - 90)
        rx = 0.070 * (1 - t) + 0.078 * t
        rz_front = rx * 0.90
        rz_back = rx * 1.06
    elif y_px < 205:
        # Cheeks to jawline
        t = (y_px - 160) / (205 - 160)
        rx = 0.078 * (1 - t) + 0.058 * t
        rz_front = 0.070 * (1 - t) + 0.050 * t
        rz_back = 0.082 * (1 - t) + 0.056 * t
    elif y_px < 240:
        # Chin to mid-neck
        t = (y_px - 205) / (240 - 205)
        rx = 0.058 * (1 - t) + 0.042 * t
        rz_front = 0.050 * (1 - t) + 0.040 * t
        rz_back = 0.056 * (1 - t) + 0.042 * t
    elif y_px < 275:
        # Mid-neck to neck base
        t = (y_px - 240) / (275 - 240)
        rx = 0.042 * (1 - t) + 0.048 * t
        rz_front = 0.040 * (1 - t) + 0.042 * t
        rz_back = 0.042 * (1 - t) + 0.044 * t
    else:
        # Flaring into clavicle
        t = (y_px - 275) / (280 - 275)
        rx = 0.048 * (1 - t) + 0.054 * t
        rz_front = 0.042 * (1 - t) + 0.045 * t
        rz_back = 0.044 * (1 - t) + 0.046 * t

    vx_mid = 0.0

    # Natural subtle PS1 facial profile (nose tip +3.5mm, lips +2.5mm, chin +3mm)
    if 162 <= y_px <= 184:
        # Nose bridge and tip
        t_n = (y_px - 162) / (184 - 162)
        z_feature = 0.001 + 0.0035 * np.sin(np.pi * t_n)
    elif 192 <= y_px <= 202:
        # Lips
        z_feature = 0.0025
    elif 205 <= y_px <= 214:
        # Chin
        z_feature = 0.003
    else:
        z_feature = 0.0

    rf, rb = [], []

    # FRONT RING: from right ear to nose to left ear
    for k in range(K_head + 1):
        th = np.pi * k / K_head
        vx = vx_mid + rx * np.cos(th)
        # Falloff rapidly away from center so cheeks remain smooth
        central_weight = np.exp(-((vx / 0.018) ** 2))
        vz = rz_front * np.sin(th) + z_feature * central_weight

        img_x = center_x + (vx / scale_x)
        u, v = map_uv_general(img_x, norm_y, is_front=True)

        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append([u, v])
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rf.append(v_idx)

    # BACK RING: from left ear to back bun to right ear
    for k in range(K_head + 1):
        th = np.pi + np.pi * k / K_head
        vx = vx_mid + rx * np.cos(th)
        vz = rz_back * np.sin(th)

        img_x = center_x + (vx / scale_x)
        u, v = map_uv_general(img_x, norm_y, is_front=False)

        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append([u, v])
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rb.append(v_idx)

    head_rf.append(rf)
    head_rb.append(rb)

add_smooth_column(head_rf, head_rb, cap_top=True, cap_bottom=False, top_dome=True)

# ==============================================================================
# 2. TORSO & ELEGANT FLARED GOWN (With Solid Interior Lining - Zero Transparency!)
# ==============================================================================
print("2. Modeling Torso & Flared Gown with Interior Solid Lining...")
torso_y_steps = np.linspace(1420, 280, 60).astype(int)
body_rf, body_rb = [], []
K_body = 8

for y_px in torso_y_steps:
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height
    row = mask[y_px, :]

    if y_px < 340:
        t_sh = (y_px - 280) / (340 - 280)
        rx = 0.054 * (1 - t_sh) + 0.138 * t_sh
        rz_front = 0.045 * (1 - t_sh) + 0.052 * t_sh
        rz_back = 0.046 * (1 - t_sh) + 0.055 * t_sh
    elif y_px < 420:
        # Bust
        t_b = (y_px - 340) / (420 - 340)
        rx = 0.138 * (1 - t_b) + 0.118 * t_b
        rz_front = 0.052 * (1 - t_b) + 0.068 * t_b
        rz_back = 0.055 * (1 - t_b) + 0.058 * t_b
    elif y_px < 520:
        # Slender waist
        t_w = (y_px - 420) / (520 - 420)
        rx = 0.118 * (1 - t_w) + 0.096 * t_w
        rz_front = 0.068 * (1 - t_w) + 0.052 * t_w
        rz_back = 0.058 * (1 - t_w) + 0.055 * t_w
    elif y_px < 750:
        # Hourglass hips & upper thighs
        t_h = (y_px - 520) / (750 - 520)
        rx = 0.096 * (1 - t_h) + 0.155 * t_h
        rz_front = 0.052 * (1 - t_h) + 0.068 * t_h
        rz_back = 0.055 * (1 - t_h) + 0.082 * t_h
    elif y_px < 900:
        # Lower thighs to knees
        t_k = (y_px - 750) / (900 - 750)
        rx = 0.155 * (1 - t_k) + 0.177 * t_k
        rz_front = 0.068 * (1 - t_k) + 0.075 * t_k
        rz_back = 0.082 * (1 - t_k) + 0.090 * t_k
    else:
        # Flared mermaid gown skirt to floor hem
        t_g = (y_px - 900) / (1420 - 900)
        rx = 0.177 * (1 - t_g) + 0.285 * t_g
        rz_front = 0.075 * (1 - t_g) + 0.155 * t_g
        rz_back = 0.090 * (1 - t_g) + 0.175 * t_g

    vx_mid = 0.0
    rf, rb = [], []

    for k in range(K_body + 1):
        th = np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz_front * np.sin(th)
        img_x = center_x + (vx / scale_x)
        u, v = map_uv_general(img_x, norm_y, is_front=True)
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append([u, v])
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rf.append(v_idx)

    for k in range(K_body + 1):
        th = np.pi + np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz_back * np.sin(th)
        img_x = center_x + (vx / scale_x)
        u, v = map_uv_general(img_x, norm_y, is_front=False)
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append([u, v])
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rb.append(v_idx)

    body_rf.append(rf)
    body_rb.append(rb)

# Add physical interior skirt lining rim at hem
inner_rf, inner_rb = [], []
hem_rf = body_rf[0]
hem_rb = body_rb[0]
hem_y = all_vertices[hem_rf[0]][1]
inner_y = hem_y + 0.045 # 4.5cm up into gown interior

for v_idx in hem_rf:
    v = all_vertices[v_idx]
    uv = all_uvs[v_idx]
    all_vertices.append([v[0] * 0.88, inner_y, v[2] * 0.88])
    all_uvs.append(uv)
    all_normals.append([0.0, 1.0, 0.0])
    inner_rf.append(len(all_vertices) - 1)

for v_idx in hem_rb:
    v = all_vertices[v_idx]
    uv = all_uvs[v_idx]
    all_vertices.append([v[0] * 0.88, inner_y, v[2] * 0.88])
    all_uvs.append(uv)
    all_normals.append([0.0, 1.0, 0.0])
    inner_rb.append(len(all_vertices) - 1)

# Connect hem to interior lining (faces point downward / inward)
for k in range(K_body):
    c0, c1 = hem_rf[k], hem_rf[k + 1]
    i0, i1 = inner_rf[k], inner_rf[k + 1]
    all_faces.append([c1, i0, c0])
    all_faces.append([c1, i1, i0])

for k in range(K_body):
    c0, c1 = hem_rb[k], hem_rb[k + 1]
    i0, i1 = inner_rb[k], inner_rb[k + 1]
    all_faces.append([c1, i0, c0])
    all_faces.append([c1, i1, i0])

add_smooth_column(body_rf, body_rb, cap_top=True, cap_bottom=False)

# ==============================================================================
# 3. SEAMLESS CONNECTED SHOULDERS & ARMS
# ==============================================================================
print("3. Modeling Seamless Connected Shoulders & Bare Arms...")
K_arm = 6

def build_connected_arm(is_right=False):
    sign = -1.0 if is_right else 1.0
    arm_rf, arm_rb = [], []
    y_steps = np.linspace(290, 770, 26).astype(int)

    for y_px in y_steps:
        norm_y = 1.0 - (y_px - ymin) / bbox_h
        y_world = norm_y * world_height

        if y_px <= 340:
            # Upper shoulder joint connecting directly flush with torso shoulder
            t = (y_px - 290) / (340 - 290)
            mid_x = sign * (0.130 + 0.018 * t)
            rx = 0.024 + 0.005 * t
            rz = 0.026 + 0.004 * t
        elif y_px <= 540:
            # Upper arm to elbow
            t = (y_px - 340) / (540 - 340)
            mid_x = sign * (0.148 + 0.072 * t)
            rx = 0.029 * (1 - 0.12 * t)
            rz = 0.030 * (1 - 0.12 * t)
        elif y_px <= 710:
            # Forearm
            t = (y_px - 540) / (710 - 540)
            mid_x = sign * (0.220 + 0.080 * t)
            rx = 0.025 * (1 - 0.22 * t)
            rz = 0.026 * (1 - 0.22 * t)
        else:
            # Hand & fingers
            t = (y_px - 710) / (770 - 710)
            mid_x = sign * (0.300 + 0.020 * t)
            rx = 0.020 * (1 - 0.30 * t)
            rz = 0.021 * (1 - 0.30 * t)

        img_x_center = center_x + (mid_x / scale_x)
        half_w_px = (rx / scale_x)

        rf, rb = [], []

        for k in range(K_arm + 1):
            th = np.pi * k / K_arm
            vx = mid_x + rx * np.cos(th)
            vz = rz * np.sin(th)
            norm_px_x = np.clip(((img_x_center + np.cos(th) * half_w_px) - xmin) / bbox_w, 0.0, 1.0)
            norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
            u = (x_f_start + norm_px_x * target_w) / 1024.0
            v = 1.0 - norm_atlas_y

            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rf.append(v_idx)

        for k in range(K_arm + 1):
            th = np.pi + np.pi * k / K_arm
            vx = mid_x + rx * np.cos(th)
            vz = rz * np.sin(th)
            norm_px_x = np.clip(((img_x_center + np.cos(th) * half_w_px) - xmin) / bbox_w, 0.0, 1.0)
            norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
            u = (x_b_start + (1.0 - norm_px_x) * target_w) / 1024.0
            v = 1.0 - norm_atlas_y

            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rb.append(v_idx)

        arm_rf.append(rf)
        arm_rb.append(rb)

    add_smooth_column(arm_rf, arm_rb, cap_top=True, cap_bottom=True, top_dome=True, bottom_apex=True)

build_connected_arm(is_right=False)
build_connected_arm(is_right=True)

# ==============================================================================
# 4. POINTED WHITE BRIDAL PUMPS
# ==============================================================================
print("4. Modeling Pointed White Bridal Pumps...")
K_shoe = 6

def build_pump(is_right=False):
    sign = -1.0 if is_right else 1.0
    shoe_rf, shoe_rb = [], []
    y_steps = np.linspace(1440, 1370, 8).astype(int)
    shoe_x_mid = sign * 0.082
    shoe_u_mid = 0.5 + sign * 0.22
    shoe_u_half = 0.04

    for y_px in y_steps:
        norm_y = 1.0 - (y_px - ymin) / bbox_h
        y_world = norm_y * world_height
        t_foot = (y_px - 1370) / (1440 - 1370)

        rx = 0.026 * (1.0 - 0.40 * t_foot)
        rz = 0.042 * (1.0 - 0.35 * t_foot)
        z_offset = -0.012 + 0.045 * t_foot

        rf, rb = [], []

        for k in range(K_shoe + 1):
            th = np.pi * k / K_shoe
            vx = shoe_x_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            u_norm = np.clip(shoe_u_mid + np.cos(th) * shoe_u_half, 0.0, 1.0)
            u = (x_f_start + u_norm * target_w) / 1024.0
            norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
            v = 1.0 - norm_atlas_y

            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rf.append(v_idx)

        for k in range(K_shoe + 1):
            th = np.pi + np.pi * k / K_shoe
            vx = shoe_x_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            u_norm = np.clip(shoe_u_mid + np.cos(th) * shoe_u_half, 0.0, 1.0)
            u = (x_b_start + (1.0 - u_norm) * target_w) / 1024.0
            norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
            v = 1.0 - norm_atlas_y

            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rb.append(v_idx)

        shoe_rf.append(rf)
        shoe_rb.append(rb)

    add_smooth_column(shoe_rf, shoe_rb, cap_top=False, cap_bottom=True)

build_pump(is_right=False)
build_pump(is_right=True)

# Finalize mesh with DOUBLE-SIDED Material
all_vertices = np.array(all_vertices, dtype=np.float32)
all_uvs = np.array(all_uvs, dtype=np.float32)
all_normals = np.array(all_normals, dtype=np.float32)
all_faces = np.array(all_faces, dtype=np.int32)

print(f"Final Model Mesh: {len(all_vertices)} vertices, {len(all_faces)} faces")

mat = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.05,
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
    'public/models/bossgame.glb',
    'public/models/boss_bride.glb',
    'dist/models/bossgame.glb',
    'dist/models/boss_bride.glb'
]

for p in out_files:
    os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    with open(p, 'wb') as f:
        f.write(glb_bytes)
    print(f"Exported {p} ({len(glb_bytes)} bytes)")

print("=== PERFECT BOSS BRIDE REBUILD COMPLETE ===")
