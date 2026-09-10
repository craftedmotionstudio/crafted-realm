/* ================= LASTLIGHT THREE-LEVEL LIGHTHOUSE RUNTIME ================= */
(function(global){
  'use strict';
  var OWNER='holm_lastlight_runtime',runtime=fresh();
  function fresh(){return {provider:null,initialized:false,groups:[],floors:[],colliders:[],clickables:[],grounds:[],
    fallbacks:{},authored:{},beaconFlames:[],ambientFlames:[],ambientLights:[],beaconGlass:[],beaconMaterials:[],leverPivot:null,trapdoorPivot:null,
    entryDoorPivot:null,entryDoorOpen:false,entryDoorBusy:false,entryDoorTimer:0,dungeonGroup:null,
    exteriorOccluderMaterials:[],exteriorOcclusionAlpha:1,beaconLight:null,beaconOn:false,trapdoorOpen:false,
    visualReady:false,anchorClimbs:{},controlProxies:{},cameraPlane:null,raf:0,generation:0};}
  function material(color){var m=new THREE.MeshLambertMaterial({color:color});m.flatShading=true;m.needsUpdate=true;return m;}
  function ownGroup(g,rule){scene.add(g);runtime.groups.push(g);Planes.addVisibilityRule(g,rule);return g;}
  function ownFloor(f){runtime.floors.push(f);return f;}
  function ownClimb(o,plane){runtime.clickables.push(o);o.userData.plane=plane;return o;}
  function ownClickable(o,plane){o.userData.plane=plane;WORLD.clickables.push(o);runtime.clickables.push(o);return o;}
  function ownWalkSurface(mesh,plane){mesh.name='ground';mesh.userData={plane:plane};WORLD.grounds.push(mesh);WORLD.clickables.push(mesh);runtime.grounds.push(mesh);return mesh;}
  function box(group,size,pos,mat){var m=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),mat);m.position.set(pos[0],pos[1],pos[2]);m.receiveShadow=true;group.add(m);return m;}
  function transparentProxy(w,h,d){var g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0xff3366,transparent:true,opacity:0,depthWrite:false});var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.y=h/2;g.add(m);return g;}
  function registerFence(floor){Planes.edgeFence(floor);for(var n=Math.max(0,WORLD.colliders.length-4);n<WORLD.colliders.length;n++){WORLD.colliders[n].runtimeOwnerId=OWNER;runtime.colliders.push(WORLD.colliders[n]);}}

  function addClimbProxy(host,level,kind,pos,dest,label,anchorId){
    var proxy=transparentProxy(2.2,3.9,1.8);proxy.position.set(pos.x,level.y,pos.z);
    var opts={x:pos.x,z:pos.z,y:level.y,basePlane:level.plane,h:3.9,mesh:proxy,name:label,label:label};opts[kind]=dest;
    var climb=ownClimb(Planes.addClimb(opts),level.plane);climb.userData.climbSound=kind==='up'?'up':'down';
    if(anchorId){climb.userData.anchorId=anchorId;runtime.anchorClimbs[anchorId]=climb;}host.add(climb);return climb;
  }
  function addInspectProxy(host,level,x,z,w,d,name,message){
    var p=transparentProxy(w,1.8,d);p.position.set(x,level.y,z);p.userData={kind:'prop',inspectOnly:true,inspectName:name,inspectMessage:message};
    ownClickable(p,level.plane);host.add(p);return p;
  }
  function buildExterior(data){
    var c=data.contract,g=ownGroup(new THREE.Group(),function(p){return p===0;});g.name='lastlight-functional-exterior';
    var fallback=new THREE.Group();fallback.name='lastlight-exterior-fallback';g.add(fallback);runtime.fallbacks.exterior=fallback;
    var entry=transparentProxy(c.footprint.doorWidth+.55,3.45,1.8);entry.position.set(c.footprint.door.x,c.baseY,c.footprint.door.z+1);
    entry.userData={kind:'lighthouseDoor',plane:0,label:'Open <b>Lastlight door</b>',walkAt:{x:c.footprint.door.x,z:c.footprint.door.z+1.65},
      inspectMessage:'A weathered oak door set into the solid tapered lighthouse.',activate:enterThroughDoor};
    ownClickable(entry,0);g.add(entry);runtime.controlProxies.entryDoor=entry;return g;
  }
  function enterThroughDoor(obj){
    if(runtime.entryDoorBusy||Player.plane!==0)return;var c=HolmLastlightData.contract,walk=obj.userData.walkAt;
    function openAndEnter(){
      if(runtime.entryDoorBusy||Player.plane!==0)return;runtime.entryDoorBusy=true;runtime.entryDoorOpen=true;obj.userData.label='Enter <b>Lastlight</b>';
      UI.chat('The Lastlight door swings inward on its iron hinges.','plain');
      if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.doorOpen)SfxFurnishings.doorOpen();else if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
      runtime.entryDoorTimer=setTimeout(function(){
        if(Player.plane===0)Planes.climbTo({plane:1,x:c.levels[0].spawn.x,z:c.levels[0].spawn.z,zone:c.levels[0].label,message:'You step through the door into Lastlight.'});
        runtime.entryDoorBusy=false;setTimeout(function(){runtime.entryDoorOpen=false;obj.userData.label='Open <b>Lastlight door</b>';},450);
      },720);
    }
    var target=new THREE.Vector3(walk.x,groundY(walk.x,walk.z),walk.z);
    if(Math.hypot(player.position.x-walk.x,player.position.z-walk.z)<=2.2)openAndEnter();
    else if(typeof Sched!=='undefined')Sched.walkThen(target,2.1,openAndEnter);else{orderWalk(target);setTimeout(openAndEnter,900);}
  }
  function buildLevel(data,index){
    var c=data.contract,level=c.levels[index],g=ownGroup(new THREE.Group(),function(p){return p===level.plane;});
    g.name='lastlight-functional-'+level.id;runtime.fallbacks[level.id]=new THREE.Group();g.add(runtime.fallbacks[level.id]);
    var floor=ownFloor(Planes.addFloor({plane:level.plane,x:c.center.x,z:c.center.z,hw:c.footprint.walkHalfWidth,hd:c.footprint.walkHalfDepth,y:level.y}));registerFence(floor);
    ownWalkSurface(box(runtime.fallbacks[level.id],[c.footprint.walkHalfWidth*2,.18,c.footprint.walkHalfDepth*2],[c.center.x,level.y-.12,c.center.z],material(0x5e5548)),level.plane);
    if(index===0){
      addClimbProxy(g,level,'down',level.spawn,{plane:0,x:c.footprint.door.x,z:c.footprint.door.z+1.5,zone:'Lastlight Summit'},'Exit <b>Lastlight</b>');
      addClimbProxy(g,level,'up',level.up,{plane:c.levels[1].plane,x:c.levels[1].down.x,z:c.levels[1].down.z,zone:c.levels[1].label},'Climb-up <b>ground-floor ladder</b>','CR_L1_Up');
      addInspectProxy(g,level,193.8,113,5.8,2.4,"keeper's dinghy",'A clinker-built repair boat rests on its side, ready for the next storm crossing.');
      addInspectProxy(g,level,200,116.8,3.2,3,'storm stores','Tarred barrels hold lamp oil, spare line and dry provisions.');
    }else{
      addClimbProxy(g,level,'down',level.down,{plane:c.levels[index-1].plane,x:c.levels[index-1].up.x,z:c.levels[index-1].up.z,zone:c.levels[index-1].label},'Climb-down <b>lower ladder</b>','CR_L'+(index+1)+'_Down');
      if(level.up)addClimbProxy(g,level,'up',level.up,{plane:c.levels[index+1].plane,x:c.levels[index+1].down.x,z:c.levels[index+1].down.z,zone:c.levels[index+1].label},'Climb-up <b>upper ladder</b>','CR_L'+(index+1)+'_Up');
    }
    if(index===1){
      addInspectProxy(g,level,194,116.2,4.4,2.5,"keeper's desk",'Crossing records and weather notes cover the old keeper\'s desk.');
      addInspectProxy(g,level,193.2,109.2,4.6,2.1,"keeper's bed",'A proper bed and warm blankets make this circular room feel inhabited.');
      addInspectProxy(g,level,200,113,2.7,3.6,"keeper's library",'Salt-stained journals record years of storms and safe crossings.');
    }
    return g;
  }
  function buildDungeon(data){
    var c=data.contract,d=c.dungeon,g=ownGroup(new THREE.Group(),function(p){return p===d.plane;});g.name='lastlight-functional-underkeep';runtime.dungeonGroup=g;
    runtime.fallbacks.underkeep=new THREE.Group();g.add(runtime.fallbacks.underkeep);
    /* Highest, most specific regions come first because elevAt uses the first
       matching floor. These planes make the authored shelves genuinely
       traversable rather than merely differently coloured scenery. */
    ownFloor(Planes.addFloor({plane:d.plane,x:d.center.x-12,z:d.center.z+7,hw:6,hd:4,y:d.y+.92}));
    ownFloor(Planes.addFloor({plane:d.plane,x:d.center.x+2,z:d.center.z-10,hw:9,hd:3,y:d.y+1.48}));
    ownFloor(Planes.addFloor({plane:d.plane,x:d.center.x+13,z:d.center.z,hw:4,hd:7,y:d.y+.66}));
    var floor=ownFloor(Planes.addFloor({plane:d.plane,x:d.center.x,z:d.center.z,hw:d.halfWidth,hd:d.halfDepth,y:d.y}));registerFence(floor);
    [{x:d.center.x+6,z:d.center.z,hw:7.2,hd:5.8},{x:d.center.x+2,z:d.center.z+5.5,hw:3.8,hd:2.2}].forEach(function(r){
      var col={x:r.x,z:r.z,hw:r.hw,hd:r.hd,plane:d.plane,runtimeOwnerId:OWNER};WORLD.colliders.push(col);runtime.colliders.push(col);
    });
    ownWalkSurface(box(runtime.fallbacks.underkeep,[d.halfWidth*2,.18,d.halfDepth*2],[d.center.x,d.y-.12,d.center.z],material(0x454a43)),d.plane);
    addClimbProxy(g,{plane:d.plane,y:d.y+.92},'up',d.ladder,{plane:c.levels[0].plane,x:c.trapdoor.x,z:c.trapdoor.z+1.4,zone:c.levels[0].label,message:'You climb back into the lighthouse ground floor.'},'Climb-up <b>Underkeep ladder</b>','CR_Dungeon_Up');
    addInspectProxy(g,{plane:d.plane,y:d.y},d.center.x+6,d.center.z,13.5,10.5,'tidal pool','Cold seawater breathes through cracks beneath Lastlight. Pale moss marks the ledges above its dark depth.');return g;
  }
  function descendTrapdoor(){
    if(runtime.trapdoorOpen)return;var c=HolmLastlightData.contract,d=c.dungeon;runtime.trapdoorOpen=true;
    UI.chat('The Underkeep hatch groans open. Cold salt air rises from below.','plain');
    if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.doorOpen)SfxFurnishings.doorOpen();else if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
    setTimeout(function(){if(Player.plane===c.trapdoor.plane)Planes.climbTo({plane:d.plane,x:d.spawn.x,z:d.spawn.z,zone:d.label,message:'You descend beneath Lastlight into the wet Underkeep cavern.'});setTimeout(function(){runtime.trapdoorOpen=false;},300);},620);
  }
  function toggleBeacon(){runtime.beaconOn=!runtime.beaconOn;Player.lastlightLit=runtime.beaconOn;UI.chat(runtime.beaconOn?'You pull the bronze lever. Lastlight wakes and sweeps the grey sea.':'You ease the lever back. The great lens fades to a watchful ember.','plain');if(runtime.beaconOn){try{if(typeof Tutorial!=='undefined')Tutorial.notify('beacon','lit');}catch(e){}}if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();}
  function buildControls(data){
    var c=data.contract,base=c.levels[0],top=c.levels[c.levels.length-1];
    var hatch=transparentProxy(2.7,.8,2.5);hatch.position.set(c.trapdoor.x,base.y,c.trapdoor.z);hatch.userData={kind:'trapdoor',label:'Open and descend <b>Underkeep trapdoor</b>',walkAt:{x:c.trapdoor.x,z:c.trapdoor.z+1.4},inspectMessage:'An iron-strapped oak hatch descends into the tidal cavern beneath Lastlight.',activate:descendTrapdoor};ownClickable(hatch,base.plane);runtime.groups[base.plane].add(hatch);runtime.controlProxies.trapdoor=hatch;
    var lever=transparentProxy(1.4,2.1,1.4);lever.position.set(c.beacon.lever.x,top.y,c.beacon.lever.z);lever.userData={kind:'lever',label:'Operate <b>Lastlight lever</b>',inspectMessage:'A heavy bronze throw engages the beacon lens above.',activate:toggleBeacon};ownClickable(lever,top.plane);runtime.groups[top.plane].add(lever);runtime.controlProxies.lever=lever;
  }
  function attachAuthored(data,gltf,generation){
    if(!runtime.initialized||runtime.generation!==generation)return;var c=data.contract,map={CR_Exterior:0,CR_Level1:1,CR_Level2:2,CR_Level3:3,CR_Dungeon:'dungeon'};
    Object.keys(map).forEach(function(name){
      var node=gltf.scene.getObjectByName(name);if(!node)return;var slot=map[name],host=slot==='dungeon'?runtime.dungeonGroup:runtime.groups[slot];
      if(node.parent)node.parent.remove(node);node.position.set(slot==='dungeon'?c.dungeon.center.x:c.center.x,c.baseY,slot==='dungeon'?c.dungeon.center.z:c.center.z);node.name='lastlight-authored-'+name.toLowerCase();
      node.traverse(function(o){
        if(o.name==='CR_TrapdoorLid')runtime.trapdoorPivot=o;if(o.name==='CR_BeaconLever')runtime.leverPivot=o;if(o.name==='CR_EntryDoor')runtime.entryDoorPivot=o;
        if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;var lname=(o.name||'').toLowerCase(),mats=Array.isArray(o.material)?o.material:[o.material],ancestor=o,doorPart=false,floorPart=false,baseShellPart=false;
        while(ancestor){var an=(ancestor.name||'').toLowerCase();if(an.indexOf('entrydoor')>=0)doorPart=true;if(an.indexOf('groundfloor')>=0)floorPart=true;if(an.indexOf('cutawaybase')>=0)baseShellPart=true;if(ancestor===node)break;ancestor=ancestor.parent;}
        baseShellPart=baseShellPart||/connectedtowerstone_(foundationband|course_0[0-2])/.test(lname);
        if(slot===0&&(doorPart||floorPart||baseShellPart)){mats=mats.map(function(m){return m&&m.clone?m.clone():m;});o.material=Array.isArray(o.material)?mats:mats[0];}
        if(lname.indexOf('beaconflame')>=0)runtime.beaconFlames.push(o);else if(lname.indexOf('interiorlanternflame')>=0)runtime.ambientFlames.push(o);if(lname.indexOf('beaconlens')>=0||lname.indexOf('lanternglass')>=0)runtime.beaconGlass.push(o);
        mats.forEach(function(m){if(!m)return;m.flatShading=true;m.needsUpdate=true;var mn=(m.name||'').toLowerCase(),clearCrownGlass=mn.indexOf('clear blue lantern-room glass')>=0;
          if(clearCrownGlass){m.transparent=true;m.opacity=.22;m.depthWrite=false;m.userData._lastlightAuthoredOpacity=.22;}
          else if(slot===0&&!doorPart&&!floorPart&&!baseShellPart&&runtime.exteriorOccluderMaterials.indexOf(m)<0){m.transparent=true;m.depthWrite=true;runtime.exteriorOccluderMaterials.push(m);}
          if(lname.indexOf('beacon')>=0||lname.indexOf('lanternglass')>=0||mn.indexOf('beacon')>=0||mn.indexOf('amber glass')>=0){if(runtime.beaconMaterials.indexOf(m)<0)runtime.beaconMaterials.push(m);}});
      });
      host.add(node);runtime.authored[name]=node;var key=slot==='dungeon'?'underkeep':(slot===0?'exterior':c.levels[slot-1].id);if(runtime.fallbacks[key])runtime.fallbacks[key].visible=false;
      if(slot!==0){
        var lightY=slot==='dungeon'?c.dungeon.y+2.7:c.levels[slot-1].y+2.2,positions=slot==='dungeon'?[[c.dungeon.center.x-15,lightY,c.dungeon.center.z+2],[c.dungeon.center.x+13,lightY,c.dungeon.center.z-5]]:[[c.center.x,lightY,c.center.z]];
        positions.forEach(function(p){var l=new THREE.PointLight(0xffa24a,slot==='dungeon'?.38:.42,slot==='dungeon'?14:12);l.position.set(p[0],p[1],p[2]);host.add(l);runtime.ambientLights.push(l);});
      }
    });
    var top=c.levels[c.levels.length-1];runtime.beaconLight=new THREE.PointLight(0xff7b24,0,18);runtime.beaconLight.position.set(c.center.x,top.y+2.2,c.center.z);runtime.groups[top.plane].add(runtime.beaconLight);
    runtime.visualReady=c.visual.semanticRoots.every(function(n){return !!runtime.authored[n];});Planes.refreshVisibility();console.info('[holm_lastlight] authored three-level lighthouse and Underkeep ready');
  }
  function loadAuthored(data){var generation=runtime.generation;new THREE.GLTFLoader().load(data.contract.visual.model+'?v=16',function(g){attachAuthored(data,g,generation);},undefined,function(e){console.error('[holm_lastlight] authored lighthouse GLB failed',e);});}
  function animate(){
    if(!runtime.initialized)return;var t=performance.now()*.001,pulse=.88+.12*Math.sin(t*2.1)+.035*Math.sin(t*5.7);
    if(runtime.entryDoorPivot){var doorTarget=runtime.entryDoorOpen?-1.32:0;runtime.entryDoorPivot.rotation.y+=(doorTarget-runtime.entryDoorPivot.rotation.y)*.16;}
    if(runtime.leverPivot){var leverTarget=runtime.beaconOn?-.72:.22;runtime.leverPivot.rotation.x+=(leverTarget-runtime.leverPivot.rotation.x)*.12;}
    if(runtime.trapdoorPivot){var hatchTarget=runtime.trapdoorOpen?-1.28:0;runtime.trapdoorPivot.rotation.x+=(hatchTarget-runtime.trapdoorPivot.rotation.x)*.12;}
    runtime.beaconFlames.forEach(function(o,i){o.visible=runtime.beaconOn;o.scale.y=.92+pulse*.14;o.scale.x=.96+Math.sin(t*2.8+i)*.05;});
    runtime.ambientFlames.forEach(function(o,i){var cozy=.96+.055*Math.sin(t*1.35+i*.7)+.018*Math.sin(t*2.4+i);o.scale.y=cozy;o.scale.x=1.01+(cozy-.96)*.35;});
    runtime.beaconMaterials.forEach(function(m){if(m.emissive)m.emissiveIntensity=runtime.beaconOn?1.15+pulse*.9:.06;});if(runtime.beaconLight)runtime.beaconLight.intensity=runtime.beaconOn?1.35+pulse*.8:0;
    if(typeof player!=='undefined'){
      var plane=Player.plane||0,c=HolmLastlightData.contract;runtime.groups[0].visible=plane===0;runtime.groups[1].visible=plane===1;
      var nearSummit=plane===0&&Math.hypot(player.position.x-c.center.x,player.position.z-c.center.z)<13.8;
      if(nearSummit&&typeof camCtl!=='undefined'){var sx=player.position.x-c.center.x,sz=player.position.z-c.center.z,sl=Math.max(.001,Math.hypot(sx,sz)),dy=Math.atan2(sx/sl,sz/sl),dd=Math.atan2(Math.sin(dy-camCtl.yaw),Math.cos(dy-camCtl.yaw));if(Math.abs(dd)>.72)camCtl.yaw=dy-Math.sign(dd)*.72;else camCtl.yaw+=dd*.14;camCtl.pitch=Math.max(camCtl.pitch,.67);camCtl.dist=Math.max(camCtl.dist,15.5);}
      if(runtime.cameraPlane!==plane&&typeof camCtl!=='undefined'){
        if(plane>0&&plane<=c.levels.length){camCtl.pitch=Math.max(camCtl.pitch,1.16);camCtl.dist=Math.max(camCtl.dist,21.5);}
        if(plane===c.dungeon.plane){camCtl.pitch=Math.max(camCtl.pitch,1.02);camCtl.dist=Math.max(camCtl.dist,21);}
        runtime.cameraPlane=plane;
      }
      /* The Underkeep is intentionally much larger than an ordinary room.
         Preserve a cavern-scale view even after the player presses Reset view. */
      if(plane===c.dungeon.plane&&typeof camCtl!=='undefined'){camCtl.pitch=Math.max(camCtl.pitch,1.03);camCtl.dist=Math.max(camCtl.dist,34);}
      runtime.exteriorOcclusionAlpha+=(1-runtime.exteriorOcclusionAlpha)*.14;runtime.exteriorOccluderMaterials.forEach(function(m){m.opacity=runtime.exteriorOcclusionAlpha;m.depthWrite=runtime.exteriorOcclusionAlpha>.72;m.needsUpdate=true;});
    }
    runtime.raf=requestAnimationFrame(animate);
  }
  function init(provider){
    if(runtime.initialized)return runtime;if(typeof HolmLastlightData==='undefined'||typeof Planes==='undefined'||typeof scene==='undefined')throw new Error('[HolmLastlight] dependencies unavailable');
    runtime.provider=provider;runtime.generation++;runtime.beaconOn=!!Player.lastlightLit;buildExterior(HolmLastlightData);HolmLastlightData.contract.levels.forEach(function(_,i){buildLevel(HolmLastlightData,i);});buildDungeon(HolmLastlightData);buildControls(HolmLastlightData);loadAuthored(HolmLastlightData);
    runtime.initialized=true;Planes.refreshVisibility();animate();console.info('[holm_lastlight] three floors, two ladders, Underkeep and beacon controls ready');return runtime;
  }
  function disposeTree(root,geometries,materials){if(!root||!root.traverse)return;root.traverse(function(o){if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);o.geometry.dispose();}var list=Array.isArray(o.material)?o.material:[o.material];list.forEach(function(m){if(m&&!materials.has(m)){materials.add(m);m.dispose();}});});}
  function dispose(){
    if(runtime.raf)cancelAnimationFrame(runtime.raf);if(runtime.entryDoorTimer)clearTimeout(runtime.entryDoorTimer);var gs=new Set(),ms=new Set();
    runtime.clickables.forEach(function(o){var i=WORLD.clickables.indexOf(o);if(i>=0)WORLD.clickables.splice(i,1);if(o.parent)o.parent.remove(o);disposeTree(o,gs,ms);});
    runtime.grounds.forEach(function(o){var i=WORLD.clickables.indexOf(o);if(i>=0)WORLD.clickables.splice(i,1);i=WORLD.grounds.indexOf(o);if(i>=0)WORLD.grounds.splice(i,1);});
    for(var i=WORLD.colliders.length-1;i>=0;i--)if(WORLD.colliders[i].runtimeOwnerId===OWNER)WORLD.colliders.splice(i,1);
    runtime.floors.forEach(function(f){var i=Planes.FLOORS.indexOf(f);if(i>=0)Planes.FLOORS.splice(i,1);});Planes._watchers=Planes._watchers.filter(function(w){return runtime.groups.indexOf(w.group)<0&&runtime.clickables.indexOf(w.group)<0;});
    runtime.groups.forEach(function(g){if(g.parent)g.parent.remove(g);disposeTree(g,gs,ms);});var gen=runtime.generation+1;runtime=fresh();runtime.generation=gen;
  }
  function snapshot(){return {initialized:runtime.initialized,levels:HolmLastlightData.contract.levels.length,ladders:2,dungeons:runtime.dungeonGroup?1:0,floors:runtime.floors.length,beaconOn:runtime.beaconOn,trapdoorOpen:runtime.trapdoorOpen,visualReady:runtime.visualReady,authored:Object.keys(runtime.authored)};}
  global.HolmLastlight={init:init,dispose:dispose,snapshot:snapshot};
})(window);
