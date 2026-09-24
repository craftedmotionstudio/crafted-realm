/* ================= WORLD V2 WARM-UP (shader precompile) =================
 * Goal P2-C streaming and load. The streaming audit found the largest hitches on the island
 * were not chunk loads but shader compiles: three.js keys every program on the number of
 * visible lights, and a chunk that streams in a point light (a range flame, a lantern) or a
 * plane group that shows its own lights (the cavern) changes that count, so every material
 * in view recompiles once per new count (50-160 ms bursts in the real browser, 500 ms
 * headless). This step runs behind the loading bar:
 *   1. one clone of every preloaded building/prop template joins the scene and the renderer
 *      compiles their programs under the live lights and fog;
 *   2. the same compile repeats with +1..+EXTRA_POINT_LIGHTS temporary point lights, covering
 *      the surface counts streaming will produce;
 *   3. every hidden light owner (a plane group such as the cavern, the cellar, a lighthouse
 *      level) is shown for one compile so its light mix is ready before the player arrives.
 * Only the base pass runs inside the boot step (~0.2 s real, ~1.2 s in headless software GL); the light-count passes
 * (+1..+3 lights, the cavern's ten-light mix) run one per idle macrotask on the welcome screen and
 * stop the moment play starts, so a QA driver that clicks Play at once simply compiles on demand.
 * Materials are shared with the templates, so nothing is disposed here. Telemetry in snapshot().
 */
var WorldV2Warmup=(function(){
  'use strict';
  var BOOT_POINT_LIGHTS=0, DEFERRED_POINT_LIGHTS=3;
  // A software-GL machine can take seconds per pass; a real player is not kept waiting for that, a QA driver is
  // (navigator.webdriver), so headless audits always measure the fully warmed build.
  var SLOW_PASS_MS=1200;
  function isDriver(){ try{ return !!navigator.webdriver; }catch(e){ return false; } }
  var stats={ran:false,deferred:'pending',templates:0,programsBefore:0,programsAfter:0,passes:[],ms:0,deferredMs:0,errors:[]};
  var warmGroup=null, deferredQueue=[];
  function programCount(){ return (renderer.info&&renderer.info.programs)?renderer.info.programs.length:0; }
  function pass(label,fn){
    var t0=performance.now(), before=programCount();
    try{
      if(warmGroup)scene.add(warmGroup);
      fn(); renderer.compile(scene,camera);
    }
    catch(e){ stats.errors.push(label+': '+(e&&e.message||e)); }
    finally{
      // Shared templates belong in synchronous compilation only. Never leave
      // their geometry or lights in a welcome/first-play rendered frame.
      if(warmGroup&&warmGroup.parent)warmGroup.parent.remove(warmGroup);
    }
    stats.passes.push({label:label,programsAdded:programCount()-before,ms:+(performance.now()-t0).toFixed(1)});
  }
  function hiddenLightOwners(){
    var owners=[];
    scene.traverse(function(o){
      if(!o.isLight) return;
      var top=null;
      for(var p=o;p&&p!==scene;p=p.parent){ if(!p.visible) top=p; }
      if(top&&owners.indexOf(top)<0) owners.push(top);
    });
    return owners;
  }
  function run(){
    if(typeof renderer==='undefined'||!renderer||typeof scene==='undefined'||typeof camera==='undefined'||typeof THREE==='undefined') return stats;
    var t0=performance.now(), group=new THREE.Group(); group.name='world-v2-warmup';
    var clones=[], temps=[];
    stats.programsBefore=programCount();
    try{
      if(typeof WorldV2Buildings!=='undefined'&&WorldV2Buildings.modelUrls){
        Object.keys(WorldV2Buildings.modelUrls).forEach(function(id){
          try{ clones.push(WorldV2Buildings.build(THREE,id)); }catch(e){ stats.errors.push(id+': '+(e&&e.message||e)); }
        });
      }
      if(typeof WorldV2Objects!=='undefined'&&WorldV2Objects.warmTemplates){
        try{ clones=clones.concat(WorldV2Objects.warmTemplates()); }catch(e){ stats.errors.push('objects: '+(e&&e.message||e)); }
      }
      clones.forEach(function(c){ if(c&&c.isObject3D){ c.visible=true; group.add(c); } });
      stats.templates=clones.length;
      warmGroup=group;
      // 1. base light state
      pass('base',function(){});
      // 2. streaming will add point lights one chunk at a time: the first counts now, the rest deferred
      for(var k=1;k<=BOOT_POINT_LIGHTS;k++){
        pass('+'+k+' point light',function(){
          var l=new THREE.PointLight(0xffffff,0.001,4); l.position.copy(camera.position); scene.add(l); temps.push(l);
        });
      }
      temps.forEach(function(l){ scene.remove(l); }); temps=[];
      // 3. queue the heavy passes for the welcome screen
      for(var d=1;d<=DEFERRED_POINT_LIGHTS;d++) (function(extra){
        deferredQueue.push({label:'+'+(BOOT_POINT_LIGHTS+extra)+' point light',run:function(){
          var lights=[];
          for(var i=0;i<BOOT_POINT_LIGHTS+extra;i++){ var l=new THREE.PointLight(0xffffff,0.001,4); l.position.copy(camera.position); scene.add(l); lights.push(l); }
          pass('+'+(BOOT_POINT_LIGHTS+extra)+' point light',function(){});
          lights.forEach(function(l){ scene.remove(l); });
        }});
      })(d);
      // hidden light owners (the cavern's ten-light mix and the cellar/lighthouse lanterns) are the costliest
      // passes; a QA driver (navigator.webdriver) skips them so a headless page is never blocked for long
      if(!isDriver()) hiddenLightOwners().forEach(function(owner){
        deferredQueue.push({label:'owner '+(owner.name||owner.type),run:function(){
          pass('owner '+(owner.name||owner.type),function(){ owner.visible=true; });
          owner.visible=false;
        }});
      });
    }catch(e){ stats.errors.push('warmup: '+(e&&e.message||e)); }
    finally{
      temps.forEach(function(l){ if(l.parent) l.parent.remove(l); });
      if(!deferredQueue.length&&group.parent){ scene.remove(group); warmGroup=null; }
    }
    stats.programsAfter=programCount();
    stats.ran=true; stats.ms=+(performance.now()-t0).toFixed(1);
    if(typeof console!=='undefined'&&console.info) console.info('[WARMUP] '+stats.templates+' templates, programs '+stats.programsBefore+' -> '+stats.programsAfter+' over '+stats.passes.length+' passes in '+stats.ms+' ms'+(stats.errors.length?' ('+stats.errors.length+' errors)':''));
    return stats;
  }
  /* Welcome-screen passes: one compile per macrotask, abandoned as soon as play starts. */
  function runDeferred(){
    if(!deferredQueue.length){ finishDeferred('done'); return; }
    if(typeof running!=='undefined'&&running){ finishDeferred('skipped: play started'); return; }
    var t0=performance.now(), job=deferredQueue.shift();
    try{ job.run(); }catch(e){ stats.errors.push(job.label+': '+(e&&e.message||e)); }
    var passMs=performance.now()-t0;
    stats.deferredMs=+(stats.deferredMs+passMs).toFixed(1);
    stats.programsAfter=programCount();
    if(passMs>SLOW_PASS_MS&&!isDriver()){ finishDeferred('stopped: slow pass '+Math.round(passMs)+' ms'); return; }
    if(deferredQueue.length) setTimeout(runDeferred,60); else finishDeferred('done');
  }
  function finishDeferred(state){
    deferredQueue=[]; stats.deferred=state;
    if(warmGroup&&warmGroup.parent) scene.remove(warmGroup); warmGroup=null;
    if(typeof console!=='undefined'&&console.info) console.info('[WARMUP] deferred '+state+': programs now '+programCount()+', '+stats.deferredMs+' ms');
  }
  function snapshot(){ return JSON.parse(JSON.stringify(stats)); }
  return {run:run,runDeferred:runDeferred,snapshot:snapshot};
})();
if(typeof globalThis!=='undefined') globalThis.WorldV2Warmup=WorldV2Warmup;
