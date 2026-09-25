/* ================= HOLM SKILL TOOLS (owner play-test 2026-09-25) =================
 * OSRS rule: while a skilling action runs, the character puts the weapon and shield away and works with that
 * skill's TOOL in the right hand (the hatchet at a tree, the pickaxe at a rock, the small net at the fishing spot,
 * the tinderbox at the logs, the food over the fire, the hammer at the anvil, the ore at the furnace), then the weapon
 * comes back. Presentation only: nothing here equips, moves or consumes an item. Tools are never wieldable; the net,
 * tinderbox and hammer have no equip slot in ITEMS, and this module only borrows their models.
 *
 * Models: axes / pickaxes are the Blender equipment kinds (src/holm_equipment.js, grip frame, tier recoloured);
 * the net, tinderbox, hammer, fish and ore are the Blender item pack (src/holm_items_v1.js via itemGroundMesh).
 *
 * Grip (EquipBuilder method, applied per clip): each skill names the kit clip that performs it and a REFERENCE frame
 * (the strike / scoop / hold). At that frame the tool must point along `axis` with its `roll` side toward `rollAim`
 * (character frame: +X = the character's left, +Y up, +Z forward), gripped at its grip point in the palm. The hand's
 * orientation at the reference frame is read from the clip's own keyframe tracks (no mixer state is touched), the tool
 * is parented to the hand bone once, and it then follows the whole clip. New clips (the coming 'firemake') are picked
 * up by name.
 * QA: HolmSkillTools.status(). */
var HolmSkillTools=(function(){
 'use strict';
 var FPS=24;
 // skill: clips (first found wins), reference frame, tool key, world directions at the reference frame
 var SKILLS={
  chop:    {clips:['chop'],ref:10,tool:'axe',  axis:[0.2,-0.2,0.96], rollAim:[1,0,0]},     // haft at the trunk, edge biting sideways
  mine:    {clips:['mine'],ref:11,tool:'pick', axis:[0,-0.35,0.94],  rollAim:[0,1,0]},     // haft forward-down, lower pick into the rock
  net:     {clips:['net'],ref:24,tool:'net',   axis:[0,-0.55,0.84],  rollAim:[0,1,0]},     // handle down into the water, hoop scooping flat
  firemake:{clips:['firemake','cook'],ref:9,tool:'tinderbox',axis:[1,0,0],rollAim:[0,1,0]}, // box across the fist, lid up
  cook:    {clips:['cook'],ref:9,tool:'food',  axis:[0,-0.3,0.95],   rollAim:[0,1,0]},     // held by the tail over the fire
  smith:   {clips:['smith'],ref:10,tool:'hammer',axis:[0,-0.1,1],    rollAim:[0,-1,0]},    // head forward, face down on the anvil
  smelt:   {clips:['smelt'],ref:14,tool:'ore', axis:[1,0,0],         rollAim:[0,1,0]}      // a lump of ore in the fist
 };
 // tool: where the model comes from and its own frame (mesh-local, glTF): grip point, long axis, roll side
 var TOOLS={
  axe:      {from:'equip',skill:'woodcutting',grip:[0,-0.10,0],axis:[0,1,0],roll:[1,0,0]},   // head +Y, edge +X
  pick:     {from:'equip',skill:'mining',     grip:[0,-0.10,0],axis:[0,1,0],roll:[1,0,0]},   // head +Y, picks +-X
  net:      {from:'item',ids:['fishing_net'],gripU:0.14,axis:[1,0,0],roll:[0,1,0]},          // handle -> hoop +X, hoop normal +Y
  tinderbox:{from:'item',ids:['tinderbox'],  gripU:0.5, axis:[1,0,0],roll:[0,1,0]},
  food:     {from:'item',ids:['raw_perch','bread_dough','dough'],gripU:0.16,axis:[1,0,0],roll:[0,1,0]},   // tail -> snout +X, flank +Y
  hammer:   {from:'item',ids:['hammer'],     gripU:0.16,axis:[1,0,0],roll:[0,0,1]},          // handle -> head +X, striking face +Z
  ore:      {from:'item',ids:['copper_ore','tin_ore'],gripU:0.5,axis:[1,0,0],roll:[0,1,0]}
 };
 var CLIP_SKILL={chop:'chop',mine:'mine',net:'net',firemake:'firemake',cook:'cook',smith:'smith',smelt:'smelt'};
 var PALM=0.085;
 var st={cur:null,hidden:[],cache:{},tick:0};

 /* ---- pure rules (unit-tested in tools/test_holm_skill_tools.js) ---- */
 function skillOfAction(a){
  if(!a)return null;
  if(a.type==='gather'){var r=a.obj&&a.obj.userData&&a.obj.userData.rtype;return r==='tree'?'chop':r==='rock'?'mine':r==='fish'?'net':null}
  if(a.type==='lightfire')return 'firemake';
  if(a.type==='cook'||a.type==='smith'||a.type==='smelt')return a.type;
  return null;
 }
 // OSRS shows the best tool you carry for the skill: wielded or in the pack, highest power wins (ties: wielded)
 function bestToolId(items,inv,equip,skill){
  var best=null,bp=-1,scan=function(id,bonus){var d=id&&items[id];if(!d||d.tool!==skill)return;var p=(d.power||0)+bonus;if(p>bp){bp=p;best=id}};
  scan(equip&&equip.weapon,1e-6);(inv||[]).forEach(function(s){if(s)scan(s.id,0)});return best;
 }
 function itemToolId(tool,skill,action,count,has){
  var ids=TOOLS[tool].ids.slice();
  if(tool==='ore'&&action&&action.bar&&typeof SMELTS!=='undefined'&&SMELTS[action.bar])ids=Object.keys(SMELTS[action.bar].needs).concat(ids);
  for(var i=0;i<ids.length;i++)if(has(ids[i])&&(tool!=='food'&&tool!=='ore'||count(ids[i])>0))return ids[i];
  for(var j=0;j<ids.length;j++)if(has(ids[j]))return ids[j];
  return null;
 }

 /* ---- three.js side ---- */
 function V(a){return new THREE.Vector3(a[0],a[1],a[2])}
 function bone(rig,name){var f=null;rig.traverse(function(o){if(!f&&(o.isBone||o.type==='Bone')&&String(o.name).replace(/^mixamorig[:_]?/,'')===name)f=o});return f}
 function basis(axis,roll){var y=V(axis).normalize(),x0=V(roll),x=x0.sub(y.clone().multiplyScalar(x0.dot(y))).normalize(),z=new THREE.Vector3().crossVectors(x,y);
  return new THREE.Matrix4().makeBasis(x,y,z)}
 // hand rotation relative to the rig root (= the character frame) at clip time t, from the clip's own tracks
 function handAt(rig,hand,clip,t){
  var tracks={};clip.tracks.forEach(function(tr){tracks[tr.name]=tr});
  var chain=[];for(var n=hand;n&&n!==rig;n=n.parent)chain.push(n);
  var q=new THREE.Quaternion();
  for(var i=chain.length-1;i>=0;i--){var nd=chain[i],tr=tracks[nd.name+'.quaternion'];
   if(tr){var v=tr.createInterpolant().evaluate(Math.min(t,clip.duration));q.multiply(new THREE.Quaternion(v[0],v[1],v[2],v[3]).normalize())}
   else q.multiply(nd.quaternion)}
  return q;
 }
 function clipFor(gm,skill){var s=SKILLS[skill];for(var i=0;i<s.clips.length;i++){var a=gm&&gm.clips&&gm.clips[s.clips[i]];if(a)return a}return null}
 function toolMesh(tool,id,metal){
  var T=TOOLS[tool],m=null;
  if(T.from==='equip'){if(typeof HolmEquipment!=='undefined')m=HolmEquipment.itemMesh(id);if(m)m.userData.gripLocal=V(T.grip)}
  else if(typeof itemGroundMesh==='function'){
   var g=itemGroundMesh(id);if(!g||g.userData.holmItem!==id||!g.children[0])return null;   // only the Blender item, never a stand-in
   m=g.children[0];g.remove(m);m.position.set(0,0,0);m.rotation.set(0,0,0);m.updateMatrixWorld(true);
   var b=new THREE.Box3().setFromObject(m),c=b.getCenter(new THREE.Vector3());
   m.userData.gripLocal=new THREE.Vector3(b.min.x+(b.max.x-b.min.x)*T.gripU,c.y,c.z);
  }
  if(m){m.name='holm-skill-tool-'+id;m.traverse(function(o){if(o.isMesh)o.castShadow=true})}
  return m;
 }
 // hand-local rotation for (skill, clip, tool) on this rig, solved once at the clip's reference frame
 function gripQuat(rig,hand,skill,clip){
  var key=rig.uuid+'|'+skill+'|'+clip.name;if(st.cache[key])return st.cache[key];
  var S=SKILLS[skill],T=TOOLS[S.tool];
  var qHand=handAt(rig,hand,clip,S.ref/FPS);
  var world=basis(S.axis,S.rollAim),local=basis(T.axis,T.roll);
  var qTool=new THREE.Quaternion().setFromRotationMatrix(world.multiply(local.invert()));
  return (st.cache[key]=qHand.invert().multiply(qTool));
 }
 function wanted(){
  if(typeof player==='undefined'||!player||!player.userData||!player.userData.isPlayerGLB||typeof Player==='undefined')return null;
  var gm=player.userData.gmix,a=Player.action,skill=skillOfAction(a);
  var moving=gm&&gm.w>0.35;
  if(skill&&moving)skill=null;                              // walking to the tree: the weapon stays out
  if(!skill&&gm&&gm.attack){var at=gm.attack;               // a skilling clip still owning the body (between ticks)
   if(at.enabled&&at.weight>0&&(at.isRunning()||at.paused))skill=CLIP_SKILL[at.getClip().name]||null}
  if(!skill)return null;
  var clip=clipFor(gm,skill);if(!clip)return null;
  var T=TOOLS[SKILLS[skill].tool],id=null;
  if(T.from==='equip')id=bestToolId(ITEMS,Player.inv,Player.equip,T.skill);
  else id=itemToolId(SKILLS[skill].tool,skill,a,function(i){return Player.count(i)},function(i){return typeof HolmItems!=='undefined'&&HolmItems.ids.indexOf(i)>=0});
  if(!id)return null;
  return {skill:skill,clip:clip.getClip(),id:id,key:skill+'|'+id+'|'+clip.getClip().name};
 }
 function setGearVisible(on){
  var g=player.userData.glbGear||{};
  if(!on){st.hidden=st.hidden.filter(function(m){return !!m.parent});   // refreshGLBGear rebuilds the gear meshes
   ['weapon','shield'].forEach(function(k){var m=g[k];if(m&&m.visible){m.visible=false;if(st.hidden.indexOf(m)<0)st.hidden.push(m)}})}
  else{st.hidden.forEach(function(m){m.visible=true});st.hidden=[]}
 }
 function clear(){if(st.cur&&st.cur.mesh&&st.cur.mesh.parent)st.cur.mesh.parent.remove(st.cur.mesh);st.cur=null;if(typeof player!=='undefined'&&player&&player.userData)setGearVisible(true)}
 function build(w){
  var rig=player.userData.rigInner;if(!rig)return false;
  var hand=bone(rig,'RightHand');if(!hand)return false;
  var mesh=toolMesh(SKILLS[w.skill].tool,w.id);if(!mesh)return false;
  var ws=new THREE.Vector3();hand.getWorldScale(ws);mesh.scale.setScalar(1/(ws.x||1));
  var q=gripQuat(rig,hand,w.skill,w.clip);mesh.quaternion.copy(q);
  var palm=(window.EquipBuilder&&EquipBuilder.palmLocal)?EquipBuilder.palmLocal(hand,PALM):new THREE.Vector3(0,PALM/(ws.x||1),0);
  mesh.position.copy(palm).sub(mesh.userData.gripLocal.clone().applyQuaternion(q).multiply(mesh.scale));
  hand.add(mesh);st.cur={key:w.key,skill:w.skill,id:w.id,mesh:mesh,rig:rig,hand:hand};return true;
 }
 /* per frame (HolmIslandPlayer.update, after the mixer): show / swap / put away */
 function update(){
  st.tick=Date.now();
  var w=null;try{w=wanted()}catch(e){w=null}
  if(!w){if(st.cur||st.hidden.length)clear();return}
  var rig=player.userData.rigInner;
  if(!st.cur||st.cur.key!==w.key||st.cur.rig!==rig||!st.cur.mesh.parent){clear();if(!build(w))return}
  setGearVisible(false);                                     // refreshGLBGear may have rebuilt them mid-action
 }
 // CraftingActionVisuals defers its code-built tool + procedural arm pose to this module on the kit player
 // only while this module is being driven (HolmIslandPlayer.update); anywhere else the old visuals keep working
 function handles(actor){return !!(actor&&actor.userData&&actor.userData.holmPlayer&&actor.userData.gmix&&actor.userData.gmix.kit&&st.tick&&Date.now()-st.tick<1000)}
 function status(){return st.cur?{active:true,skill:st.cur.skill,tool:st.cur.id,hiddenGear:st.hidden.length}:{active:false,hiddenGear:st.hidden.length}}
 /* QA: measured on the live pose. Freeze the skill's clip at its reference frame and the tool's axis / roll must match
  * the spec (degrees) with its grip point in the palm (metres), the EquipBuilder.audit contract for tools */
 function audit(){
  if(!st.cur||!st.cur.mesh.parent)return {ok:false,reason:'no tool in hand'};
  var S=SKILLS[st.cur.skill],T=TOOLS[S.tool],m=st.cur.mesh;player.updateMatrixWorld(true);
  var qC=new THREE.Quaternion();player.getWorldQuaternion(qC);
  var q=new THREE.Quaternion();m.getWorldQuaternion(q);q.premultiply(qC.invert());
  var ax=V(T.axis).applyQuaternion(q).normalize(),rl=V(T.roll).applyQuaternion(q).normalize();
  var wa=V(S.axis).normalize(),wr=V(S.rollAim);wr.sub(wa.clone().multiplyScalar(wr.dot(wa))).normalize();
  var deg=function(a,b){return +(Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*180/Math.PI).toFixed(1)};
  var ws=new THREE.Vector3();st.cur.hand.getWorldScale(ws);
  var palm=(window.EquipBuilder&&EquipBuilder.palmLocal)?EquipBuilder.palmLocal(st.cur.hand,PALM):new THREE.Vector3(0,PALM/(ws.x||1),0);
  var pW=st.cur.hand.localToWorld(palm.clone()),gW=m.localToWorld(m.userData.gripLocal.clone());
  return {ok:true,skill:st.cur.skill,tool:st.cur.id,ref:S.ref,axisDeg:deg(ax,wa),rollDeg:deg(rl,wr),gripToPalm:+pW.distanceTo(gW).toFixed(3)};
 }
 return {update:update,clear:clear,handles:handles,status:status,audit:audit,SKILLS:SKILLS,TOOLS:TOOLS,
  skillOfAction:skillOfAction,bestToolId:bestToolId,itemToolId:itemToolId};
})();
if(typeof window!=='undefined')window.HolmSkillTools=HolmSkillTools;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmSkillTools;
