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
 * GameConfig.classicPixels the default. Draw calls stay honest: renderer.info counts the world pass plus the one blit.
 * Look v4 options (2026-09-28, src/holm_look_v4.js) configure it for their session through configure(): the rendered
 * lines follow the 2004 pixel density per degree of the camera's vertical view (2004: 334 lines over 36.13 deg = 9.24 per
 * degree), with a floor of whole lines on small windows, and the blit can map colours into the 2004 client's 16-bit
 * colour space (64 hues x 8 saturations x 128 lightnesses, no dither) instead of the fixed palette. */
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
 // a look option's settings for this session (configure()); null = the Settings option as before
 var look=null;
 var MODE={fixed:0,hsl2004:1,none:2};
 function mode(){return look?MODE[look.palette]!==undefined?MODE[look.palette]:MODE.none:MODE.fixed}
 // the palette (fetched once, the first time the option draws)
 function loadPalette(){
  if(palLoading||palette||!palWanted||typeof fetch!=='function')return;palLoading=true;
  fetch(PALETTE_URL).then(function(r){return r.ok?r.json():null}).then(function(j){
   if(!j||!Array.isArray(j.colors))return;palette=j.colors.slice(0,Math.min(palWanted,MAXP));applyPalette()}).catch(function(){});
 }
 function applyPalette(){
  if(!blit)return;var u=blit.quad.material.uniforms;
  if(palette)for(var i=0;i<MAXP;i++){var c=palette[i]||[0,0,0];u.pal.value[i].set(c[0]/255,c[1]/255,c[2]/255)}
  u.palN.value=suspended||!palette?0:palette.length;u.mode.value=suspended?MODE.none:mode();
 }
 // review captures (tools/capture_holm_look.js class masks) read exact colours: the palette step pauses meanwhile
 function suspendPalette(v){suspended=!!v;applyPalette()}
 function enabled(){return on}
 // whole-number scale: ~503 lines on any screen (900 px -> 2 -> 450 lines, 1440 -> 3 -> 480, 2160 -> 4 -> 540)
 // look v4: lines = density x the camera's vertical view (2004 density: 334 lines at 36.13 deg; a phone held upright sees
 // up to 55 deg and keeps the same density), never fewer than the floor (a small window keeps its detail readable)
 function factorFor(h,vfov){
  if(!look)return Math.max(2,Math.round(h/TARGET_H));
  var lines=look.linesPerDeg*(vfov>0?vfov:36.13),f=Math.max(1,Math.round(h/lines));
  while(f>1&&h/f<look.minLines)f--;
  return f;
 }
 function ensure(renderer,camera){
  if(!buf)buf=new THREE.Vector2();renderer.getDrawingBufferSize(buf);
  var f=factorFor(buf.y,camera&&camera.fov),w=Math.max(1,Math.round(buf.x/f)),h=Math.max(1,Math.round(buf.y/f));
  if(rt&&size.w===w&&size.h===h)return;
  size={w:w,h:h,f:f};
  if(!rt){
   rt=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,format:THREE.RGBAFormat,depthBuffer:true,stencilBuffer:true});
   rt.texture.generateMipmaps=false;rt.texture.name='classic-pixels';
   var pal=[];for(var i=0;i<MAXP;i++)pal.push(new THREE.Vector3());
   var mat=new THREE.ShaderMaterial({uniforms:{tDiffuse:{value:rt.texture},pal:{value:pal},palN:{value:0},mode:{value:mode()}},depthTest:false,depthWrite:false,
    vertexShader:['varying vec2 vUv;','void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'].join('\n'),
    // mode 0: nearest palette colour (weighted RGB), no dither: flat bands like a 64-colour sprite;
    // mode 1: the 2004 client's colour space: hue to 64 steps, saturation to 8, lightness to 128 (bands in every gradient)
    fragmentShader:['#define MAXP '+MAXP,'uniform sampler2D tDiffuse;','uniform vec3 pal[MAXP];','uniform int palN;','uniform int mode;','varying vec2 vUv;',
     'vec3 rgb2hsl(vec3 c){ float mx = max(max(c.r, c.g), c.b), mn = min(min(c.r, c.g), c.b), l = (mx + mn) * 0.5, d = mx - mn, h = 0.0, s = 0.0;',
     ' if (d > 1e-5) { s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);',
     '  if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0); else if (mx == c.g) h = (c.b - c.r) / d + 2.0; else h = (c.r - c.g) / d + 4.0; h /= 6.0; }',
     ' return vec3(h, s, l); }',
     'float hue2rgb(float p, float q, float t){ t = fract(t); if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t; if (t < 0.5) return q; if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0; return p; }',
     'vec3 hsl2rgb(vec3 c){ if (c.y <= 0.0) return vec3(c.z); float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y, p = 2.0 * c.z - q;',
     ' return vec3(hue2rgb(p, q, c.x + 1.0 / 3.0), hue2rgb(p, q, c.x), hue2rgb(p, q, c.x - 1.0 / 3.0)); }',
     'void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;',
     ' if (mode == 1) { vec3 q = rgb2hsl(c); q.x = floor(q.x * 64.0 + 0.5) / 64.0; q.y = floor(q.y * 7.0 + 0.5) / 7.0; q.z = floor(q.z * 127.0 + 0.5) / 127.0; c = hsl2rgb(q); }',
     ' else if (mode == 0 && palN > 0) { float best = 1e9; vec3 pick = c;',
     '  for (int i = 0; i < MAXP; i++) { if (i >= palN) break; vec3 d = pal[i] - c; float e = dot(d * d, vec3(2.0, 4.0, 3.0)); if (e < best) { best = e; pick = pal[i]; } }',
     '  c = pick; }',' gl_FragColor = vec4(c, 1.0); }'].join('\n')});
   var quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);quad.frustumCulled=false;
   var sc=new THREE.Scene();sc.add(quad);
   blit={scene:sc,camera:new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad:quad};
   if(mode()===MODE.fixed)loadPalette();applyPalette();
  }else rt.setSize(w,h);
 }
 // called by the game loop instead of renderer.render(scene, camera); false = draw normally
 function render(renderer,scene,camera){
  if(!on||!renderer||typeof THREE==='undefined')return false;
  ensure(renderer,camera);
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
 /* look v4 (src/holm_look_v4.js): this session draws the world at a pixel density and colour mode of the option's own,
  * without touching the remembered Settings choice. o = {linesPerDeg, minLines, palette: 'hsl2004' | 'fixed' | 'none'};
  * null = back to the Settings option. */
 function configure(o){
  look=o?{linesPerDeg:+o.linesPerDeg||TARGET_H/36.13,minLines:+o.minLines||300,palette:o.palette||'none'}:null;
  if(look){on=true;if(look.palette==='fixed')loadPalette()}else on=forced!==null?forced:stored()!==null?stored():(typeof GameConfig!=='undefined'&&GameConfig.classicPixels===true);
  if(rt)size={w:-1,h:-1,f:0};applyPalette();refreshButton();return on;
 }
 function snapshot(){return {enabled:on,forced:forced,internal:[size.w,size.h],factor:size.f,target:look?Math.round(look.linesPerDeg*36.13):TARGET_H,frames:frames,
  palette:look?look.palette:palette?palette.length:0,look:look?{linesPerDeg:look.linesPerDeg,minLines:look.minLines,palette:look.palette}:null}}
 if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('load',refreshButton);
 return {enabled:enabled,render:render,set:set,toggle:toggle,configure:configure,suspendPalette:suspendPalette,snapshot:snapshot,factorFor:factorFor,dispose:dispose,TARGET_H:TARGET_H};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ClassicPixels;
