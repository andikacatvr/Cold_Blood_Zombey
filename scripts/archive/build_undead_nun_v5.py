import numpy as np
from PIL import Image
import trimesh
import os

print("=== REBUILDING UNDEAD NUN V5 (SEAMLESS NECK, ENHANCED FACE & SHADOWS) ===")

# 1. Materials
front_pil = Image.open('public/textures/sister_valentina_front.png')
habit_pil = Image.open('public/textures/sister_valentina_habit.png')

mat_front = trimesh.visual.material.PBRMaterial(
    baseColorTexture=front_pil,
    roughnessFactor=0.82,
    metallicFactor=0.02
)

mat_back = trimesh.visual.material.PBRMaterial(
    baseColorTexture=habit_pil,
    roughnessFactor=0.88,
    metallicFactor=0.04
)

mat_silver = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.96, 0.97, 1.0, 1.0],
    roughnessFactor=0.15,
    metallicFactor=0.96
)

mat_dark = trimesh.visual.material.PBRMaterial(
    baseColorFactor=[0.08, 0.08, 0.10, 1.0],
    roughnessFactor=0.92,
    metallicFactor=0.02
)

def get_front_uv(x, y):
    u = 0.5 + x * (767.7 / 1024.0)
    v = (23.0 + y * 767.7) / 1536.0
    return [np.clip(u, 0.002, 0.998), np.clip(v, 0.002, 0.998)]

all_meshes = []

# ===================================================
# 2. SKIRT (SEPARATE FRONT & REAR HALF-CYLINDERS)
# ===================================================
N_SKIRT_RINGS = 10
SEGS_HALF = 8

skirt_y_min = 0.0
skirt_y_max = 1.10
r_hem_x = 0.425
r_hem_z = 0.330
r_waist_x = 0.180
r_waist_z = 0.140

# --- FRONT SKIRT ---
f_verts, f_uvs, f_faces = [], [], []
for ri in range(N_SKIRT_RINGS + 1):
    t = ri / N_SKIRT_RINGS
    y = skirt_y_min + t * (skirt_y_max - skirt_y_min)
    flare = (1.0 - t) ** 1.15
    cur_rx = r_waist_x + flare * (r_hem_x - r_waist_x)
    cur_rz = r_waist_z + flare * (r_hem_z - r_waist_z)

    for si in range(SEGS_HALF + 1):
        phi = -np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = cur_rx * np.sin(phi)
        vz = cur_rz * np.cos(phi)
        f_verts.append([vx, y, vz])
        f_uvs.append(get_front_uv(vx, y))

for ri in range(N_SKIRT_RINGS):
    for si in range(SEGS_HALF):
        c0 = ri * (SEGS_HALF + 1) + si
        c1 = ri * (SEGS_HALF + 1) + (si + 1)
        n0 = (ri + 1) * (SEGS_HALF + 1) + si
        n1 = (ri + 1) * (SEGS_HALF + 1) + (si + 1)
        f_faces.append([c0, c1, n0])
        f_faces.append([c1, n1, n0])

vis_sf = trimesh.visual.texture.TextureVisuals(uv=np.array(f_uvs), material=mat_front)
mesh_sf = trimesh.Trimesh(vertices=np.array(f_verts), faces=np.array(f_faces), visual=vis_sf, process=False)
mesh_sf.name = 'skirt_front'
all_meshes.append(mesh_sf)

# --- REAR SKIRT ---
b_verts, b_uvs, b_faces = [], [], []
for ri in range(N_SKIRT_RINGS + 1):
    t = ri / N_SKIRT_RINGS
    y = skirt_y_min + t * (skirt_y_max - skirt_y_min)
    flare = (1.0 - t) ** 1.15
    cur_rx = r_waist_x + flare * (r_hem_x - r_waist_x)
    cur_rz = r_waist_z + flare * (r_hem_z - r_waist_z)

    for si in range(SEGS_HALF + 1):
        phi = np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = cur_rx * np.sin(phi)
        vz = cur_rz * np.cos(phi)
        b_verts.append([vx, y, vz])
        b_uvs.append([si / SEGS_HALF, t])

for ri in range(N_SKIRT_RINGS):
    for si in range(SEGS_HALF):
        c0 = ri * (SEGS_HALF + 1) + si
        c1 = ri * (SEGS_HALF + 1) + (si + 1)
        n0 = (ri + 1) * (SEGS_HALF + 1) + si
        n1 = (ri + 1) * (SEGS_HALF + 1) + (si + 1)
        b_faces.append([c0, c1, n0])
        b_faces.append([c1, n1, n0])

vis_sb = trimesh.visual.texture.TextureVisuals(uv=np.array(b_uvs), material=mat_back)
mesh_sb = trimesh.Trimesh(vertices=np.array(b_verts), faces=np.array(b_faces), visual=vis_sb, process=False)
mesh_sb.name = 'skirt_back'
all_meshes.append(mesh_sb)

# ===================================================
# 3. TORSO BODICE (FRONT & REAR)
# ===================================================
N_TORSO = 6
tf_verts, tf_uvs, tf_faces = [], [], []
tb_verts, tb_uvs, tb_faces = [], [], []

for ri in range(N_TORSO + 1):
    t = ri / N_TORSO
    y = 1.10 + t * 0.36
    cur_rx = 0.18 + t * 0.04
    cur_rz = 0.14 + t * 0.02

    for si in range(SEGS_HALF + 1):
        phi = -np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = cur_rx * np.sin(phi)
        vz = cur_rz * np.cos(phi)
        tf_verts.append([vx, y, vz])
        tf_uvs.append(get_front_uv(vx, y))

    for si in range(SEGS_HALF + 1):
        phi = np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = cur_rx * np.sin(phi)
        vz = cur_rz * np.cos(phi)
        tb_verts.append([vx, y, vz])
        tb_uvs.append([si / SEGS_HALF, t * 0.4 + 0.6])

for ri in range(N_TORSO):
    for si in range(SEGS_HALF):
        c0 = ri * (SEGS_HALF + 1) + si
        c1 = ri * (SEGS_HALF + 1) + (si + 1)
        n0 = (ri + 1) * (SEGS_HALF + 1) + si
        n1 = (ri + 1) * (SEGS_HALF + 1) + (si + 1)
        tf_faces.append([c0, c1, n0])
        tf_faces.append([c1, n1, n0])
        tb_faces.append([c0, c1, n0])
        tb_faces.append([c1, n1, n0])

vis_tf = trimesh.visual.texture.TextureVisuals(uv=np.array(tf_uvs), material=mat_front)
mesh_tf = trimesh.Trimesh(vertices=np.array(tf_verts), faces=np.array(tf_faces), visual=vis_tf, process=False)
mesh_tf.name = 'torso_front'
all_meshes.append(mesh_tf)

vis_tb = trimesh.visual.texture.TextureVisuals(uv=np.array(tb_uvs), material=mat_back)
mesh_tb = trimesh.Trimesh(vertices=np.array(tb_verts), faces=np.array(tb_faces), visual=vis_tb, process=False)
mesh_tb.name = 'torso_back'
all_meshes.append(mesh_tb)

# ===================================================
# 4. SCAPULAR CAPELET / COWL (FRONT & REAR)
# ===================================================
N_COWL = 4
cf_verts, cf_uvs, cf_faces = [], [], []
cb_verts, cb_uvs, cb_faces = [], [], []

for ri in range(N_COWL + 1):
    t = ri / N_COWL
    y = 1.24 + t * 0.24
    cur_rx = 0.27 - t * 0.05
    cur_rz = 0.20 - t * 0.03

    for si in range(SEGS_HALF + 1):
        phi = -np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = cur_rx * np.sin(phi)
        vz = cur_rz * np.cos(phi)
        cf_verts.append([vx, y, vz])
        cf_uvs.append(get_front_uv(vx, y))

    for si in range(SEGS_HALF + 1):
        phi = np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = cur_rx * np.sin(phi)
        vz = cur_rz * np.cos(phi)
        cb_verts.append([vx, y, vz])
        cb_uvs.append([si / SEGS_HALF, t])

for ri in range(N_COWL):
    for si in range(SEGS_HALF):
        c0 = ri * (SEGS_HALF + 1) + si
        c1 = ri * (SEGS_HALF + 1) + (si + 1)
        n0 = (ri + 1) * (SEGS_HALF + 1) + si
        n1 = (ri + 1) * (SEGS_HALF + 1) + (si + 1)
        cf_faces.append([c0, c1, n0])
        cf_faces.append([c1, n1, n0])
        cb_faces.append([c0, c1, n0])
        cb_faces.append([c1, n1, n0])

vis_cf = trimesh.visual.texture.TextureVisuals(uv=np.array(cf_uvs), material=mat_front)
mesh_cf = trimesh.Trimesh(vertices=np.array(cf_verts), faces=np.array(cf_faces), visual=vis_cf, process=False)
mesh_cf.name = 'cowl_front'
all_meshes.append(mesh_cf)

vis_cb = trimesh.visual.texture.TextureVisuals(uv=np.array(cb_uvs), material=mat_back)
mesh_cb = trimesh.Trimesh(vertices=np.array(cb_verts), faces=np.array(cb_faces), visual=vis_cb, process=False)
mesh_cb.name = 'cowl_back'
all_meshes.append(mesh_cb)

# ===================================================
# 5. HEAD & HOOD (SEAMLESS AT COLLAR Y=1.47 TO APEX Y=1.95)
# ===================================================
# Contoured low-poly head matching the authentic nun proportions
face_levels = [
    (1.47, 0.28, 0.06),  # collar connection (seamless with cowl!)
    (1.55, 0.27, 0.08),  # throat
    (1.63, 0.26, 0.09),  # chin & mouth
    (1.71, 0.26, 0.10),  # nose & cheekbones
    (1.79, 0.25, 0.09),  # weeping bloody eyes
    (1.86, 0.20, 0.07),  # forehead
    (1.95, 0.06, 0.03),  # peak of veil
]

face_verts, face_uvs, face_faces = [], [], []
N_FACE_X = 6

for ri, (y, w, z) in enumerate(face_levels):
    t_y = ri / (len(face_levels) - 1)
    for xi in range(N_FACE_X + 1):
        t_x = xi / N_FACE_X
        vx = -w/2.0 + t_x * w
        # Gentle curve for optimal low-poly clarity
        curve = np.cos(np.pi * (t_x - 0.5))
        vz = z + 0.012 * curve
        face_verts.append([vx, y, vz])
        face_uvs.append(get_front_uv(vx, y))

for ri in range(len(face_levels) - 1):
    for xi in range(N_FACE_X):
        c0 = ri * (N_FACE_X + 1) + xi
        c1 = ri * (N_FACE_X + 1) + (xi + 1)
        n0 = (ri + 1) * (N_FACE_X + 1) + xi
        n1 = (ri + 1) * (N_FACE_X + 1) + (xi + 1)
        face_faces.append([c0, c1, n0])
        face_faces.append([c1, n1, n0])

vis_face = trimesh.visual.texture.TextureVisuals(uv=np.array(face_uvs), material=mat_front)
mesh_face = trimesh.Trimesh(vertices=np.array(face_verts), faces=np.array(face_faces), visual=vis_face, process=False)
mesh_face.name = 'face_front'
all_meshes.append(mesh_face)

# Rear Hood Dome (Seamless from collar to apex)
hood_b_verts, hood_b_uvs, hood_b_faces = [], [], []
for ri, (y, w, z) in enumerate(face_levels):
    t_y = ri / (len(face_levels) - 1)
    rx = w * 0.50
    rz = 0.12
    for si in range(SEGS_HALF + 1):
        phi = np.pi/2.0 + np.pi * (si / SEGS_HALF)
        vx = rx * np.sin(phi)
        vz = z - 0.02 + rz * np.cos(phi)
        hood_b_verts.append([vx, y, vz])
        hood_b_uvs.append([si / SEGS_HALF, t_y])

for ri in range(len(face_levels) - 1):
    for si in range(SEGS_HALF):
        c0 = ri * (SEGS_HALF + 1) + si
        c1 = ri * (SEGS_HALF + 1) + (si + 1)
        n0 = (ri + 1) * (SEGS_HALF + 1) + si
        n1 = (ri + 1) * (SEGS_HALF + 1) + (si + 1)
        hood_b_faces.append([c0, c1, n0])
        hood_b_faces.append([c1, n1, n0])

vis_hb = trimesh.visual.texture.TextureVisuals(uv=np.array(hood_b_uvs), material=mat_back)
mesh_hb = trimesh.Trimesh(vertices=np.array(hood_b_verts), faces=np.array(hood_b_faces), visual=vis_hb, process=False)
mesh_hb.name = 'hood_back'
all_meshes.append(mesh_hb)

# ===================================================
# 6. BELL SLEEVES & ARMS (DRAMATIC WIDE BELL FLARE)
# ===================================================
def build_sleeve_and_arm(side):
    meshes = []
    
    p0 = np.array([side * 0.22, 1.44, 0.02])
    p1 = np.array([side * 0.30, 1.28, 0.05])
    p2 = np.array([side * 0.32, 1.16, 0.06])
    
    SUB_SEGS = 8
    ring_defs = [
        (p0, 0.09, 0.0),
        (p1, 0.12, 0.5),
        (p2, 0.14, 1.0)
    ]
    
    # Front sleeve
    sf_v, sf_uv, sf_f = [], [], []
    for ri, (center, rad, t) in enumerate(ring_defs):
        for si in range(SUB_SEGS + 1):
            ang = -np.pi/2.0 + np.pi * (si / SUB_SEGS)
            vx = center[0] + rad * np.sin(ang)
            vy = center[1] - rad * 0.2 * np.cos(ang)
            vz = center[2] + rad * np.cos(ang)
            sf_v.append([vx, vy, vz])
            sf_uv.append(get_front_uv(vx, vy))
            
    for ri in range(len(ring_defs) - 1):
        for si in range(SUB_SEGS):
            c0 = ri * (SUB_SEGS + 1) + si
            c1 = ri * (SUB_SEGS + 1) + (si + 1)
            n0 = (ri + 1) * (SUB_SEGS + 1) + si
            n1 = (ri + 1) * (SUB_SEGS + 1) + (si + 1)
            sf_f.append([c0, c1, n0])
            sf_f.append([c1, n1, n0])
            
    v_sf = trimesh.visual.texture.TextureVisuals(uv=np.array(sf_uv), material=mat_front)
    m_sf = trimesh.Trimesh(vertices=np.array(sf_v), faces=np.array(sf_f), visual=v_sf, process=False)
    m_sf.name = f'sleeve_f_{"r" if side > 0 else "l"}'
    meshes.append(m_sf)
    
    # Rear sleeve
    sb_v, sb_uv, sb_f = [], [], []
    for ri, (center, rad, t) in enumerate(ring_defs):
        for si in range(SUB_SEGS + 1):
            ang = np.pi/2.0 + np.pi * (si / SUB_SEGS)
            vx = center[0] + rad * np.sin(ang)
            vy = center[1] - rad * 0.2 * np.cos(ang)
            vz = center[2] + rad * np.cos(ang)
            sb_v.append([vx, vy, vz])
            sb_uv.append([si / SUB_SEGS, t])
            
    for ri in range(len(ring_defs) - 1):
        for si in range(SUB_SEGS):
            c0 = ri * (SUB_SEGS + 1) + si
            c1 = ri * (SUB_SEGS + 1) + (si + 1)
            n0 = (ri + 1) * (SUB_SEGS + 1) + si
            n1 = (ri + 1) * (SUB_SEGS + 1) + (si + 1)
            sb_f.append([c0, c1, n0])
            sb_f.append([c1, n1, n0])
            
    v_sb = trimesh.visual.texture.TextureVisuals(uv=np.array(sb_uv), material=mat_back)
    m_sb = trimesh.Trimesh(vertices=np.array(sb_v), faces=np.array(sb_f), visual=v_sb, process=False)
    m_sb.name = f'sleeve_b_{"r" if side > 0 else "l"}'
    meshes.append(m_sb)
    
    # 2. Forearm
    p_arm_start = np.array([side * 0.32, 1.26, 0.06])
    p_wrist = np.array([side * 0.47, 1.44, 0.12])
    vec = p_wrist - p_arm_start
    length = np.linalg.norm(vec)
    direction = vec / length
    mid = (p_arm_start + p_wrist) / 2.0
    
    forearm = trimesh.creation.cylinder(radius=0.032, height=length, sections=10)
    up = np.array([0, 0, 1])
    rot = trimesh.geometry.align_vectors(up, direction)
    forearm.apply_transform(rot)
    forearm.apply_translation(mid)
    
    fa_uvs = [get_front_uv(v[0], v[1]) for v in forearm.vertices]
    forearm.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(fa_uvs), material=mat_front)
    forearm.name = f'forearm_{"r" if side > 0 else "l"}'
    meshes.append(forearm)
    
    # 3. Palm
    p_palm = np.array([side * 0.50, 1.48, 0.13])
    palm = trimesh.creation.box(extents=[0.052, 0.07, 0.020])
    palm_rot = trimesh.transformations.rotation_matrix(np.radians(side * 15), [0, 0, 1])
    palm.apply_transform(palm_rot)
    palm.apply_translation(p_palm)
    p_uvs = [get_front_uv(v[0], v[1]) for v in palm.vertices]
    palm.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(p_uvs), material=mat_front)
    palm.name = f'palm_{"r" if side > 0 else "l"}'
    meshes.append(palm)
    
    # 4. Splayed Claw Fingers
    finger_targets = [
        (side * 0.46, 1.61, 0.15, 0.0070),  # Inner claw
        (side * 0.49, 1.63, 0.15, 0.0068),  # Middle inner claw
        (side * 0.52, 1.62, 0.14, 0.0065),  # Middle outer claw
        (side * 0.55, 1.57, 0.13, 0.0062),  # Outer claw
    ]
    palm_base = np.array([side * 0.50, 1.51, 0.13])
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
        claw.visual = trimesh.visual.texture.TextureVisuals(uv=np.array(c_uvs), material=mat_front)
        claw.name = f'claw_{fi}_{"r" if side > 0 else "l"}'
        meshes.append(claw)
        
    return meshes

for side in [-1, 1]:
    all_meshes.extend(build_sleeve_and_arm(side))

# ===================================================
# 7. CRUCIFIX (3D Shiny Silver Latin Cross on Chest)
# ===================================================
cross_v = trimesh.creation.box(extents=[0.022, 0.17, 0.016])
cross_v.apply_translation([0, 1.34, 0.22])
cross_v.visual.material = mat_silver
cross_v.name = 'crucifix_v'
all_meshes.append(cross_v)

cross_h = trimesh.creation.box(extents=[0.11, 0.022, 0.016])
cross_h.apply_translation([0, 1.38, 0.22])
cross_h.visual.material = mat_silver
cross_h.name = 'crucifix_h'
all_meshes.append(cross_h)

# ===================================================
# 8. NUN SHOES (Under Hem at Y=0)
# ===================================================
for side in [-1, 1]:
    boot = trimesh.creation.box(extents=[0.08, 0.05, 0.16])
    boot.apply_translation([side * 0.09, 0.025, 0.02])
    boot.visual.material = mat_dark
    boot.name = f'boot_{"r" if side > 0 else "l"}'
    all_meshes.append(boot)

print(f"Total meshes constructed: {len(all_meshes)}")

# ===================================================
# 9. EXPORT GLB
# ===================================================
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

print("=== DEFINITIVE RECONSTRUCTION COMPLETE! ===")
