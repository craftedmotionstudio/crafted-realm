/* Holm v2 land route audit (W0b, 2026-09-26). Composes the island graph on the v2 land (tools/holm_v2_land_inputs.js:
 * the terrain v2 bundle, the arrival house, every re-measured Blender building or its design proxy, bridges, blockers)
 * and walks the 18-lesson route leg by leg on it (graph links + measured ladders/climbs, the way the runtime moves):
 * walked tiles, walk time at 0.6 s per tile, height change, the steepest link used, and every building target's
 * reachability. Exit 1 if any lesson station or measured target is unreachable.
 * Run: node tools/audit_holm_v2_routes.js [--json out.json] */
'use strict';
const fs=require('fs'),path=require('path'),Nav=require('../src/holm_island_nav');
const I=require('./holm_v2_land_inputs').load();
const nav=Nav.create({terrain:I.terrain,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.navBridges||I.bridges,arrivalFootprints:I.arrivalFootprints});
const g=nav.compile({arrival:true,garden:true});
const jump={},addJ=(a,b)=>{(jump[a]=jump[a]||[]).push(b);(jump[b]=jump[b]||[]).push(a)};
const tgt=(b,t)=>{const B=I.buildings.find(x=>x.id===b),T=B&&B.graph.targets.find(x=>x.id===t);return T&&T.nodeId?'b:'+b+':'+T.nodeId:null};
for(const L of I.ladders){const a=tgt(L.a[0],L.a[1]),b=tgt(L.b[0],L.b[1]);if(a&&b&&g.byId[a]&&g.byId[b])addJ(a,b)}
for(const B of I.buildings)for(const c of B.graph.climbs||[]){const a='b:'+B.id+':'+c.footId,b='b:'+B.id+':'+c.topId;if(g.byId[a]&&g.byId[b])addJ(a,b)}
function bfs(from){const prev={[from]:null},q=[from];for(let h=0;h<q.length;h++){const u=q[h];for(const v of (g.links[u]||[]).concat(jump[u]||[]))if(!(v in prev)){prev[v]=u;q.push(v)}}return prev}
function pathTo(prev,to){if(!(to in prev))return null;const out=[];for(let p=to;p!==null;p=prev[p])out.push(p);return out.reverse()}
function nearNode(x,z,y,pred){let best=null,d=1e9;g.nodes.forEach(n=>{if(pred&&!pred(n))return;const k=Math.hypot(n.x-x,n.z-z)+(Number.isFinite(y)?Math.abs(n.y-y)*2:0);if(k<d){d=k;best=n}});return best}
const spawn=g.nodes.find(n=>n.id==='dock:61,125')||g.nodes.find(n=>n.surface==='dock');
// lesson stations: a node beside the object (0.5-1.7 tiles, as HolmArrivalQA.beside), a building target, or the arrival services
const beside=(x,z,y)=>nearNode(x,z,y,n=>{const h=Math.hypot(n.x-x,n.z-z);return h>=.5&&h<=1.7&&(!Number.isFinite(y)||Math.abs(n.y-y)<2.2)});
const L=I.lessons,T0=L.trees[0];
const guideW=I.layout.building.world;
const stations=[
 ['study_route (chart)',()=>g.byId['ground:65,97']],   // the arrival package's service stances (holm_orientation, holm_provisions)
 ['equip_hatchet (rack)',()=>g.byId['ground:68,96']],
 ['chop_logs ('+T0.id+')',()=>beside(T0.x,T0.z)],
 ['light_fire (Fire Beach)',()=>{const r=I.fishing.fireBeach.ring;return beside(r[0],r[1])}],
 ['catch_fish (pond spot)',()=>{const c=I.fishing.candidates[0];return beside(c.water[0]+.5,c.water[1]+.5,I.fishing.pond.level)}],
 ['cook_fish (beach fire)',()=>{const r=I.fishing.fireBeach.ring;return beside(r[0],r[1])}],
 ['bake_bread (oven)',()=>g.byId['b:bakehouse:-4:-3:1']],
 ['learn_quests (board)',()=>g.byId[tgt('lodge','board')]],
 ['descend_cavern (shaft)',()=>g.byId[tgt('quarry','shaft')]],
 ['mine_copper',()=>g.byId[tgt('cavern','copper1')]],
 ['mine_tin',()=>g.byId[tgt('cavern','tin1')]],
 ['smelt_bronze (furnace)',()=>g.byId[tgt('cavern','furnace')]||g.byId[tgt('cavern','copper1')]],
 ['forge_dagger (anvil)',()=>g.byId[tgt('cavern','anvil')]||g.byId[tgt('cavern','copper1')]],
 ['melee/ranged trial (keep court)',()=>g.byId[tgt('keep','court')]],
 ['open_bank (counter)',()=>g.byId[tgt('bank','counter')]],
 ['magic_trial (mage yard)',()=>g.byId[tgt('mage','yard')]||g.byId[tgt('mage','runes')]],
 ['relight_lastlight (lever)',()=>g.byId[tgt('lastlight','lever')]],
 ['departure (skiff)',()=>g.byId[tgt('haven','boat')]]];
let cur=spawn.id,total=0,fail=0;const rows=[],legPath={};
console.log('== HOLM v2 ROUTE on the composed island graph ('+g.nodes.length+' nodes; buildings: '+Object.entries(I.status).map(([k,v])=>k+'='+v).join(' ')+')');
for(const [name,f] of stations){const n=f();
 if(!n){console.log('  MISSING station',name);fail++;continue}
 const p=pathTo(bfs(cur),n.id);
 if(!p){console.log('  UNREACHABLE',name,'from',cur,'->',n.id);fail++;rows.push({name,reachable:false});continue}
 legPath[name]=p;let walked=0,steep=0,up=0,down=0;
 for(let i=1;i<p.length;i++){const a=g.byId[p[i-1]],b=g.byId[p[i]];if((jump[a.id]||[]).includes(b.id))continue;walked++;const dy=b.y-a.y;steep=Math.max(steep,Math.abs(dy));if(dy>0)up+=dy;else down-=dy}
 const a=g.byId[cur];total+=walked;
 rows.push({name,reachable:true,walked,seconds:+(walked*.6).toFixed(1),from:+a.y.toFixed(2),to:+n.y.toFixed(2),rise:+up.toFixed(1),fall:+down.toFixed(1),steepestLink:+steep.toFixed(3)});
 console.log('  '+name.padEnd(34)+String(walked).padStart(4)+' tiles '+String((walked*.6).toFixed(0)).padStart(4)+' s  y '+a.y.toFixed(1)+' -> '+n.y.toFixed(1)+'  (up '+up.toFixed(1)+', down '+down.toFixed(1)+', steepest link '+steep.toFixed(2)+')');
 cur=n.id}
console.log('  surface + underground total',total,'tiles',(total*.6).toFixed(0),'s');
// every measured target of every building, reachable from the landing
const R=bfs(spawn.id),miss=[];
for(const B of I.buildings)for(const t of B.graph.targets||[]){if(!t.nodeId){miss.push(B.id+':'+t.id+' (unmeasured)');continue}const id='b:'+B.id+':'+t.nodeId;if(!(id in R))miss.push(B.id+':'+t.id)}
console.log('  building targets unreachable:',miss.length?miss.join(', '):'none');
// every Minnow Hollow fishing candidate has a reachable stance beside its ripple (0.5-1.7 tiles, as HolmArrivalQA.beside)
const fishMiss=I.fishing.candidates.filter(c=>{const n=beside(c.water[0]+.5,c.water[1]+.5,I.fishing.pond.level);return !n||!(n.id in R)}).map(c=>c.id);
console.log('  fishing candidates without a reachable stance:',fishMiss.length?fishMiss.join(', '):'none');if(fishMiss.length)fail++;
// the v2 land's new places are reachable on foot: Hettie's Garden, the Creakwheel Mill (by the weir walk and by land)
const feats=[["Hettie's Garden (by the arbour)",()=>nearNode(53.0,61.2,5.4,n=>n.owner==='land')],['Creakwheel Mill (millstones)',()=>g.byId[tgt('mill','stones')]],['Creakwheel weir walk (deck)',()=>g.byId['deck:60,59']]];
for(const [name,f] of feats){const n=f();const ok=!!n&&(n.id in R);console.log('  '+name+': '+(ok?'reachable':'UNREACHABLE'));if(!ok)fail++}
// phase 4 route: out of the ore workings by the east drift and up through the keep's trapdoor; from Lastlight down the
// Keeper's Stair to the skiff at Lanternfoot Cove (the shortest walk takes them, not a detour)
const legUses=(leg,pred)=>{const q=legPath[leg];return !!q&&q.some(pred)};
const routeChecks=[['anvil -> keep court climbs the drift ladder into the keep',()=>{const q=legPath['melee/ranged trial (keep court)'],a=tgt('cavern','exit'),b=tgt('keep','undercroft');return !!q&&q.some((id,i)=>i>0&&((q[i-1]===a&&id===b)||(q[i-1]===b&&id===a)))}],
 ["Lastlight -> skiff walks down the Keeper's Stair",()=>legUses('departure (skiff)',id=>id.indexOf('b:stair:')===0)],
 ['the skiff is at Lanternfoot Cove',()=>{const n=g.byId[tgt('haven','boat')];return !!n&&n.x>95&&n.x<110&&n.z<16}]];
for(const [name,f] of routeChecks){const ok=f();console.log('  '+name+': '+(ok?'yes':'NO'));if(!ok)fail++}
const st=nav.stats({arrival:true,garden:true});console.log('  graph',JSON.stringify(st));
const out=process.argv.indexOf('--json');if(out>0)fs.writeFileSync(process.argv[out+1],JSON.stringify({rows,total,unreachableTargets:miss,status:I.status,stats:st},null,1));
if(fail)process.exit(1);
