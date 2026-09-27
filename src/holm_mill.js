/* Creakwheel Mill sounds (Tutor's Holm v2 land, phase 3, 2026-09-26). The Blender mill (holm-mill-os-v1) animates itself:
 * its wheel turns at 6 rpm (WheelTurn), white water runs down the weir (FoamFlow) and the tailrace splashes (SplashPulse),
 * played by HolmIslandExtras like every building clip. This module adds what you hear within 8 tiles of the wheel: a low
 * rush of falling water, a soft slap as each of the 12 paddles meets the tailrace (one every 10/12 s) and the wheel's
 * creak twice a turn, fading with distance; our own WebAudio voices on the game's Sfx bus. Island only; silent until the
 * player has interacted (the browser's audio rule). */
var HolmMill=(function(){
 'use strict';
 var st={wheel:null,loop:null,slap:0,creak:0,near:8};
 function bind(scene){st.wheel=scene&&scene.getObjectByName('Mill_Wheel')||null;return !!st.wheel}
 function where(){var v=new THREE.Vector3();st.wheel.getWorldPosition(v);return v}
 function update(dt){
  if(!st.wheel||typeof Sfx==='undefined'||!Sfx.ctx||!(dt>0)||typeof player==='undefined')return;
  var w=where(),d=Math.hypot(player.position.x-w.x,player.position.z-w.z),g=d>=st.near?0:Math.pow(1-d/st.near,1.5);
  try{
   if(!st.loop){var ctx=Sfx.ctx,src=ctx.createBufferSource();src.buffer=Sfx._noiseBuf;src.loop=true;var f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;var gn=ctx.createGain();gn.gain.value=0;
    src.connect(f);f.connect(gn);gn.connect(Sfx._master||ctx.destination);src.start();st.loop={src:src,gain:gn}}
   st.loop.gain.gain.value=.022*g;
   if(g>.02){st.slap+=dt;st.creak+=dt;
    if(st.slap>=10/12){st.slap-=10/12;Sfx.noise(.12,700,1.2,.03*g,'lowpass',260)}
    if(st.creak>=5){st.creak-=5;Sfx.tone(160+Math.random()*25,.34,'sawtooth',.008*g,118);setTimeout(function(){Sfx.tone(128,.22,'triangle',.006*g,100)},180)}}
  }catch(e){}
 }
 function dispose(){if(st.loop){try{st.loop.src.stop()}catch(e){}st.loop=null}st.wheel=null}
 return {bind:bind,update:update,dispose:dispose,wheel:function(){return st.wheel?where():null}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmMill;
