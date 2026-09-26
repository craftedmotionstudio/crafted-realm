/* ============ OnlineUI — the old-school interface driven by the server (W2 online alpha) ============
 * - Login / create-account screen in the existing welcome-screen style (same panel, fonts, buttons).
 * - Your panels (pack, worn gear, skills, prayers, spells, combat styles, orbs) show the server's state: every tick's
 *   inv / eq / st / pr / set / me block is mirrored into the game's Player fields and the usual UI.refresh* run.
 * - Every click becomes an intent (eat, equip, unequip, drop, prayer, autocast, style, auto-retaliate, run, special,
 *   chat, logout); nothing is changed locally. The server's answer is what you see a tick later.
 * - PvP interface: Scarlands level + multi-combat plaque, your skull, the Ditch warning, items kept on death (the
 *   exact shared rule, shared/pvp.js keptOnDeath), the death screen that says what you kept, connection-lost notice.
 */
var OnlineUI=(function(){
 'use strict';
 var $=function(id){return document.getElementById(id)};
 var st={net:null,welcome:null,myName:'',state:{style:0,autocast:null,wl:0,multi:0,skull:0,cb:3,en:10000,xp10:{},cur:{},pr:[],set:{}},
  ditchOk:false,pendingWalk:null,installed:false,lastWild:0,deathShown:false};
 var ICON={wild:'assets/icons/ui/v3/misc/scarlands.png',multi:'assets/icons/ui/v3/misc/multi_combat.png',skull:'assets/icons/ui/v3/misc/pk_skull.png'};
 function C(){return typeof CRShared!=='undefined'&&CRShared.combat}
 function PVP(){return typeof CRShared!=='undefined'&&CRShared.pvp}
 function esc(s){var d=document.createElement('div');d.textContent=String(s);return d.innerHTML}
 function click(){try{if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click()}catch(e){}}
 function chat(text,cls){if(typeof UI!=='undefined')UI.chat(text,cls||'plain')}
 function net(){return st.net}
 function send(m){return st.net&&st.net.send(m)}
 function css(){
  if($('online-ui-css'))return;
  var s=document.createElement('style');s.id='online-ui-css';s.textContent=[
   '.online-field{width:100%;box-sizing:border-box;padding:5px;margin:0 0 8px;text-align:center;font:bold 12px var(--lg-font,Verdana);color:var(--lg-yellow,#ff0);background:#0f0d09;border:0;border-radius:0;box-shadow:inset 0 0 0 1px #1a140c,inset 1px 1px 0 1px #231e17,0 0 0 1px #5a5245;user-select:text;outline:none}',
   '#online-status.err{color:#ff7a5a}#online-status.ok{color:#7fdc6e}',
   'html[data-online="1"] #objective,html[data-online="1"] #guide-edge-arrow{display:none!important}',
   '#onl-wild{position:absolute;right:252px;bottom:176px;z-index:30;display:none;pointer-events:none;text-align:center;font:bold 13px "Realm Small",Verdana,sans-serif;color:#ffff00;text-shadow:1px 1px 0 #000,0 0 3px #000}',
   '#onl-wild img{display:block;margin:0 auto;image-rendering:pixelated}#onl-wild .lvl{margin-top:1px}#onl-wild .multi{margin-top:4px;display:none}#onl-wild .skt{color:#ff981f;font-size:11px;margin-top:2px}',
   '#onl-overlay{position:absolute;inset:0;z-index:95;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35);font:13px "Realm Small",Verdana,sans-serif}',
   '#onl-overlay .box{min-width:300px;max-width:420px;padding:14px 18px;color:#ffe9a8;text-align:center;background:#3e3529;box-shadow:inset 0 0 0 2px #1a140c,inset 0 0 0 4px #6b5f4a,0 6px 24px rgba(0,0,0,.6)}',
   '#onl-overlay h4{margin:0 0 8px;color:#ff981f;font:bold 15px "Realm Small",Verdana,sans-serif;text-shadow:1px 1px 0 #000}',
   '#onl-overlay p{margin:6px 0;text-shadow:1px 1px 0 #000;line-height:1.35}',
   '#onl-overlay .kept{display:flex;gap:6px;justify-content:center;margin:8px 0}#onl-overlay .kept img{width:36px;height:32px;image-rendering:pixelated;background:rgba(0,0,0,.25);box-shadow:0 0 0 1px #1a140c}',
   '#onl-overlay .row{display:flex;gap:8px;justify-content:center;margin-top:10px}#onl-overlay button{font:bold 12px "Realm Small",Verdana;color:#ff981f;background:#5a4d3b;border:0;padding:6px 14px;cursor:pointer;box-shadow:inset 0 0 0 1px #1a140c,inset 1px 1px 0 1px #7c6c54}',
   '#onl-overlay button:hover{color:#fff}#onl-overlay label{display:block;margin-top:8px;font-size:11px;color:#c9b98a}',
   '#onl-conn{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:96;display:none;padding:10px 16px;background:#000;color:#fff;font:bold 13px "Realm Small",Verdana;box-shadow:0 0 0 2px #fff;text-align:center}',
   '#equip-list .onl-kept-note{font:11px "Realm Small",Verdana;color:#ffe9a8;margin:4px 6px;text-align:center;text-shadow:1px 1px 0 #000}',
   '#equip-list .onl-kept-note b{color:#ff981f}'
  ].join('\n');document.head.appendChild(s);
 }

 /* ---------------- login ---------------- */
 function buildLogin(n){
  if(n)st.net=n;
  css();
  var box=$('welcome-box');if(!box||$('login-online'))return;
  var sec=document.createElement('section');sec.id='login-online';sec.className='login-stage';
  var saved='';try{saved=sessionStorage.getItem('cr_online_user')||''}catch(e){}
  sec.innerHTML='<div class="login-kicker">World 1 &middot; online alpha</div><h3>Enter the Scarlands</h3>'+
   '<label class="login-field-label" for="online-user">Username</label><input id="online-user" class="online-field" maxlength="12" autocomplete="username" spellcheck="false" value="'+esc(saved)+'">'+
   '<label class="login-field-label" for="online-pass">Password</label><input id="online-pass" class="online-field" type="password" maxlength="64" autocomplete="current-password">'+
   '<button class="lg-btn lg-btn-primary" id="online-login" type="button"><strong>Log in</strong><small>An existing adventurer</small></button>'+
   '<button class="lg-btn" id="online-register" type="button"><strong>Create account</strong><small>New adventurers start in the Commons</small></button>'+
   '<p id="online-status" class="login-note"></p>'+
   '<p class="login-hint">PvP beyond the Ditch. Anyone may attack you there.</p>';
  box.appendChild(sec);
  // the local-save stages leave the page (the welcome flow's Escape key must not bring them back)
  document.querySelectorAll('#welcome-box .login-stage').forEach(function(s){if(s!==sec)s.remove()});sec.style.display='block';
  if(typeof HolmKit!=='undefined')HolmKit.load().catch(function(){});
  var badge=document.querySelector('.world-badge');if(badge)badge.innerHTML='<b>WORLD 1</b><small>ONLINE</small><span id="online-badge-state">OFFLINE</span>';
  var row=document.querySelector('#welcome-screen .login-footer');if(row)row.innerHTML='Original game by <span class="gold">Crafted Motion</span><br>Crafted Realm online alpha &middot; local test server';
  $('online-login').onclick=function(){click();doLogin(false)};
  $('online-register').onclick=function(){click();doLogin(true)};
  $('online-pass').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();doLogin(false)}});
  $('online-user').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('online-pass').focus()}});
  // probe the server so the badge says whether the world is up
  fetch(CROnline.server.replace(/^ws/,'http')+'/health',{cache:'no-store'}).then(function(r){return r.json()}).then(function(h){
   var b=$('online-badge-state');if(b)b.textContent=h.players+' ONLINE'}).catch(function(){var b=$('online-badge-state');if(b)b.textContent='OFFLINE';status('The game server is not answering. Start it with: npm run server','err')});
 }
 function status(text,cls){var s=$('online-status');if(!s)return;s.textContent=text||'';s.className='login-note'+(cls?' '+cls:'')}
 function busy(on){['online-login','online-register'].forEach(function(id){var b=$(id);if(b)b.disabled=!!on})}
 /** a look for a brand-new account: varied per name, from the kit's own palettes */
 function lookFor(name){
  if(typeof HolmKit==='undefined'||!HolmKit.ready())return null;
  var h=0;for(var i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;
  function r(n){h=(Math.imul(h,1664525)+1013904223)>>>0;return n>0?h%n:0}
  var body=r(2)?'B':'A',l=HolmKit.defaults(body);
  HolmKit.SLOTS.forEach(function(s){var n=HolmKit.options(body,s).length;if(n)l.parts[s]=1+r(n)});
  if(l.parts.Makeup)l.parts.Makeup=1;
  HolmKit.CHANNELS.forEach(function(c){var n=HolmKit.palette(c).length;if(n)l.colors[c]=r(n)});
  l.build=HolmKit.BUILDS[r(3)];l.feet='normal';
  return HolmKit.normalize(l);
 }
 function doLogin(register){
  var user=($('online-user').value||'').trim(),pass=$('online-pass').value||'';
  if(!/^[A-Za-z0-9 _-]{1,12}$/.test(user)){status('Usernames are 1 to 12 letters, digits, spaces, - or _.','err');return}
  if(pass.length<8||pass.length>64){status('Passwords are 8 to 64 characters.','err');return}
  try{sessionStorage.setItem('cr_online_user',user)}catch(e){}
  busy(true);status(register?'Creating your account...':'Connecting to the world...');
  var n=st.net;
  var ready=n.state==='hello'?Promise.resolve():n.connect();
  ready.then(function(){
   if(!register)return null;
   return n.register(user,pass).then(function(m){if(m.t!=='register_ok'&&m.code!=='name_taken')throw m;if(m.code==='name_taken')throw m;status('Account created. Logging in...','ok')});
  }).then(function(){
   return n.login(user,pass,lookFor(user));   // used only when the account has no saved look yet
  }).then(function(m){
   busy(false);
   if(!m||m.t!=='welcome'){status((m&&m.text)||'Login failed.','err');return}
   status('');OnlineMain.enter(m);
  }).catch(function(e){busy(false);status((e&&(e.text||e.message))||'Could not reach the game server.','err')});
 }

 /* ---------------- state mirroring into the game's Player + panels ---------------- */
 function invFrom(list){var a=new Array(28).fill(null);(list||[]).forEach(function(s,i){if(s&&i<28&&ITEMS[s[0]])a[i]={id:s[0],qty:s[1]}});return a}
 function applyWelcome(w){
  st.welcome=w;st.myName=w.name;st.state.xp10={};st.state.cur={};
  if(typeof CharCfg!=='undefined'){CharCfg.name=w.name;if(w.lk)CharCfg.kit=w.lk}
  applyStats(w.stats,true);
  Player.inv=invFrom(w.inv);
  var eq={};['head','body','legs','weapon','shield','amulet','cape','hands','feet'].forEach(function(s){eq[s]=(w.eq&&w.eq[s])||null});Player.equip=eq;
  applySet(w.set||{});st.state.en=w.en;Player.energy=Math.floor((w.en||0)/100);
  Player.activePrayers=new Set(w.pr||[]);st.state.pr=w.pr||[];
  st.state.skull=w.skull||0;
  refreshAll();
 }
 function applyStats(stats,initial){
  if(!stats)return;
  for(var sk in stats){var v=stats[sk],x10=v[0],base=v[1],cur=v[2];
   var before=st.state.xp10[sk];
   st.state.xp10[sk]=x10;st.state.cur[sk]=cur;Player.xp[sk]=x10/10;
   if(!initial&&before!=null&&x10>before&&typeof UI!=='undefined')UI.xpDrop(sk,(x10-before)/10);
   if(sk==='Hitpoints'){Player.hp=cur;Player.maxHp=base}
   if(sk==='Prayer'){Player.prayerPts=cur}
  }
 }
 function applySet(s){
  if(!s)return;st.state.set=Object.assign({},st.state.set,s);
  if(s.run!=null)Player.runOn=!!s.run;
  if(s.style!=null)st.state.style=s.style;
  if(s.ar!=null)Player.autoRetaliate=!!s.ar;
  if(s.ac!==undefined){st.state.autocast=s.ac;Player.spell=s.ac;Player.castMode=!!s.ac}
  if(s.spec!=null)Player.spec=s.spec;
  if(s.specOn!=null)Player.specArmed=!!s.specOn;
 }
 function refreshAll(){
  try{UI.refreshInv();UI.refreshEquip();UI.refreshSkills();UI.refreshHud();if(UI.refreshRun)UI.refreshRun();if(UI.refreshSpec)UI.refreshSpec();
   if(UI.refreshPrayers)UI.refreshPrayers();if(UI.refreshSpells)UI.refreshSpells();if(UI.refreshCombat)UI.refreshCombat()}catch(e){console.warn('[OnlineUI] refresh',e)}
  keptPreview();
 }
 /** one tick's panel parts */
 function applyTick(m){
  var gear=false,inv=false,hud=false;
  if(m.inv){Player.inv=invFrom(m.inv);inv=true}
  if(m.eq){var eq={};['head','body','legs','weapon','shield','amulet','cape','hands','feet'].forEach(function(s){eq[s]=m.eq[s]||null});Player.equip=eq;gear=true}
  if(m.st){applyStats(m.st,false);hud=true;try{UI.refreshSkills()}catch(e){}}
  if(m.pr){Player.activePrayers=new Set(m.pr);st.state.pr=m.pr;hud=true;try{if(UI.refreshPrayers)UI.refreshPrayers()}catch(e){}
   OnlineActors.setOverheads(null,st.state.skull>0,prayerOverhead(m.pr),player)}
  if(m.set){applySet(m.set);hud=true;try{if(UI.refreshRun)UI.refreshRun();if(UI.refreshSpec)UI.refreshSpec();if(UI.refreshCombat)UI.refreshCombat();if(UI.refreshSpells)UI.refreshSpells()}catch(e){}}
  var me=m.me;
  if(me&&me.hp){Player.hp=me.hp[0];Player.maxHp=me.hp[1];hud=true}
  if(me&&me.pp){Player.prayerPts=me.pp[0];hud=true}
  if(me&&me.en!=null){st.state.en=me.en;Player.energy=Math.floor(me.en/100);try{UI.refreshRun()}catch(e){}}
  if(me&&me.cb!=null){st.state.cb=me.cb;hud=true}
  if(me&&me.wl!=null){var was=st.state.wl;st.state.wl=me.wl;st.state.multi=me.multi;st.state.skull=me.skull;wildHud();
   if(was===0&&me.wl>0)chat('You have entered the Scarlands. Other adventurers may attack you here.','combat');
   if(was>0&&me.wl===0)chat('You leave the Scarlands.','sys');
   OnlineActors.setOverheads(null,me.skull>0,prayerOverhead(st.state.pr),player)}
  if(inv){try{UI.refreshInv()}catch(e){}}
  if(gear){try{UI.refreshEquip();if(typeof refreshPlayerGear==='function')refreshPlayerGear();if(UI.refreshCombat)UI.refreshCombat()}catch(e){}}
  if(hud){try{UI.refreshHud()}catch(e){}}
  if(inv||gear||m.pr||(me&&me.skull!=null))keptPreview();
  if(m.msg)m.msg.forEach(function(x){chat(x[1],x[0]==='combat'?'combat':x[0]==='level'?'xp':'plain')});
  if(m.death)showDeath(m.death);
 }
 function prayerOverhead(list){var P=C()&&C().PRAYERS;for(var i=0;i<(list||[]).length;i++){var d=P&&P[list[i]];if(d&&d.protect)return d.protect}return null}
 function setMyHp(hp){if(!hp)return;Player.hp=hp[0];Player.maxHp=hp[1];try{UI.refreshHud()}catch(e){}}

 /* ---------------- Scarlands HUD ---------------- */
 function wildHud(){
  var el=$('onl-wild');
  if(!el){el=document.createElement('div');el.id='onl-wild';el.innerHTML='<img alt="" src="'+ICON.wild+'" width="28" height="28"><div class="lvl"></div><img class="multi" alt="Multi-combat" title="Multi-combat area" src="'+ICON.multi+'" width="26" height="26"><div class="skt"></div>';document.body.appendChild(el)}
  var s=st.state;el.style.display=s.wl>0||s.multi?'block':'none';
  el.querySelector('.lvl').textContent=s.wl>0?'Level: '+s.wl:'';
  el.querySelector('img').style.display=s.wl>0?'block':'none';
  el.querySelector('.multi').style.display=s.multi?'block':'none';
  var sec=Math.ceil((s.skull||0)*0.6);el.querySelector('.skt').textContent=s.skull>0?'Skulled '+Math.floor(sec/60)+':'+('0'+sec%60).slice(-2):'';
 }
 /* ---------------- the Ditch warning (first crossing this session) ---------------- */
 function overlay(html){
  var o=$('onl-overlay');if(!o){o=document.createElement('div');o.id='onl-overlay';document.body.appendChild(o)}
  o.innerHTML='<div class="box">'+html+'</div>';o.style.display='flex';return o;
 }
 function closeOverlay(){var o=$('onl-overlay');if(o)o.style.display='none'}
 /** walking from safety into the Scarlands asks once (like the old Wilderness ditch) */
 function confirmWalk(tile,go){
  var m=OnlineWorld.model(),me=OnlineActors.me();
  if(st.ditchOk||!me||m.wildernessLevel(me.tile.x,me.tile.z)>0||m.wildernessLevel(tile.x,tile.z)===0){go();return}
  var o=overlay('<h4>Warning!</h4><p>Past the Ditch lie the <b>Scarlands</b>. There, other adventurers can attack you, and the deeper you go the wider the range of fighters who can.</p>'+
   '<p>If you die there you keep only your three most valuable items (none if you are skulled). The rest is left for your killer.</p>'+
   '<label><input type="checkbox" id="onl-ditch-remember"> Do not warn me again this session</label><div class="row"><button id="onl-ditch-go">Enter the Scarlands</button><button id="onl-ditch-stay">Stay in the Commons</button></div>');
  o.querySelector('#onl-ditch-go').onclick=function(){click();st.ditchOk=true;closeOverlay();go()};
  o.querySelector('#onl-ditch-stay').onclick=function(){click();closeOverlay()};
 }
 /* ---------------- items kept on death (the exact server rule) ---------------- */
 function keptList(){
  var P=PVP();if(!P)return {kept:[],lost:0};
  var inv=Player.inv.map(function(s){return s?{id:s.id,qty:s.qty}:null});
  var res=P.keptOnDeath(inv,Player.equip,{skulled:st.state.skull>0,protectItem:Player.activePrayers.has('protect_item'),
   valueOf:function(id){return (ITEMS[id]&&ITEMS[id].value)||0},destroyOnDeath:function(id){return !!(ITEMS[id]&&ITEMS[id].destroyOnDeath)},stackable:function(id){return !!(ITEMS[id]&&ITEMS[id].stack)}});
  var lost=res.lostInv.filter(Boolean).length+Object.keys(res.lostEquip).length;
  return {kept:res.kept,lost:lost};
 }
 function keptPreview(){
  var host=document.querySelector('#equip-list .kit-kept');if(!host)return;
  var k=keptList(),n=Math.max(3,k.kept.length);host.innerHTML='';
  for(var i=0;i<n;i++){var c=document.createElement('div');c.className='kit-slot'+(k.kept[i]?' filled':'');
   if(k.kept[i]){var img=document.createElement('img');img.src=iconFor(k.kept[i].id);c.appendChild(img);c.title=ITEMS[k.kept[i].id].name+(k.kept[i].qty>1?' x'+k.kept[i].qty:'')}host.appendChild(c)}
  var p=host.parentNode.querySelector('.kit-copy');
  if(p)p.innerHTML=(st.state.skull>0?'<b>You are skulled:</b> you keep nothing unless you pray Keepsake Ward. ':'If you fall you keep your <b>'+(Player.activePrayers.has('protect_item')?'four':'three')+'</b> most valuable items. ')+
   (k.lost?k.lost+' other item'+(k.lost>1?'s':'')+' would be left where you fell.':'Everything you carry would be kept.');
 }
 /* ---------------- death ---------------- */
 function onMyDeath(){st.deathShown=false}
 function showDeath(d){
  var kept=(d.kept||[]).map(function(k){return '<img alt="" title="'+esc(ITEMS[k[0]]?ITEMS[k[0]].name:k[0])+'" src="'+iconFor(k[0])+'">'}).join('');
  var o=overlay('<h4>Oh dear, you are dead!</h4>'+(d.by?'<p>You were defeated by <b>'+esc(d.by)+'</b>.</p>':'')+
   '<p>'+(d.kept&&d.kept.length?'You kept:':'You kept nothing.')+'</p>'+(kept?'<div class="kept">'+kept+'</div>':'')+
   (d.lost?'<p>'+d.lost+' item'+(d.lost>1?'s were':' was')+' left where you fell'+(d.by?', for your killer.':'.')+'</p>':'')+
   '<p>You wake in the Commons. The supply chest by the campfire has fresh kits.</p><div class="row"><button id="onl-death-ok">Continue</button></div>');
  o.querySelector('#onl-death-ok').onclick=function(){click();closeOverlay()};
  st.deathShown=true;
 }
 /** the supply chest: pick a kit (it replaces your pack and gear) */
 function chestDialog(kits,take){
  var rows=Object.keys(kits).map(function(k){var kt=kits[k],w=kt.equip&&kt.equip.weapon;return '<button data-k="'+esc(k)+'">'+(w?'<img alt="" style="width:28px;height:25px;vertical-align:middle;margin-right:6px;image-rendering:pixelated" src="'+iconFor(w)+'">':'')+esc(kt.label||k)+'</button>'}).join('');
  var o=overlay('<h4>Supply chest</h4><p>Take a fighting kit. It <b>replaces</b> everything in your pack and everything you wear.</p><div class="row" style="flex-direction:column">'+rows+'<button data-k="">Leave it</button></div>');
  Array.prototype.forEach.call(o.querySelectorAll('button[data-k]'),function(b){b.onclick=function(){click();closeOverlay();if(b.getAttribute('data-k'))take(b.getAttribute('data-k'))}});
 }
 function connection(text){var c=$('onl-conn');if(!c){c=document.createElement('div');c.id='onl-conn';document.body.appendChild(c)}c.textContent=text||'';c.style.display=text?'block':'none'}

 /* ---------------- clicks become intents ---------------- */
 function install(n){
  if(st.installed)return;st.installed=true;st.net=n;
  // pack: left click eats / wields / wears; right click gets the verbs first, then Drop / Examine
  UI.useItem=function(i){
   var s=Player.inv[i];if(!s)return;var def=ITEMS[s.id];click();
   if(def.heal>0){send({t:'eat',slot:i});return}
   if(def.equip){send({t:'equip',slot:i});return}
   chat('Nothing interesting happens.');
  };
  if(typeof InvMenu!=='undefined'){
   var entries0=InvMenu.entries.bind(InvMenu);
   InvMenu.entries=function(item){
    var i=Player.inv.indexOf(item);if(i<0)return [];var def=ITEMS[item.id]||{name:item.id},out=[];
    if(def.heal>0)out.push({html:'Eat <b>'+def.name+'</b>',fn:function(){send({t:'eat',slot:i})}});
    if(def.equip)out.push({html:(def.equip==='weapon'?'Wield':'Wear')+' <b>'+def.name+'</b>',fn:function(){send({t:'equip',slot:i})}});
    return out.concat(entries0(item));
   };
   InvMenu.drop=function(i,item){if(Player.inv[i]!==item){chat('That item has moved.');return false}send({t:'drop',slot:i});click();return true};
  }
  Player.togglePrayer=function(id){
   var P=C()&&C().PRAYERS,d=P&&P[id];if(!d)return false;
   var on=!Player.activePrayers.has(id);
   if(on&&Player.lvl('Prayer')<d.level){chat('You need a Prayer level of '+d.level+' to use that prayer.');return false}
   send({t:'prayer',id:id,on:on});return true;
  };
  Player.selectSpell=function(id){
   var sp=SPELLS[id];if(!sp)return false;
   if(sp.utility==='teleport'){send({t:'teleport',spell:id});return true}
   if(sp.utility){chat('That spell is not ready in the online world yet.');return false}
   if(Player.lvl('Magic')<sp.req){chat('You need a Magic level of '+sp.req+' to cast '+sp.name+'.');return false}
   var w=Player.equip.weapon&&ITEMS[Player.equip.weapon];
   // with a staff the spell is set to autocast (the 2004 staff option); without one it is readied for a single cast:
   // the next monster or adventurer you choose gets 'Cast <spell> -> <name>'
   if(w&&w.style==='magic'){send({t:'autocast',spell:st.state.autocast===id?null:id});return true}
   st.armedSpell=st.armedSpell===id?null:id;Player.spell=st.armedSpell;
   chat(st.armedSpell?'Choose a target for '+sp.name+'.':'You lower your hand.','sys');try{UI.refreshSpells()}catch(e){}
   return true;
  };
  Player.combatLevel=function(){return st.state.cb||3};
  UI.refreshCombat=refreshCombat;
  UI.logout=function(){send({t:'logout'})};
  if(typeof Controls!=='undefined')Controls.sendChat=function(text){text=(text||'').trim();if(text)send({t:'chat',text:text.slice(0,80)})};
  // orbs and worn-equipment slots: intercept before the offline handlers
  document.addEventListener('click',function(e){
   var t=e.target;if(!t||!t.closest)return;
   var run=t.closest('#run-orb');if(run){e.stopImmediatePropagation();e.preventDefault();click();send({t:'run',on:!Player.runOn});return}
   var spec=t.closest('#spec-orb');if(spec){e.stopImmediatePropagation();e.preventDefault();click();send({t:'spec',on:!Player.specArmed});return}
   var slot=t.closest('#equip-list .kit-slot.filled');
   if(slot&&!slot.closest('.kit-kept')){var m=/slot-(\w+)/.exec(slot.className);if(m){e.stopImmediatePropagation();e.preventDefault();click();send({t:'unequip',slot:m[1]})}}
  },true);
  // the kept-on-death view is redrawn by the kit; keep our exact preview in it
  var re0=UI.refreshEquip;UI.refreshEquip=function(){var r=re0.apply(this,arguments);keptPreview();return r};
  var eqHost=$('equip-list');
  if(eqHost&&typeof MutationObserver!=='undefined'){var busy=false;new MutationObserver(function(){if(busy)return;busy=true;try{keptPreview()}finally{setTimeout(function(){busy=false},0)}}).observe(eqHost,{childList:true})}
 }
 /* the server's style buttons for the wielded weapon's 2004 category (shared/combat.js CATEGORY_STYLES), drawn already
  * dressed like the offline tab (ui_combat.js leaves dressed tiles alone): a Blender picture per style, the label the
  * server uses, and what it trains */
 var CAT_FAMILY={unarmed:'unarmed',stab:'sword',slash:'sword',twohanded:'sword',axe:'axe',pickaxe:'pick',spiked:'mace',blunt:'mace',staff:'mace',bow:'bow',thrown:'bow'};
 var CAT_NAME={unarmed:'Unarmed',stab:'Stab sword',slash:'Slash sword',twohanded:'Two-handed sword',axe:'Axe',pickaxe:'Pickaxe',spiked:'Spiked',blunt:'Blunt',staff:'Staff',bow:'Bow',thrown:'Thrown'};
 function stylePic(fam,s){
  var L=s.label;
  if(fam==='unarmed')return L==='Punch'?'punch':L==='Kick'?'kick':'block_unarmed';
  if(fam==='bow')return L==='Rapid'?'bow_rapid':L==='Longrange'?'bow_longrange':'bow_accurate';
  if(L==='Block')return fam+'_block';
  if(L==='Focus')return 'staff_focus';
  var byType={stab:'_stab',slash:'_slash',crush:'_smash'}[s.type]||'_slash';
  if(L==='Lunge'||L==='Impale')byType='_lunge';
  return fam+byType;
 }
 var TRAIN={accurate:'Attack',aggressive:'Strength',defensive:'Defence',controlled:'Attack, Strength and Defence',ranged_accurate:'Ranged',ranged_rapid:'Ranged (faster)',ranged_longrange:'Ranged and Defence (longer reach)'};
 function refreshCombat(){
  var host=$('combat-styles');if(!host||!C())return;
  var w=Player.equip.weapon?ITEMS[Player.equip.weapon]:null,list=C().stylesFor(w),cur=Math.min(st.state.style|0,list.length-1);
  var cat=C().weaponCategory(w),fam=CAT_FAMILY[cat]||'sword',ac=st.state.autocast;
  var pic=function(n,cls){return '<img class="kit-spr '+cls+'" src="assets/icons/ui/v3/combat/'+n+'.png?v=2" alt="" draggable="false">'};
  host.innerHTML='<div class="cmb-weap"><div class="cr-wname">'+esc(w?w.name:'Unarmed')+'</div><div class="cr-wcat">Category: '+esc(CAT_NAME[cat]||cat)+
    (ac&&SPELLS[ac]?' &middot; autocast '+esc(SPELLS[ac].name):'')+'</div><div class="cr-clvl">Combat Lvl: '+(st.state.cb||3)+'</div></div>'+
   list.map(function(s,i){return '<div class="cmb-style'+(i===cur?' active':'')+'" data-i="'+i+'" data-tip="'+esc(s.label+' ('+s.type+')\nTrains '+(TRAIN[s.style]||s.style))+'" aria-label="'+esc(s.label)+'">'+
    pic(stylePic(fam,s),'cr-pic')+'<span class="cr-sname">'+esc(s.label)+'</span><b>'+esc(s.label)+'</b><small>'+esc(TRAIN[s.style]||s.style)+'</small></div>'}).join('')+
   '<div class="set-row" style="margin-top:9px"><span>Auto-retaliate</span><button class="set-btn'+(Player.autoRetaliate?' cr-on':'')+'" id="retal-btn">'+pic('retaliate','cr-knight')+'<span class="cr-rtext">Auto Retaliate<br>('+(Player.autoRetaliate?'On':'Off')+')</span></button></div>';
  host.querySelectorAll('.cmb-style').forEach(function(el){el.onclick=function(){click();send({t:'style',index:+el.dataset.i})}});
  var rb=$('retal-btn');if(rb)rb.onclick=function(){click();send({t:'auto_retaliate',on:!Player.autoRetaliate})};
 }
 /** your current max hit (the gold splat), from the shared rules */
 function myMaxHit(){
  var c=C();if(!c)return 0;
  var w=Player.equip.weapon?ITEMS[Player.equip.weapon]:null,style=c.styleFor(w,st.state.style);
  if(st.state.autocast&&w&&w.style==='magic'){var sp=SPELLS[st.state.autocast];return sp&&sp.max||0}
  var worn=Object.keys(Player.equip).map(function(k){return Player.equip[k]&&ITEMS[Player.equip[k]]}).filter(Boolean);
  var s=c.playerCombatStats({levels:{attack:st.state.cur.Attack|0,strength:st.state.cur.Strength|0,defence:st.state.cur.Defence|0,ranged:st.state.cur.Ranged|0,magic:st.state.cur.Magic|0},
   bonuses:c.equipmentBonuses(worn),prayers:Array.from(Player.activePrayers),style:style});
  return s.maxHit;
 }
 function publicLine(name,text){
  var box=$('chatbox');if(!box)return;var d=document.createElement('div');d.className='public';
  var n=document.createElement('span');n.className='chat-name';n.textContent=name+': ';var m=document.createElement('span');m.className='chat-msg';m.textContent=text;
  d.appendChild(n);d.appendChild(m);box.appendChild(d);box.scrollTop=box.scrollHeight;while(box.children.length>60)box.removeChild(box.firstChild);
 }
 function armedSpell(){return st.armedSpell||null}
 function clearArmed(){if(st.armedSpell){st.armedSpell=null;Player.spell=st.state.autocast;try{UI.refreshSpells()}catch(e){}}}
 return {armedSpell:armedSpell,clearArmed:clearArmed,buildLogin:buildLogin,install:install,applyWelcome:applyWelcome,applyTick:applyTick,setMyHp:setMyHp,confirmWalk:confirmWalk,wildHud:wildHud,
  keptList:keptList,chestDialog:chestDialog,onMyDeath:onMyDeath,showDeath:showDeath,connection:connection,status:status,myMaxHit:myMaxHit,publicLine:publicLine,state:function(){return st.state},
  closeOverlay:closeOverlay,lookFor:lookFor,myName:function(){return st.myName}};
})();
