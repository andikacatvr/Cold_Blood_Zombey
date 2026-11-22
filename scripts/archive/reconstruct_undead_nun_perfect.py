import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== BUILDING 100% PERFECT SISTER VALENTINA (DEFINITIVE FLAWLESS REPLICA) ===")

# 1. Load clean transparent nun image
src_rgba_path = r'C:\Users\tryfi\.gemini\antigravity\brain\d008bfb7-cdf3-42aa-93f6-a569a857cc5e\nun_transparent_test.png'
im_pil = Image.open(src_rgba_path)
arr_rgba = np.array(im_pil)
H, W = arr_rgba.shape[:2]
alpha = arr_rgba[:, :, 3]
src_rgb = arr_rgba[:, :, :3]

# 2. Bounding Box & Cleanup
ys, xs = np.where(alpha > 0)
ymin, ymax = int(ys.min()), int(ys.max())
xmin, xmax = int(xs.min()), int(xs.max())

bg_col = np.array([22, 22, 26], dtype=np.uint8)
clean_front = np.full_like(src_rgb, bg_col)

# Gentle vibrancy and clarity boost so face tears and bloody mouth stand out clearly
enhanced_rgb = src_rgb.astype(np.float32)
# Slightly boost red channel in bloody areas
is_bloody_or_skin = (enhanced_rgb[:, :, 0] > 70) & (enhanced_rgb[:, :, 0] > enhanced_rgb[:, :, 2] - 10)
enhanced_rgb[is_bloody_or_skin] = np.clip(enhanced_rgb[is_bloody_or_skin] * 1.12 + 6, 0, 255)
enhanced_rgb = np.clip(enhanced_rgb, 0, 255).astype(np.uint8)

clean_front[alpha > 0] = enhanced_rgb[alpha > 0]

# Dilate edge pixels outward (zero white or grey fringe)
mask = (alpha > 0)
cur_mask = mask.copy()
for _ in range(12):
    up = np.roll(cur_mask, -1, axis=0); up[-1, :] = False
    down = np.roll(cur_mask, 1, axis=0); down[0, :] = False
    left = np.roll(cur_mask, -1, axis=1); left[:, -1] = False
    right = np.roll(cur_mask, 1, axis=1); right[:, 0] = False
    border = (~cur_mask) & (up | down | left | right)
    if not np.any(border):
        break
    by, bx = np.where(border)
    for y, x in zip(by, bx):
        for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and cur_mask[ny, nx]:
                clean_front[y, x] = clean_front[ny, nx]
                break
    cur_mask |= border

crop_ymin = max(0, ymin - 10)
crop_ymax = min(H - 1, ymax + 10)
crop_xmin = max(0, xmin - 10)
crop_xmax = min(W - 1, xmax + 10)
crop_h = crop_ymax - crop_ymin + 1
crop_w = crop_xmax - crop_xmin + 1

cropped_front = clean_front[crop_ymin:crop_ymax+1, crop_xmin:crop_xmax+1]

# 3. Build 1024x1024 Atlas
atlas = np.full((1024, 1024, 3), bg_col, dtype=np.uint8)
atlas_front_w = 480
atlas_front_h = 980
x_f_start = 16
y_start = 22
x_b_start = 528
atlas_back_w = 480

front_scaled = cv2.resize(cropped_front, (atlas_front_w, atlas_front_h), interpolation=cv2.INTER_AREA)
atlas[y_start:y_start+atlas_front_h, x_f_start:x_f_start+atlas_front_w] = front_scaled

# Back View: Habit cloth and black veil
habit_path = 'public/textures/sister_valentina_habit.png'
habit_img = Image.open(habit_path).convert('RGB')
habit_resized = cv2.resize(np.array(habit_img), (atlas_back_w, atlas_front_h), interpolation=cv2.INTER_AREA)

veil_end_y = int(atlas_front_h * 0.28)
veil_tile = np.full((veil_end_y, atlas_back_w, 3), [16, 16, 20], dtype=np.uint8)
noise = np.random.randint(-4, 5, (veil_end_y, atlas_back_w, 3), dtype=np.int16)
veil_tile = np.clip(veil_tile.astype(np.int16) + noise, 0, 255).astype(np.uint8)

back_composite = habit_resized.copy()
back_composite[:veil_end_y] = veil_tile
atlas[y_start:y_start+atlas_front_h, x_b_start:x_b_start+atlas_back_w] = back_composite

atlas_pil = Image.fromarray(atlas)
atlas_pil.save('public/textures/nun_perfect_atlas.png')

# 4. UV Mapping Functions
def get_uv_front(orig_x, orig_y):
    norm_x = (orig_x - crop_xmin) / float(crop_w)
    norm_y = (orig_y - crop_ymin) / float(crop_h)
    u = (x_f_start + np.clip(norm_x, 0.0, 1.0) * atlas_front_w) / 1024.0
    v = 1.0 - (y_start + np.clip(norm_y, 0.0, 1.0) * atlas_front_h) / 1024.0
    return [float(u), float(v)]

def get_uv_back(orig_x, orig_y):
    norm_x = 1.0 - (orig_x - crop_xmin) / float(crop_w)
    norm_y = (orig_y - crop_ymin) / float(crop_h)
    u = (x_b_start + np.clip(norm_x, 0.0, 1.0) * atlas_back_w) / 1024.0
    v = 1.0 - (y_start + np.clip(norm_y, 0.0, 1.0) * atlas_front_h) / 1024.0
    return [float(u), float(v)]

world_height = 1.85
scale_y = world_height / float(ymax - ymin)
center_x = 512.0
scale_x = scale_y

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

        # Front quads
        for k in range(K):
            all_faces.append([rf0[k], rf1[k], rf1[k + 1]])
            all_faces.append([rf0[k], rf1[k + 1], rf0[k + 1]])

        # Back quads
        for k in range(K):
            all_faces.append([rb0[k], rb1[k + 1], rb1[k]])
            all_faces.append([rb0[k], rb0[k + 1], rb1[k + 1]])

        # Side seams
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
            all_faces.append([apex_idx, rf_top[k + 1], rf_top[k]])
            all_faces.append([apex_idx, rb_top[k], rb_top[k + 1]])
        all_faces.append([apex_idx, rb_top[0], rf_top[K]])
        all_faces.append([apex_idx, rf_top[0], rb_top[K]])

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

# =========================================================
# 5. HEAD, HOOD & NECK COLUMN (Y: 16 to 280)
# =========================================================
K_head = 8
head_rf, head_rb = [], []

head_steps_cfg = [
    (16,   0.000, 0.035, 0.025, 0.025), # Veil apex point
    (45,  -0.005, 0.065, 0.055, 0.055), # Veil crown
    (80,  -0.005, 0.085, 0.075, 0.075), # Upper forehead & veil
    (120, -0.002, 0.100, 0.082, 0.082), # Forehead & temple hood
    (160,  0.004, 0.105, 0.085, 0.085), # Bleeding eyes & cheekbones
    (190,  0.008, 0.098, 0.085, 0.085), # Nose & cheeks
    (215,  0.010, 0.088, 0.080, 0.080), # Mouth with blood
    (245,  0.018, 0.072, 0.075, 0.075), # TRUE CHIN (+2.2cm forward projection)
    (265, -0.002, 0.060, 0.052, 0.052), # Jawline undercut / throat
    (280,  0.000, 0.065, 0.055, 0.055)  # Neck base / collar connection
]

for y_px, zc, rx, rz_f, rz_b in head_steps_cfg:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    rf, rb = [], []

    for k in range(K_head + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_head)
        vx = rx * np.sin(th)
        vz = zc + rz_f * np.cos(th)
        orig_x = center_x + np.sin(th) * (rx / scale_x * 0.92)
        uv = get_uv_front(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.0, np.cos(th)])
        rf.append(v_idx)

    for k in range(K_head + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_head)
        vx = rx * np.sin(th)
        vz = zc + rz_b * np.cos(th)
        orig_x = center_x + np.sin(th) * (rx / scale_x * 0.92)
        uv = get_uv_back(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.0, np.cos(th)])
        rb.append(v_idx)

    head_rf.append(rf)
    head_rb.append(rb)

add_smooth_column(head_rf, head_rb, cap_top=True, cap_bottom=False, top_dome=True)

# =========================================================
# 6. CONTINUOUS TORSO & FLOWING GOWN (Y: 280 to 1513)
# =========================================================
K_body = 12
body_rf, body_rb = [], []

body_steps_cfg = [
    (280,  410, 614, 0.055, 0.055), # Collar junction (seamless with neck!)
    (310,  360, 664, 0.075, 0.065), # Cowl shoulder slope
    (350,  330, 694, 0.095, 0.080), # Cowl chest & brooch pins
    (400,  325, 699, 0.115, 0.085), # Crucifix on chest
    (460,  335, 689, 0.120, 0.085), # Mid bust / cowl lower rim
    (530,  375, 649, 0.100, 0.075), # Bodice beneath cowl
    (610,  390, 634, 0.085, 0.070), # Cinched waist
    (700,  370, 660, 0.100, 0.085), # Upper hips
    (800,  345, 690, 0.120, 0.105), # Mid hips
    (910,  320, 719, 0.145, 0.130), # Upper skirt flare
    (1030, 292, 747, 0.170, 0.155), # Mid skirt flare
    (1160, 260, 779, 0.200, 0.180), # Lower skirt
    (1300, 225, 815, 0.235, 0.210), # Lower flare
    (1430, 200, 840, 0.270, 0.240), # Hem
    (1510, 205, 835, 0.290, 0.260), # Ground contact
]

for y_px, x_min_px, x_max_px, rz_f, rz_b in body_steps_cfg:
    norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
    y_world = norm_y * world_height
    
    rx = (x_max_px - x_min_px) * 0.5 * scale_x
    rf, rb = [], []

    for k in range(K_body + 1):
        th = -np.pi * 0.5 + np.pi * k / float(K_body)
        vx = rx * np.sin(th)
        vz = rz_f * np.cos(th)
        orig_x = center_x + np.sin(th) * ((x_max_px - x_min_px) * 0.495)
        uv = get_uv_front(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.02, np.cos(th)])
        rf.append(v_idx)

    for k in range(K_body + 1):
        th = np.pi * 0.5 + np.pi * k / float(K_body)
        vx = rx * np.sin(th)
        vz = rz_b * np.cos(th)
        orig_x = center_x + np.sin(th) * ((x_max_px - x_min_px) * 0.495)
        uv = get_uv_back(orig_x, y_px)
        
        v_idx = len(all_vertices)
        all_vertices.append([vx, y_world, vz])
        all_uvs.append(uv)
        all_normals.append([np.sin(th), 0.02, np.cos(th)])
        rb.append(v_idx)

    body_rf.append(rf)
    body_rb.append(rb)

add_smooth_column(body_rf, body_rb, cap_top=False, cap_bottom=False)

# =========================================================
# 7. BELL SLEEVES & OCCULT CLAW ARMS (LEFT & RIGHT)
# =========================================================
K_arm = 8
extra_scene_meshes = []

mat_atlas = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.04
)

def build_nun_arm_and_claws(is_right=False):
    sign = 1.0 if is_right else -1.0
    
    # 1. Bell Sleeve (From shoulder Y=330 down to wide flared cuff Y=560)
    sleeve_steps = [
        # y_px, cx_px, rx_m, rz_m
        (330, 512 + sign * 180, 0.035, 0.035),
        (380, 512 + sign * 215, 0.045, 0.045),
        (440, 512 + sign * 250, 0.055, 0.055),
        (500, 512 + sign * 280, 0.070, 0.065),
        (560, 512 + sign * 295, 0.085, 0.075), # Wide bell cuff opening
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
            vz = rz * np.cos(th)
            orig_x = cx_px + np.sin(th) * (rx / scale_x * 0.85)
            uv = get_uv_front(orig_x, y_px)
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = rz * np.cos(th)
            orig_x = cx_px + np.sin(th) * (rx / scale_x * 0.85)
            uv = get_uv_back(orig_x, y_px)
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        s_rf.append(rf)
        s_rb.append(rb)
    add_smooth_column(s_rf, s_rb, cap_top=True, cap_bottom=True)
    
    # 2. Forearm & Palm Column:
    # Ordered FROM TOP (Y=325, Palm) DOWN TO (Y=520, Inside Sleeve Opening)
    # Positive outward normals!
    forearm_steps = [
        # y_px, cx_px, rx_m, rz_m, z_fwd
        (325, 512 + sign * 415, 0.026, 0.014, 0.10), # Palm & knuckles
        (370, 512 + sign * 385, 0.022, 0.018, 0.09), # Slender wrist
        (430, 512 + sign * 340, 0.024, 0.022, 0.07), # Mid forearm
        (490, 512 + sign * 285, 0.026, 0.024, 0.05), # Entering sleeve cuff
        (520, 512 + sign * 265, 0.026, 0.024, 0.04), # Deep inside sleeve
    ]
    fa_rf, fa_rb = [], []
    for y_px, cx_px, rx, rz, z_fwd in forearm_steps:
        norm_y = 1.0 - (y_px - ymin) / float(ymax - ymin)
        yw = norm_y * world_height
        mid_vx = (cx_px - center_x) * scale_x
        rf, rb = [], []
        
        for k in range(K_arm + 1):
            th = -np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = z_fwd + rz * np.cos(th)
            orig_x = cx_px + np.sin(th) * (rx / scale_x * 0.85)
            uv = get_uv_front(orig_x, y_px)
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = z_fwd + rz * np.cos(th)
            orig_x = cx_px + np.sin(th) * (rx / scale_x * 0.85)
            uv = get_uv_back(orig_x, y_px)
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        fa_rf.append(rf)
        fa_rb.append(rb)
    add_smooth_column(fa_rf, fa_rb, cap_top=True, cap_bottom=True)
    
    # 3. Individual 3D Claw Fingers (Branching from Palm knuckles at Y=325)
    norm_y_palm = 1.0 - (325 - ymin) / float(ymax - ymin)
    yw_palm = norm_y_palm * world_height
    xw_palm = sign * 415 * scale_x
    zw_palm = 0.10
    
    finger_targets = [
        (512 + sign * 365, 275, 0.12, 0.0070), # Inner claw (thumb)
        (512 + sign * 395, 250, 0.13, 0.0068), # Index claw
        (512 + sign * 425, 250, 0.12, 0.0065), # Middle claw
        (512 + sign * 445, 275, 0.11, 0.0060), # Outer pinky claw
    ]
    
    up = np.array([0, 0, 1])
    for fi, (fx_px, fy_px, fz, frad) in enumerate(finger_targets):
        norm_y_tip = 1.0 - (fy_px - ymin) / float(ymax - ymin)
        yw_tip = norm_y_tip * world_height
        xw_tip = (fx_px - center_x) * scale_x
        
        p_base = np.array([xw_palm, yw_palm, zw_palm])
        p_tip = np.array([xw_tip, yw_tip, fz])
        
        vec = p_tip - p_base
        length = np.linalg.norm(vec)
        if length > 0.01:
            direction = vec / length
            mid = (p_base + p_tip) / 2.0
            
            claw = trimesh.creation.cylinder(radius=frad, height=length, sections=6)
            rot = trimesh.geometry.align_vectors(up, direction)
            claw.apply_transform(rot)
            claw.apply_translation(mid)
            
            c_uvs = [get_uv_front(fx_px, fy_px) for _ in claw.vertices]
            claw.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(c_uvs), material=mat_atlas)
            claw.name = f'claw_{fi}_{"r" if is_right else "l"}'
            extra_scene_meshes.append(claw)

# =========================================================
# 8. SHINY SILVER CRUCIFIX & SHOES
# =========================================================
mat_silver = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.95, 0.96, 1.0, 1.0],
    roughnessFactor=0.15,
    metallicFactor=0.96
)

cross_v = trimesh.creation.box(extents=[0.020, 0.16, 0.015])
cross_v.apply_translation([0, 1.35, 0.125])
cross_v.visual.material = mat_silver

cross_h = trimesh.creation.box(extents=[0.11, 0.020, 0.015])
cross_h.apply_translation([0, 1.39, 0.125])
cross_h.visual.material = mat_silver

mat_dark = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.08, 0.08, 0.10, 1.0],
    roughnessFactor=0.92,
    metallicFactor=0.02
)

shoe_l = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_l.apply_translation([-0.09, 0.022, 0.02])
shoe_l.visual.material = mat_dark

shoe_r = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_r.apply_translation([0.09, 0.022, 0.02])
shoe_r.visual.material = mat_dark

# Build arms
build_nun_arm_and_claws(is_right=False)
build_nun_arm_and_claws(is_right=True)

# Assemble main body mesh
vis_main = trimesh.visual.texture.TextureVisuals(uv=np.array(all_uvs), material=mat_atlas)
main_mesh = trimesh.Trimesh(
    vertices=np.array(all_vertices),
    faces=np.array(all_faces),
    visual=vis_main,
    process=False
)
main_mesh.name = 'nun_body'

all_scene_meshes = [main_mesh, cross_v, cross_h, shoe_l, shoe_r] + extra_scene_meshes

scene = trimesh.Scene(all_scene_meshes)
out_glb_public = 'public/models/sister_valentina.glb'
out_glb_root = 'sister_valentina.glb'
out_glb_dist = 'dist/models/sister_valentina.glb'

glb_bytes = trimesh.exchange.gltf.export_glb(scene)

with open(out_glb_public, 'wb') as f:
    f.write(glb_bytes)
print(f"Exported to {out_glb_public} ({len(glb_bytes) / 1024:.1f} KB)")

with open(out_glb_root, 'wb') as f:
    f.write(glb_bytes)

if os.path.exists('dist/models'):
    with open(out_glb_dist, 'wb') as f:
        f.write(glb_bytes)
    print(f"Copied to {out_glb_dist}")

print("=== 100% PERFECT SISTER VALENTINA COMPLETE! ===")
