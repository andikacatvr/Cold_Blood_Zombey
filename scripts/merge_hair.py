import struct
import json
import os
import math

def pad4(b, pad_byte=b'\x00'):
    pad = (4 - (len(b) % 4)) % 4
    return b + (pad_byte * pad)

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
