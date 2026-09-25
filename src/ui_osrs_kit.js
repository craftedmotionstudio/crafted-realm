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
var link=el('link');link.rel='stylesheet';link.href='assets/ui/osrs_kit.css?v=3';
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
// the side-tab set (owner 2026-09-25: one drawn icon per tab, matching the HUD icons)
function cog(cx,cy,r1,r2,n){var d='';for(var i=0;i<n*2;i++){var a=Math.PI*i/n-Math.PI/2,r=i%2?r2:r1,a0=a-Math.PI/n*.42,a1=a+Math.PI/n*.42;
 d+=(i?'L':'M')+(cx+Math.cos(a0)*r).toFixed(2)+' '+(cy+Math.sin(a0)*r).toFixed(2)+'L'+(cx+Math.cos(a1)*r).toFixed(2)+' '+(cy+Math.sin(a1)*r).toFixed(2)}return d+'Z'}
var O='stroke="#140f09" stroke-width="1.2" stroke-linejoin="round"';
Object.assign(ICON,{
 t_combat:ICON.swords,
 t_skills:'<path d="M3 20.6h18" stroke="#140f09" stroke-width="2"/><rect x="4" y="12" width="4.4" height="8.2" fill="#46a843" '+O+'/><rect x="9.8" y="5" width="4.4" height="15.2" fill="#d6452c" '+O+'/><rect x="15.6" y="9" width="4.4" height="11.2" fill="#3f7fd1" '+O+'/><path d="M5 13v6.4M10.8 6v13.4M16.6 10v9.4" stroke="rgba(255,255,255,.45)" stroke-width="1"/>',
 t_quests:'<path d="M6 4.5h11.5c1 0 1.6.7 1.6 1.6v13.3H7.6C6.7 19.4 6 18.7 6 17.8z" fill="#e2cf98" '+O+'/><path d="M4.4 4.8c0-1 .8-1.7 1.8-1.7s1.8.7 1.8 1.7v1.6H4.4z" fill="#b8955a" '+O+'/><path d="M9 8.4h7.4M9 11h7.4M9 13.6h5" stroke="#7a5a30" stroke-width="1.1"/><path d="M14.6 14.6h4.4v7l-2.2-1.6-2.2 1.6z" fill="#2f63c8" '+O+'/><path d="M15.6 15.4v4.4" stroke="rgba(255,255,255,.5)" stroke-width=".9"/>',
 t_inv:'<path d="M8 8.2V6.6c0-2.2 1.8-3.8 4-3.8s4 1.6 4 3.8v1.6" fill="none" stroke="#140f09" stroke-width="3"/><path d="M8 8.2V6.6c0-2.2 1.8-3.8 4-3.8s4 1.6 4 3.8v1.6" fill="none" stroke="#8a5a2c" stroke-width="1.5"/><rect x="4.4" y="7.6" width="15.2" height="13.8" rx="3.2" fill="#9a642f" '+O+'/><path d="M4.6 11.4h14.8v2.4c0 1-.8 1.6-1.6 1.6H6.2c-.9 0-1.6-.6-1.6-1.6z" fill="#744a21" '+O+'/><rect x="10.4" y="13" width="3.2" height="3.2" rx=".6" fill="#e0b74a" stroke="#140f09" stroke-width=".9"/><path d="M6.4 9.2c.3-.9 1-1.2 2-1.2" stroke="rgba(255,230,190,.5)" stroke-width="1" fill="none"/>',
 t_equip:'<path d="M5 20.4v-9C5 6.9 8.1 3.4 12 3.4s7 3.5 7 8v9z" fill="#a4adb6" '+O+'/><path d="M12 3.6v16.6" stroke="#6b737b" stroke-width="1"/><path d="M6.6 12.4h4.4M13 12.4h4.4" stroke="#140f09" stroke-width="2.2" stroke-linecap="round"/><path d="M8 16.2h.01M10 16.2h.01M14 16.2h.01M16 16.2h.01" stroke="#140f09" stroke-width="1.6" stroke-linecap="round"/><path d="M5 18.4h14" stroke="#6b737b" stroke-width="1"/><path d="M7.2 9.4c.6-2.4 2.2-3.8 4-4.2" stroke="rgba(255,255,255,.65)" stroke-width="1.2" fill="none"/>',
 t_prayers:'<circle cx="12" cy="12" r="9.4" fill="none" stroke="#e8cf6a" stroke-width="1.3" stroke-dasharray="2.4 1.6"/>'+ICON.prayer,
 t_spells:'<path d="M3.6 19.4c2.6-1.8 5.4-2.5 8.4-2.5s5.8.7 8.4 2.5c-2.6 1.5-5.4 2.1-8.4 2.1s-5.8-.6-8.4-2.1z" fill="#27449a" '+O+'/><path d="M7.4 18l3.8-12.8c.4-1.4 1.6-2 2.9-1.5l2.8 1.2-2.4.5L16.8 18z" fill="#3a66cc" '+O+'/><path d="M12.4 9.6l.5 1 1.1.1-.8.8.2 1.1-1-.5-1 .5.2-1.1-.8-.8 1.1-.1zM14.6 14.4l.35.7.8.1-.6.55.15.8-.7-.35-.7.35.15-.8-.6-.55.8-.1z" fill="#f2d25e"/><path d="M9.4 16.6c.8-3.2 1.8-6.6 2.6-9.4" stroke="rgba(255,255,255,.35)" stroke-width="1"/>',
 t_drops:'<path d="M4.6 4.4h12.6c1 0 1.8.8 1.8 1.8v14.2H6.4c-1 0-1.8-.8-1.8-1.8z" fill="#7a3d22" '+O+'/><path d="M6.4 17.2h12.6v3.2H6.4c-.9 0-1.6-.7-1.6-1.6s.7-1.6 1.6-1.6z" fill="#e6d6a8" '+O+'/><path d="M9 7.4l2.4 7M12 6.6l2.2 7.4M15 7.2l1.6 6.2" stroke="#140f09" stroke-width="2.6" stroke-linecap="round"/><path d="M9 7.4l2.4 7M12 6.6l2.2 7.4M15 7.2l1.6 6.2" stroke="#e6d6a8" stroke-width="1.2" stroke-linecap="round"/>',
 t_clan:'<path d="M12 1.8v8" stroke="#140f09" stroke-width="1.6"/><path d="M12.4 2.4h6.6l-1.8 2 1.8 2h-6.6z" fill="#c8261c" '+O+'/><circle cx="12" cy="10.2" r="2.6" fill="#e0b48a" '+O+'/><path d="M7.8 17.4c.4-2.6 2-4 4.2-4s3.8 1.4 4.2 4z" fill="#5d8a3c" '+O+'/><circle cx="6.4" cy="13.2" r="2.6" fill="#e0b48a" '+O+'/><path d="M2.2 21.4c.4-3 2-4.6 4.2-4.6s3.8 1.6 4.2 4.6z" fill="#3a5fb0" '+O+'/><circle cx="17.6" cy="13.2" r="2.6" fill="#e0b48a" '+O+'/><path d="M13.4 21.4c.4-3 2-4.6 4.2-4.6s3.8 1.6 4.2 4.6z" fill="#b8452a" '+O+'/>',
 t_friends:'<circle cx="12" cy="12" r="9" fill="#f0c43a" '+O+'/><circle cx="9" cy="10" r="1.3" fill="#140f09"/><circle cx="15" cy="10" r="1.3" fill="#140f09"/><path d="M7.6 13.6c1 2.4 2.6 3.4 4.4 3.4s3.4-1 4.4-3.4" fill="none" stroke="#140f09" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="9" cy="6.8" rx="3" ry="1.5" fill="rgba(255,255,255,.35)"/>',
 t_ignore:'<circle cx="12" cy="12" r="8" fill="#b9b1a0" '+O+'/><circle cx="9.2" cy="10.4" r="1.2" fill="#140f09"/><circle cx="14.8" cy="10.4" r="1.2" fill="#140f09"/><path d="M8.6 16.2c1-1.4 2.2-2 3.4-2s2.4.6 3.4 2" fill="none" stroke="#140f09" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="12" r="10" fill="none" stroke="#140f09" stroke-width="3.6"/><circle cx="12" cy="12" r="10" fill="none" stroke="#d3261c" stroke-width="2"/><path d="M5 5l14 14" stroke="#140f09" stroke-width="3.6"/><path d="M5 5l14 14" stroke="#d3261c" stroke-width="2"/>',
 t_logout:'<path d="M5.4 21.4V9.2c0-3.4 2.9-6.2 6.6-6.2s6.6 2.8 6.6 6.2v12.2z" fill="#8a5a2c" '+O+'/><path d="M9.2 4.4v17M12 3.4v18M14.8 4.4v17" stroke="#5a3616" stroke-width="1"/><path d="M5.6 9.4h12.8M5.6 16.8h12.8" stroke="#3a3530" stroke-width="1.8"/><circle cx="15.6" cy="13.4" r="1.4" fill="none" stroke="#d8b04a" stroke-width="1.2"/><path d="M3 21.4h18" stroke="#140f09" stroke-width="1.6"/>',
 t_settings:'<path d="'+cog(12,12,10,7.4,8)+'" fill="#9aa3ad" '+O+'/><circle cx="12" cy="12" r="3.2" fill="#3a3f45" '+O+'/><path d="M7.4 7.6c1.2-1.4 2.8-2.2 4.6-2.2" stroke="rgba(255,255,255,.55)" stroke-width="1.2" fill="none"/>',
 t_emotes:'<circle cx="12" cy="5" r="2.8" fill="#f0c43a" '+O+'/><path d="M12 8.2v6.6M12 10l-5-4.6M12 10l5-4.6M12 14.8l-4 6M12 14.8l4 6" stroke="#140f09" stroke-width="3.4" stroke-linecap="round"/><path d="M12 8.2v6.6M12 10l-5-4.6M12 10l5-4.6M12 14.8l-4 6M12 14.8l4 6" stroke="#f0c43a" stroke-width="1.8" stroke-linecap="round"/>',
 t_music:'<path d="M6.4 21V4.2c5.6 0 11 3.2 12.4 8.6L6.4 21z" fill="none" stroke="#140f09" stroke-width="3.4" stroke-linejoin="round"/><path d="M6.4 21V4.2c5.6 0 11 3.2 12.4 8.6L6.4 21z" fill="none" stroke="#d8a93c" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.6 18.6V5.4M10.6 17.2V6M12.6 15.8V7M14.6 14.4V8.4M16.6 13V10" stroke="#f2ecd6" stroke-width=".8"/><circle cx="6.4" cy="21" r="1.5" fill="#d8a93c" stroke="#140f09" stroke-width="1"/>',
 medal:'<path d="M8 2.6h3.4l1.6 6.6-3 1.2zM16 2.6h-3.4L11 9.2l3 1.2z" fill="#b3261e" '+O+'/><path d="M9.4 2.6h1.2l1.5 6.2M14.6 2.6h-1.2" stroke="#2f5fb8" stroke-width="1.2"/><circle cx="12" cy="15" r="6" fill="#e8c24a" '+O+'/><circle cx="12" cy="15" r="4.2" fill="none" stroke="#9a7420" stroke-width="1"/><path d="M12 11.8l.95 1.95 2.15.3-1.55 1.5.37 2.15L12 16.7l-1.92 1 .37-2.15-1.55-1.5 2.15-.3z" fill="#fff3b8" stroke="#9a7420" stroke-width=".5"/>',
 close:'<path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8" stroke="#140605" stroke-width="5.2" stroke-linecap="round"/><path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8" stroke="#e7702c" stroke-width="2.6" stroke-linecap="round"/>'
});
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
var TOOLS=[['music-btn','music','Music: click for the music menu'],['overlays-btn','layers','Overlays (Shift+L)'],['deeds-btn','medal','Realm deeds and log (Shift+K)'],['char-styler-btn','look','Change appearance (Shift+C)']];
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
// Two standing iron torches either side of the welcome box, running from the flame down to the floor: a riveted fire
// basket on a collar, a twisted iron shaft with forged bands, and a tripod foot with scrolled toes. Drawn in SVG (our
// own art); the flame is painted live on a canvas (layered tongues + embers) and its light flickers on wall and floor.
var torch={cv:[],raf:0,parts:[[],[]],last:0,glow:[],floor:[]};
var TORCH_HEAD='<svg class="torch-head" viewBox="0 0 120 96" aria-hidden="true"><defs>'+
 '<linearGradient id="kti" x1="0" x2="1"><stop offset="0" stop-color="#15120f"/><stop offset=".35" stop-color="#5d554b"/><stop offset=".55" stop-color="#3a342d"/><stop offset="1" stop-color="#110f0c"/></linearGradient>'+
 '<radialGradient id="ktc" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#fff0a8"/><stop offset=".35" stop-color="#ff9a2a"/><stop offset=".75" stop-color="#9a2a08"/><stop offset="1" stop-color="#2a0a04"/></radialGradient></defs>'+
 // glowing coals heaped in the basket
 '<ellipse cx="60" cy="18" rx="34" ry="9" fill="url(#ktc)"/>'+
 // the basket: splayed iron straps between two rims
 '<path d="M22 18 L40 58 L80 58 L98 18" fill="rgba(20,12,6,.55)"/>'+
 '<path d="M24 19 L42 57 M42 19 L50 57 M60 19 L60 57 M78 19 L70 57 M96 19 L78 57" stroke="url(#kti)" stroke-width="5" stroke-linecap="round"/>'+
 '<path d="M24 19 L42 57 M42 19 L50 57 M60 19 L60 57 M78 19 L70 57 M96 19 L78 57" stroke="rgba(255,160,70,.35)" stroke-width="1.2" stroke-linecap="round" transform="translate(-1 0)"/>'+
 '<ellipse cx="60" cy="19" rx="38" ry="7" fill="none" stroke="#0d0b08" stroke-width="7"/><ellipse cx="60" cy="19" rx="38" ry="7" fill="none" stroke="url(#kti)" stroke-width="4.5"/>'+
 '<path d="M24 16.5 A38 7 0 0 1 96 16.5" fill="none" stroke="rgba(255,190,110,.55)" stroke-width="1.2"/>'+
 '<rect x="38" y="54" width="44" height="8" rx="3" fill="url(#kti)" stroke="#0d0b08" stroke-width="1.6"/>'+
 // rivets on the rims
 '<circle cx="24" cy="19" r="2.4" fill="#6b6256" stroke="#0d0b08"/><circle cx="96" cy="19" r="2.4" fill="#6b6256" stroke="#0d0b08"/><circle cx="60" cy="26" r="2.2" fill="#6b6256" stroke="#0d0b08"/>'+
 '<circle cx="44" cy="58" r="1.8" fill="#6b6256" stroke="#0d0b08"/><circle cx="76" cy="58" r="1.8" fill="#6b6256" stroke="#0d0b08"/>'+
 // collar and drip-cup below the basket
 '<path d="M48 62 L72 62 L68 74 L52 74 Z" fill="url(#kti)" stroke="#0d0b08" stroke-width="1.6"/>'+
 '<rect x="46" y="74" width="28" height="7" rx="2" fill="url(#kti)" stroke="#0d0b08" stroke-width="1.6"/>'+
 '<path d="M50 81 L70 81 L66 96 L54 96 Z" fill="url(#kti)" stroke="#0d0b08" stroke-width="1.6"/>'+
 '<path d="M50 76 h20" stroke="rgba(255,190,110,.35)" stroke-width="1"/></svg>';
var TORCH_BASE='<svg class="torch-base" viewBox="0 0 160 110" aria-hidden="true"><defs>'+
 '<linearGradient id="ktb" x1="0" x2="1"><stop offset="0" stop-color="#15120f"/><stop offset=".4" stop-color="#5a5248"/><stop offset=".6" stop-color="#37312b"/><stop offset="1" stop-color="#110f0c"/></linearGradient>'+
 '<radialGradient id="ktk" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#8a8072"/><stop offset=".5" stop-color="#3f3830"/><stop offset="1" stop-color="#120f0c"/></radialGradient></defs>'+
 // knop where the shaft meets the foot
 '<rect x="72" y="0" width="16" height="10" fill="url(#ktb)" stroke="#0d0b08" stroke-width="1.4"/>'+
 '<ellipse cx="80" cy="18" rx="13" ry="10" fill="url(#ktk)" stroke="#0d0b08" stroke-width="1.6"/>'+
 '<rect x="70" y="26" width="20" height="8" rx="2" fill="url(#ktb)" stroke="#0d0b08" stroke-width="1.4"/>'+
 // three splayed legs with scrolled toes (the middle one comes toward us)
 '<path d="M74 33 C62 52 42 74 24 92 C18 98 10 98 8 92 C6 86 12 82 17 86" fill="none" stroke="#0d0b08" stroke-width="10" stroke-linecap="round"/>'+
 '<path d="M74 33 C62 52 42 74 24 92 C18 98 10 98 8 92 C6 86 12 82 17 86" fill="none" stroke="url(#ktb)" stroke-width="6.5" stroke-linecap="round"/>'+
 '<path d="M86 33 C98 52 118 74 136 92 C142 98 150 98 152 92 C154 86 148 82 143 86" fill="none" stroke="#0d0b08" stroke-width="10" stroke-linecap="round"/>'+
 '<path d="M86 33 C98 52 118 74 136 92 C142 98 150 98 152 92 C154 86 148 82 143 86" fill="none" stroke="url(#ktb)" stroke-width="6.5" stroke-linecap="round"/>'+
 '<path d="M80 33 C80 58 80 80 80 98 C80 106 70 107 68 101 C67 96 72 94 75 97" fill="none" stroke="#0d0b08" stroke-width="10" stroke-linecap="round"/>'+
 '<path d="M80 33 C80 58 80 80 80 98 C80 106 70 107 68 101 C67 96 72 94 75 97" fill="none" stroke="url(#ktb)" stroke-width="6.5" stroke-linecap="round"/>'+
 '<path d="M72 38 C64 52 50 68 36 82" fill="none" stroke="rgba(255,190,110,.28)" stroke-width="1.2"/>'+
 '<path d="M77 40 C77 60 77 80 77 96" fill="none" stroke="rgba(255,190,110,.28)" stroke-width="1.2"/></svg>';
function buildTorches(){
 var ws=$('welcome-screen');if(!ws||ws.querySelector('.kit-torch'))return;
 ['left','right'].forEach(function(side,i){
  var t=el('div','kit-torch kit-torch-'+side);t.setAttribute('aria-hidden','true');
  t.innerHTML='<div class="torch-glow"></div><div class="torch-floorglow"></div><canvas class="torch-flame" width="160" height="230"></canvas>'+
   TORCH_HEAD+'<div class="torch-shaft"><i class="band b1"></i><i class="band b2"></i><i class="band b3"></i></div>'+TORCH_BASE;
  ws.appendChild(t);torch.cv[i]=t.querySelector('canvas');torch.glow[i]=t.querySelector('.torch-glow');torch.floor[i]=t.querySelector('.torch-floorglow')});
 setInterval(function(){if(!torch.raf&&ws.style.display==='flex')torch.raf=requestAnimationFrame(torchTick)},700);
 if(ws.style.display==='flex')torch.raf=requestAnimationFrame(torchTick);
}
var trng=rng(42);
// smooth wandering noise (sum of sines) so the tongues sway instead of jittering
function wob(t,k){return Math.sin(t*1.7+k*1.3)*.5+Math.sin(t*3.1+k*2.7)*.3+Math.sin(t*5.9+k*.7)*.2}
function tongue(x,bx,by,w,h,tx,a,hot){
 var g=x.createLinearGradient(bx,by,bx+tx,by-h);
 if(hot){g.addColorStop(0,'rgba(255,252,225,'+a+')');g.addColorStop(.35,'rgba(255,226,120,'+a+')');g.addColorStop(.8,'rgba(255,150,40,'+(a*.5)+')');g.addColorStop(1,'rgba(255,120,20,0)')}
 else{g.addColorStop(0,'rgba(255,190,70,'+a+')');g.addColorStop(.4,'rgba(255,110,20,'+(a*.85)+')');g.addColorStop(.8,'rgba(190,40,6,'+(a*.45)+')');g.addColorStop(1,'rgba(120,20,0,0)')}
 x.fillStyle=g;x.beginPath();x.moveTo(bx-w/2,by);
 x.bezierCurveTo(bx-w/2,by-h*.42,bx+tx*.6-w*.18,by-h*.72,bx+tx,by-h);
 x.bezierCurveTo(bx+tx*.6+w*.18,by-h*.72,bx+w/2,by-h*.42,bx+w/2,by);
 x.quadraticCurveTo(bx,by+w*.32,bx-w/2,by);x.fill()}
function torchTick(t){
 var ws=$('welcome-screen');if(!ws||ws.style.display!=='flex'){torch.raf=0;return}
 torch.raf=requestAnimationFrame(torchTick);
 var reduced=ws.classList.contains('login-reduced-motion');
 if(t-torch.last<(reduced?90:33))return;var dt=Math.min(.1,(t-(torch.last||t))/1000)||.033;torch.last=t;var ts=t/1000*(reduced?.4:1);
 for(var i=0;i<2;i++){var c=torch.cv[i];if(!c)continue;var x=c.getContext('2d'),P=torch.parts[i],W=c.width,H=c.height,bx=W/2,by=H-22;
  x.clearRect(0,0,W,H);x.globalCompositeOperation='lighter';
  var breath=1+wob(ts*1.4,i*5)*.12;
  // outer body, then the licking tongues, then the white-hot core
  tongue(x,bx+wob(ts,i)*3,by,80,150*breath,wob(ts*1.2,i+1)*20,.55,false);
  for(var k=0;k<5;k++){var off=(k-2)*12,hk=(95+k%2*28)*(1+wob(ts*1.8,k+i*7)*.22);tongue(x,bx+off,by-4,30-k*2,hk,wob(ts*2.2,k*3+i)*16+off*.4,.5,false)}
  tongue(x,bx+wob(ts*2,i+9)*2,by,42,82*breath,wob(ts*2.6,i+4)*8,.75,true);
  tongue(x,bx,by+2,18,40*breath,wob(ts*3,i+2)*4,.9,true);
  // embers and the odd spark rising out of the flame
  var spawn=reduced?1:3;for(var s2=0;s2<spawn;s2++)if(trng()<.6)P.push({x:bx+(trng()-.5)*30,y:by-40-trng()*50,vx:(trng()-.5)*14,vy:-(30+trng()*50),life:0,max:.8+trng()*1.2,r:.8+trng()*1.4});
  for(var p2=P.length-1;p2>=0;p2--){var q=P[p2];q.life+=dt;if(q.life>q.max||q.y<0){P.splice(p2,1);continue}
   q.vx+=wob(ts*3+p2,i)*20*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;var f=q.life/q.max;x.fillStyle='rgba(255,'+(200-f*120|0)+',80,'+(1-f)+')';x.beginPath();x.arc(q.x,q.y,q.r,0,7);x.fill()}
  x.globalCompositeOperation='source-over';
  var fl=.82+wob(ts*4,i*3)*.12+(trng()-.5)*.06;
  if(torch.glow[i])torch.glow[i].style.opacity=fl.toFixed(2);
  if(torch.floor[i])torch.floor[i].style.opacity=(fl*.85).toFixed(2);
 }
}

/* ------------------------------------------- 12. windows: X + Escape */
// Every window that can open carries the same stone X in its top-right corner, and Escape closes the topmost one.
// Windows that already had a close control keep it (its click runs their own close logic); the rest get one.
var WINS=[
 {sel:'.modal'},
 {sel:'#smith-grid-overlay',host:function(e){return e.firstElementChild},close:function(e){e.style.display='none'}},
 {sel:'#music-menu',close:function(e){e.style.display='none'}},
 {sel:'#admin-panel',close:function(e){e.style.display='none'}},
 {sel:'#test-travel-panel'}
];
var LEGACY_ESC={'dialogue-modal':1,'bank-modal':1,'shop-modal':1};   // game4_ui's own Escape closes these, as before
function isOpen(e){if(!e||!e.isConnected)return false;var cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0}
function ownClose(e){if(!e)return null;var kids=e.children;for(var i=0;i<kids.length;i++){var c=kids[i];if(c.classList&&(c.classList.contains('close-x')||c.classList.contains('quest-scroll-close')||c.classList.contains('kit-x')))return c}return null}
function paintX(b){if(b.dataset.kitx)return;b.dataset.kitx='1';b.classList.add('kit-x');b.innerHTML=svg('close');b.setAttribute('role','button');b.setAttribute('tabindex','0');tipify(b,'Close');
 b.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();b.click()}})}
function decorateWindows(){WINS.forEach(function(w){Array.prototype.forEach.call(doc.querySelectorAll(w.sel),function(e){
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
var TAB_TIPS={combat:'Combat options',skills:'Skills',quests:'Quest list',inv:'Inventory',equip:'Worn equipment',prayers:'Prayer',spells:'Magic',drops:'Bestiary',
 clan:'Clan chat',friends:'Friends list',ignore:'Ignore list',logout:'Logout',settings:'Settings',emotes:'Emotes',music:'Music player'};
function tabIcons(){Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(b){var k=b.dataset.tab;if(!ICON['t_'+k]||b.querySelector('svg.tab-ico'))return;
 b.innerHTML='<svg class="tab-ico kit-ico" viewBox="0 0 24 24" aria-hidden="true">'+ICON['t_'+k]+'</svg>';if(TAB_TIPS[k]){b.removeAttribute('data-tip');b.setAttribute('title',TAB_TIPS[k])}})}
function tabTips(){tabIcons();Array.prototype.forEach.call(doc.querySelectorAll('#tab-bar .tab-btn,#tab-bar-bottom .tab-btn'),function(b){tipify(b)});
 var so=$('objective');if(so){var sb=so.querySelector('button');if(sb)tipify(sb,'Skip the island tutorial')}
 var z=$('zone-box');if(z)z.setAttribute('aria-label','Current area')}
var mo=null;
function boot(){
 retireLayers();installTip();buildCluster();buildRail();buildChat();tabTips();patchControls();patchNames();patchMinimapWalk();patchHud();buildTorches();refreshChatName();wireEmotes();syncTabs();wireMusicTab();patchChat();patchVillageChatter();installWindows();patchInvHint();
 // late-built HUD buttons (overlays, deeds, appearance) join the rail as they appear
 if(!adoptTools()){mo=new MutationObserver(function(){if(adoptTools()){mo.disconnect();mo=null}});mo.observe(doc.body,{childList:true,subtree:true});setTimeout(function(){if(mo){mo.disconnect();mo=null}},120000)}
 setTimeout(retireLayers,0);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('load',function(){retireLayers();wireChatTabs();adoptTools();patchControls();patchNames();patchMinimapWalk();patchHud();patchInvHint();tabIcons();decorateWindows();orbFills()});
// once the adventurer is in the world: sweep any name sprites made before the kit loaded, refresh the chat name
var sweeps=0,sweep=setInterval(function(){if(typeof running!=='undefined'&&running){hideNameSprites();refreshChatName();orbFills();if(++sweeps>=6)clearInterval(sweep)}},2500);
window.UIKit={sayOverhead:sayOverhead,refreshEquip:refreshEquipKit,textures:setTex};
})();
