import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("Starting boss model reconstruction (Anatomical Slender PS1 with Split-UV Seams)...")

# 1. Load source image
src_bgr = cv2.imread('bossgame.png')
if src_bgr is None:
    raise FileNotFoundError("bossgame.png not found!")

h_orig, w_orig = src_bgr.shape[:2]

# 2. Extract silhouette mask
diff = np.abs(src_bgr.astype(float) - [253, 253, 253]).sum(axis=2)
mask = (diff > 16).astype(np.uint8) * 255

# Fill interior pinholes
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

# Bounding box
ys, xs = np.where(mask > 0)
ymin, ymax = ys.min(), ys.max()
xmin, xmax = xs.min(), xs.max()

bbox_h = ymax - ymin
bbox_w = xmax - xmin
center_x = (xmin + xmax) / 2.0
print(f"Bounding box: Y=[{ymin}, {ymax}] (h={bbox_h}), X=[{xmin}, {xmax}] (w={bbox_w}), center_x={center_x:.1f}")

# 3. Create Edge-Bled 1024x1024 Texture Atlas
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

# Initialize atlas with neutral skin/ivory tone, NOT black
atlas_rgb = np.ones((1024, 1024, 3), dtype=np.uint8) * 200
atlas_alpha = np.zeros((1024, 1024), dtype=np.uint8)

x_front_start = 256 - target_w // 2
y_start = (1024 - target_h) // 2

atlas_rgb[y_start:y_start+target_h, x_front_start:x_front_start+target_w] = front_resized
atlas_alpha[y_start:y_start+target_h, x_front_start:x_front_start+target_w] = mask_resized

# Generate Back View
back_rgb = front_resized.copy()

# Back hair (Y: 0 to 18%): Smooth brunette updo bun
y_hair_max = int(target_h * 0.17)
top_hair_patch = front_resized[int(target_h*0.03):int(target_h*0.08), int(target_w*0.35):int(target_w*0.65)]
top_hair_resized = cv2.resize(top_hair_patch, (target_w, y_hair_max), interpolation=cv2.INTER_CUBIC)
for y in range(y_hair_max):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_rgb[y, row_m] = top_hair_resized[y, row_m]

# Back neck & upper back (Y: 17% to 26%)
y_back_skin_max = int(target_h * 0.26)
shoulder_skin_patch = front_resized[int(target_h*0.19):int(target_h*0.23), int(target_w*0.4):int(target_w*0.6)]
shoulder_skin_resized = cv2.resize(shoulder_skin_patch, (target_w, y_back_skin_max - y_hair_max), interpolation=cv2.INTER_CUBIC)
for idx, y in enumerate(range(y_hair_max, y_back_skin_max)):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        back_rgb[y, row_m] = shoulder_skin_resized[idx, row_m]

# Pearl necklace on back of neck
y_neck = int(target_h * 0.18)
neck_m = mask_resized[y_neck] > 0
if np.any(neck_m):
    xs_neck = np.where(neck_m)[0]
    back_rgb[y_neck-1:y_neck+3, xs_neck.min()+6:xs_neck.max()-6] = [245, 245, 245]

# Back of gown (Y: 26% to 94%)
y_skirt_end = int(target_h * 0.94)
for y in range(y_back_skin_max, y_skirt_end):
    row_m = mask_resized[y] > 0
    if np.any(row_m):
        xs_row = np.where(row_m)[0]
        x_min_r, x_max_r = xs_row.min(), xs_row.max()
        x_mid = (x_min_r + x_max_r) // 2
        w_mid = (x_max_r - x_min_r) // 2
        dress_span = slice(max(0, x_mid - w_mid), min(target_w, x_mid + w_mid))
        back_rgb[y, dress_span] = np.clip(back_rgb[y, dress_span].astype(int) + 10, 0, 255).astype(np.uint8)
        if abs(x_mid) < target_w:
            back_rgb[y, x_mid-1:x_mid+2] = [160, 165, 175]

# Place Back on Right Half
x_back_start = 768 - target_w // 2
back_rgb_mirrored = cv2.flip(back_rgb, 1)
mask_back_mirrored = cv2.flip(mask_resized, 1)

atlas_rgb[y_start:y_start+target_h, x_back_start:x_back_start+target_w] = back_rgb_mirrored
atlas_alpha[y_start:y_start+target_h, x_back_start:x_back_start+target_w] = mask_back_mirrored

# Color bleed between islands so margins are matching skin/dress colors
for y in range(1024):
    # Front island left & right edge bleed
    row_f = front_resized[min(max(0, y - y_start), target_h - 1)]
    if y_start <= y < y_start + target_h:
        atlas_rgb[y, :x_front_start] = row_f[0]
        atlas_rgb[y, x_front_start+target_w:512] = row_f[-1]
        row_b = back_rgb_mirrored[y - y_start]
        atlas_rgb[y, 512:x_back_start] = row_b[0]
        atlas_rgb[y, x_back_start+target_w:] = row_b[-1]

atlas_rgb_pil = cv2.cvtColor(atlas_rgb, cv2.COLOR_BGR2RGB)
atlas_pil = Image.fromarray(atlas_rgb_pil)
atlas_path = 'public/textures/boss/boss_atlas_generated.png'
atlas_pil.save(atlas_path)
print(f"Saved texture atlas to {atlas_path}!")

# 4. Multi-Column 3D Geometry Generation with Split-UV Seams
world_height = 1.82 # meters
world_width = world_height * (bbox_w / bbox_h)
scale_y = world_height / bbox_h
scale_x = world_width / bbox_w

K_half = 8 # 8 front quad steps, 8 back quad steps

vertices = []
uvs = []
faces = []

def add_smooth_column(slice_data, is_arm=False, cap_bottom=True):
    """
    Builds a continuous column with separate front & back UV seams.
    Zero stretching across texture islands, zero side seam artifacts!
    """
    if len(slice_data) < 2:
        return

    rings_front = []
    rings_back = []

    for s in slice_data:
        front_v = []
        back_v = []

        # 1. Front Half vertices: theta from 0 to pi (Z >= 0)
        for k in range(K_half + 1):
            theta = np.pi * k / K_half
            vx = s['mid_x'] + s['rx'] * np.cos(theta)
            vz = s['rz'] * np.sin(theta)

            # Anatomical chest volume
            if not is_arm and vz > 0:
                if 0.68 < s['norm_y'] < 0.78:
                    vz *= 1.22
                elif 0.88 < s['norm_y'] < 0.94 and abs(vx) < 0.035:
                    vz += 0.012

            v_idx = len(vertices)
            vertices.append([vx, s['y'], vz])
            front_v.append(v_idx)

            # Front UV in [0.03, 0.47]
            norm_px_x = (vx / scale_x + center_x - xmin) / bbox_w
            norm_px_x = np.clip(norm_px_x, 0.0, 1.0)
            u = (x_front_start + norm_px_x * target_w) / 1024.0
            norm_atlas_y = (y_start + (1.0 - s['norm_y']) * target_h) / 1024.0
            v = 1.0 - norm_atlas_y
            uvs.append([u, v])

        # 2. Back Half vertices: theta from pi to 2*pi (Z <= 0)
        for k in range(K_half + 1):
            theta = np.pi + np.pi * k / K_half
            vx = s['mid_x'] + s['rx'] * np.cos(theta)
            vz = s['rz'] * np.sin(theta)

            v_idx = len(vertices)
            vertices.append([vx, s['y'], vz])
            back_v.append(v_idx)

            # Back UV in [0.53, 0.97]
            norm_px_x = (vx / scale_x + center_x - xmin) / bbox_w
            norm_px_x = np.clip(norm_px_x, 0.0, 1.0)
            u = (x_back_start + (1.0 - norm_px_x) * target_w) / 1024.0
            norm_atlas_y = (y_start + (1.0 - norm_y) * target_h) / 1024.0
            v = 1.0 - norm_atlas_y
            uvs.append([u, v])

        rings_front.append(front_v)
        rings_back.append(back_v)

    # Connect Front Quad Strips
    for i in range(len(rings_front) - 1):
        rf_curr = rings_front[i]
        rf_next = rings_front[i + 1]
        for k in range(K_half):
            c0, c1 = rf_curr[k], rf_curr[k + 1]
            n0, n1 = rf_next[k], rf_next[k + 1]
            faces.append([c0, n0, c1])
            faces.append([c1, n0, n1])

    # Connect Back Quad Strips
    for i in range(len(rings_back) - 1):
        rb_curr = rings_back[i]
        rb_next = rings_back[i + 1]
        for k in range(K_half):
            c0, c1 = rb_curr[k], rb_curr[k + 1]
            n0, n1 = rb_next[k], rb_next[k + 1]
            faces.append([c0, n0, c1])
            faces.append([c1, n0, n1])

    # Close top apex cap smoothly (rounded dome, NO needle spike!)
    top_s = slice_data[-1]
    top_rf = rings_front[-1]
    top_rb = rings_back[-1]

    # Front top apex
    apex_f_idx = len(vertices)
    apex_y = top_s['y'] + (0.015 if is_arm else 0.02)
    vertices.append([top_s['mid_x'], apex_y, 0.005])
    u_apex_f = (x_front_start + ((top_s['mid_x']/scale_x + center_x - xmin)/bbox_w) * target_w) / 1024.0
    v_apex = 1.0 - (y_start + (1.0 - top_s['norm_y']) * target_h) / 1024.0
    uvs.append([u_apex_f, v_apex])
    for k in range(K_half):
        faces.append([apex_f_idx, top_rf[k], top_rf[k + 1]])

    # Back top apex
    apex_b_idx = len(vertices)
    vertices.append([top_s['mid_x'], apex_y, -0.005])
    u_apex_b = (x_back_start + (1.0 - (top_s['mid_x']/scale_x + center_x - xmin)/bbox_w) * target_w) / 1024.0
    uvs.append([u_apex_b, v_apex])
    for k in range(K_half):
        faces.append([apex_b_idx, top_rb[k], top_rb[k + 1]])

    # Close bottom if requested (shoes and fingertips, NOT skirt hem!)
    if cap_bottom:
        bot_s = slice_data[0]
        bot_rf = rings_front[0]
        bot_rb = rings_back[0]

        bot_f_idx = len(vertices)
        bot_y = bot_s['y'] - 0.01
        vertices.append([bot_s['mid_x'], bot_y, 0.005])
        u_bot_f = (x_front_start + ((bot_s['mid_x']/scale_x + center_x - xmin)/bbox_w) * target_w) / 1024.0
        v_bot = 1.0 - (y_start + (1.0 - bot_s['norm_y']) * target_h) / 1024.0
        uvs.append([u_bot_f, v_bot])
        for k in range(K_half):
            faces.append([bot_f_idx, bot_rf[k + 1], bot_rf[k]])

        bot_b_idx = len(vertices)
        vertices.append([bot_s['mid_x'], bot_y, -0.005])
        u_bot_b = (x_back_start + (1.0 - (bot_s['mid_x']/scale_x + center_x - xmin)/bbox_w) * target_w) / 1024.0
        uvs.append([u_bot_b, v_bot])
        for k in range(K_half):
            faces.append([bot_b_idx, bot_rb[k + 1], bot_rb[k]])

# Extract slices
NUM_SLICES = 90
y_steps = np.linspace(ymin, ymax, NUM_SLICES).astype(int)

body_slices = []
l_arm_slices = []
r_arm_slices = []
l_shoe_slices = []
r_shoe_slices = []

for y_px in reversed(y_steps): # bottom to top
    norm_y = 1.0 - (y_px - ymin) / bbox_h
    y_world = norm_y * world_height
    row = mask[y_px, :]

    runs = []
    in_r = False
    for x in range(xmin, xmax + 1):
        if row[x] > 0 and not in_r:
            in_r = True
            st = x
        elif row[x] == 0 and in_r:
            in_r = False
            if x - st > 4:
                runs.append((st, x))
    if in_r and xmax + 1 - st > 4:
        runs.append((st, xmax + 1))

    # Merge very close runs (< 12px)
    m_runs = []
    if len(runs) > 0:
        cs, ce = runs[0]
        for ns, ne in runs[1:]:
            if ns - ce < 12:
                ce = ne
            else:
                m_runs.append((cs, ce))
                cs, ce = ns, ne
        m_runs.append((cs, ce))

    if len(m_runs) == 0:
        continue

    def make_slice_dict(seg_st, seg_en, is_arm=False):
        seg_w = seg_en - seg_st
        seg_mid = (seg_st + seg_en) / 2.0
        x_world_mid = (seg_mid - center_x) * scale_x
        rx = (seg_w / 2.0) * scale_x

        if is_arm:
            # Slender arms: ~ 7cm to 8cm diameter, positioned naturally along torso
            rx = min(rx, 0.042)
            rz = rx * 0.95
        else:
            # Anatomically realistic female body depths (slender PS1 gothic bride)
            if norm_y > 0.85:
                # Head: realistic skull depth (max 0.085m radius = 17cm depth)
                rz = min(rx * 0.85, 0.085)
            elif norm_y > 0.80:
                # Neck: slender neck (max 0.042m radius = 8.4cm depth)
                rz = min(rx * 0.80, 0.042)
            elif norm_y > 0.65:
                # Chest: slender torso (max 0.08m radius = 16cm depth)
                rz = min(rx * 0.50, 0.08)
            elif norm_y > 0.50:
                # Corset waist: hourglass waist (max 0.07m radius = 14cm depth)
                rz = min(rx * 0.44, 0.07)
            elif norm_y > 0.08:
                # Flowing gown skirt: graceful drape (max 0.12m radius = 24cm depth, NOT 48cm barrel!)
                rz = min(rx * 0.45, 0.12)
            else:
                # Shoes
                rz = min(rx * 1.0, 0.08)

        return {
            'mid_x': x_world_mid,
            'y': y_world,
            'rx': rx,
            'rz': rz,
            'norm_y': norm_y
        }

    if len(m_runs) == 1:
        body_slices.append(make_slice_dict(m_runs[0][0], m_runs[0][1]))
    elif len(m_runs) == 3:
        l_arm_slices.append(make_slice_dict(m_runs[0][0], m_runs[0][1], is_arm=True))
        body_slices.append(make_slice_dict(m_runs[1][0], m_runs[1][1]))
        r_arm_slices.append(make_slice_dict(m_runs[2][0], m_runs[2][1], is_arm=True))
    elif len(m_runs) == 2:
        if norm_y < 0.10: # Left and Right Shoes
            l_shoe_slices.append(make_slice_dict(m_runs[0][0], m_runs[0][1]))
            r_shoe_slices.append(make_slice_dict(m_runs[1][0], m_runs[1][1]))
        else:
            body_slices.append(make_slice_dict(m_runs[0][0], m_runs[1][1]))

print(f"Constructing columns: Body={len(body_slices)}, L_Arm={len(l_arm_slices)}, R_Arm={len(r_arm_slices)}, Shoes={len(l_shoe_slices)},{len(r_shoe_slices)}")

# Body is NOT capped at the bottom so the skirt hem is hollow and open (NO flat pancake plate!)
add_smooth_column(body_slices, is_arm=False, cap_bottom=False)
add_smooth_column(l_arm_slices, is_arm=True, cap_bottom=True)
add_smooth_column(r_arm_slices, is_arm=True, cap_bottom=True)
add_smooth_column(l_shoe_slices, is_arm=False, cap_bottom=True)
add_smooth_column(r_shoe_slices, is_arm=False, cap_bottom=True)

vertices = np.array(vertices, dtype=np.float32)
uvs = np.array(uvs, dtype=np.float32)
faces = np.array(faces, dtype=np.int32)

print(f"Total Mesh: {len(vertices)} vertices, {len(faces)} faces")

# 5. Build and Export PBR GLTF
mat = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.05
)
visual = trimesh.visual.texture.TextureVisuals(uv=uvs, material=mat)
mesh = trimesh.Trimesh(vertices=vertices, faces=faces, visual=visual, process=False)

glb_bytes = trimesh.exchange.gltf.export_glb(mesh)

out_files = [
    'bossgame.glb',
    'public/models/bossgame.glb',
    'public/models/boss_bride.glb',
    'dist/models/bossgame.glb',
    'dist/models/boss_bride.glb'
]

for out_path in out_files:
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'wb') as f:
        f.write(glb_bytes)
    print(f"Exported {out_path} ({len(glb_bytes)} bytes)")

print("Reconstruction finished successfully!")
