/* Tutor's Holm island guidance (owner play-test 2026-09-25: "a lot of the arrows ... aren't pointing in the exact spot").
 * Every half second the objective marker/arrow is re-aimed at the exact thing the player must use NOW — not the
 * lesson's stance tile: the chart, the rack, the nearest standing teaching oak, the ripples, the player's own fire,
 * each bakehouse station in turn (bucket rack -> pantry -> water butt -> dough bowl -> oven), the quest board, the rope by
 * the mine shaft then the shaft, the right ore rock, the furnace, the anvil, a live practice grubkin, the bank counter, the storm door and
 * each Lastlight ladder in turn, the lever, and at the end the skiff. Steps done in the pack (wield, light, knead) point
 * at the pack instead: the inventory tab pulses and the world marker hides. The target carries its real height, so the
 * marker sits over interiors, upper floors and the cavern. Island only (HolmIsland.live()). */
var HolmIslandGuide=(function(){
 'use strict';
 var st={last:'',t:0,pack:null};
 function world(o){if(!o)return null;var v=new THREE.Vector3(),b=new THREE.Box3().setFromObject(o);if(b.isEmpty())o.getWorldPosition(v);else{b.getCenter(v);v.y=b.max.y}return {x:v.x,y:v.y,z:v.z}}
 function named(n){return typeof scene!=='undefined'?scene.getObjectByName(n):null}
 // a gated doorway's leaf: the prop leaf, or the building's own door that the gate drives (owner review 4)
 function gateLeaf(id){return named('island-gate-'+id)||(typeof HolmIslandGates!=='undefined'&&HolmIslandGates.leafObject?HolmIslandGates.leafObject(id):null)}
 function byKind(kind,extra){var hit=null;scene.traverse(function(m){if(!hit&&m.isMesh&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))hit=m});return hit}
 function service(label,target){var hit=null;scene.traverse(function(m){var s=m.userData&&m.userData.islandService;if(!hit&&m.isMesh&&s&&s.label===label&&(!target||s.target===target))hit=m});return hit}
 function nearest(list){var best=null,d=Infinity;list.forEach(function(o){if(!o)return;var p=o.getWorldPosition(new THREE.Vector3()),h=Math.hypot(p.x-player.position.x,p.z-player.position.z);if(h<d){d=h;best=o}});return best}
 function alive(prefix){var out=[];scene.traverse(function(o){if(o.name&&o.name.indexOf(prefix)===0&&o.userData&&o.userData.alive!==false&&o.visible!==false)out.push(o)});return out}
 function grubkin(pen){var n=typeof HolmIslandTrials!=='undefined'?HolmIslandTrials.npcs().filter(function(x){return !x.dead&&x.islandPen===pen}).map(function(x){return x.mesh}):[];return nearest(n)}
 function has(id){return typeof Player!=='undefined'&&Player.count(id)>0}
 // Minnow Hollow (v2 land): the live ripple nearest the player (spots move)
 function pondSpot(){return typeof HolmFishing!=='undefined'&&typeof player!=='undefined'?HolmFishing.nearestSpot(player.position.x,player.position.z):null}
 // what to point at for the current step: {obj,label} in the world, or {pack,label} for a step done in the pack
 function aim(id){
  switch(id){
   case 'study_route':return {obj:byKind('arrival_chart'),label:'Study the chart'};
   // owner review 4: Wenna hands over the tools (asked again when a full pack refused them)
   case 'equip_hatchet':return has('hatchet')?{pack:'hatchet',label:'Wield the hatchet'}:{obj:named('island-tutor-wenna'),label:'Talk to Wenna'};
   case 'chop_logs':return {obj:nearest(alive('island-lesson-survival-oak-')),label:'Chop an oak'};
   // owner review 4: the fire is lit where the adventurer stands (2004), so with logs in the pack the pack is the target
   case 'light_fire':return has('logs')?{pack:'tinderbox',label:'Use the tinderbox on the logs'}:{obj:nearest(alive('island-lesson-survival-oak-')),label:'Chop an oak'};
   case 'catch_fish':return {obj:pondSpot(),label:'Net a fish'};
   case 'cook_fish':
    if(!has('raw_perch'))return {obj:pondSpot(),label:'Net a fish'};
    if(named('island-campfire'))return {obj:named('island-campfire'),label:'Cook the fish'};
    return has('logs')?{pack:'tinderbox',label:'Light a fire'}:{obj:nearest(alive('island-lesson-survival-oak-')),label:'Chop an oak'};
   case 'bake_bread':
    if(has('bread_dough'))return {obj:service('Cook'),label:'Bake in the oven'};
    if(has('dough')&&has('bucket_flour'))return {pack:'bucket_flour',label:'Use the flour on the dough'};
    if(!has('bucket')&&!has('bucket_flour')&&!has('bucket_water'))return {obj:service('Take bucket'),label:'Take a bucket'};
    if(!has('bucket_flour'))return {obj:service('Fill bucket with flour'),label:'Fill it with flour'};
    if(!has('bucket_water'))return has('bucket')?{obj:service('Fill bucket with water'),label:'Fill it with water'}:{obj:service('Take bucket'),label:'Take another bucket'};
    return {obj:service('Take dough'),label:'Take dough'};
   case 'learn_quests':return {obj:service('Study quest board'),label:'Study the quest board'};
   // owner review 5 (2026-09-28): the coil of rope, then the shaft to tie it to, then the rope down (HolmShaftRope)
   case 'descend_cavern':{var rs=typeof HolmShaftRope!=='undefined'&&HolmShaftRope.active()?HolmShaftRope.stage():'climb',shaft=service('Climb-down mine shaft','shaft');
    if(rs==='take'){var coil=named(HolmShaftRope.COIL_NAME);return coil?{obj:coil,label:'Take the rope'}:{obj:shaft,label:'Take the rope'}}
    return {obj:shaft,label:rs==='tie'?'Use the rope on the shaft':'Climb down the rope'}}
   case 'mine_copper':return {obj:nearest(alive('island-lesson-cavern-copper-')),label:'Mine copper'};
   case 'mine_tin':return {obj:nearest(alive('island-lesson-cavern-tin-')),label:'Mine tin'};
   case 'smelt_bronze':return {obj:named('island-lesson-furnace'),label:'Use the furnace'};
   case 'forge_dagger':return {obj:named('island-lesson-anvil'),label:'Use the anvil'};
   case 'melee_trial':return Player.equip&&Player.equip.weapon==='bronze_dagger'?{obj:grubkin('keep-court'),label:'Attack a grubkin'}:{pack:'bronze_dagger',label:'Wield the dagger'};
   case 'ranged_trial':return Player.equip&&Player.equip.weapon==='worn_bow'?{obj:grubkin('keep-court'),label:'Shoot a grubkin'}:{pack:'worn_bow',label:'Wield the shortbow'};
   case 'open_bank':return {obj:service('Use bank counter','counter'),label:'Open the bank'};
   case 'magic_trial':return Player.spell==='wind_strike'?{obj:grubkin('mage-yard'),label:'Cast at a grubkin'}:{tab:'spells',label:'Choose Gale Dart'};
   case 'relight_lastlight':{
    // the storm door, then the ladder on whichever floor the player is on, then the lever
    var y=player.position.y,base=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.qaStance('lastlight','door'),rel=base?y-base.y:0;
    if(!base||Math.hypot(player.position.x-base.x,player.position.z-base.z)>9)return {obj:gateLeaf('lastlight-door')||service('Climb-up ladder','ladder1-foot'),label:'Enter Lastlight'};
    if(rel<1.5)return {obj:service('Climb-up ladder','ladder1-foot'),label:'Climb the ladder'};
    if(rel<4.5)return {obj:service('Climb-up ladder','ladder2-foot'),label:'Climb the ladder'};
    if(rel<7.5)return {obj:service('Climb-up ladder','ladder3-foot'),label:'Climb the ladder'};
    return {obj:service('Pull beacon lever','lever'),label:'Pull the lever'};}
  }
  return null;
 }
 // a station inside a building while the player is outside: lead to the building's door first (2004 style)
 var CAVERN_STEPS={descend_cavern:1,mine_copper:1,mine_tin:1,smelt_bronze:1,forge_dagger:1};
 var NAMES={bakehouse:'bakehouse',lodge:'Quest Lodge',bank:'Holm Bank',keep:"Warden's Keep",mage:'Mage Tower',lastlight:'Lastlight',quarry:'Quarry Gate',survival:'survival camp',haven:'haven'};
 var DOOR={bakehouse:'entrance',lodge:'entrance',bank:'entrance',lastlight:'door',mage:'entrance'};
 function viaDoor(a){var s=a&&a.obj&&a.obj.userData&&a.obj.userData.islandService,b=(a&&a.building)||(s&&s.building);if(!b||!DOOR[b]||typeof HolmArrivalQA==='undefined')return a;
  var rec=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord(),surf=rec&&rec.surface||'';if(surf.indexOf('b:'+b+':')===0&&!/Terrain$/.test(surf))return a;   // already inside
  // standing at the doorway already: the marker goes on the thing itself (a tutor just inside, the station)
  var d=HolmArrivalQA.qaStance(b,DOOR[b]);if(d&&Math.hypot(player.position.x-d.x,player.position.z-d.z)<1.6&&Math.abs(player.position.y-d.y)<1)return a;
  var gate=gateLeaf(b+'-door');if(gate)return {obj:gate,door:true,label:'Enter the '+NAMES[b]};
  return d?{point:d,label:'Enter the '+NAMES[b]}:a}
 // the Guide House (the arrival package, first lessons): the chart and the tools are inside, so from outside the
 // marker goes on its south door, "Open the door" while it is shut, as the first thing a new adventurer does
 function viaGuideDoor(a){if(!a||!a.obj||typeof HolmArrivalQA==='undefined')return a;var house=named('GuideHouse'),door=named('DoorSouthLeaf');if(!house||!door)return a;
  var rec=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord();if(!rec||rec.surface!=='exterior')return a;
  var box=new THREE.Box3().setFromObject(house),t=a.obj.getWorldPosition(new THREE.Vector3());
  if(t.x<box.min.x||t.x>box.max.x||t.z<box.min.z||t.z>box.max.z)return a;
  return {obj:door,door:true,label:rec.doors&&rec.doors.arrival?'Enter the Guide House':'Open the door'}}
 // a door's arrow floats in front of the leaf at head height, not on its top edge: under a porch roof the top edge put
 // the arrow and its tag off the top of the screen once the adventurer walked up to it
 function doorPoint(o){var b=new THREE.Box3().setFromObject(o);if(b.isEmpty())return world(o);var c=b.getCenter(new THREE.Vector3()),dx=player.position.x-c.x,dz=player.position.z-c.z,d=Math.hypot(dx,dz)||1,k=Math.min(.7,d*.5);
  return {x:c.x+dx/d*k,y:c.y,z:c.z+dz/d*k}}
 function packPulse(on,item,tab){   // point at the pack (or a side tab) the 2004 way: the tab flashes
  var sel=tab?'.tab-btn[data-tab="'+tab+'"]':'.tab-btn[data-tab="inv"]';
  document.querySelectorAll('.tab-btn.holm-guide-pulse').forEach(function(b){if(!on||!b.matches(sel))b.classList.remove('holm-guide-pulse')});
  if(on)document.querySelectorAll(sel).forEach(function(b){b.classList.add('holm-guide-pulse')});
  // and the slot of the item to use gets a pulsing gold ring (ui_osrs_kit.js UI.highlightItem)
  if(typeof UI!=='undefined'&&UI.highlightItem)UI.highlightItem(on&&item?item:null);
  if(!document.getElementById('holm-guide-style')){var s=document.createElement('style');s.id='holm-guide-style';
   s.textContent='@keyframes holmGuidePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,215,64,.0)}50%{box-shadow:0 0 0 3px rgba(255,215,64,.95)}}.tab-btn.holm-guide-pulse{animation:holmGuidePulse 1s infinite}';document.head.appendChild(s)}
 }
 // 2004 rule (HolmIslandTalk): while the current lesson's tutor has not been spoken to, the marker is on the tutor
 // (by way of their building's door when they stand inside it)
 function talkAim(){var t=typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.pending(),o=t&&named('island-tutor-'+t.id);if(!o)return null;
  return {obj:o,label:'Talk to '+t.name,building:typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.inside?HolmIslandTutors.inside(t.id):null}}
 function update(dt){
  if(typeof HolmIsland==='undefined'||!HolmIsland.live()||typeof Tutorial==='undefined'||typeof GuideArrow==='undefined'||typeof scene==='undefined')return;
  if(typeof HolmIslandAnim!=='undefined'&&HolmIslandAnim.sailing&&HolmIslandAnim.sailing())return;   // aboard the departing skiff: nothing left to point at
  // re-aim every half second, and at once when the lesson or the tutor due changes (no stale arrow after a talk)
  var due=typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.pending(),key=(Tutorial.complete?'done':Tutorial.step)+'|'+(due?due.id:'');
  st.t+=dt||0;if(st.t<.5&&key===st.key)return;st.t=0;st.key=key;
  var a;
  if(Tutorial.complete){var boat=null;scene.traverse(function(n){if(!boat&&/^Haven_ServiceBoat_/.test(n.name||''))boat=n});a=talkAim()||(boat?{obj:boat,label:'Board the skiff'}:null)}
  else{var s=Tutorial.steps[Tutorial.step];a=s?(talkAim()||aim(s.id)):null}
  if(a&&(a.pack||a.tab)){packPulse(true,a.pack,a.tab);GuideArrow.setTarget(null);return}
  packPulse(false);
  a=viaGuideDoor(viaDoor(a));
  // v2 land: in the ore workings, once the cavern lessons are done, every objective is up the east drift ladder first
  if(a&&typeof HolmArrivalQA!=='undefined'&&!Tutorial.complete){var rw=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord(),s0=Tutorial.steps[Tutorial.step];
   if(rw&&String(rw.surface||'').indexOf('b:cavern:')===0&&s0&&!CAVERN_STEPS[s0.id]){var dl=service('Climb-up drift ladder','exit');if(dl)a={obj:dl,label:'Climb the drift ladder'}}}
  // down in the Guide House cellar every objective is back up the ladder first
  if(a&&typeof HolmGuideCellar!=='undefined'){var rc=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord();if(rc&&HolmGuideCellar.below(rc.surface)){var lad=named('CellarLadder');if(lad)a={obj:lad,label:'Climb up the ladder'}}}
  var p=a&&(a.point?{x:a.point.x,y:a.point.y+1.4,z:a.point.z}:a.door?doorPoint(a.obj):world(a.obj));if(!p){return}
  GuideArrow.keepAfterComplete=!!Tutorial.complete;GuideArrow.setTarget({x:p.x,z:p.z,y:p.y,exact:true},a.label);
 }
 return {update:update,aim:aim};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandGuide;
