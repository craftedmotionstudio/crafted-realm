/* Tutor's Holm island draft tutors (finish goal M6.1): one tutor per area, the 2004 Tutorial Island pattern rebuilt
 * as our own. Each is a Blender-rigged character (assets/models/holm_tutor_<id>.glb: idle, talk, walk, wave) standing
 * beside their lesson station. Clicking a tutor walks the player to them (the island graph) and opens chat-box
 * dialogue, click to continue, that knows where the player is in the 18-lesson curriculum: before their turn they
 * point the way back, on their turn they teach the lesson step by step, after it they send the player on. As in 2004,
 * an area's lessons wait until its tutor has been spoken to (HolmIslandTalk), and asking again explains the step the
 * player is on now. Tutors turn to face the player, wave when first approached and gesture while talking. Island only. */
var HolmIslandTutors=(function(){
 'use strict';
 // id, name, where they stand (a building's measured target or an arrival service), the lessons they teach, a face, and
 // the Examine line of their old-school menu (osrs_menu_world.js)
 var CAST=[
  // owner review 4 (2026-09-27): Bram gives the overview only (2004: the first tutor just shows you round); the hatchet,
  // tinderbox and net come from Wenna when you speak to her, and wielding the hatchet is her first lesson
  {id:'bram',name:'Guide Bram',at:{arrival:'holm_orientation'},lessons:['study_route'],face:'🧓',examine:'The Holm\'s guide. He has welcomed more new arrivals than he can count.'},
  {id:'wenna',name:'Wenna',at:{world:[34.5,89.5]},lessons:['equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish'],face:'🧝',examine:'A hardy woman who lives off the land around Minnow Hollow.'},
  {id:'hettie',name:'Cook Hettie',at:{building:['bakehouse','prep']},lessons:['bake_bread'],face:'👩‍🍳',examine:'The bakehouse cook. There is flour on her apron and steel in her eye.'},
  {id:'ansel',name:'Loremaster Ansel',at:{building:['lodge','map']},lessons:['learn_quests'],face:'🧑‍🏫',examine:'Keeper of the Quest Lodge records, and of a great many stories.'},
  {id:'durgin',name:'Foreman Durgin',at:{building:['cavern','ladder']},lessons:['descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger'],face:'🧔',examine:'Foreman of the ore workings. There is quarry dust in every wrinkle.'},
  {id:'corrick',name:'Warden Corrick',at:{building:['keep','court']},lessons:['melee_trial','ranged_trial'],face:'💂',examine:'A veteran warden who trains the Holm\'s new fighters.'},
  {id:'maud',name:'Teller Maud',at:{building:['bank','counter']},lessons:['open_bank'],face:'👩‍💼',examine:'The Holm Bank teller. She never loses count.'},
  {id:'ilse',name:'Magister Ilse',at:{building:['mage','entrance']},lessons:['magic_trial'],face:'🧙',examine:'Magister of the Mage Tower. Her robes smell faintly of storms.'},
  {id:'aldous',name:'Keeper Aldous',at:{building:['lastlight','stores']},lessons:['relight_lastlight'],face:'👴',examine:'The old keeper of Lastlight, grey as the sea mist.'},
  {id:'tobin',name:'Ferryman Tobin',at:{building:['haven','notice']},lessons:[],face:'🧑',examine:'The ferryman who rows new adventurers across to the mainland.'}];
 // our own lesson talk, 2004 style: a tutor must be spoken to before their area's lessons (HolmIslandTalk), and says
 // what to do for the step the player is on NOW, one short click-to-continue page at a time. The first visit opens
 // with the tutor's welcome; asking again explains the current step (Wenna during light_fire explains the tinderbox).
 var HELLO={
  bram:['Welcome to Tutor\'s Holm, friend. I am Guide Bram. Every adventurer starts here, and I start every adventurer.'],
  wenna:['Hello there. I am Wenna, and down there is Minnow Hollow.','Out here you learn to look after yourself: wood, fire, fish and a hot supper, all within a stone\'s throw of the pond.'],
  hettie:['Mind the flour. I am Cook Hettie, and this is my bakehouse.','The flour comes from Creakwheel Mill, just across the creek. You can watch the wheel turn from my garden, if you have a minute to sit.','My kitchen, my rules. Today you are baking a loaf of bread.'],
  ansel:['Ah, a new face. I am Loremaster Ansel. This lodge keeps the record of every task the Holm has to offer.','Quests are the stories of this land: folk with troubles, and rewards for those who help them.'],
  durgin:['Mind your head down here. I am Foreman Durgin, and these are the Holm\'s ore workings.','Every blade on this island starts as rock in this cavern. Today you will make one yourself.'],
  corrick:['Stand straight. I am Warden Corrick, and this keep is where the Holm learns to fight.'],
  maud:['Welcome to the Holm Bank. I am Teller Maud.','Anything you leave with us is kept safe, and the same account opens at every bank on the mainland.'],
  ilse:['Welcome, seeker. I am Magister Ilse, and this tower is mine.','Magic runs on runes, and every spell you cast uses some up. Mind yours.'],
  aldous:['You found your way to Lastlight. I am Keeper Aldous. I have kept this light longer than I care to say.','The beacon has gone dark, and Tobin will not sail until it burns again.'],
  tobin:['So the light is burning again. I am Ferryman Tobin.','I tie up here in the cove because the beacon shines straight down on this water. No better mark to steer by.']};
 function has(id){try{return Player.count(id)>0}catch(e){return false}}
 function lit(){try{return !!scene.getObjectByName('island-campfire')}catch(e){return false}}
 var TEACH={
  study_route:function(){return ['See the relief chart on the table? Click it and have a look at the island before you set off.','It shows every place you will learn something: the camp, the bakehouse, the lodge, the quarry, the keep, the bank, the tower, and Lastlight out on the point.','Then out the back door and along the path west to the survival camp. Wenna will start you off with your first tools.']},
  // Wenna hands over the survival tools when this chat ends (tutorial_holm.js grantForStep, once she has been spoken to)
  equip_hatchet:function(){
   if(has('hatchet'))return ['You have your tools. Open your pack and click the bronze hatchet to wield it.','Then I will show you what it is for.'];
   if(spoken('wenna')&&typeof Player!=='undefined'&&Player.inv&&Player.inv.filter(function(s){return !s}).length<3)return ['Your pack is too full to take your tools. Make room for three things and ask me again.'];
   return ['Before anything else, you need tools. Here: a bronze hatchet, a tinderbox and a small net.','Open your pack and click the hatchet to wield it. Then I will show you what it is for.']},
  chop_logs:function(){return ['First, wood. The oaks on the rim of the hollow, just below us, are yours to cut. Click one and your hatchet will do the rest.','Keep at it until the logs come away. Some swings miss; that is woodcutting.','Logs in hand, you will want a fire. Ask me again if you forget how.']},
  // owner review 4: a fire is lit where you stand (2004), not at one set spot; any fire cooks
  light_fire:function(){return has('logs')
   ?['Good, you have logs. Now a fire: click the tinderbox in your pack, then click the logs.','You light it right where you stand. Any clear patch of ground will do, out here or down on the beach.','Stand clear once it catches. You will step aside on your own.']
   :['A fire needs logs. Chop one of the oaks on the rim of the hollow first.','Then click your tinderbox, then the logs, wherever you are standing.']},
  catch_fish:function(){return ['A fire wants something to cook, and the pond is full of perch.','Click the ripples on the water and you will cast your net. Some casts come up empty; keep at it.','Watch the pond. The fish move about, and when they do, the ripples go with them.']},
  cook_fish:function(){
   if(!has('raw_perch'))return ['You need a raw perch first. Net one from the ripples on the pond.','Then click your fire to cook it.'];
   if(!lit())return ['Your fire has burnt out. Chop more logs and light another with your tinderbox, wherever you like.','Then click the fire to cook your perch.'];
   return ['Now cook that perch. Click your fire and you will cook it.','If it burns, do not fret. Net another and try again. Everyone burns their first few.']},
  bake_bread:function(){
   if(has('bread_dough'))return ['That dough looks ready. Click the bread dough in your pack, then click the oven, to bake it.'];
   if(has('bucket_flour')&&has('bucket_water')&&has('dough'))return ['Flour, water and dough. Now knead them: click the dough in your pack.','Then click the bread dough, and then the oven, to bake your loaf.'];
   return ['Take two empty buckets from the rack by the door.','Fill one with flour at the pantry and the other with water at the butt.','Take some dough from the proving bowl, then click the dough in your pack to knead it all together.','Last of all, click your bread dough, then the oven. Watch it does not burn.']},
  learn_quests:function(){return ['The quest board lists every task the Holm has for you. Click it and read it.','Your quests are kept in the quest tab of your side panel too, so you never lose track.','When you are done, head for the Quarry Gate. Durgin\'s old shaft ladder rotted through, so take the coil of rope lying by the mine shaft, tie it to the frame and climb down to him.']},
  descend_cavern:function(){return ['At the Quarry Gate there is a coil of rope beside the mine shaft. Tie it to the frame, climb down, and I will meet you in the ore workings.']},
  mine_copper:function(){return ['Mining is simple enough. With a pickaxe in your pack, click a rock and you will mine it.','Copper shows orange in the rock, on the north face. Mine one copper ore.']},
  mine_tin:function(){return ['Now tin. It is the pale grey vein on the east wall. Mine one tin ore.','Copper and tin together make bronze.']},
  smelt_bronze:function(){return ['Copper and tin make bronze. Click the furnace in the smelting nook and choose a bronze bar.']},
  forge_dagger:function(){return ['Take your bar and hammer to the anvil. Click it and choose the bronze dagger.','Then follow the drift east, under the creek. The ladder at its end comes up through a trapdoor in the Warden\'s Keep, and Warden Corrick will want to see what you have made.']},
  melee_trial:function(){return ['Wield that bronze dagger: click it in your pack and it goes in your hand.','The grubkins in the court are tame; they snap, but only for show.','Click one to attack it, and stay on it until it drops.']},
  ranged_trial:function(){return ['Good. Now the shortbow. Click it in your pack to wield it; your arrows go with it.','Click a grubkin to shoot it. Keep your distance and keep shooting until it drops.']},
  open_bank:function(){return ['Click my counter to open your account and see what is inside.','Anything you store here is safe. When you are done, the Mage Tower is next.']},
  magic_trial:function(){return ['Gale and wit runes make Gale Dart, and you have both in your pack.','Open your spellbook and click Gale Dart to choose it.','Then click one of the grubkins in the yard. Each click casts once: choose Gale Dart again for the next. A spell can splash, just like a sword can miss.','With a staff in your hand, a chosen spell keeps casting on its own.']},
  relight_lastlight:function(){return ['Climb the three ladders to the lantern deck and pull the beacon lever.','Once the light is burning, take the Keeper\'s Stair down the cliff to Lanternfoot Cove. Tobin keeps his skiff at the pier there.']}};
 var st={npcs:[],api:null,mixers:[],talking:null,waved:{},ready:false,missing:{},gen:0};
 function nextOf(){return typeof Tutorial!=='undefined'&&!Tutorial.complete&&Tutorial.steps[Tutorial.step]?Tutorial.steps[Tutorial.step].id:null}
 function ownerOf(id){return CAST.filter(function(c){return c.lessons.indexOf(id)>=0})[0]}
 function spoken(id){return typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.talked(id)}
 // the tutor's turn: the current lesson is theirs (Tobin's once every lesson is done)
 function turn(c){if(typeof Tutorial==='undefined')return false;if(Tutorial.complete)return c.id==='tobin';var cur=nextOf();return !!cur&&c.lessons.indexOf(cur)>=0}
 function pages(c){
  var cur=nextOf(),hello=spoken(c.id)?[]:(HELLO[c.id]||[]);
  if(typeof Tutorial!=='undefined'&&Tutorial.complete)return c.id==='tobin'?hello.concat(['Lastlight is burning, so the skiff is ready whenever you are.','Board her at the end of the pier and I will row you across to Hearthmere.']):['You have finished your lessons. Tobin\'s skiff waits at Lanternfoot Cove, down the Keeper\'s Stair below Lastlight.'];
  if(cur&&c.lessons.indexOf(cur)>=0){var t=TEACH[cur];return hello.concat(t?t():['Go on then.'])}
  var o=cur&&ownerOf(cur);
  var done=c.lessons.length&&c.lessons.every(function(id){return Array.isArray(Tutorial.completedLessonIds)&&Tutorial.completedLessonIds.indexOf(id)>=0});
  if(done)return ['You have learned all I can teach here. '+(o?o.name+' is waiting for you next.':'')];
  if(c.id==='tobin')return ['No sailing until Lastlight is lit. The keeper will tell you how.'];
  return ['Not yet, friend. '+(o?o.name+' has a lesson for you first.':'Finish your current lesson first.')];
 }
 function play(n,name,fade){var a=n.actions[name];if(!a||n.current===a)return;Object.keys(n.actions).forEach(function(k){if(n.actions[k]!==a)n.actions[k].fadeOut(fade||.25)});a.reset().fadeIn(fade||.25).play();n.current=a}
 function worldStance(api,w){var best=null,d=Infinity;api.graphNodes().forEach(function(n){var k=Math.hypot(n.x-w[0],n.z-w[1]);if(k<d&&n.surface==='land'){d=k;best=n}});return best}
 function spot(api,c){
  // at: an arrival service, a building's measured target, or a world point (Wenna at the head of the Minnow Hollow path)
  var s=c.at.arrival?api.arrivalStance(c.at.arrival):c.at.world?worldStance(api,c.at.world):api.qaStance(c.at.building[0],c.at.building[1]);if(!s)return null;
  var nodes=api.graphNodes(),best=null,score=Infinity;
  nodes.forEach(function(n){var d=Math.hypot(n.x-s.x,n.z-s.z);if(d<1.2||d>2.9||Math.abs(n.y-s.y)>.4)return;var sc=Math.abs(d-1.6)+((n.x*3+n.z*5)%7)*.01;if(sc<score){score=sc;best=n}});
  return best&&{x:best.x,y:best.y,z:best.z,surface:best.surface,faceX:s.x,faceZ:s.z};
 }
 async function load(o){
  var T=o.THREE,api=o.api;st.api=api;st.ready=false;st.missing={};var gen=++st.gen;
  // goal audit 2026-09-29 (NPC lifecycle: failure): a model that fails to load is asked for once more; a tutor still
  // missing after that is recorded, and HolmIslandTalk stops gating their area on them (no lesson can wait on a tutor
  // who is not there); a load still in flight when the island is disposed (the ferry) adds nothing
  var fetchModel=function(url){return new Promise(function(ok,no){new T.GLTFLoader().load(url,ok,undefined,no)})};
  for(var i=0;i<CAST.length;i++){var c=CAST[i],p=spot(api,c);if(!p){st.missing[c.id]='no stance';continue}
   var gltf=null,url='assets/models/holm_tutor_'+c.id+'_v2.glb?v=42';for(var tries=0;tries<2&&!gltf;tries++){try{gltf=await fetchModel(url)}catch(e){if(tries)console.warn('[HolmIslandTutors] no model for '+c.id+'; their lessons go on without them',e&&e.message||e)}}
   if(gen!==st.gen)return {tutors:0,disposed:true};
   if(!gltf){st.missing[c.id]='model';continue}
   var root=gltf.scene,g=new T.Group();root.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.castShadow=true;m.frustumCulled=false;[].concat(m.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});
   if(typeof holmKitScale==='function')root.scale.setScalar(holmKitScale());   // kit v4: 1.5-tile people (kit default man 1.813 m)
   g.add(root);g.position.set(p.x,p.y,p.z);g.lookAt(p.faceX,p.y,p.faceZ);g.name='island-tutor-'+c.id;
   var mixer=new T.AnimationMixer(root),actions={};gltf.animations.forEach(function(cl){actions[cl.name]=mixer.clipAction(cl)});
   ['wave'].forEach(function(k){if(actions[k]){actions[k].setLoop(T.LoopOnce,1);actions[k].clampWhenFinished=true}});
   var n={cast:c,group:g,mixer:mixer,actions:actions,current:null,home:p};play(n,'idle',0);
   g.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.userData.kind='island_tutor';m.userData.label='Talk-to <b>'+c.name+'</b>';m.userData.islandTutor=c.id}});
   o.scene.add(g);o.WORLD.clickables.push(g);st.npcs.push(n);
  }
  st.ready=true;
  return {tutors:st.npcs.length,missing:Object.keys(st.missing)};
 }
 function byId(id){return st.npcs.filter(function(n){return n.cast.id===id})[0]}
 // the conversation: turn to face the player, gesture while the box is open, click through the pages
 function talk(id){
  var n=byId(id);if(!n||typeof UI==='undefined')return false;var ps=pages(n.cast),k=0;
  // on their turn, the chat opens their area's lessons once it ends (the banner and arrow then move on to the lesson)
  if(st.talking&&st.talking!==n)ended(st.talking);n.opens=turn(n.cast);
  n.group.lookAt(player.position.x,n.group.position.y,player.position.z);play(n,'talk');st.talking=n;
  (function show(){n.paging=false;var last=k>=ps.length-1;UI.dialogue(n.cast.name,ps[k],[{label:last?'Thanks.':'Continue',fn:function(){if(!last){k++;n.paging=true;setTimeout(show,0)}else ended(n)}}],'img:assets/icons/tutors/'+n.cast.id+'.png?v=42')})();
  return true;
 }
 // the chat is over (last page, or the box was closed): back to idle, and the tutor counts as spoken to
 // (owner review 4) the tutor then hands over their lesson's tools: markTalked refreshes the banner, which grants them
 // (tutorial_holm.js); asked again on their turn (a full pack the first time), the banner is refreshed to try again
 function ended(n){if(st.talking===n)st.talking=null;play(n,'idle');if(n.opens){n.opens=false;var first=typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.markTalked(n.cast.id);
  if(!first&&turn(n.cast))try{Tutorial.banner()}catch(e){}}
  // goal audit 2026-09-29: out of teaching runes or arrows (or without the bow) during their trial, the tutor tops the kit up
  try{if(typeof HolmCombatKits!=='undefined'&&HolmCombatKits.recover){if(n.cast.id==='ilse')HolmCombatKits.recover('magic',n.cast.name);else if(n.cast.id==='corrick')HolmCombatKits.recover('ranged',n.cast.name)}}catch(e){}}
 // v2 land phase 5 (draw calls): a tutor off screen is not drawn (the rigs keep frustumCulled off, as skinned bounds
 // shift while animating, so each tutor is culled here by a standing-height sphere instead; it still animates)
 var cull={f:null,m:null,s:null};
 function onScreen(n){if(typeof camera==='undefined'||typeof THREE==='undefined'||!camera.projectionMatrix)return true;cull.f=cull.f||new THREE.Frustum();cull.m=cull.m||new THREE.Matrix4();cull.s=cull.s||new THREE.Sphere();
  cull.m.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);cull.f.setFromProjectionMatrix(cull.m);cull.s.center.copy(n.group.position);cull.s.center.y+=1;cull.s.radius=1.8;return cull.f.intersectsSphere(cull.s)}
 function update(dt){
  st.npcs.forEach(function(n){n.mixer.update(dt);n.group.visible=onScreen(n);
   // wave once when the player first comes near, then settle back to idle
   var d=typeof player!=='undefined'?Math.hypot(player.position.x-n.group.position.x,player.position.z-n.group.position.z):99;
   if(d<4.5&&!st.waved[n.cast.id]&&st.talking!==n){st.waved[n.cast.id]=true;n.group.lookAt(player.position.x,n.group.position.y,player.position.z);play(n,'wave');
    setTimeout(function(){if(st.talking!==n)play(n,'idle')},1400)}
   if(st.talking===n&&!n.paging&&typeof document!=='undefined'){var m=document.getElementById('dialogue-modal');if(m&&m.style.display==='none')ended(n)}});
 }
 // unload with the island (the ferry to the mainland): off the scene and the clickables, animation stopped, GPU buffers
 // freed, and the conversation / wave state cleared, so a later island load starts clean
 function dispose(W,scene){st.gen++;st.npcs.forEach(function(n){scene.remove(n.group);var i=W.clickables.indexOf(n.group);if(i>=0)W.clickables.splice(i,1);
  try{n.mixer.stopAllAction();n.mixer.uncacheRoot(n.group.children[0]||n.group)}catch(e){}
  n.group.traverse(function(m){if(m.geometry&&m.geometry.dispose)m.geometry.dispose();[].concat(m.material||[]).forEach(function(q){if(q&&q.map&&q.map.dispose)q.map.dispose();if(q&&q.dispose)q.dispose()})})});
 st.npcs=[];st.talking=null;st.waved={};st.ready=false;st.missing={}}
 // the building a tutor stands inside (their stance is an interior floor), else null: the guide leads to its door first
 function inside(id){var n=byId(id),s=n&&n.home&&n.home.surface||'',m=/^b:([^:]+):/.exec(s);return m&&!/(:(IslandTerrain|StagedTerrain))$/.test(s)?m[1]:null}
 return {load:load,update:update,talk:talk,dispose:dispose,inside:inside,ready:function(){return st.ready},present:function(id){return !!byId(id)},missing:function(){return Object.assign({},st.missing)},cast:function(){return CAST.slice()},tutors:function(){return st.npcs.map(function(n){return {id:n.cast.id,name:n.cast.name,x:n.group.position.x,z:n.group.position.z}})},pages:function(id){var n=byId(id);return n?pages(n.cast):null},
  // what a tutor would say right now (no model needed; tests and QA read it)
  lines:function(id){var c=CAST.filter(function(q){return q.id===id})[0];return c?pages(c):null}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandTutors;
