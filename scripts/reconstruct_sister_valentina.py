import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== RECONSTRUCTING SISTER VALENTINA 3D GLB FROM REFERENCE SHEET ===")

# 1. Load source image
src_path = '75cd7e79-e0c2-4f14-8325-ce8001652797.png'
if not os.path.exists(src_path):
    raise FileNotFoundError(f"Source image '{src_path}' not found!")

img = cv2.imread(src_path)
H, W = img.shape[:2]
print(f"Loaded reference sheet: {W}x{H}")

# 2. Extract Checkerboard Background Mask
# Checkerboard background consists of neutral whites and greys (> 170 in all channels, sat < 25)
max_c = np.max(img, axis=2).astype(float)
min_c = np.min(img, axis=2).astype(float)
sat = max_c - min_c
is_bg = (min_c > 170) & (sat < 25)
fg_mask = (~is_bg).astype(np.uint8) * 255

# Morphological cleanup
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

# 3. Extract Views:
# Front View: X in [20, 560], Y in [105, 1055]
# Side View: X in [565, 845], Y in [115, 1060]
# Back View: X in [845, 1100], Y in [250, 1055]
# Head Close-up: X in [1105, 1445], Y in [10, 350]

crop_front_bgr = img[105:1055, 20:560].copy()
mask_front = fg_mask[105:1055, 20:560].copy()

crop_side_bgr = img[115:1060, 565:845].copy()
mask_side = fg_mask[115:1060, 565:845].copy()

crop_back_bgr = img[250:1055, 845:1100].copy()
mask_back = fg_mask[250:1055, 845:1100].copy()

crop_head_bgr = img[10:350, 1105:1445].copy()
mask_head = fg_mask[10:350, 1105:1445].copy()

print(f"Front crop: {crop_front_bgr.shape}, Side crop: {crop_side_bgr.shape}, Back crop: {crop_back_bgr.shape}, Head crop: {crop_head_bgr.shape}")

# Inpaint / edge-bleed helper to completely eliminate white borders
def edge_bleed(bgr, mask):
    fg_pts = np.argwhere(mask > 0)
    if len(fg_pts) == 0:
        return bgr.copy()
    dist, labels = cv2.distanceTransformWithLabels((255 - mask), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    nearest = fg_pts[labels - 1]
    bled = bgr[nearest[:, :, 0], nearest[:, :, 1]]
    return bled

front_bled = edge_bleed(crop_front_bgr, mask_front)
side_bled = edge_bleed(crop_side_bgr, mask_side)
back_bled = edge_bleed(crop_back_bgr, mask_back)
head_bled = edge_bleed(crop_head_bgr, mask_head)

# 4. Composite high-resolution Face onto Front View Head
# In front view, head is at Y: 0 to ~160, X: ~180 to ~350
# Cleanly blend high-res head
ys_h, xs_h = np.where(mask_head > 0)
head_sub_bgr = head_bled[ys_h.min():ys_h.max()+1, xs_h.min():xs_h.max()+1]
head_sub_mask = mask_head[ys_h.min():ys_h.max()+1, xs_h.min():xs_h.max()+1]

# Resize head sub to fit front view head bounds exactly
target_head_w = 170
target_head_h = 160
head_resized = cv2.resize(head_sub_bgr, (target_head_w, target_head_h), interpolation=cv2.INTER_AREA)
head_mask_resized = cv2.resize(head_sub_mask, (target_head_w, target_head_h), interpolation=cv2.INTER_LINEAR)

# Blend into front_bled
y_head_dst = 8
x_head_dst = 185
alpha_blend = (head_mask_resized.astype(float) / 255.0)[:, :, None]
patch = front_bled[y_head_dst:y_head_dst+target_head_h, x_head_dst:x_head_dst+target_head_w]
front_bled[y_head_dst:y_head_dst+target_head_h, x_head_dst:x_head_dst+target_head_w] = (
    head_resized * alpha_blend + patch * (1.0 - alpha_blend)
).astype(np.uint8)

# 5. Build Texture Atlas (1024 x 1024)
# Left half (U: 0.0 to 0.5): Front view
# Right half (U: 0.5 to 1.0): Back view (with veil top matched to front head)
atlas = np.full((1024, 1024, 3), [38, 38, 40], dtype=np.uint8) # Dark nun habit base color

# Scale Front view to fit left half: target height ~ 980, centered at X=256
fh, fw = front_bled.shape[:2]
target_fh = 960
target_fw = int(fw * (target_fh / fh))
if target_fw > 480:
    target_fw = 480
    target_fh = int(fh * (target_fw / fw))

front_scaled = cv2.resize(front_bled, (target_fw, target_fh), interpolation=cv2.INTER_AREA)
mask_front_scaled = cv2.resize(mask_front, (target_fw, target_fh), interpolation=cv2.INTER_NEAREST)

x_f_start = 256 - target_fw // 2
y_start = (1024 - target_fh) // 2
atlas[y_start:y_start+target_fh, x_f_start:x_f_start+target_fw] = front_scaled

# Scale Back view to fit right half: centered at X=768
# Since back view in reference starts below head, we construct the back veil top from the dark veil textures
bh, bw = back_bled.shape[:2]
target_bh = int(bh * (target_fh / fh))
target_bw = int(bw * (target_fh / fh))
if target_bw > 460:
    target_bw = 460

back_scaled = cv2.resize(back_bled, (target_bw, target_bh), interpolation=cv2.INTER_AREA)

# Full height back panel:
back_full = np.full((target_fh, target_bw, 3), [35, 35, 38], dtype=np.uint8)
# Paste back body at the bottom
y_b_offset = target_fh - target_bh
back_full[y_b_offset:] = back_scaled

# Fill upper back with dark draped veil texture
veil_patch = back_scaled[0:50, :]
veil_tiled = cv2.resize(veil_patch, (target_bw, y_b_offset), interpolation=cv2.INTER_LINEAR)
back_full[:y_b_offset] = veil_tiled

# Flip back horizontally so right-side matches in UV space
back_mirrored = cv2.flip(back_full, 1)

x_b_start = 768 - target_bw // 2
atlas[y_start:y_start+target_fh, x_b_start:x_b_start+target_bw] = back_mirrored

# Edge bleed across horizontal borders
for y in range(1024):
    rf = atlas[y, x_f_start]
    atlas[y, :x_f_start] = rf
    rf_end = atlas[y, x_f_start+target_fw-1]
    atlas[y, x_f_start+target_fw:512] = rf_end

    rb = atlas[y, x_b_start]
    atlas[y, 512:x_b_start] = rb
    rb_end = atlas[y, x_b_start+target_bw-1]
    atlas[y, x_b_start+target_bw:] = rb_end

# Save atlas
os.makedirs('public/textures', exist_ok=True)
atlas_pil = Image.fromarray(cv2.cvtColor(atlas, cv2.COLOR_BGR2RGB))
atlas_pil.save('public/textures/sister_valentina_atlas.png')
print("Saved texture atlas to public/textures/sister_valentina_atlas.png")

# 6. Build 3D Mesh Geometry
# Model proportions: Height = 1.85m
world_height = 1.85
scale_y = world_height / target_fh
scale_x = scale_y # uniform aspect

vertices = []
uvs = []
faces = []

# Front and Side silhouette extraction for radii
# Sample N vertical stations along the body
N_STATIONS = 48
K_HALF = 10 # 10 quad segments front, 10 quad segments back (20 around circumference)

# Analyze rows from mask_front_scaled to get torso / skirt widths
ys_front = np.linspace(0, target_fh - 1, N_STATIONS).astype(int)

# In side view, scale to match target_fh
side_scaled = cv2.resize(side_bled, (int(crop_side_bgr.shape[1] * (target_fh / crop_side_bgr.shape[0])), target_fh), interpolation=cv2.INTER_AREA)
mask_side_scaled = cv2.resize(mask_side, (side_scaled.shape[1], target_fh), interpolation=cv2.INTER_NEAREST)

def make_column(slice_infos, cap_top=True, cap_bottom=True):
    """
    Builds a continuous watertight column with Front (Z >= 0) and Back (Z <= 0) split UV mapping.
    """
    if len(slice_infos) < 2:
        return

    rings_front = []
    rings_back = []

    for s in slice_infos:
        rf = []
        rb = []
        y = s['y']
        mid_x = s['mid_x']
        mid_z = s['mid_z']
        rx = max(0.015, s['rx'])
        rz = max(0.015, s['rz'])
        norm_y = s['norm_y']

        # Front vertices (theta: 0 to pi)
        for k in range(K_HALF + 1):
            theta = np.pi * k / K_HALF
            vx = mid_x + rx * np.cos(theta)
            vz = mid_z + rz * np.sin(theta)

            v_idx = len(vertices)
            vertices.append([vx, y, vz])
            rf.append(v_idx)

            # Front UV: U in [x_f_start, x_f_start + target_fw] / 1024
            norm_u = (vx / (target_fw * scale_x) + 0.5)
            norm_u = np.clip(norm_u, 0.02, 0.98)
            u = (x_f_start + norm_u * target_fw) / 1024.0
            v = 1.0 - (y_start + (1.0 - norm_y) * target_fh) / 1024.0
            uvs.append([u, v])

        # Back vertices (theta: pi to 2*pi)
        for k in range(K_HALF + 1):
            theta = np.pi + np.pi * k / K_HALF
            vx = mid_x + rx * np.cos(theta)
            vz = mid_z + rz * np.sin(theta)

            v_idx = len(vertices)
            vertices.append([vx, y, vz])
            rb.append(v_idx)

            # Back UV: U in [x_b_start, x_b_start + target_bw] / 1024
            norm_u = (1.0 - (vx / (target_fw * scale_x) + 0.5))
            norm_u = np.clip(norm_u, 0.02, 0.98)
            u = (x_b_start + norm_u * target_bw) / 1024.0
            v = 1.0 - (y_start + (1.0 - norm_y) * target_fh) / 1024.0
            uvs.append([u, v])

        rings_front.append(rf)
        rings_back.append(rb)

    # Connect quads
    for i in range(len(slice_infos) - 1):
        rf_c, rf_n = rings_front[i], rings_front[i + 1]
        rb_c, rb_n = rings_back[i], rings_back[i + 1]
        for k in range(K_HALF):
            # Front
            faces.append([rf_c[k], rf_n[k], rf_c[k + 1]])
            faces.append([rf_c[k + 1], rf_n[k], rf_n[k + 1]])
            # Back
            faces.append([rb_c[k], rb_n[k], rb_c[k + 1]])
            faces.append([rb_c[k + 1], rb_n[k], rb_n[k + 1]])

    # Top Cap
    if cap_top:
        top_s = slice_infos[-1]
        apex_f = len(vertices)
        vertices.append([top_s['mid_x'], top_s['y'] + 0.02, top_s['mid_z'] + 0.01])
        uvs.append([(x_f_start + 0.5 * target_fw) / 1024.0, 1.0 - (y_start + (1.0 - top_s['norm_y']) * target_fh) / 1024.0])
        apex_b = len(vertices)
        vertices.append([top_s['mid_x'], top_s['y'] + 0.02, top_s['mid_z'] - 0.01])
        uvs.append([(x_b_start + 0.5 * target_bw) / 1024.0, 1.0 - (y_start + (1.0 - top_s['norm_y']) * target_fh) / 1024.0])

        top_rf = rings_front[-1]
        top_rb = rings_back[-1]
        for k in range(K_HALF):
            faces.append([apex_f, top_rf[k], top_rf[k + 1]])
            faces.append([apex_b, top_rb[k], top_rb[k + 1]])

    # Bottom Cap
    if cap_bottom:
        bot_s = slice_infos[0]
        bot_apex_f = len(vertices)
        vertices.append([bot_s['mid_x'], bot_s['y'] - 0.01, bot_s['mid_z'] + 0.01])
        uvs.append([(x_f_start + 0.5 * target_fw) / 1024.0, 1.0 - (y_start + (1.0 - bot_s['norm_y']) * target_fh) / 1024.0])
        bot_apex_b = len(vertices)
        vertices.append([bot_s['mid_x'], bot_s['y'] - 0.01, bot_s['mid_z'] - 0.01])
        uvs.append([(x_b_start + 0.5 * target_bw) / 1024.0, 1.0 - (y_start + (1.0 - bot_s['norm_y']) * target_fh) / 1024.0])

        bot_rf = rings_front[0]
        bot_rb = rings_back[0]
        for k in range(K_HALF):
            faces.append([bot_apex_f, bot_rf[k + 1], bot_rf[k]])
            faces.append([bot_apex_b, bot_rb[k + 1], bot_rb[k]])

# Extract slices:
# Body (Head, Torso, Bell Skirt)
body_slices = []
left_arm_slices = []
right_arm_slices = []

# Ground is Y=0 at bottom of sheet (norm_y = 0.0), Head top is norm_y = 1.0
for sy in range(target_fh - 1, -1, -16):
    norm_y = (target_fh - 1 - sy) / target_fh
    world_y = norm_y * world_height

    # Front mask analysis at sy
    row_fg = np.where(mask_front_scaled[sy] > 0)[0]
    row_side = np.where(mask_side_scaled[sy] > 0)[0]

    if len(row_fg) == 0:
        continue

    # Body width
    # In arms region (norm_y between 0.55 and 0.82), separate arms from torso
    if 0.55 <= norm_y <= 0.82:
        diffs = np.diff(row_fg)
        gaps = np.where(diffs > 5)[0]
        if len(gaps) >= 2:
            # Left arm, body, right arm
            l_arm_pts = row_fg[:gaps[0]+1]
            body_pts = row_fg[gaps[0]+1:gaps[-1]+1]
            r_arm_pts = row_fg[gaps[-1]+1:]

            # Body slice
            b_min, b_max = body_pts[0], body_pts[-1]
            rx = (b_max - b_min) * 0.5 * scale_x
            mid_x = ((b_min + b_max) * 0.5 - target_fw * 0.5) * scale_x
            rz = (row_side.max() - row_side.min()) * 0.45 * scale_x if len(row_side) else rx * 0.7
            body_slices.append({'y': world_y, 'mid_x': mid_x, 'mid_z': 0.0, 'rx': rx, 'rz': rz, 'norm_y': norm_y})

            # Left arm slice (reaching forward in Z)
            la_min, la_max = l_arm_pts[0], l_arm_pts[-1]
            la_rx = max(0.035, (la_max - la_min) * 0.5 * scale_x)
            la_mid_x = ((la_min + la_max) * 0.5 - target_fw * 0.5) * scale_x
            la_mid_z = 0.12 + 0.15 * (norm_y - 0.55) / 0.27
            left_arm_slices.append({'y': world_y, 'mid_x': la_mid_x, 'mid_z': la_mid_z, 'rx': la_rx, 'rz': la_rx, 'norm_y': norm_y})

            # Right arm slice
            ra_min, ra_max = r_arm_pts[0], r_arm_pts[-1]
            ra_rx = max(0.035, (ra_max - ra_min) * 0.5 * scale_x)
            ra_mid_x = ((ra_min + ra_max) * 0.5 - target_fw * 0.5) * scale_x
            ra_mid_z = 0.12 + 0.15 * (norm_y - 0.55) / 0.27
            right_arm_slices.append({'y': world_y, 'mid_x': ra_mid_x, 'mid_z': ra_mid_z, 'rx': ra_rx, 'rz': ra_rx, 'norm_y': norm_y})
            continue

    # Main body slice (Head, Torso, Skirt)
    f_min, f_max = row_fg.min(), row_fg.max()
    rx = (f_max - f_min) * 0.5 * scale_x
    mid_x = ((f_min + f_max) * 0.5 - target_fw * 0.5) * scale_x
    rz = (row_side.max() - row_side.min()) * 0.48 * scale_x if len(row_side) else rx * 0.75
    # Head & veil contour
    mid_z = -0.02 * (norm_y) if norm_y > 0.85 else 0.0
    body_slices.append({'y': world_y, 'mid_x': mid_x, 'mid_z': mid_z, 'rx': rx, 'rz': rz, 'norm_y': norm_y})

print(f"Constructed slices: Body={len(body_slices)}, Left Arm={len(left_arm_slices)}, Right Arm={len(right_arm_slices)}")

# Build columns
make_column(body_slices, cap_top=True, cap_bottom=True)
if len(left_arm_slices) >= 2:
    make_column(left_arm_slices, cap_top=True, cap_bottom=True)
if len(right_arm_slices) >= 2:
    make_column(right_arm_slices, cap_top=True, cap_bottom=True)

# Add Shoes under the skirt resting at ground Y=0
for shoe_x in [-0.10, 0.10]:
    shoe_slices = [
        {'y': 0.00, 'mid_x': shoe_x, 'mid_z': 0.02, 'rx': 0.05, 'rz': 0.08, 'norm_y': 0.02},
        {'y': 0.04, 'mid_x': shoe_x, 'mid_z': 0.02, 'rx': 0.05, 'rz': 0.08, 'norm_y': 0.03},
        {'y': 0.08, 'mid_x': shoe_x, 'mid_z': 0.01, 'rx': 0.045, 'rz': 0.06, 'norm_y': 0.04}
    ]
    make_column(shoe_slices, cap_top=True, cap_bottom=True)

vertices = np.array(vertices, dtype=np.float32)
uvs = np.array(uvs, dtype=np.float32)
faces = np.array(faces, dtype=np.int32)

print(f"Generated watertight mesh: {len(vertices)} vertices, {len(faces)} faces.")

# 7. Create PBR Material and Export to GLB
mat = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.85,
    metallicFactor=0.08
)
visual = trimesh.visual.texture.TextureVisuals(uv=uvs, material=mat)
mesh = trimesh.Trimesh(vertices=vertices, faces=faces, visual=visual, process=False)

# Export GLB bytes
glb_bytes = trimesh.exchange.gltf.export_glb(mesh)
print(f"Exported GLB binary size: {len(glb_bytes):,} bytes ({len(glb_bytes)/1024:.1f} KB)")

output_paths = [
    'public/models/sister_valentina.glb',
    'sister_valentina.glb'
]

for out_p in output_paths:
    os.makedirs(os.path.dirname(os.path.abspath(out_p)), exist_ok=True)
    with open(out_p, 'wb') as f:
        f.write(glb_bytes)
    print(f"Saved: {out_p}")

print("=== RECONSTRUCTION COMPLETED SUCCESSFULLY! ===")
