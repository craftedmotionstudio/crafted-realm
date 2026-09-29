/* test_anim_no_stuck.js -- headless gate for the player's animation state (owner bug report 2026-09-29: "Sometimes when
 * our character is performing an animation, they get stuck doing that same animation"). The real modules run in a
 * vm against a small AnimationMixer that keeps three.js r128's action rules (LoopRepeat by default, a LoopOnce clip
 * disables itself at its end unless clamped, stop() deactivates); the kit player is installed through its own load()
 * and update(), and every frame is stepped through fx_humanoid's playerGLBAnim, as the game does in every mode:
 *  1. the guard (blockReact) plays once and lets go -- the kit's block clip comes out of the GLB as LoopRepeat, and
 *     a 0 splat used to leave the adventurer (and kit NPCs, and other online adventurers) holding it for good;
 *  2. a held skilling loop (chop / net / the fire-lighting kneel) ends with its action, on a new action, or on a walk
 *     -- driven from the animation step itself, so it also ends off the island (the mainland after the ferry), where
 *     nothing calls HolmIslandPlayer.update;
 *  3. a one-shot stroke bound to an action (a cook, a smelt, a hammer blow, a pick swing) ends with that action; a walk
 *     ends any non-combat clip (a stroke, a ladder climb, the knot at the shaft, a bake) at once, while a combat swing,
 *     a flinch or a guard plays out;
 *  4. the cook stroke repeats only while standing at the fire (never on the walk there);
 *  5. the death pose owns the body until the respawn (no skilling clip on top, no idle blended under it);
 *  6. a new clip takes the body from a running one-shot (no two clips at full weight), and an emote still ends on a walk;
 *  7. a gait preset switch mid-action leaves no orphaned idle / walk / run action;
 *  8. SkillTiming is untouched (the 2004 stroke lengths, loops and tick counts are the same numbers);
 *  9. the tool in the hand (HolmSkillTools) follows what a clip is played FOR: the cook reach borrowed to knot the shaft
 *     rope holds nothing (it used to show a raw fish), a bake holds the dough, an action holds its own tool, and nothing is
 *     held once the body is back on idle; off the island the main loop steps HolmIslandPlayer.update (tools put away).
 * Run: node tools/test_anim_no_stuck.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m)}};

/* ---------------- a small AnimationMixer with three.js r128's action semantics ---------------- */
const LoopOnce=2200,LoopRepeat=2201;
function Mixer(){this._actions=[];this._active=[]}
Mixer.prototype.clipAction=function(clip){let a=this._actions.find(x=>x._clip===clip);if(!a){a=new Action(this,clip);this._actions.push(a)}return a};
Mixer.prototype._isActiveAction=function(a){return this._active.indexOf(a)>=0};
Mixer.prototype.update=function(dt){this._active.slice().forEach(a=>a._step(dt));return this};
function Action(m,clip){this._mixer=m;this._clip=clip;this.loop=LoopRepeat;this.repetitions=Infinity;this.enabled=true;this.paused=false;this.weight=1;this.timeScale=1;this.time=0;this.clampWhenFinished=false;this._eff=0}
Action.prototype.play=function(){if(!this._mixer._isActiveAction(this))this._mixer._active.push(this);return this};
Action.prototype.reset=function(){this.paused=false;this.enabled=true;this.time=0;return this};
Action.prototype.stop=function(){const i=this._mixer._active.indexOf(this);if(i>=0)this._mixer._active.splice(i,1);return this.reset()};
Action.prototype.isRunning=function(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._mixer._isActiveAction(this)};
Action.prototype.isScheduled=function(){return this._mixer._isActiveAction(this)};
Action.prototype.setLoop=function(mode,reps){this.loop=mode;this.repetitions=reps;return this};
Action.prototype.getClip=function(){return this._clip};
Action.prototype.getEffectiveWeight=function(){return this._eff};
Action.prototype._step=function(dt){if(!this.enabled){this._eff=0;return}
  if(!this.paused){let t=this.time+dt*this.timeScale;const d=this._clip.duration;
    if(this.loop===LoopOnce){if(t>=d){t=d;if(this.clampWhenFinished)this.paused=true;else this.enabled=false}}else t=t%d;this.time=t}
  this._eff=this.enabled?this.weight:0};

/* ---------------- scene stubs: just what the modules touch ---------------- */
function V(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0}
V.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this};V.prototype.copy=function(p){this.x=p.x;this.y=p.y;this.z=p.z;return this};
V.prototype.clone=function(){return new V(this.x,this.y,this.z)};V.prototype.distanceTo=function(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)};
function Obj(name){this.name=name||'';this.userData={};this.children=[];this.parent=null;this.position=new V();this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1,setScalar(s){this.x=this.y=this.z=s}};this.visible=true}
Obj.prototype.add=function(c){this.children.push(c);c.parent=this;return this};Obj.prototype.traverse=function(f){f(this);this.children.forEach(c=>c.traverse(f))};
Obj.prototype.updateMatrixWorld=function(){};Obj.prototype.lookAt=function(){};
const THREE={LoopOnce,LoopRepeat,AnimationMixer:Mixer,Group:Obj,Vector3:V,Quaternion:function(){},
  Box3:function(){this.min=new V(0,0,0);this.max=new V(0,1.85,0);this.expandByObject=()=>this}};
const CLIPS={idle:2,walk:.93,run:.67,attack:.6,attack_slash:.6,attack_stab:.6,attack_crush:.7,bow:1.2,cast:1,block:.4,hit:.4,death:1.33,
  chop:1,net:1.6,firemake:1,cook:1.33,cook_range:2,mine:1,smelt:1.2,smith:1,climb:1,emote_wave:1.6,emote_dance:1.87,wave:1.33};
function kitGltf(){return {scene:new Obj('kit'),animations:Object.keys(CLIPS).map(n=>({name:n,duration:CLIPS[n]}))}}

function world(){
  const box={console,Date,Math,Promise,JSON,Object,Array,String,Number,Boolean,RegExp,Error,isFinite,parseInt,URLSearchParams,setTimeout,clearTimeout,
    addEventListener(){},THREE,module:undefined};
  box.globalThis=box;box.window=box;
  THREE.GLTFLoader=function(){this.load=function(url,okf){okf(kitGltf())}};
  box.scene={add(){},remove(){}};box.player=new Obj('code-built');
  box.Player={action:null,dead:false,equip:{head:null,weapon:null},inv:[],count(id){return this.inv.filter(x=>x&&x.id===id).length}};
  box.ITEMS={hatchet:{tool:'woodcutting',power:1,equip:'weapon'},pickaxe:{tool:'mining',power:1,equip:'weapon'}};
  box.HolmItems={ids:['fishing_net','tinderbox','raw_perch','bread_dough','dough','hammer','copper_ore','tin_ore']};
  box.CombatFX={speedFor:n=>({bow:1.35,cast:1.15})[n]||1};
  box.swing=function(){};   // the game's own (game3_systems.js); HolmIslandPlayer hooks it for the kit player
  vm.createContext(box);
  for(const f of ['skill_timing.js','fx_humanoid.js','holm_island_player.js','holm_gait_options.js','holm_skill_tools.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT,'src',f),'utf8'),box,{filename:f});
  // blockReact, the game's guard for a 0 splat (game2_world.js), taken verbatim from the source
  const g2=fs.readFileSync(path.join(ROOT,'src','game2_world.js'),'utf8'),at=g2.indexOf('function blockReact(g)'),end=g2.indexOf('\nfunction tickBlock',at);
  ok(at>0&&end>at,'game2_world.js still defines blockReact before tickBlock');
  vm.runInContext(g2.slice(at,end),box,{filename:'game2_world.js#blockReact'});
  return box;
}
async function kitWorld(){
  const W=world(),H=vm.runInContext('HolmIslandPlayer',W);
  await H.load();H.update();                            // install: the kit replaces the code-built adventurer
  ok(H.active(),'the kit player installs through load() + update()');
  const P=W.player,gm=P.userData.gmix;
  const step=(moving,n,dt)=>{for(let i=0;i<(n||1);i++)vm.runInContext('playerGLBAnim(player,'+(dt||1/60)+','+(!!moving)+',1)',W)};
  const acts=()=>gm.mixer._active.filter(a=>a.enabled&&a.getEffectiveWeight()>1e-3).map(a=>a.getClip().name);
  const stray=()=>acts().filter(n=>!/^(idle|walk|run)(_[A-Z])?$/.test(n));
  const loopers=()=>gm.mixer._active.filter(a=>a.isRunning()&&a.loop===LoopRepeat&&[gm.idle,gm.walk,gm.run].indexOf(a)<0).map(a=>a.getClip().name);
  const locoW=()=>[gm.idle,gm.walk,gm.run].filter(Boolean).reduce((s,a)=>s+a.getEffectiveWeight(),0);
  const clean=()=>!stray().length&&!loopers().length&&locoW()>.95;
  return {W,H,P,gm,step,acts,stray,loopers,locoW,clean,swing:(t)=>vm.runInContext('swing(player,'+JSON.stringify(t)+')',W)};
}
const tree={position:new V(1,0,0),userData:{rtype:'tree',alive:true}},pond={position:new V(1,0,0),userData:{rtype:'fish',alive:true}},
  rock={position:new V(1,0,0),userData:{rtype:'rock',alive:true}},fire={position:new V(1,0,0),userData:{kind:'fire'}},
  furnace={position:new V(1,0,0),userData:{kind:'furnace'}};

(async()=>{
  /* 1: the guard plays once */
  {const K=await kitWorld();
    ok(K.gm.block&&K.gm.block.loop===LoopRepeat,'precondition: the kit block clip arrives as LoopRepeat (the GLB default)');
    K.W.blockReact(K.P);K.step(false,3);ok(K.stray().indexOf('block')>=0,'a 0 splat raises the guard');
    K.step(false,40);ok(K.clean(),'...and the guard comes down by itself (block plays once): '+K.acts().join(','));
    K.W.blockReact(K.P);K.step(true,40);ok(K.clean(),'a guard raised on the walk lets go too: '+K.acts().join(','));
    // any gmix humanoid with a block clip (kit NPCs, other online adventurers)
    const m=new Mixer(),npc=new Obj('kit-npc'),b=m.clipAction({name:'block',duration:.4});npc.userData.gmix={mixer:m,block:b};
    K.W.blockReact(npc);m.update(.2);ok(b.isRunning(),'a kit NPC raises the guard');m.update(.3);ok(!b.isRunning(),'...and lets go (LoopOnce)');}

  /* 2: held skilling loops */
  {const K=await kitWorld(),P=K.W.Player;
    P.action={type:'gather',obj:tree};K.swing('slash');K.step(false,30);
    ok(K.stray().join()==='chop'&&K.loopers().join()==='chop','a tree gather plays the chop loop');
    K.swing('slash');K.step(false,30);ok(K.stray().join()==='chop','the per-tick roll keeps one chop (no restart pile-up)');
    P.action=null;K.step(false,1);ok(K.clean(),'the chop ends in the very next animation step when the action ends (no HolmIslandPlayer.update needed: the mainland case)');
    P.action={type:'gather',obj:tree};K.swing('slash');K.step(false,5);K.step(true,1);ok(K.clean(),'a walk ends the chop at once');
    P.action={type:'gather',obj:pond};K.swing('cast');K.step(false,5);ok(K.stray().join()==='net','a fishing spot plays the net loop');
    P.action={type:'gather',obj:tree};K.step(false,1);ok(K.stray().indexOf('net')<0,'a new action (the next tree) ends the net loop');
    P.action={type:'lightfire',t:0};K.swing();K.step(false,5);ok(K.stray().join()==='firemake','lighting a fire kneels (the firemake loop)');
    P.action=null;K.step(false,1);ok(K.clean(),'the fire catches: the kneel ends');}

  /* 3: one-shot strokes */
  {const K=await kitWorld(),P=K.W.Player;
    P.action={type:'smelt',obj:furnace,bar:'bronze_bar'};K.swing('smelt');K.step(false,10);ok(K.stray().join()==='smelt','the smelting stroke plays');
    P.action=null;K.step(false,1);ok(K.clean(),'the last bar out: the stroke stops with its action');
    P.action={type:'smith',obj:furnace};K.swing('smith');K.step(false,10);K.step(true,1);ok(K.clean(),'a walk ends the hammer stroke at once');
    P.action={type:'gather',obj:rock};K.swing('mine');K.step(false,10);ok(K.stray().join()==='mine','the pick swings');
    P.action=null;K.step(false,1);ok(K.clean(),'the rock is mined out: the swing stops');
    K.H.play('climb');K.step(false,10);ok(K.stray().join()==='climb','a ladder climb plays');K.step(true,1);ok(K.clean(),'...a walk straight off the ladder ends it');
    K.H.playAs('cook_range','bake');K.step(false,10);ok(K.stray().join()==='cook_range','baking reaches into the oven');K.step(true,1);ok(K.clean(),'...walking off the bake ends it');
    K.H.play('cook');K.step(false,10);K.step(true,1);ok(K.clean(),'the knot at the shaft (the cook reach) ends on a walk');
    for(const [clip,type] of [['attack_slash','slash'],['attack_stab','stab'],['attack_crush','crush'],['bow','bow'],['cast','cast']]){
      P.action=null;K.swing(type);K.step(false,3);K.step(true,2);ok(K.stray().join()===clip,'a '+clip+' swing plays out on the move (combat clips are not cut)');
      K.step(true,90);ok(K.clean(),'...and ends by itself ('+clip+')')}
    K.H.play('hit');K.step(true,40);ok(K.clean(),'a flinch plays once');}

  /* 4: the cook stroke repeats only at the fire */
  {const K=await kitWorld(),P=K.W.Player;
    P.action={type:'cook',obj:{position:new V(8,0,0),userData:{kind:'fire'}},t:0};K.step(true,30);ok(K.clean(),'walking to a fire does not play the cook stroke');
    K.step(false,30);ok(K.clean(),'standing out of reach of the fire does not either');
    P.action={type:'cook',obj:fire,t:0};K.step(false,2);ok(K.stray().join()==='cook','at the fire the cook stroke plays');
    K.step(false,200);ok(K.stray().join()==='cook','...and repeats while the action lasts');
    P.action=null;K.step(false,1);ok(K.clean(),'the last fish: the stroke stops');
    P.action={type:'cook',obj:{position:new V(1,0,0),userData:{kind:'fire',range:true}},t:0};K.step(false,2);ok(K.stray().join()==='cook_range','at a range: the oven reach (cook_range)');
    K.step(true,1);ok(K.clean(),'walking off the range ends it');P.action=null;K.step(false,2);}

  /* 5: death */
  {const K=await kitWorld(),P=K.W.Player;
    P.action={type:'gather',obj:tree};K.swing('slash');K.step(false,5);
    P.dead=true;K.H.play('death');K.step(false,5);K.swing('slash');K.H.play('hit');K.step(false,120);
    ok(K.stray().join()==='death','while dead only the death pose is weighted (the gather tick and a late flinch do not play): '+K.acts().join(','));
    ok(K.locoW()<1e-3,'the clamped death pose is not blended with idle');
    P.dead=false;P.action=null;K.gm.clips.death.stop();K.step(false,2);ok(K.clean(),'after the respawn: idle');}

  /* 6: one clip owns the body; emotes */
  {const K=await kitWorld(),P=K.W.Player;
    K.H.play('climb');K.step(false,5);K.H.play('attack_slash');K.step(false,2);ok(K.stray().join()==='attack_slash','a new clip takes the body from a running one-shot');
    K.step(false,60);ok(K.clean(),'...then idle');
    K.W.blockReact(K.P);K.step(false,2);K.H.play('attack_stab');K.step(false,2);ok(K.stray().join()==='attack_stab','a swing takes the body from a raised guard');K.step(false,60);
    const e=K.H.emote('dance');K.step(false,10);ok(e==='emote_dance'&&K.stray().join()==='emote_dance','an emote plays');K.step(true,1);ok(K.clean(),'...and stops on a walk');
    K.step(false,30);K.H.emote('wave');K.step(false,140);ok(K.clean(),'an emote plays out to idle');
    // an emote is not a stroke of the action it interrupted: the chop's action ending does not cut it
    P.action={type:'gather',obj:tree};K.swing('slash');K.step(false,5);K.H.emote('dance');K.step(false,3);P.action=null;K.step(false,10);
    ok(K.stray().join()==='emote_dance','an emote clicked mid-chop plays on when the chop action ends (the oak falls): '+K.acts().join(','));K.step(false,140);ok(K.clean(),'...then idle');}

  /* 7: gait presets mid-action */
  {const K=await kitWorld(),P=K.W.Player,G=vm.runInContext('HolmGaitOptions',K.W);
    const gaits={};['walk_G','walk_H','run_G','run_H','idle_A','idle_B'].forEach(n=>gaits[n]={name:n,duration:n[0]==='w'?.93:n[0]==='r'?.67:2});
    K.W.THREE.GLTFLoader=function(){this.load=function(u,okf){okf({animations:Object.values(gaits)})}};
    P.action={type:'gather',obj:tree};K.swing('slash');K.step(false,5);
    await G.load();for(const w of ['walkG','runH','idleA','idleB','walkH,runG','walkcur,runcur,idlecur']){G.set(w);K.swing('slash');K.step(false,3)}
    const kinds={};K.gm.mixer._active.filter(a=>/^(idle|walk|run)/.test(a.getClip().name)).forEach(a=>{const k=a.getClip().name.split('_')[0];kinds[k]=(kinds[k]||0)+1});
    ok(kinds.idle===1&&kinds.walk===1&&kinds.run===1,'after six preset switches one idle, one walk, one run action is scheduled: '+JSON.stringify(kinds));
    ok(K.stray().join()==='chop','the chop goes on through the switches');P.action=null;K.step(true,2);ok(K.clean(),'...and ends on the walk');
    G.set('walkG,runH');K.step(true,20);ok(K.clean()&&K.gm.walk.getClip().name==='walk_G','a switch mid-walk keeps the body on the new walk: '+K.acts().join(','));}

  /* 9: the tool in the hand */
  {const K=await kitWorld(),P=K.W.Player,T=vm.runInContext('HolmSkillTools',K.W);
    const want=()=>{const w=T.wanted();return w?w.skill+':'+w.id:null};
    P.inv=[{id:'raw_perch'},{id:'cooked_perch'},{id:'rope'}];P.action=null;
    K.H.play('cook');K.step(false,5);ok(K.stray().join()==='cook'&&want()===null,'the knot at the shaft (the borrowed cook reach, a raw fish in the pack) holds no tool: '+want());
    K.step(false,200);ok(K.clean()&&want()===null,'...and nothing after it');
    P.inv=[{id:'bread_dough'}];K.H.playAs('cook_range','bake');K.step(false,5);ok(want()==='cook_range:bread_dough','a bake holds the dough: '+want());
    K.step(true,1);ok(want()===null,'walking off the bake puts it away');
    P.inv=[{id:'raw_perch'}];P.action={type:'cook',obj:fire,t:0};K.step(false,3);ok(want()==='cook:raw_perch','cooking at a fire holds the fish: '+want());
    P.action=null;K.step(false,2);ok(want()===null&&K.clean(),'the last fish cooked: nothing held');
    P.inv=[{id:'hatchet'}];P.action={type:'gather',obj:tree};K.swing('slash');K.step(false,3);ok(want()==='chop:hatchet','chopping holds the hatchet: '+want());
    P.action=null;K.step(false,2);ok(want()===null,'the oak falls: the hatchet is put away (the weapon comes back)');
    P.inv=[{id:'fishing_net'},{id:'raw_perch'}];P.action={type:'gather',obj:pond};K.swing('cast');K.step(false,3);ok(want()==='net:fishing_net','netting holds the net');
    P.action=null;K.step(false,2);K.H.play('cook');K.step(false,3);ok(want()===null,'the rope tied right after fishing: still no fish in the hand: '+want());K.step(false,200)}
  {const g5=fs.readFileSync(path.join(ROOT,'src','game5_main.js'),'utf8');
    ok(g5.indexOf("HolmIslandPlayer.active()&&!(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive()))HolmIslandPlayer.update()")>0,
      'off the island the main loop steps HolmIslandPlayer.update (the skill tools, the look, the gait options)')}

  /* 8: SkillTiming untouched */
  {const S=require(path.join(ROOT,'src','skill_timing.js'));
    ok(JSON.stringify(S.SECONDS)===JSON.stringify({chop:.78,net:1.8,cook:1.77,bake:2.43,cook_range:2.43,smelt:2.42,smith:2.28}),'2004 stroke seconds unchanged');
    ok(JSON.stringify(Object.keys(S.LOOP))==='["chop","net","firemake"]','held loops unchanged');
    ok(JSON.stringify(S.TICKS)===JSON.stringify({cook:3,bake:4,cook_range:4,smelt:4,smith:4,lightfire:7}),'action ticks unchanged')}

  /* wiring: the regression driver exists and the island player is cache-busted */
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  ok(/src="src\/holm_island_player\.js\?v=h[0-9a-f]{8}"/.test(html)&&/src="src\/fx_humanoid\.js\?v=h[0-9a-f]{8}"/.test(html)&&/src="src\/game2_world\.js\?v=h[0-9a-f]{8}"/.test(html)&&/src="src\/holm_skill_tools\.js\?v=h[0-9a-f]{8}"/.test(html)&&/src="src\/game5_main\.js\?v=h[0-9a-f]{8}"/.test(html),'the edited scripts are cache-busted');
  ok(fs.existsSync(path.join(ROOT,'tools','qa_anim_no_stuck.js')),'the real-input regression driver tools/qa_anim_no_stuck.js exists');
  console.log('test_anim_no_stuck: '+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.log('  FAIL: threw',e&&e.stack||e);process.exit(1)});
