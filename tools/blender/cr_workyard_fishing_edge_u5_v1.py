"""Purpose-built Workyard U5 small-net fishing edge family.

Local frame: root at the accepted U4 ``fishing_edge_socket``.  Deck top is
z=0, water is z=-0.50, the player approaches from -X, and the fishable water
extends toward +X.  The family adds no dock geometry and no collision.
"""
from __future__ import annotations

import math
import bpy
from mathutils import Vector

PLAYER_HEIGHT = 1.85
CLEAR_LANE = 1.35
WATER_WIDTH = 3.10
WATER_DEPTH = 2.05
WATER_BELOW_DECK = 0.50
WATER_Z = -0.50
CREEL_HEIGHT = 0.49
FISH_LENGTH = 0.52
FPS = 24

CLIP_IDLE = "FishingSpot_Idle"
CLIP_BITE = "FishingSpot_Bite"
CLIP_CATCH = "FishingSpot_Catch"
IDLE_KEYS = (1, 55, 109)      # 4.5 seconds
BITE_KEYS = (1, 13, 31)       # 1.25 seconds
CATCH_KEYS = (1, 20, 37)      # 1.5 seconds
IDLE_SECONDS = 4.5
BITE_SECONDS = 1.25
CATCH_SECONDS = 1.5
BITE_EVENT_NORMALIZED = round((BITE_KEYS[1] - 1) / (BITE_KEYS[-1] - 1), 4)
REWARD_EVENT_NORMALIZED = round((CATCH_KEYS[1] - 1) / (CATCH_KEYS[-1] - 1), 4)


def extend_materials(mat, mats):
    mats["deck_weathered"] = mat("CR Workyard Deck Weathered", (.46, .35, .21))
    mats["fish_water"] = _transparent_material("CR Fishing Water", (.105, .405, .455), .30)
    mats["fish_water_edge"] = _transparent_material("CR Fishing Water Edge", (.20, .52, .56), .18)
    mats["fish_body"] = mat("CR Mirrorperch Silver Blue", (.48, .64, .68))
    mats["fish_belly"] = mat("CR Mirrorperch Pale Belly", (.72, .78, .68))
    mats["fish_fin"] = mat("CR Mirrorperch Ochre Fin", (.72, .47, .18))
    mats["wicker"] = mat("CR Warm Wicker", (.55, .34, .16))
    mats["wicker_light"] = mat("CR Wicker Highlight", (.72, .50, .25))
    mats["wicker_dark"] = mat("CR Wicker Interior", (.245, .13, .065))
    mats["foam"] = mat("CR Pond Foam", (.82, .88, .75), .82)
    return mats


def _transparent_material(name, rgb, alpha):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*rgb, alpha)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1)
        bsdf.inputs["Roughness"].default_value = .78
        bsdf.inputs["Alpha"].default_value = alpha
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    else:
        material.blend_method = "BLEND"
        material.show_transparent_back = True
    if hasattr(material, "use_transparency_overlap"):
        material.use_transparency_overlap = False
    return material


def _flat(obj):
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def _mesh(name, verts, faces, material, collection, parent, material_indices=None):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    if isinstance(material, (list, tuple)):
        for mat in material:
            obj.data.materials.append(mat)
    else:
        obj.data.materials.append(material)
    if material_indices:
        for poly, index in zip(obj.data.polygons, material_indices):
            poly.material_index = index
    return _flat(obj)


def _group(B, name, collection, parent, loc=(0, 0, 0), rot=(0, 0, 0)):
    obj = B.empty(name, collection, parent, loc)
    obj.rotation_euler = rot
    return obj


def _irregular_water(name, mats, collection, parent):
    # A deliberately uneven eight-sided patch; it reads as a local current,
    # never as a second opaque pond slab.
    pts = [(.05, -1.00), (1.02, -1.06), (2.22, -.96), (3.08, -.72),
           (3.13, .73), (2.30, 1.01), (1.05, 1.04), (.04, .92)]
    verts = [(x, y, WATER_Z) for x, y in pts]
    faces = [tuple(range(len(pts)))]
    obj = _mesh(name, verts, faces, mats["fish_water"], collection, parent)
    # Narrow edge ribbon on the exposed far side gives the transparent patch a
    # readable boundary without becoming a glowing interaction marker.
    edge = [(2.15, -.98, WATER_Z + .006), (3.10, -.73, WATER_Z + .006),
            (3.15, .73, WATER_Z + .006), (2.30, 1.02, WATER_Z + .006),
            (2.21, .91, WATER_Z + .009), (2.94, .66, WATER_Z + .009),
            (2.93, -.64, WATER_Z + .009), (2.10, -.87, WATER_Z + .009)]
    _mesh(name + "FarCurrent", edge, [(0,1,6,7),(1,2,5,6),(2,3,4,5)],
          mats["fish_water_edge"], collection, parent)
    return obj


def _fish_mesh(name, length, mats, collection, parent, seed=0):
    # Custom faceted body loft: pointed snout, broad shoulders, tapered tail.
    xs = (-length * .46, -length * .25, length * .10, length * .40)
    radii = ((.025, .035), (.105, .075), (.125, .085), (.045, .035))
    verts = []
    sides = 6
    for ring, (x, (ry, rz)) in enumerate(zip(xs, radii)):
        for i in range(sides):
            a = math.tau * i / sides + (seed % 2) * .07
            verts.append((x, math.cos(a) * ry, math.sin(a) * rz))
    faces = []
    for ring in range(len(xs)-1):
        for i in range(sides):
            faces.append((ring*sides+i, ring*sides+(i+1)%sides,
                          (ring+1)*sides+(i+1)%sides, (ring+1)*sides+i))
    faces.append(tuple(range(sides-1, -1, -1)))
    faces.append(tuple(range((len(xs)-1)*sides, len(xs)*sides)))
    body = _mesh(name + "Body", verts, faces, [mats["fish_body"], mats["fish_belly"]],
                 collection, parent)
    # Pale underside follows form instead of recoloring the whole primitive.
    for poly in body.data.polygons:
        if poly.center.z < -.012:
            poly.material_index = 1
    tail_x = length * .43
    _mesh(name + "Tail", [(tail_x,0,0),(length*.68,-.15,.015),(length*.62,0,0),
                           (length*.68,.15,-.01)], [(0,1,2),(0,2,3)],
          mats["fish_fin"], collection, parent)
    _mesh(name + "TopFin", [(-length*.02,0,.07),(length*.13,0,.17),(length*.25,0,.065)],
          [(0,1,2)], mats["fish_fin"], collection, parent)
    _mesh(name + "SideFin", [(-length*.02,-.065,0),(length*.17,-.17,-.015),
                               (length*.21,-.06,-.02)], [(0,1,2)],
          mats["fish_fin"], collection, parent)
    return body


def _annular_oval(name, rx, ry, width, z, height, mat, collection, parent, sides=12):
    verts = []
    for zz in (z, z + height):
        for radius_offset in (0, -width):
            for i in range(sides):
                a = math.tau * i / sides
                verts.append(((rx + radius_offset) * math.cos(a),
                              (ry + radius_offset * .72) * math.sin(a), zz))
    faces = []
    # top and bottom annular bands plus outer/inner vertical walls
    ob, ib, ot, it = 0, sides, sides*2, sides*3
    for i in range(sides):
        j = (i+1) % sides
        faces.extend(((ob+i, ob+j, ot+j, ot+i), (ib+j, ib+i, it+i, it+j),
                      (ot+i, ot+j, it+j, it+i), (ob+j, ob+i, ib+i, ib+j)))
    return _mesh(name, verts, faces, mat, collection, parent)


def _creel(B, mats, collection, parent):
    g = _group(B, "dock_creel", collection, parent, (-.48, .69, 0))
    sides = 12
    layers = ((.055,.31,.23), (.20,.35,.255), (.39,.34,.25), (.49,.31,.235))
    verts = []
    for li, (z, rx, ry) in enumerate(layers):
        for i in range(sides):
            a = math.tau*i/sides
            jitter = .014*math.sin(i*2.3+li*.7)
            verts.append(((rx+jitter)*math.cos(a),(ry+jitter*.7)*math.sin(a),z))
    faces=[]
    for li in range(len(layers)-1):
        for i in range(sides):
            j=(i+1)%sides
            faces.append((li*sides+i,li*sides+j,(li+1)*sides+j,(li+1)*sides+i))
    body=_mesh("CreelWovenBody",verts,faces,[mats["wicker"],mats["wicker_light"]],collection,g)
    for poly in body.data.polygons:
        poly.material_index=(poly.index//3)%2
    # True recessed interior: inner wall and floor are below the rim.
    _annular_oval("CreelFittedRim",.345,.255,.045,.465,.055,mats["wicker_light"],collection,g,12)
    _annular_oval("CreelInnerWall",.285,.205,.075,.10,.35,mats["wicker_dark"],collection,g,12)
    floor=[(.22*math.cos(math.tau*i/12),.15*math.sin(math.tau*i/12),.115) for i in range(12)]
    _mesh("CreelInteriorFloor",floor,[tuple(range(12))],mats["wicker_dark"],collection,g)
    for z in (.13,.22,.31,.40):
        _annular_oval("CreelWeaveBand",.35,.26,.025,z,.035,
                      mats["wicker_light" if int(z*100)%2 else "wicker"],collection,g,12)
    # Lid has an authored oval rim and cross-weave, set partly open on a real hinge.
    lid=_group(B,"CreelOpenLid",collection,g,(-.245,0,.50),(0,-.92,0))
    _annular_oval("CreelLidRim",.34,.25,.045,-.018,.05,mats["wicker_light"],collection,lid,12)
    for y in (-.13,-.065,0,.065,.13):
        # custom tapered strips, not default cubes
        _mesh("CreelLidWeave",[(-.27,y-.018,0),(.27,y-.012,0),(.25,y+.018,.025),(-.25,y+.014,.025)],
              [(0,1,2,3)],mats["wicker"],collection,lid)
    for x in (-.16,-.08,0,.08,.16):
        _mesh("CreelLidCross",[(x-.014,-.20,.028),(x+.014,-.20,.028),
                                (x+.018,.20,.042),(x-.012,.20,.042)],[(0,1,2,3)],
              mats["wicker_light"],collection,lid)
    # Two faceted hinge lugs contact the rim and lid.
    for y in (-.14,.14):
        bpy.ops.mesh.primitive_cylinder_add(vertices=7,radius=.035,depth=.12,
                                            rotation=(math.pi/2,0,0),location=(0,0,0))
        hinge=bpy.context.object;hinge.name="CreelHinge";hinge.location=(-.30,y,.48)
        B.link(hinge,collection,g);hinge.data.materials.append(mats["iron"]);_flat(hinge)
    # Hemp shoulder strap follows an asymmetric resting loop on the deck.
    curve=bpy.data.curves.new("CreelShoulderStrapCurve","CURVE");curve.dimensions="3D";curve.resolution_u=1
    curve.bevel_depth=.018;curve.bevel_resolution=0;curve.resolution_u=1
    spline=curve.splines.new("POLY");spline.points.add(5)
    for point,co in zip(spline.points,[(-.28,-.20,.32,1),(-.46,-.38,.18,1),(-.57,-.42,.025,1),
                                       (-.18,-.52,.018,1),(.16,-.34,.025,1),(.28,-.18,.31,1)]):point.co=co
    strap=bpy.data.objects.new("CreelShoulderStrap",curve);collection.objects.link(strap);strap.parent=g
    strap.data.materials.append(mats["rope"])
    return g


def _ripples(B, mats, collection, parent):
    g=_group(B,"fishing_ripple",collection,parent,(1.45,0,WATER_Z+.014))
    for x,y,r in ((0,0,.22),(.93,.48,.15)):
        bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.014,
                                        major_segments=12,minor_segments=4,location=(0,0,0))
        ring=bpy.context.object;ring.name="FishingRippleRing";ring.location=(x,y,0)
        B.link(ring,collection,g);ring.data.materials.append(mats["foam"]);_flat(ring)
    return g


def _bubbles(B,mats,collection,parent):
    for i,(x,y,z,s) in enumerate(((1.0,-.38,-.455,.025),(1.15,-.32,-.43,.018),
                                  (2.14,.33,-.45,.022),(2.25,.39,-.42,.014))):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=s,location=(0,0,0))
        o=bpy.context.object;o.name="FishingBubble";o.location=(x,y,z);B.link(o,collection,parent)
        o.data.materials.append(mats["foam"]);_flat(o)


def build_family(B,mats,collection,root):
    water=_group(B,"fishing_water_patch",collection,root)
    _irregular_water("FishingWaterSurface",mats,collection,water)
    _bubbles(B,mats,collection,water)
    ripple=_ripples(B,mats,collection,root)
    school=_group(B,"fish_school",collection,root)
    for i,(x,y,z,r) in enumerate(((1.05,-.38,-.56,.18),(1.82,.31,-.55,-.10),(2.42,-.12,-.57,.08))):
        fish=_group(B,"Mirrorperch_%d"%i,collection,school,(x,y,z),(0,r,(-.10,.12,-.05)[i]))
        _fish_mesh("Mirrorperch_%d"%i,FISH_LENGTH*(.92+i*.06),mats,collection,fish,i)
    creel=_creel(B,mats,collection,root)
    catch=_group(B,"catch_fish",collection,root,(1.22,0,WATER_Z+.08))
    _fish_mesh("CatchMirrorperch",FISH_LENGTH,mats,collection,catch,7)
    catch.scale=(.01,.01,.01)
    sockets={
        "catch_presentation_socket":(1.22,0,WATER_Z+.08),
        "fishing_operator_socket":(-1.02,0,0),
        "fish_reward_socket":(-.70,0,.72),
        "water_surface_socket":(1.45,0,WATER_Z),
    }
    for name,loc in sockets.items():
        B.empty(name,collection,root,loc)
    return {"water":water,"ripple":ripple,"school":school,"creel":creel,"catch":catch}


def _author_transform_clip(obj, clip, keys):
    """Author one complete transform action and push it to one named track."""
    obj.animation_data_create()
    action = bpy.data.actions.new("%s__%s" % (clip, obj.name))
    obj.animation_data.action = action
    for frame, values in keys:
        if "location" in values:
            obj.location = values["location"]
            obj.keyframe_insert("location", frame=frame)
        if "rotation" in values:
            obj.rotation_euler = values["rotation"]
            obj.keyframe_insert("rotation_euler", frame=frame)
        if "scale" in values:
            obj.scale = values["scale"]
            obj.keyframe_insert("scale", frame=frame)
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "SINE"
    track = obj.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(action.name, 1, action)
    strip.action_frame_start = 1
    strip.action_frame_end = max(frame for frame, _ in keys)
    track.mute = True
    obj.animation_data.action = None
    return action


def author_animations(groups):
    school,ripple,catch=groups["school"],groups["ripple"],groups["catch"]
    animated={"school":school,"ripple":ripple,"catch":catch}
    _author_transform_clip(school,CLIP_IDLE,[(1,{"location":(0,0,0),"rotation":(0,0,-.025)}),
                                             (55,{"location":(0,.10,0),"rotation":(0,0,.035)}),
                                             (109,{"location":(0,0,0),"rotation":(0,0,-.025)})])
    _author_transform_clip(ripple,CLIP_IDLE,[(1,{"scale":(.78,.78,.78)}),(55,{"scale":(1.08,1.08,1.08)}),
                                             (109,{"scale":(.78,.78,.78)})])
    _author_transform_clip(school,CLIP_BITE,[(1,{"location":(0,0,0)}),(13,{"location":(0,-.10,0)}),
                                             (31,{"location":(0,0,0)})])
    _author_transform_clip(ripple,CLIP_BITE,[(1,{"scale":(.18,.18,.18)}),(13,{"scale":(1.32,1.32,1.32)}),
                                             (31,{"scale":(.72,.72,.72)})])
    # Catch fish rises from the water toward the player, peaks at the reward
    # event, then disappears so the inventory remains authoritative.
    _author_transform_clip(catch,CLIP_CATCH,[(1,{"location":(1.22,0,WATER_Z+.08),"scale":(.01,.01,.01)}),
                                            (7,{"location":(1.02,0,WATER_Z+.22),"scale":(1,1,1)}),
                                            (20,{"location":(-.70,0,.72),"scale":(1,1,1)}),
                                            (37,{"location":(-.70,0,.72),"scale":(.01,.01,.01)})])
    _author_transform_clip(ripple,CLIP_CATCH,[(1,{"scale":(.20,.20,.20)}),(10,{"scale":(1.15,1.15,1.15)}),
                                              (37,{"scale":(.55,.55,.55)})])
    school.location=(0,0,0);school.rotation_euler=(0,0,0);ripple.scale=(1,1,1)
    catch.location=(1.22,0,WATER_Z+.08);catch.scale=(.01,.01,.01)
    return animated


def solo_clip(animated,clip):
    for obj in animated.values():
        if not obj.animation_data:continue
        for track in obj.animation_data.nla_tracks:
            track.mute=clip is None or track.name!=clip
