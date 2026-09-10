"""Reusable Crafted Realm low-poly architecture and furnishing components.

The functions in this module deliberately build simple, authored silhouettes
from a shared warm palette.  They are designed for flat-shaded GLB export and
accept the existing Blender helper module as ``B`` so production assets can
share one component language without sharing whole-building prefabs.
"""
from __future__ import annotations

import math

import bpy


def polygon_area(points):
    return sum(
        points[i][0] * points[(i + 1) % len(points)][1]
        - points[(i + 1) % len(points)][0] * points[i][1]
        for i in range(len(points))
    ) / 2


def line_intersection(a, ad, b, bd):
    cross = ad[0] * bd[1] - ad[1] * bd[0]
    if abs(cross) < 1e-8:
        return a
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = (dx * bd[1] - dy * bd[0]) / cross
    return a[0] + ad[0] * t, a[1] + ad[1] * t


def offset_polygon(points, distance):
    """Return a true mitered polygon offset for a simple ordered loop."""
    ccw = polygon_area(points) > 0
    lines = []
    for i, a in enumerate(points):
        b = points[(i + 1) % len(points)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        if length <= 1e-7:
            raise ValueError("perimeter contains a zero-length edge")
        normal = (dy / length, -dx / length) if ccw else (-dy / length, dx / length)
        lines.append(((a[0] + normal[0] * distance, a[1] + normal[1] * distance),
                      (dx / length, dy / length)))
    result = []
    for i in range(len(points)):
        prev = lines[(i - 1) % len(points)]
        current = lines[i]
        result.append(line_intersection(prev[0], prev[1], current[0], current[1]))
    return result


def contour_hip_roof(B, name, perimeter, eave_z, peak_z, overhang, thickness,
                     top_scale, mats, collection, parent):
    """Build one watertight hipped roof whose eave follows the wall contour."""
    outer = offset_polygon(perimeter, overhang)
    cx = sum(x for x, _ in perimeter) / len(perimeter)
    cy = sum(y for _, y in perimeter) / len(perimeter)
    # Do not preserve concave notches at the ridge: that creates crossing roof
    # planes. Project every wall vertex onto one calm convex ridge ring instead.
    inner_radius = min(math.hypot(x - cx, y - cy) for x, y in perimeter) * top_scale
    inner = []
    for x, y in perimeter:
        length = math.hypot(x - cx, y - cy)
        inner.append((cx + (x - cx) / length * inner_radius,
                      cy + (y - cy) / length * inner_radius))
    n = len(perimeter)
    verts = (
        [(x, y, eave_z) for x, y in outer]
        + [(x, y, peak_z) for x, y in inner]
        + [(x, y, eave_z - thickness) for x, y in outer]
        + [(x, y, peak_z - thickness) for x, y in inner]
    )
    faces = []
    material_indices = []
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
        material_indices.append(0)
    faces.append(tuple(range(n, n * 2)))
    material_indices.append(1)
    for i in range(n):
        j = (i + 1) % n
        faces.append((2 * n + i, 3 * n + i, 3 * n + j, 2 * n + j))
        material_indices.append(0)
        faces.append((i, 2 * n + i, 2 * n + j, j))
        material_indices.append(1)
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mats["roof"])
    mesh.materials.append(mats["roof_light"])
    for poly, index in zip(mesh.polygons, material_indices):
        poly.use_smooth = False
        poly.material_index = index
    obj = B.link(bpy.data.objects.new(name, mesh), collection, parent)

    # A continuous fascia repeats the exact eave loop and makes contact readable.
    for i, a in enumerate(outer):
        b = outer[(i + 1) % n]
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        angle = math.atan2(dy, dx)
        B.cube(f"{name}_Fascia_{i:02d}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2,
               eave_z - thickness * 0.52), (length + 0.08, 0.18, thickness + 0.10),
               mats["timber"], collection, parent, angle)
    return obj, outer


def framed_door(B, name, center, opening_width, opening_height, wall_height,
                hinge_side, rotation, mats, collection, static_parent, semantic_parent):
    """Create a full-height fitted door, frame, lintel, and over-door infill."""
    frame = B.empty(name + "_Frame", collection, static_parent, (center[0], center[1], 0))
    frame.rotation_euler.z = rotation
    jamb = 0.28
    for x in (-opening_width / 2 - jamb * 0.12, opening_width / 2 + jamb * 0.12):
        B.cube(name + "_Jamb", (x, 0, opening_height / 2), (jamb, 0.46, opening_height),
               mats["timber"], collection, frame)
        B.cube(name + "_JambFoot", (x, 0, 0.18), (0.48, 0.58, 0.36),
               mats["stone_light"], collection, frame)
    B.cube(name + "_Lintel", (0, 0, opening_height + 0.13),
           (opening_width + 0.68, 0.52, 0.30), mats["timber"], collection, frame)
    fill_height = max(0.18, wall_height - opening_height - 0.30)
    B.cube(name + "_Overdoor", (0, 0.03, opening_height + 0.30 + fill_height / 2),
           (opening_width + 0.08, 0.28, fill_height), mats["plaster"], collection, frame)
    B.cube(name + "_Keystone", (0, -0.25, opening_height + 0.12),
           (0.42, 0.12, 0.42), mats["brass"], collection, frame, math.pi / 4)

    direction = 1 if hinge_side == "left" else -1
    hinge_local = -opening_width / 2 if hinge_side == "left" else opening_width / 2
    co, si = math.cos(rotation), math.sin(rotation)
    hinge = (center[0] + hinge_local * co, center[1] + hinge_local * si, 0)
    pivot = B.empty(name, collection, semantic_parent, hinge)
    pivot.rotation_euler.z = rotation if direction == 1 else rotation + math.pi
    panel_width = opening_width - 0.06
    panel_height = opening_height - 0.06
    panel_center = panel_width / 2
    B.cube(name + "_Panel", (panel_center, 0.04, panel_height / 2 + 0.03),
           (panel_width, 0.22, panel_height), mats["wood"], collection, pivot)
    # Recessed plank rhythm and broad iron straps read from the elevated camera.
    for i in range(4):
        x = panel_width * (0.14 + i * 0.24)
        B.cube(name + "_Plank", (x, -0.095, panel_height / 2 + 0.03),
               (0.055, 0.035, panel_height * 0.90), mats["timber"], collection, pivot)
    for z in (0.52, panel_height / 2 + 0.03, panel_height - 0.46):
        B.cube(name + "_IronStrap", (panel_center, -0.13, z),
               (panel_width * 0.90, 0.06, 0.10), mats["iron"], collection, pivot)
    B.cylinder(name + "_Ring", (panel_width * 0.78, -0.18, panel_height * 0.50),
               0.12, 0.07, 8, mats["brass"], collection, pivot, rot=(math.pi / 2, 0, 0))
    return pivot, {
        "openingWidth": opening_width,
        "openingHeight": opening_height,
        "panelWidth": panel_width,
        "panelHeight": panel_height,
        "horizontalGap": opening_width - panel_width,
        "verticalGap": opening_height - panel_height,
    }


def stained_glass_window(B, name, position, rotation, width, height, mats,
                         collection, parent, palette=("glass_blue", "glass_gold", "glass_red")):
    """Create a chunky multi-pane stained-glass window with a readable frame."""
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    bar, depth = 0.14, 0.34
    for x in (-width / 2, width / 2):
        B.cube(name + "_FrameV", (x, 0, height / 2), (bar, depth, height + bar),
               mats["timber"], collection, group)
    for z in (0, height):
        B.cube(name + "_FrameH", (0, 0, z), (width + bar, depth, bar),
               mats["timber"], collection, group)
    for x in (-width / 6, width / 6):
        B.cube(name + "_Mullion", (x, -0.01, height / 2), (0.085, depth, height - 0.12),
               mats["timber"], collection, group)
    B.cube(name + "_Transom", (0, -0.01, height / 2), (width - 0.12, depth, 0.085),
           mats["timber"], collection, group)
    pane_w = (width - 0.36) / 3
    pane_h = (height - 0.28) / 2
    for row in range(2):
        for col in range(3):
            key = palette[(row * 3 + col) % len(palette)]
            x = (col - 1) * (pane_w + 0.06)
            z = (row + 0.5) * pane_h + row * 0.06 + 0.08
            for side in (-0.18, 0.18):
                B.cube(name + f"_Pane_{row}_{col}", (x, side, z),
                       (pane_w, 0.055, pane_h), mats[key], collection, group)
    for side in (-0.22, 0.22):
        B.cube(name + "_Diamond", (0, side, height / 2), (0.40, 0.05, 0.40),
               mats["glass_green"], collection, group, math.pi / 4)
    B.cube(name + "_Sill", (0, 0.02, -0.12), (width + 0.42, 0.38, 0.22),
           mats["stone_light"], collection, group)
    return group


def bookcase(B, name, position, rotation, width, mats, collection, parent):
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    B.cube(name + "_Back", (0, 0.16, 1.25), (width, 0.16, 2.50), mats["timber"], collection, group)
    for x in (-width / 2 + 0.12, width / 2 - 0.12):
        B.cube(name + "_Side", (x, 0, 1.25), (0.18, 0.62, 2.58), mats["wood"], collection, group)
    for z in (0.18, 0.78, 1.38, 1.98, 2.56):
        B.cube(name + "_Shelf", (0, -0.04, z), (width, 0.66, 0.14), mats["wood"], collection, group)
    book_keys = ("rug_red", "rug_blue", "rug_green", "parchment", "glass_blue")
    for row in range(4):
        count = min(10, max(4, int(width / 0.30) - 1))
        for i in range(count):
            x = -width / 2 + 0.30 + i * ((width - 0.60) / max(1, count - 1))
            h = 0.32 + 0.09 * ((i + row) % 3)
            B.cube(name + f"_Book_{row}_{i}", (x, -0.28, 0.27 + row * 0.60 + h / 2),
                   (0.19, 0.30, h), mats[book_keys[(i + row) % len(book_keys)]], collection, group,
                   (i % 3 - 1) * 0.035)
    return group


def bench_with_back(B, name, position, rotation, width, mats, collection, parent):
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    B.cube(name + "_Seat", (0, 0, 0.58), (width, 0.58, 0.18), mats["wood"], collection, group)
    B.cube(name + "_Back", (0, 0.24, 1.04), (width, 0.16, 0.74), mats["wood"], collection, group,
           -0.08)
    for x in (-width / 2 + 0.26, width / 2 - 0.26):
        B.cube(name + "_Leg", (x, 0, 0.29), (0.16, 0.42, 0.58), mats["timber"], collection, group)
        B.cube(name + "_Finial", (x, 0.24, 1.46), (0.22, 0.22, 0.22), mats["brass"], collection, group,
               math.pi / 4)
    return group


def wall_banner(B, name, position, rotation, width, height, field, emblem, mats, collection, parent):
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    B.cylinder(name + "_Rod", (0, 0, height + 0.15), width / 2 + 0.20, 0.10, 8,
               mats["timber"], collection, group, rot=(0, math.pi / 2, 0))
    B.cube(name + "_Field", (0, 0, height / 2), (width, 0.08, height), mats[field], collection, group)
    B.cube(name + "_Emblem", (0, -0.075, height * 0.56), (width * 0.34, 0.05, width * 0.34),
           mats[emblem], collection, group, math.pi / 4)
    return group


def lectern(B, name, position, rotation, mats, collection, parent):
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    B.cube(name + "_Base", (0, 0, 0.14), (1.45, 0.82, 0.28), mats["timber"], collection, group)
    B.cube(name + "_Stem", (0, 0.12, 0.67), (0.34, 0.34, 1.08), mats["wood"], collection, group)
    top = B.cube(name + "_Top", (0, -0.05, 1.28), (1.65, 0.92, 0.18), mats["wood"], collection, group)
    top.rotation_euler.x = math.radians(13)
    left = B.cube(name + "_PageL", (-0.39, -0.18, 1.41), (0.72, 0.58, 0.055),
                  mats["parchment"], collection, group, 0.07)
    right = B.cube(name + "_PageR", (0.39, -0.18, 1.41), (0.72, 0.58, 0.055),
                   mats["parchment"], collection, group, -0.07)
    left.rotation_euler.x = right.rotation_euler.x = math.radians(13)
    B.cylinder(name + "_Ink", (0.64, -0.36, 1.50), 0.11, 0.18, 7,
               mats["iron"], collection, group)
    quill = B.cube(name + "_Quill", (0.58, -0.36, 1.72), (0.055, 0.055, 0.62),
                   mats["brass"], collection, group, -0.30)
    quill.rotation_euler.x = math.radians(18)
    return group


def display_cabinet(B, name, position, rotation, width, mats, collection, parent):
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    B.cube(name + "_Body", (0, 0.13, 1.16), (width, 0.70, 2.32), mats["wood"], collection, group)
    for x in (-width / 2 + 0.10, 0, width / 2 - 0.10):
        B.cube(name + "_FrameV", (x, -0.31, 1.25), (0.14, 0.10, 1.85), mats["timber"], collection, group)
    for z in (0.34, 1.03, 1.72, 2.28):
        B.cube(name + "_FrameH", (0, -0.31, z), (width, 0.10, 0.13), mats["timber"], collection, group)
    for row in range(3):
        for col in range(2):
            x = (-0.25 if col == 0 else 0.25) * width
            mat = mats["path"] if (row + col) % 2 == 0 else mats["rug_green"]
            B.cylinder(name + f"_Pack_{row}_{col}", (x, -0.34, 0.60 + row * 0.66),
                       0.25, 0.42, 7, mat, collection, group)
    return group
