"""Old-school textured candidate of an existing Blender building (world look pass 2026-09-25).

Owner, 2026-09-25: "this game has to feel a little bit more old school medieval, like old school RuneScape ... it
does feel a little bit too polished". The 2004 look is low-res tiled textures on every surface; this recipe gives an
existing building exactly that without touching its geometry:
  1. opens the source .blend (never modified; everything is saved to the NEW versioned workspace in the spec),
  2. adds one UV map per mesh by planar projection in world metres (walls: U along the wall, V up; roofs: U along the
     eave, V up the slope; floors: world X/Y), so kit textures tile at a fixed real-world size on every face,
  3. maps materials by name to the kit (assets/textures/oldschool, tools/build_oldschool_textures.js): the texture is
     multiplied by a tint = the material's authored colour / the texture's mean colour, so each material keeps its
     authored average colour and gains the kit's pattern (mortar, grain, straw, tile rows...),
  4. vertex-coloured faces (the 'Holm flat colour' material) are classified per face by colour (wood / plaster /
     stone) and object name, moved to textured variants of that material, and their corner colours divided by the
     texture mean for the same reason,
  5. packs the kit images, saves the .blend and exports the GLB with the same exporter settings as the source
     (GLB, +Y up, custom properties as extras, animations as authored).
Geometry, object names, hierarchy, custom properties and animations are unchanged; only UVs, materials and corner
colours differ, so measured navigation stays node-identical (re-measure anyway: the model hash changes).
Run: blender -b <source.blend> --python tools/blender/apply_oldschool_textures.py -- <spec.json>
Spec (JSON, paths relative to the repo root):
  {"source": ".blend path (for the report)", "outBlend": "...", "outGlb": "...", "report": "...json",
   "rules": [[regex, texture|null, metres per repeat], ...]   (optional; first match wins; defaults below),
   "vertexColour": {"material": "Holm flat colour", "skip": regex, "woodOnly": regex, "floors": regex}}
"""
import bpy, json, sys, re, math, colorsys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / sys.argv[sys.argv.index('--') + 1]).read_text())
KIT = json.loads((ROOT / 'assets/textures/oldschool/kit.json').read_text())['textures']
# material name -> kit texture and its real-world repeat (metres); first match wins, None = keep flat colour
RULES = SPEC.get('rules') or [
    [r'(?i)glow|flame|ember|leaf|reed|twine|bulrush|iron|fish', None, 0],
    [r'(?i)thatch', 'thatch', 1.4],
    [r'(?i)shingle', 'roof_tiles', 0.9],
    [r'(?i)clay tile|muted clay', 'roof_tiles', 1.1],
    [r'(?i)plaster', 'plaster', 1.5],
    [r'(?i)floorboard|plank|tread', 'planks', 1.0],
    [r'(?i)oak', 'beam', 0.8],
    [r'(?i)flag|fieldstone|stone lit|stone shaded|sandstone', 'rock', 0.9],
]
METRES = {'planks': 1.0, 'beam': 0.8, 'plaster': 1.5, 'rock': 0.9, 'stone_course': 1.2, 'roof_tiles': 1.1, 'thatch': 1.4, 'brick': 0.8, 'path': 1.2}
VC = SPEC.get('vertexColour') or {}
report = {'schema': 'crafted-realm-oldschool-textured-candidate-v1', 'recipe': 'tools/blender/apply_oldschool_textures.py',
          'blender': bpy.app.version_string, 'source': SPEC.get('source'), 'materials': {}, 'vertexColourFaces': {}, 'meshes': 0}

images = {}
def image(name):
    if name not in images:
        im = bpy.data.images.load(str(ROOT / KIT[name]['file']), check_existing=True)
        im.name = 'oldschool_' + name
        im.pack()
        images[name] = im
    return images[name]

def mean(name):
    return KIT[name]['mean']

def rule_for(mat_name):
    for rx, tex, metres in RULES:
        if re.search(rx, mat_name):
            return (tex, metres or METRES.get(tex, 1.0)) if tex else None
    return None

def principled(mat):
    """The Principled BSDF feeding the material's active output (the node the glTF exporter reads)."""
    nt = mat.node_tree
    outs = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL']
    out = next((n for n in outs if n.is_active_output), outs[0] if outs else None)
    if out and out.inputs['Surface'].is_linked:
        n = out.inputs['Surface'].links[0].from_node
        if n.type == 'BSDF_PRINCIPLED':
            return n
    return next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)

def texture_node(nt, tex, x=-700, y=300):
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = image(tex)
    t.interpolation = 'Closest'      # 2004 textures were drawn unfiltered: crisp texels up close
    t.extension = 'REPEAT'
    t.location = (x, y)
    return t

def multiply(nt, a_socket, colour=None, b_socket=None, x=-350, y=300):
    m = nt.nodes.new('ShaderNodeMix')
    m.data_type = 'RGBA'
    m.blend_type = 'MULTIPLY'
    m.location = (x, y)
    m.inputs['Factor'].default_value = 1.0
    a, b = [s for s in m.inputs if s.type == 'RGBA'][:2]
    nt.links.new(a_socket, a)
    if b_socket is not None:
        nt.links.new(b_socket, b)
    else:
        b.default_value = colour
    return [s for s in m.outputs if s.type == 'RGBA'][0]

def tint(base, tex):
    mu = mean(tex)
    return tuple(min(1.0, base[i] / max(1e-4, mu[i])) for i in range(3)) + (1.0,)

def texture_material(mat, tex):
    """Texture a named (flat colour) material in place: Base Color = kit texture x tint."""
    if not mat.use_nodes:
        base, metallic, roughness = tuple(mat.diffuse_color[:3]), mat.metallic, mat.roughness
        mat.use_nodes = True
        nt = mat.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        out = nt.nodes.new('ShaderNodeOutputMaterial'); out.location = (300, 300)
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled'); bsdf.location = (0, 300)
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
    else:
        nt = mat.node_tree
        bsdf = principled(mat)
        if bsdf is None or bsdf.inputs['Base Color'].is_linked:
            return False
        base = tuple(bsdf.inputs['Base Color'].default_value[:3])
    t = texture_node(nt, tex)
    colour = tint(base, tex)
    nt.links.new(multiply(nt, t.outputs['Color'], colour=colour), bsdf.inputs['Base Color'])
    report['materials'][mat.name] = {'texture': tex, 'authored': [round(v, 4) for v in base], 'tint': [round(v, 4) for v in colour[:3]]}
    return True

vc_materials = {}
def vc_variant(src, tex):
    """A textured copy of the vertex-colour material: Base Color = kit texture x corner colour."""
    key = (src.name, tex)
    if key in vc_materials:
        return vc_materials[key]
    m = src.copy()
    m.name = src.name + ' - ' + tex
    nt = m.node_tree
    bsdf = principled(m)
    link = bsdf.inputs['Base Color'].links[0]
    col_socket = link.from_socket
    nt.links.remove(link)
    t = texture_node(nt, tex, y=500)
    nt.links.new(multiply(nt, t.outputs['Color'], b_socket=col_socket), bsdf.inputs['Base Color'])
    vc_materials[key] = m
    report['materials'][m.name] = {'texture': tex, 'vertexColour': True}
    return m

def classify(rgb, obj_name, up):
    if VC.get('skip') and re.search(VC['skip'], obj_name):
        return None
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    plaster = v >= 0.68 and 0.08 <= s <= 0.36 and 0.06 <= h <= 0.17
    wood = 0.03 <= h <= 0.13 and s >= 0.28 and v <= 0.82 and not plaster
    stone = s < 0.22 and 0.18 <= v <= 0.72
    if wood:
        return 'planks' if up and VC.get('floors') and re.search(VC['floors'], obj_name) else 'beam'
    if VC.get('woodOnly') and re.search(VC['woodOnly'], obj_name):
        return None
    if plaster:
        return 'plaster'
    if stone:
        return 'rock'
    return None

def basis(n):
    """Planar projection axes for a face normal (Blender Z up): floors use world X/Y; walls and roofs run U along the
    horizontal and V up the face."""
    if abs(n.z) > 0.95:
        return Vector((1, 0, 0)), Vector((0, 1, 0))
    u = Vector((0, 0, 1)).cross(n).normalized()
    return u, n.cross(u).normalized()

# ---- materials by name ----
textured = {}
for mat in bpy.data.materials:
    r = rule_for(mat.name)
    if r and (VC.get('material') != mat.name):
        if texture_material(mat, r[0]):
            textured[mat.name] = r

# ---- UVs, vertex-colour faces ----
vc_name = VC.get('material')
for ob in bpy.data.objects:
    if ob.type != 'MESH':
        continue
    me = ob.data
    report['meshes'] += 1
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    mw = ob.matrix_world if me.users == 1 else Matrix.Identity(4)   # mesh data shared by several objects: object space
    rot = mw.to_3x3()
    ca = me.color_attributes.get('Col') if vc_name else None
    counts = {}
    for p in me.polygons:
        mat = me.materials[p.material_index] if p.material_index < len(me.materials) else None
        n = (rot @ p.normal).normalized()
        tex, metres = None, 1.0
        if mat and mat.name in textured:
            tex, metres = textured[mat.name]
        elif mat and vc_name and mat.name == vc_name and ca is not None:
            cols = [ca.data[li].color for li in p.loop_indices] if ca.domain == 'CORNER' else [ca.data[vi].color for vi in p.vertices]
            rgb = tuple(sum(c[i] for c in cols) / len(cols) for i in range(3))
            tex = classify(rgb, ob.name, n.z > 0.7)
            if tex:
                metres = METRES.get(tex, 1.0) * (0.75 if VC.get('woodOnly') and re.search(VC['woodOnly'], ob.name) else 1.0)
                variant = vc_variant(mat, tex)
                idx = me.materials.find(variant.name)
                if idx < 0:
                    me.materials.append(variant); idx = len(me.materials) - 1
                p.material_index = idx
                mu = mean(tex)
                if ca.domain == 'CORNER':
                    for li in p.loop_indices:
                        c = ca.data[li].color
                        ca.data[li].color = (min(1.0, c[0] / mu[0]), min(1.0, c[1] / mu[1]), min(1.0, c[2] / mu[2]), c[3])
                counts[tex] = counts.get(tex, 0) + 1
        u, v = basis(n)
        k = 1.0 / max(0.05, metres)
        for li in p.loop_indices:
            w = mw @ me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (w.dot(u) * k, w.dot(v) * k)
    if counts:
        report['vertexColourFaces'][ob.name] = counts

# ---- save + export ----
out_blend = ROOT / SPEC['outBlend']; out_glb = ROOT / SPEC['outGlb']
out_blend.parent.mkdir(parents=True, exist_ok=True); out_glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out_blend), copy=True, compress=False)
bpy.ops.export_scene.gltf(filepath=str(out_glb), export_format='GLB', export_yup=True, export_extras=True)
data = out_glb.read_bytes()
report['glb'] = {'path': SPEC['outGlb'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
report['images'] = sorted(images)
if SPEC.get('report'):
    (ROOT / SPEC['report']).write_text(json.dumps(report, indent=1) + '\n')
print('[OLDSCHOOL TEXTURES]', json.dumps({'glb': report['glb'], 'materials': len(report['materials']), 'images': report['images']}))
