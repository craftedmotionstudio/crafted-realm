/* ============================================================================
   UI_SCALE: the old-school chrome at the 2004 proportion (docs/rebuild/REF2004_FEEL_REPORT.md item 7).

   2004 is a fixed 765 x 503 frame scaled to the window: its type is 12 px of 503 (2.4% of the height), the chat box
   a third of the height, the side panel two thirds, the minimap disc 29%. Our kit (src/ui_osrs_kit.js,
   assets/ui/osrs_kit.css) draws the same pieces at those 1x pixel sizes on a full-window view, so on a big window it
   covered ~17% of the screen with half-size type. This keeps the full-window 3D view and draws the chrome larger with
   the window: every HUD piece gets CSS zoom z = min(height / 508, width / 780) (the base column height and row width
   of the layout below), never below 1x. At 1530 x 1006 that is 1.96x: 23.5 px type, 2.3% of the height.
   The layout at that proportion, like 2004's right-hand column (minimap over a 335-high panel): the side panel is
   326 base px with the pack as 36 x 32 cells (2004's pitch, 7 rows without scrolling), and the tool rail (combat
   level, crowns, music, overlays, deeds, look) sits on top of the chat box instead of between minimap and panel.
   Windows (bank, shop, world map, quest scroll...) take the same zoom, capped so they fit the window.
   Phones and narrow windows (<= 880 px wide) keep the mobile layout at 1x. Pages that position chrome at the mouse
   (the Choose Option menu, tooltips) use UIScale.place(); the chat box's drag-resize reads UIScale.value().
   ============================================================================ */
var UIScale=(function(){
 'use strict';
 var BASE_H=508,BASE_W=780,MOBILE_MAX=880,MIN_Z=1,MAX_Z=4,z=1,doc=document,root=doc.documentElement;
 // top-level HUD containers (never two nested in each other: zoom multiplies)
 // (the tutorial objective banner stays 1x: 2004 has none, its words live in the chat box, and at 2x it hid the tiles
 // ahead at the top of the view)
 var HUD=['#side-panel','#chatbox-frame','#mm-cluster','#hud-rail','#dialogue-modal','#zone-box','#action-text',
  '#holm-intro-note','#ctx-menu','#hud-tip','#music-menu','#test-travel-toggle'];
 // centred windows: zoomed like the HUD, capped so they fit the window
 var WINDOWS='.modal.steel:not(#dialogue-modal),#quest-scroll-modal,#smith-grid-overlay>div,#admin-panel';
 function compute(){
  var W=innerWidth||1024,H=innerHeight||768;if(W<=MOBILE_MAX)return 1;
  return Math.max(MIN_Z,Math.min(MAX_Z,Math.min(H/BASE_H,W/BASE_W)));
 }
 var css=[
  '@media (min-width:'+(MOBILE_MAX+1)+'px){',
  HUD.map(function(s){return 'html.ui-scaled '+s}).join(',')+'{zoom:var(--ui-z,1);}',
  // the 2004 panel height and pack pitch (36 x 32 cells, 7 rows, no scroll)
  'html.ui-scaled.osrs-kit #side-panel.steel{height:326px;}',
  'html.ui-scaled #inv-grid{min-height:230px;gap:1px 7px;}',
  'html.ui-scaled #inv-grid .inv-slot{height:32px;}',
  // the tool rail rides on top of the chat box (its bottom follows the chat box height, set below)
  'html.ui-scaled #hud-rail{left:6px;right:auto;bottom:var(--ui-rail-bottom,200px);}',
  'html.ui-scaled #test-travel-toggle{left:6px;bottom:calc(var(--ui-rail-bottom,200px) + 40px);}',
  // the build stamp (a local review marker, 1x) moves off the bottom row, where chat box and panel now meet: beside the rail
  'html.ui-scaled.osrs-kit #build-stamp{left:calc(256px * var(--ui-z,1));right:auto;top:auto;bottom:var(--ui-stamp-bottom,400px);}',
  // words drawn over the world keep their 2004 share of the height too
  // the dialogue's head-and-text row is 148 px, 5 px more than its 190 px box holds (a scroll bar at any size, twice as
  // visible at 2x): 142 fits
  'html.ui-scaled.osrs-kit #dialogue-modal #dlg-wrap{min-height:142px;}',
  'html.ui-scaled .overhead-text{font-size:calc(12px * var(--ui-z,1));}',
  'html.ui-scaled .xp-drop.cfx-xp{font-size:calc(12px * var(--ui-z,1))!important;}',
  'html.ui-scaled .xp-drop.cfx-xp img{width:calc(18px * var(--ui-z,1))!important;height:calc(18px * var(--ui-z,1))!important;}',
  '}',
  // the character creator at 2004's proportion: the panel 63% x 62% of the window, arrows 5% of its width, labels 2.4%
  // of its height (the 2004 creator's panel is ~480 x 310 of the 765 x 503 frame, 42 px arrows, 12 px type)
  '@media (min-width:'+(MOBILE_MAX+1)+'px){',
  '#kit-creator .kc-window{width:63vw;height:62vh;min-width:min(760px,96vw);min-height:min(560px,94vh);grid-template-columns:1.15fr .8fr 1.15fr;grid-template-rows:5.2vh 1fr 6.2vh;gap:1.2vh;padding:.6vh;font-size:max(12px,2.4vh);}',
  '#kit-creator .kc-title{font-size:max(24px,3.6vh);}',
  '#kit-creator .kc-col{padding:1vh .8vw;overflow:hidden;}',
  '#kit-creator .kc-col h4{margin:0 0 .4vh;font-size:max(12px,2.4vh);}',
  '#kit-creator .kc-row{gap:.4vw;margin:.15vh 0;}',
  '#kit-creator .kc-arrow{flex:0 0 auto;width:max(38px,5vw);height:max(26px,3.3vh);}',
  '#kit-creator .kc-arrow::after{border-top-width:max(6px,.8vh);border-bottom-width:max(6px,.8vh);}',
  '#kit-creator .kc-arrow.l::after{border-right-width:max(8px,1.1vh);} #kit-creator .kc-arrow.r::after{border-left-width:max(8px,1.1vh);}',
  '#kit-creator .kc-label{flex:1 1 0;font-size:max(12px,2.4vh);line-height:1.05;}',
  '#kit-creator .kc-sub{font-size:max(12px,2vh);line-height:1.05;margin:.1vh 0 0;}',
  '#kit-creator .kc-swatch{flex:0 0 auto;width:max(18px,2.4vh);height:max(18px,2.4vh);}',
  '#kit-creator .kc-body{gap:.8vw;margin-top:.4vh;} #kit-creator .kc-body .kit-btn{width:max(64px,5vw);font-size:max(12px,2.4vh);}',
  '#kit-creator .kc-actions .kit-btn{font-size:max(12px,2.4vh);padding:.7vh 1.1vw;}',
  // the button row (Randomise, Turn, Confirm at 2004 type size) spans the window, so it never widens the preview column
  '#kit-creator .kc-actions{grid-row:3;grid-column:1/-1;} #kit-creator .kc-window>div:empty:not([class]){display:none;}',
  '}'].join('\n');
 function install(){
  if(doc.getElementById('ui-scale-css'))return;var st=doc.createElement('style');st.id='ui-scale-css';st.textContent=css;(doc.head||root).appendChild(st);
 }
 // the rail sits 4 base px above the chat box, whatever height the player dragged it to
 function railBottom(){var f=doc.getElementById('chatbox-frame');var h=f&&f.offsetHeight?f.offsetHeight:190;root.style.setProperty('--ui-rail-bottom',(6+h+4)+'px');
  root.style.setProperty('--ui-stamp-bottom',Math.round((6+h+4)*z+2)+'px')}   // the same line in viewport px, for the 1x stamp
 // a centred window: the HUD zoom, capped so the whole window fits (with a margin)
 function fitWindow(el){
  if(!el||!el.isConnected)return;
  var want='';
  if(z!==1){var cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return;
   // offsetWidth / offsetHeight are the window's own (unzoomed) size
   var w=el.offsetWidth,h=el.offsetHeight;if(!(w>0&&h>0))return;
   want=String(+Math.max(1,Math.min(z,0.94*innerWidth/w,0.92*innerHeight/h)).toFixed(3))}
  if(el.style.zoom!==want)el.style.zoom=want;   // only on a change: the observer below watches this style
 }
 function fitWindows(){Array.prototype.forEach.call(doc.querySelectorAll(WINDOWS),fitWindow)}
 var watched=new WeakSet();
 function watchWindows(){
  Array.prototype.forEach.call(doc.querySelectorAll(WINDOWS),function(el){if(watched.has(el))return;watched.add(el);
   new MutationObserver(function(){fitWindow(el);setTimeout(function(){fitWindow(el)},60)}).observe(el,{attributes:true,attributeFilter:['style','class']})});
 }
 function apply(){
  z=compute();root.style.setProperty('--ui-z',String(+z.toFixed(4)));root.classList.toggle('ui-scaled',z!==1);
  railBottom();fitWindows();
 }
 function zoomOf(el){if(!el||!el.offsetWidth)return 1;var r=el.getBoundingClientRect();return r.width>0?r.width/el.offsetWidth:1}
 // put a zoomed element's top-left corner at viewport point (x, y); returns its size in viewport px
 function place(el,x,y){var k=zoomOf(el);el.style.left=(x/k)+'px';el.style.top=(y/k)+'px';return {k:k}}
 // an element's size in viewport px (offsetWidth is in its own, unzoomed, px)
 function size(el){var k=zoomOf(el);return {w:el.offsetWidth*k,h:el.offsetHeight*k,k:k}}
 function boot(){
  install();apply();watchWindows();
  addEventListener('resize',apply);
  var f=doc.getElementById('chatbox-frame');if(f)new MutationObserver(railBottom).observe(f,{attributes:true,attributeFilter:['style']});
  // windows and the rail created after boot (the kit builds some late): look again for a little while
  var n=0,t=setInterval(function(){watchWindows();railBottom();if(++n>30)clearInterval(t)},1000);
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot);else boot();
 return {value:function(){return z},apply:apply,place:place,size:size,zoomOf:zoomOf,fitWindows:fitWindows,compute:compute,BASE_H:BASE_H,BASE_W:BASE_W};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=UIScale;
