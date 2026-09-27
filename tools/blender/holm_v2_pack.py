"""Shared prop-pack plumbing for the Tutor's Holm v2 land packs (2026-09-26): Minnow Hollow set, Creakwheel Mill set,
clutter, cove and farm. Each pack is ONE GLB of named root empties (root name = prop id; the runtime clones by root name),
built with holm_interior_kit.Acc parts in plan coordinates (x east, y up, z south; Blender (x,-z,y)), 1 unit = 1 tile,
origin at the prop's resting base centre. Materials are named by what they are ('Weathered oak planks', 'Field stone',
...) so tools/blender/apply_oldschool_textures.py textures them by name afterwards; all matte, authored sRGB.
export() verifies the file it wrote (every root present, triangles per root, bounds) and writes manifest.json;
proof() renders a labelled lineup with a 1.9-tile player capsule for scale. Original designs only."""
import bpy, json, math, struct, hashlib
from pathlib import Path
from mathutils import Vector

def srgb_to_lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

class Pack:
    def __init__(self, name, out, budget_tris=40000):
        self.name, self.out, self.budget = name, Path(out), budget_tris
        self.out.mkdir(parents=True, exist_ok=True)
        self.roots = []; self.meta = {}
        bpy.ops.wm.read_factory_settings(use_empty=True)
    def root(self, name, **meta):
        e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e)
        self.roots.append(e); self.meta[name] = meta; return e
    def tris(self, r): return sum(len(p.vertices) - 2 for x in r.children_recursive if x.type == 'MESH' for p in x.data.polygons)
    def bounds(self, r):
        pts = [x.matrix_world @ v.co for x in r.children_recursive if x.type == 'MESH' for v in x.data.vertices]
        lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
        return {'min': [round(lo[0], 4), round(lo[2], 4), round(-hi[1], 4)], 'max': [round(hi[0], 4), round(hi[2], 4), round(-lo[1], 4)]}
    def export(self, glb_name='props.glb', animations=False):
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action='DESELECT')
        for r in self.roots:
            r.select_set(True)
            for x in r.children_recursive: x.select_set(True)
        glb = self.out / glb_name
        bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_animations=animations,
                                  export_yup=True, export_apply=True, export_materials='EXPORT', export_extras=True)
        raw = glb.read_bytes(); n = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + n])
        sha = hashlib.sha256(raw).hexdigest(); nodes = doc['nodes']
        top = {nodes[i]['name']: i for i in doc['scenes'][0]['nodes']}
        def gt(i):
            nd = nodes[i]; t = 0
            if 'mesh' in nd:
                for pr in doc['meshes'][nd['mesh']]['primitives']: t += doc['accessors'][pr['indices']]['count'] // 3
            return t + sum(gt(c) for c in nd.get('children', []))
        man = {'schema': 1, 'pack': self.name, 'status': 'candidate', 'axes': 'glTF Y-up, 1 unit = tile, origin at the resting base centre',
               'file': glb_name, 'blend': glb_name.replace('.glb', '.blend'), 'sha256': sha, 'assets': []}
        total = 0
        for r in self.roots:
            assert r.name in top, 'missing root in GLB: ' + r.name
            t = self.tris(r); assert gt(top[r.name]) == t, (r.name, gt(top[r.name]), t); total += t
            mats = sorted({m.name for x in r.children_recursive if x.type == 'MESH' for m in x.data.materials})
            man['assets'].append(dict({'name': r.name, 'root': r.name, 'triangles': t, 'materials': mats, 'bounds': self.bounds(r), 'sha256': sha}, **self.meta[r.name]))
            print('[%s] %-22s %5d tris %s' % (self.name, r.name, t, self.bounds(r)))
        man['totals'] = {'triangles': total, 'assets': len(self.roots), 'materials': len(doc.get('materials', [])), 'budgetTriangles': self.budget}
        assert total <= self.budget, ('triangle budget', total, self.budget)
        bpy.ops.wm.save_as_mainfile(filepath=str(self.out / glb_name.replace('.glb', '.blend')))
        (self.out / 'manifest.json').write_text(json.dumps(man, indent=1) + '\n', encoding='utf8')
        print('[%s] PASS %d assets %d tris %d materials sha %s' % (self.name, len(self.roots), total, man['totals']['materials'], sha[:16]))
        return man
    def proof(self, path, per_row=7, spacing=.6, extra=None):
        """Lineup render: every root in rows beside a 1.9-tile capsule; Eevee, soft sun, flat ground."""
        scene = bpy.context.scene
        for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
            try: scene.render.engine = eng; break
            except TypeError: pass
        scene.view_settings.view_transform = 'Standard'
        scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
        bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (.55, .6, .66, 1); bg.inputs[1].default_value = .9
        def flat(name, rgb):
            m = bpy.data.materials.new(name); m.use_nodes = True
            bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            bs.inputs['Base Color'].default_value = (*[srgb_to_lin(c) for c in rgb], 1); bs.inputs['Roughness'].default_value = 1; return m
        ground_m = flat('proof ground', (.42, .52, .24)); cap_m = flat('proof capsule', (.55, .62, .75)); ink = flat('proof label', (.1, .12, .07))
        sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 3.0; sun.rotation_euler = (math.radians(48), 0, math.radians(-38)); scene.collection.objects.link(sun)
        fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .8; fill.rotation_euler = (math.radians(65), 0, math.radians(150)); scene.collection.objects.link(fill)
        rows = [self.roots[i:i + per_row] for i in range(0, len(self.roots), per_row)]
        y = 0.; widest = 0.; depth_total = 0.
        for row in rows:
            x = 0.; deep = 0.
            bpy.ops.mesh.primitive_cylinder_add(radius=.24, depth=1.9, location=(x, y, .95), vertices=12); bpy.context.object.data.materials.append(cap_m)
            x = .6
            for r in row:
                b = self.bounds(r); w = b['max'][0] - b['min'][0]; x += spacing - b['min'][0]
                r.location = (x, y, 0); deep = max(deep, b['max'][2] - b['min'][2])
                cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = r.name; cu.size = .16; cu.align_x = 'CENTER'
                o = bpy.data.objects.new('lbl_' + r.name, cu); o.location = (x + (b['min'][0] + b['max'][0]) / 2, y - max(.6, (b['max'][2]) + .25), .01); cu.materials.append(ink); scene.collection.objects.link(o)
                x += b['max'][0]
            widest = max(widest, x); y += max(2.4, deep + 1.6); depth_total = y
        bpy.ops.mesh.primitive_plane_add(size=400, location=(widest / 2, depth_total / 2, -.001)); bpy.context.object.data.materials.append(ground_m)
        cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(cam)
        mid = Vector((widest / 2, depth_total / 2 - 1.0, .4)); cam.location = mid + Vector((1.5, -max(widest, depth_total) * .95, max(widest, depth_total) * .62))
        cam.rotation_euler = (mid - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(widest, depth_total * 1.6) + 1.2
        scene.camera = cam; scene.render.resolution_x = 1800; scene.render.resolution_y = 1100; scene.render.resolution_percentage = 100
        scene.render.filepath = str(path); Path(path).parent.mkdir(parents=True, exist_ok=True); bpy.ops.render.render(write_still=True)
        print('[%s] proof -> %s' % (self.name, path))
