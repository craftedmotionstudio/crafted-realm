#!/usr/bin/env node
/* The sound pass (owner review 2026-09-29): headless test. Pins that
 *  1. every recipe renders (finite, the peak under the 0.3 ceiling, its loudness at its target under the music, the loops
 *     seamless), deterministically, with variants that differ;
 *  2. every sound in the inventory (tools/sfx_inventory.js, docs/rebuild/HOLM_SOUND_INVENTORY.md) exists, every recipe is in
 *     the inventory, and every inventory event is wired (its call is in the named file);
 *  3. the sound code has no square or sawtooth oscillator and never calls Math.random;
 *  4. Sfx (src/game3_systems.js) plays nothing before the first gesture or at volume 0, builds one buffer source and one gain
 *     on the SFX bus (the bus: volume -> a gentle high shelf -> a soft peak catcher -> the speakers), names every sound the
 *     call sites use, picks the equip sound by material, the creature voice by species, fades a far sound, and stands the
 *     tick's chop down while the island plays it on the swing;
 *  5. the cozy fires: every flicker clip slowed and softened wherever a mixer makes it, the lit-log flicker slow and soft;
 *  6. the page wiring: index.html load order, the sound board and the old-sound archive, the inventory doc.
 * Run: node tools/test_sfx.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS '+n)}else{fail++;console.log('FAIL '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,600):''))}};
const L=require('../src/sfx_lib.js');require('../src/sfx_recipes.js');
const INV=require('./sfx_inventory.js');
const Legacy=require('./sfx_legacy.js');

/* ======== 1. the recipes ======== */
{
 const SR=22050,bad=[],loud=[],loops=[],same=[],vary=[];
 for(const id of L.ORDER){const d=L.DEFS[id];const b=L.render(id,SR,0),m=L.measure(b,SR),ld=L.loudness(b,SR);
  if(!b.every(Number.isFinite)||!(m.peak>0)||m.peak>L.CEIL+1e-6)bad.push({id,peak:m.peak});
  const want=L.REF*Math.pow(10,d.lvl/20);if(ld>want*1.03||(ld<want*.97&&m.peak<L.CEIL-1e-4))loud.push({id,loud:+ld.toFixed(4),want:+want.toFixed(4)});
  if(d.loop){const edge=Math.abs(b[0]-b[b.length-1]);if(edge>m.peak*.35)loops.push({id,edge:+edge.toFixed(4)})}
  const b2=L.render(id,SR,0);if(b2.length!==b.length||b2.some((x,i)=>x!==b[i]))same.push(id);
  if((d.vars||3)>1){const v1=L.render(id,SR,1);if(v1.length===b.length&&v1.every((x,i)=>x===b[i]))vary.push(id)}}
 ok('every recipe renders: finite, audible, peak at or under the '+L.CEIL+' ceiling ('+L.ORDER.length+' sounds)',!bad.length,bad);
 ok('every recipe sits at its loudness target (dB against the music), or under it when the peak ceiling holds it',!loud.length,loud);
 ok('every sound is under the music: no target above -5 dB',L.ORDER.every(id=>L.DEFS[id].lvl<=-5),L.ORDER.filter(id=>L.DEFS[id].lvl>-5));
 ok('UI ticks are the quietest (-18 dB or less), footsteps -24 or less',['ui_click','ui_tab','ui_dialogue','ui_window_close'].every(id=>L.DEFS[id].lvl<=-18)&&['step_grass','step_wood','step_stone'].every(id=>L.DEFS[id].lvl<=-24));
 ok('the loops are seamless (the wrap joins without a jump)',!loops.length,loops);
 ok('renders are deterministic (the same variant, the same samples)',!same.length,same);
 ok('variants differ (repeats never grate)',!vary.length,vary);
 ok('every recipe says what it is made of and has a label and a category',L.ORDER.every(id=>{const d=L.DEFS[id];return d.made&&d.made.length>20&&d.label&&d.cat}));
 // play-time nudges: a few plays of one sound differ a little in pitch and level, never louder than the recipe
 const plays=[];const ctx={currentTime:0,sampleRate:8000,createBuffer:(c,l,sr)=>({length:l,sampleRate:sr,duration:l/sr,getChannelData:()=>new Float32Array(l)}),
  createBufferSource:()=>({playbackRate:{value:1},connect(o){return o},start(){}}),createGain:()=>({gain:{value:1},connect(o){return o}})};
 for(let i=0;i<6;i++){const h=L.play(ctx,{},'chop');plays.push({rate:h.src.playbackRate.value,gain:h.gain.gain.value,v:h.variant})}
 const rates=new Set(plays.map(p=>p.rate.toFixed(4))),gains=plays.map(p=>p.gain);
 ok('each play is nudged: pitch within +-4%, gain 88-100%, the variant never repeats back to back',rates.size>=5&&plays.every(p=>Math.abs(p.rate-1)<=.041&&p.gain<=1&&p.gain>=.87)&&plays.every((p,i)=>!i||p.v!==plays[i-1].v),plays);
 ok('musical cues are not nudged in pitch (in tune)',['quest_step','quest_done','level_up_a','level_up_b','level_up_c','ui_map_open'].every(id=>L.DEFS[id].pv===0));
 ok('the level-up pick is A, the lute arpeggio',L.LEVEL_PICK==='level_up_a'&&/lute arpeggio/.test(L.DEFS.level_up_a.made));
}

/* ======== 2. the inventory: exists, covered, wired ======== */
{
 const inInv=new Set();INV.forEach(r=>r.sounds.forEach(s=>inInv.add(s)));
 const missing=[...inInv].filter(s=>!L.DEFS[s]),orphan=L.ORDER.filter(id=>!inInv.has(id));
 ok('every inventory sound exists as a recipe',!missing.length,missing);
 ok('every recipe is in the inventory (no orphan sound)',!orphan.length,orphan);
 const need=['Side-panel tab','Window opens','Window closes','Relief chart','Dialogue','Level-up (the fireworks stay)','Quest complete','Equip: metal','Equip: tool','Equip: wood','Equip: cloth','Equip: leather','Unequip','Pick up','Drop','Bank opens','deposit','Eat','Drink',
  'Door opens','Door closes','Door locked','Chop','Logs land','tips','tree lands','Pickaxe','ore chunk','runs empty','Prospect','Net cast','Splash','Catch','Tinderbox','catches','Crackle loop','Sizzle','Cooked','Burnt','Bake: bread','Bake: the loaf','furnace roars','anvil','bucket','Tie the rope','Climb the rope','Ladders',
  'Swing','Hit:','is hit','Block','Miss','Bow','Arrow','Spell','dies','Rat','Goblin','Chicken','Cow','Footsteps','Shore water','pond','Mill','forge','bell','skiff'];
 const unlisted=need.filter(k=>!INV.some(r=>r.event.toLowerCase().indexOf(k.toLowerCase())>=0));
 ok('the inventory covers every event the brief names ('+need.length+')',!unlisted.length,unlisted);
 const unwired=[];INV.forEach(r=>r.wired.forEach(([f,sub])=>{let t='';try{t=src(f)}catch(e){}if(t.indexOf(sub)<0)unwired.push(r.event+' :: '+f+' :: '+sub)}));
 ok('every inventory event is wired: its call is in the named file ('+INV.reduce((n,r)=>n+r.wired.length,0)+' call sites)',!unwired.length,unwired);
 ok('only prospecting is "not in game" (there is no Prospect option), and it is still callable',INV.filter(r=>r.status==='not in game').map(r=>r.sounds[0]).join()==='prospect');
 ok('every "old" sound the board compares against is in the archive (tools/sfx_legacy.js)',L.ORDER.every(id=>{const o=L.DEFS[id].old;return !o||o==='(none)'||Legacy.has(o)}),L.ORDER.filter(id=>{const o=L.DEFS[id].old;return o&&o!=='(none)'&&!Legacy.has(o)}));
}

/* ======== 3. no square or saw waves, no Math.random ======== */
{
 const files=['src/sfx_lib.js','src/sfx_recipes.js','src/sfx_furnishings.js','src/cozy_fire.js','src/holm_sound.js','src/holm_mill.js','src/holm_fishing.js','src/holm_island_anim.js','src/fx_levelup.js'];
 const harsh=files.filter(f=>/'square'|'sawtooth'|"square"|"sawtooth"/.test(src(f)));
 ok('no square or sawtooth anywhere in the sound code',!harsh.length,harsh);
 const cfx=src('src/combat_fx.js'),a=cfx.indexOf('/* ---------------- sounds:'),b=cfx.indexOf('}})();',a),blk=cfx.slice(a,b);
 ok('CombatFX voices: the recipes through Sfx, no oscillators of their own',a>0&&!/createOscillator|'square'|'sawtooth'/.test(blk)&&/Sfx\.play/.test(blk));
 const g3=src('src/game3_systems.js'),s0=g3.indexOf('/* ---------- Sound effects (sound pass'),s1=g3.indexOf('passive:true}));',s0),sfx=g3.slice(s0,s1);
 const sq=(sfx.match(/'square'|'sawtooth'/g)||[]).length;
 ok('Sfx: the only square/saw mention maps them to a triangle (old callers of Sfx.tone)',s0>0&&sq===2&&/\(type==='square'\|\|type==='sawtooth'\)\?'triangle'/.test(sfx),sq);
 const rnd=['src/sfx_lib.js','src/sfx_recipes.js','src/cozy_fire.js','src/holm_sound.js'].filter(f=>/Math\.random\s*\(/.test(src(f)));
 ok('the sound library, the recipes, the cozy fires and the island director never call Math.random',!rnd.length,rnd);
}

/* ======== 4. Sfx in a sandbox: the gate, the bus, the names ======== */
{
 const g3=src('src/game3_systems.js'),s0=g3.indexOf('/* ---------- Sound effects (sound pass'),s1=g3.indexOf('passive:true}));',s0)+'passive:true}));'.length,code=g3.slice(s0,s1)+'\n}\n;this.Sfx=Sfx;';
 const created=[],listeners={};let hasBeenActive=false;
 function Param(v){return {value:v,setTargetAtTime(x){this.value=x},exponentialRampToValueAtTime(){},setValueAtTime(){}}}
 class Ctx{constructor(){this.sampleRate=8000;this.currentTime=0;this.state='running';this.destination={name:'speakers'};created.push(this);this.nodes=[]}
  mk(kind,extra){const n=Object.assign({kind,out:[],connect(o){this.out.push(o);return o},start(){},stop(){}},extra||{});this.nodes.push(n);return n}
  createBuffer(c,l,sr){return {length:l,sampleRate:sr,duration:l/sr,getChannelData:()=>new Float32Array(l),copyToChannel(){}}}
  createGain(){return this.mk('gain',{gain:Param(1)})}createBufferSource(){return this.mk('source',{playbackRate:Param(1)})}
  createBiquadFilter(){return this.mk('filter',{type:'lowpass',frequency:Param(0),gain:Param(0),Q:Param(1)})}
  createDynamicsCompressor(){return this.mk('compressor',{threshold:Param(0),knee:Param(0),ratio:Param(1),attack:Param(0),release:Param(0)})}
  createOscillator(){return this.mk('osc',{type:'sine',frequency:Param(0)})}resume(){}}
 const ITEMS={hatchet:{name:'Bronze hatchet',equip:'weapon',tool:'woodcutting',model:'axe'},bronze_dagger:{name:'Bronze dagger',equip:'weapon',model:'dagger',tier:'bronze'},
  worn_bow:{name:'Worn shortbow',equip:'weapon',model:'bow',style:'ranged'},leather_body:{name:'Leather body',equip:'body',model:'plate',tier:'leather'},
  blue_robe:{name:'Blue robe',equip:'body',model:'robe'},arrows:{name:'Bronze arrows',equip:'ammo'},bronze_helm:{name:'Bronze helm',equip:'head',model:'helm',tier:'bronze'},ale:{name:'Ale',heal:1}};
 const sb={console,SfxLib:L,ITEMS,Math,Date,performance:{now:()=>Date.now()},localStorage:{getItem:()=>null,setItem(){}},
  navigator:{get userActivation(){return {hasBeenActive}}},window:{AudioContext:Ctx},
  document:{addEventListener(ev,f){(listeners[ev]=listeners[ev]||[]).push(f)},removeEventListener(ev,f){listeners[ev]=(listeners[ev]||[]).filter(x=>x!==f)},hidden:false},
  player:{position:{x:0,y:0,z:0}},requestIdleCallback:null,setTimeout:()=>0};
 const cx=vm.createContext(sb);vm.runInContext(code,cx);const S=cx.Sfx;
 ok('before the first gesture: a sound plays nothing and makes no audio context',S.play('chop')===null&&created.length===0&&S.chop()===undefined&&created.length===0);
 ok('the page listens for the first click, tap or key',['pointerdown','mousedown','keydown','touchstart'].every(ev=>(listeners[ev]||[]).length===1));
 listeners.pointerdown[0]();
 const h=S.play('chop'),ctx=created[0];
 ok('after the first gesture: one buffer source and one gain, on the SFX bus',!!h&&h.src.kind==='source'&&h.gain.kind==='gain'&&h.src.out[0]===h.gain&&h.gain.out[0]===S._master&&ctx.nodes.filter(n=>n.kind==='source').length===1);
 const t=S._tame,lim=S._limit;
 ok('the bus: the SFX volume, a gentle high shelf (-3 dB over 7 kHz), a soft peak catcher, the speakers',S._master.out[0]===t&&t.type==='highshelf'&&t.gain.value===-3&&t.frequency.value===7000&&t.out[0]===lim&&lim.kind==='compressor'&&lim.ratio.value<=4&&lim.out[0]===ctx.destination);
 S.setVolume(0);const n0=ctx.nodes.length;
 ok('muted (volume 0): nothing is built',S.play('chop')===null&&S.loop('fire_loop')===null&&ctx.nodes.length===n0);
 S.setVolume(.8);ok('the volume is the bus gain (the Sound effects slider)',S._master.gain.value===.8);
 hasBeenActive=false;
 // every name the call sites use plays its recipe
 const last=()=>L.stats().last&&L.stats().last.id;const names=[];
 const expect={click:'ui_click',tab:'ui_tab',windowOpen:'ui_window_open',windowClose:'ui_window_close',mapOpen:'ui_map_open',mapClose:'ui_map_close',dialogue:'ui_dialogue',quest:'quest_step',questDone:'quest_done',level:'level_up_a',coin:'coins',
  pickup:'pickup',drop:'drop',bankOpen:'bank_open',bankDeposit:'bank_deposit',bankWithdraw:'bank_withdraw',eat:'eat',drink:'drink',doorOpen:'door_open',doorClose:'door_close',doorLocked:'door_locked',gateOpen:'gate_open',gateClose:'gate_close',stairs:'stairs',
  chop:'chop',mine:'mine',treeLand:'tree_fall',prospect:'prospect',netCast:'fish_cast',splash:'fish_splash',fishCatch:'fish_catch',tinderStrike:'fire_strike',fireCatch:'fire_catch',sizzle:'cook_sizzle',cookDone:'cook_done',burn:'cook_burn',
  bakeIn:'bake_in',bakeDone:'bake_done',furnace:'smelt_roar',smelt:'smelt_bar',anvil:'anvil',bucketTake:'bucket_take',dough:'dough',ropeTie:'rope_tie',ropeClimb:'rope_climb',block:'block',miss:'miss',bowShoot:'bow',
  spellCharge:'spell_charge',magicCast:'spell_cast',magicHit:'spell_hit',spellSplash:'spell_splash',bodyFall:'body_fall',kill:'body_fall',skiffPush:'skiff_push',oar:'oar',bell:'bell'};
 for(const k in expect){const before=L.stats().plays;S[k]();names.push([k,L.stats().plays>before?last():null])}
 const wrong=names.filter(([k,id])=>id!==expect[k]);
 ok('every named Sfx method plays its recipe ('+names.length+' names)',!wrong.length,wrong);
 const p=(fn,...a)=>{const b0=L.stats().plays;S[fn](...a);return L.stats().plays>b0?last():null};
 ok('parameterised names: swing / hit by blow, ladder by direction, bucket by fill, step by surface, arrow by hit or miss, eat by food or drink',
  p('swing','stab')==='swing_stab'&&p('swing','crush')==='swing_crush'&&p('swing')==='swing_slash'&&p('hitFlesh','crush',true)==='hit_crush'&&p('takeHit')==='hurt'&&
  p('ladder','down')==='ladder_down'&&p('ladder','up')==='ladder_up'&&p('bucketFill','flour')==='bucket_flour'&&p('bucketFill','water')==='bucket_water'&&
  p('step','wood')==='step_wood'&&p('step','stone')==='step_stone'&&p('step')==='step_grass'&&p('arrowHit',true)==='arrow_hit'&&p('arrowHit',false)==='arrow_miss'&&p('eat','ale')==='drink'&&p('eat','bread')==='eat');
 ok('equip by material: the hatchet is a tool (haft and head), a dagger metal, a bow wood, leather, a robe cloth, arrows',
  p('equip','hatchet')==='equip_tool'&&p('equip','bronze_dagger')==='equip_metal'&&p('equip','worn_bow')==='equip_wood'&&p('equip','leather_body')==='equip_leather'&&p('equip','blue_robe')==='equip_cloth'&&p('equip','arrows')==='equip_ammo'&&p('equip','bronze_helm')==='equip_metal'&&
  p('unequip','hatchet')==='unequip_tool'&&p('unequip','arrows')==='unequip_wood');
 const npc=(typeId,model)=>({typeId,t:{model},mesh:{position:{x:1,y:0,z:1}}});
 ok('the creature by species: rat, goblin, chicken, cow (and no voice for a poacher, an archer or a pirate)',
  S.species(npc('large_rat','rat'))==='rat'&&S.species(npc('holm_practice_rat'))==='rat'&&S.species(npc('pg_goblin','goblin'))==='goblin'&&S.species(npc('gnarlgob','goblin'))==='goblin'&&
  S.species(npc('pasturehen','chicken'))==='chicken'&&S.species(npc('moorcalf','cow'))==='cow'&&S.species(npc('pg_poacher'))===null&&S.species(npc('scar_raider_archer','scar_raider_archer'))===null&&S.species(npc('pirate'))===null);
 ok('creature voices play by kind (idle, attack, hurt, death)',['idle','attack','hurt','death'].every(k=>['rat','goblin','chicken','cow'].every(s=>{const m={rat:['large_rat','rat'],goblin:['pg_goblin','goblin'],chicken:['pasturehen','chicken'],cow:['moorcalf','cow']}[s];
  const b0=L.stats().plays;S.creature(npc(m[0],m[1]),k);return L.stats().plays>b0&&last()===s+'_'+k})));
 cx.player.position.x=40;ok('a sound far from the adventurer is not built (it fades out by its range)',S.play('door_open',{at:{x:0,z:0},range:12})===null&&S.falloff({x:0,z:0},16)===0&&S.falloff({x:39,z:0},16)===1);cx.player.position.x=0;
 const d0=L.stats().plays;S.death();S.death();ok('the adventurer\'s death sounds once (as they fall; the respawn\'s call stands down)',L.stats().plays===d0+1&&last()==='player_death');
 cx.HolmSound={syncs:k=>k==='chop'};const c0=L.stats().plays;S.chop();S.mine();
 ok('while the island plays the chop on the swing, the tick\'s chop stands down (the pick still plays)',L.stats().plays===c0+1&&last()==='mine');delete cx.HolmSound;
 const n1=ctx.nodes.length;S.tone(700,.04,'square',.02);const o=ctx.nodes.slice(n1).find(n=>n.kind==='osc');
 ok('old callers of Sfx.tone(\'square\') get a triangle',!!o&&o.type==='triangle',o&&o.type);
 const lp=S.loop('fire_loop');lp.setGain(.5);ok('a loop: one looping source, its level set smoothly',!!lp&&lp.h.src.loop===true&&lp.h.gain.gain.value===.5);
}

/* ======== 5. cozy fires ======== */
{
 const actions=[];function Mixer(root){this.root=root}Mixer.prototype.clipAction=function(clip){const a={clip,timeScale:1,weight:1,getClip:()=>clip};actions.push(a);return a};Mixer.prototype.getRoot=function(){return this.root};
 const THREE={AnimationMixer:Mixer};const cx=vm.createContext({THREE,console,location:{search:''},performance:{now:()=>0}});
 vm.runInContext(src('src/cozy_fire.js')+'\n;this.CozyFire=CozyFire;',cx);
 const m=new Mixer({}),h=m.clipAction({name:'HearthFlicker0',tracks:[]}),o=m.clipAction({name:'OvenFlicker2',tracks:[]}),f=m.clipAction({name:'Flame_Flicker',tracks:[]}),w=m.clipAction({name:'WheelTurn',tracks:[]}),dr=m.clipAction({name:'Lodge_DoorOpenClose',tracks:[]});
 ok('every flicker clip is slowed to half speed and softened (weight 0.65), wherever a mixer makes it',[h,o,f].every(a=>a.timeScale===.5&&a.weight===.65),[h,o,f].map(a=>[a.timeScale,a.weight]));
 ok('nothing else is touched (the mill wheel, a door)',w.timeScale===1&&w.weight===1&&dr.timeScale===1);
 const fl={scale:{x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}},rotation:{x:0,z:0}},fire={userData:{flame:fl}};
 let prev=null,maxRate=0,lo=9,hi=-9;for(let t=0;t<12;t+=1/60){cx.CozyFire.flicker(fire,t);if(prev!==null)maxRate=Math.max(maxRate,Math.abs(fl.scale.y-prev)*60);prev=fl.scale.y;lo=Math.min(lo,fl.scale.y);hi=Math.max(hi,fl.scale.y)}
 let oprev=null,omax=0;for(let t=0;t<12;t+=1/60){const y=1+Math.sin(t*1000*0.02)*0.25;if(oprev!==null)omax=Math.max(omax,Math.abs(y-oprev)*60);oprev=y}
 ok('lit logs flicker slower and softer: at most a quarter of the old rate of change, within +-10% height (was +-25%)',maxRate<omax/4&&hi<=1.1&&lo>=.9,{newRate:+maxRate.toFixed(3),oldRate:+omax.toFixed(3),lo:+lo.toFixed(3),hi:+hi.toFixed(3)});
 const cz=src('src/cozy_fire.js');
 ok('embers: one Points (one draw call) from a fixed pool of 48, the Blender ember cell, never a click target',/var MAX=48/.test(cz)&&/new THREE\.Points\(geo,mat\)/.test(cz)&&/levelup_sparks_v1\.png/.test(cz)&&/obj\.raycast=function\(\)\{\}/.test(cz));
 ok('the crackle: one looping voice for the whole world, as loud as the nearest fire is close',(cz.match(/Sfx\.loop\('fire_loop'\)/g)||[]).length===1&&/near<=1\.5\?1:near>=7\?0/.test(cz));
 ok('?cozyFire=0 turns the pass off (the old flicker, the old speeds)',/get\('cozyFire'\)==='0'/.test(cz)&&/if\(!enabled\)\{fl\.scale\.y=1\+Math\.sin\(performance\.now\(\)\*0\.02\)\*0\.25;return\}/.test(cz));
 const gm=src('src/game5_main.js'),an=src('src/holm_island_anim.js');
 ok('every frame hands the fires to CozyFire (game5_main), the cavern torches read their curve at half speed, softened',/if\(typeof CozyFire!=='undefined'\) CozyFire\.update\(dt\);/.test(gm)&&/CozyFire\.TORCH_RATE/.test(an)&&/CozyFire\.TORCH_SOFT/.test(an));
 ok('a burnt-out fire gives its light back to a pool (no light leaked per fire)',/WORLD\._fireLights/.test(src('src/game2_world.js'))&&/f\.userData\.light\.userData\.free=true/.test(gm));
}

/* ======== 6. the island director, the page ======== */
{
 const cx=vm.createContext({console,location:{search:''},localStorage:{getItem:()=>null},Player:{action:{type:'gather',obj:{userData:{rtype:'tree'}}}},player:{userData:{gmix:{clips:{chop:{},mine:{}}}},position:{x:0,y:0,z:0}}});
 vm.runInContext(src('src/holm_sound.js')+'\n;this.HolmSound=HolmSound;',cx);const H=cx.HolmSound;
 const before=H.syncs('chop');H.start();
 ok('the island plays the chop on the swing once its director runs (and only the stroke being made)',before===false&&H.syncs('chop')===true&&H.syncs('mine')===false);
 cx.Player.action.obj.userData.rtype='rock';ok('...and the pickaxe',H.syncs('mine')===true&&H.syncs('chop')===false);
 cx.player.userData.gmix.clips={};ok('...never without the adventurer\'s clip (then the tick plays it)',H.syncs('mine')===false);
 ok('footsteps are off unless asked for (2004 had none)',H.status().steps==='off');
 const html=src('index.html'),at=s=>html.indexOf(s);
 ok('index.html: the library and recipes load before game3_systems.js',at('src/sfx_lib.js')>0&&at('src/sfx_lib.js')<at('src/sfx_recipes.js')&&at('src/sfx_recipes.js')<at('src/game3_systems.js'));
 ok('index.html: cozy_fire.js after three.js, holm_sound.js after holm_island_anim.js',at('src/cozy_fire.js')>at('three.min.js')&&at('src/holm_sound.js')>at('src/holm_island_anim.js')&&at('src/holm_sound.js')>0);
 const board=src('tools/sound_board.html');
 ok('the sound board loads the game\'s library, its recipes and the old-sound archive',/src="\.\.\/src\/sfx_lib\.js"/.test(board)&&/src="\.\.\/src\/sfx_recipes\.js"/.test(board)&&/src="sfx_legacy\.js"/.test(board));
 let doc='';try{doc=src('docs/rebuild/HOLM_SOUND_INVENTORY.md')}catch(e){}
 ok('the inventory doc lists every event and every sound',!!doc&&INV.every(r=>doc.indexOf(r.event)>=0)&&L.ORDER.every(id=>doc.indexOf('`'+id+'`')>=0));
}
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
