import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== REBUILDING FLAWLESS PS1 BOSS BRIDE ===")

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
print(f"Bounding box: Y=[{ymin}, {ymax}], X=[{xmin}, {xmax}], center={center_x:.1f}")

# 2. Extract Skin Tone and Dress Tone
# Neck & shoulder skin sample
skin_sample = src_bgr[270:290, 490:530]
avg_skin = skin_sample.mean(axis=(0,1)).astype(np.uint8) # fair porcelain skin
# Dress sample
dress_sample = src_bgr[480:520, 480:540]
avg_dress = dress_sample.mean(axis=(0,1)).astype(np.uint8) # ivory dress

print(f"Average Skin (BGR): {avg_skin}, Average Dress (BGR): {avg_dress}")

# Inpaint background of source image using distance transform
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

# Fix arm and hand color in front_resized:
# At hand level (Y: 60% to 85% of target_h), any pixel on the left arm (X < 35% of target_w)
# or right arm (X > 65% of target_w) MUST be skin tone, NOT white dress!
y_arm_st = int(target_h * 0.30)
y_arm_en = int(target_h * 0.85)

for y in range(y_arm_st, y_arm_en):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        xs_r = np.where(row_m)[0]
        # Left arm run
        l_xs = xs_r[xs_r < int(target_w * 0.35)]
        if len(l_xs) > 0:
            # Ensure arm color is skin tone (not white dress!)
            for lx in l_xs:
                col = front_resized[y, lx]
                # If color is too bright white/dress (brightness > 220), blend towards skin
                if col.mean() > 215:
                    front_resized[y, lx] = avg_skin
        # Right arm run
        r_xs = xs_r[xs_r > int(target_w * 0.65)]
        if len(r_xs) > 0:
            for rx in r_xs:
                col = front_resized[y, rx]
                if col.mean() > 215:
                    front_resized[y, rx] = avg_skin

# Build 1024x1024 Atlas
atlas_bgr = np.full((1024, 1024, 3), avg_dress, dtype=np.uint8)

x_f_start = 256 - target_w // 2
y_start = (1024 - target_h) // 2
atlas_bgr[y_start:y_start+target_h, x_f_start:x_f_start+target_w] = front_resized

# Generate Back View
back_bgr = front_resized.copy()

# 1. Back hair (Y: 0 to 25% of target_h): Full brunette hair updo down to nape
y_hair_end = int(target_h * 0.25)
hair_patch = front_resized[int(target_h*0.03):int(target_h*0.09), int(target_w*0.35):int(target_w*0.65)]
hair_resized = cv2.resize(hair_patch, (target_w, y_hair_end), interpolation=cv2.INTER_CUBIC)
for y in range(y_hair_end):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_bgr[y, row_m] = hair_resized[y, row_m]

# 2. Back neck & bare upper back (Y: 25% to 35%): Porcelain fair skin
y_back_skin_end = int(target_h * 0.35)
skin_patch = front_resized[int(target_h*0.26):int(target_h*0.29), int(target_w*0.42):int(target_w*0.58)]
skin_resized = cv2.resize(skin_patch, (target_w, y_back_skin_end - y_hair_end), interpolation=cv2.INTER_CUBIC)
for idx, y in enumerate(range(y_hair_end, y_back_skin_end)):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_bgr[y, row_m] = skin_resized[idx, row_m]

# Pearl necklace on back of neck (Y ~ 26%)
y_neck = int(target_h * 0.26)
neck_m = mask_resized[y_neck] > 0
if np.any(neck_m):
    xs_n = np.where(neck_m)[0]
    for px in range(xs_n.min() + 8, xs_n.max() - 8, 4):
        back_bgr[y_neck-1:y_neck+2, px-1:px+2] = [245, 245, 250]

# 3. Gown back (Y: 35% to 94%): Ivory satin with spine corset seam
y_skirt_end = int(target_h * 0.94)
for y in range(y_back_skin_end, y_skirt_end):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        xs_row = np.where(row_m)[0]
        x_mid = (xs_row.min() + xs_row.max()) // 2
        w_mid = (xs_row.max() - xs_row.min()) // 2
        dress_span = slice(max(0, x_mid - w_mid), min(target_w, x_mid + w_mid))
        if abs(x_mid) < target_w:
            back_bgr[y, x_mid-1:x_mid+2] = [160, 165, 175]

# Place Back on Right (centered at X=768)
x_b_start = 768 - target_w // 2
back_mirrored = cv2.flip(back_bgr, 1)
atlas_bgr[y_start:y_start+target_h, x_b_start:x_b_start+target_w] = back_mirrored

# Color bleed atlas edges with matching color
for y in range(1024):
    y_idx = min(max(0, y - y_start), target_h - 1)
    atlas_bgr[y, :x_f_start] = front_resized[y_idx, 0]
    atlas_bgr[y, x_f_start+target_w:512] = front_resized[y_idx, -1]
    atlas_bgr[y, 512:x_b_start] = back_mirrored[y_idx, 0]
    atlas_bgr[y, x_b_start+target_w:] = back_mirrored[y_idx, -1]

atlas_rgb = cv2.cvtColor(atlas_bgr, cv2.COLOR_BGR2RGB)
atlas_pil = Image.fromarray(atlas_rgb)
atlas_path = 'public/textures/boss/boss_atlas_flawless.png'
atlas_pil.save(atlas_path)
print(f"Saved atlas to {atlas_path}!")

# 3. 3D Model Construction
world_height = 1.82 # meters
scale_y = world_height / bbox_h
scale_x = scale_y

all_vertices = []
all_uvs = []
all_faces = []

def map_uv(vx, vy, vz):
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

def add_smooth_column(rings_f, rings_b, cap_top=True, cap_bottom=True, top_dome=False):
    K_seg = len(rings_f[0]) - 1

    # Connect Front quad faces
    for i in range(len(rings_f) - 1):
        rf_c = rings_f[i]
        rf_n = rings_f[i + 1]
        for k in range(K_seg):
            c0, c1 = rf_c[k], rf_c[k + 1]
            n0, n1 = rf_n[k], rf_n[k + 1]
            all_faces.append([c0, n0, c1])
            all_faces.append([c1, n0, n1])

    # Connect Back quad faces
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
        # Smooth rounded dome: apex is very close, not a high needle spike!
        top_y = top_pts[0][1] + (0.005 if top_dome else 0.010)

        af_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, 0.003])
        all_uvs.append(map_uv(mid_x, top_y, 0.003))
        for k in range(K_seg):
            all_faces.append([af_idx, top_rf[k], top_rf[k + 1]])

        ab_idx = len(all_vertices)
        all_vertices.append([mid_x, top_y, -0.003])
        all_uvs.append(map_uv(mid_x, top_y, -0.003))
        for k in range(K_seg):
            all_faces.append([ab_idx, top_rb[k], top_rb[k + 1]])

    if cap_bottom:
        bot_rf = rings_f[0]
        bot_rb = rings_b[0]
        bot_pts = [all_vertices[idx] for idx in bot_rf]
        mid_x = np.mean([p[0] for p in bot_pts])
        bot_y = bot_pts[0][1] - 0.008

        bf_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, 0.003])
        all_uvs.append(map_uv(mid_x, bot_y, 0.003))
        for k in range(K_seg):
            all_faces.append([bf_idx, bot_rf[k + 1], bot_rf[k]])

        bb_idx = len(all_vertices)
        all_vertices.append([mid_x, bot_y, -0.003])
        all_uvs.append(map_uv(mid_x, bot_y, -0.003))
        for k in range(K_seg):
            all_faces.append([bb_idx, bot_rb[k + 1], bot_rb[k]])

# ==============================================================================
# PART 1: HEAD & SOFT ROUNDED UPDO BUN (NO needle spike, NO floating ribbons)
# ==============================================================================
print("1. Modeling Head & Soft Rounded Updo Bun...")
head_rf = []
head_rb = []
K_head = 8

# Scanlines for head (from neck Y=290 up to top bun Y=25)
head_y_steps = np.linspace(290, 25, 30).astype(int)

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

    if y_px < 100:
        # Soft rounded bun: dome curves smoothly inward in both X and Z
        t_bun = np.clip((y_px - 25) / (100 - 25), 0.0, 1.0)
        dome = np.sin(t_bun * (np.pi / 2.0))
        rx *= max(0.35, dome)
        rz = rx * 0.95
    elif y_px < 250:
        # Oval skull & face
        rz = min(rx * 0.88, 0.082)
    else:
        # Neck
        rz = min(rx * 0.82, 0.042)

    rf, rb = [], []

    for k in range(K_head + 1):
        th = np.pi * k / K_head
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        if 160 <= y_px <= 215 and vz > 0 and abs(vx) < 0.03:
            vz += 0.013 # Subtle nose bridge
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv(vx, y_world, vz))
        rf.append(v_idx)

    for k in range(K_head + 1):
        th = np.pi + np.pi * k / K_head
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv(vx, y_world, vz))
        rb.append(v_idx)

    head_rf.append(rf)
    head_rb.append(rb)

add_smooth_column(head_rf, head_rb, cap_top=True, cap_bottom=False, top_dome=True)

# ==============================================================================
# PART 2: TORSO & FULLY FLARED A-LINE GOWN (Full width at hem, thigh slit)
# ==============================================================================
print("2. Modeling Torso & Flared A-Line Evening Gown...")
# Scanlines from hem Y=1420 up to sweetheart neckline Y=290
torso_y_steps = np.linspace(1420, 290, 56).astype(int)

body_rf = []
body_rb = []
K_body = 8

for y_px in torso_y_steps:
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height
    row = mask[y_px, :]

    if y_px < 580:
        # Above hips: torso is center run between arms
        torso_xs = np.where((row > 0) & (np.arange(len(row)) >= 380) & (np.arange(len(row)) <= 645))[0]
    else:
        # Below hips: arms have ended! The skirt spans the FULL SILHOUETTE (285 to 741 px!)
        torso_xs = np.where(row > 0)[0]

    if len(torso_xs) == 0:
        continue

    bx_st, bx_en = torso_xs.min(), torso_xs.max()
    b_w = bx_en - bx_st
    b_mid = (bx_st + bx_en) / 2.0
    vx_mid = (b_mid - center_x) * scale_x
    rx = (b_w / 2.0) * scale_x

    if y_px < 420:
        # Bustier chest (depth ~ 16cm)
        rz = min(rx * 0.50, 0.082)
    elif y_px < 560:
        # Corset waist (depth ~ 14cm, slender hourglass)
        rz = min(rx * 0.44, 0.072)
    else:
        # Flared A-line gown: graceful depth (max 13cm radius = 26cm depth)
        rz = min(rx * 0.46, 0.130)

    rf, rb = [], []

    for k in range(K_body + 1):
        th = np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        if 340 <= y_px <= 420 and vz > 0:
            vz *= 1.25 # Sweetheart bustier curve
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv(vx, y_world, vz))
        rf.append(v_idx)

    for k in range(K_body + 1):
        th = np.pi + np.pi * k / K_body
        vx = vx_mid + rx * np.cos(th)
        vz = rz * np.sin(th)
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(map_uv(vx, y_world, vz))
        rb.append(v_idx)

    body_rf.append(rf)
    body_rb.append(rb)

# Skirt hem opens naturally at bottom (cap_bottom=False, NO flat pancake plate!)
add_smooth_column(body_rf, body_rb, cap_top=False, cap_bottom=False)

# ==============================================================================
# PART 3: ACCURATE SLENDER BARE ARMS & NATURAL HANDS (100% Skin Tone!)
# ==============================================================================
print("3. Modeling Slender Bare Arms & Hands...")

def build_bare_arm(is_right=False):
    # Arm Y in bossgame.png: Y=310 (shoulder) to Y=790 (fingertips)
    arm_y_steps = np.linspace(790, 310, 26).astype(int)
    arm_rf, arm_rb = [], []
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

        # Slender arm radius: tapers to 2.4cm at wrist, 3.8cm at deltoid
        t_arm = (790 - y_px) / (790 - 310)
        rx = 0.024 + 0.014 * t_arm
        rz = rx * 0.95

        rf, rb = [], []

        for k in range(K_arm + 1):
            th = np.pi * k / K_arm
            vx = vx_mid + rx * np.cos(th)
            vz = rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_uv(vx, y_world, vz))
            rf.append(v_idx)

        for k in range(K_arm + 1):
            th = np.pi + np.pi * k / K_arm
            vx = vx_mid + rx * np.cos(th)
            vz = rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_uv(vx, y_world, vz))
            rb.append(v_idx)

        arm_rf.append(rf)
        arm_rb.append(rb)

    add_smooth_column(arm_rf, arm_rb, cap_top=True, cap_bottom=True)

build_bare_arm(is_right=False) # Left arm
build_bare_arm(is_right=True)  # Right arm

# ==============================================================================
# PART 4: ELEGANT POINTED WHITE BRIDAL PUMPS (Pointed Toe, Slender Silhouette)
# ==============================================================================
print("4. Modeling Pointed Bridal Pumps...")

def build_pointed_pump(is_right=False):
    # Shoes Y: 1425 to 1518
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

        # Slender pump with pointed toe box
        toe_t = (1518 - y_px) / (1518 - 1425) # 0 at toe tip, 1 at ankle
        rx = 0.022 + 0.012 * toe_t
        rz = rx * (1.1 + 0.3 * np.sin(toe_t * np.pi))
        z_offset = 0.028 * (1.0 - toe_t) # Pointed toe extends forward

        rf, rb = [], []

        for k in range(K_shoe + 1):
            th = np.pi * k / K_shoe
            vx = vx_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_uv(vx, y_world, vz))
            rf.append(v_idx)

        for k in range(K_shoe + 1):
            th = np.pi + np.pi * k / K_shoe
            vx = vx_mid + rx * np.cos(th)
            vz = z_offset + rz * np.sin(th)
            v_idx = len(all_vertices)
            all_vertices.append([vx, y_world, vz])
            all_uvs.append(map_uv(vx, y_world, vz))
            rb.append(v_idx)

        shoe_rf.append(rf)
        shoe_rb.append(rb)

    add_smooth_column(shoe_rf, shoe_rb, cap_top=False, cap_bottom=True)

build_pointed_pump(is_right=False)
build_pointed_pump(is_right=True)

# 4. Final Export
all_vertices = np.array(all_vertices, dtype=np.float32)
all_uvs = np.array(all_uvs, dtype=np.float32)
all_faces = np.array(all_faces, dtype=np.int32)

print(f"Final Model Mesh: {len(all_vertices)} vertices, {len(all_faces)} faces")

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

print("=== FLAWLESS BOSS REBUILD COMPLETE ===")
