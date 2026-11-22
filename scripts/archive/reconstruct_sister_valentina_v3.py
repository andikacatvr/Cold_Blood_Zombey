import cv2
import numpy as np
from PIL import Image
import trimesh
import os

print("=== RECONSTRUCTING SISTER VALENTINA V3 (FLAWLESS 3D HIERARCHY, REAL MATERIALS) ===")

# 1. Prepare Materials
face_pil = Image.open('public/textures/sister_valentina_face.png')
habit_pil = Image.open('public/textures/sister_valentina_habit.png')

mat_habit = trimesh.visual.material.PBRMaterial(
    baseColorTexture=habit_pil,
    roughnessFactor=0.88,
    metallicFactor=0.04
)
mat_face = trimesh.visual.material.PBRMaterial(
    baseColorTexture=face_pil,
    roughnessFactor=0.72,
    metallicFactor=0.02
)
mat_silver = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.92, 0.94, 0.98, 1.0],
    roughnessFactor=0.18,
    metallicFactor=0.95
)
mat_blood = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.58, 0.04, 0.07, 1.0],
    roughnessFactor=0.28,
    metallicFactor=0.15
)
mat_skin = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.78, 0.79, 0.77, 1.0],
    roughnessFactor=0.78,
    metallicFactor=0.02
)
mat_veil = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.10, 0.10, 0.12, 1.0],
    roughnessFactor=0.92,
    metallicFactor=0.02
)

all_meshes = []

# 2. Bell Habit Skirt (Cylindrical UVs, 16-sided, smooth drape)
SEGS = 16
skirt_y_min = 0.0
skirt_y_max = 0.95
r_bot = 0.44
r_top = 0.20

skirt_verts = []
skirt_uvs = []
skirt_faces = []

# 2 rings: bottom and top (or 6 rings for smooth drape)
N_RINGS = 8
for ri in range(N_RINGS + 1):
    t = ri / N_RINGS # 0 at bottom, 1 at top
    y = skirt_y_min + t * (skirt_y_max - skirt_y_min)
    flare = (1.0 - t) ** 1.15
    cur_rx = r_top + flare * (r_bot - r_top)
    cur_rz = cur_rx * 0.85

    for si in range(SEGS):
        theta = 2.0 * np.pi * si / SEGS
        # Add subtle fabric wave
        wave = 1.0 + 0.018 * np.sin(6 * theta) * flare
        vx = cur_rx * np.sin(theta) * wave
        vz = cur_rz * np.cos(theta) * wave

        skirt_verts.append([vx, y, vz])
        u = si / SEGS
        v = t
        skirt_uvs.append([u, v])

for ri in range(N_RINGS):
    for si in range(SEGS):
        c0 = ri * SEGS + si
        c1 = ri * SEGS + (si + 1) % SEGS
        n0 = (ri + 1) * SEGS + si
        n1 = (ri + 1) * SEGS + (si + 1) % SEGS
        skirt_faces.append([c0, n0, c1])
        skirt_faces.append([c1, n0, n1])

skirt_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(skirt_uvs), material=mat_habit)
skirt_mesh = trimesh.Trimesh(vertices=np.array(skirt_verts), faces=np.array(skirt_faces), visual=skirt_vis, process=False)
skirt_mesh.name = 'habit_dress'
all_meshes.append(skirt_mesh)

# 3. Torso Body
torso_verts = []
torso_uvs = []
torso_faces = []

torso_y_min = 0.95
torso_y_max = 1.45
N_TORSO = 6

for ri in range(N_TORSO + 1):
    t = ri / N_TORSO
    y = torso_y_min + t * (torso_y_max - torso_y_min)
    if t < 0.4:
        cur_rx = 0.16 + t * 0.04
        cur_rz = 0.12 + t * 0.02
    else:
        cur_rx = 0.18 + (t - 0.4) * 0.03
        cur_rz = 0.13 + (t - 0.4) * 0.01

    for si in range(SEGS):
        theta = 2.0 * np.pi * si / SEGS
        vx = cur_rx * np.sin(theta)
        vz = cur_rz * np.cos(theta)

        torso_verts.append([vx, y, vz])
        u = si / SEGS
        v = t * 0.45 + 0.55
        torso_uvs.append([u, v])

for ri in range(N_TORSO):
    for si in range(SEGS):
        c0 = ri * SEGS + si
        c1 = ri * SEGS + (si + 1) % SEGS
        n0 = (ri + 1) * SEGS + si
        n1 = (ri + 1) * SEGS + (si + 1) % SEGS
        torso_faces.append([c0, n0, c1])
        torso_faces.append([c1, n0, n1])

torso_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(torso_uvs), material=mat_habit)
torso_mesh = trimesh.Trimesh(vertices=np.array(torso_verts), faces=np.array(torso_faces), visual=torso_vis, process=False)
torso_mesh.name = 'torso'
all_meshes.append(torso_mesh)

# 4. Scapular Mantle (Draped Cowl over shoulders)
mantle_geo = trimesh.creation.cylinder(radius=0.23, height=0.26, sections=16)
# Taper top
v = mantle_geo.vertices
mask_top = v[:, 1] > 0
v[mask_top, 0] *= 0.78
v[mask_top, 2] *= 0.78
mantle_geo.apply_translation([0, 1.35, 0])
mantle_geo.visual.material = mat_habit
mantle_geo.name = 'scapular_mantle'
all_meshes.append(mantle_geo)

# 5. Silver Crucifix (Solid 3D Silver Latin Cross on Chest)
cross_v = trimesh.creation.box(extents=[0.026, 0.22, 0.016])
cross_v.apply_translation([0, 1.25, 0.155])
cross_v.visual.material = mat_silver
cross_v.name = 'crucifix_v'
all_meshes.append(cross_v)

cross_h = trimesh.creation.box(extents=[0.15, 0.026, 0.016])
cross_h.apply_translation([0, 1.30, 0.155])
cross_h.visual.material = mat_silver
cross_h.name = 'crucifix_h'
all_meshes.append(cross_h)

# 6. Head, Face & Veil
# Neck
neck_mesh = trimesh.creation.cylinder(radius=0.075, height=0.10, sections=12)
neck_mesh.apply_translation([0, 1.47, 0.01])
neck_mesh.visual.material = mat_skin
neck_mesh.name = 'neck'
all_meshes.append(neck_mesh)

# Cranium & Veil Cap
cranium = trimesh.creation.box(extents=[0.25, 0.30, 0.25])
cranium.apply_translation([0, 1.66, 0.0])
cranium.visual.material = mat_veil
cranium.name = 'veil_cap'
all_meshes.append(cranium)

# Crying Bleeding Face (Quad with Face Texture)
face_w = 0.22
face_h = 0.26
face_y_mid = 1.65
face_z = 0.128

face_v = [
    [-face_w/2, face_y_mid - face_h/2, face_z],
    [ face_w/2, face_y_mid - face_h/2, face_z],
    [ face_w/2, face_y_mid + face_h/2, face_z],
    [-face_w/2, face_y_mid + face_h/2, face_z]
]
face_uvs = [
    [0.0, 0.0],
    [1.0, 0.0],
    [1.0, 1.0],
    [0.0, 1.0]
]
face_f = [[0, 1, 2], [0, 2, 3]]
face_vis = trimesh.visual.texture.TextureVisuals(uv=np.array(face_uvs), material=mat_face)
face_mesh = trimesh.Trimesh(vertices=np.array(face_v), faces=np.array(face_f), visual=face_vis, process=False)
face_mesh.name = 'bleeding_face'
all_meshes.append(face_mesh)

# Draped Hanging Veil (Flowing down back of shoulders)
veil_hang = trimesh.creation.box(extents=[0.34, 0.52, 0.04])
# Rotate back 10 degrees
rot_mat = trimesh.transformations.rotation_matrix(np.radians(-10), [1, 0, 0])
veil_hang.apply_transform(rot_mat)
veil_hang.apply_translation([0, 1.48, -0.14])
veil_hang.visual.material = mat_veil
veil_hang.name = 'veil_drape'
all_meshes.append(veil_hang)

# 7. Helper: Construct a Cylinder along two 3D points
def create_cylinder_between(p1, p2, radius, mat, name):
    p1 = np.array(p1, dtype=float)
    p2 = np.array(p2, dtype=float)
    vec = p2 - p1
    length = np.linalg.norm(vec)
    if length < 1e-5:
        return None
    direction = vec / length
    mid = (p1 + p2) / 2.0

    cyl = trimesh.creation.cylinder(radius=radius, height=length, sections=12)
    # Default cylinder is along Z axis in trimesh.creation.cylinder
    # Rotate from [0, 0, 1] to direction
    z_axis = np.array([0, 0, 1])
    rot = trimesh.geometry.align_vectors(z_axis, direction)
    cyl.apply_transform(rot)
    cyl.apply_translation(mid)
    cyl.visual.material = mat
    cyl.name = name
    return cyl

# 8. Left and Right Menacing Arms & Bloodied Claws
for is_right in [False, True]:
    sign = 1.0 if is_right else -1.0
    side = 'r' if is_right else 'l'

    p_shoulder = [sign * 0.19, 1.40, 0.01]
    p_elbow = [sign * 0.28, 1.20, 0.12]
    p_wrist = [sign * 0.32, 1.34, 0.24]
    p_palm = [sign * 0.33, 1.39, 0.27]

    # Upper Arm (Black Habit Sleeve)
    upper = create_cylinder_between(p_shoulder, p_elbow, 0.062, mat_habit, f'{side}_upper_arm')
    if upper: all_meshes.append(upper)

    # Flared Bell Sleeve Cuff at Elbow
    cuff = trimesh.creation.cylinder(radius=0.082, height=0.06, sections=12)
    cuff.apply_translation(p_elbow)
    cuff.visual.material = mat_habit
    cuff.name = f'{side}_sleeve_cuff'
    all_meshes.append(cuff)

    # Forearm (Pale Flesh)
    forearm = create_cylinder_between(p_elbow, p_wrist, 0.044, mat_skin, f'{side}_forearm')
    if forearm: all_meshes.append(forearm)

    # Palm (Pale Flesh & Blood Base)
    palm = trimesh.creation.box(extents=[0.065, 0.055, 0.028])
    palm.apply_translation(p_palm)
    palm.visual.material = mat_skin
    palm.name = f'{side}_palm'
    all_meshes.append(palm)

    # 3 Menacing Claw Fingers (Drenched in Dark Crimson Blood)
    claw_offsets = [-0.022, 0.0, 0.022]
    for c_idx, c_off in enumerate(claw_offsets):
        cp_start = [p_palm[0] + c_off, p_palm[1] + 0.02, p_palm[2] + 0.01]
        cp_tip = [p_palm[0] + c_off * 1.3, p_palm[1] + 0.09, p_palm[2] + 0.06 + (0.01 if c_idx==1 else 0)]
        claw = create_cylinder_between(cp_start, cp_tip, 0.015, mat_blood, f'{side}_claw_{c_idx}')
        if claw: all_meshes.append(claw)

# 9. Black Nun Shoes under Skirt
for s_x in [-0.10, 0.10]:
    shoe = trimesh.creation.box(extents=[0.085, 0.05, 0.17])
    shoe.apply_translation([s_x, 0.025, 0.04])
    shoe.visual.material = mat_veil
    shoe.name = 'shoe'
    all_meshes.append(shoe)

# 10. Combine into Unified Multi-Material GLTF Scene & Export
scene = trimesh.Scene(all_meshes)

glb_bytes = trimesh.exchange.gltf.export_glb(scene)
print(f"Exported Sister Valentina V3 GLB binary size: {len(glb_bytes):,} bytes ({len(glb_bytes)/1024:.1f} KB)")

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

print("=== SISTER VALENTINA V3 EXPORTED SUCCESSFULLY! ===")
