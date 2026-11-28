"""
Generator for Priority 1 Modular NYC Building .glb (glTF 2.0 Binary) Assets.
Outputs to public/models/:
  - nyc_brownstone.glb
  - nyc_apartment_brick.glb
  - nyc_skyscraper_glass.glb
  - nyc_storefront_corner.glb
"""
import io
import json
import math
import os
import struct
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "models")
os.makedirs(OUT_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Procedural High-Detail Texture Generators (PIL + NumPy)
# ---------------------------------------------------------------------------
def _img_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def make_brick_texture(base_rgb=(118, 54, 42), mortar_rgb=(155, 148, 138), size=512, seed=42) -> bytes:
    rng = np.random.default_rng(seed)
    img = Image.new("RGB", (size, size), mortar_rgb)
    draw = ImageDraw.Draw(img)
    rows = 24
    cols = 10
    bh = size / rows
    bw = size / cols
    for r in range(rows):
        offset = (bw * 0.5) if (r % 2 == 1) else 0
        for c in range(-1, cols + 1):
            x0 = c * bw + offset + 2
            y0 = r * bh + 2
            x1 = x0 + bw - 4
            y1 = y0 + bh - 4
            jitter = rng.integers(-18, 19, size=3)
            col = tuple(int(np.clip(base_rgb[i] + jitter[i], 15, 240)) for i in range(3))
            draw.rectangle([x0, y0, x1, y1], fill=col)

    arr = np.array(img, dtype=np.float32)
    # Grime & weathering noise
    noise = rng.normal(0, 10, (size, size, 1))
    # Subtle vertical rain streaks
    streak = rng.normal(0, 6, (1, size, 1))
    arr = np.clip(arr + noise + streak, 0, 255).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_brownstone_texture(size=512, seed=7) -> bytes:
    rng = np.random.default_rng(seed)
    img = Image.new("RGB", (size, size), (82, 58, 48))
    draw = ImageDraw.Draw(img)
    rows = 14
    cols = 6
    bh = size / rows
    bw = size / cols
    for r in range(rows):
        offset = (bw * 0.5) if (r % 2 == 1) else 0
        for c in range(-1, cols + 1):
            x0 = c * bw + offset + 2
            y0 = r * bh + 2
            x1 = x0 + bw - 3
            y1 = y0 + bh - 3
            v = int(rng.integers(-12, 13))
            col = (98 + v, 68 + v, 56 + v)
            draw.rectangle([x0, y0, x1, y1], fill=col)
            draw.line([x0, y0, x1, y0], fill=(122 + v, 88 + v, 72 + v), width=2)

    arr = np.array(img, dtype=np.float32)
    noise = rng.normal(0, 7, (size, size, 1))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_stone_trim_texture(base_rgb=(142, 136, 126), size=256, seed=11) -> bytes:
    rng = np.random.default_rng(seed)
    arr = np.full((size, size, 3), base_rgb, dtype=np.float32)
    arr += rng.normal(0, 9, (size, size, 1))
    arr = np.clip(arr, 20, 245).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_glass_window_texture(lit_ratio=0.35, size=256, seed=99) -> bytes:
    rng = np.random.default_rng(seed)
    img = Image.new("RGB", (size, size), (22, 32, 46))
    draw = ImageDraw.Draw(img)
    # Sky/city reflection gradient
    for y in range(size):
        t = y / size
        r = int(28 + 26 * (1 - t))
        g = int(42 + 34 * (1 - t))
        b = int(60 + 42 * (1 - t))
        draw.line([0, y, size, y], fill=(r, g, b))
    # Interior blinds / warm glow strips
    if rng.random() < lit_ratio:
        glow_h = int(size * 0.65)
        draw.rectangle([10, 12, size - 10, glow_h], fill=(225, 185, 115))
    # Venetian blind horizontal lines
    for y in range(8, size // 2, 10):
        draw.line([4, y, size - 4, y], fill=(18, 24, 34), width=2)
    # Cross sash bars
    draw.rectangle([size // 2 - 4, 0, size // 2 + 4, size], fill=(30, 28, 26))
    draw.rectangle([0, size // 2 - 4, size, size // 2 + 4], fill=(30, 28, 26))
    return _img_to_png_bytes(img)


def make_skyscraper_curtain_texture(size=512, seed=21) -> bytes:
    rng = np.random.default_rng(seed)
    img = Image.new("RGB", (size, size), (18, 26, 36))
    draw = ImageDraw.Draw(img)
    cols, rows = 8, 12
    cw, rh = size / cols, size / rows
    for r in range(rows):
        row_lit = rng.random() < 0.42
        for c in range(cols):
            x0, y0 = c * cw + 3, r * rh + 4
            x1, y1 = (c + 1) * cw - 3, (r + 1) * rh - 4
            if row_lit and rng.random() < 0.55:
                col = (int(rng.integers(170, 235)), int(rng.integers(155, 205)), int(rng.integers(95, 145)))
            else:
                v = int(rng.integers(24, 52))
                col = (v, v + 14, v + 28)
            draw.rectangle([x0, y0, x1, y1], fill=col)
            # Diagonal reflection sheen
            draw.line([x0 + 4, y0 + 4, x1 - 6, y1 - 6], fill=(min(255, col[0] + 22), min(255, col[1] + 24), min(255, col[2] + 30)), width=2)
    return _img_to_png_bytes(img)


def make_awning_texture(color1=(135, 24, 28), color2=(215, 208, 195), size=256) -> bytes:
    img = Image.new("RGB", (size, size), color1)
    draw = ImageDraw.Draw(img)
    stripes = 12
    sw = size / stripes
    for i in range(stripes):
        col = color1 if i % 2 == 0 else color2
        draw.rectangle([i * sw, 0, (i + 1) * sw, size], fill=col)
    # Grime at bottom edge
    for y in range(int(size * 0.78), size):
        alpha = (y - size * 0.78) / (size * 0.22)
        for x in range(size):
            r, g, b = img.getpixel((x, y))
            f = 1.0 - 0.35 * alpha
            img.putpixel((x, y), (int(r * f), int(g * f), int(b * f)))
    return _img_to_png_bytes(img)


def make_wood_door_texture(size=256) -> bytes:
    img = Image.new("RGB", (size, size), (68, 38, 22))
    draw = ImageDraw.Draw(img)
    # Recessed door panels
    for py in [(24, 112), (132, 226)]:
        for px in [(24, 116), (140, 232)]:
            draw.rectangle([px[0], py[0], px[1], py[1]], outline=(42, 22, 12), fill=(82, 46, 26), width=5)
    # Brass doorknob
    draw.ellipse([210, 122, 226, 138], fill=(205, 170, 75))
    return _img_to_png_bytes(img)


def make_snow_texture(size=256, seed=5) -> bytes:
    rng = np.random.default_rng(seed)
    arr = np.full((size, size, 3), (222, 230, 240), dtype=np.float32)
    arr += rng.normal(0, 7, (size, size, 1))
    arr = np.clip(arr, 185, 250).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_sign_texture(text="BODEGA & DELI", bg=(24, 18, 22), fg=(255, 210, 95), size=(512, 128)) -> bytes:
    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)
    draw.rectangle([4, 4, size[0] - 5, size[1] - 5], outline=fg, width=4)
    # Draw crisp blocky lettering
    w, h = size
    n = len(text)
    margin = 24
    cw = (w - 2 * margin) / max(n, 1)
    for i, ch in enumerate(text):
        if ch == " ":
            continue
        cx = margin + i * cw + cw * 0.15
        cy = h * 0.25
        bw = cw * 0.7
        bh = h * 0.5
        draw.rectangle([cx, cy, cx + bw, cy + bh], outline=fg, width=4)
        draw.line([cx + 4, cy + bh * 0.5, cx + bw - 4, cy + bh * 0.5], fill=fg, width=3)
    return _img_to_png_bytes(img)


# ---------------------------------------------------------------------------
# Minimal Pure-Python glTF 2.0 (.glb) Builder
# ---------------------------------------------------------------------------
class GLBBuilder:
    def __init__(self):
        self.materials = []      # list of dict
        self.images = []         # list of bytes (PNG)
        self.textures = []       # list of image index
        self.primitives = {}     # mat_idx -> {pos:[], norm:[], uv:[], idx:[]}

    def add_material(self, name, png_bytes=None, base_color=(1, 1, 1, 1),
                     roughness=0.85, metallic=0.05, emissive=(0, 0, 0)):
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": list(base_color),
                "roughnessFactor": roughness,
                "metallicFactor": metallic,
            },
            "emissiveFactor": list(emissive),
        }
        if png_bytes is not None:
            img_idx = len(self.images)
            self.images.append(png_bytes)
            tex_idx = len(self.textures)
            self.textures.append(img_idx)
            mat["pbrMetallicRoughness"]["baseColorTexture"] = {"index": tex_idx}
        idx = len(self.materials)
        self.materials.append(mat)
        self.primitives[idx] = {"pos": [], "norm": [], "uv": [], "idx": []}
        return idx

    def add_box(self, mat_idx, cx, cy, cz, sx, sy, sz, uv_scale=1.0):
        """Add an axis-aligned box centered at (cx, cy, cz) with dimensions (sx, sy, sz)."""
        hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
        p = self.primitives[mat_idx]
        base_v = len(p["pos"]) // 3

        # 6 faces: (normal, 4 corners CCW, u_dim, v_dim)
        faces = [
            ((0, 0, 1),  [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)], sx, sy),   # +Z front
            ((0, 0, -1), [(hx, -hy, -hz), (-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz)], sx, sy), # -Z back
            ((1, 0, 0),  [(hx, -hy, hz), (hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz)], sz, sy),   # +X right
            ((-1, 0, 0), [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)], sz, sy), # -X left
            ((0, 1, 0),  [(-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz), (-hx, hy, -hz)], sx, sz),   # +Y top
            ((0, -1, 0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)], sx, sz), # -Y bottom
        ]
        uvs = [(0, 1), (1, 1), (1, 0), (0, 0)]
        for n, corners, ud, vd in faces:
            v_start = len(p["pos"]) // 3
            for (vx, vy, vz), (u, v) in zip(corners, uvs):
                p["pos"].extend([cx + vx, cy + vy, cz + vz])
                p["norm"].extend(n)
                p["uv"].extend([u * ud * uv_scale, v * vd * uv_scale])
            p["idx"].extend([v_start, v_start + 1, v_start + 2, v_start, v_start + 2, v_start + 3])

    def add_box_unit_uv(self, mat_idx, cx, cy, cz, sx, sy, sz):
        """Box where every face maps [0..1]x[0..1] (ideal for windows, doors, signs)."""
        hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
        p = self.primitives[mat_idx]
        faces = [
            ((0, 0, 1),  [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]),
            ((0, 0, -1), [(hx, -hy, -hz), (-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz)]),
            ((1, 0, 0),  [(hx, -hy, hz), (hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz)]),
            ((-1, 0, 0), [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)]),
            ((0, 1, 0),  [(-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz), (-hx, hy, -hz)]),
            ((0, -1, 0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)]),
        ]
        uvs = [(0, 1), (1, 1), (1, 0), (0, 0)]
        for n, corners in faces:
            v_start = len(p["pos"]) // 3
            for (vx, vy, vz), (u, v) in zip(corners, uvs):
                p["pos"].extend([cx + vx, cy + vy, cz + vz])
                p["norm"].extend(n)
                p["uv"].extend([u, v])
            p["idx"].extend([v_start, v_start + 1, v_start + 2, v_start, v_start + 2, v_start + 3])

    def add_cylinder(self, mat_idx, cx, cy, cz, radius, height, segments=10):
        p = self.primitives[mat_idx]
        hy = height * 0.5
        for i in range(segments):
            a0 = 2 * math.pi * i / segments
            a1 = 2 * math.pi * (i + 1) / segments
            x0, z0 = math.cos(a0) * radius, math.sin(a0) * radius
            x1, z1 = math.cos(a1) * radius, math.sin(a1) * radius
            nx, nz = math.cos((a0 + a1) * 0.5), math.sin((a0 + a1) * 0.5)
            vs = len(p["pos"]) // 3
            p["pos"].extend([
                cx + x0, cy - hy, cz + z0,
                cx + x1, cy - hy, cz + z1,
                cx + x1, cy + hy, cz + z1,
                cx + x0, cy + hy, cz + z0,
            ])
            p["norm"].extend([nx, 0, nz] * 4)
            p["uv"].extend([i / segments, 1, (i + 1) / segments, 1, (i + 1) / segments, 0, i / segments, 0])
            p["idx"].extend([vs, vs + 1, vs + 2, vs, vs + 2, vs + 3])

    def export(self, filepath: str):
        bin_buf = bytearray()
        buffer_views = []
        accessors = []
        gltf_primitives = []

        def append_bytes(raw: bytes, target=None):
            # 4-byte alignment
            pad = (4 - (len(bin_buf) % 4)) % 4
            bin_buf.extend(b"\x00" * pad)
            offset = len(bin_buf)
            bin_buf.extend(raw)
            bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw)}
            if target is not None:
                bv["target"] = target
            bv_idx = len(buffer_views)
            buffer_views.append(bv)
            return bv_idx

        # Pack images first
        gltf_images = []
        for png in self.images:
            bv_idx = append_bytes(png)
            gltf_images.append({"bufferView": bv_idx, "mimeType": "image/png"})

        # Pack geometry primitives per material
        for mat_idx, geom in self.primitives.items():
            if not geom["idx"]:
                continue
            pos_arr = np.array(geom["pos"], dtype=np.float32)
            norm_arr = np.array(geom["norm"], dtype=np.float32)
            uv_arr = np.array(geom["uv"], dtype=np.float32)
            idx_arr = np.array(geom["idx"], dtype=np.uint32)

            pos_reshaped = pos_arr.reshape(-1, 3)
            pmin = pos_reshaped.min(axis=0).tolist()
            pmax = pos_reshaped.max(axis=0).tolist()

            bv_pos = append_bytes(pos_arr.tobytes(), 34962)
            acc_pos = len(accessors)
            accessors.append({
                "bufferView": bv_pos, "componentType": 5126,
                "count": len(pos_reshaped), "type": "VEC3",
                "min": pmin, "max": pmax
            })

            bv_norm = append_bytes(norm_arr.tobytes(), 34962)
            acc_norm = len(accessors)
            accessors.append({
                "bufferView": bv_norm, "componentType": 5126,
                "count": len(pos_reshaped), "type": "VEC3"
            })

            bv_uv = append_bytes(uv_arr.tobytes(), 34962)
            acc_uv = len(accessors)
            accessors.append({
                "bufferView": bv_uv, "componentType": 5126,
                "count": len(pos_reshaped), "type": "VEC2"
            })

            bv_idx = append_bytes(idx_arr.tobytes(), 34963)
            acc_idx = len(accessors)
            accessors.append({
                "bufferView": bv_idx, "componentType": 5125,
                "count": len(idx_arr), "type": "SCALAR"
            })

            gltf_primitives.append({
                "attributes": {"POSITION": acc_pos, "NORMAL": acc_norm, "TEXCOORD_0": acc_uv},
                "indices": acc_idx,
                "material": mat_idx
            })

        # Pad binary buffer to 4 bytes
        while len(bin_buf) % 4 != 0:
            bin_buf.append(0)

        gltf = {
            "asset": {"version": "2.0", "generator": "ColdBloodZombie-NYC-GLB-Builder"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"mesh": 0, "name": os.path.basename(filepath)}],
            "meshes": [{"primitives": gltf_primitives}],
            "materials": self.materials,
            "textures": [{"sampler": 0, "source": i} for i in self.textures],
            "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
            "images": gltf_images,
            "accessors": accessors,
            "bufferViews": buffer_views,
            "buffers": [{"byteLength": len(bin_buf)}],
        }
        if not gltf_images:
            del gltf["images"]
            del gltf["textures"]
            del gltf["samplers"]

        json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        while len(json_bytes) % 4 != 0:
            json_bytes += b" "

        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_buf)
        with open(filepath, "wb") as f:
            # GLB header: magic, version 2, totalLength
            f.write(struct.pack("<III", 0x46546C67, 2, total_len))
            # JSON chunk
            f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
            f.write(json_bytes)
            # BIN chunk
            f.write(struct.pack("<II", len(bin_buf), 0x004E4942))
            f.write(bin_buf)
        print(f"[GLB] Exported {filepath} ({total_len / 1024:.1f} KB, {len(gltf_primitives)} mat-primitives)")


# ---------------------------------------------------------------------------
# 1. nyc_brownstone.glb (10m W x 10m D x ~11.8m H)
# ---------------------------------------------------------------------------
def build_brownstone():
    g = GLBBuilder()
    m_stone = g.add_material("brownstone", make_brownstone_texture(), roughness=0.88, metallic=0.04)
    m_trim = g.add_material("limestone_trim", make_stone_trim_texture((125, 114, 104)), roughness=0.9)
    m_win_lit = g.add_material("win_lit", make_glass_window_texture(0.9, seed=1), roughness=0.25, metallic=0.35, emissive=(0.18, 0.14, 0.08))
    m_win_dark = g.add_material("win_dark", make_glass_window_texture(0.0, seed=2), roughness=0.22, metallic=0.4)
    m_door = g.add_material("wood_door", make_wood_door_texture(), roughness=0.72)
    m_iron = g.add_material("wrought_iron", base_color=(0.08, 0.08, 0.09, 1), roughness=0.5, metallic=0.75)
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    W, D, H = 10.0, 10.0, 11.2
    # Main body & rusticated base
    g.add_box(m_trim, 0, 0.9, 0, W + 0.15, 1.8, D + 0.15, uv_scale=0.3)
    g.add_box(m_stone, 0, 1.8 + (H - 1.8) * 0.5, 0, W, H - 1.8, D, uv_scale=0.28)

    # Front Stoop (right side x = +2.6, front +Z)
    sx = 2.6
    for step in range(6):
        sy = 0.14 + step * 0.28
        sz = 5.0 + (6 - step) * 0.36
        g.add_box(m_trim, sx, sy, sz, 2.2, 0.28, 0.40, uv_scale=0.5)
    # Stoop landing & cheek walls
    g.add_box(m_trim, sx, 1.82, 5.45, 2.4, 0.28, 0.95, uv_scale=0.5)
    g.add_box(m_trim, sx - 1.15, 1.15, 6.1, 0.24, 2.1, 2.2, uv_scale=0.4)
    g.add_box(m_trim, sx + 1.15, 1.15, 6.1, 0.24, 2.1, 2.2, uv_scale=0.4)
    # Iron handrails
    g.add_box(m_iron, sx - 1.15, 2.45, 5.8, 0.08, 0.08, 2.0)
    g.add_box(m_iron, sx + 1.15, 2.45, 5.8, 0.08, 0.08, 2.0)

    # Recessed front entry door + transom + surround
    g.add_box(m_trim, sx, 3.05, 5.08, 1.8, 2.6, 0.22, uv_scale=0.5)
    g.add_box_unit_uv(m_door, sx, 2.95, 5.02, 1.25, 2.2, 0.16)

    # Window bays: 3 columns x 3 floors (floor 1 skips stoop column)
    col_xs = [-3.0, -0.3, 2.6]
    floor_ys = [3.1, 6.1, 9.0]
    for fi, fy in enumerate(floor_ys):
        for ci, wx in enumerate(col_xs):
            if fi == 0 and ci == 2:
                continue
            mat_w = m_win_lit if ((fi + ci) % 2 == 0) else m_win_dark
            # Lintel & sill
            g.add_box(m_trim, wx, fy + 1.08, 5.10, 1.58, 0.22, 0.24, uv_scale=0.5)
            g.add_box(m_trim, wx, fy - 1.05, 5.12, 1.62, 0.18, 0.28, uv_scale=0.5)
            # Side jambs
            g.add_box(m_trim, wx - 0.72, fy, 5.06, 0.16, 1.96, 0.16, uv_scale=0.5)
            g.add_box(m_trim, wx + 0.72, fy, 5.06, 0.16, 1.96, 0.16, uv_scale=0.5)
            # Glass pane
            g.add_box_unit_uv(mat_w, wx, fy, 5.01, 1.28, 1.88, 0.10)

    # Ornate Roof Cornice + Dentil Brackets + Snow Cap + Chimney
    g.add_box(m_trim, 0, H + 0.22, 0.18, W + 0.55, 0.45, D + 0.65, uv_scale=0.4)
    for bx in np.linspace(-4.5, 4.5, 11):
        g.add_box(m_trim, float(bx), H - 0.12, 5.18, 0.22, 0.28, 0.30, uv_scale=0.5)
    g.add_box(m_snow, 0, H + 0.50, 0.18, W + 0.50, 0.12, D + 0.60, uv_scale=0.3)
    g.add_box(m_stone, -3.2, H + 1.0, -2.5, 1.1, 1.4, 1.1, uv_scale=0.4)

    g.export(os.path.join(OUT_DIR, "nyc_brownstone.glb"))


# ---------------------------------------------------------------------------
# 2. nyc_apartment_brick.glb (14m W x 12m D x ~20.5m H)
# ---------------------------------------------------------------------------
def build_apartment_brick():
    g = GLBBuilder()
    m_brick = g.add_material("red_brick", make_brick_texture((122, 52, 40)), roughness=0.88)
    m_trim = g.add_material("stone_trim", make_stone_trim_texture((138, 132, 124)), roughness=0.9)
    m_win_lit = g.add_material("win_lit", make_glass_window_texture(0.9, seed=14), roughness=0.24, metallic=0.35, emissive=(0.16, 0.13, 0.07))
    m_win_dark = g.add_material("win_dark", make_glass_window_texture(0.0, seed=15), roughness=0.22, metallic=0.4)
    m_awning = g.add_material("awning", make_awning_texture((128, 22, 26), (218, 210, 198)), roughness=0.85)
    m_sign = g.add_material("shop_sign", make_sign_texture("DELI & MARKET"), roughness=0.4, emissive=(0.28, 0.22, 0.10))
    m_iron = g.add_material("fire_escape_iron", base_color=(0.07, 0.08, 0.09, 1), roughness=0.48, metallic=0.8)
    m_wood = g.add_material("water_tank_wood", base_color=(0.35, 0.24, 0.16, 1), roughness=0.88)
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    W, D, H = 14.0, 12.0, 19.6
    # Ground floor storefront base + brick upper shaft
    g.add_box(m_trim, 0, 2.0, 0, W + 0.1, 4.0, D + 0.1, uv_scale=0.25)
    g.add_box(m_brick, 0, 4.0 + (H - 4.0) * 0.5, 0, W, H - 4.0, D, uv_scale=0.22)

    # Storefront display windows, awning & sign on +Z
    for wx in [-4.2, 4.2]:
        g.add_box_unit_uv(m_win_lit, wx, 1.85, 6.06, 3.4, 2.4, 0.12)
    g.add_box_unit_uv(m_win_dark, 0.0, 1.75, 6.04, 2.0, 2.8, 0.12)  # glass entry door
    g.add_box_unit_uv(m_awning, 0.0, 3.35, 6.75, 12.4, 0.65, 1.45)
    g.add_box(m_snow, 0.0, 3.72, 6.75, 12.3, 0.10, 1.40, uv_scale=0.3)
    g.add_box_unit_uv(m_sign, 0.0, 4.15, 6.18, 8.6, 0.85, 0.22)

    # Upper 4 residential floors (4 windows across)
    col_xs = [-4.6, -1.6, 1.6, 4.6]
    floor_ys = [6.2, 9.6, 13.0, 16.4]
    for fi, fy in enumerate(floor_ys):
        # Belt course between floors
        g.add_box(m_trim, 0, fy - 1.55, 0, W + 0.18, 0.22, D + 0.18, uv_scale=0.3)
        for ci, wx in enumerate(col_xs):
            mat_w = m_win_lit if ((fi * 3 + ci) % 3 == 0) else m_win_dark
            g.add_box(m_trim, wx, fy + 1.05, 6.08, 1.65, 0.22, 0.22, uv_scale=0.4)
            g.add_box(m_trim, wx, fy - 1.02, 6.10, 1.68, 0.18, 0.26, uv_scale=0.4)
            g.add_box_unit_uv(mat_w, wx, fy, 6.02, 1.35, 1.85, 0.10)

    # 3D Metal Fire Escape spanning middle 2 columns on +Z
    fe_w = 4.6
    for fi, fy in enumerate(floor_ys):
        by = fy - 1.0
        # Balcony platform & front/side railings
        g.add_box(m_iron, 0, by, 6.65, fe_w, 0.10, 1.15)
        g.add_box(m_iron, 0, by + 0.85, 7.20, fe_w, 0.07, 0.07)
        g.add_box(m_iron, -fe_w * 0.5, by + 0.45, 6.65, 0.07, 0.85, 1.15)
        g.add_box(m_iron, fe_w * 0.5, by + 0.45, 6.65, 0.07, 0.85, 1.15)
        for rx in np.linspace(-fe_w * 0.45, fe_w * 0.45, 7):
            g.add_box(m_iron, float(rx), by + 0.42, 7.20, 0.05, 0.82, 0.05)
        # Diagonal ladder to floor below
        if fi > 0:
            g.add_box(m_iron, 1.2, by - 1.7, 6.85, 0.55, 3.4, 0.08)

    # Cornice, Snow Parapet & Rooftop Wooden Water Tower
    g.add_box(m_trim, 0, H + 0.25, 0, W + 0.5, 0.55, D + 0.5, uv_scale=0.3)
    g.add_box(m_snow, 0, H + 0.58, 0, W + 0.42, 0.12, D + 0.42, uv_scale=0.3)
    # Water tower stilts + barrel + conical cap
    for lx in [-3.4, -2.0]:
        for lz in [-2.6, -1.2]:
            g.add_box(m_iron, lx, H + 1.4, lz, 0.14, 2.2, 0.14)
    g.add_cylinder(m_wood, -2.7, H + 3.4, -1.9, 1.05, 2.2, segments=12)
    g.add_cylinder(m_snow, -2.7, H + 4.6, -1.9, 1.12, 0.25, segments=12)

    g.export(os.path.join(OUT_DIR, "nyc_apartment_brick.glb"))


# ---------------------------------------------------------------------------
# 3. nyc_skyscraper_glass.glb (18m W x 18m D x ~58m H)
# ---------------------------------------------------------------------------
def build_skyscraper_glass():
    g = GLBBuilder()
    m_curtain = g.add_material("curtain_glass", make_skyscraper_curtain_texture(), roughness=0.20, metallic=0.55, emissive=(0.05, 0.06, 0.08))
    m_steel = g.add_material("dark_steel", make_stone_trim_texture((48, 54, 62)), roughness=0.55, metallic=0.65)
    m_lobby = g.add_material("lobby_stone", make_stone_trim_texture((115, 112, 108)), roughness=0.82)
    m_beacon = g.add_material("red_beacon", base_color=(1.0, 0.15, 0.15, 1), roughness=0.2, emissive=(0.95, 0.1, 0.1))

    # Tier 1: Grand Lobby Base (18 x 18 x 6m)
    g.add_box(m_lobby, 0, 3.0, 0, 18.0, 6.0, 18.0, uv_scale=0.2)
    g.add_box(m_steel, 0, 2.4, 9.5, 6.8, 0.45, 1.4, uv_scale=0.3)  # entry marquee
    g.add_box(m_curtain, 0, 1.8, 9.05, 5.4, 3.4, 0.18, uv_scale=0.4)

    # Tier 2: Lower Shaft (16.4 x 16.4 x 24m)
    g.add_box(m_curtain, 0, 6.0 + 12.0, 0, 16.4, 24.0, 16.4, uv_scale=0.14)
    # Projecting vertical steel fins
    for fx in [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]:
        g.add_box(m_steel, fx, 18.0, 8.28, 0.35, 24.0, 0.25)
        g.add_box(m_steel, fx, 18.0, -8.28, 0.35, 24.0, 0.25)
        g.add_box(m_steel, 8.28, 18.0, fx, 0.25, 24.0, 0.35)
        g.add_box(m_steel, -8.28, 18.0, fx, 0.25, 24.0, 0.35)

    # Tier 3: Mid Setback (13.2 x 13.2 x 16m)
    g.add_box(m_steel, 0, 30.3, 0, 16.8, 0.6, 16.8)
    g.add_box(m_curtain, 0, 30.6 + 8.0, 0, 13.2, 16.0, 13.2, uv_scale=0.14)
    for fx in [-5.5, -2.2, 2.2, 5.5]:
        g.add_box(m_steel, fx, 38.6, 6.68, 0.32, 16.0, 0.22)
        g.add_box(m_steel, fx, 38.6, -6.68, 0.32, 16.0, 0.22)

    # Tier 4: Crown + Mechanical Penthouse + Spire
    g.add_box(m_steel, 0, 46.9, 0, 13.6, 0.6, 13.6)
    g.add_box(m_curtain, 0, 47.2 + 4.5, 0, 9.6, 9.0, 9.6, uv_scale=0.16)
    g.add_box(m_steel, 0, 56.8, 0, 5.4, 2.2, 5.4)
    g.add_cylinder(m_steel, 0, 61.5, 0, 0.18, 7.5, segments=8)
    g.add_box(m_beacon, 0, 65.4, 0, 0.45, 0.45, 0.45)

    g.export(os.path.join(OUT_DIR, "nyc_skyscraper_glass.glb"))


# ---------------------------------------------------------------------------
# 4. nyc_storefront_corner.glb (12m W x 12m D x ~12.4m H)
# ---------------------------------------------------------------------------
def build_storefront_corner():
    g = GLBBuilder()
    m_brick = g.add_material("corner_brick", make_brick_texture((105, 58, 46)), roughness=0.88)
    m_trim = g.add_material("corner_trim", make_stone_trim_texture((135, 130, 120)), roughness=0.9)
    m_win_lit = g.add_material("win_lit", make_glass_window_texture(0.95, seed=31), roughness=0.22, metallic=0.35, emissive=(0.20, 0.15, 0.08))
    m_win_dark = g.add_material("win_dark", make_glass_window_texture(0.0, seed=32), roughness=0.22, metallic=0.4)
    m_awning = g.add_material("corner_awning", make_awning_texture((22, 68, 48), (222, 215, 198)), roughness=0.85)
    m_sign = g.add_material("corner_sign", make_sign_texture("CAFE 24H", bg=(18, 22, 34), fg=(120, 235, 255)), roughness=0.35, emissive=(0.15, 0.35, 0.42))
    m_shutter = g.add_material("rolling_shutter", make_stone_trim_texture((78, 84, 92)), roughness=0.6, metallic=0.7)
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    W, D, H = 12.0, 12.0, 12.0
    g.add_box(m_trim, 0, 1.9, 0, W + 0.1, 3.8, D + 0.1, uv_scale=0.25)
    g.add_box(m_brick, 0, 3.8 + (H - 3.8) * 0.5, 0, W, H - 3.8, D, uv_scale=0.25)

    # Front (+Z) & Right (+X) wrap-around storefront bays
    g.add_box_unit_uv(m_win_lit, -1.8, 1.75, 6.06, 4.6, 2.5, 0.12)
    g.add_box_unit_uv(m_win_lit, 3.2, 1.65, 6.06, 2.4, 2.9, 0.12)  # corner door
    g.add_box_unit_uv(m_awning, 0.0, 3.28, 6.65, 11.4, 0.60, 1.30)
    g.add_box(m_snow, 0.0, 3.62, 6.65, 11.3, 0.10, 1.25, uv_scale=0.3)

    # Side (+X) rolling shutter & display window
    g.add_box_unit_uv(m_win_lit, 6.06, 1.75, 2.2, 0.12, 2.5, 4.2)
    g.add_box(m_shutter, 6.06, 1.75, -2.8, 0.14, 2.5, 3.8, uv_scale=0.6)
    g.add_box_unit_uv(m_awning, 6.65, 3.28, 0.0, 1.30, 0.60, 11.4)

    # Glowing Vertical Corner Blade Sign (+X, +Z corner)
    g.add_box_unit_uv(m_sign, 6.45, 6.2, 6.45, 0.30, 2.8, 1.15)

    # Upper 2 floors on both +Z and +X facades
    for fy in [5.8, 9.2]:
        g.add_box(m_trim, 0, fy - 1.45, 0, W + 0.18, 0.22, D + 0.18, uv_scale=0.3)
        for wx in [-3.8, 0.0, 3.8]:
            mat_w = m_win_lit if (wx == 0.0 or fy > 7.0) else m_win_dark
            g.add_box(m_trim, wx, fy + 1.0, 6.08, 1.55, 0.20, 0.22, uv_scale=0.4)
            g.add_box(m_trim, wx, fy - 0.98, 6.10, 1.58, 0.18, 0.25, uv_scale=0.4)
            g.add_box_unit_uv(mat_w, wx, fy, 6.02, 1.28, 1.78, 0.10)
        for wz in [-3.8, 0.0, 3.8]:
            mat_w = m_win_lit if (wz == 0.0) else m_win_dark
            g.add_box(m_trim, 6.08, fy + 1.0, wz, 0.22, 0.20, 1.55, uv_scale=0.4)
            g.add_box(m_trim, 6.10, fy - 0.98, wz, 0.25, 0.18, 1.58, uv_scale=0.4)
            g.add_box_unit_uv(mat_w, 6.02, fy, wz, 0.10, 1.78, 1.28)

    # Cornice & Snow Cap
    g.add_box(m_trim, 0, H + 0.22, 0, W + 0.5, 0.45, D + 0.5, uv_scale=0.3)
    g.add_box(m_snow, 0, H + 0.50, 0, W + 0.45, 0.12, D + 0.45, uv_scale=0.3)

    g.export(os.path.join(OUT_DIR, "nyc_storefront_corner.glb"))


if __name__ == "__main__":
    build_brownstone()
    build_apartment_brick()
    build_skyscraper_glass()
    build_storefront_corner()
    print("All Priority 1 NYC .glb assets generated successfully!")
