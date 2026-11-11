import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== BUILDING PERFECTION FOR HEAD & SIDE PROFILE ===")

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

brunette_hair = np.array([24, 30, 42], dtype=np.uint8)
avg_skin = np.array([115, 140, 190], dtype=np.uint8)

# 1. TOP OF BUN (Y: 0 to 50): guarantee 100% dark brunette hair
for y in range(0, 50):
    for x in range(430, 600):
        if src_bled[y, x].mean() > 100:
            src_bled[y, x] = brunette_hair

# 2. Temple / Ear level (Y: 180 to 235): replace veil ribbon outside face with brunette hair
for y in range(180, 235):
    for x in range(410, 468):
        if src_bled[y, x].mean() > 140:
            src_bled[y, x] = brunette_hair
    for x in range(558, 615):
        if src_bled[y, x].mean() > 140:
            src_bled[y, x] = brunette_hair

# 3. Neck level (Y: 235 to 280): replace veil ribbon with smooth porcelain skin
for y in range(235, 280):
    for x in range(420, 600):
        if src_bled[y, x].mean() > 195:
            src_bled[y, x] = avg_skin

target_h = 960
target_w = 362

front_crop = src_bled[ymin:ymax+1, xmin:xmax+1].copy()
mask_crop = mask[ymin:ymax+1, xmin:xmax+1].copy()

front_resized = cv2.resize(front_crop, (target_w, target_h), interpolation=cv2.INTER_AREA)
mask_resized = cv2.resize(mask_crop, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

# Clean and build back view
back_resized = front_resized.copy()

# 1. Back of head hair (Y_src: 22 to 260) -> Full brunette chignon bun
y_neck_px = int((265 - ymin) / bbox_h * target_h)
hair_patch = src_bgr[40:110, 450:570]
hair_resized = cv2.resize(hair_patch, (target_w, y_neck_px), interpolation=cv2.INTER_CUBIC)
for y in range(y_neck_px):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_resized[y, row_m] = hair_resized[y, row_m]

# 2. Pearl necklace at nape of neck
y_pearl = y_neck_px
row_m = mask_resized[y_pearl] > 0
if np.any(row_m):
    xs_p = np.where(row_m)[0]
    for px in range(xs_p.min() + 6, xs_p.max() - 6, 4):
        back_resized[y_pearl-1:y_pearl+3, px-1:px+3] = [245, 245, 250]

# 3. Porcelain fair skin on low-cut back (Y_src: 270 to 370)
y_strapless_back = int((370 - ymin) / bbox_h * target_h)
skin_patch = src_bgr[285:325, 480:540]
skin_resized = cv2.resize(skin_patch, (target_w, y_strapless_back - y_neck_px), interpolation=cv2.INTER_CUBIC)
for idx, y in enumerate(range(y_neck_px + 2, y_strapless_back)):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_resized[y, row_m] = skin_resized[idx, row_m]

# 4. Gown back with spine corset seam (Y_src: 370 to 1420)
y_dress_end = int((1420 - ymin) / bbox_h * target_h)
for y in range(y_strapless_back, y_dress_end):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        mid_x = target_w // 2
        back_resized[y, mid_x-1:mid_x+2] = [170, 175, 185]

back_mirrored = cv2.flip(back_resized, 1)

# Assemble 1024x1024 Atlas
atlas_bgr = np.full((1024, 1024, 3), [160, 170, 190], dtype=np.uint8)
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

def add_smooth_column(rings_f, rings_b, cap_top=True, cap_bottom=True, top_dome=False, bottom_apex=False, top_uv_override=None):
    K_seg = len(rings_f[0]) - 1

    for i in range(len(rings_f) - 1):
        rf_c = rings_f[i]
        rf_n = rings_f[i + 1]
        for k in range(K_seg):
            c0, c1 = rf_c[k], rf_c[k + 1]
            n0, n1 = rf_n[k], rf_n[k + 1]
            all_faces.append([c0, n0, c1])
            all_faces.append([c1, n0, n1])

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

        if top_uv_override is not None:
            top_uv_f = top_uv_override
            top_uv_b = top_uv_override
        else:
            top_uv_f = all_uvs[top_rf[K_seg // 2]]
            top_uv_b = all_uvs[top_rb[K_seg // 2]]

        af_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, 0.002])
        all_uvs.append(top_uv_f)
        all_normals.append([0.0, 1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([af_idx, top_rf[k], top_rf[k + 1]])

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
        bot_uv_b = all_uvs[bot_rb[K_seg // 2]]

        bf_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, 0.002])
        all_uvs.append(bot_uv_f)
        all_normals.append([0.0, -1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([bf_idx, bot_rf[k + 1], bot_rf[k]])

        bb_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, -0.002])
        all_uvs.append(bot_uv_b)
        all_normals.append([0.0, -1.0, 0.0])
        for k in range(K_seg):
            all_faces.append([bb_idx, bot_rb[k + 1], bot_rb[k]])

# ==============================================================================
# 1. HEAD & BEAUTIFUL ANATOMICAL FACE PROFILE & SEAMLESS WRAPPING HAIR
# ==============================================================================
print("1. Modeling Head with Seamless Wrapping Hair and Natural Profile...")
head_rf, head_rb = [], []
K_head = 10
head_y_steps = np.linspace(280, 25, 36).astype(int)

for y_px in head_y_steps:
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height
    row = mask[y_px, :]

    if y_px < 210:
        head_xs = np.where((row > 0) & (np.arange(len(row)) >= 385) & (np.arange(len(row)) <= 640))[0]
        if len(head_xs) == 0:
            continue
        hx_st, hx_en = head_xs.min(), head_xs.max()
        rx = ((hx_en - hx_st) / 2.0) * scale_x
        # Cranium front & back depth
        rz_front = rx * 0.90
        rz_back = rx * 1.10
    else:
        # Smooth continuous transition from jawline (Y=210) down to neck base (Y=280)
        # NO GUILLOTINE SHELF!
        t_neck = (y_px - 210) / (280 - 210) # 0 at jaw, 1 at neck base
        rx = 0.052 * (1 - t_neck) + 0.038 * t_neck
        rz_front = 0.056 * (1 - t_neck) + 0.038 * t_neck
        rz_back = 0.065 * (1 - t_neck) + 0.038 * t_neck

    vx_mid = 0.0 # Head is centered

    # Subtle natural PS1 profile (subtle bridge +0.005m, soft lip +0.003m, soft chin +0.004m)
    if 160 <= y_px <= 185:
        # Nose bridge and tip: gentle 5mm slope
        t_n = (y_px - 160) / (185 - 160)
        z_feature = 0.001 + 0.004 * t_n
    elif 195 <= y_px <= 210:
        # Soft lips: 3mm
        z_feature = 0.003
    elif 215 <= y_px <= 226:
        # Soft chin: 4mm
        z_feature = 0.004
    else:
        z_feature = 0.0

    rf, rb = [], []

    # FRONT RING: from right ear (k=0) to nose (k=K_head//2) to left ear (k=K_head)
    for k in range(K_head + 1):
        th = np.pi * k / K_head # th=0 is +X (right), th=pi/2 is +Z (front nose), th=pi is -X (left)
        vx = vx_mid + rx * np.cos(th)
        # Feature offset concentrated on the central 2.5cm of the face
        central_weight = max(0.0, 1.0 - (abs(vx) / 0.025) ** 2)
        vz = rz_front * np.sin(th) + z_feature * central_weight

        # ANGLE-BASED UV MAPPING:
        # Angle phi from front (+Z):
        # When phi is in [-55°, +55°]: this is the FRONT FACE (eyes, nose, mouth) -> maps to face pixels [465, 562]
        # Beyond 55° (temples and sideburns): this is the BRUNETTE HAIR!
        angle_from_front = np.arctan2(vx, vz) # 0 at nose, +pi/2 at right ear, -pi/2 at left ear
        phi_deg = np.degrees(abs(angle_from_front))

        if y_px < 230:
            # Face / Head level
            if phi_deg <= 55.0:
                # Frontal face zone: map cleanly to face features
                t_face = angle_from_front / np.radians(55.0) # -1.0 to +1.0
                img_x = center_x + t_face * 48.0 # strictly between 465 and 561
                u, v = map_uv_general(img_x, norm_y, is_front=True)
            else:
                # Side hair zone: sample rich brunette hair!
                # In atlas back view, X is between 620 and 720 (brunette hair)
                t_hair = (phi_deg - 55.0) / (90.0 - 55.0)
                img_x = center_x + (48.0 + 25.0 * t_hair) * np.sign(angle_from_front)
                u, v = map_uv_general(img_x, norm_y, is_front=False)
        else:
            # Neck level: porcelain skin
            t_neck_x = np.sin(angle_from_front)
            img_x = center_x + t_neck_x * 35.0
            u, v = map_uv_general(img_x, norm_y, is_front=(vz >= 0))

        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append([u, v])
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rf.append(v_idx)

    # BACK RING: from left ear (k=0) to back bun (k=K_head//2) to right ear (k=K_head)
    for k in range(K_head + 1):
        th = np.pi + np.pi * k / K_head # th=pi is -X (left), th=3pi/2 is -Z (back), th=2pi is +X (right)
        vx = vx_mid + rx * np.cos(th)
        vz = rz_back * np.sin(th)

        angle_from_front = np.arctan2(vx, vz)
        phi_deg = np.degrees(abs(angle_from_front))

        if y_px < 230:
            # Entire back of skull is rich brunette hair updo
            t_back = (phi_deg - 90.0) / 90.0 # 0 at ear, 1 at center back
            img_x = center_x + 50.0 * (1.0 - t_back) * np.sign(angle_from_front)
            u, v = map_uv_general(img_x, norm_y, is_front=False)
        else:
            # Back of neck: porcelain skin with pearl necklace at Y=275
            t_neck_x = np.sin(angle_from_front)
            img_x = center_x + t_neck_x * 35.0
            u, v = map_uv_general(img_x, norm_y, is_front=False)

        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append([u, v])
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rb.append(v_idx)

    head_rf.append(rf)
    head_rb.append(rb)

hair_apex_uv = map_uv_general(513.5, 1.0 - (60 - ymin) / bbox_h, is_front=True)
add_smooth_column(head_rf, head_rb, cap_top=True, cap_bottom=False, top_dome=True, top_uv_override=hair_apex_uv)

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

    if y_px < 320:
        t_sh = (y_px - 280) / (320 - 280)
        st = int(440 * (1 - t_sh) + 370 * t_sh)
        en = int(582 * (1 - t_sh) + 654 * t_sh)
    elif y_px < 420:
        t_ch = (y_px - 320) / (420 - 320)
        st = int(370 * (1 - t_ch) + 412 * t_ch)
        en = int(654 * (1 - t_ch) + 613 * t_ch)
    elif y_px <= 820:
        runs = []
        in_run = False
        start = 0
        for x in range(len(row)):
            if row[x] > 0 and not in_run:
                in_run = True; start = x
            elif row[x] == 0 and in_run:
                in_run = False; runs.append((start, x - 1))
        if in_run: runs.append((start, len(row) - 1))
        best_run = min(runs, key=lambda r: abs((r[0] + r[1])/2.0 - center_x))
        st, en = best_run[0], best_run[1]
    else:
        xs = np.where(row > 0)[0]
        if len(xs) == 0:
            continue
        st, en = xs.min(), xs.max()

    b_w = en - st
    b_mid = (st + en) / 2.0
    vx_mid = (b_mid - center_x) * scale_x
    rx = (b_w / 2.0) * scale_x

    if y_px < 320:
        rz = min(rx * 0.42, 0.076)
    elif y_px < 420:
        rz = min(rx * 0.48, 0.088)
    elif y_px < 560:
        rz = min(rx * 0.44, 0.072)
    else:
        rz = min(rx * 0.46, 0.135)

    rf, rb = [], []
    inset_bw = max(2.0, (b_w / 2.0) - 3.5)

    for k in range(K_body + 1):
        th = np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        if 340 <= y_px <= 420 and vz > 0:
            vz *= 1.25 # Sweetheart bust curve
        img_x = b_mid + np.cos(th) * inset_bw
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv_general(img_x, norm_y, is_front=True))
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rf.append(v_idx)

    for k in range(K_body + 1):
        th = np.pi + np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        img_x = b_mid + np.cos(th) * inset_bw
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv_general(img_x, norm_y, is_front=False))
        all_normals.append([np.cos(th), 0.0, np.sin(th)])
        rb.append(v_idx)

    body_rf.append(rf)
    body_rb.append(rb)

add_smooth_column(body_rf, body_rb, cap_top=True, cap_bottom=False, top_dome=True)

# ADD INTERIOR SKIRT LINING (Solid underside fabric - NEVER transparent when looked from below!)
bot_rf = body_rf[0]
bot_rb = body_rb[0]
inner_rf, inner_rb = [], []

for idx in bot_rf:
    v = all_vertices[idx]
    v_in = [v[0] * 0.85, v[1] + 0.08, v[2] * 0.85]
    v_idx = len(all_vertices)
    all_vertices.append(v_in)
    all_uvs.append(all_uvs[idx])
    all_normals.append([0.0, -1.0, 0.0])
    inner_rf.append(v_idx)

for idx in bot_rb:
    v = all_vertices[idx]
    v_in = [v[0] * 0.85, v[1] + 0.08, v[2] * 0.85]
    v_idx = len(all_vertices)
    all_vertices.append(v_in)
    all_uvs.append(all_uvs[idx])
    all_normals.append([0.0, -1.0, 0.0])
    inner_rb.append(v_idx)

K_body_seg = len(bot_rf) - 1
for k in range(K_body_seg):
    c0, c1 = bot_rf[k], bot_rf[k + 1]
    n0, n1 = inner_rf[k], inner_rf[k + 1]
    all_faces.append([c0, c1, n0])
    all_faces.append([c1, n1, n0])

for k in range(K_body_seg):
    c0, c1 = bot_rb[k], bot_rb[k + 1]
    n0, n1 = inner_rb[k], inner_rb[k + 1]
    all_faces.append([c0, c1, n0])
    all_faces.append([c1, n1, n0])

# ==============================================================================
# 3. SEAMLESSLY CONNECTED SHOULDERS & SLENDER ARMS
# ==============================================================================
print("3. Modeling Seamless Connected Shoulders & Bare Arms...")

def build_connected_arm(is_right=False):
    arm_y_steps = np.linspace(780, 305, 30).astype(int)
    arm_rf, arm_rb = [], []
    K_arm = 6

    for y_px in arm_y_steps:
        norm_y = 1.0 - (y_px - ymin) / bbox_h
        y_world = norm_y * world_height
        row = mask[y_px, :]

        if y_px < 420:
            t_joint = (y_px - 305) / (420 - 305)
            if not is_right:
                a_mid = 398 * (1 - t_joint) + 365 * t_joint
                a_w = 46
            else:
                a_mid = 627 * (1 - t_joint) + 660 * t_joint
                a_w = 46
        else:
            runs = []
            in_run = False
            start = 0
            for x in range(len(row)):
                if row[x] > 0 and not in_run:
                    in_run = True; start = x
                elif row[x] == 0 and in_run:
                    in_run = False; runs.append((start, x - 1))
            if in_run: runs.append((start, len(row) - 1))

            if not is_right:
                arm_runs = [r for r in runs if r[1] < 420]
            else:
                arm_runs = [r for r in runs if r[0] > 610]

            if len(arm_runs) == 0:
                continue

            a_st, a_en = arm_runs[0] if not is_right else arm_runs[-1]
            a_w = a_en - a_st
            a_mid = (a_st + a_en) / 2.0

        vx_mid = (a_mid - center_x) * scale_x

        t_arm = (780 - y_px) / (780 - 305)
        rx = 0.018 + 0.016 * t_arm
        rz = rx * 0.90

        z_bend = 0.014 * np.sin(t_arm * np.pi)

        arm_u_mid = (a_mid - xmin) / bbox_w
        arm_u_half = (a_w / 2.0 * 0.65) / bbox_w
        norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
        v = 1.0 - norm_atlas_y

        rf, rb = [], []

        for k in range(K_arm + 1):
            th = np.pi * k / K_arm
            vx = vx_mid + rx * np.cos(th)
            vz = z_bend + rz * np.sin(th)
            u_norm = np.clip(arm_u_mid + np.cos(th) * arm_u_half, 0.0, 1.0)
            u = (x_f_start + u_norm * target_w) / 1024.0
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rf.append(v_idx)

        for k in range(K_arm + 1):
            th = np.pi + np.pi * k / K_arm
            vx = vx_mid + rx * np.cos(th)
            vz = z_bend + rz * np.sin(th)
            u_norm = np.clip(arm_u_mid + np.cos(th) * arm_u_half, 0.0, 1.0)
            u = (x_b_start + (1.0 - u_norm) * target_w) / 1024.0
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rb.append(v_idx)

        arm_rf.append(rf)
        arm_rb.append(rb)

    add_smooth_column(arm_rf, arm_rb, cap_top=True, cap_bottom=True, top_dome=True)

build_connected_arm(is_right=False)
build_connected_arm(is_right=True)

# ==============================================================================
# 4. POINTED WHITE BRIDAL PUMPS
# ==============================================================================
print("4. Modeling Pointed White Bridal Pumps...")

def build_pump(is_right=False):
    shoe_y_steps = np.linspace(1518, 1425, 12).astype(int)
    shoe_rf, shoe_rb = [], []
    K_shoe = 6

    for y_px in shoe_y_steps:
        norm_y = 1.0 - (y_px - ymin) / bbox_h
        y_world = norm_y * world_height
        row = mask[y_px, :]

        if not is_right:
            xs_shoe = np.where((row > 0) & (np.arange(len(row)) < 500))[0]
        else:
            xs_shoe = np.where((row > 0) & (np.arange(len(row)) >= 500))[0]

        if len(xs_shoe) == 0:
            continue

        s_st, s_en = xs_shoe.min(), xs_shoe.max()
        s_w = s_en - s_st
        s_mid = (s_st + s_en) / 2.0
        vx_mid = (s_mid - center_x) * scale_x

        toe_t = (1518 - y_px) / (1518 - 1425)
        rx = 0.022 + 0.012 * toe_t
        rz = rx * (1.1 + 0.3 * np.sin(toe_t * np.pi))
        z_offset = 0.026 * (1.0 - toe_t)

        shoe_u_mid = (s_mid - xmin) / bbox_w
        shoe_u_half = (s_w / 2.0 * 0.70) / bbox_w
        norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
        v = 1.0 - norm_atlas_y

        rf, rb = [], []

        for k in range(K_shoe + 1):
            th = np.pi * k / K_shoe
            vx = vx_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            u_norm = np.clip(shoe_u_mid + np.cos(th) * shoe_u_half, 0.0, 1.0)
            u = (x_f_start + u_norm * target_w) / 1024.0
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append([u, v])
            all_normals.append([np.cos(th), 0.0, np.sin(th)])
            rf.append(v_idx)

        for k in range(K_shoe + 1):
            th = np.pi + np.pi * k / K_shoe
            vx = vx_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            u_norm = np.clip(shoe_u_mid + np.cos(th) * shoe_u_half, 0.0, 1.0)
            u = (x_b_start + (1.0 - u_norm) * target_w) / 1024.0
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

print("=== HEAD PERFECTION BUILD COMPLETE ===")

