import json
import struct
import math
from PIL import Image, ImageDraw
import io

def generate_nona_batavia_complete():
    # Read original backup
    with open('public/models/nona_batavia_backup.glb', 'rb') as f:
        buf = bytearray(f.read())

    json_len = int.from_bytes(buf[12:16], 'little')
    gltf = json.loads(buf[20:20+json_len].decode('utf-8'))

    bin_header_offset = 20 + json_len
    bin_len = int.from_bytes(buf[bin_header_offset:bin_header_offset+4], 'little')
    bin_offset = bin_header_offset + 8

    # 1. Repaint Texture: Clean Selop Footwear & Dark Underskirt Shadow Pixel
    img_meta = gltf['images'][0]
    img_bv = gltf['bufferViews'][img_meta['bufferView']]
    img_start = bin_offset + img_bv.get('byteOffset', 0)
    img_bytes = buf[img_start : img_start + img_bv['byteLength']]

    tex = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
    w, h = tex.size
    draw = ImageDraw.Draw(tex)

    COLOR_SOLE = (22, 16, 18, 255)         # Deep black/espresso velvet sole & interior
    COLOR_UPPER = (30, 22, 24, 255)        # Dark velvet shoe upper
    COLOR_SKIN = (228, 180, 154, 255)       # Clean fair skin tone for legs & instep
    COLOR_SKIN_SHADE = (205, 156, 132, 255) # Leg skin shading
    COLOR_GOLD = (185, 142, 65, 255)        # Gold embroidery trim
    COLOR_GOLD_LIGHT = (218, 175, 88, 255)  # Gold highlight

    # Paint clean traditional selop footwear on feet strip
    for col_start, col_end in [(160, 350), (510, 870)]:
        draw.rectangle([col_start, 925, col_end, 990], fill=COLOR_SOLE)
        draw.rectangle([col_start + 10, 930, col_end - 10, 955], fill=COLOR_SKIN)
        draw.rectangle([col_start + 15, 948, col_end - 15, 958], fill=COLOR_SKIN_SHADE)
        draw.rectangle([col_start + 5, 958, col_end - 5, 982], fill=COLOR_UPPER)
        draw.line([col_start + 5, 958, col_end - 5, 958], fill=COLOR_GOLD_LIGHT, width=2)
        draw.line([col_start + 5, 970, col_end - 5, 970], fill=COLOR_GOLD, width=1)
        draw.line([col_start + 5, 982, col_end - 5, 982], fill=COLOR_GOLD, width=2)

    # Dedicated UV pixel areas for legs and underskirt shadow:
    # U=0.05, V=0.98 -> Solid deep dark shadow for underskirt cap
    draw.rectangle([40, 970, 70, 1000], fill=COLOR_SOLE)
    # U=0.10, V=0.98 -> Smooth skin tone for inner legs
    draw.rectangle([90, 970, 120, 1000], fill=COLOR_SKIN)

    out_img_io = io.BytesIO()
    tex.save(out_img_io, format='PNG')
    new_img_bytes = out_img_io.getvalue()
    print(f'Repainted texture size: {len(new_img_bytes)} bytes')

    # Accessors and buffer views
    pos_acc = gltf['accessors'][0]
    norm_acc = gltf['accessors'][1]
    uv_acc = gltf['accessors'][2]
    idx_acc = gltf['accessors'][gltf['meshes'][0]['primitives'][0]['indices']]

    pos_bv = gltf['bufferViews'][pos_acc['bufferView']]
    norm_bv = gltf['bufferViews'][norm_acc['bufferView']]
    uv_bv = gltf['bufferViews'][uv_acc['bufferView']]
    idx_bv = gltf['bufferViews'][idx_acc['bufferView']]

    pos_off = pos_bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)
    norm_off = norm_bv.get('byteOffset', 0) + norm_acc.get('byteOffset', 0)
    uv_off = uv_bv.get('byteOffset', 0) + uv_acc.get('byteOffset', 0)
    idx_off = idx_bv.get('byteOffset', 0) + idx_acc.get('byteOffset', 0)

    bin_buf = bytearray(buf[bin_offset : bin_offset + bin_len])

    vert_count = pos_acc['count']
    idx_count = idx_acc['count']

    # Read original data
    orig_positions = []
    orig_normals = []
    orig_uvs = []
    orig_indices = []

    for i in range(vert_count):
        o = pos_off + i * 12
        orig_positions.append(struct.unpack('<fff', bin_buf[o:o+12]))
        o_n = norm_off + i * 12
        orig_normals.append(struct.unpack('<fff', bin_buf[o_n:o_n+12]))
        o_u = uv_off + i * 8
        orig_uvs.append(struct.unpack('<ff', bin_buf[o_u:o_u+8]))

    for i in range(idx_count):
        o_idx = idx_off + i * 2
        orig_indices.append(struct.unpack('<H', bin_buf[o_idx:o_idx+2])[0])

    # Transform Existing Vertices:
    # A. Arms: lengthen by ~50% down to mid-thigh
    pY = 1.340
    origElbowDist = 0.174
    upperScale = 1.48
    newElbowDist = origElbowDist * upperScale
    forearmScale = 1.58

    angleDown = 70 * (math.pi / 180)
    angleFwd = 7 * (math.pi / 180)
    fAngleDown = 76 * (math.pi / 180)
    fAngleFwd = 18 * (math.pi / 180)

    new_positions = []
    new_normals = []
    new_uvs = list(orig_uvs)

    for i in range(vert_count):
        x, y, z = orig_positions[i]
        nx, ny, nz = orig_normals[i]

        if abs(x) >= 0.145 and 0.85 <= y <= 1.45:
            is_left = x < 0
            sign = -1.0 if is_left else 1.0
            pX = sign * 0.155

            dx_orig = (x - pX) * sign
            dy = y - pY
            dz = z

            if dx_orig <= origElbowDist:
                scaled_dx = dx_orig * upperScale
                x1 = scaled_dx * math.cos(-angleDown) - dy * math.sin(-angleDown)
                y1 = scaled_dx * math.sin(-angleDown) + dy * math.cos(-angleDown)
                z1 = dz

                rx = x1 * math.cos(angleFwd) - z1 * math.sin(angleFwd)
                ry = y1
                rz = x1 * math.sin(angleFwd) + z1 * math.cos(angleFwd)

                nx1 = (nx * sign) * math.cos(-angleDown) - ny * math.sin(-angleDown)
                ny1 = (nx * sign) * math.sin(-angleDown) + ny * math.cos(-angleDown)
                nz1 = nz

                rnx = (nx1 * math.cos(angleFwd) - nz1 * math.sin(angleFwd)) * sign
                rny = ny1
                rnz = nx1 * math.sin(angleFwd) + nz1 * math.cos(angleFwd)
            else:
                ex1 = newElbowDist * math.cos(-angleDown)
                ey1 = newElbowDist * math.sin(-angleDown)
                ex = ex1 * math.cos(angleFwd)
                ey = ey1
                ez = ex1 * math.sin(angleFwd)

                fdx = (dx_orig - origElbowDist) * forearmScale

                fx1 = fdx * math.cos(-fAngleDown) - dy * math.sin(-fAngleDown)
                fy1 = fdx * math.sin(-fAngleDown) + dy * math.cos(-fAngleDown)
                fz1 = dz

                fx2 = fx1 * math.cos(fAngleFwd) - fz1 * math.sin(fAngleFwd)
                fy2 = fy1
                fz2 = fx1 * math.sin(fAngleFwd) + fz1 * math.cos(fAngleFwd)

                rx = ex + fx2
                ry = ey + fy2
                rz = ez + fz2

                fnx1 = (nx * sign) * math.cos(-fAngleDown) - ny * math.sin(-fAngleDown)
                fny1 = (nx * sign) * math.sin(-fAngleDown) + ny * math.cos(-fAngleDown)
                fnz1 = nz

                rnx = (fnx1 * math.cos(fAngleFwd) - fnz1 * math.sin(fAngleFwd)) * sign
                rny = fny1
                rnz = fnx1 * math.sin(fAngleFwd) + fnz1 * math.cos(fAngleFwd)

            w = 1.0
            if dx_orig < 0.030:
                t = max(0.0, min(1.0, (dx_orig + 0.010) / 0.040))
                w = t * t * (3.0 - 2.0 * t)

            x = pX + sign * (dx_orig * (1.0 - w) + rx * w)
            y = pY + (dy * (1.0 - w) + ry * w)
            z = dz * (1.0 - w) + rz * w

            nx = nx * (1.0 - w) + rnx * w
            ny = ny * (1.0 - w) + rny * w
            nz = nz * (1.0 - w) + rnz * w
            nlen = math.hypot(nx, ny, nz) or 1.0
            nx, ny, nz = nx / nlen, ny / nlen, nz / nlen

        elif y < 0.144:
            # Feet grounding and centering
            is_left = x < 0
            y_norm = max(0.0, (y - 0.0534) / (0.145 - 0.0534))
            y = 0.002 + y_norm * 0.096

            target_cx = -0.048 if is_left else 0.048
            orig_cx = -0.098 if is_left else 0.098
            x = target_cx + (x - orig_cx) * 0.62
            z = z * 0.95 + 0.005

        elif 0.144 <= y <= 0.148:
            # Skirt hem drape
            y = 0.098

        new_positions.append((x, y, z))
        new_normals.append((nx, ny, nz))

    # B. ADD INNER LEGS (CALVES) & UNDERSKIRT SHADOW CAP
    # 1. Left and Right Legs (smooth cylinders rising from shoes up inside the skirt)
    LEG_UV = (105 / 1024.0, 985 / 1024.0)   # Clean skin tone
    CAP_UV = (55 / 1024.0, 985 / 1024.0)    # Deep shadow black

    new_indices = list(orig_indices)

    def add_leg(cx, cz, y_bottom, y_top, r_bottom, r_top, segments=8):
        base_idx = len(new_positions)
        # Bottom ring
        for s in range(segments):
            ang = 2 * math.pi * s / segments
            lx = cx + r_bottom * math.sin(ang)
            lz = cz + r_bottom * math.cos(ang)
            new_positions.append((lx, y_bottom, lz))
            new_normals.append((math.sin(ang), 0.0, math.cos(ang)))
            new_uvs.append(LEG_UV)

        # Top ring
        for s in range(segments):
            ang = 2 * math.pi * s / segments
            lx = cx + r_top * math.sin(ang)
            lz = cz + r_top * math.cos(ang)
            new_positions.append((lx, y_top, lz))
            new_normals.append((math.sin(ang), 0.0, math.cos(ang)))
            new_uvs.append(LEG_UV)

        # Quads
        for s in range(segments):
            next_s = (s + 1) % segments
            # Triangle 1
            new_indices.extend([base_idx + s, base_idx + segments + s, base_idx + next_s])
            # Triangle 2
            new_indices.extend([base_idx + next_s, base_idx + segments + s, base_idx + segments + next_s])

    # Left Leg: from ankle y=0.08 up inside skirt y=0.32
    add_leg(-0.048, 0.015, 0.075, 0.320, 0.026, 0.038, segments=8)
    # Right Leg
    add_leg(0.048, 0.015, 0.075, 0.320, 0.026, 0.038, segments=8)

    # 2. Underskirt Interior Shadow Cap: Seals the interior void so looking up is solid dark lining
    cap_base_idx = len(new_positions)
    cap_y = 0.260
    cap_rx = 0.160
    cap_rz = 0.104
    cap_segments = 14

    # Center vertex (pointing downwards)
    new_positions.append((0.0, cap_y, 0.0))
    new_normals.append((0.0, -1.0, 0.0))
    new_uvs.append(CAP_UV)

    # Perimeter vertices
    for s in range(cap_segments):
        ang = 2 * math.pi * s / cap_segments
        px = cap_rx * math.sin(ang)
        pz = cap_rz * math.cos(ang)
        new_positions.append((px, cap_y, pz))
        new_normals.append((0.0, -1.0, 0.0))
        new_uvs.append(CAP_UV)

    # Fan triangles facing downwards (so visible when camera looks up from below)
    for s in range(cap_segments):
        next_s = (s + 1) % cap_segments
        # Winding order facing down (-Y): center, next, current
        new_indices.extend([cap_base_idx, cap_base_idx + 1 + next_s, cap_base_idx + 1 + s])

    final_vert_count = len(new_positions)
    final_idx_count = len(new_indices)
    print(f'Final vertices: {final_vert_count} (added {final_vert_count - vert_count})')
    print(f'Final indices: {final_idx_count} (added {final_idx_count - idx_count})')

    # Calculate overall bounding box
    minX = min(p[0] for p in new_positions)
    maxX = max(p[0] for p in new_positions)
    minY = min(p[1] for p in new_positions)
    maxY = max(p[1] for p in new_positions)
    minZ = min(p[2] for p in new_positions)
    maxZ = max(p[2] for p in new_positions)
    print(f'Final Bounds: X [{minX:.3f}, {maxX:.3f}], Y [{minY:.3f}, {maxY:.3f}], Z [{minZ:.3f}, {maxZ:.3f}]')

    # Pack binary data
    pos_data_out = bytearray()
    norm_data_out = bytearray()
    uv_data_out = bytearray()

    for p in new_positions:
        pos_data_out.extend(struct.pack('<fff', p[0], p[1], p[2]))
    for n in new_normals:
        norm_data_out.extend(struct.pack('<fff', n[0], n[1], n[2]))
    for u in new_uvs:
        uv_data_out.extend(struct.pack('<ff', u[0], u[1]))

    idx_data_out = bytearray()
    for idx in new_indices:
        idx_data_out.extend(struct.pack('<H', idx))

    # Pad each bufferView to 4-byte boundary
    def pad4(b):
        pad = (4 - (len(b) % 4)) % 4
        return b + bytearray(pad)

    pos_data_out = pad4(pos_data_out)
    norm_data_out = pad4(norm_data_out)
    uv_data_out = pad4(uv_data_out)
    idx_data_out = pad4(idx_data_out)

    # Layout bufferViews
    # BV 0: positions
    bv0_off = 0
    bv0_len = len(pos_data_out)

    # BV 1: normals
    bv1_off = bv0_off + bv0_len
    bv1_len = len(norm_data_out)

    # BV 2: uvs
    bv2_off = bv1_off + bv1_len
    bv2_len = len(uv_data_out)

    # BV 3: indices
    bv3_off = bv2_off + bv2_len
    bv3_len = len(idx_data_out)

    # BV 4: image
    bv4_off = bv3_off + bv3_len
    bv4_len = len(new_img_bytes)

    total_bin = pos_data_out + norm_data_out + uv_data_out + idx_data_out + bytearray(new_img_bytes)
    total_bin = pad4(total_bin)

    # Update glTF metadata
    pos_acc['count'] = final_vert_count
    pos_acc['min'] = [minX, minY, minZ]
    pos_acc['max'] = [maxX, maxY, maxZ]

    norm_acc['count'] = final_vert_count
    uv_acc['count'] = final_vert_count

    idx_acc['count'] = final_idx_count
    idx_acc['max'] = [final_vert_count - 1]

    # Update bufferViews
    gltf['bufferViews'][0]['byteOffset'] = bv0_off
    gltf['bufferViews'][0]['byteLength'] = bv0_len

    gltf['bufferViews'][1]['byteOffset'] = bv1_off
    gltf['bufferViews'][1]['byteLength'] = bv1_len

    gltf['bufferViews'][2]['byteOffset'] = bv2_off
    gltf['bufferViews'][2]['byteLength'] = bv2_len

    gltf['bufferViews'][3]['byteOffset'] = bv3_off
    gltf['bufferViews'][3]['byteLength'] = bv3_len

    gltf['bufferViews'][4]['byteOffset'] = bv4_off
    gltf['bufferViews'][4]['byteLength'] = bv4_len

    gltf['buffers'][0]['byteLength'] = len(total_bin)

    # Encode JSON
    new_json_str = json.dumps(gltf, separators=(',', ':'))
    while len(new_json_str.encode('utf-8')) % 4 != 0:
        new_json_str += ' '
    new_json_bytes = new_json_str.encode('utf-8')
    new_json_len = len(new_json_bytes)

    new_total_len = 12 + 8 + new_json_len + 8 + len(total_bin)

    out_glb = bytearray()
    out_glb += struct.pack('<III', 0x46546C67, 2, new_total_len)
    out_glb += struct.pack('<II', new_json_len, 0x4E4F534A)
    out_glb += new_json_bytes
    out_glb += struct.pack('<II', len(total_bin), 0x004E4942)
    out_glb += total_bin

    destinations = [
        'public/models/nona_batavia.glb',
        'public/models/nonabatavia_glommy.glb',
        'dist/models/nona_batavia.glb',
        'dist/models/nonabatavia_glommy.glb'
    ]

    for d in destinations:
        with open(d, 'wb') as f_out:
            f_out.write(out_glb)
        print(f'[SAVED] {d} ({len(out_glb)} bytes)')

    print('[SUCCESS] Nona Batavia arms lengthened, feet refined, inner legs & solid underskirt cap added!')

if __name__ == '__main__':
    generate_nona_batavia_complete()
