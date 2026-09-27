/* ============ PvpHud — what an adventurer must see in the Scarlands (COMBAT_GRADE criterion 18) ============
 * Presentation only, driven by the online layer from the server's status block (NET_PROTOCOL.md `me`: wl, multi,
 * skull) and by the Ditch crossing. Our own art: Blender-rendered pixel icons (assets/icons/ui/v3/misc/pk_skull,
 * multi_combat, wild_plaque; tools/blender/build_ui_icons_v1.py).
 *   PvpHud.set({wl, multi, skull})   the Scarlands level plaque ("Level: N"), the multi-combat sign, and the skull
 *                                    (ticks left: the HUD skull with minutes left, and a skull over the adventurer)
 *   PvpHud.ditchWarning({onCross, onStay})   the crossing warning: the rules with this adventurer's own numbers
 *                                    (shared/pvp.js ditchWarningLines via game4_ui ditchWarning), the items they would
 *                                    keep (pictures), Cross / Stay
 *   PvpHud.overheadSkull(obj, on)    a skull over another player's body (online views)
 * Nothing here changes any rule, item or position. */
var PvpHud=(function(){
 'use strict';
 var PIC='assets/icons/ui/v3/misc/',V='?v=1',st={wl:0,multi:0,skull:0},el=null,skullSprites=new Map(),tex=null;
 function ensure(){
  if(el||typeof document==='undefined')return el;
  el=document.createElement('div');el.id='pvp-hud';
  el.style.cssText='position:fixed;right:250px;bottom:12px;z-index:30;display:none;align-items:center;gap:6px;pointer-events:auto;font:14px var(--k-font,"Realm Small",monospace);color:#ffff00;text-shadow:1px 1px 0 #000;';
  el.innerHTML='<div id="pvp-plaque" style="position:relative;width:96px;height:51px;background:url('+PIC+'wild_plaque.png'+V+') center/contain no-repeat;image-rendering:pixelated;display:flex;align-items:center;justify-content:center">'+
   '<span id="pvp-level" style="margin-top:-2px">Level: 0</span></div>'+
   '<img id="pvp-skull" alt="" src="'+PIC+'pk_skull.png'+V+'" style="width:36px;height:36px;image-rendering:pixelated;display:none">'+
   '<img id="pvp-multi" alt="" src="'+PIC+'multi_combat.png'+V+'" style="width:36px;height:36px;image-rendering:pixelated;display:none">';
  document.body.appendChild(el);return el}
 function tip(node,text){if(node)node.setAttribute('data-tip',text)}
 /** the status from the server: wl = Scarlands level (0 outside), multi = 1 in multi-combat, skull = ticks left */
 function set(o){o=o||{};ensure();if(!el)return;
  if(o.wl!=null)st.wl=o.wl|0;if(o.multi!=null)st.multi=o.multi?1:0;if(o.skull!=null)st.skull=Math.max(0,o.skull|0);
  el.style.display=st.wl>0||st.skull>0?'flex':'none';
  var lv=document.getElementById('pvp-level');if(lv)lv.textContent='Level: '+st.wl;
  tip(document.getElementById('pvp-plaque'),st.wl?'Scarlands level '+st.wl+': you can fight adventurers within '+st.wl+' combat level'+(st.wl>1?'s':'')+' of you.'+(st.wl>20?'\nNo ordinary teleport works here.':''):'');
  var sk=document.getElementById('pvp-skull');if(sk){sk.style.display=st.skull>0?'block':'none';tip(sk,'Skulled: '+Math.ceil(st.skull*0.6/60)+' min left. If you fall you keep nothing (Protect Item saves one thing).')}
  var mu=document.getElementById('pvp-multi');if(mu){mu.style.display=st.multi?'block':'none';tip(mu,'Multi-combat: several adventurers can attack you at once.')}
  if(typeof player!=='undefined'&&player)overheadSkull(player,st.skull>0);
 }
 /** a skull over a body (the adventurer, or another player's view online); above an overhead prayer when both show */
 function overheadSkull(obj,on){
  if(!obj||typeof THREE==='undefined')return;var s=skullSprites.get(obj);
  if(!on){if(s){s.visible=false}return}
  if(!s){if(!tex){tex=new THREE.TextureLoader().load(PIC+'pk_skull_over.png'+V);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter}
   s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.45,.45,1);s.renderOrder=6;s.name='pvp-skull-over';obj.add(s);skullSprites.set(obj,s)}
  var pray=obj===player&&typeof Player!=='undefined'&&Player.activePrayers&&Array.from(Player.activePrayers).some(function(id){return /^protect_(melee|range|magic)$/.test(id)});
  s.position.set(0,pray?2.95:2.5,0);s.visible=true}
 /** the crossing warning; calls onCross() or onStay() */
 function ditchWarning(o){o=o||{};if(typeof document==='undefined')return;
  var lines=typeof ditchWarning_==='function'?ditchWarning_():[];
  var kept=typeof keptOnDeathPreview==='function'?keptOnDeathPreview({skulled:st.skull>0}).kept:[];
  var m=document.getElementById('pvp-ditch');if(m)m.remove();
  m=document.createElement('div');m.id='pvp-ditch';
  m.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;width:min(520px,92vw);background:#3e3529;border:3px solid #1b150e;box-shadow:inset 0 0 0 2px #6b5a3e,0 6px 24px rgba(0,0,0,.6);padding:14px 16px;color:#ffcf6a;font:13px var(--k-font,"Realm Small",monospace);line-height:1.45;';
  var html='<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><img alt="" src="'+PIC+'pk_skull.png'+V+'" style="width:32px;height:32px;image-rendering:pixelated"><b style="font-size:16px;color:#ff981f">Beyond the Ditch</b></div>';
  lines.forEach(function(t){html+='<p style="margin:0 0 6px">'+String(t).replace(/[<>&]/g,'')+'</p>'});
  html+='<div style="display:flex;gap:4px;margin:6px 0 10px">';kept.forEach(function(k){var src=typeof iconFor==='function'?iconFor(k.id):'';html+='<div title="'+(typeof ITEMS!=='undefined'&&ITEMS[k.id]?ITEMS[k.id].name:k.id)+'" style="width:36px;height:36px;background:#2b241b;border:1px solid #5a4a33;display:flex;align-items:center;justify-content:center"><img alt="" src="'+src+'" style="width:30px;height:30px;image-rendering:pixelated"></div>'});
  html+='</div><div style="display:flex;gap:10px;justify-content:flex-end"><button id="pvp-stay" class="set-btn">Stay on this side</button><button id="pvp-cross" class="set-btn" style="background:#7a1e14;color:#fff">Cross the Ditch</button></div>';
  m.innerHTML=html;document.body.appendChild(m);
  document.getElementById('pvp-stay').onclick=function(){m.remove();if(o.onStay)o.onStay()};
  document.getElementById('pvp-cross').onclick=function(){m.remove();if(o.onCross)o.onCross()};
  return m}
 // game4_ui.js ditchWarning(): the shared lines with this adventurer's numbers (kept items, level, skull)
 function ditchWarning_(){try{var f=typeof window!=='undefined'&&window.ditchWarning;return typeof f==='function'?f({skulled:st.skull>0}):[]}catch(e){return []}}
 return {set:set,overheadSkull:overheadSkull,ditchWarning:ditchWarning,state:function(){return Object.assign({},st)}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PvpHud;
