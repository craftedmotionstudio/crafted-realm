/* ============ mining_rocks_v1 — authored Blender rock visuals ============
 * Logic, collision and rewards stay on makeRock(). This module owns only the
 * visible tin/copper/clay family and swaps the temporary fallback once its GLB
 * is ready. One template load serves every resource instance.
 */
(function(global){
  'use strict';
  var URL='/assets/models/props/mining_rocks_v1.glb?v=1';
  var templates={},pending=[],ready=false,failed=false,effects=[],animatedHosts=new Set();
  var dustGeo=null,dustMat=null,lastFrame=0;

  function disposeTree(root){
    if(!root)return;
    root.traverse(function(o){if(o.geometry&&o.geometry.dispose)o.geometry.dispose();
      var list=Array.isArray(o.material)?o.material:[o.material];
      list.forEach(function(m){if(m&&m.dispose)m.dispose();});});
  }
  function find(root,name){var found=null;root.traverse(function(o){if(!found&&o.name===name)found=o;});return found;}
  function install(host,kind,fallback){
    if(!host||!host.parent||!templates[kind])return false;
    if(fallback&&fallback.parent===host){host.remove(fallback);disposeTree(fallback);}
    var model=templates[kind].clone(true);model.name='mining-rock-authored-'+kind;
    model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.set(1,1,1);
    model.traverse(function(o){
      /* Blender semantic metadata describes the asset, but the runtime host is
       * the authoritative resource contract.  Leaving a child userData.kind
       * here makes ray-picking stop before it reaches the mineable host. */
      if(o.userData&&Object.prototype.hasOwnProperty.call(o.userData,'kind'))delete o.userData.kind;
      if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
    });
    host.add(model);host.userData.authoredVisual=true;return true;
  }
  function attach(host,kind,fallback){
    kind=templates[kind]?kind:(kind==='clay'?'clay':kind==='tin'?'tin':'copper');
    if(ready)return install(host,kind,fallback);
    pending.push({host:host,kind:kind,fallback:fallback});return false;
  }
  function dust(host,count,strong){
    if(!host||!host.parent)return;
    dustGeo=dustGeo||new THREE.TetrahedronGeometry(.075,0);
    dustMat=dustMat||new THREE.MeshLambertMaterial({color:0x9b7650,transparent:true,opacity:.72});
    var at=new THREE.Vector3();host.getWorldPosition(at);
    for(var i=0;i<count;i++){
      var chip=new THREE.Mesh(dustGeo,dustMat.clone());
      var a=(i/count)*Math.PI*2+Math.random()*.45,spd=(strong?.72:.42)+Math.random()*.28;
      chip.position.set(at.x+Math.cos(a)*.28,at.y+.42+Math.random()*.32,at.z+Math.sin(a)*.28);
      chip.userData.vel=new THREE.Vector3(Math.cos(a)*spd,.48+Math.random()*.45,Math.sin(a)*spd);
      chip.userData.life=strong?.72:.48;chip.scale.setScalar(.75+Math.random()*.7);
      scene.add(chip);effects.push(chip);
    }
  }
  function impact(host){if(!host)return;host.userData._miningKick=.13;animatedHosts.add(host);dust(host,5,false);}
  function deplete(host){if(!host)return false;host.userData._miningDeplete=.34;animatedHosts.add(host);dust(host,9,true);return true;}
  function respawn(host){if(!host)return;host.visible=true;host.scale.setScalar(.64);host.userData._miningRespawn=.3;animatedHosts.add(host);dust(host,6,false);}
  function animate(now){
    requestAnimationFrame(animate);var dt=Math.min(.05,lastFrame?(now-lastFrame)/1000:.016);lastFrame=now;
    animatedHosts.forEach(function(host){
      if(!host||!host.userData){animatedHosts.delete(host);return;}
      var u=host.userData,active=false;
      if(u._miningKick>0){u._miningKick-=dt;var k=Math.max(0,u._miningKick/.13);host.scale.setScalar(1-.055*Math.sin(k*Math.PI));active=true;}
      if(u._miningDeplete>0){u._miningDeplete-=dt;host.scale.setScalar(Math.max(.12,u._miningDeplete/.34));active=true;
        if(u._miningDeplete<=0){host.visible=false;host.scale.setScalar(1);}}
      if(u._miningRespawn>0){u._miningRespawn-=dt;host.scale.setScalar(.64+(1-Math.max(0,u._miningRespawn/.3))*.36);active=true;
        if(u._miningRespawn<=0)host.scale.setScalar(1);}
      if(!active)animatedHosts.delete(host);
    });
    for(var i=effects.length-1;i>=0;i--){var p=effects[i],v=p.userData.vel;p.userData.life-=dt;
      v.y-=1.9*dt;p.position.addScaledVector(v,dt);p.rotation.x+=dt*4;p.rotation.z+=dt*3;
      p.material.opacity=Math.max(0,p.userData.life*1.45);
      if(p.userData.life<=0){scene.remove(p);p.material.dispose();effects.splice(i,1);}}
  }
  function load(){
    try{new THREE.GLTFLoader().load(URL,function(gltf){
      ['tin','copper','clay'].forEach(function(kind){var root=find(gltf.scene,'Rock_'+kind.charAt(0).toUpperCase()+kind.slice(1));
        if(root)templates[kind]=root;});
      ready=!!(templates.tin&&templates.copper&&templates.clay);
      if(!ready){failed=true;console.error('[mining_rocks_v1] semantic roots missing');return;}
      var queue=pending.splice(0);queue.forEach(function(row){install(row.host,row.kind,row.fallback);});
      console.info('[mining_rocks_v1] authored tin/copper/clay family ready');
    },undefined,function(error){failed=true;console.error('[mining_rocks_v1] GLB load failed',error);});}
    catch(error){failed=true;console.error('[mining_rocks_v1] loader unavailable',error);}
  }
  global.MiningRockVisuals={attach:attach,impact:impact,deplete:deplete,respawn:respawn,
    snapshot:function(){return {ready:ready,failed:failed,pending:pending.length,kinds:Object.keys(templates),effects:effects.length};}};
  load();
  requestAnimationFrame(animate);
})(window);
