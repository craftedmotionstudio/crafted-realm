/* test_holm_skill_tools.js — headless gate for the skilling-tool + hold-orientation contract (owner play-test
 * 2026-09-25: "the hatchet is backwards"; "the net should be used in the fishing animation but must not be equipable").
 *  1. tools that are not weapons (small net, tinderbox, hammer, knife, fishing rods) have NO equip slot, and the
 *     only equip path in the pack click handler requires def.equip (no Wield option anywhere else);
 *  2. the hatchet / pickaxe keep their exact weapon + tool stats (combat and gathering math untouched);
 *  3. EquipBuilder: the axe edge rides DOWN in the idle hold, bows ride the LEFT hand near vertical;
 *  4. HolmSkillTools rules: action -> skill, best tool choice, item tool choice, every skill clip exists in the kit.
 * Run: node tools/test_holm_skill_tools.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m)}};

/* ---- 1 + 2: game data ---- */
const src=fs.readFileSync(path.join(ROOT,'src','game1_data.js'),'utf8');
const box={Math,console};box.globalThis=box;vm.createContext(box);
vm.runInContext(src+'\n;globalThis.__D={ITEMS};',box,{filename:'game1_data.js'});
const ITEMS=box.__D.ITEMS;
for(const id of ['fishing_net','tinderbox','hammer','knife','fishing_rod','fly_fishing_rod'])
  ok(ITEMS[id]&&!ITEMS[id].equip,id+' must exist and have no equip slot');
for(const [id,d] of Object.entries(ITEMS))
  if(d.tool&&!/^(woodcutting|mining)$/.test(String(d.tool)))ok(!d.equip,id+' is a non-weapon tool ('+d.tool+') but has equip:'+d.equip);
const LOCK={hatchet:{equip:'weapon',tool:'woodcutting',power:1.0,aBonus:1,sBonus:2,aStab:0,aSlash:1,aCrush:1,speedTicks:5},
  pickaxe:{equip:'weapon',tool:'mining',power:1.0,aBonus:1,sBonus:2,aStab:1,aSlash:0,aCrush:0,speedTicks:5},
  iron_hatchet:{power:1.45,aBonus:4,sBonus:5},iron_pickaxe:{power:1.45,aBonus:4,sBonus:5}};
for(const [id,want] of Object.entries(LOCK))for(const [k,v] of Object.entries(want))
  ok(ITEMS[id]&&ITEMS[id][k]===v,id+'.'+k+' must stay '+v+' (got '+(ITEMS[id]&&ITEMS[id][k])+')');
const ui=fs.readFileSync(path.join(ROOT,'src','game4_ui.js'),'utf8');
const eqAssign=ui.match(/Player\.equip\[slot\]=s\.id/g)||[];
ok(eqAssign.length===1,'exactly one pack->equip assignment in game4_ui.js (found '+eqAssign.length+')');
const at=ui.indexOf('Player.equip[slot]=s.id'),guard=ui.lastIndexOf('if(def.equip){',at);
ok(guard>0&&at-guard<600,'the pack->equip assignment sits inside if(def.equip){...}');
const menu=fs.readFileSync(path.join(ROOT,'src','inventory_menu.js'),'utf8');
ok(!/Wield|equip/i.test(menu),'the pack right-click menu offers no Wield/equip entry');

/* ---- 3: EquipBuilder hold specs (same basis math as solveQuaternion) ---- */
const eb=fs.readFileSync(path.join(ROOT,'src','equip_builder.js'),'utf8');
const win={};const ebox={window:win,console};vm.createContext(ebox);vm.runInContext(eb,ebox,{filename:'equip_builder.js'});
const S=win.EquipBuilder&&win.EquipBuilder.specs;ok(!!S,'EquipBuilder specs load');
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>a.map(x=>x*k);
const norm=a=>mul(a,1/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// world direction (character frame) of an item-local vector under a spec: basis(local) -> basis(world)
function worldOf(spec,v){
  const yW=norm(spec.neutral),xA=spec.rollAim,xW=norm(sub(xA,mul(yW,dot(xA,yW)))),zW=cross(xW,yW);
  const yl=norm(spec.axis),x0=spec.roll,xl=norm(sub(x0,mul(yl,dot(x0,yl)))),zl=cross(xl,yl);
  const a=dot(v,xl),b=dot(v,yl),c=dot(v,zl);return [xW[0]*a+yW[0]*b+zW[0]*c,xW[1]*a+yW[1]*b+zW[1]*c,xW[2]*a+yW[2]*b+zW[2]*c];
}
for(const m of ['axe','pick']){
  const head=worldOf(S[m],[0,1,0]),edge=worldOf(S[m],[1,0,0]);
  ok(head[2]>0.5&&head[1]<0,m+': head forward and down (got '+head.map(x=>x.toFixed(2))+')');
  ok(edge[1]<-0.5,m+': edge/pick faces the ground in the idle hold (got '+edge.map(x=>x.toFixed(2))+')');
}
for(const m of ['bow','longbow']){
  ok(win.EquipBuilder.handFor(m)==='LeftHand',m+' rides the left hand');
  const limb=worldOf(S[m],[0,1,0]),riser=worldOf(S[m],[1,0,0]);
  ok(Math.acos(Math.min(1,limb[1]))*180/Math.PI<=20,m+': limbs within 20 deg of vertical');
  ok(riser[2]>0.8,m+': riser faces forward');
}
ok(win.EquipBuilder.handFor('sword')==='RightHand'&&win.EquipBuilder.handFor('axe')==='RightHand','melee and tools stay in the right hand');
const sw=worldOf(S.sword,[0,-1,0]);ok(sw[2]>0.8&&sw[1]>0,'sword blade points forward and slightly up');
const fx=fs.readFileSync(path.join(ROOT,'src','fx_humanoid.js'),'utf8');
ok(/attach\('shield', onFore\?'LeftForeArm':'LeftHand'/.test(fx),'shield straps to the left forearm');
ok(/new THREE\.Vector3\(0\.94,0,0\.34\)/.test(fx)&&/new THREE\.Vector3\(0\.72,0,0\.69\)/.test(fx),'shield faces OUT (+X = the character\'s left)');

/* ---- 4: HolmSkillTools rules ---- */
const HST=require(path.join(ROOT,'src','holm_skill_tools.js'));
const act=(type,rt)=>({type,obj:{userData:{rtype:rt}}});
ok(HST.skillOfAction(act('gather','tree'))==='chop','tree -> chop');
ok(HST.skillOfAction(act('gather','rock'))==='mine','rock -> mine');
ok(HST.skillOfAction(act('gather','fish'))==='net','fish -> net');
ok(HST.skillOfAction({type:'lightfire'})==='firemake','lightfire -> firemake');
for(const t of ['cook','smith','smelt'])ok(HST.skillOfAction({type:t})===t,t+' -> '+t);
ok(HST.skillOfAction({type:'pickup'})===null&&HST.skillOfAction(null)===null,'no tool for non-skilling actions');
const inv=[{id:'iron_hatchet'},{id:'logs'},null,{id:'pickaxe'}];
ok(HST.bestToolId(ITEMS,inv,{weapon:'hatchet'},'woodcutting')==='iron_hatchet','best axe wins over the wielded bronze one');
ok(HST.bestToolId(ITEMS,[{id:'hatchet'}],{weapon:'hatchet'},'woodcutting')==='hatchet','an axe in hand or pack');
ok(HST.bestToolId(ITEMS,[],{weapon:'bronze_sword'},'mining')===null,'no pickaxe, no mining tool');
ok(HST.bestToolId(ITEMS,inv,{weapon:null},'mining')==='pickaxe','pickaxe from the pack');
const have=id=>['fishing_net','tinderbox','hammer','raw_perch','copper_ore','tin_ore','bread_dough','dough'].includes(id);
ok(HST.itemToolId('net','net',null,()=>1,have)==='fishing_net','the small net');
ok(HST.itemToolId('food','cook',null,id=>id==='raw_perch'?2:0,have)==='raw_perch','raw fish over the fire');
ok(HST.itemToolId('ore','smelt',{bar:'bronze_bar'},id=>id==='tin_ore'?1:0,have)==='tin_ore','the ore actually carried');
for(const [sk,s] of Object.entries(HST.SKILLS)){
  ok(!!HST.TOOLS[s.tool],sk+' names a tool');
  ok(Math.abs(dot(norm(s.axis),norm(s.rollAim)))<0.99,sk+' axis and roll are not parallel');
}
// every skill clip exists in the kit GLB (firemake may fall back to cook until it ships)
const glb=fs.readFileSync(path.join(ROOT,'assets','models','holm_kit_v2.glb'));
const doc=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
const clips=new Set((doc.animations||[]).map(a=>a.name));
for(const [sk,s] of Object.entries(HST.SKILLS))ok(s.clips.some(c=>clips.has(c)),sk+': a kit clip exists ('+s.clips.join('|')+')');

console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);
