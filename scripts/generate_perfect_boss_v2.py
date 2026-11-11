import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("Building perfected PS1 Boss Bride (Full anatomical alignment)...")

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

# 2. Inpaint 100% of background
dist, labels = cv2.distanceTransformWithLabels((255 - mask), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
fg_pts = np.argwhere(mask > 0)
nearest = fg_pts[labels - 1]
src_full_bled = src_bgr[nearest[:, :, 0], nearest[:, :, 1]]

target_h = 960
target_w = int(bbox_w * (target_h / bbox_h))
if target_w > 480:
    target_w = 480
    target_h = int(bbox_h * (target_w / bbox_w))

char_crop_bled = src_full_bled[ymin:ymax+1, xmin:xmax+1].copy()
char_mask_crop = mask[ymin:ymax+1, xmin:xmax+1].copy()

front_resized = cv2.resize(char_crop_bled, (target_w, target_h), interpolation=cv2.INTER_AREA)
mask_resized = cv2.resize(char_mask_crop, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

# Initialize atlas with ivory tone
dress_sample = front_resized[int(target_h*0.5):int(target_h*0.7), int(target_w*0.4):int(target_w*0.6)]
avg_ivory = dress_sample.mean(axis=(0,1)).astype(np.uint8)
atlas_bgr = np.full((1024, 1024, 3), avg_ivory, dtype=np.uint8)

# Place Front on Left (centered at X=256)
x_f_start = 256 - target_w // 2
y_start = (1024 - target_h) // 2
atlas_bgr[y_start:y_start+target_h, x_f_start:x_f_start+target_w] = front_resized

# Generate Back View
back_bgr = front_resized.copy()

# 1. Back hair: from Y: 0 all the way to 24% of target_h (nape of neck)
y_hair_max = int(target_h * 0.24)
hair_patch = front_resized[int(target_h*0.03):int(target_h*0.09), int(target_w*0.35):int(target_w*0.65)]
hair_resized = cv2.resize(hair_patch, (target_w, y_hair_max), interpolation=cv2.INTER_CUBIC)
for y in range(y_hair_max):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_bgr[y, row_m] = hair_resized[y, row_m]

# 2. Back neck (Y: 24% to 29%): Porcelain fair skin
y_back_skin_max = int(target_h * 0.34)
skin_patch = front_resized[int(target_h*0.25):int(target_h*0.28), int(target_w*0.42):int(target_w*0.58)]
skin_resized = cv2.resize(skin_patch, (target_w, y_back_skin_max - y_hair_max), interpolation=cv2.INTER_CUBIC)
for idx, y in enumerate(range(y_hair_max, y_back_skin_max)):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        # Keep arms on sides as skin, center is bare back
        back_bgr[y, row_m] = skin_resized[idx, row_m]

# Pearl necklace band across back of neck (Y ~ 25%)
y_neck = int(target_h * 0.25)
neck_m = mask_resized[y_neck] > 0
if np.any(neck_m):
    xs_neck = np.where(neck_m)[0]
    for px in range(xs_neck.min() + 6, xs_neck.max() - 6, 4):
        back_bgr[y_neck-1:y_neck+2, px-1:px+2] = [245, 245, 250]

# 3. Back of gown (Y: 34% to 94%): Ivory satin with corset spine seam & blood splatters
y_skirt_end = int(target_h * 0.94)
for y in range(y_back_skin_max, y_skirt_end):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        xs_row = np.where(row_m)[0]
        x_mid = (xs_row.min() + xs_row.max()) // 2
        w_mid = (xs_row.max() - xs_row.min()) // 2
        dress_span = slice(max(0, x_mid - w_mid), min(target_w, x_mid + w_mid))
        # subtle spine corset seam
        if abs(x_mid) < target_w:
            back_bgr[y, x_mid-1:x_mid+2] = [160, 165, 175]

# Place Back on Right (centered at X=768)
x_b_start = 768 - target_w // 2
back_mirrored = cv2.flip(back_bgr, 1)
atlas_bgr[y_start:y_start+target_h, x_b_start:x_b_start+target_w] = back_mirrored

# Color bleed outside character margins with matching tones
for y in range(1024):
    y_idx = min(max(0, y - y_start), target_h - 1)
    atlas_bgr[y, :x_f_start] = front_resized[y_idx, 0]
    atlas_bgr[y, x_f_start+target_w:512] = front_resized[y_idx, -1]
    atlas_bgr[y, 512:x_b_start] = back_mirrored[y_idx, 0]
    atlas_bgr[y, x_b_start+target_w:] = back_mirrored[y_idx, -1]

atlas_rgb = cv2.cvtColor(atlas_bgr, cv2.COLOR_BGR2RGB)
atlas_pil = Image.fromarray(atlas_rgb)
atlas_path = 'public/textures/boss/boss_atlas_v3.png'
atlas_pil.save(atlas_path)
print(f"Saved texture atlas to {atlas_path}!")

# 3. 3D Model Construction
world_height = 1.82 # meters
scale_y = world_height / bbox_h
scale_x = scale_y

all_vertices = []
all_uvs = []
all_faces = []

def map_uv_general(vx, vy, vz):
    img_x = (vx / scale_x) + center_x
    norm_px_x = np.clip((img_x - xmin) / bbox_w, 0.0, 1.0)
    norm_y = vy / world_height
    norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0

    if vz >= 0:
        u = (x_f_start + norm_px_x * target_w) / 1024.0
    else:
        u = (x_b_start + (1.0 - norm_px_x) * target_w) / 1024.0

    v = 1.0 - norm_atlas_y
    return [u, v]

def add_mesh_segment(rings_front, rings_back, uv_override_func=None, cap_top=True, cap_bottom=True):
    K_seg = len(rings_front[0]) - 1

    for i in range(len(rings_front) - 1):
        rf_c = rings_front[i]
        rf_n = rings_front[i + 1]
        for k in range(K_seg):
            c0, c1 = rf_c[k], rf_c[k + 1]
            n0, n1 = rf_n[k], rf_n[k + 1]
            all_faces.append([c0, n0, c1])
            all_faces.append([c1, n0, n1])

    for i in range(len(rings_back) - 1):
        rb_c = rings_back[i]
        rb_n = rings_back[i + 1]
        for k in range(K_seg):
            c0, c1 = rb_c[k], rb_c[k + 1]
            n0, n1 = rb_n[k], rb_n[k + 1]
            all_faces.append([c0, n0, c1])
            all_faces.append([c1, n0, n1])

    if cap_top:
        top_rf = rings_front[-1]
        top_rb = rings_back[-1]
        top_pts = [all_vertices[idx] for idx in top_rf]
        mid_x = np.mean([p[0] for p in top_pts])
        top_y = top_pts[0][1] + 0.012

        af_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, 0.005])
        all_uvs.append(map_uv_general(mid_x, top_y, 0.005) if not uv_override_func else uv_override_func(mid_x, top_y, 0.005))
        for k in range(K_seg):
            all_faces.append([af_idx, top_rf[k], top_rf[k + 1]])

        ab_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, -0.005])
        all_uvs.append(map_uv_general(mid_x, top_y, -0.005) if not uv_override_func else uv_override_func(mid_x, top_y, -0.005))
        for k in range(K_seg):
            all_faces.append([ab_idx, top_rb[k], top_rb[k + 1]])

    if cap_bottom:
        bot_rf = rings_front[0]
        bot_rb = rings_back[0]
        bot_pts = [all_vertices[idx] for idx in bot_rf]
        mid_x = np.mean([p[0] for p in bot_pts])
        bot_y = bot_pts[0][1] - 0.01

        bf_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, 0.005])
        all_uvs.append(map_uv_general(mid_x, bot_y, 0.005) if not uv_override_func else uv_override_func(mid_x, bot_y, 0.005))
        for k in range(K_seg):
            all_faces.append([bf_idx, bot_rf[k + 1], bot_rf[k]])

        bb_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, -0.005])
        all_uvs.append(map_uv_general(mid_x, bot_y, -0.005) if not uv_override_func else uv_override_func(mid_x, bot_y, -0.005))
        for k in range(K_seg):
            all_faces.append([bb_idx, bot_rb[k + 1], bot_rb[k]])

# ==============================================================================
# PART 1: HEAD & HAIR BUN
# ==============================================================================
print("1. Generating Head & Hair Bun...")
head_rings_f = []
head_rings_b = []
K_head = 8
head_y_steps = np.linspace(290, 24, 30).astype(int)

for y_px in head_y_steps:
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height
    row = mask[y_px, :]

    head_xs = np.where((row > 0) & (np.arange(len(row)) >= 385) & (np.arange(len(row)) <= 640))[0]
    if len(head_xs) == 0:
        continue

    hx_st, hx_en = head_xs.min(), head_xs.max()
    h_w = hx_en - hx_st
    h_mid = (hx_st + hx_en) / 2.0
    vx_mid = (h_mid - center_x) * scale_x
    rx = (h_w / 2.0) * scale_x

    if y_px < 100: # High rounded bun
        dome = np.sin((y_px - 22) / (100 - 22) * (np.pi / 2.0))
        rx *= max(0.45, dome)
        rz = rx * 0.95
    elif y_px < 250: # Cranium & face
        rz = min(rx * 0.90, 0.082)
    else: # Neck
        rz = min(rx * 0.85, 0.042)

    rf, rb = [], []

    for k in range(K_head + 1):
        th = np.pi * k / K_head
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        if 160 <= y_px <= 210 and vz > 0 and abs(vx) < 0.03:
            vz += 0.014 # Nose
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv_general(vx, y_world, vz))
        rf.append(v_idx)

    for k in range(K_head + 1):
        th = np.pi + np.pi * k / K_head
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv_general(vx, y_world, vz))
        rb.append(v_idx)

    head_rings_f.append(rf)
    head_rings_b.append(rb)

add_mesh_segment(head_rings_f, head_rings_b, cap_top=True, cap_bottom=False)

# Cheek hair tendrils (two wavy ribbons)
for is_right in [False, True]:
    sign = 1.0 if is_right else -1.0
    tendril_pts = []
    for y_px in np.linspace(145, 275, 8).astype(int):
        norm_y = 1.0 - (y_px - ymin) / bbox_h
        y_world = norm_y * world_height
        x_px = center_x + sign * (76 + 14 * np.sin((y_px - 145) / 130.0 * np.pi))
        vx = (x_px - center_x) * scale_x
        vz = 0.055
        tendril_pts.append([vx, y_world, vz])

    for i in range(len(tendril_pts) - 1):
        p0, p1 = tendril_pts[i], tendril_pts[i + 1]
        u0, u1 = map_uv_general(p0[0], p0[1], p0[2]), map_uv_general(p1[0], p1[1], p1[2])

        v0, v1 = len(all_vertices), len(all_vertices) + 1
        all_vertices.append([p0[0] - 0.007, p0[1], p0[2]])
        all_vertices.append([p0[0] + 0.007, p0[1], p0[2]])
        all_uvs.extend([u0, u0])

        v2, v3 = len(all_vertices), len(all_vertices) + 1
        all_vertices.append([p1[0] - 0.007, p1[1], p1[2]])
        all_vertices.append([p1[0] + 0.007, p1[1], p1[2]])
        all_uvs.extend([u1, u1])

        all_faces.append([v0, v2, v1])
        all_faces.append([v1, v2, v3])
        all_faces.append([v0, v1, v2])
        all_faces.append([v1, v3, v2])

# ==============================================================================
# PART 2: TORSO & FLARING GOWN
# ==============================================================================
print("2. Generating Torso & Flared Evening Gown...")
torso_y_steps = np.linspace(1420, 290, 52).astype(int)
body_rings_f = []
body_rings_b = []
K_body = 8

for y_px in torso_y_steps:
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height
    row = mask[y_px, :]

    torso_xs = np.where((row > 0) & (np.arange(len(row)) >= 380) & (np.arange(len(row)) <= 645))[0]
    if len(torso_xs) == 0:
        torso_xs = np.where(row > 0)[0]

    bx_st, bx_en = torso_xs.min(), torso_xs.max()
    b_w = bx_en - bx_st
    b_mid = (bx_st + bx_en) / 2.0
    vx_mid = (b_mid - center_x) * scale_x
    rx = (b_w / 2.0) * scale_x

    if y_px < 420:
        rz = min(rx * 0.50, 0.082)
    elif y_px < 560:
        rz = min(rx * 0.44, 0.072)
    else:
        rz = min(rx * 0.46, 0.125)

    rf, rb = [], []

    for k in range(K_body + 1):
        th = np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        if 340 <= y_px <= 420 and vz > 0:
            vz *= 1.25 # Sweetheart neckline
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv_general(vx, y_world, vz))
        rf.append(v_idx)

    for k in range(K_body + 1):
        th = np.pi + np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv_general(vx, y_world, vz))
        rb.append(v_idx)

    body_rings_f.append(rf)
    body_rings_b.append(rb)

# Skirt hem opens naturally at bottom (NO flat pancake disc!)
add_mesh_segment(body_rings_f, body_rings_b, cap_top=False, cap_bottom=False)

# ==============================================================================
# PART 3: ACCURATE BARE ARMS & DELICATE HANDS
# ==============================================================================
print("3. Generating Accurate Slender Bare Arms...")

def build_accurate_arm(is_right=False):
    arm_y_steps = np.linspace(790, 310, 24).astype(int)
    arm_rf = []
    arm_rb = []
    K_arm = 6

    for y_px in arm_y_steps:
        norm_y = 1.0 - (y_px - ymin) / bbox_h
        y_world = norm_y * world_height
        row = mask[y_px, :]

        if not is_right:
            xs_arm = np.where((row > 0) & (np.arange(len(row)) < 400))[0]
        else:
            xs_arm = np.where((row > 0) & (np.arange(len(row)) > 620))[0]

        if len(xs_arm) == 0:
            continue

        a_st, a_en = xs_arm.min(), xs_arm.max()
        a_w = a_en - a_st
        a_mid = (a_st + a_en) / 2.0
        vx_mid = (a_mid - center_x) * scale_x

        # Slender arm radius (tapers to 2.8cm at wrist/hand, 3.8cm at deltoid)
        t_arm = (790 - y_px) / (790 - 310) # 0 at hand, 1 at shoulder
        rx = 0.026 + 0.012 * t_arm
        rz = rx * 0.95

        rf, rb = [], []

        # Local arm UV function: sample directly from the arm in the image!
        def map_arm_uv(ax, ay, az):
            # Sample directly along the arm's X run in bossgame.png
            norm_px = np.clip((ax / scale_x + center_x - xmin) / bbox_w, 0.0, 1.0)
            ny = ay / world_height
            norm_ay = (y_start + (1.0 - ny) * target_h) / 1024.0
            if az >= 0:
                u = (x_f_start + norm_px * target_w) / 1024.0
            else:
                u = (x_b_start + (1.0 - norm_px) * target_w) / 1024.0
            return [u, 1.0 - norm_ay]

        for k in range(K_arm + 1):
            th = np.pi * k / K_arm
            vx = vx_mid + rx * np.cos(th)
            vz = rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_arm_uv(vx, y_world, vz))
            rf.append(v_idx)

        for k in range(K_arm + 1):
            th = np.pi + np.pi * k / K_arm
            vx = vx_mid + rx * np.cos(th)
            vz = rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_arm_uv(vx, y_world, vz))
            rb.append(v_idx)

        arm_rf.append(rf)
        arm_rb.append(rb)

    add_mesh_segment(arm_rf, arm_rb, cap_top=True, cap_bottom=True)

build_accurate_arm(is_right=False) # Left arm
build_accurate_arm(is_right=True)  # Right arm

# ==============================================================================
# PART 4: ELEGANT POINTED WHITE BRIDAL PUMPS
# ==============================================================================
print("4. Generating Pointed Bridal Pumps...")

def build_pump(is_right=False):
    shoe_y_steps = np.linspace(1518, 1425, 10).astype(int)
    shoe_rf = []
    shoe_rb = []
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

        # Slender pump profile
        toe_progress = (1518 - y_px) / (1518 - 1425) # 0 at toe tip, 1 at ankle
        rx = (0.024 + 0.012 * toe_progress)
        rz = rx * (1.1 + 0.3 * np.sin(toe_progress * np.pi))
        z_offset = 0.025 * (1.0 - toe_progress) # pointed toe forward

        rf, rb = [], []

        for k in range(K_shoe + 1):
            th = np.pi * k / K_shoe
            vx = vx_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_uv_general(vx, y_world, vz))
            rf.append(v_idx)

        for k in range(K_shoe + 1):
            th = np.pi + np.pi * k / K_shoe
            vx = vx_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_uv_general(vx, y_world, vz))
            rb.append(v_idx)

        shoe_rf.append(rf)
        shoe_rb.append(rb)

    add_mesh_segment(shoe_rf, shoe_rb, cap_top=False, cap_bottom=True)

build_pump(is_right=False)
build_pump(is_right=True)

# 4. Finalize Model
all_vertices = np.array(all_vertices, dtype=np.float32)
all_uvs = np.array(all_uvs, dtype=np.float32)
all_faces = np.array(all_faces, dtype=np.int32)

print(f"Total Model Mesh: {len(all_vertices)} vertices, {len(all_faces)} faces")

mat = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.05
)
vis = trimesh.visual.texture.TextureVisuals(uv=all_uvs, material=mat)
mesh = trimesh.Trimesh(vertices=all_vertices, faces=all_faces, visual=vis, process=False)

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

print("Boss Build V3 Complete!")
