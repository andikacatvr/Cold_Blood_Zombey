import struct
import json
import os
import math

def pad4(b, pad_byte=b'\x00'):
    pad = (4 - (len(b) % 4)) % 4
    return b + (pad_byte * pad)

def generate_back_hair_geometry():
    positions = []
    normals = []
    uvs = []
    indices = []

    # 1. Base Curved Nape Sheet (covering the gap from lower skull to neck)
    rows = [
        (1.610, -0.093, 0.065),
        (1.555, -0.097, 0.060),
        (1.500, -0.086, 0.052),
        (1.440, -0.070, 0.042)
    ]
    cols = 5
    base_idx = len(positions)

    for r_idx, (y, cz, half_w) in enumerate(rows):
        v_norm = r_idx / (len(rows) - 1)
        for c_idx in range(cols):
            u_norm = c_idx / (cols - 1)
            ang = (u_norm - 0.5) * math.pi * 0.7
            x = half_w * math.sin(ang) * 1.5
            z = cz - half_w * (1.0 - math.cos(ang)) * 0.6

            nx = math.sin(ang) * 0.7
            ny = -0.15
            nz = -math.cos(ang)
            nlen = math.hypot(nx, ny, nz) or 1.0
            nx, ny, nz = nx/nlen, ny/nlen, nz/nlen

            positions.append((x, y, z))
            normals.append((nx, ny, nz))
            uvs.append((0.2 + 0.6 * u_norm, 0.1 + 0.8 * v_norm))

    for r in range(len(rows) - 1):
        for c in range(cols - 1):
            i0 = base_idx + r * cols + c
            i1 = base_idx + r * cols + c + 1
            i2 = base_idx + (r + 1) * cols + c
            i3 = base_idx + (r + 1) * cols + c + 1
            indices.extend([i0, i2, i1, i1, i2, i3])

    # 2. 3D Overlapping Fluff Locks (giving real textured strands and depth)
    def add_lock(points_w, u_center=0.5):
        ribbon_base = len(positions)
        n_pts = len(points_w)
        for s_idx, (x, y, z, w) in enumerate(points_w):
            if s_idx == 0:
                tx = points_w[1][0] - x; ty = points_w[1][1] - y; tz = points_w[1][2] - z
            elif s_idx == n_pts - 1:
                tx = x - points_w[s_idx - 1][0]; ty = y - points_w[s_idx - 1][1]; tz = z - points_w[s_idx - 1][2]
            else:
                tx = points_w[s_idx + 1][0] - points_w[s_idx - 1][0]; ty = points_w[s_idx + 1][1] - points_w[s_idx - 1][1]; tz = points_w[s_idx + 1][2] - points_w[s_idx - 1][2]
            tlen = math.hypot(tx, ty, tz) or 1.0
            tx, ty, tz = tx / tlen, ty / tlen, tz / tlen

            nx, ny, nz = x * 2.0, (y - 1.55) * 0.3, -1.0
            nlen = math.hypot(nx, ny, nz) or 1.0
            nx, ny, nz = nx / nlen, ny / nlen, nz / nlen

            bx = ty * nz - tz * ny
            by = tz * nx - tx * nz
            bz = tx * ny - ty * nx
            blen = math.hypot(bx, by, bz) or 1.0
            bx, by, bz = bx / blen, by / blen, bz / blen

            v_val = 0.1 + 0.8 * (s_idx / (n_pts - 1))

            lx = x - bx * (w * 0.5); ly = y - by * (w * 0.5); lz = z - bz * (w * 0.5)
            positions.append((lx, ly, lz))
            normals.append((nx, ny, nz))
            uvs.append((u_center - 0.12, v_val))

            rx = x + bx * (w * 0.5); ry = y + by * (w * 0.5); rz = z + bz * (w * 0.5)
            positions.append((rx, ry, rz))
            normals.append((nx, ny, nz))
            uvs.append((u_center + 0.12, v_val))

        for s_idx in range(n_pts - 1):
            i0 = ribbon_base + s_idx * 2
            i1 = ribbon_base + s_idx * 2 + 1
            i2 = ribbon_base + (s_idx + 1) * 2
            i3 = ribbon_base + (s_idx + 1) * 2 + 1
            indices.extend([i0, i2, i1, i1, i2, i3])

    # A. Center Main Fluff Lock
    add_lock([(0.000, 1.615, -0.098, 0.030), (0.000, 1.555, -0.108, 0.034), (0.000, 1.490, -0.098, 0.028), (0.000, 1.430, -0.076, 0.012)], u_center=0.50)
    # B. Left Fluff Lock
    add_lock([(-0.028, 1.605, -0.095, 0.026), (-0.036, 1.545, -0.103, 0.028), (-0.038, 1.485, -0.092, 0.022), (-0.040, 1.425, -0.072, 0.010)], u_center=0.35)
    # C. Right Fluff Lock
    add_lock([(0.028, 1.605, -0.095, 0.026), (0.036, 1.545, -0.103, 0.028), (0.038, 1.485, -0.092, 0.022), (0.040, 1.425, -0.072, 0.010)], u_center=0.65)
    # D. Outer Left Wing Lock (towards left twintail root)
    add_lock([(-0.052, 1.590, -0.088, 0.022), (-0.062, 1.530, -0.092, 0.024), (-0.066, 1.470, -0.080, 0.018), (-0.065, 1.415, -0.062, 0.010)], u_center=0.22)
    # E. Outer Right Wing Lock (towards right twintail root)
    add_lock([(0.052, 1.590, -0.088, 0.022), (0.062, 1.530, -0.092, 0.024), (0.066, 1.470, -0.080, 0.018), (0.065, 1.415, -0.062, 0.010)], u_center=0.78)

    return positions, normals, uvs, indices

def merge_hair(nona_glb_path, hair_glb_path, output_glb_path, scale=0.485, pos=(0.0, 1.506, -0.016), rot_deg=(0.0, 0.0, 0.0)):
    print(f"Merging {hair_glb_path} into {nona_glb_path} -> {output_glb_path}")
    print(f"Transform: scale={scale}, pos={pos}, rot_deg={rot_deg}")

    # 1. Read Nona GLB
    with open(nona_glb_path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        json_len, _ = struct.unpack('<II', f.read(8))
        nona_gltf = json.loads(f.read(json_len).decode('utf-8'))
        bin_len, _ = struct.unpack('<II', f.read(8))
        nona_bin = bytearray(f.read(bin_len))

    # 2. Read Hair GLB
    with open(hair_glb_path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        json_len, _ = struct.unpack('<II', f.read(8))
        hair_gltf = json.loads(f.read(json_len).decode('utf-8'))
        bin_len, _ = struct.unpack('<II', f.read(8))
        hair_bin = bytearray(f.read(bin_len))

    # 3. Transform hair vertices and normals
    # Rotation angles in radians
    rx = math.radians(rot_deg[0])
    ry = math.radians(rot_deg[1])
    rz = math.radians(rot_deg[2])

    cos_x, sin_x = math.cos(rx), math.sin(rx)
    cos_y, sin_y = math.cos(ry), math.sin(ry)
    cos_z, sin_z = math.cos(rz), math.sin(rz)

    def rotate_point(x, y, z):
        # Rotate X
        y1 = y * cos_x - z * sin_x
        z1 = y * sin_x + z * cos_x
        x1 = x
        # Rotate Y
        x2 = x1 * cos_y + z1 * sin_y
        z2 = -x1 * sin_y + z1 * cos_y
        y2 = y1
        # Rotate Z
        x3 = x2 * cos_z - y2 * sin_z
        y3 = x2 * sin_z + y2 * cos_z
        z3 = z2
        return x3, y3, z3

    hair_mesh = hair_gltf['meshes'][0]
    hair_prim = hair_mesh['primitives'][0]
    hair_pos_acc = hair_gltf['accessors'][hair_prim['attributes']['POSITION']]
    hair_norm_acc = hair_gltf['accessors'][hair_prim['attributes']['NORMAL']]

    hair_pos_bv = hair_gltf['bufferViews'][hair_pos_acc['bufferView']]
    hair_norm_bv = hair_gltf['bufferViews'][hair_norm_acc['bufferView']]

    pos_off = hair_pos_bv.get('byteOffset', 0) + hair_pos_acc.get('byteOffset', 0)
    norm_off = hair_norm_bv.get('byteOffset', 0) + hair_norm_acc.get('byteOffset', 0)
    v_count = hair_pos_acc['count']

    transformed_pos_min = [float('inf'), float('inf'), float('inf')]
    transformed_pos_max = [float('-inf'), float('-inf'), float('-inf')]

    for i in range(v_count):
        po = pos_off + i * 12
        no = norm_off + i * 12

        hx, hy, hz = struct.unpack('<fff', hair_bin[po:po+12])
        nx, ny, nz = struct.unpack('<fff', hair_bin[no:no+12])

        # Scale and rotate position
        hx *= scale
        hy *= scale
        hz *= scale
        rx_p, ry_p, rz_p = rotate_point(hx, hy, hz)
        fx = rx_p + pos[0]
        fy = ry_p + pos[1]
        fz = rz_p + pos[2]

        # Rotate normal
        fnx, fny, fnz = rotate_point(nx, ny, nz)
        nlen = math.hypot(fnx, fny, fnz) or 1.0
        fnx, fny, fnz = fnx/nlen, fny/nlen, fnz/nlen

        hair_bin[po:po+12] = struct.pack('<fff', fx, fy, fz)
        hair_bin[no:no+12] = struct.pack('<fff', fnx, fny, fnz)

        for c in range(3):
            val = (fx, fy, fz)[c]
            if val < transformed_pos_min[c]: transformed_pos_min[c] = val
            if val > transformed_pos_max[c]: transformed_pos_max[c] = val

    # 4. Now combine nona_bin + hair_bin
    nona_bin_padded = pad4(nona_bin)
    hair_bin_padded = pad4(hair_bin)
    combined_bin = nona_bin_padded + hair_bin_padded

    bin_offset_shift = len(nona_bin_padded)

    # 5. Build combined glTF JSON
    combined_gltf = dict(nona_gltf)

    # Remap hair bufferViews: add bin_offset_shift
    bv_offset_start = len(combined_gltf['bufferViews'])
    for bv in hair_gltf['bufferViews']:
        new_bv = dict(bv)
        new_bv['byteOffset'] = new_bv.get('byteOffset', 0) + bin_offset_shift
        new_bv['buffer'] = 0
        combined_gltf['bufferViews'].append(new_bv)

    # Remap hair accessors
    acc_offset_start = len(combined_gltf['accessors'])
    for i, acc in enumerate(hair_gltf['accessors']):
        new_acc = dict(acc)
        new_acc['bufferView'] += bv_offset_start
        if i == hair_prim['attributes']['POSITION']:
            new_acc['min'] = transformed_pos_min
            new_acc['max'] = transformed_pos_max
        combined_gltf['accessors'].append(new_acc)

    # Remap hair images
    img_offset_start = len(combined_gltf.get('images', []))
    if 'images' not in combined_gltf:
        combined_gltf['images'] = []
    for img in hair_gltf.get('images', []):
        new_img = dict(img)
        if 'bufferView' in new_img:
            new_img['bufferView'] += bv_offset_start
        combined_gltf['images'].append(new_img)

    # Remap hair textures
    tex_offset_start = len(combined_gltf.get('textures', []))
    if 'textures' not in combined_gltf:
        combined_gltf['textures'] = []
    for tex in hair_gltf.get('textures', []):
        new_tex = dict(tex)
        if 'source' in new_tex:
            new_tex['source'] += img_offset_start
        combined_gltf['textures'].append(new_tex)

    # Remap hair materials
    mat_offset_start = len(combined_gltf.get('materials', []))
    if 'materials' not in combined_gltf:
        combined_gltf['materials'] = []
    for mat in hair_gltf.get('materials', []):
        new_mat = json.loads(json.dumps(mat)) # deep copy
        if 'pbrMetallicRoughness' in new_mat:
            pbr = new_mat['pbrMetallicRoughness']
            if 'baseColorTexture' in pbr and 'index' in pbr['baseColorTexture']:
                pbr['baseColorTexture']['index'] += tex_offset_start
        combined_gltf['materials'].append(new_mat)

    # 6. Generate 3D Textured Back Nape Hair (Primitive 1 of hair mesh)
    back_pos, back_norm, back_uv, back_idx = generate_back_hair_geometry()

    # Binary data for back hair
    b_pos_bytes = pad4(b''.join(struct.pack('<fff', *p) for p in back_pos), b'\x00')
    b_norm_bytes = pad4(b''.join(struct.pack('<fff', *n) for n in back_norm), b'\x00')
    b_uv_bytes = pad4(b''.join(struct.pack('<ff', *u) for u in back_uv), b'\x00')
    b_idx_bytes = pad4(b''.join(struct.pack('<H', i) for i in back_idx), b'\x00')

    # Append to combined_bin
    pos_bv_offset = len(combined_bin)
    combined_bin += b_pos_bytes
    norm_bv_offset = len(combined_bin)
    combined_bin += b_norm_bytes
    uv_bv_offset = len(combined_bin)
    combined_bin += b_uv_bytes
    idx_bv_offset = len(combined_bin)
    combined_bin += b_idx_bytes

    # Create bufferViews
    bv_pos_idx = len(combined_gltf['bufferViews'])
    combined_gltf['bufferViews'].append({
        "buffer": 0,
        "byteOffset": pos_bv_offset,
        "byteLength": len(b_pos_bytes),
        "target": 34962
    })

    bv_norm_idx = len(combined_gltf['bufferViews'])
    combined_gltf['bufferViews'].append({
        "buffer": 0,
        "byteOffset": norm_bv_offset,
        "byteLength": len(b_norm_bytes),
        "target": 34962
    })

    bv_uv_idx = len(combined_gltf['bufferViews'])
    combined_gltf['bufferViews'].append({
        "buffer": 0,
        "byteOffset": uv_bv_offset,
        "byteLength": len(b_uv_bytes),
        "target": 34962
    })

    bv_idx_idx = len(combined_gltf['bufferViews'])
    combined_gltf['bufferViews'].append({
        "buffer": 0,
        "byteOffset": idx_bv_offset,
        "byteLength": len(b_idx_bytes),
        "target": 34963
    })

    # Create Accessors
    min_bp = [min(p[c] for p in back_pos) for c in range(3)]
    max_bp = [max(p[c] for p in back_pos) for c in range(3)]

    acc_pos_idx = len(combined_gltf['accessors'])
    combined_gltf['accessors'].append({
        "bufferView": bv_pos_idx,
        "byteOffset": 0,
        "componentType": 5126,
        "count": len(back_pos),
        "type": "VEC3",
        "min": min_bp,
        "max": max_bp
    })

    acc_norm_idx = len(combined_gltf['accessors'])
    combined_gltf['accessors'].append({
        "bufferView": bv_norm_idx,
        "byteOffset": 0,
        "componentType": 5126,
        "count": len(back_norm),
        "type": "VEC3"
    })

    acc_uv_idx = len(combined_gltf['accessors'])
    combined_gltf['accessors'].append({
        "bufferView": bv_uv_idx,
        "byteOffset": 0,
        "componentType": 5126,
        "count": len(back_uv),
        "type": "VEC2"
    })

    acc_idx_idx = len(combined_gltf['accessors'])
    combined_gltf['accessors'].append({
        "bufferView": bv_idx_idx,
        "byteOffset": 0,
        "componentType": 5123,
        "count": len(back_idx),
        "type": "SCALAR"
    })

    # Remap hair meshes
    mesh_offset_start = len(combined_gltf.get('meshes', []))
    new_hair_mesh = json.loads(json.dumps(hair_mesh))
    for prim in new_hair_mesh['primitives']:
        for attr in prim['attributes']:
            prim['attributes'][attr] += acc_offset_start
        if 'indices' in prim:
            prim['indices'] += acc_offset_start
        if 'material' in prim:
            prim['material'] += mat_offset_start

    # Append Primitive 1 (Back Hair) to Hair Mesh
    new_hair_mesh['primitives'].append({
        "attributes": {
            "POSITION": acc_pos_idx,
            "NORMAL": acc_norm_idx,
            "TEXCOORD_0": acc_uv_idx
        },
        "indices": acc_idx_idx,
        "material": mat_offset_start
    })

    combined_gltf['meshes'].append(new_hair_mesh)

    # Add hair node
    new_hair_node = {
        "name": "PS2_TwinTail_Hair",
        "mesh": mesh_offset_start
    }
    hair_node_idx = len(combined_gltf['nodes'])
    combined_gltf['nodes'].append(new_hair_node)

    # Add to scene
    scene_idx = combined_gltf.get('scene', 0)
    combined_gltf['scenes'][scene_idx]['nodes'].append(hair_node_idx)

    # Update buffer size
    combined_gltf['buffers'][0]['byteLength'] = len(combined_bin)

    # Encode GLB (JSON chunk must be padded with spaces 0x20 per glTF 2.0 spec)
    json_bytes = json.dumps(combined_gltf, separators=(',', ':')).encode('utf-8')
    json_padded = pad4(json_bytes, b' ')
    bin_padded = pad4(combined_bin, b'\x00')

    glb_total_len = 12 + 8 + len(json_padded) + 8 + len(bin_padded)

    out_bytes = bytearray()
    out_bytes.extend(struct.pack('<4sII', b'glTF', 2, glb_total_len))
    out_bytes.extend(struct.pack('<II', len(json_padded), 0x4E4F534A))
    out_bytes.extend(json_padded)
    out_bytes.extend(struct.pack('<II', len(bin_padded), 0x004E4942))
    out_bytes.extend(bin_padded)

    with open(output_glb_path, 'wb') as f:
        f.write(out_bytes)
    print(f"[SUCCESS] Wrote merged GLB ({len(out_bytes)} bytes) to {output_glb_path}")

if __name__ == '__main__':
    # Regenerate base nona_batavia first to ensure clean state
    from add_underskirt_and_legs import generate_nona_batavia_complete
    generate_nona_batavia_complete()

    # Merge hair with snug fit: scale reduced to 0.315 (kecilin dikit lagi)
    merge_hair(
        'public/models/nona_batavia.glb',
        'ps2_twintail_hair.glb',
        'public/models/nona_batavia.glb',
        scale=0.315,
        pos=(0.0, 1.564, -0.024),
        rot_deg=(0.0, 0.0, 0.0)
    )
    # Also update nonabatavia_glommy.glb and dist/
    import shutil
    shutil.copyfile('public/models/nona_batavia.glb', 'public/models/nonabatavia_glommy.glb')
    shutil.copyfile('public/models/nona_batavia.glb', 'dist/models/nona_batavia.glb')
    shutil.copyfile('public/models/nona_batavia.glb', 'dist/models/nonabatavia_glommy.glb')
    print("[SUCCESS] Synced all models in public/ and dist/")
