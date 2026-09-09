"""Build the authored low-poly mining rock family: tin, copper, and clay.

The Bible reference uses low, angular mineral clusters rather than round
boulders with colored dots.  Each root in this GLB is independently cloneable
by the r128 runtime and keeps its pivot at ground centre.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "props" / "mining_rocks_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "mining_rocks_v1.glb"
PREVIEW = ROOT / "scratchpad" / "mining_rocks_v1"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)


def clean():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mat(name, color):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = .88
    return material


def mesh(name, verts, faces, material, parent):
    data = bpy.data.meshes.new(name + "Mesh")
    data.from_pydata(verts, [], faces)
    data.materials.append(material)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    for poly in data.polygons:
        poly.use_smooth = False
    return obj


def lump(name, x, y, sx, sy, h, material, parent, skew=.0):
    verts = [
        (-.80*sx,-.58*sy,0),(.66*sx,-.72*sy,0),(.84*sx,.36*sy,0),(.04*sx,.74*sy,0),(-.72*sx,.45*sy,0),
        (-.46*sx,-.30*sy,.56*h),(.36*sx,-.38*sy,.68*h),(.54*sx,.22*sy,.54*h),(-.02*sx,.50*sy,.82*h),(-.48*sx,.25*sy,.61*h),
        (skew*sx,-.02*sy,h),
    ]
    faces = [
        (0,1,2,3,4),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0),
        (5,10,6),(6,10,7),(7,10,8),(8,10,9),(9,10,5),
    ]
    obj = mesh(name, verts, faces, material, parent)
    obj.location.x=x;obj.location.y=y
    return obj


def shard(name, x, y, rot, radius, height, base_mat, face_mat, parent, lean=.0):
    # Eight custom vertices produce the characteristic folded, triangular OSRS
    # mining-rock silhouette while remaining watertight and flat shaded.
    verts = [
        (-radius,-radius*.52,0),(radius*.70,-radius*.68,0),(radius*.86,radius*.30,0),(-radius*.48,radius*.72,0),
        (-radius*.42,-radius*.24,height*.42),(radius*.34,-radius*.28,height*.48),(radius*.28,radius*.20,height*.58),
        (-radius*.18+lean,radius*.20,height),
    ]
    faces = [(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0),(4,7,6,5)]
    obj = mesh(name, verts, faces, base_mat, parent)
    obj.data.materials.append(face_mat)
    # Give the two upward facets the mineral colour rather than gluing dots on.
    obj.data.polygons[-1].material_index=1
    obj.data.polygons[-2].material_index=1
    obj.location.x=x;obj.location.y=y;obj.rotation_euler[2]=rot
    return obj


def family_root(kind, materials):
    root=bpy.data.objects.new(f"Rock_{kind.title()}",None)
    bpy.context.collection.objects.link(root)
    root["kind"]=kind;root["unitsPerTile"]=1;root["semantic"]="mineable-rock"
    stone=materials["stone"] if kind!="clay" else materials["clay_stone"]
    mineral=materials[kind]
    lump(f"{kind}_Bed",0,0,1.0,.88,.54,stone,root,.10)
    specs = [
        (-.48,-.10,-.50,.44,.82,-.08),(.10,-.20,.18,.50,1.03,.08),(.47,.04,.70,.40,.76,.05),
        (-.20,.36,-.16,.36,.66,-.04),(.28,.40,.42,.32,.58,.02),
    ]
    for i,(x,y,rot,r,h,lean) in enumerate(specs):
        shard(f"{kind}_Shard_{i}",x,y,rot,r,h,stone,mineral,root,lean)
    # Two smaller broken faces make the cluster read mined rather than decorative.
    shard(f"{kind}_Chip_A",-.72,.42,.3,.20,.35,stone,mineral,root,-.02)
    shard(f"{kind}_Chip_B",.66,-.38,-.5,.18,.28,stone,mineral,root,.01)
    return root


def build():
    clean()
    materials={
        "stone":mat("Rock warm grey",(.46,.43,.37)),
        "clay_stone":mat("Clay-bearing stone",(.48,.38,.27)),
        "tin":mat("Tin pale mineral face",(.77,.79,.76)),
        "copper":mat("Copper rust mineral face",(.67,.30,.12)),
        "clay":mat("Clay ochre mineral face",(.72,.49,.27)),
    }
    roots=[family_root(kind,materials) for kind in ("tin","copper","clay")]
    return roots


def proof(roots):
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE_NEXT";scene.render.resolution_x=1200;scene.render.resolution_y=850
    scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
    scene.world.use_nodes=True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.08,.065,.05,1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.8
    for i,root in enumerate(roots):root.location.x=(i-1)*3.2
    camera_data=bpy.data.cameras.new("RockProofCamera");camera_data.type="ORTHO";camera_data.ortho_scale=10
    camera=bpy.data.objects.new("RockProofCamera",camera_data);bpy.context.collection.objects.link(camera);scene.camera=camera
    for name,loc,energy,size,color in (("Key",(-5,-7,8),1200,5,(1,.72,.46)),("Fill",(6,2,7),750,6,(.55,.66,.78))):
        data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="DISK";data.size=size;data.color=color
        light=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(light);light.location=loc
        light.rotation_euler=(Vector((0,0,.4))-light.location).to_track_quat("-Z","Y").to_euler()
    views={"gameplay":(6,-8,7),"north":(0,9,5.5),"south":(0,-9,5.5),"east":(9,0,5.5),"west":(-9,0,5.5)}
    for name,loc in views.items():
        camera.location=loc;camera.rotation_euler=(Vector((0,0,.45))-camera.location).to_track_quat("-Z","Y").to_euler()
        scene.render.filepath=str(PREVIEW/f"{name}.png");bpy.ops.render.render(write_still=True)
    for root in roots:root.location.x=0


def save_export(roots):
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.object.select_all(action="DESELECT")
    for root in roots:
        root.select_set(True)
        for child in root.children_recursive:child.select_set(True)
    bpy.context.view_layer.objects.active=roots[0]
    bpy.ops.export_scene.gltf(filepath=str(MODEL),export_format="GLB",use_selection=True,
        export_apply=True,export_yup=True,export_materials="EXPORT",export_extras=True,export_animations=False)


if __name__ == "__main__":
    authored=build();proof(authored);save_export(authored)
    print(f"[mining_rocks_v1] wrote {SOURCE} and {MODEL}")
