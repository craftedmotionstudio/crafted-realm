/* Classic pixels (look pass 2, 2026-09-26). Owner: "the overall feel is a little bit too polished". Part of that polish
 * is the renderer itself: every edge anti-aliased at full screen resolution. The 2004 client drew its world into a
 * fixed 765 x 503 window, one hard pixel per pixel. This option draws the 3D view into an off-screen target about
 * that size (the screen height divided by a whole number, so every classic pixel is the same size), with no
 * anti-aliasing (a plain render target has none), and scales it up with nearest filtering: hard, stepped edges.
 * The UI, chat, minimap and 2D overlays stay sharp (they are drawn on their own layers). Picking, raycasts and the
 * camera are untouched (same canvas, same camera).
 * Off by default. Settings -> "Classic pixels" (remembered in localStorage), ?classic=1 / ?classic=0 for one session,
 * GameConfig.classicPixels the default. Draw calls stay honest: renderer.info counts the world pass plus the one blit. */
var ClassicPixels=(function(){
 'use strict';
 var KEY='cr_classic_pixels',TARGET_H=503;
 var qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams('');
 var forced=qs.has('classic')?qs.get('classic')!=='0':null;
 function stored(){try{var v=localStorage.getItem(KEY);return v===null?null:v==='1'}catch(e){return null}}
 var on=forced!==null?forced:stored()!==null?stored():(typeof GameConfig!=='undefined'&&GameConfig.classicPixels===true);
 var rt=null,blit=null,size={w:0,h:0,f:0},frames=0,buf=null;
 function enabled(){return on}
 // whole-number scale: ~503 lines on any screen (900 px -> 2 -> 450 lines, 1440 -> 3 -> 480, 2160 -> 4 -> 540)
 function factorFor(h){return Math.max(2,Math.round(h/TARGET_H))}
 function ensure(renderer){
  if(!buf)buf=new THREE.Vector2();renderer.getDrawingBufferSize(buf);
  var f=factorFor(buf.y),w=Math.max(1,Math.round(buf.x/f)),h=Math.max(1,Math.round(buf.y/f));
  if(rt&&size.w===w&&size.h===h)return;
  size={w:w,h:h,f:f};
  if(!rt){
   rt=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,format:THREE.RGBAFormat,depthBuffer:true,stencilBuffer:true});
   rt.texture.generateMipmaps=false;rt.texture.name='classic-pixels';
   var mat=new THREE.MeshBasicMaterial({map:rt.texture,depthTest:false,depthWrite:false,fog:false});mat.toneMapped=false;
   var quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);quad.frustumCulled=false;
   var sc=new THREE.Scene();sc.add(quad);
   blit={scene:sc,camera:new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad:quad};
  }else rt.setSize(w,h);
 }
 // called by the game loop instead of renderer.render(scene, camera); false = draw normally
 function render(renderer,scene,camera){
  if(!on||!renderer||typeof THREE==='undefined')return false;
  ensure(renderer);
  var info=renderer.info,auto=info.autoReset,prev=renderer.getRenderTarget();
  info.reset();info.autoReset=false;
  try{
   renderer.setRenderTarget(rt);renderer.render(scene,camera);
   renderer.setRenderTarget(prev);renderer.render(blit.scene,blit.camera);
  }finally{info.autoReset=auto}
  frames++;return true;
 }
 function dispose(){if(rt){rt.dispose();rt=null}if(blit){blit.quad.geometry.dispose();blit.quad.material.dispose();blit=null}size={w:0,h:0,f:0}}
 function refreshButton(){if(typeof document==='undefined')return;var b=document.getElementById('classic-btn');if(b)b.textContent=on?'On':'Off'}
 function set(v){on=!!v;try{localStorage.setItem(KEY,on?'1':'0')}catch(e){}if(!on)dispose();refreshButton();
  if(typeof UI!=='undefined'&&UI.chat)try{UI.chat('Classic pixels '+(on?'on: the world is drawn at 2004 size with hard pixel edges.':'off.'),'sys')}catch(e){}
  return on}
 function toggle(){return set(!on)}
 function snapshot(){return {enabled:on,forced:forced,internal:[size.w,size.h],factor:size.f,target:TARGET_H,frames:frames}}
 if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('load',refreshButton);
 return {enabled:enabled,render:render,set:set,toggle:toggle,snapshot:snapshot,factorFor:factorFor,dispose:dispose,TARGET_H:TARGET_H};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClassicPixels;
