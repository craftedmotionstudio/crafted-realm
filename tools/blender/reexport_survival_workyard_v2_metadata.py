"""Fast metadata-only re-export after the full v2 Blender build is saved."""
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_survival_workyard_v2.blend"
SURFACE = ROOT / "assets" / "models" / "buildings" / "holm_survival_workyard_v2.glb"
CELLAR = ROOT / "assets" / "models" / "buildings" / "holm_survival_workyard_cellar_v1.glb"


def descendants(root):
    return [root, *root.children_recursive]


def export(root, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_cameras=False, export_lights=False)


def main():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    surface = bpy.data.objects["holm_survival_workyard_v2"]
    cellar = bpy.data.objects["holm_survival_workyard_cellar_v1"]
    surface["pipelineVersion"] = 1
    surface["assetClass"] = "building"
    surface["unitsPerTile"] = 1
    cellar["pipelineVersion"] = 1
    cellar["assetClass"] = "interior"
    cellar["unitsPerTile"] = 1
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(surface, SURFACE)
    export(cellar, CELLAR)
    print("SURVIVAL_WORKYARD_METADATA_READY")


if __name__ == "__main__":
    main()
