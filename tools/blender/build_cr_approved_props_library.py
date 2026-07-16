"""Assemble owner-approved props into one Blender Asset Browser library.

Individual editable sources remain authoritative.  This library links their
asset collections into one browseable .blend without rebuilding or flattening
their custom topology, materials, pivots, or animation actions.
"""
from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "assets" / "blender" / "library" / "crafted_realm_approved_props_v1.blend"
REPORT = ROOT / "assets" / "catalogs" / "approved_props_library_v1.json"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)

ASSETS = (
    {
        "id": "cellar_reserve_chest_v1",
        "source": ROOT / "assets" / "blender" / "props" / "cellar_reserve_chest_v1.blend",
        "collection": "ASSET_CellarReserveChestV1",
        "root": "cellar_reserve_chest_v1",
        "description": "Animated communal storm-reserve chest with rear-hinged lid",
        "tags": ("approved", "cellar", "storage", "animated"),
    },
    {
        "id": "cellar_wall_torch_v1",
        "source": ROOT / "assets" / "blender" / "props" / "cellar_wall_torch_v1.blend",
        "collection": "ASSET_CellarWallTorchV1",
        "root": "cellar_wall_torch_v1",
        "description": "Animated hand-built medieval wall torch with fitted forged bracket",
        "tags": ("approved", "cellar", "lighting", "animated"),
    },
    {
        "id": "cellar_quiet_corner_v1",
        "source": ROOT / "assets" / "blender" / "props" / "cellar_quiet_corner_v1.blend",
        "collection": "ASSET_CellarQuietCornerV1",
        "root": "cellar_quiet_corner_v1",
        "description": "Coordinated cellar seating family with two chairs, side table, and yarn basket",
        "tags": ("approved", "cellar", "seating", "domestic", "interactive"),
    },
)


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.users == 0:
            bpy.data.collections.remove(collection)


def load_asset(spec):
    if not spec["source"].is_file():
        raise RuntimeError(f"approved source is missing: {spec['source']}")
    with bpy.data.libraries.load(str(spec["source"]), link=False) as (data_from, data_to):
        if spec["collection"] not in data_from.collections:
            raise RuntimeError(f"{spec['collection']} is missing from {spec['source'].name}")
        data_to.collections = [spec["collection"]]
    collection = data_to.collections[0]
    bpy.context.scene.collection.children.link(collection)
    root = collection.objects.get(spec["root"])
    if root is None:
        raise RuntimeError(f"{spec['root']} is missing from {spec['collection']}")
    root.asset_mark()
    root.asset_data.description = spec["description"]
    root.asset_data.author = "Crafted Realm"
    for tag in spec["tags"]:
        root.asset_data.tags.new(tag)
    root["approvedLibraryVersion"] = 1
    root["catalogAssetId"] = spec["id"]
    try:
        root.asset_generate_preview()
    except RuntimeError:
        pass
    return root


def main():
    reset()
    roots = [load_asset(spec) for spec in ASSETS]
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
    result = {
        "schemaVersion": 1,
        "libraryId": "crafted_realm_approved_props_v1",
        "blend": str(OUTPUT.relative_to(ROOT)).replace("\\", "/"),
        "builder": "tools/blender/build_cr_approved_props_library.py",
        "assetCount": len(roots),
        "assetIds": [spec["id"] for spec in ASSETS],
        "rule": "Only 9.0+ owner-standard assets with editable individual Blender sources enter this library.",
    }
    REPORT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print("CR_APPROVED_PROPS_LIBRARY", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
