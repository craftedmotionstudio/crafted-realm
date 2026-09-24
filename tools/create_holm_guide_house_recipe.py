"""Create the new overhaul recipe, never an approval record."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
aid='holm_guide_house_overhaul_v1'
proof=f'scratchpad/{aid}'
candidate=f'.studio-workspaces/holm-guide-house-overhaul-v1/candidates/{aid}'
manifest={'schemaVersion':1,'assetId':aid,'assetClass':'building','unitsPerTile':1,
 'builder':f'tools/blender/build_{aid}.py','source':candidate+'.blend','model':candidate+'.glb',
 'authoringReport':proof+'/asset_report.json','pipelineResult':proof+'/pipeline_result.json',
 'previews':[proof+'/'+n+'.png' for n in ['scale','shaded','clay','wireframe','gameplay']],
 'requiredNodes':['GuideHouse','GroundShell','UpperShell','Roof','GroundFloor','UpperFloor','StairFlight'],
 'requiredAnimations':[], 'budgets':{'maxFileBytes':4000000,'maxTriangles':30000,'maxPrimitives':60,'maxMaterials':24}}
checks=[('width','dimensionsTiles.width',12,13.5),('depth','dimensionsTiles.depth',10,13),('height','dimensionsTiles.height',7,9),('door width','humanScaleContract.doorWidth',1.6,1.7),('door height','humanScaleContract.doorHeight',2.3,2.4),('upper floor','humanScaleContract.upperFloorY',2.8,2.8)]
recipe={'schemaVersion':3,'assetId':aid,'displayName':'Bram’s Guide House','status':'source-unapproved',
 'gameplayRole':'Orientation downstairs; a usable study and sleeping room upstairs, reached by actual stairs.',
 'manifestPath':f'assets/manifests/{aid}.json','catalogPath':f'assets/catalogs/{aid}.json','briefPath':proof+'/asset_factory_brief.md','factoryResult':proof+'/factory_result.json',
 'concept':{'image':'Bible_References/Tutorial_Island_Building.jpg','prompt':'docs/rebuild/holm-overhaul/guide-house-design.md','styleStandard':'docs/rebuild/ART_PRODUCTION_PIPELINE.md'},
 'scale':{'referenceHeightTiles':1.9,'fixture':'One tile grid and canonical player beside south door','checks':[{'label':n,'reportPath':p,'min':a,'max':b} for n,p,a,b in checks]},
 'proof':{'minimumCodexScore':9,'comparisonConfig':proof+'/compare.json','order':['Scale and silhouette','Openings, fitted stairs and floor cutaway','Stone construction and roof hierarchy','Furnishings and warm materials','Cardinal installed contacts in open/closed poses','Real pointer upstairs traversal and smoke'],
 'cardinalTurnaround':{k:proof+'/'+k+('.json' if k=='review' else '.png') for k in ['north','south','east','west','sheet','review']}},
 'manifest':manifest,'integration':{'layout':'docs/rebuild/holm-overhaul/arrival-layout.json','collision':'Authored walls, stair surfaces and upper-floor opening; no live collision proof yet','interactions':'Study chart, speak to Bram, enter/exit and climb stairs','requiredProof':[proof+'/real_upstairs.png',proof+'/real_arrival.png']}}
for rel,data in [(f'assets/recipes/{aid}.json',recipe),(f'assets/catalogs/{aid}.json',{'assetId':aid,'status':'source-unapproved','source':manifest['source'],'model':manifest['model'],'reference':recipe['concept']['image'],'provenance':'Original authored topology, reference-informed; not copied game assets'})]:
 p=root/rel
 if p.exists():raise RuntimeError('Refusing to overwrite '+str(p))
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,indent=2)+'\n')
