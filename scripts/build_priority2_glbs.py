"""
Generator for Priority 2 NYC Subway .glb (glTF 2.0 Binary) Assets.
Outputs to public/models/:
  - nyc_subway_entrance.glb
  - nyc_subway_train.glb
  - nyc_subway_turnstile.glb
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
    make_stone_trim_texture,
    make_sign_texture,
)


def make_corrugated_steel_texture(size=512) -> bytes:
    img = Image.new("RGB", (size, size), (146, 152, 160))
    draw = ImageDraw.Draw(img)
    # Horizontal stainless steel corrugation ribs
    for y in range(0, size, 12):
        draw.line([0, y, size, y], fill=(185, 192, 200), width=3)
        draw.line([0, y + 4, size, y + 4], fill=(104, 110, 118), width=3)
    # Iconic blue MTA stripe band
    y_band = int(size * 0.56)
    draw.rectangle([0, y_band, size, y_band + 38], fill=(22, 76, 168))
    draw.rectangle([0, y_band + 38, size, y_band + 44], fill=(225, 228, 232))
    # Subtle grime
    rng = np.random.default_rng(77)
    arr = np.array(img, dtype=np.float32) + rng.normal(0, 5, (size, size, 1))
    arr = np.clip(arr, 20, 245).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_subway_floor_texture(size=256) -> bytes:
    rng = np.random.default_rng(19)
    arr = np.full((size, size, 3), (62, 66, 70), dtype=np.float32)
    # Speckled terrazzo / scuffed rubber floor
    specks = rng.normal(0, 14, (size, size, 1))
    arr = np.clip(arr + specks, 25, 130).astype(np.uint8)
    return _img_to_png_bytes(Image.fromarray(arr))


def make_subway_entrance_sign_tex() -> bytes:
    img = Image.new("RGB", (512, 128), (12, 14, 16))
    draw = ImageDraw.Draw(img)
    draw.rectangle([4, 4, 507, 123], outline=(230, 235, 240), width=4)
    # Top white stripe
    draw.line([14, 20, 498, 20], fill=(240, 240, 240), width=4)
    # Route bullets: (A) blue, (C) blue, (1) red, (2) red, (3) red
    bullets = [(60, (28, 86, 195)), (118, (28, 86, 195)), (176, (205, 38, 38)), (234, (205, 38, 38))]
    for bx, col in bullets:
        draw.ellipse([bx - 20, 52, bx + 20, 92], fill=col)
    # "42 ST" blocky text on right
    for i, x0 in enumerate([295, 338, 392, 435]):
        draw.rectangle([x0, 52, x0 + 30, 92], outline=(245, 245, 245), width=4)
    return _img_to_png_bytes(img)


# ---------------------------------------------------------------------------
# 1. nyc_subway_entrance.glb (pivot at x=0, y=0, z=0 at top of stairs)
# ---------------------------------------------------------------------------
def build_subway_entrance():
    g = GLBBuilder()
    m_green = g.add_material("nyc_iron_green", base_color=(0.07, 0.17, 0.12, 1), roughness=0.55, metallic=0.65)
    m_globe = g.add_material("emerald_globe", base_color=(0.24, 1.0, 0.55, 1), roughness=0.2, emissive=(0.18, 0.92, 0.45))
    m_sign = g.add_material("subway_sign", make_subway_entrance_sign_tex(), roughness=0.35, emissive=(0.22, 0.24, 0.26))
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # Left & Right perimeter cast-iron railings (z = -6.3 to 0.0)
    for rx in [-2.35, 2.35]:
        # Top & bottom horizontal rails
        g.add_box(m_green, rx, 1.12, -3.15, 0.14, 0.10, 6.4)
        g.add_box(m_green, rx, 0.18, -3.15, 0.14, 0.12, 6.4)
        g.add_box(m_snow, rx, 1.19, -3.15, 0.12, 0.05, 6.3, uv_scale=0.5)
        # Vertical balusters
        for bz in np.linspace(-6.1, -0.3, 14):
            g.add_box(m_green, rx, 0.65, float(bz), 0.07, 0.92, 0.07)
        # Corner/back post
        g.add_box(m_green, rx, 0.72, -6.25, 0.22, 1.44, 0.22)

        # Iconic Front Fluted Lamp Post + Emerald Globe
        g.add_box(m_green, rx, 0.45, 0.12, 0.34, 0.90, 0.34)
        g.add_cylinder(m_green, rx, 1.75, 0.12, 0.12, 2.1, segments=10)
        g.add_cylinder(m_green, rx, 2.82, 0.12, 0.18, 0.16, segments=10)
        g.add_cylinder(m_globe, rx, 3.12, 0.12, 0.28, 0.48, segments=12)

    # Back railing across z = -6.25
    g.add_box(m_green, 0, 1.12, -6.25, 4.7, 0.10, 0.14)
    g.add_box(m_green, 0, 0.18, -6.25, 4.7, 0.12, 0.14)
    for bx in np.linspace(-2.0, 2.0, 11):
        g.add_box(m_green, float(bx), 0.65, -6.25, 0.07, 0.92, 0.07)

    # Overhead Subway Marquee Sign Bar
    g.add_box(m_green, 0, 2.75, 0.12, 4.9, 1.15, 0.18)
    g.add_box_unit_uv(m_sign, 0, 2.75, 0.23, 4.7, 0.98, 0.04)
    g.add_box_unit_uv(m_sign, 0, 2.75, 0.01, 4.7, 0.98, 0.04)
    g.add_box(m_snow, 0, 3.36, 0.12, 4.92, 0.08, 0.22, uv_scale=0.4)

    g.export(os.path.join(OUT_DIR, "nyc_subway_entrance.glb"))


# ---------------------------------------------------------------------------
# 2. nyc_subway_train.glb (12.6m L x 3.2m W x 3.0m H, pivot at floor center y=0)
# ---------------------------------------------------------------------------
def build_subway_train():
    g = GLBBuilder()
    m_steel = g.add_material("mta_steel", make_corrugated_steel_texture(), roughness=0.38, metallic=0.72)
    m_floor = g.add_material("train_floor", make_subway_floor_texture(), roughness=0.88)
    m_seat = g.add_material("mta_orange_seat", base_color=(0.86, 0.36, 0.10, 1), roughness=0.55, metallic=0.05)
    m_chrome = g.add_material("chrome_pole", base_color=(0.82, 0.85, 0.88, 1), roughness=0.22, metallic=0.9)
    m_light = g.add_material("ceiling_tube", base_color=(0.95, 0.98, 1.0, 1), roughness=0.2, emissive=(0.85, 0.92, 0.95))
    m_glass = g.add_material("cab_glass", base_color=(0.08, 0.12, 0.18, 1), roughness=0.18, metallic=0.45)
    m_head = g.add_material("headlight", base_color=(1.0, 0.95, 0.78, 1), roughness=0.2, emissive=(0.95, 0.88, 0.65))

    L, W, H = 12.6, 3.2, 2.95
    # Floor & Roof
    g.add_box(m_floor, 0, 0.08, 0, W, 0.16, L, uv_scale=0.35)
    g.add_box(m_steel, 0, H, 0, W + 0.08, 0.18, L + 0.08, uv_scale=0.25)

    # Left solid wall (-X) with window pillars
    g.add_box(m_steel, -W * 0.5 + 0.08, 0.65, 0, 0.16, 1.1, L, uv_scale=0.25)
    g.add_box(m_steel, -W * 0.5 + 0.08, 2.52, 0, 0.16, 0.75, L, uv_scale=0.25)
    for pz in np.linspace(-5.8, 5.8, 7):
        g.add_box(m_steel, -W * 0.5 + 0.08, 1.65, float(pz), 0.16, 1.15, 0.48, uv_scale=0.3)

    # Right platform-facing wall (+X) with 3 wide OPEN sliding door bays
    for seg_z in [-4.5, 0.0, 4.5]:
        g.add_box(m_steel, W * 0.5 - 0.08, H * 0.5, seg_z, 0.16, H - 0.1, 2.15, uv_scale=0.25)
    # Header above doors
    g.add_box(m_steel, W * 0.5 - 0.08, H - 0.30, 0, 0.16, 0.50, L, uv_scale=0.25)

    # Front (+Z) and Rear (-Z) train ends with cab window & headlights
    for end_sign in [1, -1]:
        ez = end_sign * (L * 0.5 - 0.09)
        g.add_box(m_steel, 0, H * 0.5, ez, W, H - 0.1, 0.18, uv_scale=0.25)
        g.add_box(m_glass, -0.75, 1.85, ez + end_sign * 0.06, 0.95, 0.85, 0.08)
        g.add_box(m_glass, 0.75, 1.85, ez + end_sign * 0.06, 0.95, 0.85, 0.08)
        g.add_box(m_head, -1.05, 0.85, ez + end_sign * 0.08, 0.32, 0.22, 0.08)
        g.add_box(m_head, 1.05, 0.85, ez + end_sign * 0.08, 0.32, 0.22, 0.08)

    # Bright Orange MTA Fiberglass Bench Seats (both sides)
    for sx in [-1.14, 1.14]:
        for bz in [-4.4, 0.0, 4.4]:
            if sx > 0:
                g.add_box(m_seat, sx, 0.42, bz, 0.56, 0.16, 1.85)
                g.add_box(m_seat, sx + 0.20, 0.78, bz, 0.12, 0.62, 1.85)
            else:
                g.add_box(m_seat, sx, 0.42, bz, 0.56, 0.16, 2.85)
                g.add_box(m_seat, sx - 0.20, 0.78, bz, 0.12, 0.62, 2.85)

    # Vertical Chrome Grab Poles & Overhead Handrails
    for pz in [-4.2, -1.4, 1.4, 4.2]:
        g.add_cylinder(m_chrome, 0.0, H * 0.5, pz, 0.035, H - 0.2, segments=8)
    g.add_box(m_chrome, -0.55, 2.25, 0, 0.05, 0.05, L - 1.2)
    g.add_box(m_chrome, 0.55, 2.25, 0, 0.05, 0.05, L - 1.2)

    # Ceiling Fluorescent Light Strips
    for lz in [-3.8, 0.0, 3.8]:
        g.add_box(m_light, 0, H - 0.12, lz, 0.45, 0.06, 2.6)

    g.export(os.path.join(OUT_DIR, "nyc_subway_train.glb"))


# ---------------------------------------------------------------------------
# 3. nyc_subway_turnstile.glb (3-gate stainless bank, ~2.8m W x 0.9m D x 1.05m H)
# ---------------------------------------------------------------------------
def build_subway_turnstile():
    g = GLBBuilder()
    m_chrome = g.add_material("turnstile_steel", base_color=(0.72, 0.76, 0.80, 1), roughness=0.28, metallic=0.88)
    m_dark = g.add_material("turnstile_trim", base_color=(0.12, 0.14, 0.16, 1), roughness=0.6, metallic=0.5)
    m_arrow = g.add_material("green_entry_led", base_color=(0.2, 1.0, 0.45, 1), roughness=0.2, emissive=(0.18, 0.9, 0.4))

    # 4 stainless cabinets creating 3 walkable lanes
    for cx in [-1.35, -0.45, 0.45, 1.35]:
        g.add_box(m_chrome, cx, 0.50, 0, 0.24, 1.00, 0.88)
        g.add_box(m_dark, cx, 1.02, 0, 0.26, 0.08, 0.90)
        g.add_box(m_arrow, cx, 0.84, 0.45, 0.14, 0.10, 0.04)

    # Rotating tripod arms in each lane
    for lx in [-0.90, 0.0, 0.90]:
        g.add_box(m_chrome, lx - 0.18, 0.72, 0.0, 0.48, 0.04, 0.04)
        g.add_box(m_chrome, lx - 0.25, 0.56, 0.12, 0.36, 0.04, 0.04)

    g.export(os.path.join(OUT_DIR, "nyc_subway_turnstile.glb"))


if __name__ == "__main__":
    build_subway_entrance()
    build_subway_train()
    build_subway_turnstile()
    print("All Priority 2 NYC Subway .glb assets generated successfully!")
