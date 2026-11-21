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

    # 1. Colors & Swatches for Boots & White Socks ("Sepatu Full Item Boots & Kaus Kaki Putih")
    COLOR_BOOT_BLACK = (20, 18, 22, 255)    # Full black sleek leather boot body
    COLOR_BOOT_SOLE = (10, 8, 12, 255)       # Solid black thick rubber boot sole
    COLOR_BOOT_SHADOW = (14, 12, 16, 255)    # Boot welt & deep crease
    COLOR_BOOT_SHINE = (36, 32, 40, 255)     # Subtle dark leather specular highlight (no gold!)
    COLOR_SOCK_WHITE = (242, 242, 246, 255)  # Clean bright white cotton sock
    COLOR_SOCK_SHADE = (208, 208, 215, 255)  # Soft white sock fold & ankle shading
    COLOR_SOLE = COLOR_BOOT_SOLE

    # Paint Full Black Boots with White Socks on feet UV strip
    for col_start, col_end in [(160, 350), (510, 870)]:
        # White socks extending above the boots
        draw.rectangle([col_start, 925, col_end, 955], fill=COLOR_SOCK_WHITE)
        draw.rectangle([col_start + 10, 948, col_end - 10, 955], fill=COLOR_SOCK_SHADE)

        # Full Black Leather Boots (Solid Black, no gold lines!)
        draw.rectangle([col_start, 955, col_end, 995], fill=COLOR_BOOT_BLACK)
        draw.rectangle([col_start, 982, col_end, 995], fill=COLOR_BOOT_SOLE)
        # Subtle dark leather boot seam
        draw.line([col_start, 955, col_end, 955], fill=COLOR_BOOT_SHINE, width=2)
        draw.line([col_start, 982, col_end, 982], fill=COLOR_BOOT_SHADOW, width=1)

    # Dedicated UV pixel areas for legs and underskirt shadow:
    # U=0.05, V=0.98 -> Solid deep dark shadow for underskirt cap
    draw.rectangle([40, 970, 70, 1000], fill=COLOR_BOOT_SOLE)
    # U=0.10, V=0.98 -> White cotton sock tone for inner legs rising into the skirt
    draw.rectangle([90, 970, 120, 1000], fill=COLOR_SOCK_WHITE)

    # Dedicated hair texture swatch for Wolf Cut hair (matching reference photo):
    # X from 15 to 145, Y from 855 to 960 (U ≈ 0.015 to 0.142, V ≈ 0.835 to 0.938)
    HAIR_SWATCH_X0, HAIR_SWATCH_X1 = 15, 145
    HAIR_SWATCH_Y0, HAIR_SWATCH_Y1 = 855, 960
    for hy in range(HAIR_SWATCH_Y0, HAIR_SWATCH_Y1):
        v_ratio = (hy - HAIR_SWATCH_Y0) / (HAIR_SWATCH_Y1 - HAIR_SWATCH_Y0)
        # Smoky ash-brown highlight on mid-lengths and feathered layer tips
        mid_sheen = math.exp(-((v_ratio - 0.48) ** 2) / 0.04) * 45.0
        tip_highlight = math.exp(-((v_ratio - 0.88) ** 2) / 0.02) * 55.0
        for hx in range(HAIR_SWATCH_X0, HAIR_SWATCH_X1):
            fiber = (math.sin(hx * 2.2) * 0.5 + 0.5) * 16.0
            # Charcoal espresso base (24, 20, 26) transitioning to warm ash-brown tips (88, 76, 68)
            base_r = 24 + v_ratio * 30
            base_g = 20 + v_ratio * 26
            base_b = 26 + v_ratio * 22
            r = int(min(255, base_r + mid_sheen * 0.7 + tip_highlight * 0.9 + fiber * 0.4))
            g = int(min(255, base_g + mid_sheen * 0.6 + tip_highlight * 0.8 + fiber * 0.35))
            b = int(min(255, base_b + mid_sheen * 0.5 + tip_highlight * 0.7 + fiber * 0.35))
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
    # Forearms & lower sleeves
    draw_splatter(185, 580, 7.0, num_droplets=10, drip_len=16)
    draw_splatter(320, 580, 7.0, num_droplets=10, drip_len=16)
    draw_splatter(190, 640, 6.0, num_droplets=8, drip_len=12)
    draw_splatter(320, 640, 6.0, num_droplets=8, drip_len=12)

    # 3B. Bloody Hands & Fingers (Tangan & Jari-jari Berdarah)
    # Left Hand (X: 6..54, Y: 712..756)
    ov_draw.rectangle([6, 712, 54, 756], fill=(210, 178, 168, 255))
    draw_splatter(18, 722, 10.0, num_droplets=18, drip_len=15)
    draw_splatter(32, 720, 9.0, num_droplets=16, drip_len=14)
    draw_splatter(44, 725, 8.0, num_droplets=14, drip_len=12)
    draw_splatter(24, 736, 12.0, num_droplets=20, drip_len=16)
    draw_splatter(38, 746, 9.5, num_droplets=16, drip_len=12)

    # Right Hand (X: 456..506, Y: 712..756)
    ov_draw.rectangle([456, 712, 506, 756], fill=(210, 178, 168, 255))
    draw_splatter(494, 722, 10.0, num_droplets=18, drip_len=15)
    draw_splatter(480, 720, 9.0, num_droplets=16, drip_len=14)
    draw_splatter(468, 725, 8.0, num_droplets=14, drip_len=12)
    draw_splatter(484, 736, 12.0, num_droplets=20, drip_len=16)
    draw_splatter(468, 746, 9.5, num_droplets=16, drip_len=12)

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

    # UV Palette Constants (defined upfront to avoid UnboundLocalError)
    LEG_UV = (105 / 1024.0, 985 / 1024.0)   # Clean white cotton sock
    BOOT_UV = (55 / 1024.0, 985 / 1024.0)   # Solid black leather boot
    CAP_UV = (55 / 1024.0, 985 / 1024.0)    # Deep shadow black

    # Identify old shoe vertices (the 242 vertices in disconnected photogrammetry shoe ribbon components)
    orig_tris = [orig_indices[i:i+3] for i in range(0, idx_count, 3)]
    def get_connected(start_v, tris):
        visited = set()
        queue = [start_v]
        while queue:
            curr = queue.pop()
            if curr in visited: continue
            visited.add(curr)
            for t in tris:
                if curr in t:
                    for v in t:
                        if v not in visited:
                            queue.append(v)
        return visited

    all_v = set(range(vert_count))
    unvis = set(all_v)
    shoe_verts = set()
    while unvis:
        start = next(iter(unvis))
        comp = get_connected(start, orig_tris)
        unvis -= comp
        comp_y = [orig_positions[v][1] for v in comp]
        comp_x = [orig_positions[v][0] for v in comp]
        if max(comp_y) <= 0.146 and max(abs(x) for x in comp_x) < 0.15:
            shoe_verts.update(comp)

    print(f'[FILTER] Identified {len(shoe_verts)} old hollow shoe vertices to remove completely.')

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

        if i in shoe_verts:
            # Collapse unreferenced old shoe vertices to origin
            x, y, z = 0.0, 0.0, 0.0
            nx, ny, nz = 0.0, 1.0, 0.0
            new_uvs[i] = CAP_UV

        elif abs(x) >= 0.145 and 0.85 <= y <= 1.45:
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

    # Retain all original triangles EXCEPT the 110 hollow shoe triangles
    new_indices = []
    for t in orig_tris:
        if not any(v in shoe_verts for v in t):
            new_indices.extend(t)
    print(f'[FILTER] Retained {len(new_indices)//3} original body triangles (omitted {len(orig_tris) - len(new_indices)//3} hollow shoe triangles).')

    # B. ADD INNER LEGS (WHITE SOCKS) & UNDERSKIRT SHADOW CAP
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

    # Left & Right Legs (White socks emerging from boot collar y=0.080 up into skirt y=0.320)
    add_leg(-0.065, 0.035, 0.080, 0.320, 0.024, 0.036, segments=8)
    add_leg( 0.065, 0.035, 0.080, 0.320, 0.024, 0.036, segments=8)

    # 2. Solid Watertight 3D Black Boots (Zero holes from any angle!)
    def add_solid_boot(cx, cz=0.038):
        # Ring 0: Sole bottom (y=0.002) - completely closed tread
        r0 = [
            ( 0.000, -0.066), (-0.025, -0.044), (-0.028,  0.015), (-0.025,  0.076),
            ( 0.000,  0.088), ( 0.025,  0.076), ( 0.028,  0.015), ( 0.025, -0.044)
        ]
        # Ring 1: Sole top / welt line (y=0.026) - thick combat sole
        r1 = [
            ( 0.000, -0.064), (-0.023, -0.042), (-0.026,  0.015), (-0.023,  0.074),
            ( 0.000,  0.085), ( 0.023,  0.074), ( 0.026,  0.015), ( 0.023, -0.042)
        ]
        # Ring 2: Vamp mid-level (y=0.056) - closed toe box & heel cup
        r2 = [
            ( 0.000, -0.058), (-0.021, -0.038), (-0.024,  0.015), (-0.020,  0.068),
            ( 0.000,  0.078), ( 0.020,  0.068), ( 0.024,  0.015), ( 0.021, -0.038)
        ]
        # Ring 3: Boot collar (y=0.088) - ankle rim meeting white sock
        r3 = [
            ( 0.000, -0.040), (-0.019, -0.025), (-0.023,  0.005), (-0.018,  0.032),
            ( 0.000,  0.042), ( 0.018,  0.032), ( 0.023,  0.005), ( 0.019, -0.025)
        ]

        base_idx = len(new_positions)

        # Ring 0 vertices
        for dx, dz in r0:
            new_positions.append((cx + dx, 0.002, cz + dz))
            new_normals.append((0.0, -1.0, 0.0))
            new_uvs.append(BOOT_UV)

        # Sole bottom cap fan (completely closes sole bottom)
        sole_c = len(new_positions)
        new_positions.append((cx, 0.002, cz + 0.010))
        new_normals.append((0.0, -1.0, 0.0))
        new_uvs.append(BOOT_UV)
        for i in range(8):
            nxt = (i + 1) % 8
            new_indices.extend([sole_c, base_idx + nxt, base_idx + i])

        # Ring 1 vertices
        r1_base = len(new_positions)
        for dx, dz in r1:
            new_positions.append((cx + dx, 0.026, cz + dz))
            nx = dx; nz = dz - 0.010; nl = math.hypot(nx, nz) or 1.0
            new_normals.append((nx/nl, 0.0, nz/nl))
            new_uvs.append(BOOT_UV)

        # Quads 0 -> 1 (Sole vertical side walls)
        for i in range(8):
            nxt = (i + 1) % 8
            new_indices.extend([base_idx + i, base_idx + nxt, r1_base + nxt,
                                base_idx + i, r1_base + nxt, r1_base + i])

        # Ring 2 vertices
        r2_base = len(new_positions)
        for dx, dz in r2:
            new_positions.append((cx + dx, 0.056, cz + dz))
            nx = dx; nz = dz - 0.010; nl = math.hypot(nx, nz) or 1.0
            new_normals.append((nx/nl, 0.20, nz/nl))
            new_uvs.append(BOOT_UV)

        # Quads 1 -> 2 (Lower upper walls, toe bumper, and heel cup)
        for i in range(8):
            nxt = (i + 1) % 8
            new_indices.extend([r1_base + i, r1_base + nxt, r2_base + nxt,
                                r1_base + i, r2_base + nxt, r2_base + i])

        # Ring 3 vertices
        r3_base = len(new_positions)
        for dx, dz in r3:
            new_positions.append((cx + dx, 0.088, cz + dz))
            nx = dx; nz = dz - 0.005; nl = math.hypot(nx, nz) or 1.0
            new_normals.append((nx/nl, 0.35, nz/nl))
            new_uvs.append(BOOT_UV)

        # Quads 2 -> 3 (Instep slope, closed toe box roof, ankle side walls, and heel counter)
        # All 8 quads fully closed with valid outward-facing triangles
        for i in range(8):
            nxt = (i + 1) % 8
            new_indices.extend([r2_base + i, r2_base + nxt, r3_base + nxt,
                                r2_base + i, r3_base + nxt, r3_base + i])

    add_solid_boot(-0.065, 0.038)
    add_solid_boot( 0.065, 0.038)

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

    # 3. 3D procedural hair ribbons removed (kembali ke rambut aslinya agar wajah tidak tertutup kardus/poligon aneh)
    pass

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
