/* Tutor's Holm Proving Ground (combat agent 2026-09-26; COMBAT_GRADE criterion 17): an optional meadow past the
 * Warden's Keep where the island's practice turns real, one foe of every kind, all our own designs:
 *   - a Holm poacher (ranged: a shortbow, arrows that fly and land on the hit tick),
 *   - a hedge warlock (magic: a staff, the cast glow, a spell that can splash),
 *   - a pack of three wild grubkins (aggressive: they hunt an adventurer within four tiles, and ignore anyone above
 *     twice their level, the 2004 rule; the meadow's welcome line warns that they attack on sight),
 *   - the grubkin broodmother (the tougher, boss-like foe: a telegraphed ground slam every fourth attack, announced,
 *     ringed on the ground, dodged by stepping out of reach or blocked by Protect from Melee).
 * Every foe is an ordinary NPC on the combat engine (src/combat_engine.js: 2004 rules, tile steps, weighted drops from
 * shared/drops.js). Models are existing Blender GLBs: the character kit (assets/models/holm_kit_v2.glb, with its
 * bow / cast / attack / block / death clips and the Blender equipment set for the held bow and staff) for the two
 * humanoids, the grubkin (assets/models/holm_grubkin_v1.glb) for the pack and, scaled up and darkened, the broodmother.
 * Sites are chosen on the composed island graph: the nearest open meadow beyond the keep court (no water, no
 * buildings, every tile linked to its neighbours), so nothing crowds the tutorial's pens. */
var HolmProvingGround=(function(){
 'use strict';
 var npcs=[],sites=null,welcomed=false;
 var L={always:[{item:'bones',qty:1}],rolls:128};
 var TYPES={
  pg_poacher:{name:'Holm poacher',level:9,examine:'Takes what the wardens will not miss, and shoots what comes asking.',
   hp:14,att:6,str:5,def:6,rng:10,aBonus:8,sBonus:7,dBonus:3,dStab:2,dSlash:3,dCrush:3,dMagic:6,dRanged:4,speedTicks:5,ranged:'arrow',attackRange:6,
   kitFoe:{weapon:'worn_bow',torso:1,legs:3,hair:1},size:1,respawn:25,maxRange:8,aggro:false,
   dropTable:Object.assign({},L,{main:[{w:40,item:'arrows',qty:[5,15]},{w:30,item:'coins',qty:[4,20]},{w:12,item:'trout',qty:1},{w:6,item:'leather_gloves',qty:1},{w:6,item:'leather_boots',qty:1},{w:3,item:'worn_bow',qty:1},{w:2,item:'leather_body',qty:1}]}),drops:[{id:'bones',q:1,p:1}]},
  pg_warlock:{name:'Hedge warlock',level:10,examine:'Reads the old runes wrong, on purpose.',
   hp:12,att:4,str:3,def:4,mag:12,aBonus:6,maxHit:4,dBonus:2,dRanged:1,dMagic:10,speedTicks:5,ranged:true,attackRange:7,spell:'water_strike',spellTint:0x4a8ac8,
   kitFoe:{weapon:'apprentice_staff',hat:true,torso:11,legs:2,hair:10},size:1,respawn:25,maxRange:8,aggro:false,
   dropTable:Object.assign({},L,{main:[{w:30,item:'air_rune',qty:[3,9]},{w:30,item:'mind_rune',qty:[3,9]},{w:15,item:'water_rune',qty:[2,6]},{w:10,item:'earth_rune',qty:[2,5]},{w:4,item:'wizard_hat',qty:1},{w:3,item:'apprentice_staff',qty:1},{w:3,item:'cloth_robe_top',qty:1}]}),drops:[{id:'bones',q:1,p:1}]},
  pg_wild_grubkin:{name:'Wild grubkin',level:5,examine:'Nobody tamed this one. It has noticed you.',
   hp:7,att:5,str:4,def:3,aBonus:2,sBonus:2,dBonus:2,dStab:3,dSlash:2,dCrush:0,speedTicks:4,atype:'slash',
   glbChar:'holm_grubkin_v1',glbHeight:.8,color:0x6a5a2a,size:.85,aggro:true,ignoreFriendly:true,huntRange:4,maxRange:6,respawn:20,deathStyle:'flip',
   dropTable:Object.assign({},L,{main:[{w:40,item:'coins',qty:[2,10]},{w:12,item:'bread',qty:1},{w:12,item:'cabbage',qty:1},{w:4,item:'bronze_dagger',qty:1},{w:3,item:'bronze_helm',qty:1}]}),drops:[{id:'bones',q:1,p:1}]},
  pg_broodmother:{name:'Grubkin broodmother',level:18,examine:'Every grubkin on the Holm came from somewhere. This is where.',
   hp:48,att:16,str:16,def:14,aBonus:8,sBonus:10,dBonus:8,dStab:12,dSlash:10,dCrush:4,dRanged:6,dMagic:4,speedTicks:5,atype:'crush',
   glbChar:'holm_grubkin_v1',glbHeight:1.55,color:0x4a3a1a,size:1.6,aggro:false,maxRange:8,respawn:60,deathStyle:'flip',tint:0x6a5236,
   special:{every:4,windup:2,maxHit:9,radius:1.8,msg:'The broodmother rears up, ready to slam the ground!',hitMsg:'The ground shakes as the broodmother slams into you!',missMsg:'The broodmother slams the empty ground.'},
   dropTable:{always:[{item:'big_bones',qty:1}],rolls:128,main:[{w:50,item:'coins',qty:[40,120]},{w:24,item:'trout',qty:[2,3]},{w:8,item:'ash_bow',qty:1},{w:6,item:'glimmer_hat',qty:1},{w:4,item:'amulet_of_might',qty:1},{w:4,item:'amulet_of_precision',qty:1}]},
   drops:[{id:'big_bones',q:1,p:1}]}
 };
 function register(){if(typeof NPC_TYPES==='undefined')return false;for(var k in TYPES)if(!NPC_TYPES[k]){var t=Object.assign({},TYPES[k]);NPC_TYPES[k]=t}return true}
 /* ---- the kit humanoids: a fresh kit rig per foe, a look, the held weapon solved by the equipment builder ---- */
 var KIT_URL='assets/models/holm_kit_v2.glb?v=8';
 function kitModel(t){
  var g=new THREE.Group(),k=t.kitFoe||{};
  new THREE.GLTFLoader().load(KIT_URL,function(gltf){try{
   var rig=gltf.scene;
   if(typeof HolmKit!=='undefined'&&HolmKit.ready()){var look=HolmKit.defaults('A');if(k.torso!=null)look.colors.torso=k.torso;if(k.legs!=null)look.colors.legs=k.legs;if(k.hair!=null)look.colors.hair=k.hair;HolmKit.apply(rig,look)}
   rig.traverse(function(o){if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.frustumCulled=false;[].concat(o.material).forEach(function(q){if(q&&'metalness' in q){q.metalness=0;q.roughness=1}})}});
   var box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});
   rig.scale.setScalar(1.85/((box.max.y-box.min.y)||1));box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});rig.position.y=-box.min.y;
   g.add(rig);
   var mixer=new THREE.AnimationMixer(rig),clips={};gltf.animations.forEach(function(cl){clips[cl.name]=mixer.clipAction(cl)});
   if(clips.idle){clips.idle.play();clips.idle.weight=1}if(clips.walk){clips.walk.play();clips.walk.weight=0}
   g.userData.gmix={mixer:mixer,idle:clips.idle,walk:clips.walk,attack:clips.attack,block:clips.block,w:0,clips:clips,kitNpc:true};
   g.userData.rigInner=rig;
   // the held weapon, solved at idle frame 0 in the palm (EquipBuilder, the same solver as the adventurer's)
   if(clips.idle){clips.idle.time=0;mixer.update(0)}g.updateMatrixWorld(true);
   var def=k.weapon&&ITEMS[k.weapon],wm=def&&typeof gearMesh==='function'?gearMesh(k.weapon):null;
   if(wm&&typeof _glbBone==='function'){var hand=(window.EquipBuilder&&EquipBuilder.handFor)?EquipBuilder.handFor(def.model):'RightHand',bone=_glbBone(rig,hand);
    if(bone){var ws=new THREE.Vector3();bone.getWorldScale(ws);wm.scale.multiplyScalar(1/(ws.x||1));wm.traverse(function(o){if(o.isMesh)o.castShadow=true});bone.add(wm);
     var q=new THREE.Quaternion();g.getWorldQuaternion(q);if(window.EquipBuilder&&EquipBuilder.specs[def.model])EquipBuilder.solveHeld(bone,wm,def.model,function(v){return v.clone().applyQuaternion(q).normalize()})}}
   if(k.hat&&typeof HolmEquipment!=='undefined'){try{HolmEquipment.fit(rig,'hat',0x3a2a5a,{cloth:0x3a2a5a})}catch(e){}}
  }catch(e){console.warn('[HolmProvingGround] kit foe',e)}},undefined,function(e){console.warn('[HolmProvingGround] kit model failed',e)});
  return g;
 }
 /* ---- where: the nearest open meadow beyond the keep, on the composed island graph ---- */
 function open(g,n,r){for(var dz=-r;dz<=r;dz++)for(var dx=-r;dx<=r;dx++){var rows=g.byTile[(n.tx+dx)+','+(n.tz+dz)];if(!rows||!rows.some(function(m){return m.owner==='land'&&Math.abs(m.y-n.y)<1.2&&(g.links[m.id]||[]).length>=6}))return false}return true}
 function findSites(api){
  var g=api.navGraph&&api.navGraph();if(!g)return null;
  var gate=api.qaStance('keep','gate')||api.qaStance('keep','court'),court=api.qaStance('keep','court');if(!gate)return null;
  var cand=g.nodes.filter(function(n){if(n.owner!=='land')return false;var d=Math.max(Math.abs(n.tx-Math.floor(gate.x)),Math.abs(n.tz-Math.floor(gate.z)));
   var dc=court?Math.max(Math.abs(n.tx-Math.floor(court.x)),Math.abs(n.tz-Math.floor(court.z))):99;return d>=8&&d<=36&&dc>=12});
  cand.sort(function(a,b){return Math.hypot(a.x-gate.x,a.z-gate.z)-Math.hypot(b.x-gate.x,b.z-gate.z)});
  var centre=null;for(var i=0;i<cand.length;i++){if(open(g,cand[i],5)){centre=cand[i];break}}
  if(!centre)return null;
  var at=function(dx,dz){var rows=g.byTile[(centre.tx+dx)+','+(centre.tz+dz)]||[];return rows.filter(function(m){return m.owner==='land'})[0]||null};
  // the humanoids and the broodmother share the meadow; the pack keeps to its far side, out of its hunt range
  return {centre:centre,spots:[['pg_poacher',at(-3,-3)],['pg_warlock',at(3,-3)],['pg_broodmother',at(0,2)],['pg_wild_grubkin',at(-4,5)],['pg_wild_grubkin',at(-2,5)],['pg_wild_grubkin',at(-3,4)]].filter(function(s){return !!s[1]})};
 }
 function load(api){
  if(!register()||typeof spawnNpc!=='function')return {npcs:0};
  sites=findSites(api);if(!sites)return {npcs:0,reason:'no meadow'};
  sites.spots.forEach(function(s,i){var n0=s[1];spawnNpc.force=true;var npc;try{npc=spawnNpc(s[0],n0.x,n0.z)}finally{spawnNpc.force=false}if(!npc)return;
   npc.home.set(n0.x,n0.y,n0.z);npc.mesh.position.set(n0.x,n0.y,n0.z);npc.wanderR=s[0]==='pg_wild_grubkin'?2:1;npc.leash=npc.t.maxRange;
   if(npc.t.tint&&npc.mesh){var tint=new THREE.Color(npc.t.tint),seen={};var fix=function(){npc.mesh.traverse(function(o){if(o.isMesh)[].concat(o.material).forEach(function(q){if(q&&q.color&&!seen[q.uuid]){seen[q.uuid]=1;q.color.lerp(tint,.45)}})})};setTimeout(fix,2500);setTimeout(fix,6000)}
   npc.provingGround=true;npc.mesh.name='proving-ground-'+s[0]+'-'+i;npcs.push(npc)});
  return {npcs:npcs.length,centre:{x:sites.centre.x,z:sites.centre.z}};
 }
 /** per frame: the welcome line the first time the adventurer walks onto the meadow */
 function update(){if(welcomed||!sites||typeof player==='undefined'||!player)return;var c=sites.centre;
  if(Math.hypot(player.position.x-c.x,player.position.z-c.z)<9){welcomed=true;if(typeof UI!=='undefined')UI.chat('The Proving Ground. Wild grubkins here attack on sight; the poacher, the warlock and the broodmother answer only a challenge.','plain')}}
 function dispose(){npcs.forEach(function(n){[WORLD.npcs,WORLD.clickables].forEach(function(a){var i=a.indexOf(a===WORLD.npcs?n:n.mesh);if(i>=0)a.splice(i,1)});if(n.mesh&&n.mesh.parent)n.mesh.parent.remove(n.mesh)});npcs=[]}
 return {load:load,dispose:dispose,update:update,kitModel:kitModel,npcs:function(){return npcs.slice()},sites:function(){return sites},TYPES:TYPES};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmProvingGround;
