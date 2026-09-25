/* 2004-style character creator for the Blender kit (owner 2026-09-25: "customize our characters just like you can do in
 * 2004scape"). Laid out like the classic creator: a Design column (Head, Jaw, Torso, Arms, Hands, Legs, Feet with
 * left/right arrows), a Colour column (Hair, Torso, Legs, Feet, Skin with arrows and a swatch) and Body type A / B,
 * then Confirm. The model beside it is the real player (HolmIslandPlayer), changing as you click. Takes over the
 * existing CharCreator when the Blender island is live; the choices are saved with the character (CharCfg.kit). */
var HolmKitCreator=(function(){
 'use strict';
 var st={panel:null,look:null,els:{},prevCam:null,active:false};
 var DESIGN=[['Hair','Head'],['Jaw','Jaw'],['Torso','Torso'],['Arms','Arms'],['Hands','Hands'],['Legs','Legs'],['Feet','Feet'],['Makeup','Makeup']];
 var COLOUR=[['hair','Hair'],['torso','Torso'],['legs','Legs'],['feet','Feet'],['skin','Skin'],['makeup','Makeup']];
 function el(tag,css,html){var e=document.createElement(tag);if(css)e.style.cssText=css;if(html!==undefined)e.innerHTML=html;return e}
 function click(){try{if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click()}catch(e){}}
 function refresh(){st.look=HolmKit.normalize(st.look);if(typeof CharCfg!=='undefined')CharCfg.kit=st.look;
  if(typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.refreshLook)HolmIslandPlayer.refreshLook();
  DESIGN.forEach(function(d){var e=st.els[d[0]];if(!e)return;var has=HolmKit.hasSlot(st.look.body,d[0]);e.row.style.visibility=e.lbl.style.visibility=has?'visible':'hidden';
   if(has)e.lbl.textContent=HolmKit.label(st.look.body,d[0],st.look.parts[d[0]])});
  COLOUR.forEach(function(c){var e=st.els['c_'+c[0]];if(!e)return;e.sw.style.background=HolmKit.palette(c[0])[st.look.colors[c[0]]]||'#000';
   if(c[0]==='makeup')e.row.style.display=HolmKit.hasSlot(st.look.body,'Makeup')?'':'none'});
  ['A','B'].forEach(function(b){var e=st.els['body_'+b];if(e)e.classList.toggle('on',st.look.body===b)});
  var cap=function(s){return s.charAt(0).toUpperCase()+s.slice(1)};if(st.els.shape_build)st.els.shape_build.textContent=cap(st.look.build||'average');if(st.els.shape_feet)st.els.shape_feet.textContent=cap(st.look.feet||'normal')}
 function cyclePart(slot,dir){var n=HolmKit.options(st.look.body,slot).length;if(!n)return;st.look.parts[slot]=((st.look.parts[slot]-1+dir+n)%n)+1;refresh()}
 function cycleColour(ch,dir){var n=HolmKit.palette(ch).length;st.look.colors[ch]=(st.look.colors[ch]+dir+n)%n;refresh()}
 function setBody(b){if(st.look.body===b)return;var keep=st.look.colors,build=st.look.build,feet=st.look.feet;st.look=HolmKit.defaults(b);st.look.colors=keep;st.look.build=build;st.look.feet=feet;refresh()}
 function cycleShape(key,list,dir){var i=list.indexOf(st.look[key]);st.look[key]=list[(i+dir+list.length)%list.length];refresh()}
 function randomise(){var b=Math.random()<.5?'A':'B',l=HolmKit.defaults(b);
  HolmKit.SLOTS.forEach(function(s){var n=HolmKit.options(b,s).length;if(n)l.parts[s]=1+Math.floor(Math.random()*n)});
  HolmKit.CHANNELS.forEach(function(c){l.colors[c]=Math.floor(Math.random()*HolmKit.palette(c).length)});
  l.build=HolmKit.BUILDS[Math.floor(Math.random()*3)];l.feet=HolmKit.FEET[Math.floor(Math.random()*3)];st.look=l;refresh()}
 // The 2004 creator window (ui_osrs_kit.js / osrs_kit.css): a stone-framed Design column, the character turning in a clear
 // framed window in the middle, the Colour column and Body type on the right, Randomise + Confirm under the character.
 function arrowRow(parent,label,left,right,extra){var r=el('div');r.className='kc-row';var a=el('button');a.type='button';a.className='kc-arrow l';a.title='Previous '+label.toLowerCase();a.onclick=function(){click();left()};
  var mid=el('div',null,label);mid.className='kc-label';var b=el('button');b.type='button';b.className='kc-arrow r';b.title='Next '+label.toLowerCase();b.onclick=function(){click();right()};
  r.appendChild(a);r.appendChild(mid);if(extra)r.appendChild(extra);r.appendChild(b);parent.appendChild(r);return {row:r,mid:mid}}
 function build(){
  var p=el('div','position:fixed;inset:0;z-index:9000;pointer-events:none');p.id='kit-creator';
  var w=el('div');w.className='kc-window';p.appendChild(w);
  var t=el('div',null,'Character Creator');t.className='kc-title';w.appendChild(t);
  var dc=el('div',null,'<h4>Design</h4>'),view=el('div'),cc=el('div',null,'<h4>Colour</h4>');dc.className='kc-col kc-design';view.className='kc-view';cc.className='kc-col kc-colour';
  DESIGN.forEach(function(d){arrowRow(dc,d[1],function(){cyclePart(d[0],-1)},function(){cyclePart(d[0],1)});var r=dc.lastChild;
   var lbl=el('div');lbl.className='kc-sub';dc.appendChild(lbl);st.els[d[0]]={row:r,lbl:lbl}});
  COLOUR.forEach(function(c){var sw=el('div');sw.className='kc-swatch';var r=arrowRow(cc,c[1],function(){cycleColour(c[0],-1)},function(){cycleColour(c[0],1)},sw);st.els['c_'+c[0]]={row:r.row,sw:sw}});
  var bt=el('div',null,'<h4>Body type</h4>');bt.style.marginTop='12px';var bb=el('div');bb.className='kc-body';
  ['A','B'].forEach(function(b){var x=el('button',null,b);x.type='button';x.className='kit-btn';x.title='Body type '+b;x.onclick=function(){click();setBody(b)};bb.appendChild(x);st.els['body_'+b]=x});bt.appendChild(bb);cc.appendChild(bt);
  // body build and feet size (morph targets on every part)
  [['build','Build',HolmKit.BUILDS],['feet','Feet size',HolmKit.FEET]].forEach(function(s){arrowRow(cc,s[1],function(){cycleShape(s[0],s[2],-1)},function(){cycleShape(s[0],s[2],1)});var lbl=el('div');lbl.className='kc-sub';cc.appendChild(lbl);st.els['shape_'+s[0]]=lbl});
  w.appendChild(dc);w.appendChild(view);w.appendChild(cc);
  var acts=el('div');acts.className='kc-actions';
  var rnd=el('button',null,'Randomise');rnd.type='button';rnd.className='kit-btn';rnd.title='Roll a random look';rnd.onclick=function(){click();randomise()};
  var ok=el('button',null,'Confirm');ok.type='button';ok.className='kit-btn kc-confirm';ok.title='Keep this look';ok.onclick=function(){click();close(true)};
  acts.appendChild(el('div'));acts.appendChild(rnd);acts.appendChild(ok);w.appendChild(el('div'));w.appendChild(acts);
  [dc,cc,acts,t].forEach(function(x){x.addEventListener('pointerdown',function(e){e.stopPropagation()})});document.body.appendChild(p);st.panel=p}
 function open(){if(st.active)return true;if(!HolmKit.ready()){HolmKit.load().then(open);return true}
  st.active=true;st.look=HolmKit.normalize(typeof CharCfg!=='undefined'&&CharCfg.kit);if(!st.panel)build();st.panel.style.display='block';document.body.classList.add('kit-creator-open');
  stage(true);
  refresh();return true}
 function close(save){if(!st.active)return;st.active=false;stage(false);if(typeof CharCreator!=='undefined')CharCreator.active=false;if(st.panel)st.panel.style.display='none';document.body.classList.remove('kit-creator-open');
  if(typeof CharCfg!=='undefined')CharCfg._new=false;if(save)try{SaveGame.save(true)}catch(e){}
  if(typeof UI!=='undefined')UI.chat('Your new look is saved. You can change it any time with the appearance button (Shift+C).','plain')}
 // the classic creator had its own screen: only the character and the lights on a dark backdrop, the world hidden
 var BACKDROP=0x2a241c;
 function stage(on){if(typeof scene==='undefined'||!scene)return;
  if(on){if(!st.hidden){st.hidden=[];st.bg=scene.background&&scene.background.clone();st.fogC=scene.fog&&scene.fog.color.clone()}
   // re-run every frame: the island keeps streaming parts in, and the loop eases sky and fog back to the zone's
   scene.children.forEach(function(c){if(c.isLight||c===player||c.isCamera||!c.visible)return;c.visible=false;st.hidden.push(c)});
   if(scene.background&&scene.background.set)scene.background.set(BACKDROP);if(scene.fog)scene.fog.color.set(BACKDROP);
   // a fixed portrait camera, set at render time so the follow camera's terrain clamp (the ground is hidden) can't pull it in
   if(!st.cam){st.prevBR=scene.onBeforeRender;st.cam=true;scene.onBeforeRender=function(r,s,cam){if(!player)return;var y=typeof camCtl!=='undefined'?camCtl.yaw:0,p=player.position;
    cam.position.set(p.x+7.8*Math.sin(y),p.y+1.75,p.z+7.8*Math.cos(y));cam.lookAt(p.x,p.y+1.0,p.z);cam.updateMatrixWorld()}}}
  else if(st.hidden){st.hidden.forEach(function(c){c.visible=true});st.hidden=null;if(st.cam){scene.onBeforeRender=st.prevBR||function(){};st.cam=false}
   if(st.bg&&scene.background&&scene.background.copy)scene.background.copy(st.bg);if(st.fogC&&scene.fog)scene.fog.color.copy(st.fogC)}}
 // turn the model slowly while the creator is open (like the classic spinning preview)
 function tick(dt){if(!st.active||typeof player==='undefined'||!player)return;stage(true);player.rotation.y+=dt*.6}
 // takes over the classic creator on the Blender island
 if(typeof CharCreator!=='undefined'&&typeof HolmIsland!=='undefined'&&HolmIsland.live()){
  CharCreator.open=function(){CharCreator.active=true;HolmKitCreator.open()};
  // the in-game appearance button (and Shift+C) opens the same creator rather than the old colour-only panel
  if(typeof CharStyler!=='undefined')CharStyler.toggle=function(){if(st.active)close(true);else CharCreator.open()};
  var t0=CharCreator.tick;CharCreator.tick=function(dt){if(st.active)return tick(dt);return t0&&t0.call(CharCreator,dt)};
 }
 return {open:open,close:close,tick:tick,active:function(){return st.active}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmKitCreator;
