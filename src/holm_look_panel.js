/* The Look panel (owner 2026-09-29: "if we could have like a slider to increase pixelation and decrease pixelation, that
 * would be really good to have. And once we have that, I should be able to tell you what the default should be.").
 * Opened from the Settings tab ("Look" row) or with ?look=panel. Live controls over HolmLookV4 (src/holm_look_v4.js):
 *   Pixel size        Off (native) .. 5 px blocks (at a 1006 px tall window); marks at 4a (503 lines) and 2004 (334 lines);
 *   Colour depth      Full .. the 2004 colour space .. fewer colours;
 *   Character facets  Round .. Flat (material shading only; the character kit is untouched);
 *   Plain textures, Chunky texels, Flat scenery, Bolder textures (4b / 4c's parts, on / off);
 *   presets v3 / 4a / 4b / 4c, then fine-tune; Copy settings (the JSON that becomes the default: GameConfig.holmLook);
 *   Reset (forget this browser's values: back to the shipped default, look v3).
 * Every change applies live and is saved in this browser (localStorage) so it survives a reload. Old-school stone kit
 * styling (square corners, hard bevels, Realm Small lettering); touch-sized sliders for phones. Events inside the panel
 * never reach the game (no walking or camera turns while you drag a slider). */
var HolmLookPanel=(function(){
 'use strict';
 var el=null,refs={},REF_H=1006;
 // pixel slider: the block size at a 1006 px tall window (1 = off .. 5); presets snap
 function linesToBlock(l){return l>0?REF_H/l:1}
 function blockToLines(b){b=+b;if(!(b>1.02))return 0;
  if(Math.abs(b-REF_H/HolmLookV4.LINES_4A)<0.04)return HolmLookV4.LINES_4A;if(Math.abs(b-REF_H/HolmLookV4.LINES_2004)<0.05)return HolmLookV4.LINES_2004;
  return Math.round(REF_H/b)}
 function pct(v,lo,hi){return ((v-lo)/(hi-lo)*100).toFixed(2)+'%'}
 var CSS=[
  '#look-panel{position:fixed;left:8px;top:8px;z-index:9500;width:318px;max-width:calc(100vw - 16px);overflow-y:auto;box-sizing:border-box;',
  ' padding:0;border-radius:0;background:var(--tex-stone-dark,#3a342b);color:#fff;font:12px var(--k-font,Verdana,sans-serif);text-shadow:1px 1px 0 #000;',
  ' box-shadow:0 0 0 1px #0d0b08,0 0 0 4px #4b4336,0 0 0 5px #0d0b08,inset 1px 1px 0 #a39680,inset -1px -1px 0 #1d1912;touch-action:pan-y;user-select:none;-webkit-user-select:none}',
  '#look-panel .lp-title{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:var(--tex-stone,#5a5245);',
  ' box-shadow:inset 1px 1px 0 #a39680,inset -1px -1px 0 #1d1912,0 1px 0 #0d0b08;font:bold 16px var(--k-title,Verdana,sans-serif);color:var(--k-orange,#ff981f)}',
  '#look-panel .lp-x{min-width:30px;height:28px;font-size:14px;padding:0}',
  '#look-panel .lp-body{padding:8px 10px 10px}',
  '#look-panel .lp-presets{display:flex;gap:6px;align-items:center;margin:2px 0 8px}',
  '#look-panel .lp-presets .kit-btn{flex:1;min-height:30px;padding:4px 2px}',
  '#look-panel .lp-now{display:block;margin:-2px 0 8px;color:var(--k-yellow,#ff0);text-align:center}',
  '#look-panel .lp-ctl{margin:4px 0 8px}',
  '#look-panel .lp-lab{display:flex;justify-content:space-between;color:var(--k-orange,#ff981f);font-weight:bold}',
  '#look-panel .lp-lab b{color:var(--k-yellow,#ff0);font-weight:normal}',
  '#look-panel .lp-track{position:relative;height:44px}',
  '#look-panel input[type=range]{-webkit-appearance:none;appearance:none;position:absolute;left:0;right:0;top:2px;width:100%;height:30px;margin:0;padding:0;background:transparent;cursor:pointer;touch-action:none}',
  '#look-panel input[type=range]:focus{outline:0}',
  '#look-panel input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:0;background:#16120d;box-shadow:inset 0 0 0 1px #0d0b08,inset 1px 1px 0 1px #2c261d,0 1px 0 #6d6250}',
  '#look-panel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:28px;margin-top:-10px;border:0;border-radius:0;',
  ' background:var(--tex-stone-lit,#8a7f6a);box-shadow:inset 1px 1px 0 #cfc2a4,inset -1px -1px 0 #2a241c,0 0 0 1px #0d0b08}',
  '#look-panel input[type=range]::-moz-range-track{height:8px;border-radius:0;background:#16120d;box-shadow:inset 0 0 0 1px #0d0b08}',
  '#look-panel input[type=range]::-moz-range-thumb{width:16px;height:28px;border:0;border-radius:0;background:var(--tex-stone-lit,#8a7f6a);box-shadow:inset 1px 1px 0 #cfc2a4,inset -1px -1px 0 #2a241c,0 0 0 1px #0d0b08}',
  '#look-panel .lp-ticks{position:absolute;left:8px;right:8px;top:30px;height:14px;pointer-events:none}',
  '#look-panel .lp-ticks i{position:absolute;transform:translateX(-50%);font-style:normal;font-size:11px;color:#c8bca0;white-space:nowrap}',
  '#look-panel .lp-ticks i.mark{color:var(--k-yellow,#ff0)}',
  '#look-panel .lp-ticks i.mark::before{content:"";position:absolute;left:50%;top:-8px;width:2px;height:6px;margin-left:-1px;background:var(--k-yellow,#ff0);box-shadow:0 0 0 1px #000}',
  '#look-panel .lp-sub{color:#c8bca0;font-size:11px;margin-top:1px}',
  '#look-panel .lp-tog{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid rgba(0,0,0,.45)}',
  '#look-panel .lp-tog .kit-btn{min-width:58px;min-height:28px}',
  '#look-panel .lp-tog small{display:block;color:#c8bca0;font-size:11px}',
  '#look-panel .lp-actions{display:flex;gap:6px;margin-top:10px}',
  '#look-panel .lp-actions .kit-btn{flex:1;min-height:32px}',
  '#look-panel textarea{display:none;width:100%;box-sizing:border-box;height:64px;margin-top:6px;border:0;border-radius:0;background:#16120d;color:#ff0;font:11px monospace;',
  ' box-shadow:inset 0 0 0 1px #0d0b08;resize:vertical;user-select:text;-webkit-user-select:text}',
  '#look-panel .lp-note{margin-top:8px;color:#c8bca0;font-size:11px;line-height:14px}',
  '@media (max-width:880px){#look-panel{max-height:calc(100vh - 16px)}}',
  '@media (max-width:600px){#look-panel{left:8px;right:8px;top:8px;width:auto;max-height:62vh}}'].join('\n');
 var TOGGLES=[['plainTextures','Plain textures','wood, plaster, roofs in plain colour'],['chunkyTexels','Chunky texels','textures without smoothing'],
  ['flatScenery','Flat scenery','flat faces on buildings and props'],['bolderTextures','Bolder textures','stone, leaves, water, paths']];
 function slider(id,label,min,max,step,ticks){
  return '<div class="lp-ctl"><div class="lp-lab"><span>'+label+'</span><b id="lp-'+id+'-val"></b></div><div class="lp-track">'+
   '<input type="range" id="lp-'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" aria-label="'+label+'">'+
   '<div class="lp-ticks">'+ticks.map(function(t){return '<i class="'+(t[2]?'mark':'')+'" style="left:'+pct(t[0],min,max)+'">'+t[1]+'</i>'}).join('')+'</div></div>'+
   '<div class="lp-sub" id="lp-'+id+'-sub"></div></div>';
 }
 function build(){
  if(el)return el;
  var st=document.createElement('style');st.id='look-panel-css';st.textContent=CSS;document.head.appendChild(st);
  el=document.createElement('div');el.id='look-panel';el.setAttribute('role','dialog');el.setAttribute('aria-label','Look');
  var b24=REF_H/HolmLookV4.LINES_2004,b4a=REF_H/HolmLookV4.LINES_4A;
  el.innerHTML='<div class="lp-title"><span>Look</span><button class="kit-btn lp-x" id="lp-close" title="Close">X</button></div><div class="lp-body">'+
   '<div class="lp-presets">'+['3','4a','4b','4c'].map(function(p){return '<button class="kit-btn" data-preset="'+p+'" title="'+HolmLookV4.TITLES[p]+'">'+(p==='3'?'v3':p)+'</button>'}).join('')+'</div>'+
   '<span class="lp-now" id="lp-now"></span>'+
   slider('px','Pixel size',1,5,0.01,[[1,'Off'],[b4a,'4a',1],[b24,'2004',1],[5,'5']])+
   slider('col','Colour depth',0,2,0.01,[[0,'Full'],[1,'2004',1],[2,'Fewer']])+
   slider('fac','Character facets',0,1,0.01,[[0,'Round'],[.7,'4b',1],[1,'Flat']])+
   TOGGLES.map(function(t){return '<div class="lp-tog"><span>'+t[1]+'<small>'+t[2]+'</small></span><button class="kit-btn" data-toggle="'+t[0]+'">Off</button></div>'}).join('')+
   '<div class="lp-actions"><button class="kit-btn" id="lp-copy">Copy settings</button><button class="kit-btn" id="lp-reset">Reset to default</button></div>'+
   '<textarea id="lp-json" readonly></textarea>'+
   '<div class="lp-note" id="lp-note"></div></div>';
  // nothing inside the panel reaches the game (no walks, camera turns or hotkeys while you use it)
  ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','contextmenu','wheel','touchstart','touchmove','touchend','keydown','keyup'].forEach(function(t){
   el.addEventListener(t,function(e){e.stopPropagation();if(t==='contextmenu')e.preventDefault()},{passive:t!=='contextmenu'})});
  document.body.appendChild(el);
  ['px','col','fac'].forEach(function(k){refs[k]=el.querySelector('#lp-'+k);refs[k+'Val']=el.querySelector('#lp-'+k+'-val');refs[k+'Sub']=el.querySelector('#lp-'+k+'-sub')});
  refs.px.addEventListener('input',function(){HolmLookV4.set({pixelLines:blockToLines(refs.px.value)},true)});
  refs.col.addEventListener('input',function(){var v=+refs.col.value;if(Math.abs(v-1)<0.03)v=1;HolmLookV4.set({colourDepth:v},true)});
  refs.fac.addEventListener('input',function(){var v=+refs.fac.value;if(Math.abs(v-.7)<0.02)v=.7;HolmLookV4.set({characterFacets:v},true)});
  Array.prototype.forEach.call(el.querySelectorAll('[data-preset]'),function(b){b.addEventListener('click',function(){HolmLookV4.preset(b.getAttribute('data-preset'),true)})});
  Array.prototype.forEach.call(el.querySelectorAll('[data-toggle]'),function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-toggle'),o={};o[k]=!HolmLookV4.get()[k];HolmLookV4.set(o,true)})});
  el.querySelector('#lp-close').addEventListener('click',close);
  el.querySelector('#lp-reset').addEventListener('click',function(){refs.json.style.display='none';HolmLookV4.reset();fit()});
  refs.json=el.querySelector('#lp-json');refs.now=el.querySelector('#lp-now');refs.note=el.querySelector('#lp-note');
  el.querySelector('#lp-copy').addEventListener('click',copy);
  HolmLookV4.onChange(refresh);
  return el;
 }
 function copy(){
  var j=HolmLookV4.exportJSON();refs.json.value=j;refs.json.style.display='block';fit();
  var done=function(ok){refs.note.textContent=ok?'Copied. Send this to make it the default (GameConfig.holmLook).':'Select the text above and copy it.'};
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(j).then(function(){done(true)},function(){fallback()});return}}catch(e){}
  fallback();
  function fallback(){try{refs.json.focus();refs.json.select();done(document.execCommand&&document.execCommand('copy'))}catch(e){done(false)}}
 }
 // the block size on this screen for a line count (CSS pixels)
 function blockHere(lines){
  if(!(lines>0))return 1;var h=(typeof renderer!=='undefined'&&renderer&&renderer.domElement&&renderer.domElement.clientHeight)||innerHeight,
   fov=(typeof camera!=='undefined'&&camera&&camera.fov)||36.13;return h/(lines*fov/36.13)}
 function refresh(){
  if(!el)return;var s=HolmLookV4.get(),p=HolmLookV4.presetOf(s),snap=HolmLookV4.snapshot();
  if(document.activeElement!==refs.px)refs.px.value=linesToBlock(s.pixelLines).toFixed(2);
  if(document.activeElement!==refs.col)refs.col.value=s.colourDepth;
  if(document.activeElement!==refs.fac)refs.fac.value=s.characterFacets;
  refs.pxVal.textContent=s.pixelLines?linesToBlock(s.pixelLines).toFixed(1)+(s.pixelLines===HolmLookV4.LINES_2004?' (2004)':s.pixelLines===HolmLookV4.LINES_4A?' (4a)':''):'Off';
  refs.pxSub.textContent=s.pixelLines?s.pixelLines+' lines (2004: 334) - '+blockHere(s.pixelLines).toFixed(1)+' px blocks on this screen':'Native resolution, smooth edges';
  var L=typeof ClassicPixels!=='undefined'&&ClassicPixels.levels?ClassicPixels.levels(s.colourDepth):null;
  refs.colVal.textContent=s.colourDepth===0?'Full':s.colourDepth===1?'2004':s.colourDepth<1?'Near full':'Fewer';
  refs.colSub.textContent=L?L[0]+' hues x '+L[1]+' saturations x '+L[2]+' lightnesses'+(s.colourDepth===1?' (the 2004 client)':''):'Every colour the screen can show';
  refs.facVal.textContent=s.characterFacets===0?'Round':s.characterFacets===1?'Flat':Math.round(s.characterFacets*100)+'%';
  refs.facSub.textContent='The adventurer and people: '+(s.characterFacets===0?'smooth, as modelled':s.characterFacets===1?'one tone per face':'part-way to flat faces');
  Array.prototype.forEach.call(el.querySelectorAll('[data-toggle]'),function(b){var on=!!s[b.getAttribute('data-toggle')];b.textContent=on?'On':'Off';b.classList.toggle('on',on)});
  Array.prototype.forEach.call(el.querySelectorAll('[data-preset]'),function(b){b.classList.toggle('on',b.getAttribute('data-preset')===p)});
  refs.now.textContent=p==='custom'?'Custom':(p==='3'?'v3: ':p+': ')+HolmLookV4.TITLES[p];
  if(!refs.json||refs.json.style.display!=='block')refs.note.textContent=(snap.source==='saved'?'Saved in this browser (survives a reload).':snap.source==='url'?'From the link (?look=); move a control to save it here.':'The shipped default.')+
   ' Everyone else sees the game\'s default (look v3) until one is chosen.';
  var btn=document.getElementById('look-btn');if(btn)btn.textContent=isOpen()?'Close':'Open';
 }
 // on a desktop window the panel takes the chrome's 2004-proportion zoom (src/ui_scale.js), capped so it fits the height and
 // keeps most of the view free; phones and narrow windows (<= 880 px) keep 1x with their own layout
 function fit(){
  if(!el||el.style.display==='none')return;el.style.zoom='';
  if(innerWidth<=880)return;var z=typeof UIScale!=='undefined'&&UIScale.value?UIScale.value():1,w=el.offsetWidth,h=el.scrollHeight;if(!(w>0&&h>0))return;
  var k=Math.max(1,Math.min(z,0.96*innerHeight/h,0.36*innerWidth/w));if(k>1.001)el.style.zoom=String(+k.toFixed(3));
 }
 var fitting=false;
 function isOpen(){return !!el&&el.style.display!=='none'}
 function open(){if(typeof document==='undefined'||typeof HolmLookV4==='undefined')return false;build();el.style.display='block';refresh();fit();
  if(!fitting){fitting=true;addEventListener('resize',function(){fit();refresh()})}return true}
 function close(){if(el)el.style.display='none';var btn=document.getElementById('look-btn');if(btn)btn.textContent='Open';return false}
 function toggle(){return isOpen()?close():open()}
 return {open:open,close:close,toggle:toggle,isOpen:isOpen,refresh:refresh,fit:fit,blockToLines:blockToLines,linesToBlock:linesToBlock};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmLookPanel;
