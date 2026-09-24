'use strict';
// Design-only revision. No terrain, authored bundle or live placement is published.
const fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'../docs/rebuild/holm-overhaul/plan.json');
const p=JSON.parse(fs.readFileSync(file,'utf8'));
const rect=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
const round=(x,z,r)=>Array.from({length:8},(_,i)=>[+(x+Math.cos(i*Math.PI/4)*r).toFixed(2),+(z+Math.sin(i*Math.PI/4)*r).toFixed(2)]);
const v=(id,outline,levels,roof,material,use)=>({id,outline,levels,roof,material,use});
const refs='Bible_References/Complete/';
const designs={
 guide:{form:'Offset stone house with a projecting study and low chart-room wing',reference:refs+'Building_Exterior_Option2.jpg',volumes:[
  v('hearth-house',rect(-3,-5,7,10),2,'hip','stone','Entrance, hearth and upper sleeping room'),
  v('chart-wing',rect(-6,-5,3,6),1,'gable','stone','Connected orientation and provision room'),
  v('study-bay',[[1,1],[5,1],[6,2],[6,4],[5,5],[1,5]],2,'hip','plaster','Coast-facing study projecting from the main house')],
  character:'The lower west wing and chamfered east study break the current single roof slab. Ground-floor connections and an upper stair must be re-authored before replacement.'},
 survival:{form:'Open-sided crook-post shelter beside a separate tool store',reference:refs+'Building_Exterior_Option1.jpg',volumes:[
  v('teaching-canopy',[[-6,-4],[1,-4],[3,-2],[3,1],[-6,1]],1,'hip','thatch','Dry teaching bench and open circulation'),
  v('tool-store',rect(2,-4,4,4),1,'lean-to','timber','Lockable tools with a sheltered front'),
  v('covered-link',rect(0,-3,2,2),1,'lean-to','timber','Dry connection to the store')],
  character:'Open posts, a low store and a planted pond edge; the outdoor lesson space remains the dominant room.'},
 kitchen:{form:'L-shaped bakehouse and low perpendicular pantry around an entrance court',reference:refs+'Building_Exterior_Option2.jpg',volumes:[
  v('tall-bakehouse',rect(-5.5,-4,6,8),2,'gable','thatch','Oven, preparation room and sleeping loft'),
  v('pantry-wing',rect(.5,-4,5,4),1,'hip','thatch','Flour, water and bread storage connected to kitchen'),
  v('oven-breast',rect(-6.5,-2,1,3),1,'stone-cap','stone','Projecting oven and tall flue')],
  character:'A recessed southern court, a visible lower roof junction and one offset chimney. The two wings have different jobs and heights.'},
 quest:{form:'Jettied timber cross-wing lodge with a shallow polygonal reading bay',reference:'Bible_References/Town2.jpg',volumes:[
  v('road-hall',rect(-5,-2,10,6),1,'gable','timber','Public notice and hearth room'),
  v('guest-cross-wing',rect(-4,-4,4,8),2,'gable','plaster','Guest room above entrance and stair'),
  v('reading-bay',[[3,-2],[5,-2],[6,-1],[6,1],[5,2],[3,2]],1,'hip','plaster','Writing desk and light from three sides')],
  character:'A high cross-gable above a longer low hall; a supported upper overhang and projecting reading bay define the roadside silhouette.'},
 mine:{form:'Rock-cut portal with an offset winch tower and low smithy lean-to',reference:'Bible_References/Building Option 69.png',volumes:[
  v('portal-house',[[-5,-3],[1,-4],[3,-2],[3,2],[0,3],[-5,3]],1,'stone-cap','stone','Cave threshold and tool inspection'),
  v('winch-tower',rect(-5,-4,3,4),2,'gable','timber','Hoist and service loft'),
  v('work-lean-to',rect(2,-1,3,4),1,'lean-to','timber','Covered ore and repair bench')],
  character:'The rock face supplies the rear enclosure. The small high winch and low work roof frame the cave entrance.'},
 keep:{form:'Asymmetric open-court castle with projecting towers, great hall and gatehouse',reference:refs+'Building_Exterior_Option4.jpg',volumes:[
  v('great-hall',rect(-10,-9,7,15),2,'gable','stone','Teaching hall, armoury and upper guard chamber'),
  v('north-range',rect(-3,-9,11,4),1,'gable','stone','Connected service and stores'),
  v('east-wall',rect(7,-5,2,12),1,'battlement','stone','Accessible wall walk'),
  v('gatehouse',rect(-1,5,6,5),2,'battlement','stone','Gate passage into the open court'),
  v('west-curtain',rect(-3,5,2,2),1,'battlement','stone','Hall-to-gate connection'),
  v('east-curtain',rect(5,5,2,2),1,'battlement','stone','Gate-to-wall connection'),
  v('high-watchtower',round(-7,-7,4),3,'battlement','stone','Highest inhabited lookout with real stairs'),
  v('east-turret',round(8,-7,3),2,'battlement','stone','Smaller projecting guard tower'),
  v('stair-turret',round(-7,5,2.8),2,'cone','stone','Hall stair connected to wall walk')],
  character:'Unequal projecting towers and connected ranges leave a real open courtyard. Tall hall, low service roof and stepped battlements replace the perfect square perimeter.'},
 bank:{form:'Chamfered counting hall with projecting upper clerk room and rear vault',reference:refs+'Building_Exterior_Option3.jpg',volumes:[
  v('counting-hall',[[-5.5,-2],[-3.5,-4],[3.5,-4],[5.5,-2],[5.5,2],[3.5,4],[-5.5,4]],1,'hip','plaster','Teller, deposit/withdraw and goods counter'),
  v('clerk-cross-wing',rect(-5.5,-4,4,8),2,'gable','timber','Upper clerk room and stair'),
  v('vault',rect(1.5,-5,4,3),1,'lean-to','stone','Secure vault behind counter')],
  character:'A clipped corner faces the lane, the clerk wing rises above it and a low vault projects behind.'},
 mage:{form:'Octagonal observatory joined to a crooked-roof study wing',reference:refs+'Building_Exterior_Option1.jpg',volumes:[
  v('observatory',round(2,-1,4),3,'cone','stone','Rune room, library and upper observatory'),
  v('study-wing',rect(-6,-2,5,6),1,'hip','timber','Friendly tutor workroom facing practice garden'),
  v('link',rect(-2,-1,2,3),1,'lean-to','stone','Covered internal stair connection')],
  character:'The round/octagonal tower and low inhabited wing have distinct roof heights; the practice yard stays open and readable.'},
 lastlight:{form:'Tapered coastal beacon with a keeper’s wing at its foot',reference:'Bible_References/Lighthouse_Ref1.png',volumes:[
  v('beacon',round(1,-1,3.8),4,'lantern','stone','Stores, keeper room and playable lantern deck'),
  v('keeper-wing',rect(-5,-1,4,5),1,'hip','stone','Storm entrance and connected repair stores')],
  character:'Tall tapered silhouette, projecting lantern gallery and low sheltered entry. Existing functional floor ideas remain, not automatic mesh acceptance.'},
 landing:{form:'Narrow working pier with an offset cargo apron',reference:'Bible_References/A_Tutorial_Island_Option.jpg',volumes:[v('pier',rect(-1.7,-2.5,3.4,5),1,'open','timber','Arrival and mooring'),v('cargo-apron',rect(1.7,-2.5,2.3,2),1,'open','timber','Supply handling')],character:'An asymmetric working landing, not a house-shaped marker.'},
 ferry:{form:'Long pier and a hipped waiting shelter set to one side',reference:'Bible_References/A_Tutorial_Island_Option.jpg',volumes:[v('pier',rect(-1.5,-3,3,6),1,'open','timber','Boarding route'),v('waiting-shelter',rect(1.5,-3,3,3),1,'hip','thatch','Sheltered seats with sight of the boat')],character:'Keep the boarding lane open; shelter and mooring describe different uses.'}
};
p.architectureRevision='2026-09-13-varied-wings';
p.materialDirection={reference:'Bible_References/Landscape_Option.jpg',text:'Match the references through original low-resolution material textures: mottled grey fieldstone with subdued mortar, cream plaster, ochre directional thatch, dark warm timber, olive foliage and muted blue-grey water. Terrain uses broad green/brown transitions and sloping banks, not a visible square grid or uniform flat fill. No extracted OSRS texture bytes.',remaining:'Textures, vegetation, shoreline and every building require actual Studio/game comparison; this plan is not visual acceptance.'};
for(const b of p.places){if(!designs[b.id])throw Error('Missing architecture '+b.id);b.architecture=designs[b.id];}
fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n','utf8');
console.log('Revised '+p.places.length+' design footprints; no live world changes.');
