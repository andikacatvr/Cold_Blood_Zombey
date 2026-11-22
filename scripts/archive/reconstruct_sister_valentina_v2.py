import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== RECONSTRUCTING SISTER VALENTINA V2 (ANATOMICALLY FLAWLESS, NO WINGS, CLEAN ARMS) ===")

src_path = '75cd7e79-e0c2-4f14-8325-ce8001652797.png'
if not os.path.exists(src_path):
    raise FileNotFoundError(f"Source image '{src_path}' not found!")

img = cv2.imread(src_path)
H, W = img.shape[:2]
print(f"Loaded reference sheet: {W}x{H}")

# 1. Strict Checkerboard Mask & 100% Nearest-Neighbor Edge Bleed
max_c = np.max(img, axis=2).astype(float)
min_c = np.min(img, axis=2).astype(float)
sat = max_c - min_c
is_bg = (min_c > 170) & (sat < 22)
fg_mask = (~is_bg).astype(np.uint8) * 255
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

dist, labels = cv2.distanceTransformWithLabels((255 - fg_mask), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
fg_pts = np.argwhere(fg_mask > 0)
nearest = fg_pts[labels - 1]
img_bled = img[nearest[:, :, 0], nearest[:, :, 1]]

# 2. Extract Dedicated Clean Crops
# Front Body (Torso with Silver Crucifix + Flaring Skirt)
# Torso is centered at X=290, width=440, Y in [270, 1055]
crop_front_body = img_bled[270:1055, 70:510]
# Back Body (Habit back + Skirt back)
crop_back_body = img_bled[260:1055, 835:1115]
# High-Res Head (Detailed Face with Crying Bloody Tears + Wimple)
crop_head_hr = img_bled[15:345, 1110:1435]
# Hands (Left and Right Bloodied Claw Hands & Sleeves)
crop_l_hand = img_bled[240:480, 20:120]
crop_r_hand = img_bled[240:480, 460:560]

# 3. Assemble Ultra-Crisp 2048 x 2048 Texture Atlas
# Atlas Dimensions: 2048 x 2048
ATLAS_SIZE = 2048
atlas = np.full((ATLAS_SIZE, ATLAS_SIZE, 3), [37, 37, 40], dtype=np.uint8) # Dark habit base

# Layout in Atlas:
# Region 1: Front Body (Torso & Skirt): X in [800, 1400], Y in [200, 2040]
# Scaled to: W=600, H=1840
fb_scaled = cv2.resize(crop_front_body, (600, 1840), interpolation=cv2.INTER_AREA)
atlas[200:2040, 800:1400] = fb_scaled

# Region 2: Back Body (Torso & Skirt): X in [1440, 2040], Y in [200, 2040]
# Scaled to: W=600, H=1840
bb_scaled = cv2.resize(crop_back_body, (600, 1840), interpolation=cv2.INTER_AREA)
bb_mirrored = cv2.flip(bb_scaled, 1)
atlas[200:2040, 1440:2040] = bb_mirrored

# Region 3: Face & Wimple (High-Res): X in [50, 750], Y in [50, 750]
# Scaled to: W=700, H=700
head_scaled = cv2.resize(crop_head_hr, (700, 700), interpolation=cv2.INTER_AREA)
atlas[50:750, 50:750] = head_scaled

# Region 4: Veil Back: X in [50, 750], Y in [800, 1400]
# Sample rich dark draped fabric texture
veil_patch = bb_scaled[0:400, :]
veil_scaled = cv2.resize(veil_patch, (700, 600), interpolation=cv2.INTER_LINEAR)
atlas[800:1400, 50:750] = veil_scaled

# Region 5: Hands & Sleeves: X in [50, 400] and [420, 770], Y in [1450, 2000]
lh_scaled = cv2.resize(crop_l_hand, (350, 550), interpolation=cv2.INTER_AREA)
rh_scaled = cv2.resize(crop_r_hand, (350, 550), interpolation=cv2.INTER_AREA)
atlas[1450:2000, 50:400] = lh_scaled
atlas[1450:2000, 420:770] = rh_scaled

# Smooth edge bleeding across atlas seams
for y in range(ATLAS_SIZE):
    atlas[y, :50] = atlas[y, 50]
    atlas[y, 750:800] = atlas[y, 749]
    atlas[y, 1400:1440] = atlas[y, 1399]
    atlas[y, 2040:] = atlas[y, 2039]

atlas_pil = Image.fromarray(cv2.cvtColor(atlas, cv2.COLOR_BGR2RGB))
os.makedirs('public/textures', exist_ok=True)
atlas_pil.save('public/textures/sister_valentina_atlas.png')
print("Saved 2048x2048 texture atlas to public/textures/sister_valentina_atlas.png")

# 4. Construct 3D Mesh Geometries with Flawless Proportions
vertices = []
uvs = []
faces = []

def add_tri(v0, v1, v2):
    faces.append([v0, v1, v2])

def add_quad(c0, c1, n0, n1):
    add_tri(c0, n0, c1)
    add_tri(c1, n0, n1)

# Helper: UV coordinate normalizer for 2048 atlas
def get_uv(px_x, px_y):
    return [px_x / ATLAS_SIZE, 1.0 - (px_y / ATLAS_SIZE)]

# ---------------------------------------------------------
# A. HEAD & VEIL (Oval Head, Wimple, Face, Draped Rear Veil)
# ---------------------------------------------------------
HEAD_RINGS = 14
HEAD_SEGS = 20
head_y_min = 1.48
head_y_max = 1.84
head_cy = (head_y_min + head_y_max) / 2.0
head_hy = (head_y_max - head_y_min) / 2.0
head_rx = 0.115
head_rz = 0.135

head_rings_idx = []

for r in range(HEAD_RINGS + 1):
    phi = np.pi * r / HEAD_RINGS # 0 at top, pi at bottom
    y = head_cy + head_hy * np.cos(phi)
    sin_phi = np.sin(phi)
    cur_rx = head_rx * sin_phi
    cur_rz = head_rz * sin_phi
    ring = []

    for s in range(HEAD_SEGS):
        theta = 2.0 * np.pi * s / HEAD_SEGS
        vx = cur_rx * np.sin(theta)
        # Face faces +Z
        vz = cur_rz * np.cos(theta)

        # Back veil draped slightly backward
        if vz < 0:
            vz *= 1.18
            if y < head_cy:
                # Veil flaring gently down over back of neck/shoulders
                flair = (head_cy - y) / (head_cy - head_y_min)
                vz -= flair * 0.04
                cur_vx = vx * (1.0 + flair * 0.35)
                vx = cur_vx

        v_idx = len(vertices)
        vertices.append([vx, y, vz])
        ring.append(v_idx)

        # UV Mapping for Head:
        # Front faces (Z >= -0.02): map to Region 3 (High-Res Face & Wimple)
        # Rear faces (Z < -0.02): map to Region 4 (Veil Back)
        if vz >= -0.02:
            # Map theta around front: s from -HEAD_SEGS/4 to +HEAD_SEGS/4
            # Normal in [-1, 1]
            u_norm = np.clip((vx / head_rx) * 0.5 + 0.5, 0.05, 0.95)
            v_norm = np.clip((y - head_y_min) / (head_y_max - head_y_min), 0.05, 0.95)
            # Region 3 is X: [50, 750], Y: [50, 750] in atlas (Y inverted)
            px_x = 50 + u_norm * 700
            px_y = 50 + (1.0 - v_norm) * 700
            uvs.append(get_uv(px_x, px_y))
        else:
            u_norm = np.clip((-vx / head_rx) * 0.5 + 0.5, 0.05, 0.95)
            v_norm = np.clip((y - head_y_min) / (head_y_max - head_y_min), 0.05, 0.95)
            # Region 4 is X: [50, 750], Y: [800, 1400]
            px_x = 50 + u_norm * 700
            px_y = 800 + (1.0 - v_norm) * 600
            uvs.append(get_uv(px_x, px_y))

    head_rings_idx.append(ring)

# Connect Head Quads
for r in range(HEAD_RINGS):
    r_curr = head_rings_idx[r]
    r_next = head_rings_idx[r + 1]
    for s in range(HEAD_SEGS):
        s_next = (s + 1) % HEAD_SEGS
        add_quad(r_curr[s], r_curr[s_next], r_next[s], r_next[s_next])

# ---------------------------------------------------------
# B. TORSO & SCAPULAR (Shoulders, Silver Crucifix, Waist)
# ---------------------------------------------------------
# Height: 0.95m (waist) to 1.48m (neck)
TORSO_RINGS = 12
TORSO_SEGS_HALF = 10 # 10 front quads, 10 back quads (Split UV Seams for ZERO seam stretch!)

torso_front_rings = []
torso_back_rings = []

for r in range(TORSO_RINGS + 1):
    t = r / TORSO_RINGS # 0 at bottom (waist 0.95m), 1 at top (neck 1.48m)
    y = 0.95 + t * (1.48 - 0.95)

    # Anatomical widths (NO WINGS, NO OUTLANDISH FINS!)
    if t < 0.35: # Waist / Lower ribs
        rx = 0.145 + t * 0.03
        rz = 0.115 + t * 0.02
    elif t < 0.85: # Chest / Shoulders
        tt = (t - 0.35) / 0.50
        rx = 0.155 + tt * 0.035 # max 0.190m at shoulders (width = 0.38m)
        rz = 0.122 + tt * 0.015 # max 0.137m
    else: # Neck taper
        tt = (t - 0.85) / 0.15
        rx = 0.190 - tt * 0.105 # tapers to 0.085m
        rz = 0.137 - tt * 0.052 # tapers to 0.085m

    # Front Ring (Z >= 0, theta: 0 to pi)
    rf = []
    for k in range(TORSO_SEGS_HALF + 1):
        theta = np.pi * k / TORSO_SEGS_HALF
        vx = rx * np.cos(theta)
        vz = rz * np.sin(theta)

        v_idx = len(vertices)
        vertices.append([vx, y, vz])
        rf.append(v_idx)

        # Front UV: Region 1 (Front Body): X: [800, 1400], Y: [200, 750] for torso
        # Crucifix is located around Y_atlas = 440, X_atlas = 1100 (centered!)
        u_norm = np.clip((vx / 0.20) * 0.45 + 0.50, 0.05, 0.95)
        v_norm = np.clip(t, 0.0, 1.0)
        px_x = 800 + u_norm * 600
        # In atlas, top of torso is at Y=200, waist is at Y=750
        px_y = 200 + (1.0 - v_norm) * 550
        uvs.append(get_uv(px_x, px_y))

    # Back Ring (Z <= 0, theta: pi to 2*pi)
    rb = []
    for k in range(TORSO_SEGS_HALF + 1):
        theta = np.pi + np.pi * k / TORSO_SEGS_HALF
        vx = rx * np.cos(theta)
        vz = rz * np.sin(theta)

        v_idx = len(vertices)
        vertices.append([vx, y, vz])
        rb.append(v_idx)

        # Back UV: Region 2 (Back Body): X: [1440, 2040], Y: [200, 750]
        u_norm = np.clip((-vx / 0.20) * 0.45 + 0.50, 0.05, 0.95)
        v_norm = np.clip(t, 0.0, 1.0)
        px_x = 1440 + u_norm * 600
        px_y = 200 + (1.0 - v_norm) * 550
        uvs.append(get_uv(px_x, px_y))

    torso_front_rings.append(rf)
    torso_back_rings.append(rb)

# Connect Torso Strips
for r in range(TORSO_RINGS):
    rf_c, rf_n = torso_front_rings[r], torso_front_rings[r + 1]
    rb_c, rb_n = torso_back_rings[r], torso_back_rings[r + 1]
    for k in range(TORSO_SEGS_HALF):
        # Front Quads
        add_tri(rf_c[k], rf_n[k], rf_c[k + 1])
        add_tri(rf_c[k + 1], rf_n[k], rf_n[k + 1])
        # Back Quads
        add_tri(rb_c[k], rb_n[k], rb_c[k + 1])
        add_tri(rb_c[k + 1], rb_n[k], rb_n[k + 1])

# ---------------------------------------------------------
# C. BELL HABIT SKIRT (Smooth Flaring Nun Gown to Floor)
# ---------------------------------------------------------
# Height: 0.0m (floor) to 0.95m (waist)
SKIRT_RINGS = 20
SKIRT_SEGS_HALF = 12

skirt_front_rings = []
skirt_back_rings = []

for r in range(SKIRT_RINGS + 1):
    t = r / SKIRT_RINGS # 0 at bottom (floor Y=0.0), 1 at top (waist Y=0.95)
    y = 0.00 + t * 0.95

    # Flare curve: flaring gently near waist and widely near hem
    flare = (1.0 - t) ** 1.18 # 1 at floor, 0 at waist
    rx = 0.145 + flare * 0.235 # waist 0.145m -> hem 0.380m (diameter 0.76m)
    rz = 0.115 + flare * 0.175 # waist 0.115m -> hem 0.290m (depth 0.58m)

    # Front Ring
    rf = []
    for k in range(SKIRT_SEGS_HALF + 1):
        theta = np.pi * k / SKIRT_SEGS_HALF
        # Subtle PS1/PS2 fabric ripple/folds
        fold = 1.0 + 0.018 * np.sin(6 * theta) * flare
        vx = (rx * np.cos(theta)) * fold
        vz = (rz * np.sin(theta)) * fold

        v_idx = len(vertices)
        vertices.append([vx, y, vz])
        rf.append(v_idx)

        # Front Skirt UV: Region 1, Y in [750, 2040]
        u_norm = np.clip((vx / (rx * 1.05)) * 0.46 + 0.50, 0.04, 0.96)
        v_norm = np.clip(t, 0.0, 1.0) # 0 at bottom, 1 at waist
        px_x = 800 + u_norm * 600
        # In atlas, waist is Y=750, hem is Y=2020
        px_y = 750 + (1.0 - v_norm) * 1270
        uvs.append(get_uv(px_x, px_y))

    # Back Ring
    rb = []
    for k in range(SKIRT_SEGS_HALF + 1):
        theta = np.pi + np.pi * k / SKIRT_SEGS_HALF
        fold = 1.0 + 0.018 * np.sin(6 * theta) * flare
        vx = (rx * np.cos(theta)) * fold
        vz = (rz * np.sin(theta)) * fold

        v_idx = len(vertices)
        vertices.append([vx, y, vz])
        rb.append(v_idx)

        # Back Skirt UV: Region 2, Y in [750, 2040]
        u_norm = np.clip((-vx / (rx * 1.05)) * 0.46 + 0.50, 0.04, 0.96)
        v_norm = np.clip(t, 0.0, 1.0)
        px_x = 1440 + u_norm * 600
        px_y = 750 + (1.0 - v_norm) * 1270
        uvs.append(get_uv(px_x, px_y))

    skirt_front_rings.append(rf)
    skirt_back_rings.append(rb)

# Connect Skirt Strips
for r in range(SKIRT_RINGS):
    rf_c, rf_n = skirt_front_rings[r], skirt_front_rings[r + 1]
    rb_c, rb_n = skirt_back_rings[r], skirt_back_rings[r + 1]
    for k in range(SKIRT_SEGS_HALF):
        add_tri(rf_c[k], rf_n[k], rf_c[k + 1])
        add_tri(rf_c[k + 1], rf_n[k], rf_n[k + 1])
        add_tri(rb_c[k], rb_n[k], rb_c[k + 1])
        add_tri(rb_c[k + 1], rb_n[k], rb_n[k + 1])

# ---------------------------------------------------------
# D. MENACING RAISED ARMS & BLOODIED CLAWS (Continuous Tubes)
# ---------------------------------------------------------
# Clean skeletal spline for arms:
# Shoulder -> Bicep -> Elbow -> Forearm -> Wrist -> Claw Hand
def build_clean_arm(is_right=False):
    sign = 1.0 if is_right else -1.0
    
    # 8 Key waypoints along arm centerline (X, Y, Z, radius, is_blood_hand)
    waypoints = [
        # 0: Shoulder attachment
        [sign * 0.175, 1.38, 0.01, 0.052, False],
        # 1: Upper bicep
        [sign * 0.215, 1.28, 0.06, 0.055, False],
        # 2: Elbow
        [sign * 0.255, 1.17, 0.13, 0.065, False], # Flared sleeve at elbow
        # 3: Forearm
        [sign * 0.285, 1.26, 0.19, 0.058, False],
        # 4: Wrist (inner sleeve exit)
        [sign * 0.305, 1.33, 0.24, 0.042, False],
        # 5: Palm
        [sign * 0.320, 1.38, 0.27, 0.038, True],
        # 6: Knuckles
        [sign * 0.330, 1.43, 0.29, 0.032, True],
        # 7: Fingertip Claws
        [sign * 0.335, 1.47, 0.30, 0.015, True]
    ]

    K_ARM_CIRC = 10
    arm_rings = []

    for wp_idx, wp in enumerate(waypoints):
        wx, wy, wz, wr, is_blood = wp

        # Calculate tangent along arm path
        if wp_idx == 0:
            tangent = np.array(waypoints[1][:3]) - np.array(wp[:3])
        elif wp_idx == len(waypoints) - 1:
            tangent = np.array(wp[:3]) - np.array(waypoints[-2][:3])
        else:
            tangent = np.array(waypoints[wp_idx + 1][:3]) - np.array(waypoints[wp_idx - 1][:3])

        tangent = tangent / (np.linalg.norm(tangent) + 1e-6)

        # Coordinate frame orthogonal to tangent
        up = np.array([0, 1, 0])
        normal = np.cross(tangent, up)
        if np.linalg.norm(normal) < 1e-4:
            normal = np.array([1, 0, 0])
        normal = normal / np.linalg.norm(normal)
        binormal = np.cross(tangent, normal)

        ring = []
        t_prog = wp_idx / (len(waypoints) - 1)

        for k in range(K_ARM_CIRC):
            theta = 2.0 * np.pi * k / K_ARM_CIRC
            vx = wx + wr * (np.cos(theta) * normal[0] + np.sin(theta) * binormal[0])
            vy = wy + wr * (np.cos(theta) * normal[1] + np.sin(theta) * binormal[1])
            vz = wz + wr * (np.cos(theta) * normal[2] + np.sin(theta) * binormal[2])

            v_idx = len(vertices)
            vertices.append([vx, vy, vz])
            ring.append(v_idx)

            # Arm UV Mapping:
            # Region 5: Left Hand (X: [50, 400], Y: [1450, 2000]) or Right Hand (X: [420, 770], Y: [1450, 2000])
            u_norm = (np.sin(theta) * 0.5 + 0.5)
            x_base = 420 if is_right else 50

            if is_blood:
                # Map to bloody hand/fingers at bottom of crop
                px_x = x_base + u_norm * 350
                px_y = 1750 + (t_prog - 0.6) / 0.4 * 240
            else:
                # Map to habit sleeve fabric
                px_x = x_base + u_norm * 350
                px_y = 1450 + (t_prog / 0.6) * 300

            uvs.append(get_uv(px_x, px_y))

        arm_rings.append(ring)

    # Connect Arm Rings
    for r in range(len(arm_rings) - 1):
        rc, rn = arm_rings[r], arm_rings[r + 1]
        for k in range(K_ARM_CIRC):
            k_next = (k + 1) % K_ARM_CIRC
            add_quad(rc[k], rc[k_next], rn[k], rn[k_next])

    # Cap fingertip apex smoothly
    tip_wp = waypoints[-1]
    tip_v_idx = len(vertices)
    vertices.append([tip_wp[0], tip_wp[1] + 0.02, tip_wp[2] + 0.01])
    tip_x_base = 420 if is_right else 50
    uvs.append(get_uv(tip_x_base + 175, 1990))

    last_ring = arm_rings[-1]
    for k in range(K_ARM_CIRC):
        k_next = (k + 1) % K_ARM_CIRC
        add_tri(tip_v_idx, last_ring[k], last_ring[k_next])

build_clean_arm(is_right=False) # Left Arm
build_clean_arm(is_right=True)  # Right Arm

# ---------------------------------------------------------
# E. SHOES (Dark Nun Shoes on Floor Y=0)
# ---------------------------------------------------------
for shoe_x in [-0.09, 0.09]:
    shoe_rings = []
    for s_step, s_y in enumerate([0.00, 0.04, 0.07]):
        sr = 0.042 - s_step * 0.005
        ring = []
        for k in range(8):
            theta = 2.0 * np.pi * k / 8
            vx = shoe_x + sr * np.sin(theta)
            vy = s_y
            vz = 0.03 + (sr * 1.5) * np.cos(theta)

            v_idx = len(vertices)
            vertices.append([vx, vy, vz])
            ring.append(v_idx)
            # Sample dark habit base
            uvs.append(get_uv(100, 100))
        shoe_rings.append(ring)

    for r in range(len(shoe_rings) - 1):
        sc, sn = shoe_rings[r], shoe_rings[r + 1]
        for k in range(8):
            k_next = (k + 1) % 8
            add_quad(sc[k], sc[k_next], sn[k], sn[k_next])

vertices = np.array(vertices, dtype=np.float32)
uvs = np.array(uvs, dtype=np.float32)
faces = np.array(faces, dtype=np.int32)

print(f"Total Mesh: {len(vertices)} vertices, {len(faces)} faces.")

# 5. Export PBR GLTF / GLB
mat = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.88,
    metallicFactor=0.05
)
visual = trimesh.visual.texture.TextureVisuals(uv=uvs, material=mat)
mesh = trimesh.Trimesh(vertices=vertices, faces=faces, visual=visual, process=False)

glb_bytes = trimesh.exchange.gltf.export_glb(mesh)
print(f"Exported GLB binary size: {len(glb_bytes):,} bytes ({len(glb_bytes)/1024:.1f} KB)")

output_paths = [
    'public/models/sister_valentina.glb',
    'dist/models/sister_valentina.glb',
    'sister_valentina.glb'
]

for out_p in output_paths:
    os.makedirs(os.path.dirname(os.path.abspath(out_p)), exist_ok=True)
    with open(out_p, 'wb') as f:
        f.write(glb_bytes)
    print(f"Saved: {out_p}")

print("=== RECONSTRUCTION COMPLETED SUCCESSFULLY! ===")
