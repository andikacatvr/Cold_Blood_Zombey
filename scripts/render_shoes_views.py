import trimesh
import numpy as np
from PIL import Image

m = trimesh.load('bossgame.glb', force='mesh', process=False)
tex = np.array(m.visual.material.baseColorTexture)

def render_view_pitch_yaw(yaw_deg, pitch_deg, zoom_mode='shoes'):
    h, w = 600, 420
    img = np.full((h, w, 3), 20, dtype=np.uint8)
    z_buf = np.full((h, w), -1e9, dtype=np.float32)
    
    rad_y = np.radians(yaw_deg)
    cos_y, sin_y = np.cos(rad_y), np.sin(rad_y)
    
    rad_p = np.radians(pitch_deg)
    cos_p, sin_p = np.cos(rad_p), np.sin(rad_p)
    
    # 1. Yaw rotation around Y
    vx1 = m.vertices[:, 0] * cos_y + m.vertices[:, 2] * sin_y
    vy1 = m.vertices[:, 1]
    vz1 = -m.vertices[:, 0] * sin_y + m.vertices[:, 2] * cos_y
    
    # 2. Pitch rotation around X (looking up or down)
    vx = vx1
    vy = vy1 * cos_p - vz1 * sin_p
    vz = vy1 * sin_p + vz1 * cos_p
    
    if zoom_mode == 'underskirt':
        # Looking up into skirt: center around Y_world=0.25, Z=0.0
        py = ((0.50 - vy) / 0.70 * h).astype(int)
        px = ((vx + 0.35) / 0.70 * w).astype(int)
    elif zoom_mode == 'shoes':
        # Zoom on feet and lower dress hem: y from -0.02 to 0.30
        py = ((0.30 - vy) / 0.32 * h).astype(int)
        px = ((vx + 0.22) / 0.44 * w).astype(int)
    else:
        # Full body
        py = ((1.80 - vy) / 1.90 * h).astype(int)
        px = ((vx + 0.55) / 1.10 * w).astype(int)
        
    u_px = np.clip((m.visual.uv[:, 0] * (tex.shape[1] - 1)).astype(int), 0, tex.shape[1] - 1)
    v_px = np.clip(((1.0 - m.visual.uv[:, 1]) * (tex.shape[0] - 1)).astype(int), 0, tex.shape[0] - 1)
    
    for f in m.faces:
        p0, p1, p2 = (px[f[0]], py[f[0]]), (px[f[1]], py[f[1]]), (px[f[2]], py[f[2]])
        min_x = max(0, min(p0[0], p1[0], p2[0]))
        max_x = min(w - 1, max(p0[0], p1[0], p2[0]))
        min_y = max(0, min(p0[1], p1[1], p2[1]))
        max_y = min(h - 1, max(p0[1], p1[1], p2[1]))
        
        if min_x > max_x or min_y > max_y:
            continue
            
        den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(den) < 1e-6:
            continue
            
        xs = np.arange(min_x, max_x + 1)
        ys = np.arange(min_y, max_y + 1)
        grid_x, grid_y = np.meshgrid(xs, ys)
        
        w0 = ((p1[1] - p2[1]) * (grid_x - p2[0]) + (p2[0] - p1[0]) * (grid_y - p2[1])) / float(den)
        w1 = ((p2[1] - p0[1]) * (grid_x - p2[0]) + (p0[0] - p2[0]) * (grid_y - p2[1])) / float(den)
        w2 = 1.0 - w0 - w1
        
        valid = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not np.any(valid):
            continue
            
        pix_z = w0 * vz[f[0]] + w1 * vz[f[1]] + w2 * vz[f[2]]
        
        cur_z = z_buf[grid_y[valid], grid_x[valid]]
        closer = pix_z[valid] > cur_z
        
        if not np.any(closer):
            continue
            
        cand_y = grid_y[valid][closer]
        cand_x = grid_x[valid][closer]
        
        z_buf[cand_y, cand_x] = pix_z[valid][closer]
        
        cand_u = (w0[valid][closer] * u_px[f[0]] + w1[valid][closer] * u_px[f[1]] + w2[valid][closer] * u_px[f[2]]).astype(int)
        cand_v = (w0[valid][closer] * v_px[f[0]] + w1[valid][closer] * v_px[f[1]] + w2[valid][closer] * v_px[f[2]]).astype(int)
        
        cand_u = np.clip(cand_u, 0, tex.shape[1] - 1)
        cand_v = np.clip(cand_v, 0, tex.shape[0] - 1)
        
        img[cand_y, cand_x] = tex[cand_v, cand_u, :3]
        
    return img

print('Rendering views...')
v_front_shoes = render_view_pitch_yaw(0, 0, 'shoes')
v_front_full = render_view_pitch_yaw(0, 0, 'full')
v_angle_shoes = render_view_pitch_yaw(25, -15, 'shoes')
v_side_shoes = render_view_pitch_yaw(90, -5, 'shoes')

# Combine 4 views side-by-side
canvas = np.hstack([v_front_full, v_front_shoes, v_angle_shoes, v_side_shoes])
im = Image.fromarray(canvas)
im.save('shoes_front_flawless_verification.png')
im.save('public/textures/boss/shoes_front_flawless_verification.png')
print('Successfully saved shoes_front_flawless_verification.png!')

