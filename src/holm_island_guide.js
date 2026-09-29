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
   case 'bake_bread':{
    // the mix takes all three (src/bread_recipe.js: flour, water, dough), and a bin or the butt fills only an empty bucket
    // (goal audit 2026-09-29: the arrow asked for the flour on the dough before the water, and for the flour bin to a
    // player holding only a bucket of water)
    if(has('bread_dough'))return {obj:service('Cook'),label:'Bake in the oven'};
    var fl=has('bucket_flour'),wa=has('bucket_water'),empty=has('bucket');
    if(fl&&wa&&has('dough'))return {pack:'bucket_flour',label:'Use the flour on the dough'};
    if(!fl)return empty?{obj:service('Fill bucket with flour'),label:'Fill it with flour'}:{obj:service('Take bucket'),label:wa?'Take another bucket':'Take a bucket'};
    if(!wa)return empty?{obj:service('Fill bucket with water'),label:'Fill it with water'}:{obj:service('Take bucket'),label:'Take another bucket'};
    return {obj:service('Take dough'),label:'Take dough'};}
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
    // (inside the tower by its walk surface: the lantern deck's lever stands ten tiles from the storm door)
    var y=player.position.y,base=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.qaStance('lastlight','door'),rel=base?y-base.y:0;
    if(!base||(!insideOf('lastlight')&&Math.hypot(player.position.x-base.x,player.position.z-base.z)>9))return {obj:gateLeaf('lastlight-door')||service('Climb-up ladder','ladder1-foot'),label:'Enter Lastlight'};
    if(rel<1.5)return {obj:service('Climb-up ladder','ladder1-foot'),label:'Climb the ladder'};
    if(rel<4.5)return {obj:service('Climb-up ladder','ladder2-foot'),label:'Climb the ladder'};
    if(rel<7.5)return {obj:service('Climb-up ladder','ladder3-foot'),label:'Climb the ladder'};
    return {obj:service('Pull beacon lever','lever'),label:'Pull the lever'};}
  }
  return null;
 }
 // goal audit 2026-09-29, "no step where a new player has to guess": when the step's tool has been lost (dropped, left in
 // the bank) the arrow goes to the spare-tools rack in the Guide House (HolmToolRecoveryService re-grants what the ledger
 // has unlocked); when the teaching runes or arrows are spent without the kill, to the trial's tutor, who tops them up
 // (HolmCombatKits.recover). Returns an aim or null.
 function holds(kind,id){if(has(id))return true;var e=typeof Player!=='undefined'&&Player.equip||{};for(var k in e){var w=e[k];if(w&&(w===id||(kind&&typeof ITEMS!=='undefined'&&ITEMS[w]&&ITEMS[w].tool===kind)))return true}
  return !!kind&&typeof ITEMS!=='undefined'&&(Player.inv||[]).some(function(s){return s&&ITEMS[s.id]&&ITEMS[s.id].tool===kind})}
 function lostTool(id){
  var need=null;
  if(id==='chop_logs'||(id==='light_fire'&&!has('logs')))need=['woodcutting','hatchet'];
  else if(id==='light_fire')need=[null,'tinderbox'];
  else if(id==='catch_fish')need=['fishing','fishing_net'];
  else if(id==='cook_fish'){if(!has('raw_perch'))need=['fishing','fishing_net'];else if(!named('island-campfire'))need=has('logs')?[null,'tinderbox']:['woodcutting','hatchet']}
  else if(id==='mine_copper'||id==='mine_tin')need=['mining','pickaxe'];
  else if(id==='forge_dagger')need=[null,'hammer'];
  return need&&!holds(need[0],need[1])?need[1]:null;
 }
 function recovery(id){
  // (say: one chat line when it starts, so the objective box's own line is not left to be guessed at)
  var t=lostTool(id);if(t){var rack=byKind('arrival_provisions'),tn=typeof ITEMS!=='undefined'&&ITEMS[t]?ITEMS[t].name.toLowerCase():t;
   if(rack)return {obj:rack,label:'Take a spare '+tn+' from the rack',why:'spare tools',say:'You have no '+tn+'. Spare tools hang on the rack in the Guide House: follow the arrow.'}}
  if(id==='magic_trial'&&(!has('air_rune')||!has('mind_rune'))){var ilse=named('island-tutor-ilse');if(ilse)return {obj:ilse,label:'Ask Magister Ilse for runes',say:'You are out of runes. Speak to Magister Ilse and she will give you more.'}}
  if(id==='ranged_trial'&&!has('arrows')&&!(Player.equip&&Player.equip.ammo==='arrows')){var dropped=nearest((typeof WORLD!=='undefined'&&WORLD.drops||[]).filter(function(d){return d.userData&&d.userData.id==='arrows'&&Math.hypot(d.position.x-player.position.x,d.position.z-player.position.z)<12}));
   if(dropped)return {obj:dropped,label:'Pick up your arrows'};var cor=named('island-tutor-corrick');if(cor)return {obj:cor,label:'Ask Warden Corrick for arrows',say:'You are out of arrows. Speak to Warden Corrick and he will give you more.'}}
  return null;
 }
 // the ore workings lie offshore below the Quarry Gate: a target down there, seen from the surface, is reached by the
 // shaft (take the rope, tie it, climb down); a surface target seen from down there by the ladder up to the shaft, or by
 // the east drift once it is open (goal audit 2026-09-29: from the surface the arrow pointed into the sea over the workings)
 function below(p){return !!p&&p.y<-15}
 function viaShaft(a){
  if(!a||!a.obj||typeof HolmArrivalQA==='undefined')return a;var p=world(a.obj);if(!p)return a;
  var rec=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord(),inCavern=!!rec&&String(rec.surface||'').indexOf('b:cavern:')===0;
  if(below(p)&&!inCavern){var rs=typeof HolmShaftRope!=='undefined'&&HolmShaftRope.active()?HolmShaftRope.stage():'climb',shaft=service('Climb-down mine shaft','shaft');if(!shaft)return a;
   if(rs==='take'){var coil=named(HolmShaftRope.COIL_NAME);return {obj:coil||shaft,label:'Take the rope'}}
   return {obj:shaft,label:rs==='tie'?'Use the rope on the shaft':'Climb down the rope'}}
  if(!below(p)&&inCavern){var drift=typeof HolmIslandGates!=='undefined'&&!HolmIslandGates.serviceBlocked('cavern','exit');var up=drift?service('Climb-up drift ladder','exit'):service('Climb-up ladder','ladder');
   if(up)return {obj:up,label:drift?'Climb the drift ladder':'Climb up to the shaft'}}
  return a}
 // Lastlight's upper floors: a target off the storey the adventurer stands on is reached by that floor's ladder down first
 // (goal audit 2026-09-29: after the lever the arrow pointed straight through the tower at Ferryman Tobin at the cove);
 // floors as relight_lastlight counts them from the storm door's stance (1.5 / 4.5 / 7.5 above it)
 // standing inside a building (its own floors, not the terrain patch around it)
 function insideOf(b){var r=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord(),sf=r&&String(r.surface||'')||'';return sf.indexOf('b:'+b+':')===0&&!/(IslandTerrain|StagedTerrain)$/.test(sf)}
 function viaLastlight(a){if(!a||typeof HolmArrivalQA==='undefined'||!HolmArrivalQA.qaStance||typeof player==='undefined')return a;
  var sv=a.obj&&a.obj.userData&&a.obj.userData.islandService;if(sv&&sv.building==='lastlight')return a;   // the tower's own ladders and lever: relight_lastlight counts the floors itself
  var base=HolmArrivalQA.qaStance('lastlight','door');if(!base)return a;var rel=player.position.y-base.y;
  if(rel<1.5||!insideOf('lastlight'))return a;
  var foot=a.point?a.point.y:null;if(a.obj){var b=new THREE.Box3().setFromObject(a.obj);if(!b.isEmpty())foot=b.min.y}
  var p=a.point||(a.obj?world(a.obj):null);if(p&&foot!==null&&Math.abs(foot-player.position.y)<1.5&&Math.hypot(p.x-player.position.x,p.z-player.position.z)<9)return a;
  var down=service('Climb-down ladder',rel>=7.5?'ladder3-top':rel>=4.5?'ladder2-top':'ladder1-top');return down?{obj:down,label:'Climb down the ladder'}:a}
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
 // goal audit 2026-09-29: the porches are 'ground' walk surface too, outside their doors: standing on the front porch with
// the door shut, the arrow sat on Guide Bram (or the rack) inside, whom a click could not reach. The room is the span
// between the south (front) and north (garden) door leaves; from anywhere else the arrow goes on the nearer door.
function viaGuideDoor(a){if(!a||!a.obj||typeof HolmArrivalQA==='undefined')return a;var house=named('GuideHouse'),door=named('DoorSouthLeaf'),back=named('DoorNorthLeaf');if(!house||!door)return a;
  var rec=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord();if(!rec)return a;
  var zc=function(o){var b=new THREE.Box3().setFromObject(o);return (b.min.z+b.max.z)/2},sz=zc(door),nz=back?zc(back):null,pz=player.position.z;
  var inRoom=rec.surface!=='exterior'&&pz<sz-.2&&(nz===null||pz>nz+.2);if(inRoom)return a;
  var box=new THREE.Box3().setFromObject(house),t=a.obj.getWorldPosition(new THREE.Vector3());
  if(t.x<box.min.x||t.x>box.max.x||t.z<box.min.z||t.z>box.max.z)return a;
  var useBack=nz!==null&&Math.abs(pz-nz)<Math.abs(pz-sz),open=rec.doors&&(useBack?rec.doors.garden:rec.doors.arrival);
  return {obj:useBack?back:door,door:true,label:(open?'Enter the Guide House':'Open the door')+(a.why?' ('+a.why+')':'')}}
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
  // re-aim every half second, and at once when the lesson or the tutor due changes (no stale arrow after a talk)
  var due=typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.pending(),key=(Tutorial.complete?'done':Tutorial.step)+'|'+(due?due.id:'');
  st.t+=dt||0;if(st.t<.5&&key===st.key)return;st.t=0;st.key=key;
  var a;
  // the skiff: the service the click boards (goal audit 2026-09-29: the boat model's whole group put the arrow a tile off
  // and above the mast, off the top of the screen at the pier's end), else the model
  // the welcome pack did not fit at the pier (HolmDepartureRewards): until there is room, the objective line says how
  // many slots are still wanted and the pack tab pulses (drop something, or bank it); then back to the skiff
  var room=Tutorial.complete&&!Tutorial.departurePackClaimed&&Tutorial.departureRoom;
  if(room){var left=room.freeAt+room.need-(Player.inv||[]).filter(function(q){return !q}).length,ot=document.getElementById('obj-text'),ob=document.getElementById('objective');
   if(left>0){packPulse(true,null,null);GuideArrow.setTarget(null);if(ot){ob.style.display='block';ot.textContent='Free '+left+' more pack slot'+(left===1?'':'s')+' for Tobin\'s welcome pack: drop something, or bank it at the Holm Bank. Then board the skiff.'}return}
   Tutorial.departureRoom=null;try{Tutorial.banner()}catch(e){}}
  if(Tutorial.complete){var boat=service('Ferry','boat');if(!boat)scene.traverse(function(n){if(!boat&&/^Haven_ServiceBoat_/.test(n.name||''))boat=n});a=talkAim()||(boat?{obj:boat,label:'Board the skiff'}:null)}
  else{var s=Tutorial.steps[Tutorial.step];a=s?(talkAim()||recovery(s.id)||aim(s.id)):null}
  if(a&&a.say){if(st.said!==a.say){st.said=a.say;if(typeof UI!=='undefined'&&UI.chat)UI.chat(a.say,'plain')}}else st.said=null;
  if(a&&(a.pack||a.tab)){packPulse(true,a.pack,a.tab);GuideArrow.setTarget(null);return}
  packPulse(false);
  a=viaGuideDoor(viaDoor(viaShaft(viaLastlight(a))));
  // v2 land: in the ore workings, once the cavern lessons are done, every objective is up the east drift ladder first
  if(a&&typeof HolmArrivalQA!=='undefined'&&!Tutorial.complete){var rw=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord(),s0=Tutorial.steps[Tutorial.step];
   if(rw&&String(rw.surface||'').indexOf('b:cavern:')===0&&s0&&!CAVERN_STEPS[s0.id]){var dl=service('Climb-up drift ladder','exit');if(dl)a={obj:dl,label:'Climb the drift ladder'}}}
  // down in the Guide House cellar every objective is back up the ladder first
  if(a&&typeof HolmGuideCellar!=='undefined'){var rc=HolmArrivalQA.saveRecord&&HolmArrivalQA.saveRecord();if(rc&&HolmGuideCellar.below(rc.surface)){var lad=named('CellarLadder');if(lad)a={obj:lad,label:'Climb up the ladder'}}}
  var p=a&&(a.point?{x:a.point.x,y:a.point.y+1.4,z:a.point.z}:a.door?doorPoint(a.obj):world(a.obj));
  // nothing to point at this moment (every grubkin in the pen between respawns, no ripple up yet): the lesson's station
  // (HolmIslandCurriculum.bind) rather than the last target, which could belong to a step already done
  if(!p){var s1=!Tutorial.complete&&Tutorial.steps[Tutorial.step];if(s1&&s1.target){p={x:s1.target.x,z:s1.target.z};a={label:s1.arrowLabel||''}}else{GuideArrow.setTarget(null);return}}
  GuideArrow.keepAfterComplete=!!Tutorial.complete;GuideArrow.setTarget({x:p.x,z:p.z,y:p.y,exact:true},a.label);
 }
 return {update:update,aim:aim,recovery:recovery,lostTool:lostTool,viaShaft:viaShaft,viaLastlight:viaLastlight};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandGuide;
