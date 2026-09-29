/* Holm creatures viewer (owner request 2026-09-29): every creature built by tools/blender/build_holm_creatures_v1.py,
 * loaded exactly the way the game loads it (NPC_TYPES from src/game1_data.js -> charNpcModel in src/npc_chars.js, three
 * r128, scaled to its glbHeight) and played through its clips: a turntable, then idle / walk / attack / hit / block /
 * death on demand. QA hooks (tools/qa_holm_creatures.js): CreatureView.ready(), .report(), .pose(clip, t) (every creature
 * frozen at time t of a clip), .shot(w, h) (a PNG data URL of the current view), .solo(id), .yaw(rad).
 * Open: http://127.0.0.1:<port>/tools/holm_creatures_view.html */
(function(){
 'use strict';
 var TYPES=[['large_rat','Large rat'],['burrowrat','Rat'],['gnarlgob','Goblin'],['pasturehen','Chicken'],['moorcalf','Cow']];
 var CLIPS=['idle','walk','attack','hit','block','death'];
 var W=innerWidth,H=innerHeight;
 var renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(W,H);
 renderer.outputEncoding=THREE.LinearEncoding;renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
 var scene=new THREE.Scene();scene.background=new THREE.Color(0x6f8a5a);
 var cam=new THREE.PerspectiveCamera(32,W/H,.05,200);
 scene.add(new THREE.HemisphereLight(0xfff4dc,0x40503a,.75));
 var sun=new THREE.DirectionalLight(0xfff0d8,.85);sun.position.set(-4,8,-5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 ['left','bottom'].forEach(function(k){sun.shadow.camera[k]=-8});['right','top'].forEach(function(k){sun.shadow.camera[k]=8});scene.add(sun);
 var ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshLambertMaterial({color:0x5d7a45}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 // the camera looks at the creatures' faces (they face +Z, like three.js lookAt); one-tile grid, so sizes read against the 1 m tiles of the game
 var grid=new THREE.GridHelper(40,40,0x4a6236,0x4a6236);grid.position.y=.002;scene.add(grid);
 var st={items:[],clip:'idle',spin:true,yaw:0,freeze:null,solo:null,t0:performance.now()};
 var SPACING=2.2;
 TYPES.forEach(function(p,i){
  var t=NPC_TYPES[p[0]];if(!t||!t.glbChar){console.warn('[CreatureView] no glbChar on',p[0]);return}
  var g=charNpcModel(t);g.position.set((i-(TYPES.length-1)/2)*SPACING,0,0);scene.add(g);
  var tag=document.createElement('div');tag.className='tag';tag.textContent=t.name+' (level-'+t.level+')';document.body.appendChild(tag);
  st.items.push({id:p[0],label:p[1],t:t,g:g,tag:tag});
 });
 function gm(it){return it.g.userData.gmix}
 function ready(){return st.items.length>0&&st.items.every(function(it){return !!gm(it)})}
 // play a clip on every creature the way the game does: loops blend idle/walk by weight, one-shots play once (death holds)
 function setClip(name){
  st.clip=name;st.t0=performance.now();
  st.items.forEach(function(it){var m=gm(it);if(!m)return;
   ['attack','block','hit','death'].forEach(function(k){if(m[k])m[k].stop()});
   if(m.idle){m.idle.play();m.idle.weight=name==='walk'?0:1}if(m.walk){m.walk.play();m.walk.weight=name==='walk'?1:0}
   if(name!=='idle'&&name!=='walk'&&m[name]){if(m.idle)m.idle.weight=0;var a=m[name];a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.weight=1;a.play()}
  });
  paintBar();
 }
 // every creature frozen at time t (seconds) of a clip, for the frame strips
 function pose(name,t){st.freeze={clip:name,t:t};st.items.forEach(function(it){var m=gm(it);if(!m)return;
  ['idle','walk','attack','block','hit','death'].forEach(function(k){if(m[k]){m[k].stop();m[k].weight=0}});
  var a=m[name];if(!a)return;a.reset();a.setLoop(name==='idle'||name==='walk'?THREE.LoopRepeat:THREE.LoopOnce,Infinity);a.clampWhenFinished=true;a.weight=1;a.play();
  var d=a.getClip().duration;m.mixer.setTime(Math.min(t,d-1e-4))});render()}
 function report(){return st.items.map(function(it){var m=gm(it),clips={};CLIPS.forEach(function(c){var a=m&&m[c];clips[c]=a?+a.getClip().duration.toFixed(3):null});
  var box=new THREE.Box3().setFromObject(it.g),sz=box.getSize(new THREE.Vector3());
  return {id:it.id,name:it.t.name,level:it.t.level,glb:it.t.glbChar,glbHeight:it.t.glbHeight,loaded:!!m,clips:clips,size:[+sz.x.toFixed(2),+sz.y.toFixed(2),+sz.z.toFixed(2)],
   minY:+box.min.y.toFixed(3),tris:(function(){var n=0;it.g.traverse(function(o){if(o.isMesh&&o.geometry)n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3});return n})()}})}
 function frame(){
  var n=st.solo?st.items.filter(function(it){return it.id===st.solo}):st.items;
  st.items.forEach(function(it){it.g.visible=!st.solo||it.id===st.solo;it.tag.style.display=it.g.visible?'block':'none'});
  if(st.solo&&n[0]){var s=n[0],h=Math.max(.5,s.t.glbHeight||1),r=Math.max(2.2,h*2.6);var c=s.g.position;
   cam.position.set(c.x+Math.sin(st.yaw)*r,h*.95+r*.28,c.z+Math.cos(st.yaw)*r);cam.lookAt(c.x,h*.42,c.z)}
  else{var r2=9.5;cam.position.set(Math.sin(st.yaw)*r2*.35,3.4,r2);cam.lookAt(0,.5,0)}
 }
 function render(){frame();renderer.render(scene,cam);
  st.items.forEach(function(it){var p=it.g.position.clone();p.y=(it.t.glbHeight||1)+.25;p.project(cam);it.tag.style.left=((p.x+1)/2*W)+'px';it.tag.style.top=((1-p.y)/2*H)+'px'})}
 var last=performance.now();
 function loop(now){var dt=Math.min(.05,(now-last)/1000);last=now;
  if(!st.freeze){if(st.spin)st.yaw+=dt*.35;st.items.forEach(function(it){var m=gm(it);if(m)m.mixer.update(dt)});
   // one-shots replay every 2.5 s so each can be watched again
   if(st.clip!=='idle'&&st.clip!=='walk'&&now-st.t0>2500)setClip(st.clip)}
  render();requestAnimationFrame(loop)}
 function paintBar(){var bar=document.getElementById('bar');bar.innerHTML='';
  CLIPS.forEach(function(c){var b=document.createElement('button');b.textContent=c;if(c===st.clip)b.className='on';b.onclick=function(){st.freeze=null;setClip(c)};bar.appendChild(b)});
  var sp=document.createElement('button');sp.textContent=st.spin?'turntable: on':'turntable: off';sp.onclick=function(){st.spin=!st.spin;paintBar()};bar.appendChild(sp);
  var all=document.createElement('button');all.textContent='all';if(!st.solo)all.className='on';all.onclick=function(){st.solo=null;paintBar()};bar.appendChild(all);
  st.items.forEach(function(it){var b=document.createElement('button');b.textContent=it.label;if(st.solo===it.id)b.className='on';b.onclick=function(){st.solo=it.id;paintBar()};bar.appendChild(b)})}
 (function wait(){if(ready()){document.getElementById('hud').textContent='Holm creatures: '+st.items.map(function(it){return it.t.name}).join(', ')+' - Blender, our own designs (tools/blender/build_holm_creatures_v1.py)';setClip('idle')}else setTimeout(wait,200)})();
 paintBar();requestAnimationFrame(loop);
 addEventListener('resize',function(){W=innerWidth;H=innerHeight;renderer.setSize(W,H);cam.aspect=W/H;cam.updateProjectionMatrix()});
 // evidence sheets drawn from the live renderer: tiles of the current (solo) view, copied into a 2D canvas
 function tiles(cells,cols,tw,th,label){
  var rows=Math.ceil(cells.length/cols),c=document.createElement('canvas');c.width=cols*tw;c.height=rows*th+(label?22:0);var x=c.getContext('2d');
  x.fillStyle='#2a2622';x.fillRect(0,0,c.width,c.height);var sw=renderer.domElement.width,sh=renderer.domElement.height,side=Math.min(sw,sh);
  cells.forEach(function(fn,i){fn();render();var r=Math.floor(i/cols),k=i%cols;x.drawImage(renderer.domElement,(sw-side)/2,(sh-side)/2,side,side,k*tw,(label?22:0)+r*th,tw,th)});
  if(label){x.fillStyle='#efe3c4';x.font='bold 14px Verdana';x.fillText(label,6,16)}
  return c.toDataURL('image/png')}
 /** a frame strip of one creature's clip: n frames evenly over it (a one-shot ends on its last frame) */
 function strip(id,clip,n,tw,yaw){n=n||6;tw=tw||200;var it=st.items.filter(function(q){return q.id===id})[0],m=it&&gm(it);if(!m||!m[clip])return null;
  var d=m[clip].getClip().duration,loop=clip==='idle'||clip==='walk';st.solo=id;st.spin=false;st.yaw=yaw==null?.6:yaw;
  var cells=[];for(var i=0;i<n;i++)(function(t){cells.push(function(){pose(clip,t)})})(loop?d*i/n:d*i/(n-1));
  var url=tiles(cells,n,tw,tw,it.t.name+' - '+clip+' ('+n+' frames over '+d.toFixed(2)+' s)');st.freeze=null;return url}
 /** the contact sheet: every creature (rows) at the idle's first frame from several angles (columns) */
 function sheet(yaws,tw){yaws=yaws||[0,.8,1.57,2.4,3.14,-1.57];tw=tw||200;var cells=[];
  st.items.forEach(function(it){yaws.forEach(function(y){cells.push(function(){st.solo=it.id;st.spin=false;st.yaw=y;pose('idle',0)})})});
  var url=tiles(cells,yaws.length,tw,tw,'Holm creatures v1: '+st.items.map(function(it){return it.t.name}).join(', ')+' (three r128, the game\'s loader)');st.freeze=null;st.solo=null;return url}
 window.CreatureView={ready:ready,report:report,setClip:setClip,pose:pose,clips:CLIPS,types:TYPES,strip:strip,sheet:sheet,
  unfreeze:function(){st.freeze=null},solo:function(id){st.solo=id||null;paintBar();render()},yaw:function(r){st.spin=false;st.yaw=r;render()},
  shot:function(){render();return renderer.domElement.toDataURL('image/png')}};
})();
