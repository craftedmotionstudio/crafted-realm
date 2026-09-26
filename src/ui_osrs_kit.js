/* ============================================================================
   UI_OSRS_KIT — the one coherent old-school interface kit (owner 2026-09-25:
   "more medieval, a well-done detailed UI; better organised; a clearer minimap").

   Loads LAST. It owns assets/ui/osrs_kit.css and replaces the earlier stacked
   re-skin layers that fought each other (ui_osrs / ui_minimap / ui_finish /
   ui_equip_quest style blocks are retired here; their DOM and handlers stay).

   Round 3 (owner 2026-09-25: "less polished, more old-school medieval; icons from
   images or Blender models, not basic shapes"): every icon is now a pixel sprite
   rendered from our own low-poly Blender props (tools/blender/build_ui_icons_v1.py +
   tools/process_ui_icons_v3.py -> assets/icons/ui/v3), the chrome uses hand-painted
   pixel tiles (tools/build_ui_textures_v3.py -> assets/ui/tex) and all lettering is
   our own bitmap-look font "Realm Small" (tools/build_pixel_font.py -> assets/fonts).
   What lives here (all of it our own artwork; no Jagex sprites, fonts or images are
   used or traced):
     1. textures  : weathered stone, slate and parchment painted once on a canvas
                    and handed to the CSS as custom properties
     2. HUD layout: the minimap cluster (ring, compass, world-map orb, stat orbs on
                    the left arc), the button rail over the side panel, the chat box
                    with its input line and tab row along the bottom
     3. tooltips  : one OSRS-style hover tip for every HUD control
     4. chat      : "Name: message" lines + yellow overhead text for ~3.5 s
     5. names     : no floating name labels over anyone (OSRS never had them)
     6. minimap   : click-to-walk on the island graph (the route line itself is
                    drawn by ui_map.js from the walker's real remaining route)
     7. equipment : the OSRS silhouette of stone slots
     8. login     : animated canvas torches beside the welcome box

   Every element id, class and data attribute the game and the QA drivers use is
   kept: elements are only re-parented or restyled, never renamed.
   Layout structure credit: the panel/tab/minimap proportions follow the classic
   2004 client layout as described by the MIT-licensed 2004scape project (layout
   only; no assets or code copied).
   ============================================================================ */
(function(){
'use strict';
if(window.__uiOsrsKit) return; window.__uiOsrsKit=true;
var doc=document, root=doc.documentElement;
function $(id){return doc.getElementById(id)}
function el(tag,cls,html){var e=doc.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e}
function click(){try{if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click()}catch(e){}}

/* ---------------------------------------------------------------- 0. style */
var link=el('link');link.rel='stylesheet';link.href='assets/ui/osrs_kit.css?v=8';
(doc.head||root).appendChild(link);   // fonts are bundled (assets/fonts, @font-face in the kit css): no runtime font fetch
root.classList.add('osrs-kit');
// retire the older chrome layers so one stylesheet owns the look (their DOM/handlers stay)
function retireLayers(){['ui-osrs-style','ui-minimap-style','ui-finish-css','ui-equip-quest-style','ui-combat-style','ui-prayer-magic-style','osk-skills-css'].forEach(function(id){var s=$(id);if(s&&s.parentNode)s.parentNode.removeChild(s)});
 // keep the kit stylesheet last in <head> so equal-specificity rules resolve in its favour
 if(link.parentNode&&link!==doc.head.lastElementChild)doc.head.appendChild(link)}

/* ------------------------------------------------------------ 1. textures */
// hand-painted pixel tiles (tools/build_ui_textures_v3.py); handed to the CSS as custom properties with absolute urls
function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
var TEXV='?v=2';
function abs(p){try{return new URL(p,doc.baseURI).href}catch(e){return p}}
function cssUrl(p){return 'url("'+abs(p)+'")'}
function setTex(){try{var S=root.style,T={'--tex-stone':'stone','--tex-stone-dark':'stone_dark','--tex-slate':'slate','--tex-stone-smooth':'stone',
  '--tex-slate-dark':'slate_dark','--tex-parch':'parch','--tex-wood':'wood','--tex-stone-red':'stone_red','--tex-stone-lit':'stone_lit','--tex-frame-thin':'frame_thin','--tex-frame-parch':'frame_parch','--spr-tick':'tick'};
 for(var k in T)S.setProperty(k,cssUrl('assets/ui/tex/'+T[k]+'.png'+TEXV));
}catch(e){console.warn('[ui-kit] textures',e)}}
setTex();

/* --------------------------------------------------------------- 2. icons */
// Every icon is a pixel sprite rendered from one of our own low-poly Blender props (assets/icons/ui/v3/**).
var SPRV='?v=6',SPR_BASE='assets/icons/ui/v3/';
var SPR={music:'rail/music',muted:'rail/muted',layers:'rail/layers',medal:'rail/medal',look:'rail/look',swords:'rail/combat',coins:'rail/coins',
 heart:'orb/heart',prayer:'orb/prayer',run:'orb/run',spec:'orb/spec',compass:'orb/compass',globe:'orb/globe',socket:'orb/socket',mmring:'orb/minimap_ring',
 close:'misc/close',door:'misc/door',note:'misc/note',bell:'misc/bell',roof:'misc/roof',chest:'misc/chest',boot:'misc/boot',mglobe:'misc/globe',
 mheart:'misc/heart',mmedal:'misc/medal',mmedal_off:'misc/medal_off'};
['combat','skills','quests','inv','equip','prayers','spells','drops','clan','friends','ignore','logout','settings','emotes','music'].forEach(function(t){SPR['t_'+t]='tabs/'+t});
['yes','no','bow','angry','think','wave','cheer','laugh','dance','sit','shrug','clap'].forEach(function(n){SPR['emote_'+n]='emotes/'+n});
function sprSrc(name){var p=SPR[name]||name;return SPR_BASE+p+'.png'+SPRV}
function spr(name,cls,alt){return '<img class="kit-spr '+(cls||'')+'" src="'+sprSrc(name)+'" alt="'+(alt||'')+'" draggable="false">'}
function svg(name,cls){return spr(name,cls)}   // legacy name: every former SVG icon is now a sprite
function svgUrl(name){return cssUrl(sprSrc(name))}
['heart','prayer','run','spec','swords','coins'].forEach(function(n){root.style.setProperty('--ico-'+n,svgUrl(n))});
['red','blue','yellow','grey','teal','green'].forEach(function(c){root.style.setProperty('--spr-fill-'+c,cssUrl(SPR_BASE+'orb/fill_'+c+'.png'+SPRV))});
root.style.setProperty('--spr-socket',svgUrl('socket'));root.style.setProperty('--spr-mmring',svgUrl('mmring'));
root.style.setProperty('--spr-title',cssUrl(SPR_BASE+'login/title.png'+SPRV));root.style.setProperty('--spr-note',svgUrl('note'));root.style.setProperty('--spr-shaft',cssUrl('assets/ui/tex/torch_shaft.png'+TEXV));
window.CRSprite={src:sprSrc,html:spr,base:SPR_BASE,v:SPRV};

/* ------------------------------------------------------------- 3. tooltip */
var tip=null;
function tipify(e,text){if(!e)return;var t=text||e.getAttribute('title')||e.getAttribute('data-tip');if(!t)return;e.setAttribute('data-tip',t);e.removeAttribute('title');if(!e.getAttribute('aria-label'))e.setAttribute('aria-label',t)}
function installTip(){if(tip)return;tip=el('div','',"");tip.id='hud-tip';doc.body.appendChild(tip);
 var cur=null;
 doc.addEventListener('mouseover',function(ev){var t=ev.target&&ev.target.closest?ev.target.closest('[data-tip]'):null;if(t===cur)return;cur=t;
  if(!t){tip.style.display='none';return}
  tip.textContent=t.getAttribute('data-tip');tip.style.display='block';
  var r=t.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,x=r.left+r.width/2-w/2,y=r.bottom+6;
  if(y+h>innerHeight-4)y=r.top-h-6;x=Math.max(4,Math.min(innerWidth-w-4,x));tip.style.left=x+'px';tip.style.top=y+'px'},true);
 doc.addEventListener('mousedown',function(){tip.style.display='none';cur=null},true)}

/* ---------------------------------------------------------- 4. HUD layout */
var cluster=null,rail=null;
function orbMeta(){
 var hp=$('hp-orb'),pr=$('pray-orb')&&$('pray-orb').parentNode,sp=$('spec-orb'),run=$('run-orb'),coin=$('coin-orb')&&$('coin-orb').parentNode,cmb=$('cmb-orb')&&$('cmb-orb').parentNode;
 return {hp:hp,pr:pr,sp:sp,run:run,coin:coin,cmb:cmb};
}
function buildCluster(){
 if(cluster)return;var f=$('minimap-frame');if(!f)return;
 cluster=el('div');cluster.id='mm-cluster';f.parentNode.insertBefore(cluster,f);
 var o=orbMeta();cluster.appendChild(f);if($('orbs'))cluster.appendChild($('orbs'));if(o.run)cluster.appendChild(o.run);
 if(o.hp)o.hp.classList.add('orb-hp');if(o.pr){o.pr.classList.add('orb-pray');o.pr.id=o.pr.id||'pray-orb-wrap'}if(o.sp)o.sp.classList.add('orb-spec');
 // run orb: its emoji/percent text becomes the drawn boot icon; the live number stays in #run-pct
 if(o.run){Array.prototype.slice.call(o.run.childNodes).forEach(function(n){if(n.nodeType===3)o.run.removeChild(n)})}
 [['hp',o.hp,'Hitpoints'],['pr',o.pr,'Prayer points'],['sp',o.sp,'Special attack: click to arm'],['run',o.run,'Run energy: click to toggle run']].forEach(function(a){if(a[1]){tipify(a[1],a[2]);if(!a[1].querySelector('.orb-ico'))a[1].appendChild(el('i','orb-ico'))}});
 var cb=$('compass-btn');if(cb){cb.innerHTML=spr('compass','compass-face');tipify(cb,'Face north (reset the camera)')}
 var wb=$('worldmap-btn');if(wb){wb.innerHTML=spr('globe');tipify(wb,'World map')}
 var mm=$('minimap');if(mm)tipify(mm,'Click the map to walk there');
 var face=null;window.CRCompassSet=function(yaw){face=face&&face.isConnected?face:doc.querySelector('#compass-btn .compass-face');if(face)face.style.transform='rotate('+(yaw*180/Math.PI).toFixed(1)+'deg)'};
}
function buildRail(){
 if(rail)return;rail=el('div');rail.id='hud-rail';rail.setAttribute('role','toolbar');rail.setAttribute('aria-label','Game tools');
 var info=el('div','rail-info');rail.appendChild(info);rail.appendChild(el('div','rail-tools'));doc.body.appendChild(rail);
 var o=orbMeta();
 if(o.cmb){o.cmb.classList.add('rail-plaque','plaque-combat');info.appendChild(o.cmb);tipify(o.cmb,'Combat level')}
 if(o.coin){o.coin.classList.add('rail-plaque','plaque-coins');info.appendChild(o.coin);tipify(o.coin,'Crowns carried')}
 adoptTools();
}
var TOOLS=[['music-btn','music','Music: click for the music menu'],['overlays-btn','layers','Overlays (Shift+L)'],['deeds-btn','medal','Realm deeds and log (Shift+K)'],['char-styler-btn','look','Change appearance (Shift+C)']];
function adoptTools(){if(!rail)return true;var box=rail.querySelector('.rail-tools'),all=true;
 TOOLS.forEach(function(t,i){var b=$(t[0]);if(!b){all=false;return}
  if(b.parentNode!==box){b.removeAttribute('style');b.classList.add('rail-btn');b.type='button';tipify(b,t[2]);paintTool(b,t[1]);
   // keep the rail order fixed however late a button is created
   var after=null;for(var k=i+1;k<TOOLS.length;k++){var n=$(TOOLS[k][0]);if(n&&n.parentNode===box){after=n;break}}box.insertBefore(b,after)}});
 return all}
function paintTool(b,icon){if(b.id==='music-btn'){watchMusic(b);return}b.innerHTML=spr(icon)}
// Music.start/stop write ♪ / ✕ into the button: keep the drawn note and show a red cross when muted
function watchMusic(b){var mo=null,paint=function(){var txt=b.textContent||'';var muted=/✕|✕/.test(txt)||b.classList.contains('muted');
  if(/✕|✕/.test(txt))b.classList.add('muted');else if(/♪|♪/.test(txt))b.classList.remove('muted');
  if(mo)mo.disconnect();b.innerHTML=spr('music')+(b.classList.contains('muted')?spr('muted','kit-spr-over'):'');if(mo)mo.observe(b,{childList:true,characterData:true,subtree:true});return muted};
 mo=new MutationObserver(function(){paint()});paint();}

/* chat: tab row inside the frame, "Name: " input line, working filters */
function buildChat(){
 var f=$('chatbox-frame'),box=$('chatbox');if(!f||!box||$('chat-input-row'))return;
 var row=el('div','',"");row.id='chat-input-row';
 var nm=el('span','chat-me','');var hint=el('span','chat-hint','Press Enter or click here to chat');row.appendChild(nm);row.appendChild(hint);
 box.parentNode.insertBefore(row,box.nextSibling);
 row.addEventListener('mousedown',function(e){e.preventDefault();if(typeof Controls!=='undefined'&&Controls.openChat){Controls.openChat()}});
 var t=$('chat-title');if(t){t.setAttribute('data-tip','Drag to resize the chat');t.removeAttribute('title')}
 wireChatTabs();
}
function myName(){return (typeof CharCfg!=='undefined'&&CharCfg.name)||'You'}
function refreshChatName(){var s=doc.querySelector('#chat-input-row .chat-me');if(s)s.textContent=myName()+':'}
function wireChatTabs(){var bar=$('chat-tabs'),box=$('chatbox');if(!bar||!box||bar.__kit)return;bar.__kit=true;
 var tipsFor={All:'Show all messages',Game:'Game messages only',Public:'Public chat only',Private:'Private messages',Clan:'Clan chat',Trade:'Trade requests',Yell:'Yells',Report:'Report abuse'};
 Array.prototype.forEach.call(bar.querySelectorAll('.chtab'),function(t){var label=(t.firstChild&&t.firstChild.nodeType===3?t.firstChild.nodeValue:t.textContent).trim();t.setAttribute('data-filter',label.toLowerCase());tipify(t,tipsFor[label]||label);
  t.addEventListener('click',function(){var k=t.getAttribute('data-filter');if(k==='report'){UI.chat('Reports open when shared worlds arrive. Thank you for looking out for others.','sys');return}
   box.setAttribute('data-filter',k);box.scrollTop=box.scrollHeight})});
 box.setAttribute('data-filter','all')}

/* ------------------------------------------ 5. public chat + overhead text */
var over={layer:null,items:[],raf:0};
function overheadLayer(){if(!over.layer){over.layer=el('div');over.layer.id='overhead-layer';doc.body.appendChild(over.layer)}return over.layer}
function sayOverhead(mesh,text,secs){
 if(!mesh||!text)return;var L=overheadLayer();
 over.items=over.items.filter(function(it){if(it.mesh===mesh){it.el.remove();return false}return true});
 var d=el('div','overhead-text');d.textContent=text;L.appendChild(d);
 over.items.push({mesh:mesh,el:d,until:performance.now()+(secs||3.6)*1000});
 if(!over.raf)over.raf=requestAnimationFrame(overTick);
}
var _v=null;
function overTick(){
 over.raf=0;if(!over.items.length)return;var now=performance.now();
 if(typeof THREE==='undefined'||typeof camera==='undefined'||!camera){over.raf=requestAnimationFrame(overTick);return}
 _v=_v||new THREE.Vector3();var cv=$('game-canvas'),rect=cv?cv.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight};
 over.items=over.items.filter(function(it){
  if(now>it.until||!it.mesh.parent){it.el.remove();return false}
  it.mesh.getWorldPosition(_v);_v.y+=(it.mesh===window.player?2.35:2.4);_v.project(camera);
  var vis=_v.z<1&&_v.z>-1;it.el.style.display=vis?'block':'none';
  if(vis)it.el.style.transform='translate('+Math.round((_v.x+1)/2*rect.width+rect.left)+'px,'+Math.round((1-_v.y)/2*rect.height+rect.top)+'px) translate(-50%,-100%)';
  it.el.style.opacity=it.until-now<400?String((it.until-now)/400):'1';
  return true});
 if(over.items.length)over.raf=requestAnimationFrame(overTick);
}
function publicLine(name,text){
 var box=$('chatbox');if(!box)return;
 var d=el('div','public');var n=el('span','chat-name');n.textContent=name+': ';var m=el('span','chat-msg');m.textContent=text;d.appendChild(n);d.appendChild(m);
 box.appendChild(d);box.scrollTop=box.scrollHeight;while(box.children.length>60)box.removeChild(box.firstChild);
}
function patchControls(){
 if(typeof Controls==='undefined'||Controls.__kit)return;Controls.__kit=true;
 Controls.sendChat=function(text){text=(text||'').trim();if(!text)return;publicLine(myName(),text);Controls.sayOverhead(text)};
 Controls.sayOverhead=function(text){if(typeof player!=='undefined'&&player)sayOverhead(player,text,3.6)};
 var open0=Controls.openChat;
 Controls.openChat=function(){open0.apply(this,arguments);var inp=this._input,row=$('chat-input-row');refreshChatName();
  if(inp&&row&&inp.parentNode!==row){inp.removeAttribute('style');inp.style.display='block';inp.placeholder='';row.appendChild(inp);inp.focus()}
  if(row)row.classList.add('typing')};
 var close0=Controls.closeChat;
 Controls.closeChat=function(){close0.apply(this,arguments);var row=$('chat-input-row');if(row)row.classList.remove('typing')};
}
window.CRSayOverhead=sayOverhead;

/* ------------------------------------------------------------ 6. no names */
function patchNames(){
 if(typeof makeNameTag==='function'&&!makeNameTag.__kit){
  // OSRS draws no names over characters: keep the hook (and its _nameTag flag) but render nothing
  var k=function(){var g=new THREE.Object3D();g.userData._nameTag=true;g.visible=false;return g};k.__kit=true;
  try{makeNameTag=k}catch(e){window.makeNameTag=k}
 }
}
function hideNameSprites(){if(typeof scene==='undefined'||!scene)return;var kill=[];scene.traverse(function(o){if(o.isSprite&&o.userData&&o.userData._nameTag)kill.push(o)});
 kill.forEach(function(o){if(o.parent)o.parent.remove(o)})}

/* ----------------------------------------------------------- 7. minimap */
function patchMinimapWalk(){
 if(typeof minimapWalkTo!=='function'||minimapWalkTo.__kit)return;var base=minimapWalkTo;
 var w=function(p){
  try{if(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive()&&typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.active()){
   Player.target=null;Player.action=null;
   var py=player.position.y,ns=HolmArrivalQA.graphNodes().filter(function(n){return Math.abs(n.x-p.x)<=3.5&&Math.abs(n.z-p.z)<=3.5&&Math.abs(n.y-py)<4});
   ns.sort(function(a,b){return (Math.hypot(a.x-p.x,a.z-p.z)+Math.abs(a.y-py)*.3)-(Math.hypot(b.x-p.x,b.z-p.z)+Math.abs(b.y-py)*.3)});
   for(var i=0;i<Math.min(ns.length,10);i++){if(HolmArrivalPlayer.order({x:ns[i].x,y:ns[i].y,z:ns[i].z,surface:ns[i].surface}))return}
   UI.chat("You can't reach that spot from here.",'plain');return}}catch(e){console.warn('[ui-kit] minimap walk',e)}
  return base(p)};
 w.__kit=true;try{minimapWalkTo=w}catch(e){window.minimapWalkTo=w}
}

/* --------------------------------------------------------- 8. equipment */
var equipView='doll';
var GHOST={head:1,cape:1,amulet:1,ammo:1,weapon:1,body:1,shield:1,legs:1,hands:1,feet:1,ring:1};   // assets/icons/ui/v3/ghosts/<slot>.png
var DOLL=[[null,'head',null],['cape','amulet','ammo'],['weapon','body','shield'],[null,'legs',null],['hands','feet','ring']];
var SLOT_NAME={head:'Head',cape:'Cape',amulet:'Neck',ammo:'Ammunition',weapon:'Weapon',body:'Body',shield:'Shield',legs:'Legs',hands:'Hands',feet:'Feet',ring:'Ring'};
function ghostSvg(k){return GHOST[k]?spr('ghosts/'+k,'kit-ghost'):''}
function bonusText(it){var p=[];if(it.aBonus)p.push('+'+it.aBonus+' Attack');if(it.sBonus)p.push('+'+it.sBonus+' Strength');if(it.dBonus)p.push('+'+it.dBonus+' Defence');if(it.magB||it.mBonus)p.push('+'+(it.magB||it.mBonus)+' Magic');if(it.prayB)p.push('+'+it.prayB+' Prayer');return p}
function refreshEquipKit(){
 var host=$('equip-list');if(!host)return;host.innerHTML='';host.className='kit-equip view-'+equipView;
 var head=el('div','kit-pane-title',equipView==='stats'?'Equipment Stats':equipView==='death'?'Items Kept on Death':'Worn Equipment');host.appendChild(head);
 if(equipView!=='doll'){var ex=doc.createElement('button');ex.type='button';ex.className='kit-x kit-x-pane';paintX(ex);ex.addEventListener('click',function(){click();equipView='doll';refreshEquipKit()});head.appendChild(ex)}
 if(equipView==='doll'){
  var wrap=el('div','kit-doll');
  // the joining grooves of the silhouette (slot centres on a 60 x 43 px lattice)
  wrap.innerHTML='<svg class="doll-lines" viewBox="0 0 158 210" aria-hidden="true"><path d="M79 19V191M19 62H139M19 105H139M19 105V191M139 105V191"/></svg>';
  DOLL.forEach(function(row){row.forEach(function(k){
   if(!k){wrap.appendChild(el('div','kit-slot gap'));return}
   var real=Object.prototype.hasOwnProperty.call(Player.equip,k),v=real?Player.equip[k]:null,d=el('div','kit-slot slot-'+k);
   if(!real){d.classList.add('locked');d.innerHTML=ghostSvg(k);tipify(d,SLOT_NAME[k]+': nothing fits here yet');wrap.appendChild(d);return}
   if(v&&ITEMS[v]){var it=ITEMS[v];d.classList.add('filled');var im=el('img');im.src=iconFor(v);im.alt=it.name;d.appendChild(im);
    var b=bonusText(it);tipify(d,'Remove '+it.name+(b.length?' ('+b.join(', ')+')':''));
    d.addEventListener('click',function(){if(Player.addItem(v,1)){Player.equip[k]=null;click();if(typeof refreshPlayerGear==='function')refreshPlayerGear();UI.refreshEquip();UI.refreshInv&&UI.refreshInv()}else UI.chat('You have no room in your pack to take that off.','plain')});
   }else{d.innerHTML=ghostSvg(k);tipify(d,SLOT_NAME[k]+' slot: empty')}
   wrap.appendChild(d)})});
  host.appendChild(wrap);
 }else if(equipView==='stats'){
  var sum=function(f){return Player._sumBonus?Player._sumBonus(f):0};
  var rows=[['Attack bonus',sum('aBonus')],['Strength bonus',sum('sBonus')],['Defence bonus',Player.defBonus?Player.defBonus():sum('dBonus')],['Magic bonus',Player.magBonus?Player.magBonus():0],['Prayer bonus',sum('prayB')],
   ['Attack speed',Math.round(Player.weaponSpeed()/(typeof TICK!=='undefined'?TICK:.6))+' ticks'],['Weight',Player.weight().toFixed(1)+' kg']];
  var t=el('div','kit-stats');rows.forEach(function(r){var v=r[1],cls=typeof v==='number'?(v>0?'pos':v<0?'neg':''):'';var line=el('div','kit-stat');
   line.innerHTML='<span></span><b class="'+cls+'"></b>';line.firstChild.textContent=r[0];line.lastChild.textContent=typeof v==='number'?(v>0?'+'+v:String(v)):v;t.appendChild(line)});
  host.appendChild(t);
 }else{
  var all=[];Player.inv.forEach(function(s){if(s&&ITEMS[s.id])all.push({id:s.id,val:ITEMS[s.id].value||0})});
  for(var sk in Player.equip){var q=Player.equip[sk];if(q&&ITEMS[q])all.push({id:q,val:ITEMS[q].value||0})}
  all.sort(function(a,b){return b.val-a.val});var kept=all.slice(0,3),kb=el('div','kit-kept');
  for(var i=0;i<3;i++){var c=el('div','kit-slot'+(kept[i]?' filled':''));if(kept[i]){var img=el('img');img.src=iconFor(kept[i].id);c.appendChild(img);tipify(c,ITEMS[kept[i].id].name)}kb.appendChild(c)}
  host.appendChild(kb);host.appendChild(el('p','kit-copy','If you fall, you keep your three most valuable items. Everything else is left where you fell.'));
 }
 var bar=el('div','kit-equip-bar');
 [['stats','Equipment stats'],['death','Kept on death']].forEach(function(b){var btn=el('button','kit-btn'+(equipView===b[0]?' on':''),b[1]);btn.type='button';
  btn.addEventListener('click',function(){equipView=equipView===b[0]?'doll':b[0];click();refreshEquipKit()});bar.appendChild(btn)});
 host.appendChild(bar);
}

/* --------------------------------------------------------- 9. orb fills */
function setFill(e,f){if(e)e.style.setProperty('--f',Math.max(0,Math.min(1,f||0)).toFixed(3))}
function orbFills(){try{var o=orbMeta();
 setFill(o.hp,Player.hp/Math.max(1,Player.maxHp));
 setFill(o.pr,Player.prayerPts/Math.max(1,Player.lvl?Player.lvl('Prayer'):1));
 setFill(o.run,(Player.energy||0)/100);setFill(o.sp,(Player.spec||0)/100)}catch(e){}}
function patchHud(){if(typeof UI==='undefined'||UI.__kitHud)return;UI.__kitHud=true;
 ['refreshHud','refreshRun','refreshSpec'].forEach(function(k){var f=UI[k];if(typeof f!=='function')return;UI[k]=function(){var r=f.apply(this,arguments);orbFills();return r}});
 UI.refreshEquip=refreshEquipKit;
}

/* -------------------------------------------------- 10. login torches */
// Login v4 (owner 2026-09-26: "more like the old 2004 login"): the welcome screen is our Blender stone hall
// (assets/icons/ui/v3/login/hall_dim.png, the CSS background) with a second render of the same hall lit by the fires
// (hall_lit.png) laid over it; its opacity flickers in hard little steps with the fire. Two iron braziers stand at the
// edges, each carrying an 8-frame fire sprite sheet stepped here every 90 ms (JS, not a CSS animation, so it runs the same
// everywhere and the reduced-motion option can slow it). All rendered by
// tools/blender/build_login_art_v4.py + tools/process_login_art_v4.py. buildTorches keeps its name for the boot order.
var torch={t:0,lit:null,prev:.55};
function buildTorches(){
 var ws=$('welcome-screen');if(!ws||ws.querySelector('.login-brazier'))return;
 var lit=el('div','login-hall-lit');lit.setAttribute('aria-hidden','true');ws.insertBefore(lit,ws.firstChild);torch.lit=lit;
 ['left','right'].forEach(function(side){
  var b=el('div','login-brazier login-brazier-'+side);b.setAttribute('aria-hidden','true');
  b.innerHTML='<i class="lb-fire"></i><img class="lb-stand" src="'+SPR_BASE+'login/brazier.png'+SPRV+'" alt="" draggable="false">';
  ws.appendChild(b)});
 var fires=Array.prototype.slice.call(ws.querySelectorAll('.login-brazier .lb-fire')),tick=0;
 setInterval(function(){if(ws.style.display!=='flex')return;tick++;if(ws.classList.contains('login-reduced-motion')&&tick%3)return;
  fires.forEach(function(f,i){var fr=(tick+i*3)%8;f.style.backgroundPosition=(-fr*f.clientWidth)+'px 0'})},90);
 var r=rng(7);
 torch.t=setInterval(function(){if(ws.style.display!=='flex')return;var reduced=ws.classList.contains('login-reduced-motion');
  // a wandering flicker: mostly the steady glow, now and then a brighter or dimmer lick (hard steps, no easing)
  var target=reduced?.5+(r()-.5)*.12:.35+r()*.55;torch.prev=torch.prev*.45+target*.55;lit.style.opacity=(Math.round(torch.prev*8)/8).toFixed(3)},reduced0()?260:120);
 function reduced0(){return ws.classList.contains('login-reduced-motion')}
 snapPanel(ws);
}
// the bitmap font only looks crisp on whole pixels: the panel is centred with translate(-50%,-50%), which lands on a half
// pixel whenever its size is odd, so nudge it back onto the grid whenever its size or the window changes
function snapPanel(ws){var box=$('welcome-box');if(!box||box.__snap)return;box.__snap=true;
 var fix=function(){if(ws.style.display!=='flex')return;box.style.setProperty('--sx','0px');box.style.setProperty('--sy','0px');var r=box.getBoundingClientRect();
  box.style.setProperty('--sx',(Math.round(r.left)-r.left).toFixed(3)+'px');box.style.setProperty('--sy',(Math.round(r.top)-r.top).toFixed(3)+'px')};
 try{new ResizeObserver(function(){requestAnimationFrame(fix)}).observe(box)}catch(e){}
 addEventListener('resize',function(){requestAnimationFrame(fix)});setTimeout(fix,300);setInterval(function(){if(ws.style.display==='flex')fix()},1500)}

/* ------------------------------------------- 12. windows: X + Escape */
// Every window that can open carries the same stone X in its top-right corner, and Escape closes the topmost one.
// Windows that already had a close control keep it (its click runs their own close logic); the rest get one.
var WINS=[
 {sel:'.modal'},
 {sel:'#smith-grid-overlay',host:function(e){return e.firstElementChild},close:function(e){e.style.display='none'}},
 {sel:'#music-menu',host:function(e){return e.firstElementChild||e},close:function(e){e.style.display='none'}},
 {sel:'#admin-panel',close:function(e){e.style.display='none'}},
 {sel:'#test-travel-panel'}
];
var LEGACY_ESC={'dialogue-modal':1,'bank-modal':1,'shop-modal':1};   // game4_ui's own Escape closes these, as before
function isOpen(e){if(!e||!e.isConnected)return false;var cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0}
function ownClose(e){if(!e)return null;var kids=e.children;for(var i=0;i<kids.length;i++){var c=kids[i];if(c.classList&&(c.classList.contains('close-x')||c.classList.contains('quest-scroll-close')||c.classList.contains('kit-x')))return c}return null}
function paintX(b){if(b.dataset.kitx)return;b.dataset.kitx='1';b.classList.add('kit-x');b.innerHTML=spr('close');b.setAttribute('role','button');b.setAttribute('tabindex','0');tipify(b,'Close');
 b.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.click()}})}
function decorateWindows(){var mm=$('music-menu'),msp=mm&&mm.firstElementChild&&mm.firstElementChild.querySelector('span');if(msp&&!msp.classList.contains('close-x'))msp.classList.add('close-x');   // its own close (MusicMenu.close) becomes the kit X
 Array.prototype.forEach.call(doc.querySelectorAll('.modal,#smith-grid-overlay,#music-menu'),function(m){if(m.style.display!=='none')spriteEmojis(m)});
 var tt=$('test-travel-toggle');if(tt&&!tt.querySelector('.kit-spr')){tt.innerHTML=spr('mglobe');tt.style.lineHeight='0'}
 WINS.forEach(function(w){Array.prototype.forEach.call(doc.querySelectorAll(w.sel),function(e){
 if(e.id==='kit-creator')return;var host=w.host?w.host(e):e;if(!host)return;var x=ownClose(host)||ownClose(e);
 if(x){paintX(x);return}
 x=doc.createElement('button');x.type='button';x.className='kit-x kit-x-added';host.appendChild(x);paintX(x);
 x.addEventListener('click',function(ev){ev.stopPropagation();click();closeWindow(e,w)})})})}
function closeWindow(e,w){var host=w&&w.host?w.host(e):e,x=ownClose(host)||ownClose(e);
 if(x&&!x.classList.contains('kit-x-added')){x.click();if(isOpen(e)&&typeof UI!=='undefined'&&e.id)try{UI.closeModal(e.id)}catch(err){}return}
 if(w&&w.close)w.close(e);else e.style.display='none'}
function topWindow(){var best=null,bz=-1e9;WINS.forEach(function(w){Array.prototype.forEach.call(doc.querySelectorAll(w.sel),function(e){if(!isOpen(e))return;
 var z=parseInt(getComputedStyle(e).zIndex,10);if(!isFinite(z))z=0;if(z>=bz){bz=z;best={el:e,w:w}}})});return best}
// sub-views inside the side panel (equipment stats, kept-on-death, a creature's drops) close back to their list
function closeSubview(){
 var eq=$('pane-equip');if(eq&&eq.classList.contains('active')&&equipView!=='doll'){equipView='doll';refreshEquipKit();return true}
 var dp=$('pane-drops'),back=dp&&dp.classList.contains('active')&&dp.querySelector('.drops-back');if(back){back.click();return true}
 return false}
function installWindows(){
 if(installWindows.done)return;installWindows.done=true;
 decorateWindows();var pend=false;
 new MutationObserver(function(){if(pend)return;pend=true;requestAnimationFrame(function(){pend=false;decorateWindows()})}).observe(doc.body,{childList:true,subtree:true});
 doc.addEventListener('keydown',function(e){
  if(e.key!=='Escape'&&e.key!=='Esc')return;var t=e.target;
  if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName||''))return;                 // fields handle their own Escape
  var ws=$('welcome-screen');if(ws&&ws.style.display==='flex')return;       // the login screen has its own
  if(doc.body.classList.contains('kit-creator-open'))return;
  var top=topWindow();
  if(top){if(LEGACY_ESC[top.el.id])return;closeWindow(top.el,top.w);e.preventDefault();e.stopImmediatePropagation();return}
  if(closeSubview())e.preventDefault()},true);
 // the bestiary's drop list for one creature is a sub-view: give it the same X
 if(typeof UI!=='undefined'&&UI.showDropTable&&!UI.showDropTable.__kit){var sd=UI.showDropTable;UI.showDropTable=function(){var r=sd.apply(this,arguments);var list=$('drops-list');
  if(list&&!list.querySelector('.kit-x')){var x=doc.createElement('button');x.type='button';x.className='kit-x kit-x-pane';paintX(x);x.addEventListener('click',function(){click();closeSubview()});list.insertBefore(x,list.firstChild)}return r};UI.showDropTable.__kit=true}
}

/* ------------------------------------------- 13. tutorial item ring */
// UI.highlightItem(id): a pulsing gold ring on that item's pack slot (the island guide calls it with the step's item).
var hint={id:null};
function applyItemHint(){var g=$('inv-grid');if(!g)return;var want=-1;
 if(hint.id&&typeof Player!=='undefined'&&Player.inv)want=Player.inv.findIndex(function(s){return s&&s.id===hint.id});
 Array.prototype.forEach.call(g.children,function(c,i){var on=i===want;if(c.classList.contains('kit-hint')!==on)c.classList.toggle('kit-hint',on)})}
function patchInvHint(){if(typeof UI==='undefined'||UI.highlightItem)return;
 UI.highlightItem=function(id){hint.id=id||null;applyItemHint()};
 var r0=UI.refreshInv;if(typeof r0==='function')UI.refreshInv=function(){var r=r0.apply(this,arguments);applyItemHint();return r}}

/* ------------------------------------------------------------- 11. boot */
// music tab: the real track list (green = unlocked, red = not yet heard), click a green one to play it
function refreshMusicKit(){try{
 var pane=$('pane-music');if(!pane||typeof TRACKS==='undefined'||typeof Music==='undefined')return;var list=pane.querySelector('.kit-list'),now=pane.querySelector('.music-now b');if(!list)return;
 list.innerHTML='';var cur=Music.current&&TRACKS[Music.current]?TRACKS[Music.current].name:'None';if(now)now.textContent=Music.on?cur:'(music off)';
 Object.keys(TRACKS).forEach(function(id){var un=(Music.unlocked||[]).indexOf(id)>=0,d=el('div','music-track'+(un?' unlocked':' locked')+(Music.on&&Music.current===id?' active':''));d.textContent=TRACKS[id].name;
  d.style.cursor='pointer';tipify(d,un?'Play '+TRACKS[id].name:'Not unlocked yet');
  d.addEventListener('click',function(){click();if(!un){UI.chat('You have not unlocked this piece of music yet!','plain');return}
   try{Music.mode='manual';Music.play(id);if(!Music.on)Music.start()}catch(e){}setTimeout(refreshMusicKit,50)});list.appendChild(d)})}catch(e){console.warn('[ui-kit] music',e)}}
function wireMusicTab(){Array.prototype.forEach.call(doc.querySelectorAll('.tab-btn[data-tab="music"]'),function(b){if(b.__kitm)return;b.__kitm=true;b.addEventListener('click',refreshMusicKit)});
 var tb=doc.querySelector('#pane-music .set-btn');if(tb&&!tb.__kitm){tb.__kitm=true;tb.addEventListener('click',function(){setTimeout(refreshMusicKit,60)})}}
// the old client never showed markup in the chat: strip the few inline tags some messages carry
function patchChat(){if(typeof UI==='undefined'||UI.__kitChat)return;UI.__kitChat=true;var c0=UI.chat;
 UI.chat=function(msg,cls){if(typeof msg==='string'){if(msg.indexOf('<')>=0)msg=msg.replace(/<\/?(b|i|u|br|span)[^>]*>/g,'');msg=stripPicto(msg)}return c0.call(this,msg,cls)}}
// pictographs (emoji) never appeared in the old client's lettering: drop them from chat lines
var PICTO=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]\s*/gu;
function stripPicto(t){return String(t).replace(PICTO,'').replace(/^\s+/,'')}
// ...and in windows the few that carried meaning become sprites
var EMOJI_SPR={'\u{1F3B5}':'misc/note','\u{1F3BC}':'misc/note','\u{1F6A9}':'misc/flag','⚒':'skills18/smithing','\u{1F4BE}':'misc/chest','\u{1F3C5}':'misc/medal','⬜':'misc/medal_off','\u{1F4DC}':'tabs/quests'};
var EMOJI_RX=new RegExp(Object.keys(EMOJI_SPR).join('|'),'gu');
function spriteEmojis(root){var tx=root&&root.textContent||'';EMOJI_RX.lastIndex=0;if(!EMOJI_RX.test(tx)){EMOJI_RX.lastIndex=0;return}EMOJI_RX.lastIndex=0;
 var w=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT),n,hit=[];while((n=w.nextNode())){EMOJI_RX.lastIndex=0;if(n.nodeValue&&EMOJI_RX.test(n.nodeValue))hit.push(n)}
 hit.forEach(function(t){EMOJI_RX.lastIndex=0;var span=doc.createElement('span');
  span.innerHTML=t.nodeValue.replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]}).replace(EMOJI_RX,function(e){return spr(EMOJI_SPR[e],'kit-inline')});
  if(t.parentNode)t.parentNode.replaceChild(span,t)});EMOJI_RX.lastIndex=0}
// the quest journal marks the tracked quest with a flag: the rendered pennant instead of the emoji
function patchQuests(){if(typeof UI==='undefined'||!UI.refreshQuests||UI.refreshQuests.__kit)return;var q0=UI.refreshQuests;
 UI.refreshQuests=function(){var r=q0.apply(this,arguments);try{spriteEmojis($('quest-list'))}catch(e){}return r};UI.refreshQuests.__kit=true}
// dialogue: a chathead in the old corner -- the tutor's rendered portrait, or a rendered stand-in head (never an emoji)
var TUTORS=['aldous','ansel','bram','corrick','durgin','hettie','ilse','maud','tobin','wenna'];
function patchDialogue(){if(typeof UI==='undefined'||!UI.dialogue||UI.dialogue.__kit)return;var d0=UI.dialogue;
 UI.dialogue=function(name,text,opts,face){var r=d0.apply(this,arguments);try{var h=$('dlg-head');if(h&&!h.querySelector('img')){
  var low=String(name||'').toLowerCase(),id=null;TUTORS.forEach(function(t){if(new RegExp('\\b'+t+'\\b').test(low))id=t});
  h.textContent='';if(id)h.innerHTML='<img src="assets/icons/tutors/'+id+'.png?v=29" alt="">';else h.innerHTML=spr('misc/chathead','kit-chathead')}}catch(e){}return r};UI.dialogue.__kit=true}
// village folk speak through the same crisp overhead text as the player
function patchVillageChatter(){if(typeof window.sayOverhead==='function'&&!window.sayOverhead.__kit){var f=function(mesh,text,secs){sayOverhead(mesh,text,secs||3.4);return null};f.__kit=true;window.sayOverhead=f}}
// emotes: a player who clicks one sees it happen (a line in the chat, the gesture over their head)
function wireEmotes(){Array.prototype.forEach.call(doc.querySelectorAll('#pane-emotes .emote-grid button'),function(b){if(b.__kit)return;b.__kit=true;var n=(b.getAttribute('title')||'').trim();tipify(b,n);
 if(SPR['emote_'+n.toLowerCase()])b.innerHTML=spr('emote_'+n.toLowerCase())+'<small>'+n+'</small>';
 b.addEventListener('click',function(){click();var v={Yes:'nod',No:'shake your head',Bow:'bow',Angry:'fume',Think:'ponder',Wave:'wave',Cheer:'cheer',Laugh:'laugh',Dance:'dance a jig',Sit:'sit a moment',Shrug:'shrug',Clap:'clap'}[n]||'gesture';
  UI.chat('You '+v+'.','plain');if(typeof player!=='undefined'&&player)sayOverhead(player,'*'+v.split(' ')[0]+'*',2.4)})})}
// the hidden legacy tab rows come first in the DOM, so scripts that click querySelector('.tab-btn[data-tab=..]') light
// up an invisible button: mirror the open tab onto the visible rows after every tab click
function syncTabs(){doc.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('.tab-btn'):null;if(!b||!b.dataset.tab)return;var t=b.dataset.tab;
 Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(x){x.classList.toggle('active',x.dataset.tab===t)})})}
var TAB_TIPS={combat:'Combat options',skills:'Skills',quests:'Quest list',inv:'Inventory',equip:'Worn equipment',prayers:'Prayer',spells:'Magic',drops:'Bestiary',
 clan:'Clan chat',friends:'Friends list',ignore:'Ignore list',logout:'Logout',settings:'Settings',emotes:'Emotes',music:'Music player'};
function tabIcons(){Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(b){var k=b.dataset.tab;if(!SPR['t_'+k]||b.querySelector('img.kit-tab'))return;
 b.innerHTML=spr('t_'+k,'kit-tab');if(TAB_TIPS[k]){b.removeAttribute('data-tip');b.setAttribute('title',TAB_TIPS[k])}})}
// settings rows, the logout pane and the deeds list carry sprites too
var SET_ICON={'run energy':'boot','music':'note','music volume':'note','sound effects':'bell','roofs':'roof','world map':'mglobe'};
function decoratePanes(){
 Array.prototype.forEach.call(doc.querySelectorAll('#pane-settings .set-row'),function(r){if(r.querySelector('.kit-spr'))return;var sp=r.querySelector('span');if(!sp)return;
  var k=SET_ICON[(sp.textContent||'').trim().toLowerCase()];if(k)r.insertAdjacentHTML('afterbegin',spr(k))});
 var lo=doc.querySelector('#pane-logout .kit-logout');if(lo&&!lo.querySelector('.kit-spr'))lo.insertAdjacentHTML('afterbegin',spr('t_logout','kit-door'));
}
function patchDeeds(){if(typeof Deeds==='undefined'||!Deeds.openPanel||Deeds.openPanel.__kit)return;var o=Deeds.openPanel;
 Deeds.openPanel=function(){var r=o.apply(this,arguments);var m=$('deeds-modal');if(m){var on=spr('mmedal','kit-medal'),off=spr('mmedal_off','kit-medal');
  m.innerHTML=m.innerHTML.replace(/\u{1F3C5}/gu,on).replace(/\u2B1C/g,off);decorateWindows()}return r};Deeds.openPanel.__kit=true}
function tabTips(){tabIcons();Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(b){tipify(b)});
 var so=$('objective');if(so){var sb=so.querySelector('button');if(sb)tipify(sb,'Skip the island tutorial')}
 var z=$('zone-box');if(z)z.setAttribute('aria-label','Current area')}
var mo=null;
function boot(){
 retireLayers();installTip();buildCluster();buildRail();buildChat();tabTips();decoratePanes();patchDeeds();patchDialogue();patchQuests();patchControls();patchNames();patchMinimapWalk();patchHud();buildTorches();refreshChatName();wireEmotes();syncTabs();wireMusicTab();patchChat();patchVillageChatter();installWindows();patchInvHint();
 // late-built HUD buttons (overlays, deeds, appearance) join the rail as they appear
 if(!adoptTools()){mo=new MutationObserver(function(){if(adoptTools()){mo.disconnect();mo=null}});mo.observe(doc.body,{childList:true,subtree:true});setTimeout(function(){if(mo){mo.disconnect();mo=null}},120000)}
 setTimeout(retireLayers,0);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('load',function(){retireLayers();wireChatTabs();adoptTools();patchControls();patchNames();patchMinimapWalk();patchHud();patchInvHint();tabIcons();decoratePanes();patchDeeds();patchDialogue();patchQuests();decorateWindows();orbFills()});
// once the adventurer is in the world: sweep any name sprites made before the kit loaded, refresh the chat name
var sweeps=0,sweep=setInterval(function(){if(typeof running!=='undefined'&&running){hideNameSprites();refreshChatName();orbFills();if(++sweeps>=6)clearInterval(sweep)}},2500);
window.UIKit={sayOverhead:sayOverhead,refreshEquip:refreshEquipKit,textures:setTex};
})();
