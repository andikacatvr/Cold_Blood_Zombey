"""
Generator for Priority 3 NYC Street Props, Traffic Lamps & Winter Trees .glb Assets.
Outputs to public/models/:
  - nyc_traffic_lamp.glb
  - nyc_street_props.glb
  - nyc_park_bench.glb
  - winter_tree.glb
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_priority1_glbs import (
    OUT_DIR,
    GLBBuilder,
    _img_to_png_bytes,
    make_snow_texture,
)


def make_bark_texture(size=256) -> bytes:
    rng = np.random.default_rng(33)
    arr = np.full((size, size, 3), (62, 42, 28), dtype=np.float32)
    # Vertical bark furrows
    furrows = rng.normal(0, 14, (1, size, 1))
    noise = rng.normal(0, 6, (size, size, 1))
    arr = np.clip(arr + furrows + noise, 20, 110).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_pine_texture(size=256) -> bytes:
    rng = np.random.default_rng(44)
    arr = np.full((size, size, 3), (32, 58, 46), dtype=np.float32)
    arr += rng.normal(0, 11, (size, size, 1))
    arr = np.clip(arr, 15, 105).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_mesh_bin_texture(size=256) -> bytes:
    img = Image.new("RGB", (size, size), (42, 48, 52))
    draw = ImageDraw.Draw(img)
    step = 16
    for i in range(-size, size * 2, step):
        draw.line([i, 0, i + size, size], fill=(95, 104, 112), width=3)
        draw.line([i, size, i + size, 0], fill=(95, 104, 112), width=3)
    return _img_to_png_bytes(img)


# ---------------------------------------------------------------------------
# 1. nyc_traffic_lamp.glb (Base at 0,0,0, arm extends +X to 3.0m, head at y=6.1)
# ---------------------------------------------------------------------------
def build_traffic_lamp():
    g = GLBBuilder()
    m_iron = g.add_material("lamp_iron", base_color=(0.11, 0.13, 0.16, 1), roughness=0.45, metallic=0.8)
    m_sig_yellow = g.add_material("nyc_signal_yellow", base_color=(0.86, 0.64, 0.08, 1), roughness=0.45, metallic=0.35)
    m_bulb = g.add_material("warm_lamp_lens", base_color=(1.0, 0.90, 0.68, 1), roughness=0.15, emissive=(1.0, 0.85, 0.55))
    m_red = g.add_material("sig_red", base_color=(1.0, 0.12, 0.10, 1), roughness=0.2, emissive=(0.95, 0.10, 0.08))
    m_amber = g.add_material("sig_amber", base_color=(1.0, 0.65, 0.05, 1), roughness=0.2, emissive=(0.90, 0.55, 0.05))
    m_green = g.add_material("sig_green", base_color=(0.12, 0.95, 0.42, 1), roughness=0.2, emissive=(0.10, 0.85, 0.35))
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # Fluted Octagonal Base + Tall Tapered Post
    g.add_cylinder(m_iron, 0, 0.45, 0, 0.24, 0.90, segments=8)
    g.add_cylinder(m_iron, 0, 0.96, 0, 0.18, 0.14, segments=8)
    g.add_cylinder(m_iron, 0, 3.65, 0, 0.11, 5.4, segments=8)
    g.add_cylinder(m_iron, 0, 6.40, 0, 0.14, 0.18, segments=8)

    # Mast Arm extending along +X + Decorative Brace
    g.add_box(m_iron, 1.55, 6.22, 0, 3.2, 0.14, 0.14)
    g.add_box(m_iron, 0.65, 5.80, 0, 1.35, 0.08, 0.08)
    g.add_box(m_snow, 1.55, 6.32, 0, 3.1, 0.05, 0.12, uv_scale=0.5)

    # Streetlamp Cobra-Head Housing & Warm Glowing Lens at (3.0, 6.1, 0)
    g.add_box(m_iron, 3.0, 6.18, 0, 0.78, 0.16, 0.36)
    g.add_box(m_bulb, 3.0, 6.07, 0, 0.62, 0.08, 0.28)
    g.add_box(m_snow, 3.0, 6.28, 0, 0.74, 0.06, 0.34, uv_scale=0.5)

    # Hanging NYC Yellow 3-Aspect Traffic Signal at x = 1.9, y = 5.4
    g.add_box(m_iron, 1.9, 6.02, 0, 0.08, 0.35, 0.08)
    g.add_box(m_sig_yellow, 1.9, 5.38, 0, 0.40, 1.05, 0.40)
    # 3 lenses facing +Z and -Z
    for ly, mat in [(5.70, m_red), (5.38, m_amber), (5.06, m_green)]:
        g.add_box(m_iron, 1.9, ly + 0.11, 0.24, 0.24, 0.04, 0.12)
        g.add_box(m_iron, 1.9, ly + 0.11, -0.24, 0.24, 0.04, 0.12)
        g.add_box(mat, 1.9, ly, 0.21, 0.18, 0.18, 0.04)
        g.add_box(mat, 1.9, ly, -0.21, 0.18, 0.18, 0.04)

    g.export(os.path.join(OUT_DIR, "nyc_traffic_lamp.glb"))


# ---------------------------------------------------------------------------
# 2. nyc_street_props.glb (Red Fire Hydrant + Wire Trash Bin + USPS Mailbox)
# ---------------------------------------------------------------------------
def build_street_props():
    g = GLBBuilder()
    m_hydrant = g.add_material("hydrant_red", base_color=(0.78, 0.12, 0.10, 1), roughness=0.45, metallic=0.35)
    m_silver = g.add_material("hydrant_cap", base_color=(0.76, 0.78, 0.82, 1), roughness=0.32, metallic=0.85)
    m_bin = g.add_material("nyc_wire_bin", make_mesh_bin_texture(), roughness=0.55, metallic=0.65)
    m_usps = g.add_material("usps_blue", base_color=(0.10, 0.22, 0.48, 1), roughness=0.48, metallic=0.4)
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # 1. NYC Fire Hydrant at x = -0.9
    hx = -0.9
    g.add_cylinder(m_hydrant, hx, 0.10, 0, 0.20, 0.20, segments=10)
    g.add_cylinder(m_hydrant, hx, 0.46, 0, 0.15, 0.56, segments=10)
    g.add_cylinder(m_hydrant, hx, 0.78, 0, 0.18, 0.14, segments=10)
    g.add_cylinder(m_silver, hx, 0.90, 0, 0.08, 0.12, segments=8)
    g.add_box(m_silver, hx, 0.54, 0, 0.40, 0.12, 0.12)  # side hose nozzles
    g.add_box(m_snow, hx, 0.87, 0, 0.22, 0.05, 0.22, uv_scale=0.5)

    # 2. NYC Steel Wire-Mesh Trash Bin at x = 0.0
    g.add_cylinder(m_bin, 0.0, 0.44, 0, 0.28, 0.88, segments=10)
    g.add_cylinder(m_silver, 0.0, 0.89, 0, 0.29, 0.05, segments=10)

    # 3. USPS Blue Street Mailbox at x = +0.95
    mx = 0.95
    g.add_box(m_usps, mx, 0.46, 0, 0.52, 0.92, 0.52)
    g.add_cylinder(m_usps, mx, 0.96, 0, 0.26, 0.16, segments=10)
    g.add_box(m_silver, mx, 0.76, 0.27, 0.36, 0.12, 0.04)  # mail chute handle
    g.add_box(m_snow, mx, 1.05, 0, 0.48, 0.06, 0.48, uv_scale=0.5)

    g.export(os.path.join(OUT_DIR, "nyc_street_props.glb"))


# ---------------------------------------------------------------------------
# 3. nyc_park_bench.glb (2.6m W x 0.8m D x 0.95m H)
# ---------------------------------------------------------------------------
def build_park_bench():
    g = GLBBuilder()
    m_wood = g.add_material("bench_wood", base_color=(0.36, 0.22, 0.13, 1), roughness=0.82)
    m_iron = g.add_material("bench_iron", base_color=(0.10, 0.12, 0.13, 1), roughness=0.5, metallic=0.75)
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # Cast-iron side & center legs + armrests
    for lx in [-1.15, 0.0, 1.15]:
        g.add_box(m_iron, lx, 0.22, -0.24, 0.08, 0.44, 0.08)
        g.add_box(m_iron, lx, 0.22, 0.24, 0.08, 0.44, 0.08)
        g.add_box(m_iron, lx, 0.42, 0.0, 0.08, 0.08, 0.58)
        if lx != 0.0:
            g.add_box(m_iron, lx, 0.58, 0.0, 0.07, 0.07, 0.56)
            g.add_box(m_iron, lx, 0.68, -0.26, 0.07, 0.52, 0.07)

    # Wood slats (seat + backrest) + snow dusting
    for sz in [-0.16, 0.0, 0.16]:
        g.add_box(m_wood, 0, 0.46, sz, 2.50, 0.05, 0.12)
    for by in [0.64, 0.78, 0.92]:
        g.add_box(m_wood, 0, by, -0.24, 2.50, 0.10, 0.05)
    g.add_box(m_snow, 0, 0.50, 0.0, 2.42, 0.04, 0.42, uv_scale=0.4)
    g.add_box(m_snow, 0, 0.98, -0.24, 2.42, 0.04, 0.08, uv_scale=0.4)

    g.export(os.path.join(OUT_DIR, "nyc_park_bench.glb"))


# ---------------------------------------------------------------------------
# 4. winter_tree.glb (~8.5m tall layered snowy evergreen)
# ---------------------------------------------------------------------------
def build_winter_tree():
    g = GLBBuilder()
    m_bark = g.add_material("tree_bark", make_bark_texture(), roughness=0.92)
    m_pine = g.add_material("pine_needles", make_pine_texture(), roughness=0.88)
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # Trunk
    g.add_cylinder(m_bark, 0, 1.8, 0, 0.34, 3.6, segments=8)
    # 4 tiered pine bough layers + snow caps
    tiers = [
        (3.4, 2.35, 1.5),
        (4.8, 1.95, 1.4),
        (6.1, 1.45, 1.3),
        (7.3, 0.92, 1.2),
    ]
    for cy, rad, h in tiers:
        g.add_cylinder(m_pine, 0, cy, 0, rad * 0.75, h, segments=8)
        g.add_box(m_pine, 0, cy, 0, rad * 1.45, h * 0.55, rad * 1.45, uv_scale=0.35)
        g.add_box(m_snow, 0, cy + h * 0.32, 0, rad * 1.35, 0.18, rad * 1.35, uv_scale=0.35)
    g.add_cylinder(m_snow, 0, 8.15, 0, 0.42, 0.55, segments=8)

    g.export(os.path.join(OUT_DIR, "winter_tree.glb"))


if __name__ == "__main__":
    build_traffic_lamp()
    build_street_props()
    build_park_bench()
    build_winter_tree()
    print("All Priority 3 NYC Street Props, Lamps & Trees .glb assets generated successfully!")
