/* Classic pixels (look pass 2, 2026-09-26). Owner: "the overall feel is a little bit too polished". Part of that polish
 * is the renderer itself: every edge anti-aliased at full screen resolution. The 2004 client drew its world into a
 * fixed 765 x 503 window, one hard pixel per pixel. This option draws the 3D view into an off-screen target about
 * that size (the screen height divided by a whole number, so every classic pixel is the same size), with no
 * anti-aliasing (a plain render target has none), and scales it up with nearest filtering: hard, stepped edges.
 * The UI, chat, minimap and 2D overlays stay sharp (they are drawn on their own layers). Picking, raycasts and the
 * camera are untouched (same canvas, same camera).
 * The blit maps every pixel to a fixed ~64-colour palette (no dither): the limited-palette finish of the owner-approved
 * login art (tools/process_login_art_v4.py: downsample + one shared 64-colour palette + hard edges). The palette is
 * a median cut of the island in look v2 (tools/build_classic_palette.py -> assets/textures/oldschool/classic_palette.json,
 * pure black kept for the void); ?classicPalette=0 turns the palette step off, ?classicPalette=<n> keeps its first n.
 * Off by default. Settings -> "Classic pixels" (remembered in localStorage), ?classic=1 / ?classic=0 for one session,
 * GameConfig.classicPixels the default. Draw calls stay honest: renderer.info counts the world pass plus the one blit. */
var ClassicPixels=(function(){
 'use strict';
 var KEY='cr_classic_pixels',TARGET_H=503;
 var qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams('');
 var forced=qs.has('classic')?qs.get('classic')!=='0':null;
 function stored(){try{var v=localStorage.getItem(KEY);return v===null?null:v==='1'}catch(e){return null}}
 var on=forced!==null?forced:stored()!==null?stored():(typeof GameConfig!=='undefined'&&GameConfig.classicPixels===true);
 var PALETTE_URL='assets/textures/oldschool/classic_palette.json',MAXP=128;
 var palWanted=qs.has('classicPalette')?Math.max(0,Math.min(MAXP,parseInt(qs.get('classicPalette'),10)||0)):MAXP;
 var rt=null,blit=null,size={w:0,h:0,f:0},frames=0,buf=null,palette=null,palLoading=false,suspended=false;
 // the palette (fetched once, the first time the option draws)
 function loadPalette(){
  if(palLoading||palette||!palWanted||typeof fetch!=='function')return;palLoading=true;
  fetch(PALETTE_URL).then(function(r){return r.ok?r.json():null}).then(function(j){
   if(!j||!Array.isArray(j.colors))return;palette=j.colors.slice(0,Math.min(palWanted,MAXP));applyPalette()}).catch(function(){});
 }
 function applyPalette(){
  if(!blit||!palette)return;var u=blit.quad.material.uniforms;
  for(var i=0;i<MAXP;i++){var c=palette[i]||[0,0,0];u.pal.value[i].set(c[0]/255,c[1]/255,c[2]/255)}
  u.palN.value=suspended?0:palette.length;
 }
 // review captures (tools/capture_holm_look.js class masks) read exact colours: the palette step pauses meanwhile
 function suspendPalette(v){suspended=!!v;if(blit)blit.quad.material.uniforms.palN.value=suspended||!palette?0:palette.length}
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
   var pal=[];for(var i=0;i<MAXP;i++)pal.push(new THREE.Vector3());
   var mat=new THREE.ShaderMaterial({uniforms:{tDiffuse:{value:rt.texture},pal:{value:pal},palN:{value:0}},depthTest:false,depthWrite:false,
    vertexShader:['varying vec2 vUv;','void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'].join('\n'),
    // nearest palette colour (weighted RGB), no dither: flat bands like a 64-colour sprite
    fragmentShader:['#define MAXP '+MAXP,'uniform sampler2D tDiffuse;','uniform vec3 pal[MAXP];','uniform int palN;','varying vec2 vUv;',
     'void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;',
     ' if (palN > 0) { float best = 1e9; vec3 pick = c;',
     '  for (int i = 0; i < MAXP; i++) { if (i >= palN) break; vec3 d = pal[i] - c; float e = dot(d * d, vec3(2.0, 4.0, 3.0)); if (e < best) { best = e; pick = pal[i]; } }',
     '  c = pick; }',' gl_FragColor = vec4(c, 1.0); }'].join('\n')});
   var quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);quad.frustumCulled=false;
   var sc=new THREE.Scene();sc.add(quad);
   blit={scene:sc,camera:new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad:quad};
   loadPalette();applyPalette();
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
 function snapshot(){return {enabled:on,forced:forced,internal:[size.w,size.h],factor:size.f,target:TARGET_H,frames:frames,palette:palette?palette.length:0}}
 if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('load',refreshButton);
 return {enabled:enabled,render:render,set:set,toggle:toggle,suspendPalette:suspendPalette,snapshot:snapshot,factorFor:factorFor,dispose:dispose,TARGET_H:TARGET_H};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClassicPixels;
