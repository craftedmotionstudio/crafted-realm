/* ============================================================================
   Crafted Realms — VARIANT generator for the pick-the-best selector.
   makeProcVariants(THREE, mat) -> { <itemKey>: [ ()=>Group, ... ] }.
   Variants are DIRECTION SKETCHES: user picks the best, we polish the winner.
   ========================================================================== */
function makeProcVariants(THREE, mat){
  const mk=(geo,c,x,y,z)=>{ const m=new THREE.Mesh(geo,mat(c)); m.position.set(x||0,y||0,z||0); m.castShadow=true; return m; };
  const box=(w,h,d,x,y,z,c)=> mk(new THREE.BoxGeometry(w,h,d),c,x,y,z);
  const sph=(r,x,y,z,c,seg)=> mk(new THREE.SphereGeometry(r,seg||8,Math.max(4,(seg||8)/2)),c,x,y,z);
  const cyl=(rt,rb,h,x,y,z,c,seg)=> mk(new THREE.CylinderGeometry(rt,rb,h,seg||10),c,x,y,z);
  const cone=(r,h,x,y,z,c,seg)=> mk(new THREE.ConeGeometry(r,h,seg||7),c,x,y,z);
  const octa=(r,x,y,z,c)=> mk(new THREE.OctahedronGeometry(r,0),c,x,y,z);
  const ico=(r,x,y,z,c,jit)=>{ const g=new THREE.IcosahedronGeometry(r,0); if(jit){const p=g.attributes.position; for(let i=0;i<p.count;i++){const j=1+Math.sin(i*12.9898)*0.5*jit; p.setXYZ(i,p.getX(i)*j,p.getY(i)*(j*0.92),p.getZ(i)*j);} g.computeVertexNormals();} return mk(g,c,x,y,z); };
  const lathe=(pts,c,seg,dbl)=>{ const v=pts.map(p=>new THREE.Vector2(p[0],p[1])); const m=mk(new THREE.LatheGeometry(v,seg||12),c); if(dbl)m.material.side=THREE.DoubleSide; return m; };
  const torusXZ=(r,t,c,x,y,z,seg)=>{ const m=mk(new THREE.TorusGeometry(r,t,5,seg||10),c,x,y,z); m.rotation.x=Math.PI/2; return m; };
  const grp=(...m)=>{ const g=new THREE.Group(); m.forEach(x=>x&&g.add(x)); return g; };
  const rot=(m,x,y,z)=>{ m.rotation.set(x||0,y||0,z||0); return m; };

  // palette
  const C={ bronze:0xb87a3a, gold:0xd8a838, blade:0xb9bec8, handle:0x6b4a2a, red:0xae2f22, dk:0x2a2a2e, riv:0x6f685c,
            steel:0xc2c6cf, rock:0x8a8276, copper:0xc77b4a, clay:0xb5764a, wood:0x9a6a30, woodDk:0x6e4d24, shieldWood:0xa9783a,
            tan:0xc8a25a, banana:0xe6c93a, red2:0xc23226, leaf:0x4f8a36, leafDk:0x3a6a28, bone:0xe8e0c8, feather:0xdfe4ea, shrimp:0xd98a6a };

  // ---- helm (parameterized) ----
  function helm(p){ const g=grp();
    const dome=mk(new THREE.SphereGeometry(0.22,p.seg,p.seg>8?6:5,0,6.3,0,p.crown),C.bronze,0,0.17,0); dome.scale.y=p.tall; g.add(dome);
    g.add(torusXZ(0.216,0.028,C.bronze,0,0.15,0,p.seg));
    if(p.nose) g.add(box(p.noseW,0.18,0.04,0,0.13,0.205,C.bronze));
    if(p.visor==='slit') g.add(box(0.30,0.045,0.02,0,0.235,0.20,C.dk));
    else if(p.visor==='T'){ g.add(box(0.30,0.04,0.02,0,0.235,0.205,C.dk)); g.add(box(0.05,0.17,0.02,0,0.16,0.21,C.dk)); }
    else if(p.visor==='double'){ g.add(box(0.1,0.045,0.02,0.085,0.235,0.205,C.dk)); g.add(box(0.1,0.045,0.02,-0.085,0.235,0.205,C.dk)); }
    if(p.band) g.add(torusXZ(0.219,0.016,p.bandC,0,p.bandY,0,p.seg));
    if(p.cheeks){ g.add(box(0.06,0.18,0.18,0.2,0.1,0,C.bronze)); g.add(box(0.06,0.18,0.18,-0.2,0.1,0,C.bronze)); }
    return g; }

  // ---- sword (parameterized) ----
  function sword(p){ const g=grp(cyl(0.022,0.03,p.grip,0,p.grip/2,0,C.handle));
    g.add(cyl(0.026,0.026,0.04,0,0.005,0,C.gold));                                 // pommel
    g.add(box(p.guardW,0.045,0.05,0,p.grip+0.01,0,C.gold));                        // crossguard
    const by=p.grip+0.04+p.blade/2;
    g.add(box(p.bladeW,p.blade,0.02,0,by,0,C.bronze));                             // blade
    if(p.fuller) g.add(box(p.bladeW*0.3,p.blade*0.9,0.03,0,by,0,0xcf8a40));        // fuller
    const tip=rot(cone(p.bladeW*0.7,p.tip,0,p.grip+0.04+p.blade+p.tip*0.4,0,C.bronze,4),0,Math.PI/4,0); tip.scale.z=0.4; g.add(tip);
    return g; }

  // ---- pickaxe (parameterized) ----
  function pick(p){ const g=grp(cyl(0.028,0.034,p.handle,0,p.handle/2,0,C.handle));
    const head=new THREE.Group(); head.position.y=p.handle-0.04;
    head.add(rot(mk(new THREE.CylinderGeometry(0.055,0.055,0.13,6),C.bronze,0,0,0),0,0,p.collar?0:Math.PI/2));
    if(p.style==='double'){ [1,-1].forEach(s=>{ const pk=cone(0.05,0.3,0,0,0,C.bronze,4); pk.rotation.set(0,Math.PI/4,s*Math.PI/2*1.06); pk.position.set(s*0.17,-0.02,0); head.add(pk); }); }
    else if(p.style==='adze'){ const pk=cone(0.05,0.3,0,0,0,C.bronze,4); pk.rotation.set(0,Math.PI/4,Math.PI/2*1.06); pk.position.set(0.17,-0.02,0); head.add(pk); head.add(box(0.12,0.05,0.1,-0.12,0,0,C.bronze)); }
    else { [1,-1].forEach(s=>{ const pk=cone(0.045,0.34,0,0,0,C.bronze,4); pk.rotation.set(0,Math.PI/4,s*Math.PI/2); pk.position.x=s*0.18; head.add(pk); }); } // straight
    g.add(head); return g; }

  // ---- axe (parameterized) ----
  function axe(p){ const g=grp(cyl(0.028,0.034,p.handle,0,p.handle/2,0,C.handle));
    const head=new THREE.Group(); head.position.y=p.handle-0.02;
    head.add(rot(mk(new THREE.CylinderGeometry(0.05,0.05,0.1,6),C.bronze,0,0,0),0,0,0));
    const mkBlade=s=>{ const b=mk(new THREE.CylinderGeometry(0.04,p.flare,p.bladeH,4),C.bronze,0,0,0); b.rotation.set(0,Math.PI/4,s*-Math.PI/2); b.position.x=s*0.15; b.scale.z=p.thin; return b; };
    head.add(mkBlade(1)); if(p.double) head.add(mkBlade(-1));
    g.add(head); return g; }

  // ---- pot (lathe profiles) ----
  const potProfiles={
    bulge:[[0.0001,0],[0.1,0],[0.16,0.06],[0.185,0.16],[0.15,0.26],[0.155,0.3],[0.13,0.3],[0.0001,0.27]],
    tall:[[0.0001,0],[0.09,0],[0.12,0.1],[0.13,0.3],[0.11,0.4],[0.12,0.42],[0.1,0.42],[0.0001,0.4]],
    squat:[[0.0001,0],[0.13,0],[0.2,0.08],[0.21,0.16],[0.17,0.22],[0.18,0.24],[0.15,0.24],[0.0001,0.21]],
    belly:[[0.0001,0],[0.08,0],[0.18,0.1],[0.2,0.2],[0.1,0.3],[0.12,0.34],[0.1,0.34],[0.0001,0.31]],
    urn:[[0.0001,0],[0.1,0.02],[0.17,0.12],[0.15,0.22],[0.08,0.3],[0.13,0.36],[0.11,0.36],[0.0001,0.33]],
  };
  function pot(key,handles){ const g=grp(lathe(potProfiles[key],C.clay,12,true));
    if(handles) [1,-1].forEach(s=> g.add(rot(torusXZ(0.05,0.018,C.clay,s*0.17,0.18,0,8),0,0,Math.PI/2))); return g; }

  // ---- ore style (rendered as copper; chosen style later applied to all ores) ----
  function ore(style){ const g=grp(); const c=C.copper;
    if(style==='cluster5') [[0,0.13,0,0.14],[0.16,0.1,0.05,0.1],[-0.14,0.12,-0.06,0.11],[0.05,0.24,-0.1,0.09],[-0.05,0.22,0.13,0.085]].forEach(([x,y,z,r],i)=> g.add(ico(r,x,y,z,i===2?C.rock:c,0.35)));
    else if(style==='bigrock'){ const m=ico(0.26,0,0.18,0,C.rock,0.3); m.scale.y=0.85; g.add(m); [[0.13,0.26,0.07],[-0.13,0.2,-0.06],[0.05,0.3,-0.11]].forEach(([x,y,z])=> g.add(ico(0.08,x,y,z,c,0.25))); }
    else if(style==='many') for(let i=0;i<9;i++){ const a=i/9*6.28; g.add(ico(0.06+0.03*((i*7)%3),Math.cos(a)*0.12*((i%2)+0.6),0.1+0.05*(i%3),Math.sin(a)*0.12*((i%2)+0.6), (i%3===0)?C.rock:c,0.4)); }
    else if(style==='twin'){ g.add(ico(0.16,-0.09,0.15,0,c,0.3)); g.add(ico(0.14,0.11,0.13,0.04,c,0.3)); g.add(ico(0.08,0.02,0.26,-0.08,C.rock,0.3)); }
    else { const m=ico(0.27,0,0.2,0,C.rock,0.25); m.scale.y=0.8; g.add(m); for(let i=0;i<4;i++){const a=i/4*6.28; g.add(ico(0.05,Math.cos(a)*0.16,0.18+0.08*(i%2),Math.sin(a)*0.16,c,0.2));} } // veins in matrix
    return g; }

  // ---- bar style (rendered as bronze) ----
  function bar(style){ const c=C.bronze;
    if(style==='ingot'){ const b=mk(new THREE.CylinderGeometry(0.16,0.21,0.13,4),c,0,0.085,0); b.rotation.y=Math.PI/4; b.scale.set(2.1,1,0.55); return grp(b); }
    if(style==='brick') return grp(box(0.5,0.12,0.22,0,0.07,0,c));
    if(style==='loaf'){ const m=ico(0.18,0,0.1,0,c,0.05); m.scale.set(1.6,0.55,0.7); return grp(m); }
    if(style==='stacked'){ const a=box(0.46,0.1,0.2,0,0.06,0,c); const b2=mk(new THREE.CylinderGeometry(0.14,0.19,0.1,4),c,0,0.17,0); b2.rotation.y=Math.PI/4; b2.scale.set(2.0,1,0.5); return grp(a,b2); }
    const b=mk(new THREE.CylinderGeometry(0.16,0.21,0.13,4),c,0,0.085,0); b.rotation.y=Math.PI/4; b.scale.set(2.1,1,0.55); const stamp=box(0.08,0.02,0.08,0,0.155,0,0x9a6428); return grp(b,stamp); }

  // ---- tinderbox ----
  function tbox(style){ const g=grp(box(0.22,0.1,0.16,0,0.05,0,C.handle));
    g.add(box(0.2,0.02,0.14,0,0.1,0,0x4a2e16));
    if(style==='open'){ const lid=box(0.22,0.02,0.16,0,0.16,-0.1,C.handle); lid.rotation.x=-0.7; g.add(lid); g.add(box(0.06,0.04,0.05,0.04,0.13,0.02,C.steel)); g.add(box(0.05,0.04,0.04,-0.05,0.13,-0.02,C.dk)); }
    else if(style==='closed'){ g.add(box(0.23,0.06,0.17,0,0.13,0,C.handle)); g.add(box(0.24,0.02,0.18,0,0.1,0,C.bronze)); }
    else if(style==='ajar'){ const lid=box(0.22,0.02,0.16,0,0.14,-0.05,C.handle); lid.rotation.x=-0.35; g.add(lid); g.add(box(0.06,0.04,0.05,0.04,0.13,0.02,C.steel)); }
    else if(style==='flint'){ const lid=box(0.22,0.02,0.16,0,0.16,-0.1,C.handle); lid.rotation.x=-0.7; g.add(lid); g.add(box(0.08,0.05,0.06,0,0.13,0,C.dk)); g.add(box(0.05,0.03,0.04,0.06,0.14,0.03,C.steel)); }
    else { g.add(box(0.23,0.05,0.17,0,0.135,0,C.handle)); g.add(box(0.05,0.06,0.05,0,0.18,0,C.bronze)); } // latched
    return g; }

  // ---- shield ----
  function shield(shape){ const g=new THREE.Group(); const sh=new THREE.Shape();
    if(shape==='round'){ for(let i=0;i<=16;i++){const a=Math.PI/2+i/16*Math.PI*2; (i===0?sh.moveTo:sh.lineTo).call(sh,Math.cos(a)*0.26,Math.sin(a)*0.26);} }
    else if(shape==='kite'){ sh.moveTo(-0.2,0.32);sh.lineTo(0.2,0.32);sh.lineTo(0.18,0);sh.quadraticCurveTo(0,-0.5,-0.18,0);sh.lineTo(-0.2,0.32); }
    else if(shape==='heater'){ sh.moveTo(-0.22,0.3);sh.lineTo(0.22,0.3);sh.lineTo(0.22,-0.08);sh.quadraticCurveTo(0,-0.42,-0.22,-0.08);sh.lineTo(-0.22,0.3); }
    else if(shape==='square'){ sh.moveTo(-0.22,0.3);sh.lineTo(0.22,0.3);sh.lineTo(0.22,-0.28);sh.lineTo(-0.22,-0.28);sh.lineTo(-0.22,0.3); }
    else { sh.moveTo(-0.24,0.28);sh.lineTo(0.24,0.28);sh.lineTo(0.18,-0.1);sh.quadraticCurveTo(0,-0.4,-0.18,-0.1);sh.lineTo(-0.24,0.28); } // wide
    const body=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.06,bevelEnabled:false}),mat(C.shieldWood)); body.castShadow=true; g.add(body);
    [-0.085,0.085].forEach(x=> g.add(box(0.014,0.45,0.006,x,0.06,0.063,C.woodDk)));
    g.add(mk(new THREE.SphereGeometry(0.06,8,5,0,6.3,0,1.6),C.steel,0,0.08,0.062));
    [[-0.16,0.22],[0.16,0.22],[-0.16,-0.04],[0.16,-0.04]].forEach(([x,y])=> g.add(sph(0.02,x,y,0.06,C.steel,5)));
    g.position.y=0.42; g.rotation.x=Math.PI/2; const w=new THREE.Group(); w.add(g); return w; }

  // ---- produce / organic ----
  function banana(curve,col,tips){ const g=grp(); const N=8; for(let i=0;i<N;i++){ const t=i/(N-1),a=-curve+t*curve*2;
      const r=0.078*(1-Math.pow(Math.abs(t-0.45)*2,1.6)*0.72), c=(tips&&(i===0||i===N-1))?0x6a4a1a:col;
      const s=cyl(r,r,0.1,Math.sin(a)*0.3,0.18+Math.cos(a)*0.07,0,c,5); s.rotation.z=-a; g.add(s);} return g; }
  function potato(jit,eyes,sx){ const g=grp(); const m=ico(0.22,0,0.16,0,C.tan,jit); m.scale.set(sx,0.82,1); g.add(m);
    for(let i=0;i<eyes;i++){ const a=i/eyes*6.28; g.add(sph(0.02,Math.cos(a)*0.14,0.16+0.05*(i%2),Math.sin(a)*0.12,0x8a6a30,5)); } return g; }
  function tomato(rib,calyx){ const g=grp(); const b=sph(0.21,0,0.18,0,C.red2,rib?12:8); b.scale.set(1.05,0.8,1.05); g.add(b);
    g.add(sph(0.06,0,0.28,0,0x8f2018,6)); g.add(cyl(0.012,0.018,0.06,0,0.34,0,C.leafDk));
    for(let i=0;i<calyx;i++){ const a=i/calyx*6.28; g.add(rot(cone(0.035,0.13,Math.cos(a)*0.07,0.32,Math.sin(a)*0.07,C.leaf),0.7*Math.cos(a),0,0.7*Math.sin(a))); } return g; }
  function bones(knob,cnt){ const g=grp(); const bone=(x,z,rz)=>{ const b=new THREE.Group(); b.add(cyl(0.027,0.027,0.3,0,0,0,C.bone));
      [0.15,-0.15].forEach(y=>{ b.add(sph(knob,0.032,y,0,C.bone,6)); b.add(sph(knob,-0.032,y,0,C.bone,6)); }); b.position.set(x,0.06,z); b.rotation.z=rz; return b; };
    g.add(bone(-0.03,0.02,0.5)); g.add(bone(0.05,-0.02,-0.45)); if(cnt>2) g.add(bone(0.0,0.1,0.05)); return g; }
  function feather(col,curve){ const g=grp(); rot(g,0,0,curve);
    const vane=cone(0.085,0.44,0,0.22,0,col,6); vane.scale.set(1,1,0.16); g.add(vane);
    g.add(cyl(0.006,0.011,0.5,0,0.18,0.001,0x8a8270));
    [0.3,0.2,0.1].forEach((y,i)=>{ const b=box(0.11-i*0.02,0.01,0.008,0,y,0.012,col); b.rotation.y=0.45; g.add(b); const b2=b.clone(); b2.rotation.y=-0.45; g.add(b2); }); return g; }
  function shrimp(cnt,curl){ const g=grp(); for(let k=0;k<cnt;k++){ const s=new THREE.Group();
      for(let j=0;j<7;j++){ const a=-curl+j*(curl*2/6); s.add(sph(0.05*(1-j*0.1), Math.sin(a)*0.14, 0.1+Math.cos(a)*0.05, 0, j===0?0xa85436:C.shrimp,6)); }
      const tf=cone(0.05,0.07,Math.sin(curl)*0.14,0.1+Math.cos(curl)*0.05,0,0xcf7e5e,3); tf.scale.z=0.3; tf.rotation.z=-curl; s.add(tf);
      s.position.set(k*0.14-(cnt-1)*0.07,0,k*0.05); s.rotation.y=k*1.3; g.add(s);} return g; }

  return {
    bronzeMedHelm:[
      ()=>helm({seg:8,crown:1.55,tall:0.95,nose:1,noseW:0.09,visor:'slit',band:1,bandC:C.red,bandY:0.22,cheeks:1}),  // chosen (v5)
      ()=>helm({seg:12,crown:1.6,tall:1.18,nose:1,noseW:0.07,visor:'T',band:0,cheeks:0}),
      ()=>helm({seg:6,crown:1.4,tall:1.05,nose:1,noseW:0.1,visor:'slit',band:1,bandC:C.bronze,bandY:0.14,cheeks:1}),
      ()=>helm({seg:10,crown:1.3,tall:1.25,nose:0,visor:'double',band:1,bandC:C.red,bandY:0.24,cheeks:0}),
      ()=>helm({seg:8,crown:1.55,tall:0.95,nose:1,noseW:0.12,visor:'T',band:1,bandC:C.red,bandY:0.2,cheeks:1}),
    ],
    bronzeSword:[
      ()=>sword({grip:0.16,guardW:0.2,blade:0.46,bladeW:0.07,fuller:1,tip:0.18}),
      ()=>sword({grip:0.14,guardW:0.16,blade:0.5,bladeW:0.09,fuller:1,tip:0.16}),     // wider leaf
      ()=>sword({grip:0.18,guardW:0.22,blade:0.42,bladeW:0.055,fuller:0,tip:0.2}),    // narrow
      ()=>sword({grip:0.15,guardW:0.24,blade:0.54,bladeW:0.07,fuller:1,tip:0.22}),    // long
      ()=>sword({grip:0.14,guardW:0.18,blade:0.34,bladeW:0.085,fuller:0,tip:0.14}),   // stubby gladius
    ],
    bronzeDagger:[
      ()=>sword({grip:0.12,guardW:0.13,blade:0.28,bladeW:0.05,fuller:1,tip:0.12}),
      ()=>sword({grip:0.1,guardW:0.11,blade:0.24,bladeW:0.07,fuller:0,tip:0.1}),
      ()=>sword({grip:0.13,guardW:0.15,blade:0.32,bladeW:0.045,fuller:1,tip:0.14}),
      ()=>sword({grip:0.11,guardW:0.16,blade:0.26,bladeW:0.06,fuller:0,tip:0.16}),
      ()=>sword({grip:0.1,guardW:0.12,blade:0.3,bladeW:0.05,fuller:1,tip:0.1}),
    ],
    bronzePickaxe:[
      ()=>pick({handle:0.72,collar:1,style:'double'}),
      ()=>pick({handle:0.72,collar:1,style:'straight'}),
      ()=>pick({handle:0.7,collar:1,style:'adze'}),
      ()=>pick({handle:0.78,collar:1,style:'double'}),
      ()=>pick({handle:0.64,collar:0,style:'double'}),
    ],
    bronzeAxe:[
      ()=>axe({handle:0.62,flare:0.2,bladeH:0.2,thin:0.42,double:0}),
      ()=>axe({handle:0.62,flare:0.24,bladeH:0.24,thin:0.4,double:0}),   // bigger blade
      ()=>axe({handle:0.62,flare:0.18,bladeH:0.18,thin:0.42,double:1}),  // double-bit
      ()=>axe({handle:0.7,flare:0.2,bladeH:0.22,thin:0.5,double:0}),     // long handle
      ()=>axe({handle:0.58,flare:0.22,bladeH:0.16,thin:0.38,double:0}),  // hatchet
    ],
    pot:[ ()=>pot('bulge',0), ()=>pot('tall',0), ()=>pot('squat',0), ()=>pot('belly',1), ()=>pot('urn',0) ],
    copperOre:[ ()=>ore('cluster5'), ()=>ore('bigrock'), ()=>ore('many'), ()=>ore('twin'), ()=>ore('matrix') ],
    bronzeBar:[ ()=>bar('ingot'), ()=>bar('brick'), ()=>bar('loaf'), ()=>bar('stacked'), ()=>bar('stamp') ],
    tinderbox:[ ()=>tbox('open'), ()=>tbox('closed'), ()=>tbox('ajar'), ()=>tbox('flint'), ()=>tbox('latched') ],
    woodenShield:[ ()=>shield('heater'), ()=>shield('round'), ()=>shield('kite'), ()=>shield('square'), ()=>shield('wide') ],
    banana:[ ()=>banana(0.85,C.banana,1), ()=>banana(1.05,C.banana,1), ()=>banana(0.7,0xe8d24a,0), ()=>banana(0.95,0xdcc23a,1), ()=>banana(0.8,0xe6c93a,1) ],
    potato:[ ()=>potato(0.42,4,1.3), ()=>potato(0.3,3,1.1), ()=>potato(0.5,5,1.4), ()=>potato(0.35,2,1.2), ()=>potato(0.45,6,1.25) ],
    tomato:[ ()=>tomato(1,6), ()=>tomato(0,5), ()=>tomato(1,7), ()=>tomato(1,5), ()=>tomato(0,6) ],
    bones:[ ()=>bones(0.045,2), ()=>bones(0.055,2), ()=>bones(0.04,3), ()=>bones(0.05,2), ()=>bones(0.06,3) ],
    feather:[ ()=>feather(C.feather,0.18), ()=>feather(0xcfd4da,0.32), ()=>feather(0xe8e0c8,0.1), ()=>feather(C.feather,0.45), ()=>feather(0xdfe4ea,0.25) ],
    rawShrimps:[ ()=>shrimp(2,0.95), ()=>shrimp(1,1.1), ()=>shrimp(3,0.8), ()=>shrimp(2,1.2), ()=>shrimp(2,0.7) ],
  };
}
if (typeof window !== 'undefined') window.makeProcVariants = makeProcVariants;
