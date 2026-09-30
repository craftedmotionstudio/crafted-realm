/* Creakwheel Mill sounds (Tutor's Holm v2 land, phase 3, 2026-09-26). The Blender mill (holm-mill-os-v1) animates itself:
 * its wheel turns at 6 rpm (WheelTurn), white water runs down the weir (FoamFlow) and the tailrace splashes (SplashPulse),
 * played by HolmIslandExtras like every building clip. This module adds what you hear within 8 tiles of the wheel: a low
 * rush of falling water, a soft slap as each of the 12 paddles meets the tailrace (one every 10/12 s) and the wheel's
 * creak twice a turn, fading with distance; our own WebAudio voices on the game's Sfx bus. Island only; silent until the
 * player has interacted (the browser's audio rule). Sound pass 2026-09-29: the recipes mill_rush (a seamless loop), mill_slap
 * and mill_creak (src/sfx_recipes.js; the old creak was a sawtooth). */
var HolmMill=(function(){
 'use strict';
 var st={wheel:null,loop:null,slap:0,creak:0,near:8};
 function bind(scene){st.wheel=scene&&scene.getObjectByName('Mill_Wheel')||null;return !!st.wheel}
 function where(){var v=new THREE.Vector3();st.wheel.getWorldPosition(v);return v}
 function update(dt){
  if(!st.wheel||typeof Sfx==='undefined'||!Sfx.loop||!(dt>0)||typeof player==='undefined')return;
  var w=where(),d=Math.hypot(player.position.x-w.x,player.position.z-w.z),g=d>=st.near?0:Math.pow(1-d/st.near,1.5);
  try{
   if(!st.loop){if(!(g>0))return;st.loop=Sfx.loop('mill_rush');if(!st.loop)return}
   st.loop.setGain(typeof document!=='undefined'&&document.hidden?0:g);
   if(g>.02){st.slap+=dt;st.creak+=dt;
    if(st.slap>=10/12){st.slap-=10/12;Sfx.play('mill_slap',{gain:g})}
    if(st.creak>=5){st.creak-=5;Sfx.play('mill_creak',{gain:g})}}
  }catch(e){}
 }
 function dispose(){if(st.loop){try{st.loop.stop()}catch(e){}st.loop=null}st.wheel=null}
 return {bind:bind,update:update,dispose:dispose,wheel:function(){return st.wheel?where():null}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmMill;
