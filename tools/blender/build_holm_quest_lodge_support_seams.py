"""Rebuild lodge with physically overlapping support seams; keeps v1 frozen."""
from pathlib import Path
import hashlib
SOURCE=Path(__file__).with_name('build_holm_quest_lodge_study.py')
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()=='9568be044fb0c91e70c75ea7abb70eb1dceef5087cc31835992b132a35f8cee1','Base lodge authoring source drifted'
s=SOURCE.read_text(encoding='utf-8')
assert "holm-quest-lodge-v1" in s
s=s.replace('holm-quest-lodge-v1','holm-quest-lodge-v2')
a="bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s;"
b="if g in ('GroundFloor','UpperFloor'): s=(s[0]+.002,s[1]+.002,s[2])\n bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s;"
assert a in s;s=s.replace(a,b,1)
a="(1.6,.28,.2),wood)";assert a in s;s=s.replace(a,"(1.6,.282,.2),wood)",1)
# Preserve a cardinal aisle beside the bed, desk and bench in the narrow wing.
for a,b in [
 ("(-4.15,-2.1,3.65),(1.5,2.3,.55)","(-4.6,-2.1,3.65),(.9,2.3,.55)"),
 ("(-4.15,-2.1,3.98),(1.4,2.15,.2)","(-4.6,-2.1,3.98),(.85,2.15,.2)"),
 ("(-4.15,-2.8,4.12),(1.1,.5,.2)","(-4.6,-2.8,4.12),(.7,.5,.2)"),
 ("table(-3.95,2.7,4.2,2.1,1,","table(-4.65,2.65,4.2,.75,1.6,"),
 ("(-3.95,2.7,4.29),(.7,.5,.035)","(-4.65,2.65,4.29),(.6,.8,.035)"),
 ("(-3.95,1.8,3.75),(1.5,.42,.15)","(-4.65,1.2,3.75),(.7,.42,.15)"),
 ("for x in [-4.45,-3.45]:box('UpperFurnishing',(x,1.8,3.49)","for x in [-4.9,-4.4]:box('UpperFurnishing',(x,1.2,3.49)")]:
 assert a in s,a
 s=s.replace(a,b,1)
exec(compile(s,str(SOURCE),'exec'),{'__file__':str(SOURCE),'__name__':'__main__'})
import json
contract_path=SOURCE.parents[2]/'.studio-workspaces/holm-quest-lodge-v2/candidates/contract.json'
contract=json.loads(contract_path.read_text(encoding='utf-8'))
contract['circulationRepair']={'floorSlabXYExtension':.002,'treadDepth':.282,'treadRunUnchanged':.28,
 'guestFurniture':'Narrower bed and wall-side desk/bench leave x=-3.5 cardinal aisle.',
 'baseSourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()}
contract_path.write_text(json.dumps(contract,indent=2),encoding='utf-8')
