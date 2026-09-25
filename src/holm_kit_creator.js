/* 2004-style character creator for the Blender kit (owner 2026-09-25: "customize our characters just like you can do in
 * 2004scape"). Laid out like the classic creator: a Design column (Head, Jaw, Torso, Arms, Hands, Legs, Feet with
 * left/right arrows), a Colour column (Hair, Torso, Legs, Feet, Skin with arrows and a swatch) and Body type A / B,
 * then Confirm. The model beside it is the real player (HolmIslandPlayer), changing as you click. Takes over the
 * existing CharCreator when the Blender island is live; the choices are saved with the character (CharCfg.kit). */
var HolmKitCreator=(function(){
 'use strict';
 var st={panel:null,look:null,els:{},prevCam:null,active:false};
 var DESIGN=[['Hair','Head'],['Jaw','Jaw'],['Torso','Torso'],['Arms','Arms'],['Hands','Hands'],['Legs','Legs'],['Feet','Feet']];
 var COLOUR=[['hair','Hair'],['torso','Torso'],['legs','Legs'],['feet','Feet'],['skin','Skin']];
 var BTN='font:bold 15px Verdana;color:#c8c0a8;background:linear-gradient(#5a5043,#3e3529);border:2px outset #6b5f4a;cursor:pointer;width:34px;height:28px;border-radius:3px;';
 function el(tag,css,html){var e=document.createElement(tag);if(css)e.style.cssText=css;if(html!==undefined)e.innerHTML=html;return e}
 function click(){try{if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click()}catch(e){}}
 function refresh(){st.look=HolmKit.normalize(st.look);if(typeof CharCfg!=='undefined')CharCfg.kit=st.look;
  if(typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.refreshLook)HolmIslandPlayer.refreshLook();
  DESIGN.forEach(function(d){var e=st.els[d[0]];if(!e)return;var has=HolmKit.hasSlot(st.look.body,d[0]);e.row.style.visibility=e.lbl.style.visibility=has?'visible':'hidden';
   if(has)e.lbl.textContent=HolmKit.label(st.look.body,d[0],st.look.parts[d[0]])});
  COLOUR.forEach(function(c){var e=st.els['c_'+c[0]];if(e)e.sw.style.background=HolmKit.palette(c[0])[st.look.colors[c[0]]]||'#000'});
  ['A','B'].forEach(function(b){var e=st.els['body_'+b];if(e)e.style.outline=st.look.body===b?'2px solid #ffd24a':'none'})}
 function cyclePart(slot,dir){var n=HolmKit.options(st.look.body,slot).length;if(!n)return;st.look.parts[slot]=((st.look.parts[slot]-1+dir+n)%n)+1;refresh()}
 function cycleColour(ch,dir){var n=HolmKit.palette(ch).length;st.look.colors[ch]=(st.look.colors[ch]+dir+n)%n;refresh()}
 function setBody(b){if(st.look.body===b)return;var keep=st.look.colors;st.look=HolmKit.defaults(b);st.look.colors=keep;refresh()}
 function randomise(){var b=Math.random()<.5?'A':'B',l=HolmKit.defaults(b);
  HolmKit.SLOTS.forEach(function(s){var n=HolmKit.options(b,s).length;if(n)l.parts[s]=1+Math.floor(Math.random()*n)});
  HolmKit.CHANNELS.forEach(function(c){l.colors[c]=Math.floor(Math.random()*HolmKit.palette(c).length)});st.look=l;refresh()}
 var PANEL='position:fixed;top:50%;transform:translateY(-50%);width:min(236px,31vw);pointer-events:auto;background:#3e3529;border:3px solid #1a1208;box-shadow:0 0 0 2px #6b5f4a,0 8px 30px rgba(0,0,0,.6);';
 function column(title){var c=el('div',PANEL+'padding:6px 8px;box-sizing:border-box','<div style="text-align:center;color:#ff981f;font-weight:bold;font-size:13px;margin-bottom:6px;text-shadow:1px 1px 0 #000">'+title+'</div>');return c}
 function arrowRow(parent,label,left,right,extra){var r=el('div','display:flex;align-items:center;gap:6px;margin:4px 0');var a=el('button',BTN,'&#9664;');a.onclick=function(){click();left()};
  var mid=el('div','flex:1;text-align:center;color:#ffd24a;font-weight:bold;font-size:12px;text-shadow:1px 1px 0 #000',label);var b=el('button',BTN,'&#9654;');b.onclick=function(){click();right()};
  r.appendChild(a);r.appendChild(mid);if(extra)r.appendChild(extra);r.appendChild(b);parent.appendChild(r);return {row:r,mid:mid}}
 function build(){
  // 2004 layout: Design docked left, Colour right, the character itself turning in the clear middle
  var p=el('div','position:fixed;inset:0;z-index:9000;pointer-events:none;font:12px Verdana;color:#fff');
  p.appendChild(el('div','position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#ff981f;font-size:18px;font-weight:bold;text-shadow:2px 2px 0 #000;white-space:nowrap','Character Creator'));
  var dc=column('Design'),cc=column('Colour');dc.style.left='10px';cc.style.right='10px';
  DESIGN.forEach(function(d){var info=el('div','color:#9a8e78;font-size:10px;text-align:center;margin-top:-2px');var r=arrowRow(dc,d[1],function(){cyclePart(d[0],-1)},function(){cyclePart(d[0],1)});
   var lbl=el('div','color:#cfc6a8;font-size:10px;text-align:center;margin:-2px 0 3px');dc.appendChild(lbl);st.els[d[0]]={row:r.row,lbl:lbl}});
  COLOUR.forEach(function(c){var sw=el('div','width:18px;height:18px;border:2px solid #1a1208;border-radius:2px');var r=arrowRow(cc,c[1],function(){cycleColour(c[0],-1)},function(){cycleColour(c[0],1)},sw);st.els['c_'+c[0]]={row:r.row,sw:sw}});
  var bt=el('div','margin-top:10px;text-align:center','<div style="color:#ff981f;font-weight:bold;font-size:13px;margin-bottom:4px;text-shadow:1px 1px 0 #000">Body type</div>');
  ['A','B'].forEach(function(b){var x=el('button',BTN+'width:60px;margin:0 4px',b);x.onclick=function(){click();setBody(b)};bt.appendChild(x);st.els['body_'+b]=x});cc.appendChild(bt);
  p.appendChild(dc);p.appendChild(cc);
  var acts=el('div','position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto');
  var rnd=el('button',BTN+'width:auto;padding:0 14px','Randomise');rnd.onclick=function(){click();randomise()};
  var ok=el('button','font:bold 13px Verdana;color:#fff;background:linear-gradient(#3a7c2a,#225017);border:2px solid;border-color:#5aa84e #0a2a05 #0a2a05 #5aa84e;padding:6px 26px;cursor:pointer;border-radius:3px','Confirm');ok.onclick=function(){click();close(true)};
  acts.appendChild(rnd);acts.appendChild(ok);p.appendChild(acts);
  [dc,cc,acts].forEach(function(x){x.addEventListener('pointerdown',function(e){e.stopPropagation()})});document.body.appendChild(p);st.panel=p}
 function open(){if(st.active)return true;if(!HolmKit.ready()){HolmKit.load().then(open);return true}
  st.active=true;st.look=HolmKit.normalize(typeof CharCfg!=='undefined'&&CharCfg.kit);if(!st.panel)build();st.panel.style.display='block';
  stage(true);
  refresh();return true}
 function close(save){if(!st.active)return;st.active=false;stage(false);if(typeof CharCreator!=='undefined')CharCreator.active=false;if(st.panel)st.panel.style.display='none';
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
    cam.position.set(p.x+6.4*Math.sin(y),p.y+1.9,p.z+6.4*Math.cos(y));cam.lookAt(p.x,p.y+1.1,p.z);cam.updateMatrixWorld()}}}
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
