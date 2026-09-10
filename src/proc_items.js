/* ============================================================================
   Crafted Realms — procedural ITEM builders. Low-poly, flat-shaded, simple
   saturated colours to match the deliberately low-detail Old School RuneScape
   look (NOT realistic). Framework-agnostic: makeProcItems(THREE, mat) where
   mat(colorHex) -> a flat-shaded material. Returns { key: ()=>THREE.Group }.
   Bucket/barrel/crate live in proc_props.js; everything else is here.
   ========================================================================== */
function makeProcItems(THREE, mat){
  const C = {
    // produce / food
    tan:0xc8a25a, potato:0xc6a85e, onion:0xd8c98c, onionSkin:0xcaa84a, carrot:0xe07b22,
    leaf:0x4f8a36, leafDk:0x3a6a28, red:0xc23226, redDk:0x8f2018, yellow:0xe8c24a,
    bread:0xc89248, breadDk:0x9c6a2a, meat:0x9c4a30, white:0xeae3cf, cheese:0xe6b93e,
    mushCap:0x9c7748, mushStem:0xe7dcc4, banana:0xe6c93a,
    appleGreen:0x6aa83a, bowlTan:0xcdae5a, eggCream:0xe6d6b2, onionBody:0xd8ba84, onionTop:0xc79a52,
    cabOuter:0x6fae42, cabCore:0x9ccc5a,
    // wood / resources
    wood:0x7a5a30, woodEnd:0xc2a062, oak:0x5e4424, oakEnd:0x9c8048, bone:0xe8e0c8,
    coin:0xf0c84a, coinDk:0xc99a26, feather:0xdfe4ea, shrimp:0xd98a6a, fish:0x8fa2b0,
    // rock / ore / gem
    rock:0x8a8276, copper:0xc77b4a, tin:0xbfc4c8, iron:0x8a4a3a, coal:0x2a2a2e, gold:0xf0c84a,
    sapphire:0x2a5ac9, clay:0xb5764a,
    // metal bars / gear
    bronze:0xb87a3a, ironBar:0x9094a0, steel:0xc2c6cf, blade:0xb9bec8, bladeDk:0x8a8f99,
    handle:0x6b4a2a, leather:0x7a4a24, shieldWood:0xa9783a,
    // misc
    sack:0xcbb78a, sackTie:0x8a6a3a, glass:0x9fd6c0, ale:0xc98a2a, foam:0xf0e8d0, wax:0xe7dcc4, flame:0xffb23a,
  };
  const mk = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x||0,y||0,z||0); m.castShadow = true; return m; };
  const box = (w,h,d,x,y,z,c) => mk(new THREE.BoxGeometry(w,h,d), c, x,y,z);
  const cyl = (rt,rb,h,x,y,z,c,seg) => mk(new THREE.CylinderGeometry(rt,rb,h,seg||10), c, x,y,z);
  const sph = (r,x,y,z,c,seg) => mk(new THREE.SphereGeometry(r,seg||8,Math.max(4,(seg||8)/2)), c, x,y,z);
  const cone = (r,h,x,y,z,c,seg) => mk(new THREE.ConeGeometry(r,h,seg||7), c, x,y,z);
  const octa = (r,x,y,z,c) => mk(new THREE.OctahedronGeometry(r,0), c, x,y,z);
  const ico = (r,x,y,z,c,jit,detail) => {
    const g=new THREE.IcosahedronGeometry(r,detail||0);
    if(jit){ const p=g.attributes.position; for(let i=0;i<p.count;i++){ const j=1+Math.sin(i*12.9898)*0.5*jit; p.setXYZ(i,p.getX(i)*j,p.getY(i)*(j*0.92),p.getZ(i)*j);} g.computeVertexNormals(); }
    return mk(g,c,x,y,z);
  };
  const grp = (...m) => { const g=new THREE.Group(); m.forEach(x=>x&&g.add(x)); return g; };
  const rot = (m,x,y,z) => { m.rotation.set(x||0,y||0,z||0); return m; };

  // crop stalk used by farmed produce (small green base)
  const stalk = (h,c) => cyl(0.015,0.02,h,0,h/2,0,c||C.leafDk);

  return {
    /* ---------- PRODUCE / FOOD ---------- */
    cabbage(){ const g=grp(); g.add(ico(0.26,0,0.24,0,C.cabOuter,0.18));
      for(let i=0;i<5;i++){ const a=i/5*6.28; g.add(rot(ico(0.16,Math.cos(a)*0.14,0.30,Math.sin(a)*0.14,C.cabOuter,0.25),0,a,0)); }
      g.add(ico(0.15,0,0.40,0,C.cabCore,0.2)); return g; },
    potato(){ const g=grp(); const m=ico(0.22,0,0.16,0,C.potato,0.42); m.scale.set(1.3,0.82,1); g.add(m); // lumpier
      [[0.15,0.2,0.05],[-0.12,0.18,-0.08],[0.05,0.1,0.14],[-0.02,0.24,-0.04]].forEach(([x,y,z])=> g.add(sph(0.02,x,y,z,0x8a6a30,5))); return g; }, // eyes
    onion(){ const g=grp(); const b=sph(0.2,0,0.19,0,C.onionBody); b.scale.y=1.05; g.add(b);
      g.add(cone(0.13,0.18,0,0.34,0,C.onionTop));                 // pointed papery top (no green sprout)
      g.add(cyl(0.004,0.025,0.05,0,0.01,0,C.onionTop)); return g; },
    carrot(){ const g=grp(); g.add(rot(cone(0.13,0.5,0,0.25,0,C.carrot,8),Math.PI,0,0));
      for(let i=0;i<4;i++){ const a=i/4*6.28; g.add(rot(cone(0.02,0.22,Math.cos(a)*0.05,0.56,Math.sin(a)*0.05,C.leaf),0.25*Math.cos(a),0,0.25*Math.sin(a))); } return g; },
    tomato(){ const g=grp(); const b=sph(0.21,0,0.18,0,C.red,10); b.scale.set(1.05,0.8,1.05); g.add(b);
      g.add(sph(0.06,0,0.28,0,C.redDk,6));                                         // top indent (darker)
      g.add(cyl(0.012,0.018,0.06,0,0.34,0,C.leafDk));                              // stem nub
      for(let i=0;i<6;i++){ const a=i/6*6.28; g.add(rot(cone(0.035,0.13,Math.cos(a)*0.07,0.32,Math.sin(a)*0.07,C.leaf),0.7*Math.cos(a),0,0.7*Math.sin(a))); } return g; }, // calyx star
    apple(){ const g=grp(); const b=sph(0.2,0,0.2,0,C.appleGreen); b.scale.y=0.95; g.add(b);
      g.add(cyl(0.015,0.02,0.1,0,0.36,0,C.handle)); g.add(rot(mk(new THREE.SphereGeometry(0.07,6,4),C.leafDk,0.07,0.36,0),0,0,1.2)); return g; },
    banana(){ const g=grp(); const N=8; for(let i=0;i<N;i++){ const t=i/(N-1), a=-0.85+t*1.7;
        const r=0.078*(1-Math.pow(Math.abs(t-0.45)*2,1.6)*0.72), c=(i===0||i===N-1)?0x7a5418:C.banana;
        const s=cyl(r,r,0.1,Math.sin(a)*0.3,0.18+Math.cos(a)*0.07,0,c,5); s.rotation.z=-a; g.add(s);} return g; }, // curved tapered, brown tips
    bread(){ const m=ico(0.24,0,0.16,0,C.bread,0.12); m.scale.set(1.4,0.7,0.9); const g=grp(m); return g; },
    cookedMeat(){ const g=grp(); const m=ico(0.22,0,0.15,0,C.meat,0.18); m.scale.set(1.3,0.5,1.05); g.add(m);
      g.add(rot(cyl(0.028,0.028,0.16,0.3,0.15,0,C.bone),0,0,Math.PI/2)); g.add(sph(0.05,0.39,0.15,0,C.bone,6)); return g; }, // meat on a bone
    egg(){ const m=sph(0.16,0,0.18,0,C.eggCream); m.scale.y=1.3; return grp(m); },
    cheese(){ const g=new THREE.Group(); const sh=new THREE.Shape();
      sh.moveTo(0,0); sh.lineTo(0.4,0); sh.lineTo(0,0.34); sh.lineTo(0,0);
      const geo=new THREE.ExtrudeGeometry(sh,{depth:0.34,bevelEnabled:false});
      const m=new THREE.Mesh(geo,mat(C.cheese)); m.rotation.x=-Math.PI/2; m.position.set(-0.2,0.02,0.17); m.castShadow=true; g.add(m);
      [[-0.06,0.12,0.18],[0.06,0.07,0.34],[-0.01,0.2,0.06]].forEach(([x,y,z])=> g.add(sph(0.032,x,y,z,0xc2941c,6))); return g; }, // holes
    mushroom(){ const g=grp(cyl(0.05,0.07,0.22,0,0.11,0,C.mushStem)); const cap=sph(0.16,0,0.24,0,C.mushCap,8); cap.scale.y=0.6; g.add(cap); return g; },

    /* ---------- WOOD / RESOURCES ---------- */
    logs(){ const g=new THREE.Group();   // bundle of 3 logs (like OSRS)
      const log=(y,z,wd,ed)=>{ const l=new THREE.Group();
        l.add(cyl(0.1,0.1,0.58,0,0,0,wd,10)); l.add(cyl(0.086,0.086,0.03,0,0.29,0,ed,10)); l.add(cyl(0.086,0.086,0.03,0,-0.29,0,ed,10));
        l.rotation.z=Math.PI/2; l.position.set(0,y,z); return l; };
      g.add(log(0.1,-0.1,C.wood,C.woodEnd)); g.add(log(0.1,0.1,C.wood,C.woodEnd)); g.add(log(0.27,0,C.wood,C.woodEnd)); return g; },
    oakLogs(){ const g=this.logs(); g.traverse(o=>{ if(o.isMesh) o.material=mat(o.material.color.getHex()===C.woodEnd?C.oakEnd:C.oak); }); return g; },
    bones(){ const g=grp(); const bone=(x,z,rz)=>{ const b=new THREE.Group();
        b.add(cyl(0.027,0.027,0.3,0,0,0,C.bone));
        [0.15,-0.15].forEach(y=>{ b.add(sph(0.045,0.032,y,0,C.bone,6)); b.add(sph(0.045,-0.032,y,0,C.bone,6)); }); // knobby ends (epiphyses)
        b.position.set(x,0.06,z); b.rotation.z=rz; return b; };
      g.add(bone(-0.03,0.02,0.5)); g.add(bone(0.05,-0.02,-0.45)); return g; },
    bigBones(){ const g=this.bones(); g.scale.set(1.4,1.4,1.4); return g; },
    coins(){ const g=grp(); const pile=[[0,0,0,0.13],[0.12,0,0.05,0.1],[-0.08,0,0.08,0.09],[0.04,0,-0.1,0.08],[0.02,0.05,0.02,0.11]];
      pile.forEach(([x,y,z,r])=> g.add(cyl(r,r,0.04,x,0.02+y,z,C.coin,12))); return g; },
    feather(){ const g=grp(); rot(g,0,0,0.18);
      const vane=cone(0.085,0.44,0,0.22,0,C.feather,6); vane.scale.set(1,1,0.16); g.add(vane);  // flat teardrop vane
      g.add(cyl(0.006,0.011,0.5,0,0.18,0.001,0x8a8270));                                          // central rachis
      [0.3,0.2,0.1].forEach((y,i)=>{ const b=box(0.11-i*0.02,0.01,0.008,0,y,0.012,C.feather); b.rotation.y=0.45; g.add(b);
        const b2=b.clone(); b2.rotation.y=-0.45; g.add(b2); }); return g; },                       // barb hints
    rawShrimps(){ const g=grp(); for(let k=0;k<2;k++){ const s=new THREE.Group();
        for(let j=0;j<7;j++){ const a=-0.95+j*0.31; s.add(sph(0.05*(1-j*0.1), Math.sin(a)*0.14, 0.1+Math.cos(a)*0.05, 0, j===0?0xa85436:C.shrimp,6)); } // curled tapered body
        const tf=cone(0.05,0.07,Math.sin(0.91)*0.14,0.1+Math.cos(0.91)*0.05,0,0xcf7e5e,3); tf.scale.z=0.3; tf.rotation.z=-0.9; s.add(tf); // tail fan
        s.position.set(k*0.14-0.07,0,k*0.05); s.rotation.y=k*1.3; g.add(s);} return g; },
    rawTrout(){ const g=grp(); const b=ico(0.16,0,0.16,0,C.fish,0.12); b.scale.set(1.7,0.8,0.5); g.add(b);
      g.add(rot(cone(0.12,0.14,-0.32,0.16,0,C.fish),0,0,Math.PI/2)); return g; },
    wheat(){ const g=grp(); for(let i=0;i<7;i++){ const a=i/7*6.28, r=0.06;
        const s=cyl(0.008,0.012,0.5,Math.cos(a)*r,0.25,Math.sin(a)*r,C.yellow); s.rotation.set(Math.cos(a)*0.14,0,Math.sin(a)*0.14); g.add(s);
        g.add(cone(0.028,0.16,Math.cos(a)*r*1.8,0.54,Math.sin(a)*r*1.8,C.coinDk)); }
      g.add(cyl(0.075,0.075,0.05,0,0.14,0,C.sackTie)); return g; },
    sack(){ const g=grp(); const b=ico(0.24,0,0.22,0,C.sack,0.12); b.scale.set(1,1.15,1); g.add(b);
      g.add(cyl(0.08,0.13,0.1,0,0.42,0,C.sack)); g.add(cyl(0.06,0.06,0.04,0,0.46,0,C.sackTie)); return g; },

    /* ---------- ORE / GEM ---------- */
    _oreRock(c){ const g=grp(); // cluster of varied chunks, like OSRS ore piles
      [[0,0.13,0,0.14],[0.17,0.09,0.05,0.09],[-0.15,0.12,-0.06,0.12],[0.05,0.26,-0.1,0.08],[-0.05,0.23,0.14,0.075],[0.1,0.1,-0.14,0.07],[-0.16,0.24,0.04,0.06]]
        .forEach(([x,y,z,r],i)=>{ const m=ico(r,x,y,z, (i===2||i===5)?C.rock:c, 0.4); m.rotation.set(i*0.7,i*1.3,i*0.5); g.add(m); }); return g; },
    copperOre(){ return this._oreRock(C.copper); },
    tinOre(){ return this._oreRock(C.tin); },
    ironOre(){ return this._oreRock(C.iron); },
    coal(){ const g=grp(ico(0.2,0,0.16,0,C.coal,0.35)); g.add(ico(0.12,0.14,0.22,0.06,C.coal,0.3)); g.add(ico(0.1,-0.12,0.14,-0.08,0x36363c,0.3)); return g; },
    goldOre(){ return this._oreRock(C.gold); },
    uncutSapphire(){ const g=grp(); const m=octa(0.18,0,0.2,0,C.sapphire); m.scale.y=1.2; g.add(m); return g; },
    clay(){ const m=ico(0.22,0,0.15,0,C.clay,0.25); m.scale.y=0.7; return grp(m); },

    /* ---------- BARS ---------- */
    _bar(c){ const g=grp(); // trapezoidal cast ingot (beveled sides, wider base)
      const b=mk(new THREE.CylinderGeometry(0.16,0.21,0.13,4),c,0,0.085,0); b.rotation.y=Math.PI/4; b.scale.set(2.1,1,0.55); g.add(b); return g; },
    bronzeBar(){ return this._bar(C.bronze); },
    ironBar(){ return this._bar(C.ironBar); },
    steelBar(){ return this._bar(C.steel); },
    goldBar(){ return this._bar(C.gold); },

    /* ---------- TOOLS ---------- */
    bronzePickaxe(){ const g=grp(cyl(0.028,0.034,0.72,0,0.36,0,C.handle));
      const head=new THREE.Group();
      head.add(mk(new THREE.CylinderGeometry(0.055,0.055,0.13,6),C.bronze,0,0,0));   // eye collar around handle
      [1,-1].forEach(s=>{ const p=cone(0.05,0.3,0,0,0,C.bronze,4); p.rotation.set(0,Math.PI/4,s*Math.PI/2*1.06); p.position.set(s*0.17,-0.02,0); head.add(p); }); // faceted drooping picks
      head.position.y=0.68; g.add(head); return g; },
    bronzeAxe(){ const g=grp(cyl(0.028,0.034,0.62,0,0.31,0,C.handle));
      const head=new THREE.Group();
      head.add(mk(new THREE.CylinderGeometry(0.05,0.05,0.1,6),C.bronze,0,0,0));        // eye collar
      const blade=mk(new THREE.CylinderGeometry(0.04,0.2,0.2,4),C.bronze,0,0,0); blade.rotation.set(0,Math.PI/4,-Math.PI/2); blade.position.x=0.15; blade.scale.z=0.42; head.add(blade); // flared faceted blade
      head.position.set(0,0.6,0); g.add(head); return g; },
    hammer(){ const g=grp(cyl(0.028,0.032,0.5,0,0.25,0,C.handle)); g.add(box(0.22,0.1,0.1,0,0.52,0,C.ironBar)); return g; },
    tinderbox(){ const g=grp(box(0.22,0.1,0.16,0,0.05,0,C.handle));           // open box base
      g.add(box(0.2,0.02,0.14,0,0.1,0,0x4a2e16));                              // dark interior
      const lid=box(0.22,0.02,0.16,0,0.16,-0.1,C.handle); lid.rotation.x=-0.7; g.add(lid); // open lid tilted back
      g.add(box(0.06,0.04,0.05,0.04,0.13,0.02,C.steel)); g.add(box(0.05,0.04,0.04,-0.05,0.13,-0.02,C.coal)); return g; }, // flint + steel
    knife(){ const g=grp(cyl(0.022,0.026,0.18,0,0.09,0,C.handle)); const bl=rot(cone(0.05,0.32,0,0.34,0,C.blade,4),0,Math.PI/4,0); bl.scale.set(0.3,1,1); g.add(bl); return g; },
    chisel(){ const g=grp(cyl(0.028,0.03,0.16,0,0.08,0,C.handle)); g.add(cyl(0.018,0.022,0.2,0,0.26,0,C.blade)); return g; },
    jug(){ const v=[[0.0001,0],[0.12,0],[0.16,0.1],[0.13,0.28],[0.15,0.38],[0.0001,0.4]].map(p=>new THREE.Vector2(p[0],p[1]));
      const g=grp(mk(new THREE.LatheGeometry(v,10),C.white)); g.add(rot(mk(new THREE.TorusGeometry(0.08,0.02,5,8,Math.PI),C.white,0.17,0.24,0),0,0,-0.5)); return g; },
    pot(){ const v=[[0.0001,0],[0.1,0],[0.16,0.06],[0.185,0.16],[0.15,0.26],[0.155,0.3],[0.13,0.3],[0.0001,0.27]].map(p=>new THREE.Vector2(p[0],p[1]));
      const m=mk(new THREE.LatheGeometry(v,12),C.clay); m.material.side=THREE.DoubleSide; return grp(m); }, // bulged body + rim lip, hollow
    bowl(){ const v=[[0.0001,0],[0.2,0.02],[0.22,0.12],[0.2,0.14],[0.1,0.04],[0.0001,0.03]].map(p=>new THREE.Vector2(p[0],p[1]));
      const m=mk(new THREE.LatheGeometry(v,12),C.bowlTan); m.material.side=THREE.DoubleSide; return grp(m); },

    /* ---------- GEAR / WEAPONS ---------- */
    bronzeSword(){ const g=grp(cyl(0.022,0.032,0.16,0,0.08,0,C.handle));    // tapered grip (wider at guard)
      g.add(cyl(0.025,0.025,0.05,0,0.005,0,0xd8a838));          // yellow pommel
      g.add(box(0.2,0.045,0.05,0,0.17,0,0xd8a838));             // yellow crossguard
      g.add(box(0.045,0.055,0.06,0.1,0.17,0,0xd8a838)); g.add(box(0.045,0.055,0.06,-0.1,0.17,0,0xd8a838)); // faceted guard tips
      g.add(box(0.07,0.46,0.018,0,0.42,0,C.bronze));            // blade
      g.add(box(0.022,0.42,0.03,0,0.42,0,0xcf8a40));            // raised central fuller ridge
      const tip=rot(cone(0.05,0.18,0,0.72,0,C.bronze,4),0,Math.PI/4,0); tip.scale.z=0.36; g.add(tip); return g; }, // sharper thin tip
    bronzeDagger(){ const g=grp(cyl(0.022,0.022,0.12,0,0.06,0,C.handle)); g.add(cyl(0.022,0.022,0.03,0,0.005,0,0xd8a838)); // pommel
      g.add(box(0.13,0.035,0.045,0,0.13,0,0xd8a838));           // yellow crossguard
      g.add(box(0.05,0.28,0.018,0,0.29,0,C.bronze)); g.add(box(0.018,0.26,0.025,0,0.29,0,0xcf8a40)); // blade + fuller
      g.add(rot(cone(0.04,0.12,0,0.46,0,C.bronze,4),0,Math.PI/4,0)); return g; },
    bronzeMace(){ const g=grp(cyl(0.028,0.03,0.52,0,0.26,0,C.handle)); g.add(cyl(0.045,0.045,0.04,0,0.04,0,C.bronze)); // pommel
      const head=grp(ico(0.08,0,0,0,C.bronze,0));
      for(let i=0;i<4;i++){ const fl=box(0.14,0.13,0.025,0,0,0,C.bronze); fl.rotation.y=i/4*Math.PI*2; head.add(fl); } // flanges
      head.position.y=0.58; g.add(head); return g; },
    woodenShield(){ const g=new THREE.Group(); const sh=new THREE.Shape();
      sh.moveTo(-0.22,0.3); sh.lineTo(0.22,0.3); sh.lineTo(0.22,-0.08); sh.quadraticCurveTo(0,-0.42,-0.22,-0.08); sh.lineTo(-0.22,0.3);
      const body=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.06,bevelEnabled:false}),mat(C.shieldWood)); body.castShadow=true; g.add(body);
      [-0.085,0.085].forEach(x=> g.add(box(0.014,0.5,0.006,x,0.08,0.063,0x6e4d24)));              // plank seams (front)
      g.add(mk(new THREE.SphereGeometry(0.06,8,5,0,6.3,0,1.6),C.steel,0,0.1,0.062));              // central iron boss
      [[-0.165,0.24],[0.165,0.24],[-0.165,-0.02],[0.165,-0.02]].forEach(([x,y])=> g.add(sph(0.02,x,y,0.06,C.steel,5))); // studs
      g.add(box(0.05,0.6,0.05,0,0.02,-0.02,C.handle));                                            // back strap
      g.position.y=0.42; g.rotation.x=Math.PI/2; const w=new THREE.Group(); w.add(g); return w; },
    bronzeMedHelm(){ const g=grp();
      const dome=mk(new THREE.SphereGeometry(0.22,8,5,0,6.3,0,1.55),C.bronze,0,0.17,0); dome.scale.y=0.95; g.add(dome); // variant 5: squat & wide
      g.add(rot(mk(new THREE.TorusGeometry(0.215,0.028,5,8),C.bronze,0,0.15,0),Math.PI/2,0,0));   // brow rim
      g.add(box(0.09,0.18,0.04,0,0.13,0.205,C.bronze));     // nose guard
      g.add(box(0.30,0.045,0.02,0,0.235,0.20,C.coal));      // dark eye/visor slit
      g.add(rot(mk(new THREE.TorusGeometry(0.218,0.016,5,8),0xae2f22,0,0.22,0),Math.PI/2,0,0)); // red trim band (lower)
      g.add(box(0.06,0.18,0.18,0.2,0.1,0,C.bronze)); g.add(box(0.06,0.18,0.18,-0.2,0.1,0,C.bronze)); // cheek guards
      [[-0.17,0.21,0.07],[0.17,0.21,0.07],[0,0.35,0.03],[0.205,0.04,0.02],[-0.205,0.04,0.02]].forEach(([x,y,z])=> g.add(sph(0.018,x,y,z,C.bronzeHoop||0x6f685c,5))); // rivets
      return g; },
  };
}
if (typeof window !== 'undefined') window.makeProcItems = makeProcItems;
