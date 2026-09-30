/* Tutor's Holm island draft animation pass (finish goal M6.4: everything that could animate does). Blender-animated
 * props from .studio-workspaces/holm-props-v4 (build_holm_props_v4.py) plus runtime motion for the rest:
 *  - Lastlight: the lever arm is the Blender `beacon-lever` (Pull / Reset on each throw) and a `beacon-beam` sweeps from
 *    the lamp while the light is lit (the building's own static lever mesh is hidden; its click box still works);
 *  - the objective marker: the Blender `guide-marker` hovers and spins over the current objective's tile;
 *  - the fishing spot: the Blender `fishing-ripple-anim` (Ripple) replaces the still ripple;
 *  - the cavern furnace: a `furnace-glow` flickers in its mouth; the anvil throws `anvil-sparks` on every hammer blow;
 *  - (animation pass 2026-09-29) the felled oak, the skiff's departure and the anvil's timing moved to src/holm_island_anim.js
 *    (HolmIslandAnim, loaded and ticked from here): the oak falls away from the woodcutter on a Blender curve, the skiff
 *    carries the adventurer out to sea, and the sparks fly on each hammer strike (spark() below) instead of a timer.
 * Island draft only (?holmIsland=1). Fails soft: any missing piece leaves the previous look. */
var HolmIslandFx=(function(){
 'use strict';
 var URL=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/.studio-workspaces/holm-props-v4/candidates/props.glb'):'/.studio-workspaces/holm-props-v4/candidates/props.glb');
 var st={mixers:[],lever:null,beam:null,marker:null,sparks:null,anvilTop:null,beaconOn:false,anim:null};
 function clipOf(g,name){return g.animations.filter(function(c){return c.name===name})[0]}
 function piece(T,g,name){var n=g.scene.getObjectByName(name);if(!n)return null;var c=n.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);
  c.traverse(function(m){if(m.isMesh){m.castShadow=false;[].concat(m.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});return c}
 function bind(T,root,g,names){var mx=new T.AnimationMixer(root),out={};names.forEach(function(n){var c=clipOf(g,n);if(c)out[n]=mx.clipAction(c)});st.mixers.push(mx);return out}
 function once(a){if(!a)return;a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play()}
 function boxOf(T,root,re){var b=new T.Box3(),hit=false;root.traverse(function(m){if(!m.isMesh)return;for(var q=m;q;q=q.parent)if(re.test(q.name||'')){b.expandByObject(m);hit=true;break}});return hit?b:null}
 async function load(o){
  var T=o.THREE,scene=o.scene,models=o.models||{};
  var g=await new Promise(function(ok,no){new T.GLTFLoader().load(URL,ok,undefined,no)});
  // Lastlight lever + beam
  var ll=models.lastlight&&models.lastlight.scene;
  if(ll){ll.updateMatrixWorld(true);var lb=boxOf(T,ll,/^Lastlight_ServiceLever_/),bb=boxOf(T,ll,/^Lastlight_ServiceBeacon_/);
   if(lb){ll.traverse(function(m){if(!m.isMesh)return;for(var q=m;q;q=q.parent)if(/^Lastlight_ServiceLever_/.test(q.name||'')){m.material=m.material.clone();m.material.visible=false;break}});
    var lv=piece(T,g,'beacon-lever');if(lv){lv.position.set((lb.min.x+lb.max.x)/2,lb.min.y,(lb.min.z+lb.max.z)/2);scene.add(lv);st.lever={root:lv,clips:bind(T,lv,g,['Pull','Reset'])}}}
   if(bb){var bm=piece(T,g,'beacon-beam');if(bm){bm.position.copy(bb.getCenter(new T.Vector3()));bm.visible=false;bm.traverse(function(m){if(m.isMesh)[].concat(m.material).forEach(function(q){if(q){q.depthWrite=false;q.transparent=true}})});
    scene.add(bm);st.beam={root:bm,clips:bind(T,bm,g,['Sweep'])};if(st.beam.clips.Sweep)st.beam.clips.Sweep.play()}}}
  // objective marker
  var mk=piece(T,g,'guide-marker');if(mk){mk.visible=false;scene.add(mk);st.marker={root:mk,clips:bind(T,mk,g,['Hover','Spin'])};['Hover','Spin'].forEach(function(n){if(st.marker.clips[n])st.marker.clips[n].play()})}
  // fishing spot
  var spot=scene.getObjectByName('island-lesson-survival-perch');
  if(spot){var rp=piece(T,g,'fishing-ripple-anim');if(rp){spot.children.slice().forEach(function(c){if(!c.isMesh||c.geometry.type!=='BoxGeometry')spot.remove(c)});spot.add(rp);var rc=bind(T,rp,g,['Ripple']);if(rc.Ripple)rc.Ripple.play()}}
  // furnace glow + anvil sparks
  var cav=models.cavern&&models.cavern.scene;
  if(cav){cav.updateMatrixWorld(true);var fb=boxOf(T,cav,/^Cavern_ServiceFurnace_/),ab=boxOf(T,cav,/^Cavern_ServiceAnvil_/);
   if(fb){var fg=piece(T,g,'furnace-glow');if(fg){var stance=o.api&&o.api.qaStance('cavern','furnace'),c=fb.getCenter(new T.Vector3());
    var dx=stance?stance.x-c.x:0,dz=stance?stance.z-c.z:1,len=Math.hypot(dx,dz)||1;fg.position.set(c.x+dx/len*Math.min(.45,(fb.max.x-fb.min.x)/2),fb.min.y+.25,c.z+dz/len*Math.min(.45,(fb.max.z-fb.min.z)/2));
    fg.lookAt(fg.position.x+dx,fg.position.y,fg.position.z+dz);scene.add(fg);var fc=bind(T,fg,g,['Flicker']);if(fc.Flicker)fc.Flicker.play()}}
   if(ab){var sp=piece(T,g,'anvil-sparks');if(sp){var ac=ab.getCenter(new T.Vector3());sp.position.set(ac.x,ab.max.y,ac.z);scene.add(sp);st.sparks={root:sp,clips:bind(T,sp,g,['Burst'])}}}}
  // the animation pass: felled oaks, the skiff, doors, bank, rope, forge timing, grubkin deaths, farm, smoke, torches
  if(typeof HolmIslandAnim!=='undefined')try{st.anim=await HolmIslandAnim.load(o)}catch(err){console.error('[HolmIslandFx] animation pass',err)}
  // the sound pass (2026-09-29): the island's sound director (strokes on the swing, furnace and shore beds, creature voices)
  if(typeof HolmSound!=='undefined')HolmSound.start();
  return {lever:!!st.lever,beam:!!st.beam,marker:!!st.marker,sparks:!!st.sparks,anim:st.anim};
 }
 function setBeacon(on){st.beaconOn=on;if(st.lever)once(st.lever.clips[on?'Pull':'Reset']);if(st.beam)st.beam.root.visible=on}
 // one burst of anvil sparks (HolmIslandAnim calls it on each hammer strike)
 function spark(){if(!st.sparks||!st.sparks.clips.Burst)return false;once(st.sparks.clips.Burst);return true}
 function update(dt,T,scene){
  st.mixers.forEach(function(m){m.update(dt)});
  // the marker sits over the current objective (GuideArrow's target) and hides when there is none
  if(st.marker&&typeof GuideArrow!=='undefined'&&GuideArrow.drawsHintArrow)st.marker.root.visible=false;   // the hint arrow (ui_guide_arrow.js) marks the target now
  else if(st.marker){var s=typeof GuideArrow!=='undefined'&&GuideArrow._spec,c=s&&GuideArrow._center&&GuideArrow._center(s);
   if(c&&typeof HolmArrivalQA!=='undefined'){var top=s&&typeof s.y==='number',y=top?s.y:HolmArrivalQA.height(c.cx,c.cz);if(!Number.isFinite(y))y=(player&&player.position.y)||0;
    st.marker.root.visible=true;st.marker.root.position.set(c.cx,y+(top?.7:2.6),c.cz);if(GuideArrow._line)GuideArrow._line.visible=false}else st.marker.root.visible=false}
  // the animation pass (felled oaks, skiff, doors, bank, rope, forge, deaths, farm, smoke, torches)
  if(typeof HolmIslandAnim!=='undefined')HolmIslandAnim.update(dt);
  if(typeof HolmSound!=='undefined')HolmSound.update(dt);
 }
 // the ferry: the adventurer boards, the skiff casts off and pulls out to sea (HolmIslandAnim), then the crossing (cb)
 function sail(cb){if(typeof HolmIslandAnim!=='undefined'&&HolmIslandAnim.sail(cb))return;cb()}
 // the island provider is leaving (the crossing, or a reload of the world): put back what the animation pass moved
 function dispose(){if(typeof HolmIslandAnim!=='undefined')try{HolmIslandAnim.dispose()}catch(e){}
  if(typeof HolmSound!=='undefined')try{HolmSound.dispose()}catch(e){}if(typeof CozyFire!=='undefined')try{CozyFire.reset()}catch(e){}}
 return {load:load,update:update,setBeacon:setBeacon,sail:sail,spark:spark,dispose:dispose};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandFx;
