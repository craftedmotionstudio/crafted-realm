/* Tutor's Holm island draft tutors (finish goal M6.1): one tutor per area, the 2004 Tutorial Island pattern rebuilt
 * as our own. Each is a Blender-rigged character (assets/models/holm_tutor_<id>.glb: idle, talk, walk, wave) standing
 * beside their lesson station. Clicking a tutor walks the player to them (the island graph) and opens chat-box
 * dialogue, click to continue, that knows where the player is in the 18-lesson curriculum: before their turn they
 * point the way back, on their turn they teach the lesson step by step, after it they send the player on. Tutors turn
 * to face the player, wave when first approached and gesture while talking. Island draft only (?holmIsland=1). */
var HolmIslandTutors=(function(){
 'use strict';
 // id, name, where they stand (a building's measured target or an arrival service), the lessons they teach, and a face
 var CAST=[
  {id:'bram',name:'Guide Bram',at:{arrival:'holm_orientation'},lessons:['study_route','equip_hatchet'],face:'🧓'},
  {id:'wenna',name:'Wenna',at:{building:['survival','tools']},lessons:['chop_logs','light_fire','catch_fish','cook_fish'],face:'🧝'},
  {id:'hettie',name:'Cook Hettie',at:{building:['bakehouse','prep']},lessons:['bake_bread'],face:'👩‍🍳'},
  {id:'ansel',name:'Loremaster Ansel',at:{building:['lodge','map']},lessons:['learn_quests'],face:'🧑‍🏫'},
  {id:'durgin',name:'Foreman Durgin',at:{building:['cavern','ladder']},lessons:['descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger'],face:'🧔'},
  {id:'corrick',name:'Warden Corrick',at:{building:['keep','court']},lessons:['melee_trial','ranged_trial'],face:'💂'},
  {id:'maud',name:'Teller Maud',at:{building:['bank','counter']},lessons:['open_bank'],face:'👩‍💼'},
  {id:'ilse',name:'Magister Ilse',at:{building:['mage','entrance']},lessons:['magic_trial'],face:'🧙'},
  {id:'aldous',name:'Keeper Aldous',at:{building:['lastlight','stores']},lessons:['relight_lastlight'],face:'👴'},
  {id:'tobin',name:'Ferryman Tobin',at:{building:['haven','notice']},lessons:[],face:'🧑'}];
 // our own lesson talk: each page is one click-to-continue box
 var TEACH={
  study_route:['Welcome to Tutor\'s Holm. Every adventurer starts here, and I start every adventurer.','See the relief chart on the table? Click it and study the island: the camp, the bakehouse, the lodge, the quarry, the keep, the bank, the tower and Lastlight on the point.'],
  equip_hatchet:['Good. Now your tools: take them from the provision rack by the wall.','Open your pack and click the bronze hatchet to wield it. Then follow the path west to Wenna at the survival camp.'],
  chop_logs:['A hatchet in your hand already? Good. Pick any of the three oaks by the camp and click it.','Keep at it until the logs come away. Some swings miss; that is woodcutting.'],
  light_fire:['Logs. Now use your tinderbox on them: click the tinderbox, then the logs.','Stand clear of the fire once it catches. You will step aside on your own.'],
  catch_fish:['Down the bank stair is the fishing stage. Click your small net, then the ripples in the creek.'],
  cook_fish:['Now cook that perch on your fire. Click the fire.','If it burns, do not fret. Net another and try again. Everyone burns their first few.'],
  bake_bread:['My kitchen, my rules: take a bucket from the rack, fill one with flour at the pantry and one with water at the butt.','Take dough from the proving bowl, use the flour on it to knead, and bake the dough in the oven.'],
  learn_quests:['The quest board lists every task the Holm has for you. Click it and read it.','When you are done, the Quarry Gate to the north will let you down the shaft.'],
  descend_cavern:['At the Quarry Gate you will find the shaft ladder. Climb down and I will meet you in the ore workings.'],
  mine_copper:['Copper shows orange in the rock. Click a copper rock with your pickaxe in your pack.'],
  mine_tin:['Tin is the pale grey vein. Mine one tin ore.'],
  smelt_bronze:['Copper and tin make bronze. Click the furnace and choose a bronze bar.'],
  forge_dagger:['Take your bar and hammer to the anvil and make a bronze dagger. Then climb back up the ladder.'],
  melee_trial:['Wield that dagger and show me a clean fight. The grubkins in the court are tame; they snap, but only for show.','Click one to attack. Stay on it until it drops.'],
  ranged_trial:['Now a shortbow and arrows. Wield the bow and strike a grubkin from range.'],
  open_bank:['Welcome to the Holm Bank. Click my counter to open your account. Anything you store here is safe.'],
  magic_trial:['Magic needs runes: air and mind make Wind Strike. Open your spellbook and pick it.','Then click a grubkin. A spell can miss, just like a sword. Cast again.'],
  relight_lastlight:['Up three ladders to the lantern deck. Pull the beacon lever and the ferry will see the light.']};
 var st={npcs:[],api:null,mixers:[],talking:null,waved:{}};
 function nextOf(){return typeof Tutorial!=='undefined'&&!Tutorial.complete&&Tutorial.steps[Tutorial.step]?Tutorial.steps[Tutorial.step].id:null}
 function ownerOf(id){return CAST.filter(function(c){return c.lessons.indexOf(id)>=0})[0]}
 function pages(c){
  var cur=nextOf();
  if(typeof Tutorial!=='undefined'&&Tutorial.complete)return c.id==='tobin'?['Lastlight is burning. The skiff is ready whenever you are.','Board her at the end of the pier and I will row you to the mainland.']:['You have finished your lessons. Tobin\'s skiff waits at the Departure Haven.'];
  if(cur&&c.lessons.indexOf(cur)>=0)return TEACH[cur]||['Go on then.'];
  var o=cur&&ownerOf(cur);
  var done=c.lessons.length&&c.lessons.every(function(id){return Array.isArray(Tutorial.completedLessonIds)&&Tutorial.completedLessonIds.indexOf(id)>=0});
  if(done)return ['You have learned all I can teach here. '+(o?o.name+' is waiting for you next.':'')];
  if(c.id==='tobin')return ['No sailing until Lastlight is lit. The keeper will tell you how.'];
  return ['Not yet, friend. '+(o?o.name+' has a lesson for you first.':'Finish your current lesson first.')];
 }
 function play(n,name,fade){var a=n.actions[name];if(!a||n.current===a)return;Object.keys(n.actions).forEach(function(k){if(n.actions[k]!==a)n.actions[k].fadeOut(fade||.25)});a.reset().fadeIn(fade||.25).play();n.current=a}
 function spot(api,c){
  var s=c.at.arrival?api.arrivalStance(c.at.arrival):api.qaStance(c.at.building[0],c.at.building[1]);if(!s)return null;
  var nodes=api.graphNodes(),best=null,score=Infinity;
  nodes.forEach(function(n){var d=Math.hypot(n.x-s.x,n.z-s.z);if(d<1.2||d>2.9||Math.abs(n.y-s.y)>.4)return;var sc=Math.abs(d-1.6)+((n.x*3+n.z*5)%7)*.01;if(sc<score){score=sc;best=n}});
  return best&&{x:best.x,y:best.y,z:best.z,faceX:s.x,faceZ:s.z};
 }
 async function load(o){
  var T=o.THREE,api=o.api;st.api=api;
  for(var i=0;i<CAST.length;i++){var c=CAST[i],p=spot(api,c);if(!p)continue;
   var gltf;try{gltf=await new Promise(function(ok,no){new T.GLTFLoader().load('assets/models/holm_tutor_'+c.id+'.glb',ok,undefined,no)})}catch(e){console.error('[HolmIslandTutors] no model for '+c.id);continue}
   var root=gltf.scene,g=new T.Group();root.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.castShadow=true;m.frustumCulled=false;[].concat(m.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});
   g.add(root);g.position.set(p.x,p.y,p.z);g.lookAt(p.faceX,p.y,p.faceZ);g.name='island-tutor-'+c.id;
   var mixer=new T.AnimationMixer(root),actions={};gltf.animations.forEach(function(cl){actions[cl.name]=mixer.clipAction(cl)});
   ['wave'].forEach(function(k){if(actions[k]){actions[k].setLoop(T.LoopOnce,1);actions[k].clampWhenFinished=true}});
   var n={cast:c,group:g,mixer:mixer,actions:actions,current:null,home:p};play(n,'idle',0);
   g.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.userData.kind='island_tutor';m.userData.label='Talk-to <b>'+c.name+'</b>';m.userData.islandTutor=c.id}});
   o.scene.add(g);o.WORLD.clickables.push(g);st.npcs.push(n);
  }
  return {tutors:st.npcs.length};
 }
 function byId(id){return st.npcs.filter(function(n){return n.cast.id===id})[0]}
 // the conversation: turn to face the player, gesture while the box is open, click through the pages
 function talk(id){
  var n=byId(id);if(!n||typeof UI==='undefined')return false;var ps=pages(n.cast),k=0;
  n.group.lookAt(player.position.x,n.group.position.y,player.position.z);play(n,'talk');st.talking=n;
  (function show(){var last=k>=ps.length-1;UI.dialogue(n.cast.name,ps[k],[{label:last?'Thanks.':'Continue',fn:function(){if(!last){k++;setTimeout(show,0)}else{st.talking=null;play(n,'idle')}}}],n.cast.face)})();
  return true;
 }
 function update(dt){
  st.npcs.forEach(function(n){n.mixer.update(dt);
   // wave once when the player first comes near, then settle back to idle
   var d=typeof player!=='undefined'?Math.hypot(player.position.x-n.group.position.x,player.position.z-n.group.position.z):99;
   if(d<4.5&&!st.waved[n.cast.id]&&st.talking!==n){st.waved[n.cast.id]=true;n.group.lookAt(player.position.x,n.group.position.y,player.position.z);play(n,'wave');
    setTimeout(function(){if(st.talking!==n)play(n,'idle')},1400)}
   if(st.talking===n&&typeof document!=='undefined'){var m=document.getElementById('dialogue-modal');if(m&&m.style.display==='none'){st.talking=null;play(n,'idle')}}});
 }
 function dispose(W,scene){st.npcs.forEach(function(n){scene.remove(n.group);var i=W.clickables.indexOf(n.group);if(i>=0)W.clickables.splice(i,1)});st.npcs=[]}
 return {load:load,update:update,talk:talk,dispose:dispose,cast:function(){return CAST.slice()},tutors:function(){return st.npcs.map(function(n){return {id:n.cast.id,name:n.cast.name,x:n.group.position.x,z:n.group.position.z}})},pages:function(id){var n=byId(id);return n?pages(n.cast):null}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandTutors;
