import numpy as np
from PIL import Image
import trimesh
import os

print("=== BUILDING RETRO LOW-POLY UNDEAD NUN V4 (MATCHING ASSET EXACTLY) ===")

# 1. Load 2048x2048 Atlas Texture
atlas_path = 'public/textures/sister_valentina_atlas.png'
if not os.path.exists(atlas_path):
    raise FileNotFoundError(f"Atlas not found at {atlas_path}")

atlas_pil = Image.open(atlas_path)

# Materials
mat_atlas = trimesh.visual.material.PBRMaterial(
    baseColorTexture=atlas_pil,
    roughnessFactor=0.82,
    metallicFactor=0.04
)

mat_silver = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.92, 0.94, 0.98, 1.0],
    roughnessFactor=0.18,
    metallicFactor=0.95
)

mat_shadow = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.05, 0.05, 0.06, 1.0],
    roughnessFactor=0.95,
    metallicFactor=0.0
)

# Helper function for front projection UVs:
# In atlas: nun image occupies X: 0..1024, Y: 0..1536 (from top)
# X_world = (X_img - 512) / 767.7  =>  X_img = X_world * 767.7 + 512
# Y_world = (1513 - Y_img) / 767.7 =>  Y_img = 1513 - Y_world * 767.7
# U = X_img / 2048.0 = 0.25 + X_world * (767.7 / 2048.0) = 0.25 + X_world * 0.3748535
# V = 1.0 - (Y_img / 2048.0) = (2048 - 1513 + Y_world * 767.7) / 2048.0 = 0.261230 + Y_world * 0.3748535
SCALE_UV = 767.7 / 2048.0 # 0.3748535
U_OFFSET = 512.0 / 2048.0 # 0.2500000
V_OFFSET = (2048.0 - 1513.0) / 2048.0 # 0.2612305

def get_front_uv(x, y):
    u = U_OFFSET + x * SCALE_UV
    v = V_OFFSET + y * SCALE_UV
    return [np.clip(u, 0.005, 0.495), np.clip(v, 0.005, 0.995)]

def get_back_habit_uv(theta, t):
    # Map to top-right habit texture quadrant: U in [0.55, 0.95], V in [0.55, 0.95]
    u = 0.55 + 0.40 * (theta / np.pi)
    v = 0.55 + 0.40 * t
    return [u, v]

def get_back_veil_uv(theta, t):
    # Map to bottom-right veil texture quadrant: U in [0.55, 0.95], V in [0.05, 0.45]
    u = 0.55 + 0.40 * (theta / np.pi)
    v = 0.05 + 0.40 * t
    return [u, v]

all_meshes = []

# ==========================================
# 2. SKIRT (16-sided Tapered Bell Gown)
# ==========================================
# Ground Y=0.0 up to Waist Y=1.10
SEGS = 16
N_RINGS = 10
skirt_y_min = 0.0
skirt_y_max = 1.10
r_hem_x = 0.425
r_hem_z = 0.330
r_waist_x = 0.180
r_waist_z = 0.140

skirt_verts = []
skirt_uvs = []
skirt_faces = []

for ri in range(N_RINGS + 1):
    t = ri / N_RINGS # 0 at hem, 1 at waist
    y = skirt_y_min + t * (skirt_y_max - skirt_y_min)
    flare = (1.0 - t) ** 1.15
    cur_rx = r_waist_x + flare * (r_hem_x - r_waist_x)
    cur_rz = r_waist_z + flare * (r_hem_z - r_waist_z)

    for si in range(SEGS):
        # Angle from -pi to +pi, 0 is front (+Z)
        theta = -np.pi + 2.0 * np.pi * (si / SEGS)
        vx = cur_rx * np.sin(theta)
        vz = cur_rz * np.cos(theta)
        skirt_verts.append([vx, y, vz])

        # UV assignment: front half gets front projection, back half gets dark habit
        if vz >= -0.02:
            uv = get_front_uv(vx, y)
        else:
            angle_back = np.abs(theta) - (np.pi / 2.0)
            uv = get_back_habit_uv(angle_back, t)
        skirt_uvs.append(uv)

for ri in range(N_RINGS):
    for si in range(SEGS):
        c0 = ri * SEGS + si
        c1 = ri * SEGS + (si + 1) % SEGS
        n0 = (ri + 1) * SEGS + si
        n1 = (ri + 1) * SEGS + (si + 1) % SEGS
        skirt_faces.append([c0, n0, c1])
        skirt_faces.append([c1, n0, n1])

skirt_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(skirt_uvs), material=mat_atlas)
skirt_mesh = trimesh.Trimesh(vertices=np.array(skirt_verts), faces=np.array(skirt_faces), visual=skirt_vis, process=False)
skirt_mesh.name = 'habit_skirt'
all_meshes.append(skirt_mesh)

# ==========================================
# 3. TORSO BODICE (Waist to Shoulders)
# ==========================================
# Y=1.10 to Y=1.46
N_TORSO = 6
torso_y_min = 1.10
torso_y_max = 1.46
torso_verts = []
torso_uvs = []
torso_faces = []

for ri in range(N_TORSO + 1):
    t = ri / N_TORSO
    y = torso_y_min + t * (torso_y_max - torso_y_min)
    cur_rx = r_waist_x + t * 0.04
    cur_rz = r_waist_z + t * 0.02

    for si in range(SEGS):
        theta = -np.pi + 2.0 * np.pi * (si / SEGS)
        vx = cur_rx * np.sin(theta)
        vz = cur_rz * np.cos(theta)
        torso_verts.append([vx, y, vz])

        if vz >= -0.01:
            uv = get_front_uv(vx, y)
        else:
            angle_back = np.abs(theta) - (np.pi / 2.0)
            uv = get_back_habit_uv(angle_back, t)
        torso_uvs.append(uv)

for ri in range(N_TORSO):
    for si in range(SEGS):
        c0 = ri * SEGS + si
        c1 = ri * SEGS + (si + 1) % SEGS
        n0 = (ri + 1) * SEGS + si
        n1 = (ri + 1) * SEGS + (si + 1) % SEGS
        torso_faces.append([c0, n0, c1])
        torso_faces.append([c1, n0, n1])

torso_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(torso_uvs), material=mat_atlas)
torso_mesh = trimesh.Trimesh(vertices=np.array(torso_verts), faces=np.array(torso_faces), visual=torso_vis, process=False)
torso_mesh.name = 'habit_torso'
all_meshes.append(torso_mesh)

# ==========================================
# 4. SCAPULAR CAPELET / COWL (Shoulder Draping)
# ==========================================
# Sits over torso from Y=1.24 to Y=1.48
N_COWL = 4
cowl_y_min = 1.24
cowl_y_max = 1.48
cowl_verts = []
cowl_uvs = []
cowl_faces = []

for ri in range(N_COWL + 1):
    t = ri / N_COWL
    y = cowl_y_min + t * (cowl_y_max - cowl_y_min)
    cur_rx = 0.26 - t * 0.06
    cur_rz = 0.20 - t * 0.04

    for si in range(SEGS):
        theta = -np.pi + 2.0 * np.pi * (si / SEGS)
        vx = cur_rx * np.sin(theta)
        vz = cur_rz * np.cos(theta)
        cowl_verts.append([vx, y, vz])

        if vz >= 0.0:
            uv = get_front_uv(vx, y)
        else:
            angle_back = np.abs(theta) - (np.pi / 2.0)
            uv = get_back_veil_uv(angle_back, t)
        cowl_uvs.append(uv)

for ri in range(N_COWL):
    for si in range(SEGS):
        c0 = ri * SEGS + si
        c1 = ri * SEGS + (si + 1) % SEGS
        n0 = (ri + 1) * SEGS + si
        n1 = (ri + 1) * SEGS + (si + 1) % SEGS
        cowl_faces.append([c0, n0, c1])
        cowl_faces.append([c1, n0, n1])

cowl_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(cowl_uvs), material=mat_atlas)
cowl_mesh = trimesh.Trimesh(vertices=np.array(cowl_verts), faces=np.array(cowl_faces), visual=cowl_vis, process=False)
cowl_mesh.name = 'scapular_cowl'
all_meshes.append(cowl_mesh)

# ==========================================
# 5. HEAD & HOOD (VEIL WITH CONTOURED FACE)
# ==========================================
# Low-poly hooded head:
# Neck from Y=1.46 to 1.56
neck = trimesh.creation.cylinder(radius=0.075, height=0.10, sections=12)
neck.apply_translation([0, 1.51, 0.02])
neck_uvs = [get_front_uv(v[0], v[1]) for v in neck.vertices]
neck.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(neck_uvs), material=mat_atlas)
neck.name = 'neck'
all_meshes.append(neck)

# 3D Hood & Face
# Modeled as a contoured dome with an arched front rim framing the face
N_HOOD_RINGS = 5
hood_verts = []
hood_uvs = []
hood_faces = []

# Ring heights from chin (1.56) to crest peak (1.95)
ring_params = [
    # (y, rx, rz, z_center)
    (1.56, 0.09, 0.11, -0.01),  # chin / throat
    (1.65, 0.11, 0.13, -0.01),  # mouth / jaw
    (1.75, 0.12, 0.14, -0.02),  # eyes / temples
    (1.85, 0.11, 0.13, -0.03),  # forehead
    (1.92, 0.07, 0.09, -0.03),  # crown / veil peak
    (1.95, 0.01, 0.02, -0.03),  # apex
]

for ri, (y, rx, rz, zc) in enumerate(ring_params):
    t = ri / (len(ring_params) - 1)
    for si in range(SEGS):
        theta = -np.pi + 2.0 * np.pi * (si / SEGS)
        vx = rx * np.sin(theta)
        vz = zc + rz * np.cos(theta)
        hood_verts.append([vx, y, vz])

        # Front gets face from image, sides and back get veil
        if vz >= zc - 0.02:
            uv = get_front_uv(vx, y)
        else:
            angle_back = np.abs(theta) - (np.pi / 2.0)
            uv = get_back_veil_uv(angle_back, t)
        hood_uvs.append(uv)

for ri in range(len(ring_params) - 1):
    for si in range(SEGS):
        c0 = ri * SEGS + si
        c1 = ri * SEGS + (si + 1) % SEGS
        n0 = (ri + 1) * SEGS + si
        n1 = (ri + 1) * SEGS + (si + 1) % SEGS
        hood_faces.append([c0, n0, c1])
        hood_faces.append([c1, n0, n1])

hood_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(hood_uvs), material=mat_atlas)
hood_mesh = trimesh.Trimesh(vertices=np.array(hood_verts), faces=np.array(hood_faces), visual=hood_vis, process=False)
hood_mesh.name = 'hood_head'
all_meshes.append(hood_mesh)

# Flowing veil drape down back of head/shoulders
veil_drape = trimesh.creation.box(extents=[0.32, 0.52, 0.03])
veil_rot = trimesh.transformations.rotation_matrix(np.radians(-8), [1, 0, 0])
veil_drape.apply_transform(veil_rot)
veil_drape.apply_translation([0, 1.62, -0.15])
v_uvs = []
for v in veil_drape.vertices:
    v_uvs.append(get_back_veil_uv(v[0] + 0.16, (v[1] - 1.36) / 0.52))
veil_drape.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(v_uvs), material=mat_atlas)
veil_drape.name = 'veil_drape'
all_meshes.append(veil_drape)

# ==========================================
# 6. BELL SLEEVES (Wide Flared Nun Sleeves)
# ==========================================
def build_bell_sleeve(side):
    # side: +1 for character left (viewer right), -1 for character right (viewer left)
    # Shoulder start: X = side * 0.22, Y = 1.44, Z = 0.02
    # Elbow midpoint: X = side * 0.33, Y = 1.25, Z = 0.05
    # Bell cuff end:  X = side * 0.35, Y = 1.06, Z = 0.07
    p0 = np.array([side * 0.22, 1.44, 0.02])
    p1 = np.array([side * 0.33, 1.26, 0.05])
    p2 = np.array([side * 0.35, 1.08, 0.07])

    sleeve_verts = []
    sleeve_uvs = []
    sleeve_faces = []
    
    SUB_SEGS = 12
    ring_pts = [
        (p0, 0.075, 0.0),
        (p1, 0.100, 0.5),
        (p2, 0.135, 1.0) # wide flared bell opening
    ]

    for ri, (center, radius, t) in enumerate(ring_pts):
        for si in range(SUB_SEGS):
            ang = 2.0 * np.pi * si / SUB_SEGS
            vx = center[0] + radius * np.cos(ang)
            vy = center[1] - radius * 0.25 * np.sin(ang)
            vz = center[2] + radius * np.sin(ang)
            sleeve_verts.append([vx, vy, vz])

            # UV projection
            if vz >= center[2] - 0.02:
                uv = get_front_uv(vx, vy)
            else:
                uv = get_back_habit_uv(ang / 2.0, t)
            sleeve_uvs.append(uv)

    for ri in range(len(ring_pts) - 1):
        for si in range(SUB_SEGS):
            c0 = ri * SUB_SEGS + si
            c1 = ri * SUB_SEGS + (si + 1) % SUB_SEGS
            n0 = (ri + 1) * SUB_SEGS + si
            n1 = (ri + 1) * SUB_SEGS + (si + 1) % SUB_SEGS
            sleeve_faces.append([c0, n0, c1])
            sleeve_faces.append([c1, n0, n1])

    vis = trimesh.visual.texture.TextureVisuals(uv=np.array(sleeve_uvs), material=mat_atlas)
    mesh = trimesh.Trimesh(vertices=np.array(sleeve_verts), faces=np.array(sleeve_faces), visual=vis, process=False)
    mesh.name = f'sleeve_{"r" if side > 0 else "l"}'
    
    # Inner dark shadow disc inside bell cuff
    inner_disc = trimesh.creation.cylinder(radius=0.12, height=0.02, sections=12)
    inner_disc.apply_translation([side * 0.35, 1.10, 0.07])
    inner_disc.visual.material = mat_shadow
    inner_disc.name = f'sleeve_inner_{"r" if side > 0 else "l"}'
    
    return [mesh, inner_disc]

for side in [-1, 1]:
    all_meshes.extend(build_bell_sleeve(side))

# ==========================================
# 7. FOREARMS & CLAW HANDS (Occult Raised Pose)
# ==========================================
# In the asset:
# Forearms emerge from inside the bell sleeves (Y~1.12), angle OUT and UP at ~50 degrees
# Wrist reaches X = side * 0.48, Y = 1.34, Z = 0.12
# Palm reaches  X = side * 0.52, Y = 1.44, Z = 0.14
# Slender claw fingers extend up to Y = 1.62 .. 1.66!
def build_arm_and_claws(side):
    meshes = []
    
    # 1. Forearm cylinder (slender undead arm)
    p_start = np.array([side * 0.35, 1.12, 0.07])
    p_wrist = np.array([side * 0.47, 1.35, 0.12])
    
    vec = p_wrist - p_start
    length = np.linalg.norm(vec)
    direction = vec / length
    mid = (p_start + p_wrist) / 2.0
    
    forearm = trimesh.creation.cylinder(radius=0.032, height=length, sections=10)
    # Align cylinder to direction
    up = np.array([0, 0, 1])
    rot = trimesh.geometry.align_vectors(up, direction)
    forearm.apply_transform(rot)
    forearm.apply_translation(mid)
    
    f_uvs = [get_front_uv(v[0], v[1]) for v in forearm.vertices]
    forearm.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(f_uvs), material=mat_atlas)
    forearm.name = f'forearm_{"r" if side > 0 else "l"}'
    meshes.append(forearm)
    
    # 2. Palm
    p_palm = np.array([side * 0.51, 1.44, 0.14])
    palm = trimesh.creation.box(extents=[0.055, 0.08, 0.022])
    # Slight tilt
    palm_rot = trimesh.transformations.rotation_matrix(np.radians(side * 15), [0, 0, 1])
    palm.apply_transform(palm_rot)
    palm.apply_translation(p_palm)
    p_uvs = [get_front_uv(v[0], v[1]) for v in palm.vertices]
    palm.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(p_uvs), material=mat_atlas)
    palm.name = f'palm_{"r" if side > 0 else "l"}'
    meshes.append(palm)
    
    # 3. Four Claw Fingers (splayed upwards and curled menacingly)
    # Targets matching asset finger tips:
    finger_targets = [
        # (tip_x, tip_y, tip_z, radius)
        (side * 0.46, 1.62, 0.16, 0.0075),  # Thumb / inner claw
        (side * 0.50, 1.65, 0.15, 0.0070),  # Index claw (highest)
        (side * 0.54, 1.63, 0.14, 0.0068),  # Middle claw
        (side * 0.58, 1.57, 0.13, 0.0065),  # Pinky claw (curled out)
    ]
    
    palm_base = np.array([side * 0.51, 1.47, 0.14])
    for fi, (tx, ty, tz, rad) in enumerate(finger_targets):
        tip = np.array([tx, ty, tz])
        f_vec = tip - palm_base
        f_len = np.linalg.norm(f_vec)
        f_dir = f_vec / f_len
        f_mid = (palm_base + tip) / 2.0
        
        claw = trimesh.creation.cylinder(radius=rad, height=f_len, sections=6)
        c_rot = trimesh.geometry.align_vectors(up, f_dir)
        claw.apply_transform(c_rot)
        claw.apply_translation(f_mid)
        
        c_uvs = [get_front_uv(v[0], v[1]) for v in claw.vertices]
        claw.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(c_uvs), material=mat_atlas)
        claw.name = f'claw_{fi}_{"r" if side > 0 else "l"}'
        meshes.append(claw)
        
    return meshes

for side in [-1, 1]:
    all_meshes.extend(build_arm_and_claws(side))

# ==========================================
# 8. CRUCIFIX (3D Silver Latin Cross on Chest)
# ==========================================
cross_v = trimesh.creation.box(extents=[0.022, 0.18, 0.015])
cross_v.apply_translation([0, 1.31, 0.17])
cross_v.visual.material = mat_silver
cross_v.name = 'crucifix_v'
all_meshes.append(cross_v)

cross_h = trimesh.creation.box(extents=[0.11, 0.022, 0.015])
cross_h.apply_translation([0, 1.35, 0.17])
cross_h.visual.material = mat_silver
cross_h.name = 'crucifix_h'
all_meshes.append(cross_h)

# ==========================================
# 9. NUN SHOES (Under Hem at Y=0)
# ==========================================
for side in [-1, 1]:
    boot = trimesh.creation.box(extents=[0.08, 0.05, 0.16])
    boot.apply_translation([side * 0.09, 0.025, 0.02])
    boot.visual.material = mat_shadow
    boot.name = f'boot_{"r" if side > 0 else "l"}'
    all_meshes.append(boot)

print(f"Total sub-meshes constructed: {len(all_meshes)}")

# ==========================================
# 10. EXPORT GLB
# ==========================================
scene = trimesh.Scene(all_meshes)
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

print("=== RECONSTRUCTION COMPLETE! ===")
