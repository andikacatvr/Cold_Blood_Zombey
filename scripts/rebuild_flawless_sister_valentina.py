import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== BUILDING 100% PERFECT DEFINITIVE SISTER VALENTINA ===")

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

# 1. Build 1024x1024 Master Texture Atlas
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

# Back View: Habit cloth and draped black veil
habit_path = 'public/textures/sister_valentina_habit.png'
habit_img = Image.open(habit_path).convert('RGB')
habit_resized = cv2.resize(np.array(habit_img), (atlas_back_w, atlas_front_h), interpolation=cv2.INTER_AREA)
habit_resized = np.clip((habit_resized.astype(np.float32) / 255.0) ** 0.70 * 255.0, 0, 255).astype(np.uint8)

veil_end_y = int(atlas_front_h * 0.28)
veil_tile = np.full((veil_end_y, atlas_back_w, 3), [18, 19, 23], dtype=np.uint8)
noise = np.random.randint(-4, 5, (veil_end_y, atlas_back_w, 3), dtype=np.int16)
veil_tile = np.clip(veil_tile.astype(np.int16) + noise, 0, 255).astype(np.uint8)

back_composite = habit_resized.copy()
back_composite[:veil_end_y] = veil_tile
atlas[y_start:y_start+atlas_front_h, x_b_start:x_b_start+atlas_back_w] = back_composite

atlas_pil = Image.fromarray(atlas)
atlas_pil.save('public/textures/nun_perfect_atlas.png')
atlas_pil.save(os.path.join(art_dir, 'nun_master_atlas.png'))
print("Saved master texture atlas!")

# 2. Dimensions & Planar UV Projections
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

# 3. HEAD & WIMPLE (Y: 20 to 290)
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

# 4. TORSO, COWL CAPE & FLOWING GOWN (Y: 290 to 1515)
K_body = 12
body_rf, body_rb = [], []

body_steps_cfg = [
    (290,  375, 660, 0.085, 0.080), # Collar junction (seamless with head!)
    (320,  346, 687, 0.095, 0.085), # Cowl shoulder slope
    (360,  320, 715, 0.115, 0.095), # Cowl chest & brooch pins
    (410,  300, 725, 0.130, 0.105), # Chest & silver crucifix
    (460,  325, 700, 0.125, 0.100), # Mid bust / cowl lower rim
    (530,  380, 645, 0.105, 0.085), # Bodice beneath cowl
    (610,  402, 636, 0.090, 0.075), # Cinched waist
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

add_smooth_column(body_rf, body_rb, cap_top=False, cap_bottom=False)

# 5. BELL SLEEVES & OCCULT CLAW ARMS
K_arm = 8
extra_scene_meshes = []

mat_atlas = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.04
)

def build_nun_arm_and_claws(is_right=False):
    sign = 1.0 if is_right else -1.0
    
    # Bell Sleeve
    sleeve_steps = [
        (330, 512 + sign * 180, 0.038, 0.038),
        (380, 512 + sign * 215, 0.048, 0.048),
        (440, 512 + sign * 250, 0.058, 0.058),
        (500, 512 + sign * 280, 0.072, 0.068),
        (560, 512 + sign * 295, 0.088, 0.078),
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
            vz = 0.045 + rz * np.cos(th)
            uv = get_uv_front_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rf.append(v_idx)
            
        for k in range(K_arm + 1):
            th = np.pi * 0.5 + np.pi * k / float(K_arm)
            vx = mid_vx + rx * np.sin(th)
            vz = 0.045 + rz * np.cos(th)
            uv = get_uv_back_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        s_rf.append(rf)
        s_rb.append(rb)
        
    add_smooth_column(s_rf, s_rb, cap_top=True, cap_bottom=True)

    # Raised Forearm
    forearm_steps = [
        (325, 512 + sign * 370, 0.165, 0.024, 0.024),
        (370, 512 + sign * 350, 0.145, 0.024, 0.024),
        (420, 512 + sign * 330, 0.120, 0.026, 0.026),
        (470, 512 + sign * 310, 0.090, 0.028, 0.028),
        (520, 512 + sign * 290, 0.060, 0.030, 0.030),
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
            uv = get_uv_front_planar(vx, yw)
            
            v_idx = len(all_vertices)
            all_vertices.append([vx, yw, vz])
            all_uvs.append(uv)
            all_normals.append([np.sin(th), 0.0, np.cos(th)])
            rb.append(v_idx)
            
        a_rf.append(rf)
        a_rb.append(rb)
        
    add_smooth_column(a_rf, a_rb, cap_top=True, cap_bottom=True)

    # 4 Demonic Claw Fingers
    finger_targets = [
        (512 + sign * 350, 255, 0.170, 0.0075),
        (512 + sign * 370, 240, 0.185, 0.0070),
        (512 + sign * 410, 250, 0.175, 0.0068),
        (512 + sign * 435, 270, 0.155, 0.0062),
    ]
    palm_x_w = (512 + sign * 370 - center_x) * scale_x
    norm_y_palm = 1.0 - (325 - ymin) / float(ymax - ymin)
    palm_y_w = norm_y_palm * world_height
    palm_z_w = 0.165
    p_base = np.array([palm_x_w, palm_y_w, palm_z_w])

    up = np.array([0, 1, 0], dtype=float)
    for fi, (fx_px, fy_px, fz_w, frad) in enumerate(finger_targets):
        tip_x_w = (fx_px - center_x) * scale_x
        norm_y_tip = 1.0 - (fy_px - ymin) / float(ymax - ymin)
        tip_y_w = norm_y_tip * world_height
        p_tip = np.array([tip_x_w, tip_y_w, fz_w])
        
        vec = p_tip - p_base
        length = float(np.linalg.norm(vec))
        if length > 0.01:
            direction = vec / length
            mid = (p_base + p_tip) / 2.0
            
            claw = trimesh.creation.cylinder(radius=frad, height=length, sections=6)
            rot = trimesh.geometry.align_vectors(up, direction)
            claw.apply_transform(rot)
            claw.apply_translation(mid)
            
            c_uvs = [get_uv_front_planar(v[0], v[1]) for v in claw.vertices]
            claw.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(c_uvs), material=mat_atlas)
            claw.name = f'claw_{fi}_{"r" if is_right else "l"}'
            extra_scene_meshes.append(claw)

# Nun shoes
mat_dark = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.12, 0.12, 0.14, 1.0],
    roughnessFactor=0.92,
    metallicFactor=0.02
)
shoe_l = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_l.apply_translation([-0.09, 0.022, 0.02])
shoe_l.visual.material = mat_dark

shoe_r = trimesh.creation.box(extents=[0.075, 0.045, 0.15])
shoe_r.apply_translation([0.09, 0.022, 0.02])
shoe_r.visual.material = mat_dark

build_nun_arm_and_claws(is_right=False)
build_nun_arm_and_claws(is_right=True)

vis_main = trimesh.visual.texture.TextureVisuals(uv=np.array(all_uvs), material=mat_atlas)
main_mesh = trimesh.Trimesh(
    vertices=np.array(all_vertices),
    faces=np.array(all_faces),
    visual=vis_main,
    process=False
)
main_mesh.name = 'nun_body'

all_scene_meshes = [main_mesh, shoe_l, shoe_r] + extra_scene_meshes
scene = trimesh.Scene(all_scene_meshes)

out_glb_public = 'public/models/sister_valentina.glb'
out_glb_root = 'sister_valentina.glb'
out_glb_dist = 'dist/models/sister_valentina.glb'

glb_bytes = trimesh.exchange.gltf.export_glb(scene)
with open(out_glb_public, 'wb') as f: f.write(glb_bytes)
with open(out_glb_root, 'wb') as f: f.write(glb_bytes)
if os.path.exists('dist/models'):
    with open(out_glb_dist, 'wb') as f: f.write(glb_bytes)

print(f"Exported Sister Valentina GLB: {len(glb_bytes) / 1024:.1f} KB")
