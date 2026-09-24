"""Measured Studio placement; no live installation or terrain mutation."""
import json,math,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
b=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
model=ROOT/'.studio-workspaces/holm-kitchen-wings-v3/candidates/kitchen-character.glb'
assert hashlib.sha256(model.read_bytes()).hexdigest()=='630e893e3efd7138a5cc8219db2e6cc78b56c0787e87a3de62cbd9a9477bf172'
def height(x,z):
 ix=math.floor(x);iz=math.floor(z);fx=x-ix;fz=z-iz;w=b['width']+1
 a,bb,c,d=[b['heights'][i]for i in [iz*w+ix,iz*w+ix+1,(iz+1)*w+ix,(iz+1)*w+ix+1]]
 return a+fx*(bb-a)+fz*(c-a) if fx+fz<=1 else d+(1-fx)*(c-d)+(1-fz)*(bb-d)
rects={'main':[39,62,45,70],'pantry':[45,62,51,66],'entrance':[45,67.9,47,69.7]}
supports=[]
for name,(x0,z0,x1,z1)in rects.items():
 samples=[height(x0+i*.2,z0+j*.2)for i in range(round((x1-x0)/.2)+1)for j in range(round((z1-z0)/.2)+1)]
 assert min(samples)>=3.89 and max(samples)<=4.07,(name,min(samples),max(samples))
 supports.append({'id':name,'bounds':[x0,z0,x1,z1],'samples':len(samples),'min':min(samples),'max':max(samples)})
data={'schema':'holm-bakehouse-placement-v1','status':'unpublished Studio placement; no runtime interaction registration','world':{'x':44,'y':4.07,'z':67},'yaw':0,'modelSha256':hashlib.sha256(model.read_bytes()).hexdigest(),'supports':supports,'entranceWorld':{'x':45,'y':4.14,'z':68.8},'reason':'Three tiles west of concept center keeps both wings on dry terrace; actual terrain fits within the existing 0.18-thick foundation slabs at floor4.07. Creek banks are unchanged.'}
out=ROOT/'.studio-workspaces/holm-bakehouse-placement-v1/candidates';out.mkdir(parents=True,exist_ok=True);(out/'placement.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print('[BAKEHOUSE_PLACEMENT] PASS',json.dumps(data))
