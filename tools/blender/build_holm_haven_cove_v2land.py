"""The departure haven at Lanternfoot Cove (Tutor's Holm v2 land, phase 4, 2026-09-26). Owner decision (WORLD_GOAL W0b):
the departure haven moves from the south-east shore to the north-coast cove below Lastlight, at the foot of the Keeper's
Stair, so the beacon finale walks straight down to the skiff; the old site becomes Haycombe Farm. The v1 haven recipe
(build_holm_haven_v1.py, never edited) runs with these swaps, the relock technique: the pad centre is world (101, 14) on
the cove pad (y 1.0), the terrain is the v2 land, and the whole haven turns 90 degrees so its pier runs NORTH into the
sea toward the mainland (local +x -> world -z; every terrain sample it takes follows the turn, so its abutment, pier legs
and landing stage fit the cove). The runtime needs no rotation support: the turn is baked into the GLB's root.
Output: .studio-workspaces/holm-haven-v2land-v1. Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_haven_cove_v2land.py"""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/blender/build_holm_haven_v1.py'
src = SRC.read_text(encoding='utf-8-sig')
def swap(a, b):
    global src
    assert a in src, 'swap not found: ' + a[:80]
    src = src.replace(a, b, 1)
swap("OUT=ROOT/'.studio-workspaces/holm-haven-v1/candidates'", "OUT=ROOT/'.studio-workspaces/holm-haven-v2land-v1/candidates'")
swap("PROOF=ROOT/'scratchpad/holm_haven_v1'", "PROOF=ROOT/'scratchpad/holm_v2_land/haven_cove'")
swap("PLACE=[p for p in PLAN['places'] if p['id']=='ferry'][0];PX,PZ=PLACE['x'],PLACE['z']", "PX,PZ=101,14   # Lanternfoot Cove (v2 land)")
swap("TER=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())",
     "TER=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())")
# the turn: local (x, z) -> world (PX + z, PZ - x)
swap("PAD=[world_ground(PX+x+.5,PZ+z+.5) for x in range(-3,6) for z in range(-6,2)]", "PAD=[world_ground(PX+z+.5,PZ-x-.5) for x in range(-3,6) for z in range(-6,2)]")
swap("PY=round(sum(PAD)/len(PAD),2)", "PY=1.0   # the cove pad")
swap("def ground(x,z):return world_ground(PX+x,PZ+z)-PY", "def ground(x,z):return world_ground(PX+z,PZ-x)-PY")
swap("def wet(x,z):return TER['water'][int(math.floor(PZ+z))*TW+int(math.floor(PX+x))]!=0",
     "def wet(x,z):\n wx,wz=PX+z,PZ-x\n if wz<0 or wz>=TER['depth'] or wx<0 or wx>=TW:return True\n return TER['water'][int(math.floor(wz))*TW+int(math.floor(wx))]!=0")
swap("bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'haven.blend'))",
     "_r=bpy.data.objects.get('Haven_Root');assert _r,'no Haven_Root';_r.rotation_euler.z+=math.pi/2;bpy.context.view_layer.update()\nbpy.ops.wm.save_as_mainfile(filepath=str(OUT/'haven.blend'))")
exec(compile(src, str(SRC), 'exec'), {'__name__': '__main__', '__file__': str(SRC)})
