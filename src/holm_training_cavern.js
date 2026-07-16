/* ============ holm_training_cavern — the Phase-2 Training Cavern graybox ============
 * The forward-only underground leg of the Holm curriculum: descend through the
 * Mine Gatehouse (lesson descend_cavern), mine copper (mine_copper), smelt a
 * bronze bar (smelt_bronze), forge the Bronze dagger (forge_dagger), then climb
 * the far ladder up beside the Combat Hall. One way in, one way out — the gate
 * shaft only goes DOWN and the exit ladder only goes UP, so the leg cannot be
 * walked backwards.
 *
 * Built as an OPEN-TOP sunken pit (sandy floor + low rock walls, NO ceiling) at
 * the far off-map offset the flow contract reserves for 'holm_mining_cavern'.
 * The open-pit shape is the one that renders correctly under the fixed overhead
 * camera — a walled+ceilinged Planes.addCave does not (tutorial island pass 10/11).
 *
 * No new item/action ids: copper/tin rocks are makeRock resources (game5 gather
 * loop -> Tutorial.notify('gather','copper_ore')), the furnace is a makeFurnace
 * kind:'furnace' clickable (openSmelting -> smelt action -> the tutorial_holm
 * Player.addItem seam), and the anvil is a kind:'anvil' clickable (ui_smith_grid
 * -> smith action). The descend step advances through the existing tutorial_holm
 * Planes.climbTo wrapper. tutorial_holm.js is NOT touched.
 *
 * Underground background/fog/sea/ground swaps are already owned per-frame by
 * holm_survival_workyard_cellar.js for every plane<0 — this file does not
 * duplicate them.
 *
 * Lifecycle: this auxiliary negative-plane region is initialized and disposed
 * by the Tutor's Holm WorldProvider. It deliberately does not claim a
 * worldObjectId: those ids belong only to resident chunk-catalog placements.
 */
(function(global){
  'use strict';

  /* ---- LAYOUT — pure data, locked headlessly by tools/test_world_v2.js ----
   * gate/hall are the surface lesson tiles; entry/exit/targets are the flow
   * contract's cavern-station and lesson-target tiles. Do not move one side
   * without the other. */
  var LAYOUT={
    id:'holm_training_cavern',
    underground:'holm_mining_cavern',                 // stations[cavern].underground
    plane:-1,
    gate:{x:128,z:124},                               // Mine Gatehouse descent (descend_cavern)
    hall:{x:172,z:124},                               // Combat Hall arrival (forward-only surfacing)
    cavern:{x:304,z:359,hw:20,hd:8,y:-6},             // pit shell bounds (walls at ±hw/±hd)
    entry:{x:286,z:354},                              // where the gate shaft lands
    exit:{x:322,z:354},                               // where the up-only ladder stands
    oneWay:{gateHasUp:false,exitHasDown:false},       // the forward-only contract
    targets:{
      copper:{x:296,z:357,kind:'copper',item:'copper_ore'},   // mine_copper lesson tile
      furnace:{x:305,z:363,kind:'furnace'},                   // smelt_bronze lesson tile
      anvil:{x:302,z:363,kind:'anvil'}                        // forge_dagger lesson tile
    },
    extraRocks:[{x:293,z:360,kind:'copper',item:'copper_ore'},
                {x:290,z:357,kind:'tin',item:'tin_ore'}]      // bronze needs tin too
  };
  if(typeof module!=='undefined'&&module.exports){ module.exports=LAYOUT; return; }

  var OWNER='holm_training_cavern';
  var CC=LAYOUT.cavern, Y=CC.y, WALL_H=1.4, SAND=0x6b5d44, ROCK=0x4a4238;
  var runtime={provider:null,initialized:false,generation:0,group:null,floor:null,walkSurface:null,
    clickables:[],colliders:[],props:[],timers:[]};

  function ownCollider(c){ c.plane=-1; c.runtimeOwnerId=OWNER; runtime.colliders.push(c); return c; }
  function ownClickable(o){ runtime.clickables.push(o); return o; }

  function disposeTree(root,geometries,materials){
    if(!root||!root.traverse) return;
    root.traverse(function(o){
      if(o.geometry&&!geometries.has(o.geometry)){ geometries.add(o.geometry); o.geometry.dispose(); }
      var list=Array.isArray(o.material)?o.material:[o.material];
      list.forEach(function(m){ if(m&&!materials.has(m)){ materials.add(m); m.dispose(); } });
    });
  }

  function dispose(){
    try{
      runtime.generation++;
      while(runtime.timers.length) clearTimeout(runtime.timers.pop());
      var geometries=new Set(),materials=new Set();
      for(var i=0;i<runtime.props.length;i++){
        var p=runtime.props[i];
        if(p.parent) p.parent.remove(p);
        var ci=WORLD.clickables.indexOf(p); if(ci>=0) WORLD.clickables.splice(ci,1);
        var ri=WORLD.resources.indexOf(p); if(ri>=0) WORLD.resources.splice(ri,1);
      }
      for(var j=0;j<runtime.clickables.length;j++){
        var o=runtime.clickables[j];
        if(o.parent) o.parent.remove(o);
        var k=WORLD.clickables.indexOf(o); if(k>=0) WORLD.clickables.splice(k,1);
      }
      for(var m=WORLD.colliders.length-1;m>=0;m--)
        if(WORLD.colliders[m].runtimeOwnerId===OWNER) WORLD.colliders.splice(m,1);
      if(runtime.walkSurface){
        if(runtime.walkSurface.parent) runtime.walkSurface.parent.remove(runtime.walkSurface);
        var gi=WORLD.grounds.indexOf(runtime.walkSurface); if(gi>=0) WORLD.grounds.splice(gi,1);
        var gc=WORLD.clickables.indexOf(runtime.walkSurface); if(gc>=0) WORLD.clickables.splice(gc,1);
      }
      if(runtime.floor){ var fi=Planes.FLOORS.indexOf(runtime.floor); if(fi>=0) Planes.FLOORS.splice(fi,1); }
      if(runtime.group&&runtime.group.parent) runtime.group.parent.remove(runtime.group);
      Planes._watchers=Planes._watchers.filter(function(w){
        return w.group!==runtime.group&&w.group!==runtime.walkSurface&&runtime.props.indexOf(w.group)<0&&
          runtime.clickables.indexOf(w.group)<0;
      });
      runtime.props.forEach(function(o){disposeTree(o,geometries,materials);});
      runtime.clickables.forEach(function(o){disposeTree(o,geometries,materials);});
      disposeTree(runtime.walkSurface,geometries,materials);
      disposeTree(runtime.group,geometries,materials);
      runtime.provider=null; runtime.initialized=false; runtime.group=null; runtime.floor=null;
      runtime.walkSurface=null; runtime.clickables=[]; runtime.colliders=[]; runtime.props=[];
      if(typeof console!=='undefined'&&console.info) console.info('[holm_training_cavern] provider-owned runtime disposed');
    }catch(e){ console.error('[holm_training_cavern] dispose',e); }
  }

  function build(){
    /* ---- pit shell: sandy floor + low rock walls (open top) + torch glow ---- */
    var g=new THREE.Group(); g.name='holm-training-cavern-runtime';
    g.userData={runtimeOwnerId:OWNER,plane:-1};
    var floorM=new THREE.Mesh(new THREE.BoxGeometry(CC.hw*2,0.3,CC.hd*2), mat(SAND));
    floorM.position.set(CC.x,Y-0.15,CC.z); floorM.receiveShadow=true; g.add(floorM);
    var wall=function(wx,wz,ww,wd){
      var m=new THREE.Mesh(new THREE.BoxGeometry(ww,WALL_H,wd),mat(ROCK));
      m.position.set(wx,Y+WALL_H/2,wz); g.add(m);
    };
    wall(CC.x,CC.z-CC.hd,CC.hw*2+0.6,0.6); wall(CC.x,CC.z+CC.hd,CC.hw*2+0.6,0.6);
    wall(CC.x-CC.hw,CC.z,0.6,CC.hd*2+0.6); wall(CC.x+CC.hw,CC.z,0.6,CC.hd*2+0.6);
    [[LAYOUT.entry.x+3,LAYOUT.entry.z],[LAYOUT.targets.furnace.x,LAYOUT.targets.furnace.z-3],
     [LAYOUT.exit.x-3,LAYOUT.exit.z]].forEach(function(p){
      var glow=new THREE.PointLight(0xff9a40,0.85,20); glow.position.set(p[0],Y+2,p[1]); g.add(glow);
    });
    scene.add(g); runtime.group=g;
    Planes.addVisibilityRule(g,function(p){return p===-1;});

    /* ---- collision + walkable region (all plane -1, all owned) ---- */
    runtime.floor=Planes.addFloor({plane:-1,x:CC.x,z:CC.z,hw:CC.hw-0.6,hd:CC.hd-0.6,y:Y});
    var wc=function(x1,z1,x2,z2){
      var n=Math.max(2,Math.round(Math.hypot(x2-x1,z2-z1)/1.6));
      for(var i=0;i<=n;i++){ var t=i/n;
        WORLD.colliders.push(ownCollider({type:'circle',x:x1+(x2-x1)*t,z:z1+(z2-z1)*t,r:0.5}));
      }
    };
    wc(CC.x-CC.hw,CC.z-CC.hd,CC.x+CC.hw,CC.z-CC.hd); wc(CC.x-CC.hw,CC.z+CC.hd,CC.x+CC.hw,CC.z+CC.hd);
    wc(CC.x-CC.hw,CC.z-CC.hd,CC.x-CC.hw,CC.z+CC.hd); wc(CC.x+CC.hw,CC.z-CC.hd,CC.x+CC.hw,CC.z+CC.hd);

    /* invisible click-to-walk surface, same contract as the storm cellar */
    var walk=new THREE.Mesh(new THREE.PlaneGeometry(CC.hw*2,CC.hd*2),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,
        side:THREE.DoubleSide}));
    walk.name='ground'; walk.rotation.x=-Math.PI/2;
    walk.position.set(CC.x,Y+0.015,CC.z);
    walk.userData={plane:-1,walkSurface:OWNER,runtimeOwnerId:OWNER};
    scene.add(walk); WORLD.clickables.push(walk); WORLD.grounds.push(walk);
    Planes.addVisibilityRule(walk,function(p){return p===-1;});
    runtime.walkSurface=walk;

    /* ---- the four lesson targets + support rocks (existing action contracts) ---- */
    var rocks=[[LAYOUT.targets.copper.x,LAYOUT.targets.copper.z,LAYOUT.targets.copper.kind]]
      .concat(LAYOUT.extraRocks.map(function(r){return [r.x,r.z,r.kind];}));
    var generation=runtime.generation;
    rocks.forEach(function(row,i){
      // stagger — each makeRock is ~15 meshes, the heaviest part of the build
      var timer=setTimeout(function(){ try{
        var ti=runtime.timers.indexOf(timer); if(ti>=0) runtime.timers.splice(ti,1);
        if(!runtime.initialized||runtime.generation!==generation) return;
        var r=makeRock(row[0],row[1],row[2]);
        r.position.y=Y; r.userData.plane=-1; r.userData.runtimeOwnerId=OWNER;
        runtime.props.push(r); Planes.addVisibilityRule(r,function(p){return p===-1;});
        Planes.refreshVisibility();
      }catch(e){ console.error('[holm_training_cavern] rock',e); } }, i*50);
      runtime.timers.push(timer);
    });
    var furn=makeFurnace(LAYOUT.targets.furnace.x,LAYOUT.targets.furnace.z);
    furn.position.y=Y; furn.userData.plane=-1; furn.userData.runtimeOwnerId=OWNER;
    ownCollider(WORLD.colliders[WORLD.colliders.length-1]);   // retag the furnace's plane-0 circle
    runtime.props.push(furn); Planes.addVisibilityRule(furn,function(p){return p===-1;});
    var a=new THREE.Group();   // minimal graybox anvil (makeAnvil is private to prop_smithy)
    var ab=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.55,0.5),mat(0x33312e)); ab.position.y=0.27; a.add(ab);
    var at=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.24,1.05),mat(0x45423c)); at.position.y=0.66; a.add(at);
    var ah=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.5,6),mat(0x45423c));
    ah.rotation.z=Math.PI/2; ah.position.set(0,0.66,0.72); a.add(ah);
    a.position.set(LAYOUT.targets.anvil.x,Y,LAYOUT.targets.anvil.z);
    a.userData={kind:'anvil',label:'Smith at <b>Anvil</b>',plane:-1,runtimeOwnerId:OWNER};
    scene.add(a); WORLD.clickables.push(a); runtime.props.push(a);
    WORLD.colliders.push(ownCollider({type:'circle',x:LAYOUT.targets.anvil.x,z:LAYOUT.targets.anvil.z,r:0.6}));
    Planes.addVisibilityRule(a,function(p){return p===-1;});

    /* ---- forward-only traversal: gate shaft DOWN only, far ladder UP only ---- */
    var gate=Planes.addClimb({x:LAYOUT.gate.x,z:LAYOUT.gate.z,name:'Cavern shaft',
      label:'Climb-down <b>Training cavern</b>',
      down:{plane:-1,x:LAYOUT.entry.x,z:LAYOUT.entry.z},
      mesh:(function(){ // graybox mine-shaft mouth: dark hole in a stone rim
        var q=new THREE.Group();
        var hole=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.08,1.2),
          new THREE.MeshLambertMaterial({color:0x14100c})); hole.position.y=0.05; q.add(hole);
        var rim=function(rx,rz,rw,rd){ var m=new THREE.Mesh(new THREE.BoxGeometry(rw,0.3,rd),mat(0x6e6a62));
          m.position.set(rx,0.15,rz); m.castShadow=true; q.add(m); };
        rim(0,-0.85,1.9,0.35); rim(0,0.85,1.9,0.35); rim(-0.85,0,0.35,1.4); rim(0.85,0,0.35,1.4);
        return q; })()});
    gate.userData.runtimeOwnerId=OWNER; ownClickable(gate);
    var exitLadder=Planes.addClimb({x:LAYOUT.exit.x,z:LAYOUT.exit.z,h:3,basePlane:-1,y:Y,
      name:'Cavern exit',label:'Climb-up <b>Cavern exit</b>',
      up:{plane:0,x:LAYOUT.hall.x,z:LAYOUT.hall.z}});
    exitLadder.userData.runtimeOwnerId=OWNER; ownClickable(exitLadder);

    Planes.refreshVisibility();
    console.log('[holm_training_cavern] graybox cavern ready: gate ('+LAYOUT.gate.x+','+LAYOUT.gate.z+
      ') -> pit ('+CC.x+','+CC.z+') -> Combat Hall ('+LAYOUT.hall.x+','+LAYOUT.hall.z+')');
  }

  function init(provider){
    if(runtime.initialized&&runtime.provider===provider) return snapshot();
    if(runtime.initialized) dispose();
    if(!provider||provider.id!=='tutors-holm-v2') throw new Error('[holm_training_cavern] Tutor\'s Holm provider required');
    if(typeof Planes==='undefined'||typeof Planes.addFloor!=='function'||typeof Planes.addClimb!=='function')
      throw new Error('[holm_training_cavern] Planes runtime unavailable');
    if(typeof makeRock!=='function'||typeof makeFurnace!=='function'||typeof mat!=='function'||
       typeof scene==='undefined'||typeof WORLD==='undefined')
      throw new Error('[holm_training_cavern] world builders unavailable');
    runtime.provider=provider; runtime.initialized=true; runtime.generation++;
    build();
    return snapshot();
  }
  function snapshot(){
    return {owner:OWNER,provider:runtime.provider&&runtime.provider.id||null,initialized:runtime.initialized,
      plane:LAYOUT.plane,props:runtime.props.length,clickables:runtime.clickables.length,
      colliders:runtime.colliders.length,floors:runtime.floor?1:0,pendingBuilds:runtime.timers.length};
  }

  global.HolmTrainingCavern={layout:LAYOUT,init:init,dispose:dispose,snapshot:snapshot};
})(typeof window!=='undefined'?window:globalThis);
