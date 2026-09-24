/* ================= PERF PROBE (read-only development telemetry) =================
 * Numbers for the Tutor's Holm performance baseline (goal P2-C): what the renderer
 * draws from the current camera, grouped by world object, and a real-frame sample.
 * Like CRDebugStats it exposes numbers, never engine objects. Used by
 * tools/audit_holm_perf.js (headless) and by hand in the browser pane.
 *   CRPerfProbe.renderStats()   -> {calls,triangles,programs,geometries,textures} for one render
 *   CRPerfProbe.inventory()     -> per-group {meshes,tris,materials,inView,inViewTris}
 *   CRPerfProbe.sample(seconds) -> Promise {fps,worstMs,p95Ms,hidden} from rAF timings
 */
var CRPerfProbe=(function(){
  'use strict';
  function triCount(g){
    if(!g) return 0;
    if(g.index) return g.index.count/3;
    var pos=g.attributes&&g.attributes.position;
    return pos?pos.count/3:0;
  }
  /* group a mesh by the world object (or terrain/water/player) it belongs to */
  function groupOf(o){
    for(var p=o;p;p=p.parent){
      var n=p.name||'';
      if(n.indexOf('world-object-')===0) return n.slice('world-object-'.length);
      if(n.indexOf('ground-chunk-')===0) return 'terrain';
      if(typeof WORLD!=='undefined'&&WORLD.sea&&p===WORLD.sea) return 'water';
      if(typeof player!=='undefined'&&p===player) return 'player';
      if(p.parent===scene&&n) return n.replace(/[-_]\d+$/,'');
    }
    return 'other';
  }
  function visibleUp(o){ for(var p=o;p;p=p.parent) if(!p.visible) return false; return true; }
  function inventory(){
    if(typeof scene==='undefined'||typeof camera==='undefined') return null;
    camera.updateMatrixWorld();
    var frustum=new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    var groups={};
    scene.traverse(function(o){
      if(!o.isMesh||!visibleUp(o)) return;
      var key=groupOf(o), e=groups[key]||(groups[key]={meshes:0,tris:0,materials:{},inView:0,inViewTris:0});
      var t=triCount(o.geometry);
      e.meshes++; e.tris+=t;
      (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){ if(m) e.materials[m.uuid]=1; });
      if(o.geometry){
        if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if(o.geometry.boundingSphere){
          var s=o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld);
          if(frustum.intersectsSphere(s)){ e.inView++; e.inViewTris+=t; }
        }
      }
    });
    var out={};
    Object.keys(groups).sort().forEach(function(k){
      var e=groups[k];
      out[k]={meshes:e.meshes,tris:Math.round(e.tris),materials:Object.keys(e.materials).length,inView:e.inView,inViewTris:Math.round(e.inViewTris)};
    });
    return out;
  }
  function renderStats(){
    if(typeof renderer==='undefined'||!renderer) return null;
    renderer.render(scene,camera);
    var r=renderer.info.render, m=renderer.info.memory;
    return {calls:r.calls,triangles:r.triangles,programs:renderer.info.programs?renderer.info.programs.length:null,
      geometries:m.geometries,textures:m.textures};
  }
  function sample(seconds){
    return new Promise(function(res){
      var t0=performance.now(), last=t0, frames=0, worst=0, dts=[];
      (function frame(){
        var now=performance.now(), dt=now-last; last=now; frames++;
        if(frames>1){ dts.push(dt); if(dt>worst) worst=dt; }
        if(now-t0<seconds*1000) return requestAnimationFrame(frame);
        dts.sort(function(a,b){return a-b;});
        res({fps:Math.round(frames/((now-t0)/1000)),worstMs:+worst.toFixed(1),
          p95Ms:dts.length?+dts[Math.floor(dts.length*0.95)].toFixed(1):null,hidden:!!document.hidden});
      })();
    });
  }
  return {inventory:inventory,renderStats:renderStats,sample:sample,triCount:triCount};
})();
if(typeof globalThis!=='undefined') globalThis.CRPerfProbe=CRPerfProbe;
