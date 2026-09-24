'use strict';
// Draft-only compiler driver. Writes candidates; Studio CLI owns all staging/publication.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const plan=JSON.parse(fs.readFileSync(path.join(root,'docs/rebuild/holm-overhaul/plan.json'),'utf8'));
const arrival=JSON.parse(fs.readFileSync(path.join(root,'docs/rebuild/holm-overhaul/arrival-layout.json'),'utf8'));
const target=path.join(root,'.studio-workspaces/holm-overhaul-terrain-v1/candidates');
fs.mkdirSync(target,{recursive:true});
const water=[5.2,4.9,4.5,4.1,3.7,3.2,2.8,2.4,2,1.6,1.2,.8,.35,0];
const source={schema:'holm-overhaul-terrain-source-v1',version:1,width:144,depth:128,spacing:1,
  coast:plan.coast,
  shore:{beachWidth:3.5,shelfWidth:4},
  hills:[
    {x:36,z:36,rx:27,rz:34,height:7},
    {x:83,z:38,rx:32,rz:35,height:8},
    {x:118,z:27,rx:21,rz:24,height:14},
    {x:110,z:66,rx:22,rz:40,height:5.5},
    {x:54,z:76,rx:31,rz:42,height:3.5},
    {x:74,z:102,rx:22,rz:26,height:2.5}
  ],
  pads:plan.places.filter(b=>!['survival','ferry'].includes(b.id)).map(b=>({id:b.id,x:b.x,z:b.z,w:b.w+2,d:b.d+2,height:b.height,blend:5})),
  grades:[{halfWidth:arrival.approach.clearWidth/2,blend:3,points:arrival.approach.waypoints.map(([x,y,z])=>[x,z,y])}],
  creek:{points:plan.creek.map(([x,z],i)=>[x,z,water[i]]),halfWidth:1.2,bankWidth:2.5,depth:.8}
};
fs.writeFileSync(path.join(target,'holm-overhaul.terrain.json'),JSON.stringify(source,null,2)+'\n');
const compiler=require(path.join(root,'src/holm_overhaul_terrain.js'));
const bundle=compiler.compile(source);
fs.writeFileSync(path.join(target,'holm-overhaul.terrain.bundle.json'),JSON.stringify(bundle)+'\n');
console.log(JSON.stringify({candidateDirectory:target,stats:bundle.stats},null,2));
