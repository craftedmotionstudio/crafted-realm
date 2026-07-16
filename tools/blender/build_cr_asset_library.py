"""Build the reusable Crafted Realm low-poly Blender Asset Browser library."""
from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_guide_hall_v5 as H
import cr_lowpoly_assetkit as K


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "assets" / "blender" / "library" / "crafted_realm_lowpoly_v1.blend"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def mark(root, description, tags):
    root.asset_mark()
    root.asset_data.description = description
    root.asset_data.author = "Crafted Realm"
    for tag in tags:
        root.asset_data.tags.new(tag)
    root["crKitVersion"] = 1
    root["unitsPerTile"] = 1


def main():
    B.clean_scene()
    mats = H.setup_materials()
    collection = bpy.data.collections.new("CraftedRealm_LowPoly_Kit_v1")
    bpy.context.scene.collection.children.link(collection)

    window = K.stained_glass_window(B, "CR_StainedGlass_Window", (0, 0, 0), 0,
                                    1.95, 1.92, mats, collection, None)
    mark(window, "Two-sided chunky stained glass window with frame and sill",
         ("architecture", "window", "stained-glass"))

    bookcase = K.bookcase(B, "CR_Bookcase", (0, 0, 0), 0, 4.75,
                          mats, collection, None)
    mark(bookcase, "Room-scale bookcase with authored books and shelf rhythm",
         ("interior", "records", "storage"))

    bench = K.bench_with_back(B, "CR_BackedBench", (0, 0, 0), 0, 3.15,
                              mats, collection, None)
    mark(bench, "Low-poly civic bench with back, legs, and brass finials",
         ("interior", "seating", "civic"))

    lectern = K.lectern(B, "CR_Lectern", (0, 0, 0), 0,
                        mats, collection, None)
    mark(lectern, "Functional lectern with open book, inkwell, and quill",
         ("interior", "teaching", "records"))

    cabinet = K.display_cabinet(B, "CR_ProvisionCabinet", (0, 0, 0), 0, 4.75,
                                mats, collection, None)
    mark(cabinet, "Fitted provision cabinet with visible lesson packs",
         ("interior", "storage", "provisions"))

    banner = K.wall_banner(B, "CR_HeraldicBanner", (0, 0, 0), 0, 1.45, 1.90,
                           "rug_blue", "brass", mats, collection, None)
    mark(banner, "Readable low-poly civic banner with changeable field and emblem",
         ("interior", "heraldry", "wall-detail"))

    door_root = B.empty("CR_FittedDoor", collection)
    door_static = B.empty("door_static", collection, door_root)
    door_semantic = B.empty("door_semantic", collection, door_root)
    K.framed_door(B, "door", (0, 0), 2.60, 3.12, 4.15, "left", 0,
                  mats, collection, door_static, door_semantic)
    mark(door_root, "Full-frame medieval door with fitted leaf, lintel, infill, and hardware",
         ("architecture", "door", "semantic"))

    for root in (window, bookcase, bench, lectern, cabinet, banner, door_root):
        try:
            root.asset_generate_preview()
        except RuntimeError:
            pass
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
    print("CR_LOW_POLY_LIBRARY_READY", OUTPUT)


if __name__ == "__main__":
    main()
