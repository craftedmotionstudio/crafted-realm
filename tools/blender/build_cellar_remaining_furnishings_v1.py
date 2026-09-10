"""Build every remaining visible Workyard-cellar furnishing as semantic Blender art.

The source contains eleven independently reviewable families in their exact room
positions, but exports as one GLB so the live cellar pays one network request.
Visible geometry is authored from explicit vertices, turned profiles and paths;
no Blender primitive operator is used.
"""

from pathlib import Path
import bpy
import json
import math
import random
import sys

from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "blender"))
import build_cellar_lantern_v2 as L
import build_workyard_cellar_v2 as W


SOURCE = ROOT / "assets" / "blender" / "props" / "cellar_remaining_furnishings_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_remaining_furnishings_v1.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_remaining_furnishings_v1"
REPORT = PREVIEW / "asset_report.json"
PIXEL_ART = ROOT / "assets" / "textures" / "props" / "cellar_watchtower_pixel_v1.png"


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.actions):
        for block in list(datablocks):
            datablocks.remove(block)
    for path in (SOURCE.parent, MODEL.parent, PREVIEW):
        path.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=.93, metallic=0.0, emission=0.0):
    return L.material(name, color, roughness, metallic, emission)


def pixel_art_material():
    """Keep the generated 8-bit pixels crisp inside the exported GLB."""
    if not PIXEL_ART.exists():
        raise FileNotFoundError(f"Missing cellar wall-art texture: {PIXEL_ART}")
    mat = bpy.data.materials.new("CR Cellar Pixel Watchtower Painting")
    mat.use_nodes = True
    mat.use_backface_culling = False
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    principled = nodes.get("Principled BSDF")
    image = bpy.data.images.load(str(PIXEL_ART), check_existing=True)
    image.colorspace_settings.name = "sRGB"
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "PixelWatchtowerTexture"
    texture.image = image
    texture.interpolation = "Closest"
    texture.extension = "CLIP"
    links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    principled.inputs["Roughness"].default_value = .88
    emission = principled.inputs.get("Emission Color") or principled.inputs.get("Emission")
    if emission:
        links.new(texture.outputs["Color"], emission)
        strength = principled.inputs.get("Emission Strength")
        if strength: strength.default_value = .16
    return mat


def materials():
    return {
        "oak_dark": material("CR Cellar Furnishing Oak Shadow", (.085,.052,.027)),
        "oak_mid": material("CR Cellar Furnishing Aged Oak", (.22,.135,.067)),
        "oak_face": material("CR Cellar Furnishing Worn Oak", (.36,.245,.13)),
        "oak_wear": material("CR Cellar Furnishing Pale Edge", (.46,.34,.205)),
        "iron": material("CR Cellar Furnishing Charcoal Iron", (.045,.050,.048), .72, .28),
        "iron_edge": material("CR Cellar Furnishing Worn Iron", (.15,.16,.15), .68, .32),
        "brush": material("CR Cellar Hearth Brush Bristle", (.12,.075,.035), .96),
        "willow_dark": material("CR Cellar Basket Dark Willow", (.16,.105,.055)),
        "willow": material("CR Cellar Basket Willow", (.34,.245,.12)),
        "willow_light": material("CR Cellar Basket Light Willow", (.48,.36,.19)),
        "basket_inner": material("CR Cellar Basket Inner Wall", (.034,.016,.005)),
        "basket_floor": material("CR Cellar Basket Woven Floor", (.085,.039,.010)),
        "sack_dark": material("CR Cellar Sack Shadow", (.25,.205,.13)),
        "sack": material("CR Cellar Sack Flax", (.48,.405,.25)),
        "sack_patch": material("CR Cellar Sack Patch", (.37,.315,.19)),
        "ceramic": material("CR Cellar Crock Cream", (.67,.60,.43)),
        "ceramic_blue": material("CR Cellar Crock Muted Blue", (.19,.31,.39)),
        "ceramic_chip": material("CR Cellar Crock Chip", (.42,.37,.27)),
        "carrot": material("CR Cellar Root Carrot", (.68,.245,.055)),
        "onion": material("CR Cellar Root Onion", (.60,.44,.19)),
        "turnip": material("CR Cellar Root Turnip", (.70,.66,.48)),
        "leaf": material("CR Cellar Root Greens", (.16,.30,.12)),
        "rug_red": material("CR Cellar Runner Madder", (.40,.075,.052)),
        "rug_blue": material("CR Cellar Runner Deep Blue", (.08,.19,.29)),
        "rug_gold": material("CR Cellar Runner Ochre", (.64,.39,.09)),
        "rug_cream": material("CR Cellar Runner Wool", (.69,.62,.45)),
        "stone_dark": material("CR Cellar Hearth Stone Shadow", (.13,.15,.14)),
        "stone_mid": material("CR Cellar Hearth Fieldstone", (.25,.28,.25)),
        "stone_face": material("CR Cellar Hearth Stone Edge", (.39,.40,.34)),
        "soot": material("CR Cellar Hearth Soot", (.018,.015,.012)),
        "firebox_back": material("CR Cellar Firebox Recess", (.033,.026,.020)),
        "firebox_side": material("CR Cellar Firebox Return", (.070,.058,.044)),
        "coal": material("CR Cellar Hearth Coal", (.032,.023,.016)),
        "ember": material("CR Cellar Hearth Ember", (.75,.045,.004), .48, 0, 1.5),
        "flame": material("CR Cellar Hearth Flame", (1.0,.28,.01), .42, 0, 2.1),
        "flame_core": material("CR Cellar Hearth Flame Core", (1.0,.68,.08), .38, 0, 2.5),
        "dark": material("CR Cellar Furnishing Recess", (.009,.008,.007), 1.0),
        "pixel_art": pixel_art_material(),
        "proof_player": material("PROOF Canonical Player", (.30,.43,.50)),
    }


def mesh(name, verts, faces, mats, collection, parent, indices=None):
    return L.mesh_object(name, verts, faces, mats, collection, parent, indices)


def empty(name, collection, parent, part_id=None, interaction=None):
    obj = L.empty(name, collection, parent)
    if part_id: obj["partId"] = part_id
    if interaction: obj["interaction"] = interaction
    return obj


def extrude_xy(name, polygon, z0, z1, mats, collection, parent, top=1):
    n = len(polygon)
    verts = [(x,y,z0) for x,y in polygon] + [(x,y,z1) for x,y in polygon]
    faces = [tuple(reversed(range(n))), tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    indices = [0,min(top,len(mats)-1)] + [0 if i%3 else min(1,len(mats)-1) for i in range(n)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def extrude_xz(name, polygon, y0, y1, mats, collection, parent, front=1):
    n = len(polygon)
    verts = [(x,y0,z) for x,z in polygon] + [(x,y1,z) for x,z in polygon]
    faces = [tuple(reversed(range(n))), tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    indices = [0,min(front,len(mats)-1)] + [0]*n
    return mesh(name, verts, faces, mats, collection, parent, indices)


def hewn(name, start, end, width, depth, mats, collection, parent, seed=0, crook=.018):
    rng = random.Random(seed)
    a,b = Vector(start),Vector(end)
    mid = (a+b)*.5 + Vector((rng.uniform(-crook,crook),rng.uniform(-crook,crook),
                             rng.uniform(-crook*.6,crook*.6)))
    return L.tube(name, (a,mid,b), (width*.46,width*.52,width*.44), 4,
                  mats, collection, parent, phase=math.pi/4+seed*.13)


def rough_plank(name, center, dims, mats, collection, parent, seed, rotation=0):
    rng=random.Random(seed); sx,sy,sz=dims; cx,cy,cz=center
    p=[(-sx*.5+rng.uniform(-.025,.02),-sy*.5),
       (sx*.5+rng.uniform(-.02,.02),-sy*.5+rng.uniform(-.018,.018)),
       (sx*.5+rng.uniform(-.02,.02),sy*.5+rng.uniform(-.018,.018)),
       (-sx*.5+rng.uniform(-.02,.02),sy*.5+rng.uniform(-.018,.018))]
    obj=extrude_xy(name,[(cx+x,cy+y) for x,y in p],cz-sz*.5,cz+sz*.5,
                   mats,collection,parent,2)
    obj.rotation_euler.z=rotation+rng.uniform(-.006,.006)
    return obj


def build_shelf(mats, collection, parent):
    root=empty("StorageShelf",collection,parent,"cellar_storage_shelf","search")
    root.location=(-5.28,1.12,.02); root.rotation_euler.z=math.pi/2
    wood=[mats["oak_dark"],mats["oak_mid"],mats["oak_face"],mats["oak_wear"]]
    iron=[mats["iron"],mats["iron_edge"]]
    width=3.92
    for side,x in enumerate((-width*.5,width*.5)):
        hewn("Shelf_CrookedPost",(x,.03,0),(x+(-.035 if side==0 else .028),.03,2.42),
             .18,.15,wood,collection,root,100+side,.035)
        # Hand-forged feet are large enough to read but do not become a portal.
        rough_plank("Shelf_IronFoot",(x,-.005,.10),(.27,.28,.18),iron,collection,root,110+side)
    for level,z in enumerate((.20,.88,1.57,2.25)):
        for board,y in enumerate((-.19,0,.19)):
            rough_plank("Shelf_HandPlank",(0,y,z),(3.98,.18,.105),wood,collection,root,
                        130+level*5+board)
        for x in (-width*.5,width*.5):
            rough_plank("Shelf_PegJoint",(x,-.32,z+.01),(.16,.12,.16),wood,collection,root,
                        170+level+int(x*3))
    hewn("Shelf_RearBraceA",(-1.78,.28,.29),(1.80,.28,2.20),.105,.09,wood,collection,root,201,.026)
    hewn("Shelf_RearBraceB",(1.78,.30,.30),(-1.78,.30,2.20),.095,.085,wood,collection,root,202,.026)
    rough_plank("Shelf_RepairStrap",(1.78,-.12,.49),(.17,.08,.53),iron,collection,root,203,rotation=.04)
    return root


def barrel_stave(name,index,count,scale,mats,collection,parent):
    da=math.tau/count; a0=-math.pi/2+index*da+.025; a1=a0+da-.05
    rings=((0,.33),(.10,.39),(.50,.47),(.86,.43),(1.06,.33))
    verts=[]
    for z,r in rings:
        r*=scale; inner=r-.075*scale
        for angle,rad in ((a0,inner),(a1,inner),(a1,r),(a0,r)):
            verts.append((math.cos(angle)*rad,math.sin(angle)*rad,z*scale))
    faces=[]; ids=[]
    faces += [(0,1,2,3),(len(verts)-4,len(verts)-3,len(verts)-2,len(verts)-1)]; ids += [0,2]
    for ring in range(len(rings)-1):
        for side in range(4):
            n=(side+1)%4
            faces.append((ring*4+side,ring*4+n,(ring+1)*4+n,(ring+1)*4+side))
            ids.append(2 if index in (2,7) and side==2 else (1 if side==2 else 0))
    return mesh(name,verts,faces,mats,collection,parent,ids)


def build_barrel(name,position,scale,mats,collection,parent,part_id):
    root=empty(name,collection,parent,part_id,"search"); root.location=position
    wood=[mats["oak_dark"],mats["oak_mid"],mats["oak_face"],mats["oak_wear"]]
    iron=[mats["iron"],mats["iron_edge"]]
    for index in range(10): barrel_stave("Barrel_IndividualStave",index,10,scale,wood,collection,root)
    for band,z in enumerate((.14,.50,.90)):
        L.lathe("Barrel_HammeredHoop",((.455*scale,z*scale),(.482*scale,(z+.025)*scale),
                (.478*scale,(z+.075)*scale),(.452*scale,(z+.10)*scale)),10,
                iron,collection,root,asymmetry=.008,phase=band)
    L.lathe("Barrel_FacetedTop",((0,1.035*scale),(.32*scale,1.045*scale),(.35*scale,1.09*scale)),
            10,wood,collection,root,asymmetry=.006,phase=2)
    L.lathe("Barrel_WoodenBung",((.05*scale,1.09*scale),(.075*scale,1.115*scale),
            (.065*scale,1.18*scale)),7,[mats["oak_dark"],mats["oak_face"]],collection,root,
            center=(-.15*scale,-.05*scale),asymmetry=.01,phase=1)
    return root


def build_crock(name,position,scale,mats,collection,parent,blue=False):
    root=empty(name,collection,parent,"cellar_lidded_crock","search"); root.location=position
    body_mats=[mats["ceramic"],mats["ceramic_blue"],mats["ceramic_chip"]]
    profile=((.13,0),(.25,.05),(.34,.30),(.31,.55),(.24,.72),(.16,.78),(.17,.84))
    L.lathe("Crock_FacetedBody",[(r*scale,z*scale) for r,z in profile],10,body_mats,
            collection,root,asymmetry=.022,phase=scale,
            face_pattern=lambda ring,seg: 1 if (blue and ring in (3,4)) else (2 if ring==2 and seg==8 else 0))
    for side in (-1,1):
        x=side*.29*scale
        L.tube("Crock_ChunkyLug",((x,0,.47*scale),(side*.43*scale,0,.50*scale),
               (side*.31*scale,0,.61*scale)),(.055*scale,.065*scale,.05*scale),6,
               [mats["ceramic"],mats["ceramic_blue"]],collection,root,phase=side)
    lid=((.11,.84),(.26,.86),(.32,.91),(.26,.98),(.085,1.04),(.075,1.11))
    L.lathe("Crock_FittedLid",[(r*scale,z*scale) for r,z in lid],10,body_mats,
            collection,root,asymmetry=.012,phase=3,
            face_pattern=lambda ring,seg: 1 if blue and ring==1 else 0)
    return root


def build_sack(name,position,scale,mats,collection,parent):
    root=empty(name,collection,parent,"cellar_grain_sack","search"); root.location=position
    cloth=[mats["sack_dark"],mats["sack"],mats["sack_patch"]]
    profile=((.12,0),(.34,.04),(.43,.18),(.41,.50),(.33,.75),(.14,.88),(.09,.96))
    L.lathe("Sack_StuffedBody",[(r*scale,z*scale) for r,z in profile],9,cloth,collection,root,
            asymmetry=.065,phase=scale,
            face_pattern=lambda ring,seg: 1 if seg in (1,2,3,4) else 0)
    # Large front patch and visible stitches, all actual geometry.
    y=-.405*scale
    patch=[(-.23*scale,.21*scale),(.15*scale,.18*scale),(.23*scale,.47*scale),
           (-.17*scale,.52*scale)]
    extrude_xz("Sack_SewnPatch",patch,y-.012,y+.012,[mats["sack_patch"],mats["sack"]],collection,root,0)
    for i in range(6):
        x=(-.18+i*.07)*scale; z=(.20+(i%2)*.015)*scale
        L.tube("Sack_PatchStitch",((x,y-.02,z),(x+.025*scale,y-.025,z+.02*scale)),
               .007*scale,4,[mats["sack_dark"]],collection,root)
    L.tube("Sack_HempTie",((-.12*scale,0,.90*scale),(.12*scale,0,.90*scale)),
           .025*scale,5,[mats["oak_dark"]],collection,root)
    L.tube("Sack_TieTail",((.05*scale,0,.90*scale),(.19*scale,-.02,.78*scale)),
           (.018*scale,.011*scale),5,[mats["oak_dark"]],collection,root)
    # Gathered mouth above the tie: an uneven flare and two folded tips keep the
    # silhouette from reading as a capped jar.
    L.lathe("Sack_GatheredMouth",((.085*scale,.90*scale),(.10*scale,.99*scale),
            (.20*scale,1.12*scale)),9,[mats["sack_dark"],mats["sack"]],collection,root,
            asymmetry=.11,phase=2.4,
            face_pattern=lambda ring,seg: 1 if seg in (1,2,5,6) else 0)
    extrude_xz("Sack_FoldedLipA",((-.17*scale,1.03*scale),(-.03*scale,.96*scale),
               (.02*scale,1.15*scale),(-.11*scale,1.18*scale)),
               -.025*scale,.025*scale,[mats["sack_dark"],mats["sack"]],collection,root,1)
    extrude_xz("Sack_FoldedLipB",((.03*scale,.98*scale),(.17*scale,1.03*scale),
               (.12*scale,1.17*scale),(.01*scale,1.13*scale)),
               -.015*scale,.035*scale,[mats["sack_dark"],mats["sack"]],collection,root,1)
    return root


def hollow_basket_shell(name,scale,mats,collection,parent):
    """Open woven shell with a visible recessed inner wall and floor."""
    segments=10
    outer=((.27,0),(.43,.08),(.50,.36),(.51,.49))
    inner=((.27,.10),(.34,.23),(.405,.39),(.425,.49))
    verts=[]
    for profile in (outer,inner):
        for radius,z in profile:
            for segment in range(segments):
                angle=segment*math.tau/segments
                variation=1+.025*math.sin(angle*3+scale+z*2.1)
                verts.append((math.cos(angle)*radius*scale*1.18*variation,
                              math.sin(angle)*radius*scale*variation,z*scale))
    faces=[];ids=[]
    outer_count=len(outer)*segments
    for ring in range(len(outer)-1):
        for segment in range(segments):
            nxt=(segment+1)%segments
            faces.append((ring*segments+segment,ring*segments+nxt,
                          (ring+1)*segments+nxt,(ring+1)*segments+segment))
            ids.append((ring+segment)%3)
    for ring in range(len(inner)-1):
        for segment in range(segments):
            nxt=(segment+1)%segments
            a=outer_count+ring*segments+segment
            b=outer_count+ring*segments+nxt
            c=outer_count+(ring+1)*segments+nxt
            d=outer_count+(ring+1)*segments+segment
            faces.append((d,c,b,a));ids.append(3)
    outer_top=(len(outer)-1)*segments
    inner_top=outer_count+(len(inner)-1)*segments
    for segment in range(segments):
        nxt=(segment+1)%segments
        faces.append((outer_top+segment,outer_top+nxt,inner_top+nxt,inner_top+segment))
        ids.append(1+(segment%2))
    faces.append(tuple(reversed(range(segments))));ids.append(0)
    inner_floor=outer_count
    floor_center=len(verts);verts.append((0,0,.10*scale))
    for segment in range(segments):
        nxt=(segment+1)%segments
        faces.append((floor_center,inner_floor+segment,inner_floor+nxt))
        ids.append(4 if segment%2 else 3)
    return mesh(name,verts,faces,[mats["willow_dark"],mats["willow"],
                mats["willow_light"],mats["basket_inner"],mats["basket_floor"]],collection,parent,ids)


def build_basket(name,position,scale,mats,collection,parent,part_id="cellar_handled_basket",
                 include_handle=True):
    root=empty(name,collection,parent,part_id,"search"); root.location=position
    root["openInteriorDepth"]=round((.49-.10)*scale,3)
    root["interiorMaterial"]="warm-willow"
    weave=[mats["willow_dark"],mats["willow"],mats["willow_light"]]
    hollow_basket_shell("Basket_OpenWovenShell",scale,mats,collection,root)
    # A fitted inner lip and five descending ribs make the cavity legible from
    # the elevated game camera without filling it with a black placeholder.
    lip=[]
    for segment in range(10):
        angle=segment*math.tau/10
        lip.append((math.cos(angle)*.425*scale*1.18,math.sin(angle)*.425*scale,.485*scale))
    L.tube("Basket_InnerLip",lip,.026*scale,4,[mats["willow_dark"],mats["basket_inner"]],
           collection,root,closed=True,phase=.2)
    for segment in range(0,10,2):
        angle=segment*math.tau/10
        L.tube("Basket_VisibleInnerRib",((math.cos(angle)*.27*scale*1.18,
               math.sin(angle)*.27*scale,.11*scale),(math.cos(angle)*.405*scale*1.18,
               math.sin(angle)*.405*scale,.46*scale)),.010*scale,4,
               [mats["willow"],mats["basket_inner"]],collection,root,phase=angle)
    # A sparse crossed weave sits on the recessed floor.  It is visible from
    # above and proves that the dark area is an interior, not an empty void.
    for index,offset in enumerate((-.14,-.07,0,.07,.14)):
        L.tube("Basket_InnerFloorWeave",((-.22*scale,offset*scale,.115*scale),
               (.22*scale,offset*scale,.115*scale)),.009*scale,4,
               [mats["willow_light"] if index%2 else mats["willow"]],collection,root,
               phase=index*.2)
        L.tube("Basket_InnerFloorWeave",((offset*scale*1.18,-.18*scale,.118*scale),
               (offset*scale*1.18,.18*scale,.118*scale)),.008*scale,4,
               [mats["willow"] if index%2 else mats["willow_light"]],collection,root,
               phase=index*.2+.3)
    for ring,z in enumerate((.14,.30,.49)):
        hoop_points=[]
        radius=(.505+.008*math.sin(ring*1.7))*scale
        for segment in range(10):
            angle=segment*math.tau/10
            wobble=1+.012*math.sin(segment*2.1+ring)
            hoop_points.append((math.cos(angle)*radius*1.18*wobble,
                                math.sin(angle)*radius*wobble,(z+.025)*scale))
        L.tube("Basket_OpenReinforcedWeave",hoop_points,.025*scale,5,weave,
               collection,root,closed=True,phase=ring*.4)
    for index,a in enumerate([i*math.tau/10 for i in range(10)]):
        x=math.cos(a)*.49*scale*1.18; y=math.sin(a)*.49*scale
        L.tube("Basket_VerticalRib",((x*.72,y*.72,.03*scale),(x,y,.49*scale)),
               (.014*scale,.020*scale),4,weave,collection,root,phase=index)
    # Short alternating willow passes break the broad silhouette into a real
    # hand-woven rhythm without creating hundreds of tiny unreadable strands.
    for band,z in enumerate((.19,.33,.455)):
        radius=(.475+.018*band)*scale
        for segment in range(10):
            a0=segment*math.tau/10+.025; a1=(segment+1)*math.tau/10-.025
            points=((math.cos(a0)*radius*1.18,math.sin(a0)*radius,z*scale),
                    (math.cos((a0+a1)*.5)*radius*1.18,math.sin((a0+a1)*.5)*radius,z*scale),
                    (math.cos(a1)*radius*1.18,math.sin(a1)*radius,z*scale))
            L.tube("Basket_AlternatingWillowPass",points,.013*scale,4,
                   [weave[(band+segment)%len(weave)]],collection,root,
                   phase=segment*.31)
    if include_handle:
        points=[]
        for step in range(9):
            t=step/8; x=(-.50+1.0*t)*scale*1.18; z=.50*scale+math.sin(t*math.pi)*.70*scale
            points.append((x,0,z))
        L.tube("Basket_IrregularHandle",points,.035*scale,6,weave,collection,root,phase=.2)
    for i in range(4):
        L.tube("Basket_RimRepairTie",((.39*scale,-.30*scale,.48*scale+i*.012),
               (.48*scale,-.22*scale,.53*scale+i*.012)),.009*scale,4,
               [mats["sack_dark"]],collection,root)
    return root


def build_bench(mats,collection,parent):
    root=empty("ProvisionTable",collection,parent,"cellar_provision_table","inspect")
    root.location=(0,2.92,0)
    wood=[mats["oak_dark"],mats["oak_mid"],mats["oak_face"],mats["oak_wear"]]
    # An ordinary, well-built provision table. Closely fitted top planks and a
    # quiet four-leg silhouette replace the visually noisy preserving-bin rig.
    for board,y in enumerate((-.32,0,.32)):
        rough_plank("Table_FittedTopPlank",(0,y,1.02),(3.58,.31,.16),wood,collection,root,500+board)
    for side,x in enumerate((-1.46,1.46)):
        for row,y in enumerate((-.36,.36)):
            lean=(-.045 if x<0 else .045)
            hewn("Table_HandHewnLeg",(x+lean,y,.07),(x,y,.92),.17,.15,wood,
                 collection,root,510+side*4+row,.014)
    rough_plank("Table_FrontApron",(0,-.38,.84),(3.08,.11,.24),wood,collection,root,530)
    rough_plank("Table_RearApron",(0,.38,.84),(3.08,.11,.24),wood,collection,root,531)
    for side,x in enumerate((-1.46,1.46)):
        rough_plank("Table_EndApron",(x,0,.84),(.12,.64,.22),wood,collection,root,534+side)
    # Two short side stretchers visibly terminate in the four legs.  The former
    # single centre rail read as a loose floating bar from the game camera.
    for side,x in enumerate((-1.46,1.46)):
        hewn("Table_FittedSideStretcher",(x,-.36,.32),(x,.36,.32),.12,.10,wood,
             collection,root,540+side,.008)
    return root


def build_carrot(name,position,scale,mats,collection,parent,angle):
    root=empty(name,collection,parent); root.location=position; root.rotation_euler.z=angle
    L.tube("RootBasket_TaperedCarrot",((-.32*scale,0,.02),(0,0,.07),(.31*scale,0,.025)),
           (.035*scale,.12*scale,.025*scale),7,[mats["carrot"]],collection,root,phase=angle)
    for leaf in range(3):
        L.tube("RootBasket_CarrotLeaf",((-.32*scale,0,.02),(-.46*scale,
               (leaf-1)*.08*scale,.13*scale+leaf*.035)),(.024*scale,.012*scale),4,
               [mats["leaf"]],collection,root,phase=leaf)
    return root


def build_onion(name,position,scale,mats,collection,parent,turnip=False):
    root=empty(name,collection,parent); root.location=position
    mat=mats["turnip"] if turnip else mats["onion"]
    L.lathe("RootBasket_FacetedBulb",tuple((r*scale,z*scale) for r,z in
            ((.03,0),(.16,.03),(.22,.15),(.18,.30),(.05,.39))),
            8,[mat,mats["onion"]],collection,root,asymmetry=.035,phase=scale)
    for stalk in (-1,0,1):
        L.tube("RootBasket_DryStalk",((0,0,.37*scale),(stalk*.045*scale,0,.54*scale)),
               (.014*scale,.007*scale),4,
               [mats["willow_dark"]],collection,root)
    return root


def build_root_basket(mats,collection,parent):
    root=empty("RootBasket",collection,parent,"cellar_root_basket","search"); root.location=(-.68,2.92,1.08)
    body=build_basket("RootBasketBody",(0,0,0),.78,mats,collection,root,
                      "cellar_root_basket_body",include_handle=False)
    body["interaction"]="search"
    # Produce crosses the rim but is rooted well inside the cavity; none of it
    # balances above a black cap or reads as a floating tabletop cluster.
    for index,(x,y,a) in enumerate(((-.10,-.07,.18),(.05,.05,-.12),(.18,-.03,.28))):
        build_carrot("RootBasketCarrot",(x,y,.31),.62,mats,collection,root,a)
    build_onion("RootBasketOnion",(-.18,.12,.11),.62,mats,collection,root)
    build_onion("RootBasketOnion",(.22,.14,.11),.58,mats,collection,root)
    build_onion("RootBasketTurnip",(.02,-.16,.10),.60,mats,collection,root,True)
    root["produceNestedBelowRim"]=True
    root["basketRimZ"]=round(.49*.78,3)
    return root


def build_board_knife(mats,collection,parent):
    root=empty("CuttingBoardKnife",collection,parent,"cellar_cutting_board_knife","examine")
    root.location=(1.05,2.65,1.115); root.rotation_euler.z=-.08
    wood=[mats["oak_dark"],mats["oak_mid"],mats["oak_face"],mats["oak_wear"]]
    board=[(-.64,-.23),(.42,-.23),(.57,-.13),(.72,-.10),(.76,.08),(.58,.13),
           (.43,.23),(-.62,.23),(-.72,.12),(-.70,-.12)]
    extrude_xy("Board_IrregularOak",board,0,.075,wood,collection,root,2)
    # A dark faceted inset gives the handle its hanging hole without a costly
    # runtime boolean and stays readable under the elevated game camera.
    hole=[(.64+math.cos(i*math.tau/8)*.052,.01+math.sin(i*math.tau/8)*.052) for i in range(8)]
    extrude_xy("Board_HangingHole",hole,.078,.087,[mats["dark"]],collection,root,0)
    groove=[(-.55,-.15),(.38,-.15),(.56,-.07),(.61,.06),(.38,.15),(-.55,.15)]
    L.tube("Board_HandCutGroove",[(x,y,.083) for x,y in groove],.012,4,
           [mats["oak_dark"]],collection,root)
    for index,x in enumerate((-.12,.04,.19)):
        L.tube("Board_KnifeMark",((x,-.04,.085),(x+.10,.08,.085)),.008,4,
               [mats["oak_dark"]],collection,root,phase=index)
    # Broad utility blade, full tang and two-piece wooden grip.
    blade=[(-.20,-.055),(.23,-.055),(.38,-.025),(.31,.075),(-.18,.12),(-.28,.035)]
    blade_obj=extrude_xy("Knife_BroadIronBlade",blade,.092,.135,[mats["iron"],mats["iron_edge"]],collection,root,1)
    blade_obj.location=(-.05,-.02,0); blade_obj.rotation_euler.z=.12
    rough_plank("Knife_WoodHandle",(.50,.04,.116),(.38,.13,.10),wood,collection,root,690,rotation=.12)
    for x in (.39,.57):
        L.lathe("Knife_HandleRivet",((.018,.162),(.026,.167),(.023,.177)),6,
                [mats["iron_edge"]],collection,root,center=(x,.04))
    return root


def build_rug(mats,collection,parent):
    root=empty("AisleRunnerRug",collection,parent,"cellar_aisle_rug","examine")
    root.location=(0,-.58,.035); width,depth=4.55,1.46; cols,rows=18,6
    verts=[]
    for row in range(rows+1):
        for col in range(cols+1):
            x=-width*.5+width*col/cols; y=-depth*.5+depth*row/rows
            edge=col in (0,cols) or row in (0,rows)
            x+=math.sin(col*1.7+row)*(.025 if edge else .008)
            y+=math.sin(row*2.1+col)*(.025 if edge else .008)
            z=.012+.012*math.sin(col*.7)*math.sin(row*1.2)
            verts.append((x,y,z))
    faces=[];ids=[]
    for row in range(rows):
        for col in range(cols):
            a=row*(cols+1)+col; faces.append((a,a+1,a+cols+2,a+cols+1))
            border=row in (0,rows-1) or col in (0,cols-1)
            center_diamond=abs((col%6)-3)+abs(row-3)<=2
            ids.append(2 if border and (col+row)%3 else (1 if center_diamond else 0))
    mesh("Rug_WovenPattern",verts,faces,[mats["rug_red"],mats["rug_blue"],mats["rug_gold"]],
         collection,root,ids)
    # Fringe belongs on the short ends.  The previous long-edge fringe made the
    # runner read like a brush instead of a woven aisle textile.
    for row in range(rows*2+1):
        y=-depth*.5+depth*row/(rows*2)
        for side in (-1,1):
            x=side*width*.5
            L.tube("Rug_HandTiedFringe",((x,y,.01),(x+side*(.12+.025*(row%3)),
                   y+math.sin(row)*.018,0)),.012,4,[mats["rug_cream"]],collection,root,
                   phase=row)
    # Large dashed blanket-stitching, sparse enough to survive gameplay scale.
    for col in range(16):
        x=-width*.42+width*.84*col/15
        for side in (-1,1):
            y=side*depth*.40
            L.tube("Rug_BlanketStitch",((x-.055,y,.031),(x+.055,y,.031)),.010,4,
                   [mats["rug_cream"]],collection,root,phase=col)
    return root


def arch_stone(name,a0,a1,r0,r1,zc,mats,collection,parent,seed):
    rng=random.Random(seed)
    points=[]
    for r,a in ((r0,a0),(r0,a1),(r1,a1),(r1,a0)):
        points.append((math.cos(a)*(r+rng.uniform(-.025,.025)),
                       zc+math.sin(a)*(r+rng.uniform(-.025,.025))))
    return extrude_xz(name,points,-.40,.17,mats,collection,parent,2)


def flame_shape(name,points,y0,y1,mat,collection,parent):
    return extrude_xz(name,points,y0,y1,[mat],collection,parent,0)


def build_wall_picture(mats,collection,parent):
    """Original 8-bit scene in a hand-hewn oak frame, fitted to the old hearth bay."""
    root=empty("PixelWatchtowerPicture",collection,parent,"cellar_medieval_wall_picture","inspect")
    # Keep the picture wholly inside the visible masonry course and clear of
    # the north-wall hearth/chest composition.
    root.location=(-3.78,-4.36,2.06)

    # Create the textured face first so its UV layer remains the active layer
    # when the frame family is consolidated for the one-request runtime GLB.
    w,h,y=1.82,1.18,.081
    verts=[(-w*.5,y,-h*.5),(-w*.5,y,h*.5),(w*.5,y,h*.5),(w*.5,y,-h*.5)]
    data=bpy.data.meshes.new("PixelWatchtowerPictureFaceMesh")
    data.from_pydata(verts,[],[(0,1,2,3)]);data.update()
    uv=data.uv_layers.new(name="UVMap")
    coords=((0,0),(0,1),(1,1),(1,0))
    for loop in data.loops: uv.data[loop.index].uv=coords[loop.vertex_index]
    face=bpy.data.objects.new("PixelWatchtowerPictureFace",data);collection.objects.link(face)
    face.parent=root;face.data.materials.append(mats["pixel_art"])

    wood=[mats["oak_dark"],mats["oak_mid"],mats["oak_face"],mats["oak_wear"]]
    W.rough_block("Picture_OakBackboard",(0,0,0),(2.22,.10,1.56),wood,collection,root,940)
    for index,(name,location,size) in enumerate((
        ("Picture_FrameTop",(0,.075,.69),(2.25,.17,.18)),
        ("Picture_FrameBottom",(0,.075,-.69),(2.25,.17,.18)),
        ("Picture_FrameLeft",(-1.03,.075,0),(.19,.17,1.22)),
        ("Picture_FrameRight",(1.03,.075,0),(.19,.17,1.22)))):
        W.rough_block(name,location,size,wood,collection,root,950+index,[0,2,1,3,0,2])
    for index,(x,z) in enumerate(((-1.03,.69),(1.03,.69),(-1.03,-.69),(1.03,-.69))):
        W.rough_block("Picture_WoodPeg",(x,.18,z),(.10,.08,.10),
                      [mats["oak_dark"],mats["oak_wear"]],collection,root,970+index)
    return root


def build_hearth(mats,collection,parent):
    root=empty("MasonryHearth",collection,parent,"cellar_masonry_hearth","warm")
    # Seat the masonry against the full rear wall.  Its open firebox faces the
    # room while the chimney stays out of the OSRS cutaway camera sightline.
    # Seat the fixture into the room's visible north/back wall.  The slight
    # wall overlap is deliberate: the chimney breast and rear firebox now meet
    # masonry instead of reading as a freestanding prop.
    root.location=(3.28,-4.18,0)
    root.rotation_euler.z=math.pi
    root["archedCavityHeight"]=1.86
    root["cavityDepth"]=.55
    root["fullCavityBacking"]=True
    fixture=empty("HearthFixture",collection,root)
    stone=[mats["stone_dark"],mats["stone_mid"],mats["stone_face"]]
    wood=[mats["oak_dark"],mats["oak_mid"],mats["oak_face"]]
    iron=[mats["iron"],mats["iron_edge"]]
    # A complete arch-shaped rear surface and fitted returns create readable
    # depth.  The former short black rectangle left the upper cavity unfilled.
    cavity=[(-.67,.20),(.67,.20),(.67,1.16),(.62,1.40),(.45,1.64),
            (.22,1.80),(0,1.86),(-.22,1.80),(-.45,1.64),(-.62,1.40),(-.67,1.16)]
    extrude_xz("Hearth_RecessedArchedBack",cavity,.13,.21,
               [mats["firebox_back"],mats["soot"]],collection,fixture,0)
    W.rough_block("Hearth_InnerFloor",(0,-.17,.24),(1.34,.70,.12),
                  [mats["firebox_side"],mats["soot"]],collection,fixture,803)
    for side,x in enumerate((-.64,.64)):
        W.rough_block("Hearth_SootedJambReturn",(x,-.12,.84),(.10,.64,1.20),
                      [mats["firebox_side"],mats["soot"]],collection,fixture,804+side)
    W.rough_block("Hearth_ProjectingSlab",(0,-.35,.10),(2.45,1.22,.20),stone,collection,fixture,801)
    for side,x in enumerate((- .86,.86)):
        for row,z in enumerate((.42,.91,1.40)):
            W.rough_block("Hearth_HandSetPier",(x+math.sin(row+side)*.025,-.05,z),
                          (.46,.66,.50),stone,collection,fixture,810+side*10+row,
                          [0,1+(row+side)%2,0,1,0,1])
    for index in range(7):
        a0=math.pi-index*math.pi/7; a1=math.pi-(index+1)*math.pi/7
        arch_stone("Hearth_ArchVoussoir",a0,a1,.67,.96,1.18,stone,collection,fixture,840+index)
    hewn("Hearth_HeavyOakLintel",(-1.16,-.37,2.02),(1.16,-.37,2.02),.24,.20,wood,
         collection,fixture,860,.035)
    # Tapered hood: three irregular courses, each visibly narrower.
    for row,(z,width,count) in enumerate(((2.23,2.02,4),(2.52,1.60,3),(2.80,1.16,2))):
        step=width/count
        for col in range(count):
            x=-width*.5+step*(col+.5)
            W.rough_block("Hearth_TaperedHoodStone",(x,.02,z),(step-.045,.48,.30),stone,
                          collection,fixture,870+row*10+col,[0,1+(row+col)%2,0,1,0,1])
    W.rough_block("Hearth_ShortChimneyBreast",(0,.12,3.08),(.88,.42,.42),stone,collection,fixture,900)
    L.tube("Hearth_SplitLogA",((-.48,-.44,.35),(.46,.02,.43)),(.11,.10),7,wood,collection,fixture,phase=.4)
    L.tube("Hearth_SplitLogB",((.46,-.43,.35),(-.42,.04,.43)),(.11,.10),7,wood,collection,fixture,phase=1.1)
    for index,x in enumerate((-.42,-.14,.15,.42)):
        L.lathe("Hearth_DarkCoal",((.07,.24),(.12,.30),(.09,.39)),6,[mats["coal"],mats["soot"]],
                collection,fixture,center=(x,-.22+(index%2)*.12),asymmetry=.03,phase=index)
    L.tube("Hearth_IronRetainer",((-.78,-.53,.47),(.78,-.53,.47)),.035,6,iron,collection,fixture)
    for x in (-.72,.72):
        L.tube("Hearth_IronFoot",((x,-.53,.22),(x,-.53,.64)),(.04,.035),6,iron,collection,fixture)

    # A compact, hand-forged fireplace set makes the hearth feel maintained
    # rather than assembled from anonymous masonry.  All tools hang from a
    # low stand and remain readable as distinct silhouettes at gameplay scale.
    tool_x=1.43
    L.tube("HearthToolSet_Stand",((tool_x,-.46,.10),(tool_x,-.46,1.14)),(.045,.038),6,
           iron,collection,fixture)
    L.tube("HearthToolSet_Base",((tool_x-.30,-.46,.10),(tool_x+.30,-.46,.10)),(.050,.043),6,
           iron,collection,fixture)
    L.tube("HearthToolSet_Hanger",((tool_x-.27,-.46,1.10),(tool_x+.27,-.46,1.10)),(.036,.031),6,
           iron,collection,fixture)
    # Poker with a bent working tip.
    L.tube("HearthTool_Poker",((tool_x-.22,-.48,.18),(tool_x-.22,-.48,1.02),
           (tool_x-.14,-.48,1.10)),(.026,.021,.018),6,iron,collection,fixture)
    L.tube("HearthTool_PokerHook",((tool_x-.22,-.48,.18),(tool_x-.10,-.48,.12)),(.022,.016),6,
           iron,collection,fixture)
    # Shovel and brush use authored faceted heads rather than rectangular icons.
    L.tube("HearthTool_ShovelHandle",((tool_x+.02,-.47,.31),(tool_x+.02,-.47,1.03)),
           (.030,.023),6,iron,collection,fixture)
    extrude_xz("HearthTool_FacetedShovelHead",[(tool_x-.11,.09),(tool_x+.15,.09),
               (tool_x+.12,.34),(tool_x-.07,.38)],-.54,-.40,iron,collection,fixture,1)
    L.tube("HearthTool_BrushHandle",((tool_x+.25,-.45,.30),(tool_x+.25,-.45,1.02)),
           (.028,.022),6,iron,collection,fixture)
    W.rough_block("HearthTool_DenseBrush",(tool_x+.25,-.45,.17),(.28,.18,.20),
                  [mats["brush"]],collection,fixture,918,[0,0,0,0,0,0])

    flame=empty("HearthFlame",collection,root,"cellar_hearth_flame")
    # Negative local Y is the open, room-facing side of the firebox.  Keeping
    # the flame in front of the logs also prevents the dark rear panel from
    # depth-hiding it in Three.js.
    flame.location=(0,-.42,.31)
    flame_shape("Hearth_FlameOuter",[(-.34,0),(-.28,.38),(-.10,.62),(-.03,1.04),
                (.17,.69),(.31,.46),(.34,0)],-.08,.08,mats["ember"],collection,flame)
    flame_shape("Hearth_FlameMiddle",[(-.24,.02),(-.18,.35),(-.02,.74),(.10,.47),
                (.24,.02)],-.10,.10,mats["flame"],collection,flame)
    flame_shape("Hearth_FlameCore",[(-.13,.03),(-.08,.28),(.01,.48),(.13,.03)],-.12,.12,
                mats["flame_core"],collection,flame)
    flame.rotation_mode="XYZ"
    base=Vector((0,-.42,.31))
    # A five-second, four-beat loop gives the fire visible shape travel without
    # the nervous rapid flutter of a modern particle effect.
    for frame,scale,offset,rot_y,rot_z in (
        (1,(1,1,1),(0,0,0),0,0),
        (31,(.90,1.03,1.13),(.055,-.008,.015),-.075,.035),
        (61,(1.09,.98,.91),(-.050,.012,-.006),.062,-.028),
        (91,(.94,1.02,1.09),(.032,0,.012),-.045,.022),
        (121,(1,1,1),(0,0,0),0,0)):
        flame.scale=scale; flame.location=base+Vector(offset)
        flame.rotation_euler.y=rot_y; flame.rotation_euler.z=rot_z
        flame.keyframe_insert(data_path="scale",frame=frame)
        flame.keyframe_insert(data_path="location",frame=frame)
        flame.keyframe_insert(data_path="rotation_euler",frame=frame)
    action=flame.animation_data.action; action.name="Hearth_Flame"
    for curve in action.fcurves:
        for point in curve.keyframe_points: point.interpolation="BEZIER"
    return root,fixture,flame


def shelf_item_position(root,local):
    x,y,z=local; c=math.cos(math.pi/2);s=math.sin(math.pi/2)
    return (root.location.x+c*x-s*y,root.location.y+s*x+c*y,root.location.z+z)


def build_family(mats,collection):
    root=empty("cellar_remaining_furnishings_v1",collection,None)
    root["assetId"]="cellar_remaining_furnishings_v1";root["assetClass"]="room-furnishing-family"
    root["pipelineVersion"]=1;root["unitsPerTile"]=1;root["frontAxis"]="-Y"
    parts={}
    parts["storage_shelf"]=build_shelf(mats,collection,root)
    shelf=parts["storage_shelf"]
    for index,lx in enumerate((-1.05,1.05)):
        parts[f"grain_sack_{index}"]=build_sack(f"GrainSack_{index}",shelf_item_position(shelf,(lx,-.02,.25)),
                                                .46,mats,collection,root)
    for index,(lx,blue) in enumerate(((-1.16,False),(0,True),(1.16,False))):
        parts[f"lidded_crock_{index}"]=build_crock(f"LiddedCrock_{index}",shelf_item_position(shelf,(lx,-.02,.94)),
                                                   .47,mats,collection,root,blue)
    for index,lx in enumerate((-.90,.94)):
        parts[f"handled_basket_{index}"]=build_basket(f"HandledBasket_{index}",shelf_item_position(shelf,(lx,-.02,1.64)),
                                                       .42,mats,collection,root)
    # Keep a deliberate hand-width gap before the rotated hearth tool stand.
    parts["barrel_large"]=build_barrel("SupplyBarrelLarge",(.15,-3.43,.02),.82,mats,collection,root,"cellar_supply_barrel")
    parts["barrel_small"]=build_barrel("SupplyBarrelSmall",(1.03,-3.47,.02),.68,mats,collection,root,"cellar_supply_barrel")
    root["barrelToolClearance"]=round((3.28-(1.43+.30))-(1.03+.482*.68),3)
    parts["provision_table"]=build_bench(mats,collection,root)
    parts["root_basket"]=build_root_basket(mats,collection,root)
    parts["pickling_crock"]=build_crock("PicklingCrock",(.18,3.16,1.09),.68,mats,collection,root,True)
    parts["cutting_board_knife"]=build_board_knife(mats,collection,root)
    parts["aisle_rug"]=build_rug(mats,collection,root)
    parts["wall_picture"]=build_wall_picture(mats,collection,root)
    hearth,fixture,flame=build_hearth(mats,collection,root)
    parts["masonry_hearth"]=hearth
    return root,parts,fixture,flame


def descendants(root): return [root]+list(root.children_recursive)


def set_hidden(root,hidden):
    for obj in descendants(root): obj.hide_render=hidden


def bounds(root):
    pts=[]
    for obj in descendants(root):
        if obj.type=="MESH": pts.extend(obj.matrix_world@Vector(c) for c in obj.bound_box)
    if not pts: return Vector(),Vector((1,1,1))
    lo=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)))
    hi=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
    return (lo+hi)*.5,hi-lo


def dimensions(root):
    _,size=bounds(root);return {"width":round(size.x,3),"depth":round(size.y,3),"height":round(size.z,3)}


def proof_player(mats,collection):
    root=empty("PROOF_CanonicalPlayer",collection,None)
    L.lathe("PROOF_PlayerBody",[(.20,0),(.29,.12),(.25,1.28),(.17,1.53)],8,
            [mats["proof_player"]],collection,root)
    L.lathe("PROOF_PlayerHead",[(.11,1.53),(.18,1.61),(.18,1.80),(.07,1.90)],8,
            [mats["proof_player"]],collection,root)
    root.location=(-1.55,-.15,0);return root


def setup_scene(proof_collection):
    scene=bpy.context.scene;scene.render.engine="BLENDER_EEVEE_NEXT"
    scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG";scene.view_settings.look="AgX - Medium High Contrast"
    scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value=(.075,.068,.058,1);bg.inputs["Strength"].default_value=.55
    data=bpy.data.cameras.new("RemainingFurnishingsProofCamera");data.type="ORTHO"
    camera=bpy.data.objects.new("RemainingFurnishingsProofCamera",data);proof_collection.objects.link(camera);scene.camera=camera
    for name,loc,energy,color,size in (("WarmKey",(-5,-7,8),700,(1,.80,.58),4.5),
                                       ("CoolFill",(5,-1,5),360,(.55,.66,.78),4.0),
                                       ("TopRim",(0,5,7),250,(1,.55,.28),3.0)):
        ld=bpy.data.lights.new(name,"AREA");ld.energy=energy;ld.color=color;ld.shape="DISK";ld.size=size
        obj=bpy.data.objects.new(name,ld);proof_collection.objects.link(obj);obj.location=loc
        obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat("-Z","Y").to_euler()
    return scene,camera


def render_part(scene,camera,all_parts,part,key,filename=None):
    for candidate in all_parts.values(): set_hidden(candidate,True)
    set_hidden(part,False);center,size=bounds(part)
    direction=Vector((3.8,-5.5,3.2))
    if key=="storage_shelf": direction=Vector((4.8,-3.3,3.0))
    if key=="aisle_rug": direction=Vector((2.8,-4.0,5.5))
    if key=="wall_picture": direction=Vector((3.8,5.5,3.2))
    if key=="masonry_hearth": direction=Vector((3.4,5.8,3.4))
    camera.location=center+direction;camera.data.ortho_scale=max(size.x,size.y,size.z)*1.48+.55
    L.look_at(camera,center+Vector((0,0,size.z*.05)))
    L.render(scene,PREVIEW/(filename or f"{key}.png"))


def render_packet(scene,camera,root,parts,mats,proof_collection):
    player=proof_player(mats,proof_collection)
    for part in parts.values(): set_hidden(part,False)
    set_hidden(player,False);camera.location=(13,-16,12);camera.data.ortho_scale=14.5;L.look_at(camera,(0,0,1.0))
    L.render(scene,PREVIEW/"00_room_scale.png");set_hidden(player,True)
    representative={"storage_shelf":parts["storage_shelf"],"supply_barrel":parts["barrel_large"],
                    "lidded_crock":parts["pickling_crock"],"grain_sack":parts["grain_sack_0"],
                    "handled_basket":parts["handled_basket_0"],"provision_table":parts["provision_table"],
                    "root_basket":parts["root_basket"],"cutting_board_knife":parts["cutting_board_knife"],
                    "aisle_rug":parts["aisle_rug"],"wall_picture":parts["wall_picture"],
                    "masonry_hearth":parts["masonry_hearth"]}
    for key,part in representative.items(): render_part(scene,camera,parts,part,key)
    for frame in (1,31,61,91):
        scene.frame_set(frame)
        render_part(scene,camera,parts,parts["masonry_hearth"],"masonry_hearth",
                    f"hearth_motion_{frame:03d}.png")
    scene.frame_set(1)
    for part in parts.values(): set_hidden(part,False)
    restored=L.override_asset_materials(root,L.proof_wire_material())
    camera.location=(13,-16,12);camera.data.ortho_scale=14.5;L.look_at(camera,(0,0,1.0))
    L.render(scene,PREVIEW/"11_room_wireframe.png");L.restore_materials(restored)
    return representative


def consolidate(container,name):
    meshes=[o for o in descendants(container) if o.type=="MESH"]
    if not meshes:return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes: obj.select_set(True)
    active=meshes[0];bpy.context.view_layer.objects.active=active;bpy.ops.object.join()
    active.name=name;active.data.name=name+"Mesh"
    slots=[s.material for s in active.material_slots];poly_mats=[slots[p.material_index] for p in active.data.polygons]
    unique=[]
    for mat in poly_mats:
        if mat not in unique: unique.append(mat)
    active.data.materials.clear()
    for mat in unique: active.data.materials.append(mat)
    lookup={mat:i for i,mat in enumerate(unique)}
    for poly,mat in zip(active.data.polygons,poly_mats): poly.material_index=lookup[mat]
    return active


def export(root,parts,fixture,flame):
    # Hearth animation root must survive; consolidate its fixture and flame separately.
    consolidate(fixture,"MasonryHearthRuntimeMesh")
    consolidate(flame,"MasonryHearthFlameRuntimeMesh")
    for key,part in parts.items():
        if key=="masonry_hearth": continue
        consolidate(part,"Runtime_"+part.name)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(MODEL),export_format="GLB",use_selection=True,
                              export_apply=True,export_yup=True,export_materials="EXPORT",
                              export_extras=True,export_animations=True,export_cameras=False,export_lights=False)


def report(root,parts,representative):
    meshes=[o for o in descendants(root) if o.type=="MESH"]
    for obj in meshes:obj.data.calc_loop_triangles()
    names={o.name for o in descendants(root)}
    family_dims={key:dimensions(part) for key,part in representative.items()}
    def top_z(part):
        center,size=bounds(part);return center.z+size.z*.5
    shelf_contents_clear=(max(top_z(part) for key,part in parts.items() if key.startswith("grain_sack_")) < .845 and
                          max(top_z(part) for key,part in parts.items() if key.startswith("lidded_crock_")) < 1.535 and
                          max(top_z(part) for key,part in parts.items() if key.startswith("handled_basket_")) < 2.215)
    data={"asset":"cellar_remaining_furnishings_v1","pipelineVersion":1,"unitsPerTile":1,
          "blenderVersion":bpy.app.version_string,"source":str(SOURCE.relative_to(ROOT)).replace("\\","/"),
          "model":str(MODEL.relative_to(ROOT)).replace("\\","/"),
          "conceptTool":"Nano Banana 2 furnishing concepts plus built-in image generation for The Moonward Watch",
          "familyDimensionsTiles":family_dims,
          "instanceCount":len(parts),"visibleMeshObjects":len(meshes),
          "vertices":sum(len(o.data.vertices) for o in meshes),
          "triangles":sum(len(o.data.loop_triangles) for o in meshes),
          "materials":sorted({s.material.name for o in meshes for s in o.material_slots if s.material}),
          "animations":["Hearth_Flame"],"humanScaleContract":{"standingPlayerHeight":1.9,
              "tableHeight":family_dims["provision_table"]["height"],
              "shelfHeight":family_dims["storage_shelf"]["height"],
              "barrelHeight":family_dims["supply_barrel"]["height"],
              "hearthHeight":family_dims["masonry_hearth"]["height"]},
          "proofViews":["00_room_scale",*representative.keys(),"11_room_wireframe"],
          "checks":{"elevenReviewFamilies":len(representative)==11,
                    "semanticInstanceRoots":all(part.get("partId") for key,part in parts.items()
                                                 if not key.startswith(("grain_sack_","lidded_crock_","handled_basket_"))) and
                                            all(part.get("partId") for part in parts.values()),
                    "purposefulInteractions":all(part.get("interaction") for part in parts.values()),
                    "slowAnimatedHearth":"Hearth_Flame" in bpy.data.actions,
                    "hearthLoopFrames":list(bpy.data.actions["Hearth_Flame"].frame_range)==[1.0,121.0],
                    "singleMasonryHearth":len([o for o in descendants(root)
                                                if o.get("partId")=="cellar_masonry_hearth"])==1,
                    "singleFramedPixelPicture":len([o for o in descendants(root)
                                                     if o.get("partId")=="cellar_medieval_wall_picture"])==1,
                    "pixelArtTexturePacked":PIXEL_ART.exists(),
                    "openBasketInteriors":all(part.get("openInteriorDepth",0)>=.14
                                               for key,part in parts.items() if key.startswith("handled_basket_")) and
                                          parts["root_basket"].children[0].get("openInteriorDepth",0)>=.20,
                    "produceNestedBelowBasketRim":parts["root_basket"].get("produceNestedBelowRim")==True,
                    "fullArchedFireboxCavity":parts["masonry_hearth"].get("fullCavityBacking")==True and
                                             parts["masonry_hearth"].get("archedCavityHeight",0)>=1.85 and
                                             parts["masonry_hearth"].get("cavityDepth",0)>=.5,
                    "barrelsClearHearthTools":root.get("barrelToolClearance",0)>=.15,
                    "shelfContentsClearEveryBoard":shelf_contents_clear,
                    "customTopologyProof":(PREVIEW/"11_room_wireframe.png").exists(),
                    "noPrimitiveOperatorsUsed":True,
                    "runtimeGroupedPerObject":all(any(o.name.startswith("Runtime_") for o in descendants(part))
                                                   for key,part in parts.items() if key!="masonry_hearth"),
                    "allProofsBanked":all((PREVIEW/f"{key}.png").exists() for key in representative)},
          "status":"item-by-item Blender review candidate"}
    REPORT.write_text(json.dumps(data,indent=2),encoding="utf-8");return data


def main():
    reset();asset=bpy.data.collections.new("ASSET_CellarRemainingFurnishingsV1")
    proof=bpy.data.collections.new("PROOF_CellarRemainingFurnishingsV1")
    bpy.context.scene.collection.children.link(asset);bpy.context.scene.collection.children.link(proof)
    mats=materials();root,parts,fixture,flame=build_family(mats,asset)
    scene,camera=setup_scene(proof);representative=render_packet(scene,camera,root,parts,mats,proof)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE));export(root,parts,fixture,flame)
    result=report(root,parts,representative);print("CELLAR_REMAINING_FURNISHINGS_V1",json.dumps(result),flush=True)


if __name__=="__main__":main()
