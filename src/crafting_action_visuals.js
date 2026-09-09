/* ================= CRAFTING ACTION VISUALS =================
 * Presentation-only held tools and sparks for Mining, smelting and smithing.
 * Rewards, timing and requirements stay authoritative in game5_main.js.
 */
(function(global){
  'use strict';
  var active=null,particles=[];
  function M(c,glow){
    if(!glow)return mat(c);
    // Three r128 supports flatShading as a material property, but warns when it
    // is passed as an unknown constructor parameter. Set it explicitly so live
    // skilling effects remain console-clean.
    var m=new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:1.25});
    m.flatShading=true;m.needsUpdate=true;return m;
  }
  function hammer(){
    var g=new THREE.Group(),wood=M(0x75461f),iron=M(0x373b3d),edge=M(0x686d6d);
    var h=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.62,7),wood);h.position.y=.29;g.add(h);
    var head=new THREE.Mesh(new THREE.BoxGeometry(.38,.16,.18),iron);head.position.y=.64;g.add(head);
    var face=new THREE.Mesh(new THREE.BoxGeometry(.08,.19,.21),edge);face.position.set(.22,.64,0);g.add(face);
    g.name='temporary-smithing-hammer';return g;
  }
  function tongs(){
    var g=new THREE.Group(),iron=M(0x292a28),hot=M(0xe55a18,true);
    [-.055,.055].forEach(function(x){var arm=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,.62,6),iron);arm.position.set(x,.29,0);arm.rotation.z=x>0?.08:-.08;g.add(arm);});
    var bar=new THREE.Mesh(new THREE.BoxGeometry(.33,.10,.12),hot);bar.position.set(0,.68,0);g.add(bar);
    g.name='temporary-furnace-tongs';return g;
  }
  function bestPick(){
    var ids=['steel_pickaxe','iron_pickaxe','pickaxe'];
    for(var i=0;i<ids.length;i++)if(Player.count(ids[i])>0||Player.equip.weapon===ids[i])return ids[i];
    return null;
  }
  function attachTool(tool,kind){
    var parts=player.userData&&player.userData.parts,holder=null,hidden=null;
    if(parts&&parts.handR){
      holder=parts.handR;hidden=player.userData.gear&&player.userData.gear.weapon;
      if(hidden)hidden.visible=false;holder.add(tool);
      if(kind==='pick')holdWeapon(holder,tool,{model:'pick'});
      else {tool.rotation.x=.34;tool.rotation.z=-.06;tool.position.set(.03,.01,.08);}
    }else if(player.userData&&player.userData.isPlayerGLB&&player.userData.rigInner&&typeof _glbBone==='function'){
      holder=_glbBone(player.userData.rigInner,'RightHand');hidden=player.userData.glbGear&&player.userData.glbGear.weapon;
      if(holder){if(hidden)hidden.visible=false;var ws=new THREE.Vector3();holder.getWorldScale(ws);tool.scale.multiplyScalar(1/(ws.x||1));
        holder.add(tool);tool.position.set(0,.03,.04);tool.rotation.set(.18,0,-.08);}
    }
    return holder?{tool:tool,hidden:hidden}:null;
  }
  function cleanup(){
    if(active&&active.attach){var a=active.attach;if(a.tool.parent)a.tool.parent.remove(a.tool);if(a.hidden)a.hidden.visible=true;}
    active=null;
  }
  function desired(action){
    if(!action)return null;
    if(action.type==='gather'&&action.obj&&action.obj.userData&&action.obj.userData.rtype==='rock')return 'mine';
    if(action.type==='smelt'||action.type==='smith')return action.type;
    return null;
  }
  function begin(kind,action){
    var tool=null,attach=null;
    if(kind==='mine'){
      var id=bestPick();
      if(id&&Player.equip.weapon!==id){tool=gearMesh(id);if(tool)attach=attachTool(tool,'pick');}
    }else if(kind==='smith'){tool=hammer();attach=attachTool(tool,'hammer');}
    else if(kind==='smelt'){tool=tongs();attach=attachTool(tool,'tongs');}
    active={kind:kind,action:action,attach:attach,phase:0};
  }
  function poseGLB(kind,dt){
    if(!active||!player.userData||!player.userData.isPlayerGLB||!player.userData.rigInner||typeof _glbBone!=='function')return;
    active.phase+=dt;
    var dur=kind==='mine'?.72:kind==='smith'?.58:1.05;
    var f=(active.phase%dur)/dur,e=function(x){return 1-Math.pow(1-x,3);};
    var rArm=_glbBone(player.userData.rigInner,'RightArm');
    var lArm=_glbBone(player.userData.rigInner,'LeftArm');
    var spine=_glbBone(player.userData.rigInner,'Spine1')||_glbBone(player.userData.rigInner,'Spine');
    var rx=0,rz=0,lx=0,lean=0;
    if(kind==='mine'){
      if(f<.46){var a=e(f/.46);rx=-1.38*a;rz=-.18*a;lean=-.08*a;}
      else if(f<.68){var b=e((f-.46)/.22);rx=-1.38+1.82*b;rz=-.18+.28*b;lean=-.08+.28*b;}
      else {var c=(f-.68)/.32;rx=.44*(1-c);rz=.10*(1-c);lean=.20*(1-c);}
    }else if(kind==='smith'){
      if(f<.40){var d=e(f/.40);rx=-1.06*d;rz=-.08*d;}
      else if(f<.62){var h=e((f-.40)/.22);rx=-1.06+1.38*h;lean=.16*h;}
      else {var j=(f-.62)/.38;rx=.32*(1-j);lean=.16*(1-j);}
    }else{
      var reach=f<.30?e(f/.30):f<.70?1:(1-e((f-.70)/.30));
      rx=-.76*reach;lx=-.72*reach;rz=-.06*reach;lean=.15*reach;
    }
    if(rArm){rArm.rotation.x+=rx;rArm.rotation.z+=rz;}
    if(lArm)lArm.rotation.x+=lx;
    if(spine)spine.rotation.x+=lean;
  }
  function pulse(kind,obj){
    if(!obj||!scene)return;
    var origin=obj.getWorldPosition?obj.getWorldPosition(new THREE.Vector3()):obj.position.clone();
    origin.y+=kind==='smelt'?.72:.82;
    var count=kind==='smelt'?9:7,color=kind==='smelt'?0xff6a18:0xffc45a;
    for(var i=0;i<count;i++){
      var mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.035+(i%3)*.012,0),M(color,true));
      mesh.position.copy(origin);mesh.position.x+=(Math.random()-.5)*.45;mesh.position.z+=(Math.random()-.5)*.45;scene.add(mesh);
      particles.push({mesh:mesh,t:0,d:.42+Math.random()*.22,v:new THREE.Vector3((Math.random()-.5)*1.5,1.0+Math.random()*1.1,(Math.random()-.5)*1.5)});
    }
  }
  function update(actor,action,dt){
    var want=desired(action);
    if(!want){if(active)cleanup();}
    else if(!active||active.action!==action||active.kind!==want){cleanup();begin(want,action);}
    if(active)poseGLB(active.kind,dt);
    for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.t+=dt;p.v.y-=4.8*dt;p.mesh.position.addScaledVector(p.v,dt);
      p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*4;var q=Math.max(0,1-p.t/p.d);p.mesh.scale.setScalar(q);
      if(p.t>=p.d){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
  }
  global.CraftingActionVisuals={update:update,pulse:pulse,cleanup:cleanup,snapshot:function(){return {active:active&&active.kind||null,particles:particles.length};}};
})(window);
