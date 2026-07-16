/* ============ Hollow Well Square — functional landscape composer ============
 * Consumes the pure semantic/landscape plans and adds only the civic features
 * that need world geometry. Major building and landmark placement stays in the
 * existing town builders; this file owns no NPCs and uses no random placement.
 */
(function(){
  'use strict';

  const COLORS={wood:0x765334, woodDk:0x4f3826, stone:0x85817a, stoneDk:0x514f4b,
    parchment:0xd8c58f, iron:0x353330, soil:0x55402a, leaf:0x587a3b,
    leafLt:0x78964a, flower:0xc86a55, ash:0x4c4842};

  function material(color, opts){
    opts=opts||{};
    return new THREE.MeshLambertMaterial({color, flatShading:true, transparent:!!opts.transparent,
      opacity:opts.opacity===undefined?1:opts.opacity, depthWrite:opts.depthWrite!==false});
  }
  function ground(x,z){ return (typeof gy==='function' && gy(x,z))||0; }
  function dryOpen(x,z,pad){
    const y=typeof groundY==='function'?groundY(x,z):0;
    return y!==null && y>-0.75 && !(typeof collides==='function' && collides(x,z,pad||0.5));
  }
  function remember(id,g){
    WORLD.squareFeatures=WORLD.squareFeatures||[];
    g.userData=g.userData||{}; g.userData.featureId=id;
    WORLD.squareFeatures.push(g); return g;
  }
  function placeGroup(id,g,x,z,rot){
    g.position.set(x,ground(x,z),z); g.rotation.y=rot||0;
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    scene.add(g); return remember(id,g);
  }

  function bench(item,x,z){
    if(!dryOpen(x,z,0.8) || !Buildkit.furniture || !Buildkit.furniture.bench) return null;
    const g=Buildkit.furniture.bench(Buildkit); g.scale.x=1.45;
    const target=item.facing&&item.facing.target;
    const rot=target?Math.atan2(target[0]-item.at[0],target[1]-item.at[1]):0;
    placeGroup(item.id,g,x,z,rot);
    WORLD.colliders.push({type:'circle',x,z,r:0.85});
    return g;
  }

  function noticeboard(item,x,z){
    if(!dryOpen(x,z,0.7)) return null;
    const g=new THREE.Group(), wood=material(COLORS.wood), dark=material(COLORS.woodDk);
    for(const px of [-0.58,0.58]){
      const p=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.85,0.12),dark); p.position.set(px,0.92,0); g.add(p);
    }
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.55,1.0,0.12),wood); board.position.set(0,1.35,0); g.add(board);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.82,0.13,0.38),dark); cap.position.set(0,1.92,0); cap.rotation.z=-0.04; g.add(cap);
    const notes=[[-0.36,1.53,0.071,0.34,0.30],[0.24,1.56,0.071,0.44,0.25],[-0.18,1.16,0.071,0.42,0.27],[0.35,1.18,0.071,0.30,0.34]];
    notes.forEach((n,i)=>{ const q=new THREE.Mesh(new THREE.PlaneGeometry(n[3],n[4]),material(i===1?0xcab87f:COLORS.parchment));
      q.position.set(n[0],n[1],n[2]); g.add(q); });
    g.userData={kind:'signpost',name:'Town noticeboard',label:'Read <b>Town notices</b>',boards:[
      {text:'Market day runs from dawn until the lamps are lit'},
      {text:'Travelers should report humming stones west of town'},
      {text:'The southern bridge road is open — carry food and a blade'}]};
    const rot=-0.72;
    placeGroup(item.id,g,x,z,rot); WORLD.clickables.push(g);
    WORLD.colliders.push({type:'circle',x,z,r:0.58});
    return g;
  }

  function planter(item,x,z){
    if(!dryOpen(x,z,0.75)) return null;
    const g=new THREE.Group();
    const box=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.48,0.85),material(COLORS.stone)); box.position.y=0.24; g.add(box);
    const soil=new THREE.Mesh(new THREE.BoxGeometry(1.42,0.08,0.62),material(COLORS.soil)); soil.position.y=0.5; g.add(soil);
    [-0.55,-0.18,0.2,0.55].forEach((px,i)=>{
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.035,0.35,4),material(COLORS.leaf)); stem.position.set(px,0.7,(i%2?0.16:-0.12)); g.add(stem);
      const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(0.16+(i%2)*0.03,0),material(i%3?COLORS.leafLt:COLORS.flower));
      crown.position.set(px,0.9,(i%2?0.16:-0.12)); crown.scale.y=0.75; g.add(crown);
    });
    const rot=item.facing&&item.facing.value==='W'?Math.PI/2:0;
    placeGroup(item.id,g,x,z,rot); WORLD.colliders.push({type:'circle',x,z,r:0.88});
    return g;
  }

  function drain(item,x,z){
    const g=new THREE.Group();
    const inset=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.035,0.68),material(COLORS.stoneDk)); inset.position.y=0.025; g.add(inset);
    for(let i=-2;i<=2;i++){
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.045,0.58),material(COLORS.iron)); bar.position.set(i*0.14,0.055,0); g.add(bar);
    }
    return placeGroup(item.id,g,x,z,item.facing&&item.facing.value==='SE'?Math.PI/4:-Math.PI/4);
  }

  function threshold(item,index){
    const p=HollowSquareLandscape.resolvePoint(item.at), vertical=item.cardinal==='N'||item.cardinal==='S';
    const g=new THREE.Group();
    for(let i=-2;i<=2;i++){
      const slab=new THREE.Mesh(new THREE.BoxGeometry(vertical?0.52:1.0,0.04,vertical?1.0:0.52),material(i%2?0x96918a:0x817d76));
      slab.position.set(vertical?i*0.58:0,0.025,vertical?0:i*0.58); g.add(slab);
    }
    return placeGroup('threshold.'+item.cardinal.toLowerCase(),g,p.x,p.z,index*0.001);
  }

  function softNode(node){
    const p=HollowSquareLandscape.resolvePoint(node.at), g=new THREE.Group(), k=node.kind;
    if(k==='wheel_rut'||k==='ash_scuff'){
      const m=new THREE.Mesh(new THREE.CircleGeometry(0.55*node.scale,10),material(k==='ash_scuff'?COLORS.ash:0x675b49,{transparent:true,opacity:0.35,depthWrite:false}));
      m.rotation.x=-Math.PI/2; m.scale.y=0.28; m.position.y=0.03; g.add(m);
    } else if(k==='pebble_cluster'){
      [[-0.22,0],[0.1,0.12],[0.24,-0.14]].forEach((q,i)=>{ const m=new THREE.Mesh(new THREE.IcosahedronGeometry((0.10+i*0.025)*node.scale,0),material(i%2?0x8a867f:0x9a958d));
        m.position.set(q[0],0.06,q[1]); m.scale.y=0.55; g.add(m); });
    } else {
      for(let i=-1;i<=1;i++){ const stem=new THREE.Mesh(new THREE.ConeGeometry(0.055*node.scale,0.36*node.scale,4),material(k==='dry_tuft'?0x85764a:COLORS.leaf));
        stem.position.set(i*0.12,0.18*node.scale,(i%2)*0.08); stem.rotation.z=i*0.12; g.add(stem); }
      if(k==='small_flower'){ const f=new THREE.Mesh(new THREE.IcosahedronGeometry(0.11*node.scale,0),material(COLORS.flower)); f.position.set(0,0.42*node.scale,0); g.add(f); }
    }
    return placeGroup(node.id,g,p.x,p.z,0);
  }

  function programFeature(id,builder){
    const s=HollowSquareData.resolveSocket(id); if(!s) return null;
    return builder(s.x,s.z,s);
  }

  function build(){
    if(typeof scene==='undefined'||typeof THREE==='undefined'||typeof WORLD==='undefined') return false;
    if(typeof running==='undefined'||!running||!WORLD.grounds||!WORLD.grounds.length) return false;
    if(typeof HollowSquareData==='undefined'||typeof HollowSquareLandscape==='undefined'||typeof Buildkit==='undefined') return false;
    if(!WORLD.landmarks||!WORLD.landmarks.hollowWell) return false;
    if(WORLD._hollowSquareComposed) return true;
    WORLD._hollowSquareComposed=true; WORLD.squareFeatures=[];

    HollowSquareLandscape.thresholds.forEach(threshold);
    // Gameplay anchors win any close-placement contest with decorative furniture.
    programFeature('social.cooking_fire',(x,z)=>{
      if(typeof makeCampfire!=='function'||!dryOpen(x,z,0.8)) return null;
      const g=makeCampfire(x,z); if(g) remember('social.cooking_fire',g); return g;
    });
    programFeature('service.signpost',(x,z)=>{
      if(typeof makeSignpost!=='function'||!dryOpen(x,z,0.55)) return null;
      const g=makeSignpost(x,z,[{text:'Stonereach',ang:0.2},{text:'Mirrorpond',ang:1.0},{text:'Hollow Well',ang:-2.3}]);
      if(g) remember('service.signpost',g); return g;
    });
    HollowSquareLandscape.furnishings.forEach(item=>{
      const p=HollowSquareLandscape.resolvePoint(item.at);
      if(item.role==='seating') bench(item,p.x,p.z);
      else if(item.role==='noticeboard') noticeboard(item,p.x,p.z);
      else if(item.role==='planter') planter(item,p.x,p.z);
      else if(item.role==='drain') drain(item,p.x,p.z);
      // The existing prop_buggy pass already owns the square's delivery carts.
    });
    HollowSquareLandscape.softClusters.forEach(c=>c.nodes.forEach(softNode));

    if(typeof CollisionGrid!=='undefined'&&CollisionGrid.baked) CollisionGrid.rebakeArea(0,-1,20);
    const checks=[
      !!WORLD.landmarks.hollowWell,
      WORLD.squareFeatures.length>=12,
      HollowSquareLandscape.thresholds.length===4,
      WORLD.squareFeatures.every(g=>g&&g.position&&Number.isFinite(g.position.x)&&Number.isFinite(g.position.z))
    ];
    const passed=checks.filter(Boolean).length;
    console[passed===checks.length?'log':'error'](`[HOLLOW_SQUARE_COMPOSER] ${passed}/${checks.length} acceptance ${passed===checks.length?'ok':'FAILED'} (${WORLD.squareFeatures.length} features)`);
    return true;
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[hollow_square_composer]',e); clearInterval(iv); } },2050);
})();
