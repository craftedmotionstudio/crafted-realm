"""Build the authored Tutor's Holm training cavern environment.

The browser owns interactions and collision.  This GLB owns the visible cave:
an irregular open-top mine, three readable chambers, timber supports, ore seams,
stalagmites, two shaft landmarks, and a recessed smithing alcove.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "environments" / "holm_training_cavern_v1.blend"
MODEL = ROOT / "assets" / "models" / "environments" / "holm_training_cavern_v1.glb"
PREVIEW = ROOT / "scratchpad" / "holm_training_cavern_v1"
for p in (SOURCE.parent, MODEL.parent, PREVIEW):
    p.mkdir(parents=True, exist_ok=True)


def clean():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def material(name, color, rough=.9, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = rough
    if emission:
        bs.inputs["Emission Color"].default_value = (*emission, 1)
        bs.inputs["Emission Strength"].default_value = 1.8
    return m


def mesh_obj(name, verts, faces, mat, parent):
    me = bpy.data.meshes.new(name + "Mesh")
    me.from_pydata(verts, [], faces)
    me.materials.append(mat)
    for f in me.polygons:
        f.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.parent = parent
    return ob


def cube(name, loc, dims, mat, parent, rot=0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=(0, 0, rot))
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    ob.parent = parent
    for f in ob.data.polygons:
        f.use_smooth = False
    return ob


def profile_prism(name, profile, depth, mat, parent, loc=(0, 0, 0), rot=0):
    """Extrude an authored X/Z silhouette through Y for a readable low-poly prop."""
    half = depth / 2
    verts = [(x, -half, z) for x, z in profile] + [(x, half, z) for x, z in profile]
    count = len(profile)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    ob = mesh_obj(name, verts, faces, mat, parent)
    ob.location = loc
    ob.rotation_euler.z = rot
    return ob


def boulder(name, loc, scale, mat, parent, seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for i, v in enumerate(ob.data.vertices):
        wobble = 1 + .10 * math.sin((i + 1) * (1.7 + seed * .13))
        v.co.x *= wobble
        v.co.y *= 1 + .07 * math.cos((i + seed) * 2.1)
        v.co.z *= 1 + .05 * math.sin((i + seed) * 1.3)
    ob.data.materials.append(mat)
    ob.parent = parent
    for f in ob.data.polygons:
        f.use_smooth = False
    return ob


def cone(name, loc, radius, height, mat, parent, sides=7):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius, radius2=radius*.08,
                                   depth=height, location=(loc[0], loc[1], loc[2] + height/2))
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    ob.parent = parent
    for f in ob.data.polygons:
        f.use_smooth = False
    return ob


def irregular_floor(parent, mat):
    # A broad three-lobed silhouette: entry gallery -> mining hall -> smithy/exit.
    # The reference is a hand-cut excavation rather than a flat, recolored card.
    # A triangulated heightfield creates true sunken ground and raised shoulders
    # while keeping the lesson routes visually calm enough for tile movement.
    pts = [(-21,-7),(-18,-13),(-10,-15),(-4,-13),(2,-16),(8,-15),(10,-20),(14,-20),
           (15,-15),(17,-12),(21,-8),(22,-2),(19,3),(21,9),(15,14),(7,16),(3,15),
           (2,20),(-2,20),(-3,15),(-6,16),(-13,13),(-18,9),(-22,4),(-21,-2)]
    def inside(x,y):
        hit=False;j=len(pts)-1
        for i in range(len(pts)):
            xi,yi=pts[i];xj,yj=pts[j]
            if ((yi>y)!=(yj>y)) and x < (xj-xi)*(y-yi)/(yj-yi)+xi: hit=not hit
            j=i
        return hit
    def seg_dist(px,py,a,b):
        ax,ay=a;bx,by=b;dx=bx-ax;dy=by-ay
        t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
        return math.hypot(px-(ax+t*dx),py-(ay+t*dy))
    # The lesson routes remain near the runtime walk plane, but the ground
    # between them is genuinely excavated. This produces visible depth without
    # forcing cardinal pathfinding to understand arbitrary mesh slopes.
    routes=(((-18,-5),(-8,-2)),((-8,-2),(-2,4)),((-2,4),(1,4)),((1,4),(18,-5)),
            ((-2,4),(0,18)),((1,4),(7,-8)),((7,-8),(12,-18)))
    step=2;xs=list(range(-22,23,step));ys=list(range(-20,21,step));verts=[]
    for y in ys:
        for x in xs:
            d=min(seg_dist(x,y,a,b) for a,b in routes)
            t=max(0,min(1,(d-2.15)/3.8));t=t*t*(3-2*t)
            cut=-.34+.055*math.sin(x*.43+y*.19)+.035*math.cos(y*.51-x*.12)
            z=.018*(1-t)+cut*t
            edge=max(abs(x)/22.0,abs(y)/20.0)
            shoulder=max(0,min(1,(edge-.70)/.30));shoulder=shoulder*shoulder*(3-2*shoulder)
            z+=shoulder*.58
            verts.append((x,y,z))
    faces=[];cols=len(xs)
    for iy in range(len(ys)-1):
        for ix in range(len(xs)-1):
            cx=(xs[ix]+xs[ix+1])*.5;cy=(ys[iy]+ys[iy+1])*.5
            if not inside(cx,cy):continue
            a=iy*cols+ix;b=a+1;d=(iy+1)*cols+ix;c=d+1
            if (ix+iy)%2:faces.extend(((a,b,d),(b,c,d)))
            else:faces.extend(((a,b,c),(a,c,d)))
    return mesh_obj("CavernFloor", verts, faces, mat, parent), pts


def earth_plate(name, points, z, mat, parent):
    """A nearly flush triangulated earth facet, never a gameplay obstacle."""
    cx=sum(p[0] for p in points)/len(points); cy=sum(p[1] for p in points)/len(points)
    verts=[(x,y,z+(i%2)*.006) for i,(x,y) in enumerate(points)]
    center=len(verts); verts.append((cx,cy,z+.016))
    faces=[(i,(i+1)%len(points),center) for i in range(len(points))]
    return mesh_obj(name,verts,faces,mat,parent)


def rock_wall(parent, pts, mats):
    n=len(pts); verts=[]
    center=Vector((0,0))
    # Four uneven rings create a hand-hewn, leaning perimeter instead of box walls.
    for ring,(height,outset) in enumerate(((0,.0),(1.1,.25),(2.5,.75),(4.0,1.15))):
        for i,(x,y) in enumerate(pts):
            d=Vector((x,y))-center; d.normalize()
            jitter=.22*math.sin(i*2.17+ring*.8)
            verts.append((x+d.x*(outset+jitter),y+d.y*(outset+jitter),height+.18*math.sin(i*1.37+ring)))
    faces=[]
    for r in range(3):
        for i in range(n):
            a=r*n+i;b=r*n+(i+1)%n;c=(r+1)*n+(i+1)%n;d=(r+1)*n+i
            faces.append((a,b,c,d))
    ob=mesh_obj("HandHewnPerimeter",verts,faces,mats["wall"],parent)
    # Faceted cap stones break the wall silhouette at the gameplay camera.
    for i,(x,y) in enumerate(pts):
        if i%2==0:
            boulder(f"WallCrown_{i:02d}",(x,y,3.65),(1.3+(.25*(i%3)),1.0,1.05),mats["wall_hi"],parent,i)
    return ob


def timber_arch(name, x, y, rot, parent, mats):
    co,si=math.cos(rot),math.sin(rot)
    def p(lx,ly,lz): return (x+lx*co-ly*si,y+lx*si+ly*co,lz)
    for s in (-1,1):
        cube(name+f"_Post_{s}",p(s*1.45,0,1.35),(.32,.42,2.7),mats["wood"],parent,rot)
    cube(name+"_Lintel",p(0,0,2.72),(3.25,.48,.38),mats["wood_hi"],parent,rot)
    for s in (-1,1):
        cube(name+f"_Brace_{s}",p(s*.95,0,2.25),(.18,.34,1.35),mats["wood_hi"],parent,rot+s*.62)


def shaft(name, x, y, rot, parent, mats):
    root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);root.parent=parent
    cube(name+"_DarkMouth",(x,y,.035),(2.2,2.0,.07),mats["void"],root,rot)
    for off in (-1.05,1.05):
        cube(name+f"_Rim_{off}",(x+math.cos(rot)*off,y+math.sin(rot)*off,.18),(.30,2.35,.34),mats["wall_hi"],root,rot)
    # Full ladder is designed and readable from all four cardinals.
    dx,dy=math.cos(rot),math.sin(rot); px,py=-dy,dx
    for s in (-1,1):
        cube(name+f"_Rail_{s}",(x+px*s*.43,y+py*s*.43,1.38),(.18,.18,2.76),mats["wood"],root)
    for i in range(7):
        cube(name+f"_Rung_{i}",(x,y,.36+i*.37),(1.02,.16,.13),mats["wood_hi"],root,rot)
    return root


def furnace_alcove(parent,mats):
    """One hand-authored furnace and one custom-profile anvil at the live targets."""
    # Blender +Y exports to Three.js -Z. Use -4 here so the visible furnace
    # lands on the runtime lesson target at local +Z 4 (world 305,363).
    x,y=1,-4
    station=bpy.data.objects.new("SmithingStation",None);bpy.context.collection.objects.link(station);station.parent=parent
    # Battered stone furnace: stepped body, recessed full-depth mouth, arch voussoirs,
    # projecting hearth and a crooked flue. It is deliberately squat enough to read
    # beside the player rather than as a second building.
    courses=((2.75,2.20,.38),(2.64,2.12,.40),(2.48,2.02,.42),(2.28,1.88,.42))
    z=0
    for i,(w,d,h) in enumerate(courses):
        cube(f"FurnaceCourse_{i}",(x,y,z+h/2),(w,d,h),mats["furnace_stone_hi" if i%2 else "furnace_stone"],station)
        z+=h
    # tapered cap uses a custom profile instead of a block roof
    profile_prism("FurnaceShoulder",[(-1.14,0),(1.14,0),(.76,.62),(-.76,.62)],1.88,
                  mats["furnace_stone_hi"],station,(x,y,z))
    cube("FurnaceMouthDepth",(x,y-1.12,.78),(1.48,.48,1.16),mats["void"],station)
    cube("FurnaceEmberBed",(x,y-1.38,.28),(1.34,.76,.22),mats["ember"],station)
    cube("FurnaceHearthLip",(x,y-1.48,.18),(1.92,.70,.22),mats["metal_dark"],station)
    for sx in (-.92,.92):
        cube(f"FurnaceJamb_{sx}",(x+sx,y-1.35,.80),(.42,.56,1.50),mats["furnace_stone_hi"],station)
    for i,sx in enumerate((-.67,-.22,.22,.67)):
        boulder(f"FurnaceArchStone_{i}",(x+sx,y-1.34,1.50),(.34,.30,.30),mats["furnace_stone_hi"],station,130+i)
    cube("FurnaceLintel",(x,y-1.34,1.68),(2.18,.58,.30),mats["metal_dark"],station)
    profile_prism("FurnaceFlue",[(-.42,0),(.42,0),(.34,1.72),(-.25,1.82)],.92,
                  mats["furnace_stone"],station,(x+.28,y+.12,z+.58),-.06)
    cube("FurnaceFlueBand",(x+.17,y+.12,z+2.28),(.90,1.00,.16),mats["metal_dark"],station,-.06)
    # Side bellows and lever explain the furnace's function at gameplay distance.
    profile_prism("FurnaceBellows",[(-.64,0),(.62,0),(.42,.48),(-.34,.58)],.32,
                  mats["leather"],station,(x-1.72,y+.20,.62),math.pi/2)
    cube("FurnaceBellowsHandle",(x-2.10,y+.20,.84),(.12,.12,1.05),mats["wood_hi"],station,-.36)

    # Custom anvil: a single extruded side silhouette gives proper feet, waist,
    # shoulder, face, horn, heel and hardy step without stacking anonymous boxes.
    ax,ay=-2,-4
    stump=boulder("AnvilOakBlock",(ax,ay,.43),(.58,.54,.46),mats["wood"],station,145)
    stump.scale.z=.92
    anvil_profile=[(-.66,.00),(-.58,.14),(-.30,.18),(-.24,.38),(-.46,.50),(-.48,.66),
                   (-.16,.78),(.34,.78),(.52,.70),(.86,.61),(.52,.54),(.22,.49),
                   (.18,.35),(.36,.28),(.34,.14),(.58,.10),(.54,.00)]
    profile_prism("AnvilBody",anvil_profile,.52,mats["metal"],station,(ax,ay,.70))
    cube("AnvilFace",(ax+.04,ay,1.50),(1.12,.62,.10),mats["metal_hi"],station)
    cube("AnvilHardyHole",(ax-.28,ay-.10,1.558),(.12,.12,.025),mats["void"],station)
    # Resting tongs and quench bucket make the station purposeful.
    for side in (-1,1):
        cube(f"AnvilTongs_{side}",(ax-.72,ay+.38+side*.045,.55),(.055,.055,.92),mats["metal_dark"],station,.26+side*.04)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=.38, depth=.55, location=(ax-1.25,ay+.52,.30))
    bucket=bpy.context.object;bucket.name="AnvilQuenchBucket";bucket.data.materials.append(mats["metal_dark"]);bucket.parent=station
    return station


def build():
    clean()
    mats={
      "floor":material("Cavern warm ochre",(.52,.37,.20)),
      "floor_hi":material("Cavern sand highlight",(.60,.43,.23)),
      "floor_mid":material("Cavern cut earth",(.48,.325,.17)),
      "floor_low":material("Cavern worn earth",(.42,.285,.15)),
      "wall":material("Cavern umber rock",(.39,.31,.23)),
      "wall_hi":material("Cavern weathered rock",(.57,.47,.34)),
      "wood":material("Mine dark oak",(.24,.12,.055)),
      "wood_hi":material("Mine worn oak",(.43,.25,.10)),
      "ore":material("Pale tin seam",(.55,.58,.55),.72),
      "copper":material("Copper seam",(.64,.31,.13),.70),
      "void":material("Shaft and alcove depth",(.035,.027,.018)),
      "ember":material("Furnace ember",(.75,.16,.025),.65,(1,.17,.02)),
      "furnace_stone":material("Smithing furnace soot stone",(.25,.245,.23)),
      "furnace_stone_hi":material("Smithing furnace worn stone",(.39,.38,.34)),
      "metal":material("Smithing forged iron",(.16,.18,.19),.62),
      "metal_hi":material("Smithing worked face",(.32,.35,.36),.48),
      "metal_dark":material("Smithing black iron",(.075,.068,.062),.72),
      "leather":material("Smithing bellows leather",(.30,.14,.075),.92),
    }
    root=bpy.data.objects.new("holm_training_cavern_v1",None);bpy.context.collection.objects.link(root)
    floor,pts=irregular_floor(root,mats["floor"]); rock_wall(root,pts,mats)
    # Shade the bowl's actual topology instead of laying separate patches over
    # it. Alternating restrained earth values reveal the center fan and broad
    # sloped rings while keeping the base continuous under the player.
    floor.data.materials.append(mats["floor_mid"]);floor.data.materials.append(mats["floor_hi"])
    for poly in floor.data.polygons:
        if poly.index%7==0: poly.material_index=2
        elif poly.index%3==0: poly.material_index=1
    # Worn paths add low-frequency value variation without placing separate
    # boulder caps across the walk surface. Large flattened boulders looked like
    # waist-high terrain islands from the real gameplay camera.
    for i,(x,y,sx,sy,rot) in enumerate(((-13,-3,5.8,1.2,-.10),(-4,-4,5.0,1.15,.06),
                                        (5,1,5.7,1.3,.16),(13,3,5.1,1.15,-.08))):
        trail=boulder(f"WornRoute_{i}",(x,y,.012),(sx,sy,.022),mats["floor_low"],root,110+i)
        trail.rotation_euler.z=rot
    # Central ridges separate the three lesson spaces while leaving generous cardinal lanes.
    for i,(x,y,sx,sy,sz) in enumerate(((-7,-1,2.4,1.7,2.4),(-5,2,1.7,1.5,1.8),(7,-1,2.0,1.6,2.6),(9,2,1.4,1.2,1.8))):
        boulder(f"InteriorPillar_{i}",(x,y,sz*.45),(sx,sy,sz),mats["wall"],root,60+i)
        cone(f"InteriorSpike_{i}",(x+.8,y-.4,0),.65,1.5,mats["wall_hi"],root)
    for i,(x,y) in enumerate(((-18,-8),(-15,11),(-10,14),(-2,14),(13,12),(18,7),(19,-7),(12,-12),(-2,-13),(-16,5))):
        cone(f"Stalagmite_{i}",(x,y,0),.65+(i%3)*.22,1.5+(i%4)*.35,mats["wall_hi"],root,6+(i%3))
    timber_arch("EntrySupport",-15,-5,.18,root,mats)
    timber_arch("MiningSupport",-1,-6,-.08,root,mats)
    timber_arch("SmithySupport",10,5,.25,root,mats)
    timber_arch("TinOffshootSupport",0,15,0,root,mats)
    timber_arch("ClayOffshootSupport",12,-15,0,root,mats)
    shaft("EntryShaft",-18,-5,math.pi/2,root,mats)
    shaft("ExitShaft",18,-5,math.pi/2,root,mats)
    furnace_alcove(root,mats)
    # Three deliberate fields echo the reference's pale angular rock rows and
    # give each narrow offshoot a gameplay reason to exist.
    mats["clay"]=material("Clay ochre seam",(.72,.49,.27),.78)
    for family,base,mat_,count in (("Tin",(-1,17),mats["ore"],4),("Copper",(-9,-3),mats["copper"],7),
                                   ("Clay",(11,-18),mats["clay"],4)):
        for i in range(count):
            x=base[0]+(i%4)*1.35+(i//4)*.45; y=base[1]+(i//4)*1.45+(i%2)*.22
            boulder(f"{family}Ore_{i}",(x,y,.44),(.72,.62,.72),mat_,root,80+i)
    # The single authored anvil and furnace are built by furnace_alcove(); the
    # browser adds invisible interaction proxies at those exact targets.
    root["assetId"]="holm_training_cavern_v1";root["unitsPerTile"]=1
    return root,mats


def render_proofs(root,mats):
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE_NEXT";scene.render.resolution_x=1200;scene.render.resolution_y=850
    scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
    scene.world.use_nodes=True;scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.11,.075,.045,1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.95
    cd=bpy.data.cameras.new("CavernProofCamera");cd.type="ORTHO";cam=bpy.data.objects.new("CavernProofCamera",cd)
    bpy.context.collection.objects.link(cam);scene.camera=cam
    for name,loc,energy,color,size in (("WarmKey",(-18,-18,24),3200,(1,.67,.34),11),("CoolFill",(20,5,18),1900,(.58,.64,.69),14),("TopFill",(0,0,28),2200,(1,.78,.53),18)):
        ld=bpy.data.lights.new(name,"AREA");ld.energy=energy;ld.color=color;ld.shape="DISK";ld.size=size
        ob=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(ob);ob.location=loc
        ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat("-Z","Y").to_euler()
    views={"gameplay":(32,-38,36),"north":(0,42,30),"south":(0,-42,30),"east":(45,0,30),"west":(-45,0,30)}
    for name,loc in views.items():
        cam.location=loc;cam.data.ortho_scale=54
        cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat("-Z","Y").to_euler()
        scene.render.filepath=str(PREVIEW/f"{name}_final.png");bpy.ops.render.render(write_still=True)


def save_export(root):
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for ob in root.children_recursive:ob.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(MODEL),export_format="GLB",use_selection=True,
                              export_apply=True,export_yup=True,export_materials="EXPORT",
                              export_extras=True,export_animations=False,export_cameras=False,export_lights=False)


if __name__ == "__main__":
    root,mats=build();render_proofs(root,mats);save_export(root)
    print(f"[holm_training_cavern] wrote {SOURCE} and {MODEL}")
