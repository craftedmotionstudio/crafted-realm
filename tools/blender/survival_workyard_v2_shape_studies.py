"""Build three non-rectangular Survival Workyard v2 massing studies.

These are selection studies only.  They prove footprint, purposeful masses,
roof hierarchy, work-court placement, and player-scale approach before another
production GLB is allowed to replace v1.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import guide_hall_shape_studies as G


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scratchpad" / "survival_workyard_v2_shape_studies"
OUT.mkdir(parents=True, exist_ok=True)


def timber_post(c, root, x, y, h=2.75):
    G.cube("YardPost", (x, y, h / 2), (.22, .22, h), G.M["timber"], c, root)
    G.cube("YardPostFoot", (x, y, .12), (.46, .46, .24), G.M["stone"], c, root)


def fence_run(c, root, a, b, rails=2):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    angle = math.atan2(dy, dx)
    posts = max(2, int(length / 1.8) + 1)
    for i in range(posts):
        t = i / (posts - 1)
        G.cube("PenPost", (ax + dx * t, ay + dy * t, .72), (.14, .14, 1.44),
               G.M["timber"], c, root)
    for r in range(rails):
        G.cube("PenRail", ((ax + bx) / 2, (ay + by) / 2, .48 + r * .52),
               (length, .10, .12), G.M["roof_gold"], c, root, rot=angle)


def chicken_pen(c, root, cx, cy, w, d, open_side="S"):
    x0, x1, y0, y1 = cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2
    fence_run(c, root, (x0, y0), (x0, y1))
    fence_run(c, root, (x1, y0), (x1, y1))
    fence_run(c, root, (x0, y1), (x1, y1))
    if open_side != "S":
        fence_run(c, root, (x0, y0), (x1, y0))
    else:
        fence_run(c, root, (x0, y0), (cx - .75, y0))
        fence_run(c, root, (cx + .75, y0), (x1, y0))
    # Feed trough and roost make the socket purposeful without shipping an
    # unanimated placeholder chicken before the NPC phase.
    G.cube("FeedTrough", (cx - w * .25, cy, .25), (1.15, .50, .50), G.M["stone_light"], c, root)
    G.cube("Roost", (cx + w * .18, cy + d * .22, .48), (1.45, .16, .16), G.M["timber"], c, root)
    G.cube("ChickenSpawnSocket", (cx + .35, cy - .15, .07), (.42, .42, .14), G.M["brass"], c, root)


def lean_roof(c, root, cx, cy, w, d, z=3.1, rot=0.0):
    roof = G.cube("WorkCourtLeanRoof", (cx, cy, z), (w, d, .18), G.M["roof_gold"], c, root, rot=rot)
    roof.rotation_euler.x = .18
    return roof


def approach(c, root, x, y, rot=0.0):
    co, si = math.cos(rot), math.sin(rot)
    for i in range(4):
        lx, ly = 0, -i * .72
        px, py = x + lx * co - ly * si, y + lx * si + ly * co
        G.cube("ApproachStone", (px, py, .07), (2.15 - i * .15, .60, .14),
               G.M["path"], c, root, rot=rot + (i - 1.5) * .025)


def hatch_marker(c, root, x, y, rot=0.0):
    G.cube("CellarHatch", (x, y, .16), (1.55, 1.25, .20), G.M["door"], c, root, rot=rot)
    for side in (-1, 1):
        G.cube("HatchIron", (x + side * .48 * math.cos(rot), y + side * .48 * math.sin(rot), .28),
               (.10, 1.12, .08), G.M["stone"], c, root, rot=rot)


def hearth_court():
    c, root = G.new_study("A_HearthCourt")
    # Enclosed tool lodge, short connector, and eight-sided hearth room.
    G.add_rect_mass("A_ToolLodge", -4.0, 0.0, 8.2, 12.0, 3.0, 2.0, c, root)
    G.add_rect_mass("A_Connector", 1.25, 3.45, 3.0, 3.2, 2.35, 1.15, c, root)
    G.add_oct_mass("A_TeachingHearth", 5.0, 1.0, 3.35, 2.95, 2.05, c, root, sides=8)
    # Lower open work court fills only the functional gap; it does not square
    # off the top-down silhouette.
    for p in ((.45, -5.0), (4.6, -4.6), (7.15, -2.7)):
        timber_post(c, root, *p)
    lean_roof(c, root, 2.4, -4.55, 5.0, 3.1, 3.05, -.03)
    chicken_pen(c, root, 5.2, -4.9, 3.5, 3.0)
    G.add_door("A_TrailDoor", (-4.0, -6.02, 1.58), (1.75, .22, 2.6), c, root)
    G.add_door("A_PondDoor", (7.87, 1.0, 1.58), (.22, 1.75, 2.6), c, root, math.pi / 2)
    G.add_window("A_LodgeWindow", (-8.12, 1.65, 2.05), (.16, 1.15, 1.35), c, root, math.pi / 2)
    hatch_marker(c, root, -4.4, 1.0)
    approach(c, root, -4.0, -6.75)
    return c, root


def crooked_larder():
    c, root = G.new_study("B_CrookedLarder")
    # A deep L: the cross wing owns storm storage and the clipped bay owns the
    # smoke hearth, so the turns are program rather than decoration.
    G.add_rect_mass("B_MainLodge", 1.0, -1.6, 12.5, 7.2, 3.0, 1.95, c, root)
    G.add_rect_mass("B_StormWing", -4.0, 3.25, 5.8, 8.0, 2.75, 1.55, c, root, rot=math.pi / 2)
    clipped = [(5.0, .8), (7.8, .8), (9.0, 2.0), (8.25, 4.6), (5.0, 4.6)]
    G.prism("B_SmokeBayBase", [(x, y) for x, y in clipped], 0, .72, G.M["stone"], c, root)
    G.prism("B_SmokeBay", clipped, .72, 2.75, G.M["plaster"], c, root)
    G.poly_roof("B_SmokeBayRoof", [(x, y) for x, y in clipped], 3.47, 5.0, G.M["roof_gold"], c, root, .12)
    for p in ((-5.7, -3.9), (-1.6, -3.9), (-5.7, -1.0)):
        timber_post(c, root, *p)
    lean_roof(c, root, -3.65, -3.85, 4.5, 3.0, 3.0)
    chicken_pen(c, root, -5.6, -6.0, 3.8, 3.0)
    G.add_door("B_TrailDoor", (-4.0, 7.23, 1.58), (1.75, .22, 2.6), c, root, math.pi)
    G.add_door("B_PondDoor", (7.25, -1.6, 1.58), (.22, 1.75, 2.6), c, root, math.pi / 2)
    hatch_marker(c, root, -3.8, 2.8, math.pi / 2)
    approach(c, root, -4.0, 8.0, math.pi)
    return c, root


def rain_catch_u():
    c, root = G.new_study("C_RainCatchU")
    # Unequal U-shaped wings enclose a working court. The east end terminates
    # in a six-sided hearth room so the U is not a mirrored civic courtyard.
    G.add_rect_mass("C_NorthStore", 0.0, 4.2, 13.5, 4.2, 2.8, 1.55, c, root)
    G.add_rect_mass("C_WestToolWing", -5.0, -.2, 4.0, 8.0, 3.0, 1.75, c, root, rot=math.pi / 2)
    G.add_rect_mass("C_EastWorkWing", 4.8, .8, 4.0, 6.0, 2.55, 1.35, c, root, rot=math.pi / 2)
    G.add_oct_mass("C_HearthEnd", 4.8, -3.0, 2.7, 2.85, 1.8, c, root, sides=6, angle=math.pi / 6)
    # Rain trough is functional survival infrastructure, not a decorative fountain.
    G.cube("RainTrough", (0, .15, .35), (3.1, 1.05, .70), G.M["stone_light"], c, root)
    G.cube("TroughWater", (0, .15, .72), (2.72, .72, .06), G.M["glass"], c, root)
    chicken_pen(c, root, .2, -2.4, 4.4, 3.2)
    G.add_door("C_TrailDoor", (-5.0, -4.22, 1.58), (1.75, .22, 2.6), c, root)
    G.add_door("C_PondDoor", (7.15, -3.0, 1.58), (.22, 1.75, 2.6), c, root, math.pi / 2)
    hatch_marker(c, root, -1.9, 4.1)
    approach(c, root, -5.0, -5.0)
    return c, root


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (.04, .05, .04)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=13.8, depth=.30, location=(0, 0, -.22))
    ground = bpy.context.object
    ground.name = "StudyGround"
    ground.data.materials.append(G.M["grass"])
    bpy.ops.object.camera_add(location=(20, -24, 20))
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 26.0
    look_at(cam, (0, 0, 2.1))
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(7, -10, 18))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-30))
    sun.data.energy = 2.25
    sun.data.color = (1.0, .77, .50)
    bpy.ops.object.light_add(type="AREA", location=(-8, -4, 13))
    fill = bpy.context.object
    fill.data.energy = 1000
    fill.data.size = 11
    fill.data.color = (.62, .75, 1.0)
    look_at(fill, (0, 0, 1.6))
    return ground, cam


def render_studies(studies, ground, cam):
    scene = bpy.context.scene
    iso_loc, iso_rot, iso_scale = cam.location.copy(), cam.rotation_euler.copy(), cam.data.ortho_scale
    for key, collection, root in studies:
        for _, candidate, _ in studies:
            candidate.hide_render = candidate != collection
        scene.render.filepath = str(OUT / f"{key}.png")
        bpy.ops.render.render(write_still=True)
        cam.location = (0, -.001, 34)
        cam.data.ortho_scale = 28.0
        look_at(cam, (0, 0, 0))
        scene.render.filepath = str(OUT / f"{key}_plan.png")
        bpy.ops.render.render(write_still=True)
        cam.location, cam.rotation_euler, cam.data.ortho_scale = iso_loc, iso_rot, iso_scale
    for _, collection, _ in studies:
        collection.hide_render = False
    studies[0][2].location.x = -22
    studies[1][2].location.x = 0
    studies[2][2].location.x = 22
    ground.hide_render = True
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "survival_workyard_v2_shape_studies.blend"))


def main():
    G.clean_scene()
    G.setup_materials()
    studies = [
        ("A_hearth_court", *hearth_court()),
        ("B_crooked_larder", *crooked_larder()),
        ("C_rain_catch_u", *rain_catch_u()),
    ]
    ground, cam = setup_render()
    render_studies(studies, ground, cam)
    print("SURVIVAL_WORKYARD_V2_STUDIES_READY", OUT)


if __name__ == "__main__":
    main()
