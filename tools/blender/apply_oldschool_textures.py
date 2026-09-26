"""Old-school textured candidate of an existing Blender asset (world look pass 2026-09-25, rollout 2026-09-26).

Owner, 2026-09-25: "this game has to feel a little bit more old school medieval, like old school RuneScape ... it
does feel a little bit too polished". The 2004 look is low-res tiled textures on every surface; this recipe gives an
existing asset exactly that without touching its geometry:
  1. opens the source .blend, or (spec "import") imports the asset's GLB into an empty scene, for .blend files that
     hold several exported assets (tree family, garden, landing props); sources are never modified, everything is
     saved to the NEW versioned workspace in the spec,
  2. adds planar-projected UVs in world metres (walls: U along the wall, V up; roofs: U along the eave, V up the
     slope; floors: world X/Y) on the faces it textures; faces whose material already carries an image keep the UVs
     their author gave them,
  3. maps flat-colour materials by name to the kit (assets/textures/oldschool, tools/build_oldschool_textures.js):
     texture x tint, tint = authored colour / texture mean, so each material keeps its authored average colour and
     gains the kit's pattern (mortar, grain, straw, tile rows, leaf clumps, bark fissures...),
  4. with "replaceExisting", swaps an already-textured material's image for the kit texture its name maps to, tinted
     so the old image's average colour is kept (trees: leaves over darker clumps, fissured bark),
  5. classifies vertex-coloured faces (the 'Holm flat colour' material) per face by colour (wood / plaster / stone)
     and object name into textured variants of that material, their corner colours divided by the texture mean;
     "maxVariants"/"minShare" cap how many variants one mesh may split into (each variant is one more draw call),
  6. packs every image, saves the .blend and exports the GLB with the source's exporter settings (GLB, +Y up,
     custom properties as extras, animations as authored; imported animations are written key for key).
Geometry, names, hierarchy, custom properties and animations are unchanged (tools/compare_glb_structure.js proves
it); only UVs, materials and corner colours differ.
Run: blender -b [<source.blend>] --python tools/blender/apply_oldschool_textures.py -- <spec.json>
Spec (JSON, paths relative to the repo root):
  {"source": ".blend (opened by the command line) or omitted with "import": "<asset.glb>",
   "outBlend": "...", "outGlb": "...", "report": "...json",
   "rules": [[regex, texture|null, metres per repeat], ...]   (optional, tried before the defaults; first match wins),
   "replaceExisting": false, "factorToSrgb": false (true when the runtime converts flat colours linear->sRGB),
   "exportAnimationMode": optional glTF exporter animation mode (NLA_TRACKS for imported multi-object clips),
   "vertexColour": {"material": "Holm flat colour", "skip": regex, "woodOnly": regex, "floors": regex,
                    "maxVariants": 2, "minShare": 0.15}}
"""
import bpy, json, sys, re, math, colorsys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / sys.argv[sys.argv.index('--') + 1]).read_text())
KIT = json.loads((ROOT / 'assets/textures/oldschool/kit.json').read_text())['textures']
IMPORT = SPEC.get('import')
if IMPORT:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if SPEC.get('fps'):   # the clips' authored sampling rate, so imported keys land on whole frames and export unchanged
        bpy.context.scene.render.fps = int(SPEC['fps'])
    bpy.ops.import_scene.gltf(filepath=str(ROOT / IMPORT))

SKIP = (r'(?i)glow|flame|ember|fire|candle|lantern|glass|crystal|rune|marker|ripple|beam-light|gold|brass|bronze|'
        r'copper(?! ore)|iron|metal|parchment|paper|\bink\b|wax|chart|notice|book|canvas|sackcloth|linen|wool|blanket|'
        r'baize|leather|rope|cord|twine|hemp|flax|bulrush|reed|seedhead|flower|moss|water|\bchar\b|coal|paint|'
        r'ochre|oxblood|\btar\b|slate|shaft|sheer')
# material name -> kit texture and its real-world repeat (metres); first match wins, None = keep flat colour
DEFAULT_RULES = [
    [r'(?i)thatch', 'thatch', 1.4],
    [r'(?i)shingle', 'roof_tiles', 0.9],
    [r'(?i)clay tile|muted clay|\bclay\b', 'roof_tiles', 1.1],
    [r'(?i)birch.?bark', 'bark_birch', 0.6],
    [r'(?i)needle', 'needles', 0.8],
    [r'(?i)leaf|leaves|foliage|tuft|coppice', 'leaves', 0.9],
    [r'(?i)bark|fissured|trunk', 'bark', 0.8],
    [SKIP, None, 0],
    [r'(?i)plaster|limewash', 'plaster', 1.5],
    [r'(?i)floorboard|plank|tread|deck|strake|board', 'planks', 1.0],
    [r'(?i)oak|timber|wood|beam|frame|post|crate|pit prop|stair|joist|rail', 'beam', 0.8],
    [r'(?i)gravel', 'path', 1.2],
    [r'(?i)trodden|earth|dirt', 'dirt', 1.2],
    [r'(?i)ore|rock|stone|flag|sandstone|limestone|granite|cave|strata|footing|landing|slab|furnace|rubble|boulder|dressed', 'rock', 0.9],
]
RULES = (SPEC.get('rules') or []) + DEFAULT_RULES
METRES = {'planks': 1.0, 'beam': 0.8, 'plaster': 1.5, 'rock': 0.9, 'stone_course': 1.2, 'roof_tiles': 1.1, 'thatch': 1.4,
          'brick': 0.8, 'path': 1.2, 'dirt': 1.2, 'leaves': 0.9, 'needles': 0.8, 'bark': 0.8, 'bark_birch': 0.6}
VC = SPEC.get('vertexColour') or {}
report = {'schema': 'crafted-realm-oldschool-textured-candidate-v2', 'recipe': 'tools/blender/apply_oldschool_textures.py',
          'blender': bpy.app.version_string, 'source': SPEC.get('source') or IMPORT, 'materials': {}, 'vertexColourFaces': {},
          'keptImages': [], 'meshes': 0}

def lin_to_srgb(c):
    return c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055

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

def rule_for(name):
    for rx, tex, metres in RULES:
        if re.search(rx, name):
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

def upstream_image(socket, depth=0):
    """The image texture node feeding a socket directly or through mix/multiply nodes, if any."""
    if not socket.is_linked or depth > 4:
        return None
    node = socket.links[0].from_node
    if node.type == 'TEX_IMAGE':
        return node
    for s in node.inputs:
        if s.type == 'RGBA':
            found = upstream_image(s, depth + 1)
            if found:
                return found
    return None

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
    if SPEC.get('factorToSrgb'):
        base = tuple(lin_to_srgb(c) for c in base)
    return tuple(min(1.0, base[i] / max(1e-4, mu[i])) for i in range(3)) + (1.0,)

def image_mean(im):
    px = im.pixels[:]
    n = len(px) // 4
    return [sum(px[i::4][:n]) / max(1, n) for i in range(3)]

def texture_material(mat, tex):
    """Texture a flat-colour material in place: Base Color = kit texture x tint."""
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

def replace_image(mat, node, tex):
    """Swap an authored image for the kit texture its name maps to, keeping the old image's average colour."""
    old = node.image
    was = image_mean(old)
    mu = mean(tex)
    colour = tuple(min(1.0, was[i] / max(1e-4, mu[i])) for i in range(3)) + (1.0,)
    nt = mat.node_tree
    node.image = image(tex)
    node.interpolation = 'Closest'
    out = node.outputs['Color']
    links = [(l.to_socket) for l in list(out.links)]
    for l in list(out.links):
        nt.links.remove(l)
    tinted = multiply(nt, out, colour=colour)
    for s in links:
        nt.links.new(tinted, s)
    report['materials'][mat.name] = {'texture': tex, 'replacedImage': old.name, 'oldMean': [round(v, 4) for v in was], 'tint': [round(v, 4) for v in colour[:3]]}

# ---- materials by name ----
textured = {}        # material name -> (texture, metres): faces get projected UVs
kept_uv = set()      # material names whose authored UVs stay
vc_name = VC.get('material')
for mat in bpy.data.materials:
    if vc_name and mat.name == vc_name:
        continue
    bsdf = principled(mat) if mat.use_nodes else None
    img = upstream_image(bsdf.inputs['Base Color']) if bsdf else None
    r = rule_for(mat.name)
    if img is not None:
        kept_uv.add(mat.name)
        if SPEC.get('replaceExisting') and r:
            replace_image(mat, img, r[0])
        else:
            report['keptImages'].append(mat.name)
        continue
    if r and texture_material(mat, r[0]):
        textured[mat.name] = r

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

MAXV = int(VC.get('maxVariants', 2))
MINSHARE = float(VC.get('minShare', 0.15))
for ob in bpy.data.objects:
    if ob.type != 'MESH':
        continue
    me = ob.data
    report['meshes'] += 1
    had_uv = len(me.uv_layers) > 0
    uv = me.uv_layers.active if had_uv else me.uv_layers.new(name='UVMap')
    mw = ob.matrix_world if me.users == 1 else Matrix.Identity(4)   # mesh data shared by several objects: object space
    rot = mw.to_3x3()
    ca = me.color_attributes.get('Col') if vc_name else None
    # vertex-colour faces: classify, then keep at most MAXV classes per mesh (a class needs MINSHARE of the area);
    # the rest join the mesh's dominant class so the mesh never splits into more than MAXV draw calls
    cls = {}
    if vc_name and ca is not None:
        area = {}
        for p in me.polygons:
            mat = me.materials[p.material_index] if p.material_index < len(me.materials) else None
            if not (mat and mat.name == vc_name):
                continue
            cols = [ca.data[li].color for li in p.loop_indices] if ca.domain == 'CORNER' else [ca.data[vi].color for vi in p.vertices]
            rgb = tuple(sum(c[i] for c in cols) / len(cols) for i in range(3))
            c = classify(rgb, ob.name, (rot @ p.normal).normalized().z > 0.7)
            cls[p.index] = c
            area[c] = area.get(c, 0) + p.area
        if area:
            total = sum(area.values()) or 1
            order = sorted(area, key=lambda k: -area[k])
            keep = [c for c in order if area[c] / total >= MINSHARE][:MAXV] or order[:1]
            for i, c in list(cls.items()):
                if c not in keep:
                    cls[i] = keep[0]
    counts = {}
    for p in me.polygons:
        mat = me.materials[p.material_index] if p.material_index < len(me.materials) else None
        n = (rot @ p.normal).normalized()
        tex, metres = None, 1.0
        if mat and mat.name in textured:
            tex, metres = textured[mat.name]
        elif p.index in cls and cls[p.index]:
            tex = cls[p.index]
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
        if tex is None and (had_uv or (mat and mat.name in kept_uv)):
            continue      # authored UVs (or an untextured face on a mesh that already had UVs) stay as they are
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
try:
    bpy.ops.file.pack_all()
except Exception as e:  # an image without a file on disk (generated) cannot be packed; it is embedded in the GLB anyway
    print('[OLDSCHOOL TEXTURES] pack_all:', e)
bpy.ops.wm.save_as_mainfile(filepath=str(out_blend), copy=True, compress=False)
kw = dict(filepath=str(out_glb), export_format='GLB', export_yup=True, export_extras=True)
if IMPORT:
    kw['export_force_sampling'] = False   # imported animations are written key for key, as authored
if SPEC.get('exportAnimationMode'):
    kw['export_animation_mode'] = SPEC['exportAnimationMode']   # e.g. NLA_TRACKS: one glTF animation per imported clip
    # imported strips start on frame 1: slide them back to time 0 when the authored clips start there (spec slideToZero)
    kw['export_anim_slide_to_zero'] = bool(SPEC.get('slideToZero', True))
bpy.ops.export_scene.gltf(**kw)

def glb_parts(raw):
    import struct
    length = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + length]), raw[20 + length:]

def restore_import_rest_pose(path, reference):
    """Blender's glTF importer leaves animated objects in a clip's pose, so the exporter writes that pose as the node's
    rest transform, and it lists clips in its own order. Put back the reference's rest TRS on every node of the same
    name and the reference's clip order (JSON chunk only; the binary chunk is untouched)."""
    import struct
    j, tail = glb_parts(path.read_bytes())
    ref, _ = glb_parts(reference.read_bytes())
    by_name = {n.get('name'): n for n in ref['nodes']}
    for n in j['nodes']:
        r = by_name.get(n.get('name'))
        if r is None:
            continue
        for k in ('translation', 'rotation', 'scale'):
            if k in r:
                n[k] = r[k]
            else:
                n.pop(k, None)
    if j.get('animations') and ref.get('animations'):
        order = {a['name']: i for i, a in enumerate(ref['animations'])}
        j['animations'].sort(key=lambda a: order.get(a['name'], 1e9))
    body = json.dumps(j, separators=(',', ':')).encode()
    body += b' ' * ((4 - len(body) % 4) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(body) + len(tail)) + struct.pack('<II', len(body), 0x4E4F534A) + body + tail
    path.write_bytes(out)

if IMPORT:
    restore_import_rest_pose(out_glb, ROOT / IMPORT)
data = out_glb.read_bytes()
report['glb'] = {'path': SPEC['outGlb'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
report['images'] = sorted(images)
if SPEC.get('report'):
    (ROOT / SPEC['report']).write_text(json.dumps(report, indent=1) + '\n')
print('[OLDSCHOOL TEXTURES]', json.dumps({'glb': report['glb'], 'materials': len(report['materials']), 'images': report['images']}))
