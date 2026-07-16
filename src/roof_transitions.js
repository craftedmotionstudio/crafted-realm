/* ================= ROOF TRANSITIONS =================
 * One shared presentation layer for every legacy and World V2 roof owner.
 * Visibility authorities request a state; this module performs a short,
 * reversible ease instead of snapping Object3D.visible on and off.
 */
var RoofTransitions=(function(){
  'use strict';
  var DURATION=0.22;
  var states=new Set();
  var byRoot=new WeakMap();

  function materialState(root){
    var originals=[];
    var cloneMap=new Map();
    root.traverse(function(o){
      if(!o.isMesh||!o.material) return;
      var list=Array.isArray(o.material)?o.material:[o.material];
      var owned=list.map(function(source){
        if(!source) return source;
        var clone=cloneMap.get(source);
        if(!clone){
          clone=source.clone();
          cloneMap.set(source,clone);
          originals.push({material:clone,opacity:source.opacity===undefined?1:source.opacity,
            transparent:!!source.transparent,depthWrite:source.depthWrite!==false});
        }
        return clone;
      });
      o.material=Array.isArray(o.material)?owned:owned[0];
    });
    return originals;
  }

  function stateFor(root){
    var state=byRoot.get(root);
    if(state) return state;
    var shown=root.visible!==false;
    state={root:root,value:shown?1:0,target:shown?1:0,materials:materialState(root)};
    byRoot.set(root,state); states.add(state);
    return state;
  }

  function eased(t){ return t*t*(3-2*t); }
  function paint(state){
    var alpha=eased(Math.max(0,Math.min(1,state.value)));
    state.materials.forEach(function(entry){
      var transitioning=alpha>0.001&&alpha<0.999;
      entry.material.opacity=entry.opacity*alpha;
      entry.material.transparent=transitioning||alpha<0.999||entry.transparent;
      entry.material.depthWrite=transitioning?false:entry.depthWrite;
      entry.material.needsUpdate=true;
    });
    state.root.visible=alpha>0.001;
  }

  function set(root,visible,immediate){
    if(!root) return;
    var state=stateFor(root),target=visible?1:0;
    // Frame arbitration: two authorities write the same roof each frame (the
    // near-building proximity rule, then the interior-bounds rule). A hide
    // request holds until the next update() so a later "show" from the other
    // authority cannot keep an occluding roof opaque over the camera.
    if(target>0&&state.hideHold) return;
    if(target===0) state.hideHold=true;
    state.target=target;
    if(target>0&&state.root.visible===false) state.root.visible=true;
    if(immediate){ state.value=target; paint(state); }
  }

  function update(dt){
    var step=Math.max(0,Math.min(.08,dt||0))/DURATION;
    states.forEach(function(state){
      state.hideHold=false;
      if(Math.abs(state.target-state.value)>0.0001){
        state.value+=Math.sign(state.target-state.value)*Math.min(step,Math.abs(state.target-state.value));
        paint(state);
      }
    });
  }

  function status(root){
    var state=byRoot.get(root);
    return state?{value:state.value,target:state.target,visible:root.visible}:null;
  }
  return {set:set,update:update,status:status,duration:DURATION};
})();
