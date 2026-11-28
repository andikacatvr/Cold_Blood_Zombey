"""
Generator for Priority 4 NYC Vehicles & Statue of Liberty .glb Assets.
Outputs to public/models/:
  - nyc_taxi_cab.glb
  - nyc_police_car.glb
  - statue_of_liberty.glb
"""
import math
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
)


def make_taxi_side_texture(size=256) -> bytes:
    img = Image.new("RGB", (size, size), (235, 178, 18))
    draw = ImageDraw.Draw(img)
    # Iconic black-and-white NYC checker stripe across the middle
    sq = 16
    y0 = size // 2 - sq
    for i in range(size // sq):
        c1 = (20, 20, 22) if i % 2 == 0 else (240, 240, 240)
        c2 = (240, 240, 240) if i % 2 == 0 else (20, 20, 22)
        draw.rectangle([i * sq, y0, (i + 1) * sq, y0 + sq], fill=c1)
        draw.rectangle([i * sq, y0 + sq, (i + 1) * sq, y0 + 2 * sq], fill=c2)
    return _img_to_png_bytes(img)


def make_nypd_side_texture(size=256) -> bytes:
    img = Image.new("RGB", (size, size), (232, 236, 242))
    draw = ImageDraw.Draw(img)
    # NYPD blue side stripes + badge block
    draw.rectangle([0, int(size * 0.44), size, int(size * 0.56)], fill=(22, 72, 158))
    draw.rectangle([0, int(size * 0.58), size, int(size * 0.64)], fill=(22, 72, 158))
    # "NYPD" lettering blocks
    for i, x0 in enumerate([68, 102, 136, 170]):
        draw.rectangle([x0, int(size * 0.24), x0 + 22, int(size * 0.40)], fill=(22, 72, 158))
    return _img_to_png_bytes(img)


def _add_car_wheels(g: GLBBuilder, m_tire, m_rim):
    for wx in [-0.88, 0.88]:
        for wz in [-1.38, 1.38]:
            # Wheel cylinder along X using thin box stack / rotated approximation via octagonal hub
            g.add_box(m_tire, wx, 0.34, wz, 0.24, 0.66, 0.66)
            g.add_box(m_rim, wx + (0.04 if wx > 0 else -0.04), 0.34, wz, 0.20, 0.38, 0.38)


# ---------------------------------------------------------------------------
# 1. nyc_taxi_cab.glb (1.85m W x 4.5m L x 1.58m H, pivot y=0)
# ---------------------------------------------------------------------------
def build_taxi_cab():
    g = GLBBuilder()
    m_yellow = g.add_material("taxi_yellow", make_taxi_side_texture(), roughness=0.38, metallic=0.25)
    m_yellow_solid = g.add_material("taxi_hood", base_color=(0.92, 0.70, 0.08, 1), roughness=0.38, metallic=0.25)
    m_glass = g.add_material("car_glass", base_color=(0.10, 0.14, 0.18, 1), roughness=0.15, metallic=0.55)
    m_chrome = g.add_material("chrome", base_color=(0.78, 0.80, 0.84, 1), roughness=0.22, metallic=0.9)
    m_tire = g.add_material("tire", base_color=(0.07, 0.07, 0.08, 1), roughness=0.9)
    m_rim = g.add_material("rim", base_color=(0.68, 0.70, 0.74, 1), roughness=0.3, metallic=0.8)
    m_head = g.add_material("headlight", base_color=(1.0, 0.96, 0.80, 1), roughness=0.2, emissive=(0.95, 0.88, 0.65))
    m_tail = g.add_material("taillight", base_color=(0.95, 0.12, 0.10, 1), roughness=0.2, emissive=(0.85, 0.08, 0.08))
    m_sign = g.add_material("taxi_sign", base_color=(1.0, 0.90, 0.45, 1), roughness=0.2, emissive=(0.95, 0.80, 0.25))
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # Lower Chassis + Checker Side Panels
    g.add_box_unit_uv(m_yellow, 0, 0.58, 0, 1.84, 0.64, 4.46)
    g.add_box(m_yellow_solid, 0, 0.62, 1.55, 1.78, 0.54, 1.32)   # Hood
    g.add_box(m_yellow_solid, 0, 0.64, -1.65, 1.78, 0.56, 1.10)  # Trunk
    # Cabin + Windows
    g.add_box(m_yellow_solid, 0, 1.18, -0.15, 1.56, 0.56, 2.05)
    g.add_box(m_glass, 0, 1.16, 0.88, 1.46, 0.46, 0.12)   # Windshield
    g.add_box(m_glass, 0, 1.16, -1.18, 1.46, 0.44, 0.12)  # Rear glass
    g.add_box(m_glass, 0, 1.16, -0.15, 1.60, 0.42, 1.75)  # Side windows
    # Roof Snow & Glowing TAXI Medallion Sign
    g.add_box(m_snow, 0, 1.48, -0.25, 1.48, 0.06, 1.80, uv_scale=0.5)
    g.add_box(m_sign, 0, 1.58, 0.15, 0.62, 0.20, 0.28)
    # Bumpers, Grille, Headlights & Taillights
    g.add_box(m_chrome, 0, 0.34, 2.26, 1.86, 0.16, 0.14)
    g.add_box(m_chrome, 0, 0.34, -2.26, 1.86, 0.16, 0.14)
    g.add_box(m_chrome, 0, 0.62, 2.24, 0.82, 0.24, 0.08)
    g.add_box(m_head, -0.66, 0.64, 2.24, 0.28, 0.18, 0.06)
    g.add_box(m_head, 0.66, 0.64, 2.24, 0.28, 0.18, 0.06)
    g.add_box(m_tail, -0.68, 0.66, -2.24, 0.30, 0.16, 0.06)
    g.add_box(m_tail, 0.68, 0.66, -2.24, 0.30, 0.16, 0.06)

    _add_car_wheels(g, m_tire, m_rim)
    g.export(os.path.join(OUT_DIR, "nyc_taxi_cab.glb"))


# ---------------------------------------------------------------------------
# 2. nyc_police_car.glb (1.88m W x 4.58m L x 1.64m H, pivot y=0)
# ---------------------------------------------------------------------------
def build_police_car():
    g = GLBBuilder()
    m_nypd = g.add_material("nypd_body", make_nypd_side_texture(), roughness=0.35, metallic=0.25)
    m_white = g.add_material("nypd_white", base_color=(0.91, 0.93, 0.96, 1), roughness=0.35, metallic=0.2)
    m_blue = g.add_material("nypd_blue", base_color=(0.09, 0.28, 0.62, 1), roughness=0.4, metallic=0.25)
    m_glass = g.add_material("car_glass", base_color=(0.09, 0.13, 0.18, 1), roughness=0.15, metallic=0.55)
    m_chrome = g.add_material("chrome", base_color=(0.22, 0.24, 0.28, 1), roughness=0.35, metallic=0.8)
    m_tire = g.add_material("tire", base_color=(0.07, 0.07, 0.08, 1), roughness=0.9)
    m_rim = g.add_material("rim", base_color=(0.15, 0.16, 0.18, 1), roughness=0.4, metallic=0.7)
    m_red = g.add_material("siren_red", base_color=(1.0, 0.10, 0.10, 1), roughness=0.18, emissive=(0.95, 0.10, 0.10))
    m_sblue = g.add_material("siren_blue", base_color=(0.15, 0.45, 1.0, 1), roughness=0.18, emissive=(0.12, 0.42, 0.98))
    m_head = g.add_material("headlight", base_color=(1.0, 0.96, 0.82, 1), roughness=0.2, emissive=(0.95, 0.88, 0.65))

    g.add_box_unit_uv(m_nypd, 0, 0.58, 0, 1.86, 0.64, 4.54)
    g.add_box(m_white, 0, 0.62, 1.56, 1.80, 0.54, 1.35)
    g.add_box(m_white, 0, 0.64, -1.68, 1.80, 0.56, 1.12)
    g.add_box(m_white, 0, 1.18, -0.15, 1.58, 0.56, 2.08)
    g.add_box(m_glass, 0, 1.16, 0.90, 1.48, 0.46, 0.12)
    g.add_box(m_glass, 0, 1.16, -1.20, 1.48, 0.44, 0.12)
    g.add_box(m_glass, 0, 1.16, -0.15, 1.62, 0.42, 1.78)

    # Push bumper + grille + headlights
    g.add_box(m_chrome, 0, 0.48, 2.34, 1.15, 0.46, 0.18)
    g.add_box(m_head, -0.68, 0.64, 2.28, 0.28, 0.18, 0.06)
    g.add_box(m_head, 0.68, 0.64, 2.28, 0.28, 0.18, 0.06)

    # Iconic Roof Lightbar (Red / White / Blue)
    g.add_box(m_red, -0.46, 1.54, -0.05, 0.44, 0.16, 0.28)
    g.add_box(m_white, 0.0, 1.54, -0.05, 0.42, 0.16, 0.28)
    g.add_box(m_sblue, 0.46, 1.54, -0.05, 0.44, 0.16, 0.28)

    _add_car_wheels(g, m_tire, m_rim)
    g.export(os.path.join(OUT_DIR, "nyc_police_car.glb"))


# ---------------------------------------------------------------------------
# 3. statue_of_liberty.glb (~34m tall oxidized copper monument on granite base)
# ---------------------------------------------------------------------------
def build_statue_of_liberty():
    g = GLBBuilder()
    m_stone = g.add_material("liberty_granite", make_stone_trim_texture((112, 108, 102)), roughness=0.9)
    m_copper = g.add_material("oxidized_copper", base_color=(0.35, 0.58, 0.50, 1), roughness=0.62, metallic=0.25)
    m_flame = g.add_material("torch_flame", base_color=(1.0, 0.82, 0.30, 1), roughness=0.2, emissive=(1.0, 0.72, 0.18))
    m_snow = g.add_material("snow_cap", make_snow_texture(), roughness=0.95)

    # Stepped Star-Fort Plinth + Tall Classical Pedestal (0..18m)
    g.add_box(m_stone, 0, 2.0, 0, 12.0, 4.0, 12.0, uv_scale=0.2)
    g.add_snow = g.add_box(m_snow, 0, 4.08, 0, 11.8, 0.16, 11.8, uv_scale=0.2)
    g.add_box(m_stone, 0, 10.5, 0, 8.2, 13.0, 8.2, uv_scale=0.2)
    g.add_box(m_stone, 0, 17.3, 0, 9.0, 0.8, 9.0, uv_scale=0.25)
    g.add_box(m_snow, 0, 17.78, 0, 8.8, 0.16, 8.8, uv_scale=0.25)

    # Lady Liberty Draped Gown & Torso (17.8..28.5m)
    g.add_cylinder(m_copper, 0, 22.0, 0, 2.35, 8.2, segments=12)
    g.add_cylinder(m_copper, 0, 27.2, 0, 1.55, 3.2, segments=12)
    # Head + 7-Ray Crown
    g.add_cylinder(m_copper, 0, 29.6, 0, 0.92, 1.8, segments=10)
    for i in range(7):
        ang = -math.pi * 0.45 + (i / 6.0) * math.pi * 0.90
        rx = math.sin(ang) * 1.45
        ry = 30.6 + math.cos(ang) * 0.75
        g.add_box(m_copper, rx, ry, 0.35, 0.18, 0.85, 0.18)

    # Left Arm & Tablet
    g.add_box(m_copper, -1.65, 27.0, 0.55, 0.65, 2.4, 0.65)
    g.add_box(m_copper, -1.95, 27.4, 0.95, 0.95, 1.45, 0.28)

    # Raised Right Arm + Torch + Glowing Flame
    g.add_box(m_copper, 1.55, 29.8, 0.20, 0.60, 5.2, 0.60)
    g.add_cylinder(m_copper, 1.55, 32.8, 0.20, 0.46, 0.95, segments=10)
    g.add_cylinder(m_flame, 1.55, 33.8, 0.20, 0.38, 1.25, segments=8)

    g.export(os.path.join(OUT_DIR, "statue_of_liberty.glb"))


if __name__ == "__main__":
    build_taxi_cab()
    build_police_car()
    build_statue_of_liberty()
    print("All Priority 4 NYC Vehicles & Statue of Liberty .glb assets generated successfully!")
