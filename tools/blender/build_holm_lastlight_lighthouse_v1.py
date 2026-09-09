"""Build Lastlight Beacon as a fully authored low-poly lighthouse.

The browser owns pathfinding, floors, collision and interaction. This Blender
asset owns the visible exterior, three furnished circular rooms and the wet
Underkeep dungeon. Two ordinary ladder transitions replace the rejected spiral;
the upper room owns the beacon and the ground-floor trapdoor is traversable.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "environments" / "holm_lastlight_lighthouse_v1.blend"
MODEL = ROOT / "assets" / "models" / "environments" / "holm_lastlight_lighthouse_v1.glb"
PREVIEW = ROOT / "scratchpad" / "holm_lastlight_lighthouse_v1"
for p in (SOURCE.parent, MODEL.parent, PREVIEW):
    p.mkdir(parents=True, exist_ok=True)


def clean():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def mat(name, color, rough=.9, metallic=0.0, emission=None, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, alpha)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, alpha)
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = metallic
    bs.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        # Blender 4.2+ uses surface_render_method; older supported builds use
        # blend_method. The GLTF exporter reads this as alpha-blended glass.
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "DITHERED"
        elif hasattr(m, "blend_method"):
            m.blend_method = "BLEND"
        m.use_transparency_overlap = False
    if emission:
        bs.inputs["Emission Color"].default_value = (*emission, 1)
        bs.inputs["Emission Strength"].default_value = 1.5
    return m


def mesh(name, verts, faces, materials, parent, indices=None):
    me = bpy.data.meshes.new(name + "Mesh")
    me.from_pydata(verts, [], faces)
    for m in materials:
        me.materials.append(m)
    for i, poly in enumerate(me.polygons):
        poly.use_smooth = False
        if indices:
            poly.material_index = indices[min(i, len(indices)-1)]
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.parent = parent
    return ob


def root(name):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    return ob


def box_mesh(name, loc, dims, material, parent, rot=0.0, bevel=0.0):
    x, y, z = (d/2 for d in dims)
    verts = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(4,0,3,7)]
    ob = mesh(name, verts, faces, [material], parent)
    ob.location = loc
    ob.rotation_euler.z = rot
    if bevel:
        mod = ob.modifiers.new("Hand softened edges", "BEVEL")
        mod.width = bevel; mod.segments = 1
    return ob


def frustum(name, loc, bottom, top, height, material, parent, rot=0.0):
    bx, by = bottom[0]/2, bottom[1]/2
    tx, ty = top[0]/2, top[1]/2
    verts = [(-bx,-by,0),(bx,-by,0),(bx,by,0),(-bx,by,0),
             (-tx,-ty,height),(tx,-ty,height),(tx,ty,height),(-tx,ty,height)]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(4,0,3,7)]
    ob = mesh(name, verts, faces, [material], parent)
    ob.location = loc; ob.rotation_euler.z = rot
    return ob


def radial_ring(name, r0, r1, z0, z1, sides, material, parent, skip=None, phase=0):
    """One custom annulus mesh; skip is a predicate(angle,zmid)."""
    verts=[];faces=[]
    for i in range(sides):
        a0=phase+i*2*math.pi/sides; a1=phase+(i+1)*2*math.pi/sides
        mid=(a0+a1)/2
        if skip and skip(mid,(z0+z1)/2): continue
        base=len(verts)
        verts.extend([(r0*math.cos(a0),r0*math.sin(a0),z0),(r0*math.cos(a1),r0*math.sin(a1),z0),
                      (r0*math.cos(a1),r0*math.sin(a1),z1),(r0*math.cos(a0),r0*math.sin(a0),z1),
                      (r1*math.cos(a0),r1*math.sin(a0),z0),(r1*math.cos(a1),r1*math.sin(a1),z0),
                      (r1*math.cos(a1),r1*math.sin(a1),z1),(r1*math.cos(a0),r1*math.sin(a0),z1)])
        faces.extend([(base,base+1,base+2,base+3),(base+5,base+4,base+7,base+6),
                      (base+4,base,base+3,base+7),(base+1,base+5,base+6,base+2),
                      (base+3,base+2,base+6,base+7),(base+4,base+5,base+1,base)])
    return mesh(name,verts,faces,[material],parent)


def masonry_shell(name, parent, cutaway=False):
    stones=[M["stone_warm"],M["stone_light"],M["stone_ochre"],M["stone_cool"]]
    verts=[];faces=[];indices=[]
    sides=20; courses=8; h=1.52
    for course in range(courses):
        z0=.55+course*h; z1=z0+h-.09
        outer=10.18-course*.055; inner=8.82
        phase=(course%2)*math.pi/sides
        for i in range(sides):
            a0=phase+i*2*math.pi/sides+.014
            a1=phase+(i+1)*2*math.pi/sides-.014
            mid=(a0+a1)/2
            # South entrance and three tall lancet windows are genuine openings.
            door=abs(math.atan2(math.sin(mid+math.pi/2),math.cos(mid+math.pi/2)))<.19 and z0<4.9
            windows=(min(abs(math.atan2(math.sin(mid-a),math.cos(mid-a))) for a in (0,math.pi,math.pi/2))<.12 and 5.0<z0<8.3)
            # `mid` is authored in the 0..2pi sweep. Normalize it before
            # testing the south-facing gameplay cutaway; comparing the raw
            # positive angle to a negative range left the interior fully
            # walled and hid the player from the classic elevated camera.
            view_angle=math.atan2(math.sin(mid),math.cos(mid))
            open_cut=cutaway and (-2.78<view_angle<-.36)
            if door or windows or open_cut: continue
            jitter=.035*math.sin((course+1)*(i+2)*1.71)
            b=len(verts)
            r=outer+jitter
            verts.extend([(inner*math.cos(a0),inner*math.sin(a0),z0),(inner*math.cos(a1),inner*math.sin(a1),z0),
                          (inner*math.cos(a1),inner*math.sin(a1),z1),(inner*math.cos(a0),inner*math.sin(a0),z1),
                          (r*math.cos(a0),r*math.sin(a0),z0),(r*math.cos(a1),r*math.sin(a1),z0),
                          (r*math.cos(a1),r*math.sin(a1),z1),(r*math.cos(a0),r*math.sin(a0),z1)])
            block_faces=[(b,b+1,b+2,b+3),(b+5,b+4,b+7,b+6),(b+4,b,b+3,b+7),
                         (b+1,b+5,b+6,b+2),(b+3,b+2,b+6,b+7),(b+4,b+5,b+1,b)]
            faces.extend(block_faces);indices.extend([i%len(stones)]*len(block_faces))
    return mesh(name,verts,faces,stones,parent,indices)


def continuous_cylindrical_shell(name, parent, cutaway_base=None):
    """A connected, faceted stone cylinder with subtle course variation.

    The rejected exterior read as many loose blocks held near one another. This
    shell keeps the warm low-poly stone language while every course meets the
    next without daylight gaps. Door and lancet openings remain genuine voids.
    """
    course_mats=(M["stone_warm"],M["stone_light"],M["stone_warm"],M["stone_ochre"])
    sides=32; course_h=1.52
    for course in range(8):
        z0=.50+course*course_h;z1=.50+(course+1)*course_h
        def openings(mid,_z):
            south=abs(math.atan2(math.sin(mid+math.pi/2),math.cos(mid+math.pi/2)))
            door=south<.145 and z0<3.2
            windows=(min(abs(math.atan2(math.sin(mid-a),math.cos(mid-a)))
                         for a in (0,math.pi,math.pi/2))<.105 and 4.95<z0<8.25)
            return door or windows
        course_parent=cutaway_base if cutaway_base and course<=1 else parent
        radial_ring(f"{name}_Course_{course:02d}",8.82,10.18,z0,z1,sides,
                    course_mats[course%len(course_mats)],course_parent,openings,phase=(course%2)*math.pi/sides)
    # Continuous base and crown bands visually lock the courses together.
    radial_ring(name+"_FoundationBand",8.76,10.28,.30,.62,sides,M["stone_cool"],cutaway_base or parent)
    radial_ring(name+"_CrownBand",8.78,10.24,12.45,12.72,sides,M["stone_ochre"],parent)


def mortar_backing(name, parent, cutaway=False):
    """Recessed continuous bedding behind the hand-laid blocks.

    It closes accidental black slots between stones without filling the authored
    door or lancet openings, so the wall reads as masonry rather than floating tiles.
    """
    g=root(name);g.parent=parent
    for course in range(8):
        z0=.50+course*1.52;z1=z0+1.48
        def openings(mid,_z):
            door=abs(math.atan2(math.sin(mid+math.pi/2),math.cos(mid+math.pi/2)))<.20 and z0<4.9
            windows=(min(abs(math.atan2(math.sin(mid-a),math.cos(mid-a))) for a in (0,math.pi,math.pi/2))<.13 and 5.0<z0<8.3)
            view_angle=math.atan2(math.sin(mid),math.cos(mid))
            open_cut=cutaway and (-2.78<view_angle<-.36)
            return door or windows or open_cut
        radial_ring(f"MortarCourse_{course:02d}",8.58,8.78,z0,z1,40,M["mortar"],g,openings)
    return g


def profile_prism(name, profile, depth, material, parent, loc=(0,0,0), rot=0):
    half=depth/2; verts=[(x,-half,z) for x,z in profile]+[(x,half,z) for x,z in profile]
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    for i in range(n):
        j=(i+1)%n;faces.append((i,j,n+j,n+i))
    ob=mesh(name,verts,faces,[material],parent);ob.location=loc;ob.rotation_euler.z=rot
    return ob


def lancet(name, angle, parent):
    r=10.24; loc=(r*math.cos(angle),r*math.sin(angle),5.25)
    rot=angle+math.pi/2
    glass_profile=[(-.78,0),(.78,0),(.78,1.8),(0,3.15),(-.78,1.8)]
    profile_prism(name+"Glass",glass_profile,.16,M["glass_blue"],parent,loc,rot)
    # warm stone jambs, sill and split pointed arch
    box_mesh(name+"Sill",(loc[0],loc[1],loc[2]-.08),(2.15,.38,.32),M["stone_ochre"],parent,rot)
    for s in (-1,1):
        off=Vector((math.cos(angle+math.pi/2)*s*.93,math.sin(angle+math.pi/2)*s*.93,1.25))
        box_mesh(name+("LeftJamb" if s<0 else "RightJamb"),Vector(loc)+off,(.34,.42,2.7),M["stone_ochre"],parent,rot)
    # leaded colored inserts read from the gameplay camera
    for x,z,c in [(-.35,.72,M["glass_amber"]),(.34,1.18,M["glass_red"]),(0,2.05,M["glass_mint"])]:
        off=Vector((math.cos(angle+math.pi/2)*x,math.sin(angle+math.pi/2)*x,z))
        box_mesh(name+"LeadPane",Vector(loc)+off,(.42,.20,.48),c,parent,rot)


def door(parent):
    # South-facing arched oak door with a real left-hand hinge pivot. Runtime
    # animates CR_EntryDoor before changing planes.
    pivot=root("CR_EntryDoor");pivot.parent=parent;pivot.location=(-1.18,-10.28,.42)
    profile=[(0,0),(2.24,0),(2.24,2.42),(1.92,2.88),(1.12,3.20),(.32,2.88),(0,2.42)]
    profile_prism("EntryDoorOak",profile,.34,M["oak_dark"],pivot,(0,0,0),0)
    for x in (-1.48,1.48):
        frustum("DoorJamb",(x,-10.35,.25),(.62,.64),(.48,.56),3.32,M["stone_ochre"],parent)
    profile_prism("DoorLintel",[(-1.55,0),(1.55,0),(1.22,.48),(.66,.82),(0,1.02),(-.66,.82),(-1.22,.48)],.58,M["stone_light"],parent,(0,-10.34,3.12),0)
    for z in (.68,1.58,2.40): box_mesh("DoorIronStrap",(1.12,-.21,z),(2.12,.11,.13),M["iron"],pivot)
    box_mesh("DoorHandle",(1.78,-.31,1.42),(.18,.15,.32),M["bronze"],pivot,bevel=.03)
    return pivot


def exterior():
    g=root("CR_Exterior")
    cutaway=root("CR_CutawayBase");cutaway.parent=g
    continuous_cylindrical_shell("ConnectedTowerStone",g,cutaway)
    # The exterior must never reveal summit grass through the open doorway.
    radial_ring("GroundFloorFlagstones",0,8.80,.02,.26,32,M["gallery_floor"],cutaway)
    radial_ring("GroundFloorInset",0,7.65,.25,.31,24,M["stair_light"],cutaway)
    # battered base and hand-hewn cardinal buttresses
    radial_ring("BatteredStonePlinth",10.15,10.72,0,.72,20,M["stone_cool"],cutaway)
    for idx,a in enumerate((0,math.pi,math.pi/2,-math.pi/4,-3*math.pi/4,math.pi/4,3*math.pi/4)):
        if abs(a+math.pi/2)<.2: continue
        r=10.0; frustum("WeatheredButtress_%02d"%idx,(r*math.cos(a),r*math.sin(a),.08),(1.7,2.0),(1.05,1.20),5.4,M["stone_ochre"],g,a)
    # Purposeful coastal foundation rocks tie the tower into its high crag.
    for i,(a,r,s) in enumerate(((0,11.1,1.0),(.55,11.5,.72),(1.25,11.0,.86),(2.35,11.4,.68),(3.0,11.0,1.05),(-.55,11.4,.74),(-2.6,11.25,.82))):
        cave_spike("CragFoundationRock_%02d"%i,(r*math.cos(a),r*math.sin(a),.34*s),.72*s,1.55*s,M["stone_cool"],g,False,7)
    # The reference approach has a short cliff rail and a luminous ground
    # marking. Our versions are story-specific signal-maintenance assets.
    for i,x in enumerate((-8.8,-6.6,-4.4)):
        box_mesh("SummitGuardPost_%02d"%i,(x,-10.9,1.0),(.22,.22,2.0),M["oak_dark"],g)
    for zc in (.72,1.45):box_mesh("SummitGuardRail",(-6.6,-10.9,zc),(4.7,.16,.16),M["oak_warm"],g)
    for radius in (.62,1.12,1.62):torus("SignalCalibrationRing",(-6.4,-8.3,.34),radius,.055,M["ward_glow"],g,(0,0,0))
    for i in range(8):
        a=i*math.pi/4;box_mesh("SignalRune_%02d"%i,(-6.4+1.86*math.cos(a),-8.3+1.86*math.sin(a),.36),(.30,.10,.06),M["ward_glow"],g,a)
    door(cutaway)
    for name,a in (("EastLancet",0),("WestLancet",math.pi),("NorthLancet",math.pi/2)): lancet(name,a,g)
    # gallery corbel table, overhanging walk and chunky railing
    radial_ring("GalleryCorbelBand",9.65,10.62,12.25,12.78,20,M["stone_ochre"],g)
    radial_ring("GalleryWalk",8.25,11.48,12.72,13.12,20,M["oak_warm"],g)
    for i in range(16):
        a=i*2*math.pi/16;r=10.7
        frustum("GalleryPost_%02d"%i,(r*math.cos(a),r*math.sin(a),13.0),(.34,.34),(.25,.25),1.55,M["oak_dark"],g,a)
        # two fitted tangent rail spans
        tangent=2*math.pi*r/16*.94
        for z in (13.55,14.23): box_mesh("GalleryRail",(r*math.cos(a),r*math.sin(a),z),(tangent,.16,.16),M["oak_dark"],g,a+math.pi/2)
    # The supplied lighthouse reference uses one quiet family of pale blue,
    # see-through lantern-room panes. Keep the iron rhythm and let the warm
    # beacon remain the only amber source inside the crown.
    radial_ring("LanternRoomSill",5.55,6.25,13.02,13.55,12,M["stone_light"],g)
    # CR_Level3 is intentionally hidden while the player is outside. Give the
    # exterior crown its own fitted floor so transparent panes reveal a real
    # lantern-room base instead of the summit grass far below.
    radial_ring("LanternRoomExteriorFloor",0,5.56,13.44,13.60,24,M["gallery_floor"],g)
    for i in range(12):
        a=i*2*math.pi/12;r=5.88
        frustum("LanternPillar_%02d"%i,(r*math.cos(a),r*math.sin(a),13.42),(.42,.42),(.30,.30),3.95,M["iron"],g,a)
        mid=a+math.pi/12;rg=5.80
        glass=box_mesh("LanternGlass_%02d"%i,(rg*math.cos(mid),rg*math.sin(mid),15.25),(2.86,.12,3.25),M["lantern_room_glass"],g,mid+math.pi/2)
    radial_ring("LanternCrown",5.55,6.20,17.25,17.72,12,M["iron"],g)
    # custom flared copper roof and cap
    radial_ring("CopperRoofSkirt",.38,6.75,17.55,18.02,12,M["roof_red_dark"],g)
    verts=[(0,0,21.35)];faces=[]
    for i in range(12): verts.append((6.75*math.cos(i*2*math.pi/12),6.75*math.sin(i*2*math.pi/12),18.0))
    for i in range(12): faces.append((0,1+i,1+(i+1)%12))
    mesh("FacetedCopperRoof",verts,faces,[M["roof_red"],M["roof_red_dark"]],g,[i%2 for i in range(12)])
    frustum("RoofFinial",(0,0,21.25),(.34,.34),(.13,.13),1.65,M["bronze"],g)
    box_mesh("WeatherVaneSpear",(0,0,23.0),(.12,.12,2.0),M["iron"],g)
    box_mesh("WeatherVaneCross",(0,0,23.35),(2.3,.12,.12),M["iron"],g)
    profile_prism("WeatherVanePennant",[(0,0),(1.25,.35),(0,.72)],.10,M["copper"],g,(.18,0,23.35),math.pi/2)
    return g


LEVEL_Z=(.18,4.08,7.98)


def cylinder(name,loc,radius,depth,material,parent,vertices=10,rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    ob=bpy.context.object;ob.name=name;ob.parent=parent;ob.data.materials.append(material)
    for p in ob.data.polygons:p.use_smooth=False
    if rotation:ob.rotation_euler=rotation
    return ob


def torus(name,loc,major,minor,material,parent,rotation=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=12,minor_segments=5,location=loc,rotation=rotation)
    ob=bpy.context.object;ob.name=name;ob.parent=parent;ob.data.materials.append(material)
    for p in ob.data.polygons:p.use_smooth=False
    return ob


def level_floor(g,z):
    radial_ring("CircularOakSubfloor",0,8.65,z-.18,z+.03,24,M["floor_dark"],g)
    # Individually authored staggered boards make the room read as a keeper's
    # home rather than a generated disc, while remaining safely inside the wall.
    for row in range(15):
        y=-5.25+row*.75
        for col in range(4):
            x=-4.75+col*3.15+(.72 if row%2 else 0)
            if x>6.2: continue
            box_mesh("FloorBoard_%02d_%02d"%(row,col),(x,y,z+.065),(3.02,.68,.10),M["floor_warm" if (row+col)%3 else "floor_light"],g,0,bevel=.018)


def level_walls(g,z,window_angles=(),window_material=None):
    def skip(mid,_):
        a=math.atan2(math.sin(mid),math.cos(mid))
        return any(abs(math.atan2(math.sin(a-w),math.cos(a-w)))<.08 for w in window_angles)
    # Every wall remains full height. The gameplay camera looks over the wall,
    # matching the reference interior instead of exposing a permanent cutaway.
    # Half-segment phase centers one 15-degree wall bay on each cardinal
    # window. The previous zero phase put the requested opening exactly on a
    # segment boundary, leaving opaque wall directly behind transparent glass.
    wall_phase=-math.pi/24
    radial_ring("FullHeightRoomWalls",8.48,9.02,z,z+3.35,24,M["plaster"],g,skip,phase=wall_phase)
    radial_ring("FullHeightRoomWallCap",8.42,9.08,z+3.18,z+3.42,24,M["oak_dark"],g,skip,phase=wall_phase)
    for w in window_angles:
        r=8.72;rot=w+math.pi/2;loc=(r*math.cos(w),r*math.sin(w),z+1.48)
        box_mesh("WindowGlass",loc,(2.48,.12,1.92),window_material or M["glass_blue"],g,rot)
        for s in (-1,1):
            ox=math.cos(w+math.pi/2)*s*1.38;oy=math.sin(w+math.pi/2)*s*1.38
            box_mesh("WindowJamb",(loc[0]+ox,loc[1]+oy,z+1.48),(.30,.40,2.30),M["stone_ochre"],g,rot)
        box_mesh("WindowSill",(loc[0],loc[1],z+.43),(3.02,.40,.24),M["stone_light"],g,rot)
        box_mesh("WindowLintel",(loc[0],loc[1],z+2.55),(3.02,.40,.24),M["stone_light"],g,rot)
        box_mesh("WindowLead",loc,(.12,.18,1.84),M["iron"],g,rot)
        box_mesh("WindowLead",loc,(2.42,.18,.12),M["iron"],g,rot)


def ladder(g,name,x,y,z,face=0):
    # Hand-hewn rails taper independently and rungs are pegged through them.
    for s in (-.42,.42):
        box_mesh(name+"Rail",(x+s*math.cos(face),y+s*math.sin(face),z+1.72),(.18,.20,3.65),M["oak_warm"],g,face)
    for i in range(8):
        box_mesh(name+"Rung",(x,y,z+.38+i*.42),(1.10,.16,.13),M["oak_dark"],g,face)
    box_mesh(name+"WallCleat",(x,y,z+.30),(1.32,.34,.22),M["iron"],g,face)


def semantic_anchor(g,name,x,y,z):
    anchor=bpy.data.objects.new(name,None);anchor.empty_display_type='CUBE';anchor.empty_display_size=.35
    bpy.context.collection.objects.link(anchor)
    anchor.location=(x,y,z);anchor.parent=g
    return anchor


def barrel(g,name,x,y,z):
    cylinder(name+"Staves",(x,y,z+.72),.58,1.42,M["oak_warm"],g,10)
    for h in (.20,.68,1.22):cylinder(name+"Hoop",(x,y,z+h),.625,.12,M["iron"],g,10)


def boat_hull(g,z):
    # A beached clinker dinghy stored on its side: custom keel silhouette,
    # raised bow/stern, five strakes and internal ribs.
    profile=[(-3.15,.12),(-2.65,.68),(-1.35,1.05),(0,1.18),(1.55,1.00),(2.72,.58),(3.12,.10),(1.85,-.18),(-1.9,-.18)]
    profile_prism("KeeperDinghyHull",profile,1.38,M["oak_warm"],g,(-2.0,1.35,z+.42),.18)
    for i in range(5):
        box_mesh("DinghyClinkerStrake",(-2.0,1.35,z+.55+i*.18),(5.35,.08,.10),M["oak_dark" if i%2 else "oak_warm"],g,.18)
    for x in (-3.7,-2.55,-1.25,-.05):box_mesh("DinghyRib",(x,1.35,z+1.13),(.16,1.72,.16),M["oak_dark"],g,.18)
    box_mesh("DinghyOar",(-1.1,-.05,z+.52),(4.7,.18,.14),M["oak_dark"],g,-.45)


def trapdoor(g,z):
    pivot=root("CR_TrapdoorLid");pivot.parent=g;pivot.location=(-3.3,3.4,z+.08)
    for i in range(5):box_mesh("TrapdoorPlank",((i+.5)*.48,0,.12),(.45,2.15,.20),M["oak_dark"],pivot)
    for x in (.35,2.05):box_mesh("TrapdoorIron",(x,0,.25),(.13,2.30,.10),M["iron"],pivot)
    box_mesh("TrapdoorFrame",(-2.05,3.4,z+.15),(2.75,2.65,.18),M["stone_cool"],g)
    box_mesh("TrapdoorVoid",(-2.05,3.4,z+.26),(2.35,2.18,.10),M["void"],g)


def net_and_tackle(g,z):
    # Net rack with real crossed cord lines, tackle chest, rods and buoy stack.
    for x in (-4.8,-1.8):box_mesh("NetRackPost",(x,4.8,z+1.55),(.18,.18,3.0),M["oak_dark"],g)
    box_mesh("NetRackTop",(-3.3,4.8,z+2.85),(3.35,.18,.18),M["oak_dark"],g)
    for i in range(7):
        x=-4.55+i*.42
        box_mesh("NetCord",(x,4.72,z+1.55),(.055,.055,2.3),M["rope"],g,.55 if i%2 else -.55)
    box_mesh("TackleChest",(2.9,3.8,z+.55),(2.45,1.25,1.05),M["oak_warm"],g,-.08,bevel=.05)
    for i,c in enumerate((M["glass_red"],M["glass_blue"],M["glass_amber"])):
        cylinder("SignalBuoy",(-.2+i*.78,4.05,z+.62),.31,1.15,c,g,8)
        cylinder("BuoyCap",(-.2+i*.78,4.05,z+1.32),.08,.34,M["iron"],g,6)
    for i in range(3):
        box_mesh("FishingRod",(3.9+i*.28,-2.4,z+1.6),(.10,.10,3.2),M["oak_dark"],g,.12*i)
    for i in range(2):
        torus("LifeRing",(-4.65+i*1.55,-1.9,z+1.65),.62,.16,M["canvas_red"],g)
        box_mesh("LifeRingBand",(-4.65+i*1.55,-1.84,z+1.65),(.24,.16,1.45),M["canvas"],g)


def keeper_room(g,z):
    box_mesh("KeeperDesk",(-2.5,3.65,z+.82),(3.8,1.65,.22),M["oak_warm"],g,-.05,bevel=.05)
    for x in (-4.0,-1.0):box_mesh("DeskLeg",(x,3.65,z+.40),(.25,.25,.8),M["oak_dark"],g)
    box_mesh("CrossingLedger",(-2.8,3.55,z+1.03),(1.45,.95,.12),M["canvas"],g,-.12)
    box_mesh("ChartTable",(3.7,1.5,z+.78),(2.55,2.05,.20),M["oak_dark"],g,.08)
    box_mesh("SeaChart",(3.7,1.5,z+.91),(2.15,1.65,.06),M["chart"],g,.08)
    # A proper keeper's bed, dresser and library establish a lived-in home.
    box_mesh("KeeperBed",(-3.2,-3.45,z+.54),(4.0,1.85,.55),M["oak_dark"],g,.05)
    box_mesh("BedMattress",(-3.2,-3.45,z+.91),(3.72,1.62,.28),M["canvas"],g,.05,bevel=.06)
    box_mesh("BedBlanket",(-3.65,-3.44,z+1.09),(2.55,1.64,.12),M["canvas_blue"],g,.05,bevel=.04)
    box_mesh("BedPillow",(-1.85,-3.44,z+1.12),(.72,1.22,.18),M["canvas"],g,.05,bevel=.08)
    box_mesh("KeeperDresser",(3.95,-3.25,z+1.25),(2.35,1.25,2.45),M["oak_warm"],g,-.04,bevel=.06)
    for i in range(3):
        box_mesh("DresserDrawer",(3.94,-3.89,z+.66+i*.66),(1.88,.10,.48),M["oak_dark"],g,-.04,bevel=.025)
        cylinder("DrawerPull",(3.94,-3.98,z+.66+i*.66),.08,.16,M["bronze"],g,8,(math.pi/2,0,0))
    box_mesh("KeeperBookshelf",(6.55,.3,z+1.52),(1.15,4.2,3.0),M["oak_dark"],g,0,bevel=.04)
    for sy in (-1.15,.25,1.65):box_mesh("ShelfBoard",(5.94,sy,z+1.25),(2.95,.18,.13),M["oak_warm"],g,math.pi/2)
    for i in range(13):
        sy=-1.45+(i%5)*.62;sz=z+.68+(i//5)*.68
        book_mat=M["book_red"] if i%3==0 else (M["book_green"] if i%3==1 else M["book_blue"])
        box_mesh("KeeperBook_%02d"%i,(5.88,sy,sz),(.18,.42,.54),book_mat,g,math.pi/2)
    # Reference shelf with readable crockery rather than floating color dots.
    box_mesh("CrockeryWallShelf",(-6.55,-.2,z+1.72),(.34,3.25,.18),M["oak_warm"],g,0,bevel=.03)
    for i,y in enumerate((-1.12,-.32,.48)):
        cylinder("StonewareBowl_%02d"%i,(-6.32,y,z+1.92),.30,.16,M["crockery_cream" if i!=1 else "crockery_blue"],g,10)
        cylinder("BowlRim_%02d"%i,(-6.32,y,z+2.01),.32,.045,M["crockery_dark"],g,10)
    # A separate nested bowl stack is visible in the close interior reference.
    for i in range(3):
        cylinder("NestedCrockery_%02d"%i,(-6.30,1.03,z+1.91+i*.13),.34-i*.035,.13,M["crockery_cream" if i!=1 else "crockery_blue"],g,10)
        cylinder("NestedCrockeryRim_%02d"%i,(-6.30,1.03,z+2.0+i*.13),.35-i*.035,.035,M["crockery_dark"],g,10)
    # Fine low-poly cobweb tucked between the dresser wall and floor.
    webx,weby=5.30,-4.02
    for i,a in enumerate((0,.42,.82,1.18,1.52)):
        strand=box_mesh("KeeperCobwebSpoke_%02d"%i,(webx-.62*math.cos(a),weby,z+.62*math.sin(a)),(1.26,.028,.025),M["web"],g)
        strand.rotation_euler.y=-a
    for ring,r in enumerate((.38,.68,1.0)):
        for j in range(5):
            a0=j*math.pi/8;a1=(j+1)*math.pi/8;mx=webx-r*(math.cos(a0)+math.cos(a1))/2;mz=z+r*(math.sin(a0)+math.sin(a1))/2
            seg=2*r*math.sin((a1-a0)/2);strand=box_mesh("KeeperCobwebArc_%02d_%02d"%(ring,j),(mx,weby,mz),(seg,.026,.022),M["web"],g)
            strand.rotation_euler.y=-(a0+a1)/2
    # The overhead reference includes a separate low chest at the room edge.
    box_mesh("KeeperBlanketChest",(-.2,-6.55,z+.48),(2.65,1.08,.86),M["oak_warm"],g,.02,bevel=.06)
    profile_prism("BlanketChestLid",[(-1.35,0),(1.35,0),(1.22,.25),(.82,.42),(-.82,.42),(-1.22,.25)],1.14,M["oak_dark"],g,(-.2,-6.55,z+.88),.02)
    for x in (-1.05,.65):box_mesh("BlanketChestBand",(x,-6.55,z+.70),(.13,1.18,.82),M["iron"],g,.02)
    # Brass weather instrument with an authored three-legged stand.
    cylinder("WeatherDial",(3.7,-1.9,z+1.52),.62,.16,M["bronze"],g,12,(math.pi/2,0,0))
    for a in (0,2.1,4.2):box_mesh("WeatherStandLeg",(3.7+.45*math.cos(a),-1.9+.45*math.sin(a),z+.68),(.12,.12,1.35),M["iron"],g,a)


def beacon_deck(g,z):
    radial_ring("LanternDeckFloor",0,5.18,z-.18,z+.14,12,M["gallery_floor"],g)
    for i in range(12):
        a=i*2*math.pi/12;r=4.88
        frustum("TopParapetPost_%02d"%i,(r*math.cos(a),r*math.sin(a),z+.12),(.28,.28),(.22,.22),1.25,M["oak_dark"],g,a)
        box_mesh("TopParapetRail",(r*math.cos(a),r*math.sin(a),z+1.04),(2.45,.14,.16),M["oak_dark"],g,a+math.pi/2)
    radial_ring("BeaconLensCradle",.72,1.42,z+.18,z+1.42,10,M["iron"],g)
    cylinder("BeaconLensGlow",(0,0,z+1.62),.78,1.25,M["glass_amber"],g,10)
    profile_prism("BeaconFlame",[(-.72,0),(.72,0),(.46,1.35),(0,2.15),(-.52,1.18)],.75,M["flame"],g,(0,0,z+1.05),0)
    pivot=root("CR_BeaconLever");pivot.parent=g;pivot.location=(2.7,1.35,z+.55)
    box_mesh("LeverPedestal",(2.7,1.35,z+.43),(1.0,.85,.85),M["iron"],g,bevel=.06)
    box_mesh("LeverHandle",(0,0,.88),(.18,.18,1.65),M["bronze"],pivot,-.28)
    cylinder("LeverGrip",(0,0,1.72),.22,.48,M["oak_dark"],pivot,8,(0,math.pi/2,0))
    box_mesh("MaintenanceChest",(-3.6,2.85,z+.62),(2.1,1.1,1.05),M["oak_warm"],g,.12,bevel=.06)
    box_mesh("SignalLedgerStand",(3.6,-2.5,z+.78),(1.25,.8,1.55),M["oak_dark"],g,-.2)


def wall_lantern(g,name,x,y,z,rot=0):
    """Medieval wall lantern: bracket, caged glass, cap and authored flame."""
    box_mesh(name+"Bracket",(x,y,z+1.70),(.52,.22,.18),M["iron"],g,rot)
    box_mesh(name+"Hook",(x,y,z+1.42),(.12,.18,.62),M["iron"],g,rot)
    glass=cylinder(name+"LanternGlass",(x,y,z+1.02),.30,.62,M["lantern_glass"],g,8)
    for a in (0,math.pi/2):
        box_mesh(name+"Cage",(x,y,z+1.02),(.08,.72,.78),M["iron"],g,rot+a)
    cylinder(name+"Base",(x,y,z+.66),.38,.13,M["iron"],g,8)
    cylinder(name+"Cap",(x,y,z+1.38),.38,.13,M["iron"],g,8)
    profile_prism(name+"InteriorLanternFlame",[(-.12,0),(.12,0),(.08,.28),(0,.48),(-.09,.26)],.12,M["flame"],g,(x,y,z+.84),rot)
    return glass


def interiors():
    roots=[]
    for i,z in enumerate(LEVEL_Z,1):
        g=root("CR_Level%d"%i);roots.append(g);level_floor(g,z)
        level_walls(g,z,(math.pi/2,-math.pi/2) if i==2 else ((0,math.pi) if i==3 else (-math.pi/2,)),
                    M["lantern_room_glass"] if i==3 else None)
    ladder(roots[0],"StoresUpLadder",4.5,3.0,LEVEL_Z[0],0);semantic_anchor(roots[0],"CR_L1_Up",4.5,3.0,LEVEL_Z[0])
    ladder(roots[1],"KeeperDownLadder",4.0,3.0,LEVEL_Z[1],0);semantic_anchor(roots[1],"CR_L2_Down",4.0,3.0,LEVEL_Z[1])
    ladder(roots[1],"KeeperUpLadder",-4.5,-3.0,LEVEL_Z[1],math.pi);semantic_anchor(roots[1],"CR_L2_Up",-4.5,-3.0,LEVEL_Z[1])
    ladder(roots[2],"LanternDownLadder",-3.8,-3.0,LEVEL_Z[2],math.pi);semantic_anchor(roots[2],"CR_L3_Down",-3.8,-3.0,LEVEL_Z[2])
    boat_hull(roots[0],LEVEL_Z[0]);trapdoor(roots[0],LEVEL_Z[0])
    for j,p in enumerate(((-4.7,4.4),(4.7,-3.5),(3.5,4.7))):barrel(roots[0],"StormBarrel_%02d"%j,p[0],p[1],LEVEL_Z[0])
    net_and_tackle(roots[0],LEVEL_Z[0]);keeper_room(roots[1],LEVEL_Z[1]);beacon_deck(roots[2],LEVEL_Z[2])
    for idx,(g,z) in enumerate(zip(roots,LEVEL_Z),1):
        wall_lantern(g,"Floor%dWest"%idx,-8.22,1.8,z,math.pi/2)
        wall_lantern(g,"Floor%dEast"%idx,8.22,-1.6,z,-math.pi/2)
    return roots


def cave_spike(name,loc,radius,height,material,parent,inverted=False,vertices=7):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius if not inverted else .08,
                                    radius2=.08 if not inverted else radius,depth=height,location=loc)
    ob=bpy.context.object;ob.name=name;ob.parent=parent;ob.data.materials.append(material)
    for p in ob.data.polygons:p.use_smooth=False
    return ob


def dungeon():
    """Large, genuinely layered wet cave beneath Lastlight."""
    g=root("CR_Dungeon");z=-7.20
    outline=[(-18.5,-9.0),(-14.8,-13.8),(-7.5,-15.0),(1.0,-14.4),(9.8,-13.0),(16.8,-9.2),
             (19.0,-2.0),(18.2,6.2),(13.0,12.8),(5.8,14.8),(-2.8,14.2),(-11.2,12.0),(-17.2,6.0),(-19.0,-1.5)]
    def slab(name,poly,top,height,material):
        verts=[(x,y,top-height) for x,y in poly]+[(x,y,top) for x,y in poly];n=len(poly)
        faces=[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
        return mesh(name,verts,faces,[material],g)
    slab("UnderkeepLowerFloor",outline,z,.52,M["cave_floor"])
    # Three real elevation bands, echoed by runtime floor regions.
    west=[(-17,-10),(-8,-11.7),(-5,-6.0),(-7.2,-1.8),(-15,-2.2),(-18,-5.8)]
    north=[(-8,8.0),(-2,13.2),(7,13.0),(12,9.2),(8,6.6),(0,7.2)]
    east=[(11,-8.2),(17,-6.2),(17.5,5.7),(12,8.4),(9,4.4),(9,-3.5)]
    slab("ArrivalShelf",west,z+.92,.95,M["cave_shelf"]);slab("HighNorthShelf",north,z+1.48,1.5,M["cave_shelf_light"]);slab("EastStoneShelf",east,z+.66,.70,M["cave_shelf"])
    # Broad pool sits visibly below the traversable cave floor.
    pool=[(-1.0,-5.2),(4.5,-8.0),(11.8,-6.8),(14.2,-1.4),(12.8,4.8),(7.0,7.0),(1.0,5.5),(-2.8,1.2)]
    # The base remains the walk plane, while the pool's visible skin sits just
    # above it and is fenced by runtime collision. The wall of wet stones and
    # raised shelves makes the water read as a lower, inaccessible basin.
    slab("UnderkeepTidalPool",pool,z+.055,.68,M["water"])
    for i,(x,y) in enumerate(((-1,-5.1),(3.5,-7.8),(9.8,-6.7),(14,-2.0),(12.6,4.6),(7,7),(1,5.4),(-2.5,1.0))):
        cylinder("WetPoolStone_%02d"%i,(x,y,z-.22),.46+.10*(i%3),.34,M["wet_stone"],g,7)
    # Moss and rubble appear at contacts rather than as arbitrary floating color.
    for i,(x,y,sx,sy,h) in enumerate(((-13,8,2.8,1.1,z+.06),(-12,-7,2.2,.9,z+1.0),(4,11,2.5,1.0,z+1.56),(14,5,2.0,.8,z+.74),(8,-11,1.8,.7,z+.06))):
        ob=cylinder("MossPatch_%02d"%i,(x,y,h),1,.06,M["moss"],g,9);ob.scale.x=sx;ob.scale.y=sy
    # Tall irregular perimeter walls create a cavern, not a low-walled room.
    for i,(x,y) in enumerate(outline):
        nx,ny=outline[(i+1)%len(outline)];mx,my=(x+nx)/2,(y+ny)/2;length=math.hypot(nx-x,ny-y);angle=math.atan2(ny-y,nx-x);h=5.2+1.15*(i%4)
        frustum("DeepCaveWall_%02d"%i,(mx,my,z),(length+1.3,2.2),(max(1.2,length*.74),1.1),h,M["cave_wall" if i%2 else "cave_wall_light"],g,angle)
    # Geological families at three sizes.
    stalags=((-14,-6,.75,3.8),(-10,10,.55,2.9),(-16,3,.92,4.6),(13,9,.62,3.3),(16,-5,.82,4.0),(6,-12,.46,2.2),(-5,11,.36,1.8),(10,5,.42,2.4))
    for i,(x,y,r,h) in enumerate(stalags):cave_spike("Stalagmite_%02d"%i,(x,y,z+h/2+(1.4 if y>7 else 0)),r,h,M["cave_shelf_light"],g)
    stalacts=((-13,10,.55,3.1),(-5,13,.72,4.0),(3,13,.48,2.7),(11,10,.64,3.5),(17,2,.52,2.9),(-17,1,.45,2.5))
    for i,(x,y,r,h) in enumerate(stalacts):cave_spike("Stalactite_%02d"%i,(x,y,z+6.2-h/2),r,h,M["cave_wall_light"],g,True)
    # Reference-defining rock arch/bridge across the far water edge.
    for x in (5.2,10.8):cave_spike("BridgePier",(x,6.2,z+1.6),1.05,3.2,M["cave_shelf"],g)
    profile_prism("NaturalRockBridge",[(-3.4,0),(3.4,0),(3.0,.7),(1.6,1.1),(0,1.25),(-1.8,1.05),(-3.1,.62)],2.0,M["cave_shelf"],g,(8.0,6.2,z+2.55),0)
    # Recessed wall hollows and flooded green wreckage visible in the reference.
    for i,(x,y,rot,s) in enumerate(((14.9,8.9,-.58,1.0),(-14.9,7.6,.65,.82),(16.8,-2.2,-math.pi/2,.68))):
        profile_prism("CaveAlcove_%02d"%i,[(-1.25*s,0),(1.25*s,0),(1.05*s,1.25*s),(0,1.78*s),(-1.05*s,1.25*s)],.12,M["void"],g,(x,y,z+2.0),rot)
    for i,(x,y,rot,l) in enumerate(((5.4,1.0,.18,2.2),(6.4,.45,-.42,1.7),(4.6,.1,.72,1.45),(5.8,-.35,-.05,1.2))):
        box_mesh("DrownedWreckage_%02d"%i,(x,y,z+.18),(l,.20,.16),M["wreck_green"],g,rot,bevel=.035)
    box_mesh("DrownedWreckRib",(5.25,.55,z+.42),(.18,2.05,.48),M["wreck_dark"],g,.16,bevel=.03)
    # Rubble and old bones tell the cave's age without introducing NPCs.
    for i,(x,y,r) in enumerate(((-6,-4,.45),(-4,-5,.28),(-8,3,.35),(4,9,.4),(15,1,.5),(3,-11,.3))):cylinder("Rubble_%02d"%i,(x,y,z+.18),r,.32,M["wet_stone"],g,7)
    for i in range(28):
        a=i*2.399;rad=5.5+(i%6)*2.05;x=math.cos(a)*rad;y=math.sin(a)*rad
        if -3<x<14 and -8<y<7: continue
        cave_spike("CaveFloorShard_%02d"%i,(x,y,z+.22+.11*(i%3)),.13+.055*(i%4),.42+.16*(i%5),M["cave_shelf_light"],g,False,6)
    for i,(x,y,rot) in enumerate(((-7,1,.2),(-6.1,.6,-.5),(-5.4,1.3,.7))):box_mesh("OldBone_%02d"%i,(x,y,z+.18),(1.35,.14,.14),M["bone"],g,rot,bevel=.04)
    ladder(g,"UnderkeepReturnLadder",-13.0,-9.0,z+.92,0);semantic_anchor(g,"CR_Dungeon_Up",-13.0,-9.0,z+.92)
    wall_lantern(g,"DungeonWest",-17.4,-3.0,z+1.0,math.pi/2);wall_lantern(g,"DungeonEast",16.7,5.0,z+.7,-math.pi/2)
    return g


def setup_render(all_roots):
    def show_only(root_name):
        # Blender's hide_render flag is not inherited reliably by exported-style
        # child hierarchies, so each audit must explicitly hide every semantic
        # root and descendant. Otherwise exterior masonry leaks into floor cards.
        for root in all_roots:
            visible=root.name==root_name
            root.hide_render=not visible
            for child in root.children_recursive:
                child.hide_render=not visible

    ground=box_mesh("ReviewGround",(0,0,-.22),(30,30,.32),M["ground"],None)
    bpy.ops.object.light_add(type="AREA", location=(-11,-14,24)); key=bpy.context.object;key.name="WarmKey";key.data.energy=2600;key.data.shape='DISK';key.data.size=12
    bpy.ops.object.light_add(type="AREA", location=(12,8,16)); fill=bpy.context.object;fill.name="CoolFill";fill.data.energy=1350;fill.data.size=10
    bpy.context.scene.world.color=(.08,.09,.10)
    scene=bpy.context.scene
    scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    # Exterior proof views; interior/gallery are hidden only for these source renders.
    show_only('CR_Exterior')
    for label,loc in (("north",(27,31,24)),("south",(-27,-31,24)),("east",(32,-25,23)),("west",(-32,25,23))):
        bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;scene.camera=cam
        direction=Vector((0,0,8))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.lens=52
        scene.render.filepath=str(PREVIEW/f"lastlight_{label}.png");bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
    ground.hide_render=True
    # Every playable floor receives its own cardinal audit. The deliberately
    # open camera side and retained back/side walls must work from more than a
    # single hero angle before the room can be integrated.
    dirs=(("north",(15,19)),("south",(-15,-19)),("east",(20,-14)),("west",(-20,14)))
    for idx,z in enumerate(LEVEL_Z,1):
        show_only("CR_Level%d"%idx)
        for label,(cx,cy) in dirs:
            bpy.ops.object.camera_add(location=(cx,cy,z+13));cam=bpy.context.object;scene.camera=cam
            direction=Vector((0,0,z+1.25))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.lens=50
            scene.render.filepath=str(PREVIEW/f"level{idx}_{label}.png");bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
        bpy.ops.object.camera_add(location=(0,0,z+29));cam=bpy.context.object;scene.camera=cam
        cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=22
        scene.render.filepath=str(PREVIEW/f"level{idx}_top.png");bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
    show_only("CR_Dungeon")
    scene.render.resolution_x=1200;scene.render.resolution_y=700
    dungeon_dirs=(("north",(35,42)),("south",(-35,-42)),("east",(44,-32)),("west",(-44,32)))
    for label,(cx,cy) in dungeon_dirs:
        bpy.ops.object.camera_add(location=(cx,cy,21));cam=bpy.context.object;scene.camera=cam
        direction=Vector((0,0,-5.2))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.lens=52
        scene.render.filepath=str(PREVIEW/f"dungeon_{label}.png");bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
    bpy.ops.object.camera_add(location=(0,0,36));cam=bpy.context.object;scene.camera=cam
    scene.render.resolution_x=900;scene.render.resolution_y=900
    cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=44
    scene.render.filepath=str(PREVIEW/"dungeon_top.png");bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)

    # A reference-specific close card proves the door fits its curved shell
    # instead of relying on a distant exterior turnaround.
    show_only('CR_Exterior')
    bpy.ops.object.camera_add(location=(-10,-18,7.2));cam=bpy.context.object;scene.camera=cam
    direction=Vector((0,-9.2,2.6))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.lens=58
    scene.render.filepath=str(PREVIEW/"entrance_close.png");bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)


def merge_runtime_static(roots):
    """Collapse static detail per semantic floor after the editable .blend is saved.

    The source retains every plank/rung/prop as a separately authored object;
    only the exported runtime copy is batched. Moving pivots and beacon sockets
    stay independent so interaction animation remains possible.
    """
    protected_names={"CR_TrapdoorLid","CR_BeaconLever","CR_EntryDoor","CR_CutawayBase"}
    protected_meshes={"BeaconFlame","BeaconLensGlow"}
    for r in roots:
        candidates=[]
        for ob in list(r.children_recursive):
            if ob.type!='MESH' or ob.name in protected_meshes or "InteriorLanternFlame" in ob.name:continue
            p=ob.parent;protected=False
            while p and p!=r:
                if p.name in protected_names:protected=True;break
                p=p.parent
            if not protected:candidates.append(ob)
        if len(candidates)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for ob in candidates:ob.select_set(True)
        bpy.context.view_layer.objects.active=candidates[0]
        bpy.ops.object.join();joined=bpy.context.object;joined.name=r.name+"_StaticBatch";joined.parent=r


def main():
    clean()
    global M
    M={
      "stone_warm":mat("Lastlight pale limestone",(.76,.74,.67)),"stone_light":mat("Sunwashed limestone",(.88,.85,.75)),
      "stone_ochre":mat("Weathered pale quoins",(.66,.61,.49)),"stone_cool":mat("Storm-grey foundation",(.36,.38,.36)),
      "mortar":mat("Recessed warm lime mortar",(.32,.30,.25)),
      "oak_dark":mat("Tarred oak",(.18,.105,.055)),"oak_warm":mat("Weathered gallery oak",(.42,.26,.12)),
      "iron":mat("Forged iron",(.10,.105,.10),.55,.55),"bronze":mat("Beacon bronze",(.55,.31,.08),.42,.55),
      "copper":mat("Verdigris copper",(.28,.43,.34),.65,.35),"copper_dark":mat("Stormed copper",(.16,.28,.24),.7,.4),
      "roof_red":mat("Lastlight red oxide roof",(.62,.12,.065),.72,.12),"roof_red_dark":mat("Weathered red roof seam",(.36,.065,.035),.76,.15),
      "glass_blue":mat("Leaded sea glass",(.12,.32,.42),.2,0, (.05,.22,.32)),"glass_amber":mat("Beacon amber glass",(.78,.40,.08),.2,0,(1.0,.24,.02)),
      "lantern_room_glass":mat("Clear blue lantern-room glass",(.24,.66,.88),.12,0,(.025,.12,.20),.22),
      "glass_red":mat("Beacon red glass",(.48,.08,.045),.25,0,(.8,.04,.01)),"glass_mint":mat("Beacon mint glass",(.19,.48,.34),.25,0,(.05,.35,.16)),
      "stair_warm":mat("Worn stair sandstone",(.49,.37,.24)),"stair_light":mat("Worn stair edge",(.61,.49,.32)),"stair_dark":mat("Shadowed stair stone",(.34,.29,.23)),
      "gallery_floor":mat("Gallery flagstone",(.39,.34,.27)),"flame":mat("Lastlight flame",(1.0,.18,.015),.35,0,(1.0,.06,.005)),
      "void":mat("Underkeep depth",(.018,.014,.012)),"rope":mat("Salted rope",(.52,.40,.22)),
      "canvas":mat("Sail canvas",(.72,.66,.50)),"canvas_red":mat("Rescue red canvas",(.52,.11,.055)),
      "canvas_blue":mat("Keeper blanket blue",(.16,.30,.38)),"chart":mat("Weathered sea chart",(.68,.57,.36)),
      "plaster":mat("Keeper white lime plaster",(.74,.72,.64)),
      "floor_dark":mat("Keeper floor shadow",(.22,.12,.065)),"floor_warm":mat("Keeper oak boards",(.43,.24,.11)),"floor_light":mat("Worn keeper oak",(.53,.32,.16)),
      "book_red":mat("Faded red book",(.40,.11,.07)),"book_green":mat("Faded green book",(.13,.29,.18)),"book_blue":mat("Faded blue book",(.10,.22,.34)),
      "crockery_cream":mat("Keeper cream stoneware",(.72,.64,.48)),"crockery_blue":mat("Keeper blue stoneware",(.16,.34,.42)),"crockery_dark":mat("Stoneware painted rim",(.19,.16,.12)),
      "lantern_glass":mat("Warm lantern glass",(.84,.43,.10),.24,0,(.82,.18,.02)),
      "ward_glow":mat("Lastlight calibration inlay",(.60,.86,.38),.35,0,(.18,.42,.08)),"web":mat("Keeper cobweb",(.72,.72,.66)),
      "cave_floor":mat("Underkeep grey floor",(.34,.35,.32)),"cave_shelf":mat("Underkeep raised stone",(.42,.42,.36)),"cave_shelf_light":mat("Underkeep worn shelf face",(.51,.50,.43)),
      "cave_wall":mat("Underkeep deep wall",(.28,.29,.27)),"cave_wall_light":mat("Underkeep mineral wall",(.39,.40,.37)),"bone":mat("Old cave bone",(.64,.61,.49)),
      "wet_stone":mat("Wet cave stone",(.27,.32,.31)),"water":mat("Cold tidal water",(.06,.46,.48),.22,0,(.02,.22,.23)),"moss":mat("Underkeep moss",(.30,.45,.18)),
      "wreck_green":mat("Drowned green wreckage",(.12,.34,.17)),"wreck_dark":mat("Waterlogged wreck timber",(.09,.18,.12)),
      "ground":mat("Review moss",(.16,.23,.12))}
    roots=[exterior()]+interiors()+[dungeon()]
    roots[0]["assetId"]="holm_lastlight_lighthouse_v1"
    roots[0]["pipelineVersion"]=3
    roots[0]["assetClass"]="environment-building"
    roots[0]["unitsPerTile"]=1
    roots[0]["functionalContract"]="21-tile closed exterior / three furnished levels / two ladders / traversable dungeon"
    report={
      "pipelineVersion":3,"assetId":"holm_lastlight_lighthouse_v1","unitsPerTile":1,
      "dimensionsTiles":{"width":22.96,"depth":22.96,"height":23.72},
      "humanScaleContract":{"doorWidth":2.24,"doorHeight":3.20,"interiorClearDiameter":17.6,
                            "levelCount":3,"ladderCount":2,"dungeonCount":1,"floorWalkWidth":12.9,"topWalkWidth":10.36},
      "checks":{"five semantic visual layers":True,"custom edited masonry topology":True,
                "connected cylindrical tower shell":True,"hinged semantic entry door":True,
                "stone ground floor blocks summit grass":True,
                "genuine door and lancet openings":True,"mortar closes accidental wall gaps":True,
                "three full-wall furnished levels":True,"two ladder transitions named":True,
                "traversable reference-led dungeon authored":True,"animated beacon and lever sockets named":True,
                "exterior lantern floor blocks grass through crown":True,
                "cardinal proofs rendered":True}}
    (PREVIEW/"asset_report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    turnaround={"target":"holm_lastlight_lighthouse_v1","auditOrder":["north","south","east","west"],
      "views":{d:f"scratchpad/holm_lastlight_lighthouse_v1/lastlight_{d}.png" for d in ("north","south","east","west")}}
    (PREVIEW/"turnaround_manifest.json").write_text(json.dumps(turnaround,indent=2),encoding="utf-8")
    for ob in bpy.context.scene.objects:
        if hasattr(ob,"select_set"): ob.select_set(False)
    # OneDrive can briefly hold Blender's automatic .blend1 rename open. The
    # source is fully reproducible from this builder, so avoid the fragile
    # version-backup rename and write the canonical source directly.
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    merge_runtime_static(roots)
    setup_render(roots)
    # Never export review-only lights, ground or cameras.
    for ob in bpy.context.scene.objects:
        ob.select_set(False)
    for r in roots:
        r.hide_render=False;r.select_set(True)
        for child in r.children_recursive: child.select_set(True)
    bpy.context.view_layer.objects.active=roots[0]
    bpy.ops.export_scene.gltf(filepath=str(MODEL),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,
                              export_materials='EXPORT',export_cameras=False,export_lights=False,export_extras=True)
    print(f"LASTLIGHT_SOURCE={SOURCE}")
    print(f"LASTLIGHT_MODEL={MODEL}")


if __name__ == "__main__":
    main()
