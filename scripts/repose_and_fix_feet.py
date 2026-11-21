import json
import struct
import math
from PIL import Image, ImageDraw
import numpy as np

def fix_nona_batavia():
    model_path = 'public/models/nona_batavia_backup.glb'
    with open(model_path, 'rb') as f:
        buf = bytearray(f.read())

    magic = int.from_bytes(buf[0:4], 'little')
    version = int.from_bytes(buf[4:8], 'little')
    total_len = int.from_bytes(buf[8:12], 'little')

    json_len = int.from_bytes(buf[12:16], 'little')
    gltf = json.loads(buf[20:20+json_len].decode('utf-8'))

    bin_header_offset = 20 + json_len
    bin_len = int.from_bytes(buf[bin_header_offset:bin_header_offset+4], 'little')
    bin_offset = bin_header_offset + 8

    # 1. Repaint Feet Texture Region to clean, elegant Indonesian kebaya footwear
    # In gltf, texture image is in bufferView 4
    img_meta = gltf['images'][0]
    img_bv = gltf['bufferViews'][img_meta['bufferView']]
    img_start = bin_offset + img_bv.get('byteOffset', 0)
    img_bytes = buf[img_start : img_start + img_bv['byteLength']]

    import io
    tex = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
    w, h = tex.size
    print(f'Original Texture Size: {w}x{h}')

    # The feet texture strip is rows 925 to 990 (v = 0.90 to 0.97)
    # Left foot: cols 160 to 350
    # Right foot: cols 510 to 870
    draw = ImageDraw.Draw(tex)

    # Color palette:
    # Sole/outer shoe: Deep espresso brown / black velvet (traditional selop)
    COLOR_SOLE = (24, 18, 20, 255)
    COLOR_UPPER = (32, 24, 26, 255)
    # Instep / toes: Smooth, natural fair skin tone (matching her face & neck)
    COLOR_SKIN = (226, 178, 152, 255)
    COLOR_SKIN_SHADE = (205, 156, 132, 255)
    # Gold decorative strap/trim:
    COLOR_GOLD = (185, 142, 65, 255)
    COLOR_GOLD_LIGHT = (215, 172, 85, 255)

    # Cleanly paint Left Foot Texture region (cols 160 to 350, rows 925 to 990)
    for col_start, col_end in [(160, 350), (510, 870)]:
        # 1. Base sole & leather underlayer
        draw.rectangle([col_start, 925, col_end, 990], fill=COLOR_SOLE)

        # 2. Smooth skin-tone for instep / toes (upper half of strip)
        draw.rectangle([col_start + 10, 930, col_end - 10, 955], fill=COLOR_SKIN)

        # Subtle natural gradient on skin
        draw.rectangle([col_start + 15, 948, col_end - 15, 958], fill=COLOR_SKIN_SHADE)

        # 3. Elegant traditional selop velvet upper vamp
        draw.rectangle([col_start + 5, 958, col_end - 5, 982], fill=COLOR_UPPER)

        # 4. Golden filigree trim border
        draw.line([col_start + 5, 958, col_end - 5, 958], fill=COLOR_GOLD_LIGHT, width=2)
        draw.line([col_start + 5, 970, col_end - 5, 970], fill=COLOR_GOLD, width=1)
        draw.line([col_start + 5, 982, col_end - 5, 982], fill=COLOR_GOLD, width=2)

    # Save repainted texture to PNG bytes
    out_img_io = io.BytesIO()
    tex.save(out_img_io, format='PNG')
    new_img_bytes = out_img_io.getvalue()
    print(f'Repainted Texture PNG size: {len(new_img_bytes)} bytes')

    # Accessors
    pos_acc = gltf['accessors'][0]
    pos_bv = gltf['bufferViews'][pos_acc['bufferView']]
    pos_off = pos_bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)

    norm_acc = gltf['accessors'][1]
    norm_bv = gltf['bufferViews'][norm_acc['bufferView']]
    norm_off = norm_bv.get('byteOffset', 0) + norm_acc.get('byteOffset', 0)

    # Read binary buffer
    bin_buf = bytearray(buf[bin_offset : bin_offset + bin_len])

    vert_count = pos_acc['count']
    print(f'Modifying {vert_count} vertices for longer arms & refined feet...')

    # Arm parameters (50% longer arms reaching mid-thigh!)
    pY = 1.340
    origElbowDist = 0.174
    upperScale = 1.48  # 48% longer upper arm
    newElbowDist = origElbowDist * upperScale # 0.2575m
    forearmScale = 1.58 # 58% longer forearm & hand

    angleDown = 70 * (math.pi / 180)
    angleFwd = 7 * (math.pi / 180)
    fAngleDown = 76 * (math.pi / 180)
    fAngleFwd = 18 * (math.pi / 180)

    minX, maxX = float('inf'), float('-inf')
    minY, maxY = float('inf'), float('-inf')
    minZ, maxZ = float('inf'), float('-inf')

    arm_count = 0
    feet_count = 0
    skirt_hem_count = 0

    for i in range(vert_count):
        o_p = pos_off + i * 12
        o_n = norm_off + i * 12

        x, y, z = struct.unpack('<fff', bin_buf[o_p:o_p+12])
        nx, ny, nz = struct.unpack('<fff', bin_buf[o_n:o_n+12])

        # A. ARMS: Lengthen and lower naturally
        if abs(x) >= 0.145 and 0.85 <= y <= 1.45:
            arm_count += 1
            is_left = x < 0
            sign = -1.0 if is_left else 1.0
            pX = sign * 0.155

            dx_orig = (x - pX) * sign
            dy = y - pY
            dz = z

            if dx_orig <= origElbowDist:
                # Upper arm: stretched along its bone length by upperScale
                scaled_dx = dx_orig * upperScale

                x1 = scaled_dx * math.cos(-angleDown) - dy * math.sin(-angleDown)
                y1 = scaled_dx * math.sin(-angleDown) + dy * math.cos(-angleDown)
                z1 = dz

                rx = x1 * math.cos(angleFwd) - z1 * math.sin(angleFwd)
                ry = y1
                rz = x1 * math.sin(angleFwd) + z1 * math.cos(angleFwd)

                # Normals
                nx1 = (nx * sign) * math.cos(-angleDown) - ny * math.sin(-angleDown)
                ny1 = (nx * sign) * math.sin(-angleDown) + ny * math.cos(-angleDown)
                nz1 = nz

                rnx = (nx1 * math.cos(angleFwd) - nz1 * math.sin(angleFwd)) * sign
                rny = ny1
                rnz = nx1 * math.sin(angleFwd) + nz1 * math.cos(angleFwd)
            else:
                # Elbow position
                ex1 = newElbowDist * math.cos(-angleDown)
                ey1 = newElbowDist * math.sin(-angleDown)
                ex = ex1 * math.cos(angleFwd)
                ey = ey1
                ez = ex1 * math.sin(angleFwd)

                # Forearm & hand: stretched along bone length by forearmScale
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

                # Normals
                fnx1 = (nx * sign) * math.cos(-fAngleDown) - ny * math.sin(-fAngleDown)
                fny1 = (nx * sign) * math.sin(-fAngleDown) + ny * math.cos(-fAngleDown)
                fnz1 = nz

                rnx = (fnx1 * math.cos(fAngleFwd) - fnz1 * math.sin(fAngleFwd)) * sign
                rny = fny1
                rnz = fnx1 * math.sin(fAngleFwd) + fnz1 * math.cos(fAngleFwd)

            # Smoothstep blend at shoulder socket
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

        # B. FEET & SANDALS: Ground soles to y = 0.002, refine width & center stance
        elif y < 0.144:
            feet_count += 1
            is_left = x < 0

            # 1. Vertical grounding: Sole touches ground at y = 0.002
            # Original: y in [0.0534, 0.145] -> height 0.092m
            # New: y in [0.002, 0.098]
            y_norm = max(0.0, (y - 0.0534) / (0.145 - 0.0534))
            y = 0.002 + y_norm * 0.096

            # 2. Horizontal stance & width refinement:
            # Elegant female feet under formal batik kebaya:
            # Center left foot at X = -0.048, right foot at X = +0.048
            # Scale foot width by 0.62 (refining 14cm wide flipper to neat 8.5cm foot)
            target_cx = -0.048 if is_left else 0.048
            orig_cx = -0.098 if is_left else 0.098

            x_offset = (x - orig_cx) * 0.62
            x = target_cx + x_offset

            # 3. Gentle forward alignment (reduce excessive turnout splay)
            # z remains natural: heel at z ≈ -0.06, toes at z ≈ +0.12
            z = z * 0.95 + 0.005

        # C. SKIRT HEM: Lower the skirt drape smoothly to meet ankles at y ≈ 0.095
        elif 0.144 <= y <= 0.148:
            skirt_hem_count += 1
            # Lower the bottom edge of the skirt so it flows gracefully down to the ankles
            y = 0.098

        minX = min(minX, x); maxX = max(maxX, x)
        minY = min(minY, y); maxY = max(maxY, y)
        minZ = min(minZ, z); maxZ = max(maxZ, z)

        bin_buf[o_p:o_p+12] = struct.pack('<fff', x, y, z)
        bin_buf[o_n:o_n+12] = struct.pack('<fff', nx, ny, nz)

    print(f'Transformed: {arm_count} arm verts, {feet_count} feet verts, {skirt_hem_count} skirt hem verts.')
    print(f'New Bounds: X [{minX:.3f}, {maxX:.3f}], Y [{minY:.3f}, {maxY:.3f}], Z [{minZ:.3f}, {maxZ:.3f}]')

    pos_acc['min'] = [minX, minY, minZ]
    pos_acc['max'] = [maxX, maxY, maxZ]

    # Replace image bufferView
    img_bv_offset = img_bv.get('byteOffset', 0)
    old_img_len = img_bv['byteLength']
    new_img_len = len(new_img_bytes)

    # Assemble new binary chunk
    # The image is at the end of the binary chunk (bufferView 4)
    prefix_bin = bin_buf[:img_bv_offset]
    new_bin = bytearray(prefix_bin) + bytearray(new_img_bytes)

    # Pad binary chunk to 4-byte boundary
    pad_len = (4 - (len(new_bin) % 4)) % 4
    new_bin += bytearray(pad_len)

    # Update bufferView 4 byteLength and buffer 0 byteLength
    img_bv['byteLength'] = new_img_len
    gltf['buffers'][0]['byteLength'] = len(new_bin)

    new_json_str = json.dumps(gltf, separators=(',', ':'))
    # Pad json chunk to 4-byte boundary with spaces
    while len(new_json_str.encode('utf-8')) % 4 != 0:
        new_json_str += ' '
    new_json_bytes = new_json_str.encode('utf-8')
    new_json_len = len(new_json_bytes)

    new_total_len = 12 + 8 + new_json_len + 8 + len(new_bin)

    out_glb = bytearray()
    out_glb += struct.pack('<III', 0x46546C67, 2, new_total_len)
    out_glb += struct.pack('<II', new_json_len, 0x4E4F534A)
    out_glb += new_json_bytes
    out_glb += struct.pack('<II', len(new_bin), 0x004E4942)
    out_glb += new_bin

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

    print('[ALL DONE] Nona Batavia arms lengthened & feet beautifully fixed!')

if __name__ == '__main__':
    fix_nona_batavia()
