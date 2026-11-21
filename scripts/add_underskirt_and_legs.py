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

    # Dedicated hair texture swatch for Wolf Cut hair:
    # X from 15 to 145, Y from 855 to 960 (U ≈ 0.015 to 0.142, V ≈ 0.835 to 0.938)
    HAIR_SWATCH_X0, HAIR_SWATCH_X1 = 15, 145
    HAIR_SWATCH_Y0, HAIR_SWATCH_Y1 = 855, 960
    for hy in range(HAIR_SWATCH_Y0, HAIR_SWATCH_Y1):
        v_ratio = (hy - HAIR_SWATCH_Y0) / (HAIR_SWATCH_Y1 - HAIR_SWATCH_Y0)
        sheen = math.exp(-((v_ratio - 0.45) ** 2) / 0.03) * 55.0
        for hx in range(HAIR_SWATCH_X0, HAIR_SWATCH_X1):
            fiber = (math.sin(hx * 1.8) * 0.5 + 0.5) * 20.0
            r = int(min(255, 20 + sheen * 0.7 + fiber * 0.5))
            g = int(min(255, 16 + sheen * 0.6 + fiber * 0.4))
            b = int(min(255, 24 + sheen * 0.8 + fiber * 0.6))
            tex.putpixel((hx, hy), (r, g, b, 255))

    HAIR_UV_ROOT = (25 / 1024.0, 860 / 1024.0)
    HAIR_UV_TIP = (135 / 1024.0, 955 / 1024.0)

    # 1B. Fix Armpits: Replace dark backdrop patches under armpits/shoulders with matching white lace kebaya
    KEBAYA_BASE = (205, 195, 185, 255)
    KEBAYA_SHADE = (180, 168, 158, 255)
    KEBAYA_LACE = (225, 218, 210, 255)

    for y_tex in range(215, 360):
        for x_tex in range(1024):
            c = tex.getpixel((x_tex, y_tex))
            # Dark studio backdrop check (R, G, B all < 70)
            if c[0] < 70 and c[1] < 70 and c[2] < 70:
                is_lace = ((x_tex + y_tex) % 6 < 2) or ((x_tex - y_tex) % 6 == 0)
                is_shade = (x_tex % 4 == 0) or (y_tex % 5 == 0)
                col = KEBAYA_LACE if is_lace else (KEBAYA_SHADE if is_shade else KEBAYA_BASE)
                tex.putpixel((x_tex, y_tex), col)

    # 1C. Creepy Horror Veins on Neck ("Urat-urat di Leher") & Red Sauce Splatters ("Bercak Saus Merah")
    import random
    random.seed(1337)

    overlay = Image.new('RGBA', tex.size, (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)

    # Palette: Zombie Neck Veins
    VEIN_HALO = (36, 48, 55, 120)     # Subcutaneous deoxygenated bluish-teal halo
    VEIN_CORE = (48, 18, 50, 215)     # Deep dark venous purple/black
    VEIN_THIN = (62, 24, 60, 180)     # Thin branching venule

    def draw_vein_tree(start_x, start_y, angle, length, thickness, depth=0):
        if depth > 4 or length < 3:
            return
        cur_x, cur_y = start_x, start_y
        steps = max(3, int(length / 2))
        pts = [(cur_x, cur_y)]
        for _ in range(steps):
            angle += random.uniform(-0.35, 0.35)
            cur_x += math.cos(angle) * (length / steps)
            cur_y += math.sin(angle) * (length / steps)
            pts.append((cur_x, cur_y))

        # Soft halo underneath
        ov_draw.line(pts, fill=(VEIN_HALO[0], VEIN_HALO[1], VEIN_HALO[2], int(120 / (depth + 1))), width=int(thickness + 2))
        # Crisp vein core
        ov_draw.line(pts, fill=(VEIN_CORE[0], VEIN_CORE[1], VEIN_CORE[2], int(210 / (depth * 0.35 + 1))), width=max(1, int(thickness)))

        if depth < 3:
            num_branches = random.choice([1, 2])
            for _ in range(num_branches):
                b_idx = random.randint(len(pts) // 3, len(pts) - 1)
                bx, by = pts[b_idx]
                b_ang = angle + random.choice([-0.72, 0.72]) + random.uniform(-0.25, 0.25)
                draw_vein_tree(bx, by, b_ang, length * random.uniform(0.60, 0.78), max(1, thickness - 1), depth + 1)

    # Front Neck Veins (creeping upwards from under kebaya collar toward jawline)
    # Left jugular/carotid tree
    draw_vein_tree(246, 208, -math.pi * 0.62, 38, 2.5)
    draw_vein_tree(238, 204, -math.pi * 0.55, 30, 2.0)
    draw_vein_tree(248, 192, -math.pi * 0.70, 22, 1.8)
    # Right jugular/carotid tree
    draw_vein_tree(264, 208, -math.pi * 0.38, 38, 2.5)
    draw_vein_tree(272, 204, -math.pi * 0.45, 30, 2.0)
    draw_vein_tree(262, 192, -math.pi * 0.30, 22, 1.8)
    # Center throat creeping venules
    draw_vein_tree(254, 206, -math.pi * 0.50, 32, 1.8)
    draw_vein_tree(256, 185, -math.pi * 0.48, 20, 1.4)

    # Back Neck Veins (creeping up the nape of neck)
    draw_vein_tree(756, 208, -math.pi * 0.58, 34, 2.2)
    draw_vein_tree(770, 208, -math.pi * 0.42, 34, 2.2)
    draw_vein_tree(763, 190, -math.pi * 0.50, 24, 1.6)

    # Palette: Red Sauce / Visceral Splatters
    SAUCE_DARK = (85, 8, 12, 245)      # Deep coagulated crimson
    SAUCE_MID = (155, 18, 22, 235)      # Viscous red sauce
    SAUCE_BRIGHT = (195, 28, 30, 220)   # Fresh highlight
    SAUCE_STAIN = (120, 16, 18, 130)    # Dilute splatter rim

    def draw_splatter(cx, cy, r_base, num_droplets=14, drip_len=0):
        # Organic core with irregular jagged droplet boundaries
        pts = []
        n_pts = 16
        for i in range(n_pts):
            ang = 2 * math.pi * i / n_pts
            r = r_base * random.uniform(0.65, 1.35)
            pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))

        # Outer stain rim
        ov_draw.polygon([(x + random.uniform(-1, 1), y + random.uniform(-1, 1)) for x, y in pts], fill=SAUCE_STAIN)
        # Core body
        ov_draw.polygon(pts, fill=SAUCE_MID)
        # Inner dark coagulated core
        inner = [(cx + (x - cx) * 0.65, cy + (y - cy) * 0.65) for x, y in pts]
        ov_draw.polygon(inner, fill=SAUCE_DARK)

        # Gravitational Drip Trail
        if drip_len > 0:
            drip_pts = [(cx, cy), (cx + random.uniform(-2, 2), cy + drip_len * 0.5), (cx + random.uniform(-1, 1), cy + drip_len)]
            ov_draw.line(drip_pts, fill=SAUCE_MID, width=max(2, int(r_base * 0.4)))
            ov_draw.ellipse([drip_pts[-1][0] - r_base * 0.35, drip_pts[-1][1] - r_base * 0.35,
                             drip_pts[-1][0] + r_base * 0.35, drip_pts[-1][1] + r_base * 0.35], fill=SAUCE_DARK)

        # Radiating Fine Droplets / Mist
        for _ in range(num_droplets):
            ang = random.uniform(0, 2 * math.pi)
            dist = r_base * random.uniform(1.2, 3.2)
            drop_r = random.uniform(0.8, max(1.2, r_base * 0.35))
            dx = cx + dist * math.cos(ang)
            dy = cy + dist * math.sin(ang)
            ov_draw.ellipse([dx - drop_r, dy - drop_r, dx + drop_r, dy + drop_r],
                            fill=random.choice([SAUCE_DARK, SAUCE_MID, SAUCE_BRIGHT]))

    # 1. Mouth Corner & Chin Drips
    draw_splatter(251, 133, 2.5, num_droplets=5, drip_len=16)  # Drip from lips corner down to chin
    draw_splatter(250, 148, 3.2, num_droplets=6, drip_len=24)  # Drip from chin down to throat

    # 2. White Kebaya Chest Splatters (vivid red across white lace)
    draw_splatter(248, 255, 14.0, num_droplets=30, drip_len=54) # Major upper chest splatter
    draw_splatter(275, 285, 10.0, num_droplets=20, drip_len=38) # Right chest splatter
    draw_splatter(228, 290, 8.5, num_droplets=18, drip_len=32)  # Left chest splatter
    draw_splatter(258, 345, 11.5, num_droplets=24, drip_len=46) # Mid-kebaya splatter & drip
    draw_splatter(238, 390, 8.0, num_droplets=16, drip_len=26)  # Lower torso splatter
    draw_splatter(270, 420, 9.0, num_droplets=18, drip_len=30)  # Kebaya hem splatter
    # Back of kebaya
    draw_splatter(760, 290, 10.0, num_droplets=18, drip_len=35)
    draw_splatter(740, 360, 8.0, num_droplets=14, drip_len=25)

    # 3. Arms & Lace Sleeves
    draw_splatter(160, 255, 6.5, num_droplets=12, drip_len=20)
    draw_splatter(345, 255, 6.5, num_droplets=12, drip_len=20)
    draw_splatter(130, 260, 5.0, num_droplets=8, drip_len=14)
    draw_splatter(375, 260, 5.0, num_droplets=8, drip_len=14)

    # 4. Batik Skirt
    draw_splatter(245, 520, 10.5, num_droplets=18, drip_len=36)
    draw_splatter(265, 610, 9.0, num_droplets=14, drip_len=30)
    draw_splatter(230, 680, 7.5, num_droplets=12, drip_len=24)

    # Merge overlay with base texture
    tex = Image.alpha_composite(tex, overlay)

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

        elif y >= 1.405:
            orig_y = orig_positions[i][1]
            orig_z = orig_positions[i][2]
            orig_x = orig_positions[i][0]

            # 1. Leher dipendekin dikit (~1.3 cm smooth compression)
            if orig_y < 1.475:
                t = (orig_y - 1.405) / (1.475 - 1.405)
                st = t * t * (3.0 - 2.0 * t)
                y = orig_y - 0.013 * st
            else:
                y = orig_y - 0.013

            # 2. Dagu sedikit mundur ke belakang (subtle chin setback)
            if 1.470 <= orig_y <= 1.525 and orig_z > 0.02 and abs(orig_x) < 0.045:
                t_y = 1.0 - abs(orig_y - 1.500) / 0.028
                t_y = max(0.0, min(1.0, t_y))
                w_y = t_y * t_y * (3.0 - 2.0 * t_y)

                t_x = 1.0 - abs(orig_x) / 0.042
                t_x = max(0.0, min(1.0, t_x))
                w_x = t_x * t_x * (3.0 - 2.0 * t_x)

                t_z = max(0.0, min(1.0, (orig_z - 0.02) / 0.04))

                weight = w_y * w_x * t_z
                z = orig_z - 0.0085 * weight

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

    # 3. 3D WOLFCUT HAIRSTYLE (Layered Shag Crown, Curtain Bangs, Temple Flicks & Cascading Mullet Tail)
    crown_base_idx = len(new_positions)
    # Apex of hair volume
    new_positions.append((0.0, 1.708, -0.015))
    new_normals.append((0.0, 1.0, 0.0))
    new_uvs.append((HAIR_UV_ROOT[0], HAIR_UV_ROOT[1]))

    crown_segs = 14
    # Ring 1 (Upper Crown dome, Y=1.685)
    for s in range(crown_segs):
        ang = 2 * math.pi * s / crown_segs
        px = 0.055 * math.sin(ang)
        pz = -0.015 + 0.062 * math.cos(ang)
        py = 1.685
        nx, ny, nz = math.sin(ang) * 0.6, 0.8, math.cos(ang) * 0.6
        nlen = math.hypot(nx, ny, nz) or 1.0
        new_positions.append((px, py, pz))
        new_normals.append((nx / nlen, ny / nlen, nz / nlen))
        new_uvs.append((HAIR_UV_ROOT[0] + (HAIR_UV_TIP[0] - HAIR_UV_ROOT[0]) * (s / crown_segs), HAIR_UV_ROOT[1] + 0.02))

    # Ring 2 (Mid Crown shag layer, Y=1.648)
    for s in range(crown_segs):
        ang = 2 * math.pi * s / crown_segs
        px = 0.082 * math.sin(ang)
        pz = -0.018 + 0.090 * math.cos(ang)
        py = 1.648
        nx, ny, nz = math.sin(ang), 0.4, math.cos(ang)
        nlen = math.hypot(nx, ny, nz) or 1.0
        new_positions.append((px, py, pz))
        new_normals.append((nx / nlen, ny / nlen, nz / nlen))
        new_uvs.append((HAIR_UV_ROOT[0] + (HAIR_UV_TIP[0] - HAIR_UV_ROOT[0]) * (s / crown_segs), HAIR_UV_ROOT[1] + 0.05))

    # Fan from apex to ring 1
    for s in range(crown_segs):
        next_s = (s + 1) % crown_segs
        new_indices.extend([crown_base_idx, crown_base_idx + 1 + s, crown_base_idx + 1 + next_s])

    # Quads between ring 1 and ring 2
    r1 = crown_base_idx + 1
    r2 = r1 + crown_segs
    for s in range(crown_segs):
        next_s = (s + 1) % crown_segs
        new_indices.extend([r1 + s, r2 + s, r1 + next_s, r1 + next_s, r2 + s, r2 + next_s])

    # Helper: Multi-segment Wolf Cut Hair Ribbon
    def add_hair_ribbon(points_with_widths):
        ribbon_base = len(new_positions)
        n_pts = len(points_with_widths)
        if n_pts < 2:
            return

        for seg_idx, (x, y, z, w) in enumerate(points_with_widths):
            if seg_idx == 0:
                tx = points_with_widths[1][0] - x
                ty = points_with_widths[1][1] - y
                tz = points_with_widths[1][2] - z
            elif seg_idx == n_pts - 1:
                tx = x - points_with_widths[seg_idx - 1][0]
                ty = y - points_with_widths[seg_idx - 1][1]
                tz = z - points_with_widths[seg_idx - 1][2]
            else:
                tx = points_with_widths[seg_idx + 1][0] - points_with_widths[seg_idx - 1][0]
                ty = points_with_widths[seg_idx + 1][1] - points_with_widths[seg_idx - 1][1]
                tz = points_with_widths[seg_idx + 1][2] - points_with_widths[seg_idx - 1][2]

            tlen = math.hypot(tx, ty, tz) or 1.0
            tx, ty, tz = tx / tlen, ty / tlen, tz / tlen

            nx = x - 0.0
            ny = (y - 1.55) * 0.5
            nz = z - (-0.015)
            nlen = math.hypot(nx, ny, nz) or 1.0
            nx, ny, nz = nx / nlen, ny / nlen, nz / nlen

            bx = ty * nz - tz * ny
            by = tz * nx - tx * nz
            bz = tx * ny - ty * nx
            blen = math.hypot(bx, by, bz) or 1.0
            bx, by, bz = bx / blen, by / blen, bz / blen

            v_prog = seg_idx / (n_pts - 1)
            uv_v = HAIR_UV_ROOT[1] + v_prog * (HAIR_UV_TIP[1] - HAIR_UV_ROOT[1])

            lx = x - bx * (w * 0.5)
            ly = y - by * (w * 0.5)
            lz = z - bz * (w * 0.5)
            new_positions.append((lx, ly, lz))
            new_normals.append((nx, ny, nz))
            new_uvs.append((HAIR_UV_ROOT[0], uv_v))

            rx = x + bx * (w * 0.5)
            ry = y + by * (w * 0.5)
            rz = z + bz * (w * 0.5)
            new_positions.append((rx, ry, rz))
            new_normals.append((nx, ny, nz))
            new_uvs.append((HAIR_UV_TIP[0], uv_v))

        for seg_idx in range(n_pts - 1):
            i0 = ribbon_base + seg_idx * 2
            i1 = ribbon_base + seg_idx * 2 + 1
            i2 = ribbon_base + (seg_idx + 1) * 2
            i3 = ribbon_base + (seg_idx + 1) * 2 + 1
            new_indices.extend([i0, i1, i2, i1, i3, i2])

    # A. Textured Curtain Bangs & Forehead Fringe
    add_hair_ribbon([(-0.006, 1.650, 0.050, 0.022), (-0.025, 1.600, 0.058, 0.026), (-0.046, 1.550, 0.057, 0.024), (-0.058, 1.505, 0.048, 0.014)])
    add_hair_ribbon([(0.006, 1.650, 0.050, 0.022), (0.025, 1.600, 0.058, 0.026), (0.046, 1.550, 0.057, 0.024), (0.058, 1.505, 0.048, 0.014)])
    add_hair_ribbon([(-0.008, 1.640, 0.052, 0.018), (-0.018, 1.595, 0.058, 0.018), (-0.024, 1.560, 0.057, 0.012)])
    add_hair_ribbon([(0.008, 1.640, 0.052, 0.018), (0.018, 1.595, 0.058, 0.018), (0.024, 1.560, 0.057, 0.012)])
    add_hair_ribbon([(0.000, 1.645, 0.053, 0.016), (0.000, 1.605, 0.058, 0.015), (0.002, 1.575, 0.057, 0.010)])

    # B. Cheek & Temple Shag Layers (Choppy flicks framing cheeks and jaw)
    add_hair_ribbon([(-0.065, 1.635, 0.035, 0.025), (-0.085, 1.580, 0.042, 0.028), (-0.096, 1.530, 0.046, 0.024), (-0.100, 1.485, 0.042, 0.014)])
    add_hair_ribbon([(0.065, 1.635, 0.035, 0.025), (0.085, 1.580, 0.042, 0.028), (0.096, 1.530, 0.046, 0.024), (0.100, 1.485, 0.042, 0.014)])
    add_hair_ribbon([(-0.078, 1.590, 0.015, 0.026), (-0.088, 1.520, 0.025, 0.026), (-0.084, 1.455, 0.034, 0.022), (-0.075, 1.405, 0.036, 0.014)])
    add_hair_ribbon([(0.078, 1.590, 0.015, 0.026), (0.088, 1.520, 0.025, 0.026), (0.084, 1.455, 0.034, 0.022), (0.075, 1.405, 0.036, 0.014)])
    add_hair_ribbon([(-0.086, 1.605, -0.010, 0.024), (-0.092, 1.535, -0.005, 0.025), (-0.088, 1.465, 0.008, 0.020), (-0.080, 1.405, 0.015, 0.014)])
    add_hair_ribbon([(0.086, 1.605, -0.010, 0.024), (0.092, 1.535, -0.005, 0.025), (0.088, 1.465, 0.008, 0.020), (0.080, 1.405, 0.015, 0.014)])

    # C. Signature Wolf Cut Mullet Tail & Shoulder Layers (Cascading over collar onto shoulders)
    add_hair_ribbon([(-0.070, 1.600, -0.055, 0.028), (-0.082, 1.515, -0.062, 0.032), (-0.088, 1.425, -0.055, 0.030), (-0.092, 1.350, -0.040, 0.022), (-0.094, 1.300, -0.025, 0.014)])
    add_hair_ribbon([(0.070, 1.600, -0.055, 0.028), (0.082, 1.515, -0.062, 0.032), (0.088, 1.425, -0.055, 0.030), (0.092, 1.350, -0.040, 0.022), (0.094, 1.300, -0.025, 0.014)])
    add_hair_ribbon([(-0.042, 1.610, -0.075, 0.030), (-0.050, 1.520, -0.084, 0.032), (-0.055, 1.430, -0.080, 0.028), (-0.058, 1.350, -0.070, 0.020), (-0.060, 1.295, -0.058, 0.014)])
    add_hair_ribbon([(0.042, 1.610, -0.075, 0.030), (0.050, 1.520, -0.084, 0.032), (0.055, 1.430, -0.080, 0.028), (0.058, 1.350, -0.070, 0.020), (0.060, 1.295, -0.058, 0.014)])
    add_hair_ribbon([(0.000, 1.615, -0.082, 0.032), (0.000, 1.525, -0.090, 0.034), (0.000, 1.435, -0.086, 0.030), (0.000, 1.355, -0.078, 0.022), (0.000, 1.290, -0.068, 0.014)])
    add_hair_ribbon([(-0.022, 1.590, -0.080, 0.026), (-0.028, 1.490, -0.086, 0.028), (-0.032, 1.390, -0.078, 0.022), (-0.034, 1.320, -0.068, 0.014)])
    add_hair_ribbon([(0.022, 1.590, -0.080, 0.026), (0.028, 1.490, -0.086, 0.028), (0.032, 1.390, -0.078, 0.022), (0.034, 1.320, -0.068, 0.014)])

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
