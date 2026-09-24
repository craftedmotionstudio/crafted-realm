"""Compile explicit ingredient-station stances from the measured bakehouse graph."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NAV=ROOT/'.studio-workspaces/holm-kitchen-navigation-v3/candidates/navigation.json'
OUT=ROOT/'.studio-workspaces/holm-kitchen-services-v1/candidates'
def compile_services():
 nav=json.loads(NAV.read_text(encoding='utf-8'));nodes=nav['nodes'];links=nav['links'];seen={nav['startId']};pending=list(seen)
 while pending:
  for key in links[pending.pop()]:
   if key not in seen:seen.add(key);pending.append(key)
 specs=[('buckets','Bucket rack','holm_bucket_shelf',[4.5,0,-2.5],['Take','Return bucket']),('flour','Flour sacks','holm_flour_bin',[2.5,0,-2.5],['Fill bucket']),('water','Water butt','holm_water_butt',[4.5,0,-2.5],['Fill bucket']),('dough','Proving bowl','holm_dough_trough',[-3.5,0,.5],['Take dough']),('oven','Bread oven','holm_kitchen_range',[-2.5,0,-1.5],['Cook','Study'])]
 rows=[]
 for ident,label,kind,p,actions in specs:
  matches=[n for n in nodes if abs(n['x']-p[0])<1e-5 and abs(n['y']-p[1])<1e-4 and abs(n['z']-p[2])<1e-5 and n['id']in seen]
  assert len(matches)==1,(ident,'authored stance not uniquely reachable')
  n=matches[0];rows.append({'id':ident,'label':label,'kind':kind,'nodeId':n['id'],'tile':{'x':n['x'],'y':n['y'],'z':n['z'],'plane':0},'actions':actions,'acceptsUseItem':ident=='oven'})
 data={'schema':'holm-bakehouse-services-v1','status':'Measured Studio station data; runtime handlers not installed','modelSha256':nav['modelSha256'],'navigationSha256':hashlib.sha256(NAV.read_bytes()).hexdigest(),'placement':nav['placement'],'stations':rows,'recipe':{'inputs':{'bucket_flour':1,'bucket_water':1,'dough':1},'mixedItem':'bread_dough','bakedItem':'bread','baseCookingXp':40,'event':['bake','bread']},'limitations':['Reachable stance does not prove service line of sight or item conversion.','The existing recipe module remains authoritative; this data does not grant inventory or lesson credit.']}
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'services.json').write_text(json.dumps(data,indent=2),encoding='utf-8');print('[KITCHEN_SERVICES] PASS',len(rows),'exact reachable ground-floor stances')
if __name__=='__main__':compile_services()
