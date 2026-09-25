/* ============================================================================
   UI_OSRS_KIT — the one coherent old-school interface kit (owner 2026-09-25:
   "more medieval, a well-done detailed UI; better organised; a clearer minimap").

   Loads LAST. It owns assets/ui/osrs_kit.css and replaces the earlier stacked
   re-skin layers that fought each other (ui_osrs / ui_minimap / ui_finish /
   ui_equip_quest style blocks are retired here; their DOM and handlers stay).

   What lives here (all of it our own artwork: canvas-generated stone, slate and
   parchment textures and hand-written SVG icons; no Jagex sprites, fonts or
   images are used or traced):
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
var link=el('link');link.rel='stylesheet';link.href='assets/ui/osrs_kit.css?v=2';
var fonts=el('link');fonts.rel='stylesheet';
fonts.href='https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap';
(doc.head||root).appendChild(fonts);(doc.head||root).appendChild(link);
root.classList.add('osrs-kit');
// retire the older chrome layers so one stylesheet owns the look (their DOM/handlers stay)
function retireLayers(){['ui-osrs-style','ui-minimap-style','ui-finish-css','ui-equip-quest-style'].forEach(function(id){var s=$(id);if(s&&s.parentNode)s.parentNode.removeChild(s)});
 // keep the kit stylesheet last in <head> so equal-specificity rules resolve in its favour
 if(link.parentNode&&link!==doc.head.lastElementChild)doc.head.appendChild(link)}

/* ------------------------------------------------------------ 1. textures */
function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function canvas(w,h){var c=doc.createElement('canvas');c.width=w;c.height=h;return c}
function speckle(x,w,h,r,n,a,light){for(var i=0;i<n;i++){var v=r();x.fillStyle=(light&&v>.5)?'rgba(255,240,210,'+(a*r())+')':'rgba(0,0,0,'+(a*r())+')';x.fillRect(r()*w|0,r()*h|0,1+(r()*2|0),1+(r()*2|0))}}
// weathered stone: irregular courses of blocks, each tinted, chipped and bevelled
function stoneTex(seed,base,w,h){var c=canvas(w,h),x=c.getContext('2d'),r=rng(seed);
 x.fillStyle='#1c1812';x.fillRect(0,0,w,h);
 var y=0;while(y<h){var ch=14+(r()*8|0);var xo=-(r()*20|0);var bx=xo;
  while(bx<w){var bw=18+(r()*22|0),t=(r()-.5)*16;var cc=base.map(function(v){return Math.max(0,Math.min(255,v+t|0))});
   x.fillStyle='rgb('+cc+')';x.fillRect(bx+1,y+1,bw-2,ch-2);
   x.fillStyle='rgba(255,236,200,.13)';x.fillRect(bx+1,y+1,bw-2,1);x.fillRect(bx+1,y+1,1,ch-2);
   x.fillStyle='rgba(0,0,0,.30)';x.fillRect(bx+1,y+ch-2,bw-2,1);x.fillRect(bx+bw-2,y+1,1,ch-2);
   if(r()<.35){x.fillStyle='rgba(0,0,0,.22)';x.fillRect(bx+2+r()*(bw-6),y+2+r()*(ch-6),2+r()*3,1+r()*2)}
   bx+=bw}
  y+=ch}
 // wrap seam: repeat the first course at the bottom so the tile repeats cleanly
 speckle(x,w,h,r,w*h/9,.28,true);return c.toDataURL()}
function slateTex(seed,base,w,h,amt){var c=canvas(w,h),x=c.getContext('2d'),r=rng(seed);x.fillStyle='rgb('+base+')';x.fillRect(0,0,w,h);
 for(var i=0;i<46;i++){x.fillStyle='rgba('+(r()<.5?'0,0,0':'255,235,200')+','+(.012+r()*.026)+')';x.beginPath();x.ellipse(r()*w,r()*h,6+r()*22,3+r()*10,r()*3,0,7);x.fill()}
 speckle(x,w,h,r,w*h/(amt||7),.22,true);return c.toDataURL()}
function parchTex(seed,w,h){var c=canvas(w,h),x=c.getContext('2d'),r=rng(seed);x.fillStyle='#d6c9a4';x.fillRect(0,0,w,h);
 for(var i=0;i<80;i++){x.fillStyle='rgba('+(r()<.6?'120,90,40':'255,250,230')+','+(.025+r()*.05)+')';x.beginPath();x.ellipse(r()*w,r()*h,6+r()*30,3+r()*14,r()*3,0,7);x.fill()}
 x.strokeStyle='rgba(110,80,40,.10)';for(var j=0;j<140;j++){x.beginPath();var a=r()*w,b=r()*h;x.moveTo(a,b);x.lineTo(a+(r()-.5)*16,b+(r()-.5)*3);x.stroke()}
 speckle(x,w,h,r,w*h/10,.12,false);return c.toDataURL()}
function woodTex(seed,w,h){var c=canvas(w,h),x=c.getContext('2d'),r=rng(seed);x.fillStyle='#5a3d22';x.fillRect(0,0,w,h);
 for(var i=0;i<h;i+=2){x.fillStyle='rgba('+(r()<.5?'0,0,0':'255,220,170')+','+(.04+r()*.08)+')';x.fillRect(0,i,w,1+(r()*2|0))}
 for(var k=0;k<6;k++){x.strokeStyle='rgba(30,16,6,.35)';x.beginPath();x.ellipse(r()*w,r()*h,3+r()*5,1.5+r()*2,0,0,7);x.stroke()}return c.toDataURL()}
function setTex(){try{var S=root.style;
 S.setProperty('--tex-stone','url('+stoneTex(7,[92,84,70],160,120)+')');
 S.setProperty('--tex-stone-dark','url('+stoneTex(19,[62,56,46],160,120)+')');
 S.setProperty('--tex-slate','url('+slateTex(3,[62,53,41],128,128,9)+')');
 S.setProperty('--tex-stone-smooth','url('+slateTex(23,[98,90,76],128,128,5)+')');
 S.setProperty('--tex-slate-dark','url('+slateTex(11,[40,34,26],128,128,6)+')');
 S.setProperty('--tex-parch','url('+parchTex(5,256,160)+')');
 S.setProperty('--tex-wood','url('+woodTex(9,128,64)+')');
}catch(e){console.warn('[ui-kit] textures',e)}}
setTex();

/* --------------------------------------------------------------- 2. icons */
// Our own simple icon drawings (viewBox 0 0 24 24), coloured like painted game sprites.
var ICON={
 music:'<path d="M9 17.5V5.2l10-2.2v12.3" fill="none" stroke="#1a1208" stroke-width="3.2"/><path d="M9 17.5V5.2l10-2.2v12.3" fill="none" stroke="#e8d27a" stroke-width="1.6"/><ellipse cx="6.6" cy="17.8" rx="3.3" ry="2.5" fill="#e8d27a" stroke="#1a1208" stroke-width="1.2"/><ellipse cx="16.6" cy="15.5" rx="3.3" ry="2.5" fill="#e8d27a" stroke="#1a1208" stroke-width="1.2"/><path d="M9 8.2l10-2.2" stroke="#1a1208" stroke-width="1.2"/>',
 muted:'<path d="M4 4l16 16M20 4L4 20" stroke="#1a0303" stroke-width="4.4" stroke-linecap="round"/><path d="M4 4l16 16M20 4L4 20" stroke="#e0412f" stroke-width="2.4" stroke-linecap="round"/>',
 layers:'<path d="M12 3l9 4.6-9 4.6-9-4.6z" fill="#c9b27a" stroke="#1a1208" stroke-width="1.3"/><path d="M4.6 11.4L3 12.3l9 4.6 9-4.6-1.6-.9" fill="none" stroke="#1a1208" stroke-width="3"/><path d="M4.6 11.4L3 12.3l9 4.6 9-4.6-1.6-.9" fill="none" stroke="#9ec06a" stroke-width="1.4"/><path d="M4.6 16L3 16.9l9 4.6 9-4.6-1.6-.9" fill="none" stroke="#1a1208" stroke-width="3"/><path d="M4.6 16L3 16.9l9 4.6 9-4.6-1.6-.9" fill="none" stroke="#7bb4d8" stroke-width="1.4"/>',
 scroll:'<rect x="5" y="4" width="13" height="16" rx="1" fill="#dcc890" stroke="#1a1208" stroke-width="1.3"/><rect x="3.5" y="2.6" width="16" height="3.4" rx="1.7" fill="#b8955a" stroke="#1a1208" stroke-width="1.2"/><rect x="3.5" y="18.2" width="16" height="3.4" rx="1.7" fill="#b8955a" stroke="#1a1208" stroke-width="1.2"/><path d="M7.6 8.6h8M7.6 11.2h8M7.6 13.8h5.4" stroke="#6b4c25" stroke-width="1.1"/><circle cx="15.6" cy="15.6" r="2.3" fill="#b3261e" stroke="#1a1208" stroke-width="1"/>',
 look:'<ellipse cx="12" cy="8.6" rx="4.4" ry="5" fill="#e0b48a" stroke="#1a1208" stroke-width="1.3"/><path d="M7.4 8c.2-3.6 2.2-5.4 4.6-5.4s4.6 1.6 4.8 5.2c-1.4-1.6-3-2.2-4.8-2.3C10 5.6 8.6 6.4 7.4 8z" fill="#6a4422" stroke="#1a1208" stroke-width="1"/><path d="M3.8 22c.6-4.6 3.8-7 8.2-7s7.6 2.4 8.2 7z" fill="#5d8a3c" stroke="#1a1208" stroke-width="1.3"/>',
 globe:'<circle cx="12" cy="12" r="9" fill="#3d6fa6" stroke="#1a1208" stroke-width="1.4"/><path d="M6.2 7.4c2 .2 3.2 1.4 3 3-.2 1.3 1.3 2 1 3.6-.3 1.4-1.8 1.4-2.2 3.2-1.8-1.2-3.4-3.6-3.2-5.6.1-1.6.6-3 1.4-4.2zM13.8 4.2c1.8.3 2 1.8 3.6 2.1 1 .2 2.2 1.6 2.2 3.4-1.2 0-2 .9-2.4 2.3-.5 1.8-2.5 1.5-2.7 3.4-.1 1.1-1.1 2-2.3 2.1.4-2 1.4-3 .6-4.6-.8-1.5-2.8-1.5-2.7-3.2.1-1.4 1.8-1.4 2.2-2.6.3-1 .8-2.1 1.5-2.9z" fill="#6aa04a" stroke="#1d3312" stroke-width=".7"/><ellipse cx="9" cy="7" rx="3.4" ry="1.6" fill="rgba(255,255,255,.22)"/>',
 heart:'<path d="M12 20.4S3.4 14.8 3.4 9.1C3.4 6.3 5.5 4.3 8 4.3c1.7 0 3.1.9 4 2.3.9-1.4 2.3-2.3 4-2.3 2.5 0 4.6 2 4.6 4.8 0 5.7-8.6 11.3-8.6 11.3z" fill="#c8261c" stroke="#1a0303" stroke-width="1.4"/><ellipse cx="8.2" cy="8.6" rx="2" ry="1.4" fill="rgba(255,210,190,.55)"/>',
 prayer:'<path d="M12 2.6l2.3 7.1 7.1 2.3-7.1 2.3L12 21.4l-2.3-7.1-7.1-2.3 7.1-2.3z" fill="#eef4ff" stroke="#10182a" stroke-width="1.3"/><path d="M12 6.8l1 4.2 4.2 1-4.2 1-1 4.2-1-4.2-4.2-1 4.2-1z" fill="#9fc4f2"/>',
 run:'<path d="M9.6 3.6c1.4 0 2.3 1 2.1 2.2-.2 1.2-1.4 2-2.6 1.9-1.2-.1-1.9-1.1-1.6-2.2.3-1.1 1-1.9 2.1-1.9z" fill="#e3c68a" stroke="#1a1208" stroke-width="1.1"/><path d="M8.4 8.6l4.4.4 2.6 3 3 .2-.4 1.8-3.8-.3-1.6-1.6-.9 3 2.8 2-1 4.3-1.9-.3.6-3.2-3-1.8-1.8 3.5-3.9-.3.3-1.9 2.6.2 2-5-1.9.8-1.5 2.4-1.6-1 2-3.2z" fill="#e8c85a" stroke="#1a1208" stroke-width="1.1"/>',
 spec:'<path d="M4 20L16.8 7.2M4.6 4.6l14.8 14.8" stroke="#1a1208" stroke-width="3.6" stroke-linecap="round"/><path d="M4 20L16.8 7.2M4.6 4.6l14.8 14.8" stroke="#dfe6ee" stroke-width="1.8" stroke-linecap="round"/><path d="M16.8 7.2l2.6-3.4-3.3 2.7zM6.4 16.1l1.6 1.6M16.1 16.4l1.6-1.6" stroke="#b08a3c" stroke-width="2.2" stroke-linecap="round"/>',
 swords:'<path d="M4 20L17 7M5 5l13 13" stroke="#1a1208" stroke-width="3.8" stroke-linecap="round"/><path d="M4 20L17 7M5 5l13 13" stroke="#cfd6de" stroke-width="1.8" stroke-linecap="round"/><path d="M5.4 15.4l3.2 3.2M15.4 15.4l-3.2 3.2" stroke="#8a6a2a" stroke-width="2.4" stroke-linecap="round"/>',
 coins:'<ellipse cx="9" cy="16.5" rx="6" ry="2.6" fill="#b88a22" stroke="#1a1208" stroke-width="1.2"/><ellipse cx="9" cy="14.3" rx="6" ry="2.6" fill="#e8c24a" stroke="#1a1208" stroke-width="1.2"/><ellipse cx="15.4" cy="10.6" rx="6" ry="2.6" fill="#b88a22" stroke="#1a1208" stroke-width="1.2"/><ellipse cx="15.4" cy="8.4" rx="6" ry="2.6" fill="#f2d25e" stroke="#1a1208" stroke-width="1.2"/>',
 compass:'<circle cx="12" cy="12" r="10.2" fill="#d9ccaa" stroke="#1a1208" stroke-width="1.4"/><circle cx="12" cy="12" r="8" fill="none" stroke="#8a7650" stroke-width=".8"/><path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4" stroke="#1a1208" stroke-width="1.2"/><g id="compass-needle"><path d="M12 3.6l2.6 8.4h-5.2z" fill="#c22a1e" stroke="#1a0303" stroke-width=".9"/><path d="M12 20.4l2.6-8.4h-5.2z" fill="#f2ecdc" stroke="#1a1208" stroke-width=".9"/><circle cx="12" cy="12" r="1.3" fill="#1a1208"/></g>'
};
function svg(name,cls){return '<svg class="kit-ico '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+ICON[name]+'</svg>'}
function svgUrl(name){return 'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'+ICON[name]+'</svg>')+'")'}
['heart','prayer','run','spec','swords','coins'].forEach(function(n){root.style.setProperty('--ico-'+n,svgUrl(n))});

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
 var cb=$('compass-btn');if(cb){cb.innerHTML=svg('compass','compass-face');tipify(cb,'Face north (reset the camera)')}
 var wb=$('worldmap-btn');if(wb){wb.innerHTML=svg('globe');tipify(wb,'World map')}
 var mm=$('minimap');if(mm)tipify(mm,'Click the map to walk there');
 var needle=null;window.CRCompassSet=function(yaw){needle=needle||doc.getElementById('compass-needle');if(needle)needle.setAttribute('transform','rotate('+(yaw*180/Math.PI).toFixed(1)+' 12 12)')};
}
function buildRail(){
 if(rail)return;rail=el('div');rail.id='hud-rail';rail.setAttribute('role','toolbar');rail.setAttribute('aria-label','Game tools');
 var info=el('div','rail-info');rail.appendChild(info);rail.appendChild(el('div','rail-tools'));doc.body.appendChild(rail);
 var o=orbMeta();
 if(o.cmb){o.cmb.classList.add('rail-plaque','plaque-combat');info.appendChild(o.cmb);tipify(o.cmb,'Combat level')}
 if(o.coin){o.coin.classList.add('rail-plaque','plaque-coins');info.appendChild(o.coin);tipify(o.coin,'Crowns carried')}
 adoptTools();
}
var TOOLS=[['music-btn','music','Music: click for the music menu'],['overlays-btn','layers','Overlays (Shift+L)'],['deeds-btn','scroll','Realm deeds and log (Shift+K)'],['char-styler-btn','look','Change appearance (Shift+C)']];
function adoptTools(){if(!rail)return true;var box=rail.querySelector('.rail-tools'),all=true;
 TOOLS.forEach(function(t,i){var b=$(t[0]);if(!b){all=false;return}
  if(b.parentNode!==box){b.removeAttribute('style');b.classList.add('rail-btn');b.type='button';tipify(b,t[2]);paintTool(b,t[1]);
   // keep the rail order fixed however late a button is created
   var after=null;for(var k=i+1;k<TOOLS.length;k++){var n=$(TOOLS[k][0]);if(n&&n.parentNode===box){after=n;break}}box.insertBefore(b,after)}});
 return all}
function paintTool(b,icon){if(b.id==='music-btn'){watchMusic(b);return}b.innerHTML=svg(icon)}
// Music.start/stop write ♪ / ✕ into the button: keep the drawn note and show a red cross when muted
function watchMusic(b){var mo=null,paint=function(){var txt=b.textContent||'';var muted=/✕|✕/.test(txt)||b.classList.contains('muted');
  if(/✕|✕/.test(txt))b.classList.add('muted');else if(/♪|♪/.test(txt))b.classList.remove('muted');
  if(mo)mo.disconnect();b.innerHTML=svg('music')+(b.classList.contains('muted')?svg('muted','kit-ico-over'):'');if(mo)mo.observe(b,{childList:true,characterData:true,subtree:true});return muted};
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
var GHOST={
 head:'<path d="M7 17v-5.5C7 7.5 9.2 5 12 5s5 2.5 5 6.5V17h-2.6v-3.4H9.6V17z"/>',
 cape:'<path d="M8.6 4h6.8l3.8 16.4-7.2-3-7.2 3z"/>',
 amulet:'<path d="M7 5c0 5.4 2.2 8 5 8s5-2.6 5-8" fill="none" stroke-width="1.6"/><path d="M12 13l2.4 2.8L12 19l-2.4-3.2z"/>',
 ammo:'<path d="M5 19L15.5 8.5M7.5 19.5L18 9M4.5 16.5L15 6" stroke-width="1.3" fill="none"/><path d="M15 5.5l4 .6-.6 4z"/>',
 weapon:'<path d="M5.5 19.5L16.8 6.2l2.4-1.4-1.4 2.4L6.5 20.5zM4 16.6l3.4 3.4-1 1-3.4-3.4z"/>',
 body:'<path d="M8.4 4.4L12 6l3.6-1.6 4.6 2.8-1.6 5.4-1.8-.8V20H7.2v-8.2l-1.8.8-1.6-5.4z"/>',
 shield:'<path d="M12 3.6l7.6 2.6c0 7.4-2.6 11.6-7.6 14.2C7 17.8 4.4 13.6 4.4 6.2z"/>',
 legs:'<path d="M7.4 4h9.2l.8 16.4h-3.6L12 10.6l-1.8 9.8H6.6z"/>',
 hands:'<path d="M8.2 20V12L6.6 8.4c-.4-.9.8-1.6 1.4-.8l1.4 2V5.2c0-1 1.4-1 1.4 0V10V4.4c0-1 1.4-1 1.4 0V10V5c0-1 1.4-1 1.4 0v5.4-3.6c0-1 1.4-1 1.4 0V14l-1 6z"/>',
 feet:'<path d="M7.6 4h5.4v9.4l5.6 2.6c1 .5 1.2 2 .6 2.8v.8H6.6v-1.6l1-2.2z"/>',
 ring:'<circle cx="12" cy="14" r="5.2" fill="none" stroke-width="2.2"/><path d="M12 3.6l2.4 3-2.4 2.6-2.4-2.6z"/>'
};
var DOLL=[[null,'head',null],['cape','amulet','ammo'],['weapon','body','shield'],[null,'legs',null],['hands','feet','ring']];
var SLOT_NAME={head:'Head',cape:'Cape',amulet:'Neck',ammo:'Ammunition',weapon:'Weapon',body:'Body',shield:'Shield',legs:'Legs',hands:'Hands',feet:'Feet',ring:'Ring'};
function ghostSvg(k){return '<svg class="doll-ghost" viewBox="0 0 24 24" aria-hidden="true">'+GHOST[k]+'</svg>'}
function bonusText(it){var p=[];if(it.aBonus)p.push('+'+it.aBonus+' Attack');if(it.sBonus)p.push('+'+it.sBonus+' Strength');if(it.dBonus)p.push('+'+it.dBonus+' Defence');if(it.magB||it.mBonus)p.push('+'+(it.magB||it.mBonus)+' Magic');if(it.prayB)p.push('+'+it.prayB+' Prayer');return p}
function refreshEquipKit(){
 var host=$('equip-list');if(!host)return;host.innerHTML='';host.className='kit-equip view-'+equipView;
 var head=el('div','kit-pane-title',equipView==='stats'?'Equipment Stats':equipView==='death'?'Items Kept on Death':'Worn Equipment');host.appendChild(head);
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
var torch={cv:[],raf:0,parts:[[],[]],last:0,glow:[]};
function buildTorches(){
 var ws=$('welcome-screen'),box=$('welcome-box');if(!ws||!box||ws.querySelector('.kit-torch'))return;
 ['left','right'].forEach(function(side,i){
  var t=el('div','kit-torch kit-torch-'+side);t.setAttribute('aria-hidden','true');
  t.innerHTML='<div class="torch-glow"></div><canvas width="120" height="190"></canvas><div class="torch-cup"></div><div class="torch-stick"></div><div class="torch-bracket"></div>';
  box.appendChild(t);torch.cv[i]=t.querySelector('canvas');torch.glow[i]=t.querySelector('.torch-glow')});
 setInterval(function(){if(!torch.raf&&ws.style.display==='flex')torch.raf=requestAnimationFrame(torchTick)},700);
 if(ws.style.display==='flex')torch.raf=requestAnimationFrame(torchTick);
}
var trng=rng(42);
function torchTick(t){
 var ws=$('welcome-screen');if(!ws||ws.style.display!=='flex'){torch.raf=0;return}
 torch.raf=requestAnimationFrame(torchTick);
 var reduced=ws.classList.contains('login-reduced-motion');
 if(t-torch.last<(reduced?90:33))return;var dt=Math.min(.1,(t-(torch.last||t))/1000)||.033;torch.last=t;
 for(var i=0;i<2;i++){var c=torch.cv[i];if(!c)continue;var x=c.getContext('2d'),P=torch.parts[i],W=c.width,H=c.height,bx=W/2,by=H-10;
  var spawn=reduced?5:12;for(var s=0;s<spawn;s++)P.push({x:bx+(trng()-.5)*24,y:by-trng()*6,vx:(trng()-.5)*20,vy:-(60+trng()*75),life:0,max:.5+trng()*.6,r:13+trng()*9,spark:trng()<.05});
  x.clearRect(0,0,W,H);x.globalCompositeOperation='lighter';
  var sway=Math.sin(t/260+i*2)*9+Math.sin(t/97+i)*4;
  for(var k=P.length-1;k>=0;k--){var p=P[k];p.life+=dt;if(p.life>p.max){P.splice(k,1);continue}
   var f=p.life/p.max;p.vx+=sway*dt*(p.spark?2:1.1);p.x+=p.vx*dt;p.y+=p.vy*dt;var rad=p.spark?1.4:p.r*(1-f*.75);
   if(p.spark){x.fillStyle='rgba(255,210,120,'+(1-f)+')';x.fillRect(p.x,p.y,2,2);continue}
   var g=x.createRadialGradient(p.x,p.y,0,p.x,p.y,rad);
   var a=(1-f)*.6;g.addColorStop(0,f<.3?'rgba(255,250,210,'+a+')':'rgba(255,190,70,'+a+')');g.addColorStop(.45,'rgba(255,120,20,'+(a*.8)+')');g.addColorStop(1,'rgba(160,30,0,0)');
   x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,rad,0,7);x.fill()}
  x.globalCompositeOperation='source-over';
  var fl=.78+Math.sin(t/83+i*3)*.08+Math.sin(t/37+i)*.06+(trng()-.5)*.08;if(torch.glow[i])torch.glow[i].style.opacity=fl.toFixed(2);
 }
}

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
 UI.chat=function(msg,cls){if(typeof msg==='string'&&msg.indexOf('<')>=0)msg=msg.replace(/<\/?(b|i|u|br|span)[^>]*>/g,'');return c0.call(this,msg,cls)}}
// village folk speak through the same crisp overhead text as the player
function patchVillageChatter(){if(typeof window.sayOverhead==='function'&&!window.sayOverhead.__kit){var f=function(mesh,text,secs){sayOverhead(mesh,text,secs||3.4);return null};f.__kit=true;window.sayOverhead=f}}
// emotes: a player who clicks one sees it happen (a line in the chat, the gesture over their head)
function wireEmotes(){Array.prototype.forEach.call(doc.querySelectorAll('#pane-emotes .emote-grid button'),function(b){if(b.__kit)return;b.__kit=true;var n=(b.getAttribute('title')||'').trim();tipify(b,n);
 b.addEventListener('click',function(){click();var v={Yes:'nod',No:'shake your head',Bow:'bow',Angry:'fume',Think:'ponder',Wave:'wave',Cheer:'cheer',Laugh:'laugh',Dance:'dance a jig',Sit:'sit a moment',Shrug:'shrug',Clap:'clap'}[n]||'gesture';
  UI.chat('You '+v+'.','plain');if(typeof player!=='undefined'&&player)sayOverhead(player,'*'+v.split(' ')[0]+'*',2.4)})})}
// the hidden legacy tab rows come first in the DOM, so scripts that click querySelector('.tab-btn[data-tab=..]') light
// up an invisible button: mirror the open tab onto the visible rows after every tab click
function syncTabs(){doc.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('.tab-btn'):null;if(!b||!b.dataset.tab)return;var t=b.dataset.tab;
 Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(x){x.classList.toggle('active',x.dataset.tab===t)})})}
function tabTips(){Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(b){tipify(b)});
 var so=$('objective');if(so){var sb=so.querySelector('button');if(sb)tipify(sb,'Skip the island tutorial')}
 var z=$('zone-box');if(z)z.setAttribute('aria-label','Current area')}
var mo=null;
function boot(){
 retireLayers();installTip();buildCluster();buildRail();buildChat();tabTips();patchControls();patchNames();patchMinimapWalk();patchHud();buildTorches();refreshChatName();wireEmotes();syncTabs();wireMusicTab();patchChat();patchVillageChatter();
 // late-built HUD buttons (overlays, deeds, appearance) join the rail as they appear
 if(!adoptTools()){mo=new MutationObserver(function(){if(adoptTools()){mo.disconnect();mo=null}});mo.observe(doc.body,{childList:true,subtree:true});setTimeout(function(){if(mo){mo.disconnect();mo=null}},120000)}
 setTimeout(retireLayers,0);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('load',function(){retireLayers();wireChatTabs();adoptTools();patchControls();patchNames();patchMinimapWalk();patchHud();orbFills()});
// once the adventurer is in the world: sweep any name sprites made before the kit loaded, refresh the chat name
var sweeps=0,sweep=setInterval(function(){if(typeof running!=='undefined'&&running){hideNameSprites();refreshChatName();orbFills();if(++sweeps>=6)clearInterval(sweep)}},2500);
window.UIKit={sayOverhead:sayOverhead,refreshEquip:refreshEquipKit,textures:setTex};
})();
