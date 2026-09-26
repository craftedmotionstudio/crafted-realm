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
  {id:'bram',name:'Guide Bram',at:{arrival:'holm_orientation'},lessons:['study_route','equip_hatchet'],face:'🧓',examine:'The Holm\'s guide. He has welcomed more new arrivals than he can count.'},
  {id:'wenna',name:'Wenna',at:{building:['survival','logs']},lessons:['chop_logs','light_fire','catch_fish','cook_fish'],face:'🧝',examine:'A hardy woman who lives off the land at the survival camp.'},
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
  wenna:['Hello there. I am Wenna, and this is the survival camp.','Out here you learn to look after yourself: wood, fire, fish and a hot supper.'],
  hettie:['Mind the flour. I am Cook Hettie, and this is my bakehouse.','My kitchen, my rules. Today you are baking a loaf of bread.'],
  ansel:['Ah, a new face. I am Loremaster Ansel. This lodge keeps the record of every task the Holm has to offer.','Quests are the stories of this land: folk with troubles, and rewards for those who help them.'],
  durgin:['Mind your head down here. I am Foreman Durgin, and these are the Holm\'s ore workings.','Every blade on this island starts as rock in this cavern. Today you will make one yourself.'],
  corrick:['Stand straight. I am Warden Corrick, and this keep is where the Holm learns to fight.'],
  maud:['Welcome to the Holm Bank. I am Teller Maud.','Anything you leave with us is kept safe, and the same account opens at every bank on the mainland.'],
  ilse:['Welcome, seeker. I am Magister Ilse, and this tower is mine.','Magic runs on runes, and every spell you cast uses some up. Mind yours.'],
  aldous:['You found your way to Lastlight. I am Keeper Aldous. I have kept this light longer than I care to say.','The beacon has gone dark, and Tobin will not sail until it burns again.'],
  tobin:['So the light is burning again. I am Ferryman Tobin.']};
 function has(id){try{return Player.count(id)>0}catch(e){return false}}
 function lit(){try{return !!scene.getObjectByName('island-campfire')}catch(e){return false}}
 var TEACH={
  study_route:function(){return ['See the relief chart on the table? Click it and study the island before you set off.','It shows every place you will learn something: the camp, the bakehouse, the lodge, the quarry, the keep, the bank, the tower, and Lastlight out on the point.','After that, your tools. They hang on the provision rack by the wall: a hatchet, a tinderbox, a net and the rest. Click the rack to take them.']},
  equip_hatchet:function(){return has('hatchet')
   ?['You have your tools. Open your pack and click the bronze hatchet to wield it.','Then follow the path west to the survival camp. Wenna will show you what a hatchet is for.']
   :['Your tools are on the provision rack by the wall. Click the rack to take them.','Then open your pack and click the bronze hatchet to wield it.']},
  chop_logs:function(){return ['First, wood. Click one of the oaks by the camp and your hatchet will do the rest.','Keep at it until the logs come away. Some swings miss; that is woodcutting.','Logs in hand, you will want a fire. Ask me again if you forget how.']},
  light_fire:function(){return has('logs')
   ?['Good, you have logs. Now for a fire.','Click the tinderbox in your pack, then click the logs.','Stand clear once it catches. You will step aside on your own.']
   :['A fire needs logs. Chop one of the oaks by the camp first.','Then click your tinderbox, then the logs.']},
  catch_fish:function(){return ['A fire wants something to cook. Take the bank stair down to the fishing stage over the creek.','Click the small net in your pack, then click the ripples in the water.','Keep netting until you land a perch.']},
  cook_fish:function(){
   if(!has('raw_perch'))return ['You need a raw perch first. Net one from the ripples off the fishing stage.','Then bring it back and click your fire to cook it.'];
   if(!lit())return ['Your fire has burnt out. Chop more logs and light another with your tinderbox.','Then click the fire to cook your perch.'];
   return ['Now cook that perch. Click your fire and you will cook it.','If it burns, do not fret. Net another and try again. Everyone burns their first few.']},
  bake_bread:function(){
   if(has('bread_dough'))return ['That dough looks ready. Click the bread dough in your pack, then click the oven, to bake it.'];
   if(has('bucket_flour')&&has('bucket_water')&&has('dough'))return ['Flour, water and dough. Now knead them: click the dough in your pack.','Then click the bread dough, and then the oven, to bake your loaf.'];
   return ['Take two empty buckets from the rack by the door.','Fill one with flour at the pantry and the other with water at the butt.','Take some dough from the proving bowl, then click the dough in your pack to knead it all together.','Last of all, click your bread dough, then the oven. Watch it does not burn.']},
  learn_quests:function(){return ['The quest board lists every task the Holm has for you. Click it and read it.','Your quests are kept in the quest tab of your side panel too, so you never lose track.','When you are done, head for the Quarry Gate. The shaft ladder there takes you down to Foreman Durgin.']},
  descend_cavern:function(){return ['At the Quarry Gate you will find the shaft ladder. Climb down and I will meet you in the ore workings.']},
  mine_copper:function(){return ['Mining is simple enough. With a pickaxe in your pack, click a rock and you will mine it.','Copper shows orange in the rock, on the north face. Mine one copper ore.']},
  mine_tin:function(){return ['Now tin. It is the pale grey vein on the east wall. Mine one tin ore.','Copper and tin together make bronze.']},
  smelt_bronze:function(){return ['Copper and tin make bronze. Click the furnace in the smelting nook and choose a bronze bar.']},
  forge_dagger:function(){return ['Take your bar and hammer to the anvil. Click it and choose the bronze dagger.','Then climb back up the ladder. Warden Corrick at the keep will want to see what you have made.']},
  melee_trial:function(){return ['Wield that bronze dagger: click it in your pack and it goes in your hand.','The grubkins in the court are tame; they snap, but only for show.','Click one to attack it, and stay on it until it drops.']},
  ranged_trial:function(){return ['Good. Now the shortbow. Click it in your pack to wield it; your arrows go with it.','Click a grubkin to shoot it. Keep your distance and keep shooting until it drops.']},
  open_bank:function(){return ['Click my counter to open your account and see what is inside.','Anything you store here is safe. When you are done, the Mage Tower is next.']},
  magic_trial:function(){return ['Air and mind runes make Wind Strike, and you have both in your pack.','Open your spellbook and click Wind Strike to choose it.','Then click one of the grubkins in the yard. A spell can miss, just like a sword. Cast again.']},
  relight_lastlight:function(){return ['Climb the three ladders to the lantern deck and pull the beacon lever.','Once the light is burning, go down to the haven. Tobin will row you across.']}};
 var st={npcs:[],api:null,mixers:[],talking:null,waved:{}};
 function nextOf(){return typeof Tutorial!=='undefined'&&!Tutorial.complete&&Tutorial.steps[Tutorial.step]?Tutorial.steps[Tutorial.step].id:null}
 function ownerOf(id){return CAST.filter(function(c){return c.lessons.indexOf(id)>=0})[0]}
 function spoken(id){return typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.talked(id)}
 // the tutor's turn: the current lesson is theirs (Tobin's once every lesson is done)
 function turn(c){if(typeof Tutorial==='undefined')return false;if(Tutorial.complete)return c.id==='tobin';var cur=nextOf();return !!cur&&c.lessons.indexOf(cur)>=0}
 function pages(c){
  var cur=nextOf(),hello=spoken(c.id)?[]:(HELLO[c.id]||[]);
  if(typeof Tutorial!=='undefined'&&Tutorial.complete)return c.id==='tobin'?hello.concat(['Lastlight is burning, so the skiff is ready whenever you are.','Board her at the end of the pier and I will row you across to the mainland.']):['You have finished your lessons. Tobin\'s skiff waits at the Departure Haven.'];
  if(cur&&c.lessons.indexOf(cur)>=0){var t=TEACH[cur];return hello.concat(t?t():['Go on then.'])}
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
  return best&&{x:best.x,y:best.y,z:best.z,surface:best.surface,faceX:s.x,faceZ:s.z};
 }
 async function load(o){
  var T=o.THREE,api=o.api;st.api=api;
  for(var i=0;i<CAST.length;i++){var c=CAST[i],p=spot(api,c);if(!p)continue;
   var gltf;try{gltf=await new Promise(function(ok,no){new T.GLTFLoader().load('assets/models/holm_tutor_'+c.id+'_v2.glb?v=30',ok,undefined,no)})}catch(e){console.error('[HolmIslandTutors] no model for '+c.id);continue}
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
  // on their turn, the chat opens their area's lessons once it ends (the banner and arrow then move on to the lesson)
  if(st.talking&&st.talking!==n)ended(st.talking);n.opens=turn(n.cast);
  n.group.lookAt(player.position.x,n.group.position.y,player.position.z);play(n,'talk');st.talking=n;
  (function show(){n.paging=false;var last=k>=ps.length-1;UI.dialogue(n.cast.name,ps[k],[{label:last?'Thanks.':'Continue',fn:function(){if(!last){k++;n.paging=true;setTimeout(show,0)}else ended(n)}}],'img:assets/icons/tutors/'+n.cast.id+'.png?v=30')})();
  return true;
 }
 // the chat is over (last page, or the box was closed): back to idle, and the tutor counts as spoken to
 function ended(n){if(st.talking===n)st.talking=null;play(n,'idle');if(n.opens){n.opens=false;if(typeof HolmIslandTalk!=='undefined')HolmIslandTalk.markTalked(n.cast.id)}}
 function update(dt){
  st.npcs.forEach(function(n){n.mixer.update(dt);
   // wave once when the player first comes near, then settle back to idle
   var d=typeof player!=='undefined'?Math.hypot(player.position.x-n.group.position.x,player.position.z-n.group.position.z):99;
   if(d<4.5&&!st.waved[n.cast.id]&&st.talking!==n){st.waved[n.cast.id]=true;n.group.lookAt(player.position.x,n.group.position.y,player.position.z);play(n,'wave');
    setTimeout(function(){if(st.talking!==n)play(n,'idle')},1400)}
   if(st.talking===n&&!n.paging&&typeof document!=='undefined'){var m=document.getElementById('dialogue-modal');if(m&&m.style.display==='none')ended(n)}});
 }
 function dispose(W,scene){st.npcs.forEach(function(n){scene.remove(n.group);var i=W.clickables.indexOf(n.group);if(i>=0)W.clickables.splice(i,1)});st.npcs=[]}
 // the building a tutor stands inside (their stance is an interior floor), else null: the guide leads to its door first
 function inside(id){var n=byId(id),s=n&&n.home&&n.home.surface||'',m=/^b:([^:]+):/.exec(s);return m&&!/(:(IslandTerrain|StagedTerrain))$/.test(s)?m[1]:null}
 return {load:load,update:update,talk:talk,dispose:dispose,inside:inside,cast:function(){return CAST.slice()},tutors:function(){return st.npcs.map(function(n){return {id:n.cast.id,name:n.cast.name,x:n.group.position.x,z:n.group.position.z}})},pages:function(id){var n=byId(id);return n?pages(n.cast):null},
  // what a tutor would say right now (no model needed; tests and QA read it)
  lines:function(id){var c=CAST.filter(function(q){return q.id===id})[0];return c?pages(c):null}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandTutors;
