/* ============ Buildkit — the modular building generator (MAP_PIPELINE.md) ============
 * OSRS-proportioned buildings from one data line. Composes the proven
 * makeBuilding cottage shell (game2_world) with the Planes system (planes.js)
 * to produce MULTI-STOREY, WALKABLE buildings with ladders/stairs, plus
 * room-type furnishing presets so interiors read lived-in, not hollow.
 *
 *   Buildkit.house({x:10, z:20, w:7, d:6, floors:2, doorSide:'S',
 *                   color:0xn, roof:'hip'|'gable', interior:'house'})
 *
 * Proportions (research-locked): STOREY_H = 2.0 units (OSRS storeys are 1.875
 * tiles), roof rise 0.8/ring, wall thickness 0.22 (matches makeBuilding).
 * Furnishing density target ≈ 40-60% of interior tiles occupied or decorated,
 * and every room gets: a light, a floor item, a wall item, corner clutter,
 * and at least one interactable — the OSRS lived-in checklist.
 */
const Buildkit = {
  STOREY_H: 2.0,

  /* ---- small furniture builders (centrepiece scenery, 90°-snapped) ---- */
  _mat(c){ return new THREE.MeshLambertMaterial({color:c}); },
  furniture: {
    table(k){ const g=new THREE.Group(); const m=k._mat(0x7a5a34);
      const top=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.08,0.8), m); top.position.y=0.62; g.add(top);
      [[-0.5,-0.3],[0.5,-0.3],[-0.5,0.3],[0.5,0.3]].forEach(([a,b])=>{
        const l=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.6,0.08), m); l.position.set(a,0.3,b); g.add(l); });
      return g; },
    chair(k){ const g=new THREE.Group(); const m=k._mat(0x6a4e2c);
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.06,0.42), m); s.position.y=0.4; g.add(s);
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.44,0.06), m); b.position.set(0,0.62,-0.18); g.add(b);
      [[-0.16,-0.16],[0.16,-0.16],[-0.16,0.16],[0.16,0.16]].forEach(([a,c])=>{
        const l=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.4,0.06), m); l.position.set(a,0.2,c); g.add(l); });
      return g; },
    stool(k){ const g=new THREE.Group(); const m=k._mat(0x6a4e2c);
      const s=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.45,6), m); s.position.y=0.22; g.add(s); return g; },
    bench(k){ const g=new THREE.Group(); const m=k._mat(0x7a5a34);
      const s=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.07,0.36), m); s.position.y=0.38; g.add(s);
      for(const a of [-0.5,0.5]){ const l=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.36,0.3), m); l.position.set(a,0.19,0); g.add(l); }
      return g; },
    bed(k){ const g=new THREE.Group();
      const f=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.25,1.9), k._mat(0x7a5a34)); f.position.y=0.2; g.add(f);
      const mtt=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.12,1.7), k._mat(0xc8b890)); mtt.position.y=0.4; g.add(mtt);
      const p=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.12,0.42), k._mat(0xe8e2d0)); p.position.set(0,0.48,-0.6); g.add(p);
      const bl=new THREE.Mesh(new THREE.BoxGeometry(0.87,0.1,0.95), k._mat(0x8a3a30)); bl.position.set(0,0.44,0.35); g.add(bl);
      return g; },
    shelf(k){ const g=new THREE.Group(); const m=k._mat(0x6a4e2c);
      const c=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.5,0.32), m); c.position.y=0.75; g.add(c);
      for(let i=0;i<3;i++){ const s=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.05,0.26), k._mat(0x8a6a44));
        s.position.set(0,0.35+i*0.42,0.02); g.add(s);
        const it=new THREE.Mesh(new THREE.BoxGeometry(0.2+Math.abs(Math.sin(i*7))*0.3,0.22,0.18), k._mat([0xa04a3a,0x4a6a8a,0x8a8a4a][i]));
        it.position.set((i-1)*0.24,0.5+i*0.42,0.02); g.add(it); }
      return g; },
    counter(k){ const g=new THREE.Group();
      const c=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.95,0.5), k._mat(0x7a5a34)); c.position.y=0.48; g.add(c);
      const top=new THREE.Mesh(new THREE.BoxGeometry(1.08,0.07,0.58), k._mat(0x8a6a44)); top.position.y=0.98; g.add(top);
      return g; },
    barrel(k){ const g=new THREE.Group();
      const b=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.26,0.72,8), k._mat(0x7a5a34)); b.position.y=0.36; g.add(b);
      for(const y of [0.15,0.55]){ const r=new THREE.Mesh(new THREE.TorusGeometry(0.295,0.025,4,10), k._mat(0x3a3a44));
        r.position.y=y; r.rotation.x=Math.PI/2; g.add(r); }
      return g; },
    crate(k){ const g=new THREE.Group();
      const c=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.62,0.62), k._mat(0x8a6a44)); c.position.y=0.31; g.add(c);
      return g; },
    rug(k, col){ const g=new THREE.Group();
      const r=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.03,1.1), k._mat(col||0x7a3a34)); r.position.y=0.055; g.add(r);
      const tr=new THREE.Mesh(new THREE.BoxGeometry(1.75,0.028,1.25), k._mat(0xc8a84a)); tr.position.y=0.045; g.add(tr);
      return g; },
    hearth(k){ const g=new THREE.Group();
      const st=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.15,0.4), k._mat(0x6a625a)); st.position.y=0.57; g.add(st);
      const op=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.55,0.42), k._mat(0x18120c)); op.position.y=0.32; g.add(op);
      const fl=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.35,5), new THREE.MeshBasicMaterial({color:0xf07818})); fl.position.y=0.25; g.add(fl);
      const li=new THREE.PointLight(0xffa040, 0.6, 5); li.position.set(0,0.6,0.3); g.add(li);
      return g; },
    candle(k){ const g=new THREE.Group();
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.5,6), k._mat(0x8a8276)); st.position.y=0.85; g.add(st);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.18,0.62,6), k._mat(0x6a625a)); base.position.y=0.3; g.add(base);
      const fl=new THREE.Mesh(new THREE.SphereGeometry(0.06,5,4), new THREE.MeshBasicMaterial({color:0xffe6a0})); fl.position.y=1.14; g.add(fl);
      const li=new THREE.PointLight(0xffd080, 0.45, 4.5); li.position.y=1.2; g.add(li);
      return g; },
  },

  /* place one furniture piece in BUILDING-LOCAL coords (bx,bz from centre), snapped rot */
  _put(host, name, bx, bz, rot, opt){
    const b=this.furniture[name]; if(!b) return null;
    const m=b(this, opt);
    m.position.set(bx, 0.06, bz);
    if(rot) m.rotation.y=rot;
    m.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    host.add(m);
    return m;
  },

  /* ---- room-type presets: the lived-in checklist (light + floor item + wall item +
         corner clutter + an interactable), tuned per type ---- */
  furnish(group, w, d, type, worldX, worldZ){
    const k=this, P=(n,x,z,r,o)=>k._put(group, n, x, z, r, o);
    const colX=w/2-0.65, colZ=d/2-0.65;   // corner clutter positions
    if(type==='house'){
      P('table', 0.2, -0.4); P('chair', -0.7, -0.4, Math.PI/2); P('chair', 1.1, -0.4, -Math.PI/2);
      P('bed', -colX+0.25, colZ-0.45); P('shelf', colX-0.05, -colZ+0.35, Math.PI);
      P('hearth', colX-0.1, 0.2, -Math.PI/2); P('rug', 0.15, 0.75);
      P('crate', -colX, -colZ);
    } else if(type==='shop'){
      for(let i=0;i<3;i++) P('counter', -1.0+i*1.02, -d/2+1.3);
      P('shelf', -colX+0.1, colZ-0.3, 0); P('shelf', colX-0.1, colZ-0.3, 0);
      P('crate', colX, -colZ+1.9); P('crate', colX-0.4, -colZ+2.2); P('barrel', -colX, colZ-1.2);
      P('candle', colX-0.3, colZ-0.4);
    } else if(type==='pub'){
      for(let i=0;i<3;i++) P('counter', -w/2+1.25, -1.0+i*1.02, Math.PI/2);
      P('barrel', -colX, -colZ); P('barrel', -colX, -colZ+0.7);
      P('table', 0.9, -0.7); P('stool', 0.25, -0.7); P('stool', 1.55, -0.7);
      P('table', 0.9, 1.1); P('stool', 0.25, 1.1); P('stool', 1.55, 1.1); P('stool', 0.9, 1.85);
      P('hearth', colX-0.1, -0.2, -Math.PI/2); P('rug', 0, 0.2, 0, 0x4a5a3a);
    } else if(type==='bank'){
      for(let i=0;i<3;i++) P('counter', -1.0+i*1.02, -d/2+1.5);
      P('table', 0, colZ-0.7); P('candle', -colX+0.3, colZ-0.4); P('candle', colX-0.3, colZ-0.4);
      P('crate', -colX, -colZ+2.0); P('rug', 0, 0.4, 0, 0x3a4a6a);
    } else if(type==='smithy'){
      P('crate', -colX, -colZ); P('crate', -colX+0.5, -colZ); P('barrel', colX, colZ-1.0);
      P('table', colX-0.55, -0.4, Math.PI/2); P('candle', -colX+0.3, colZ-0.4);
    } else if(type==='bedroom'){   // upper-storey default — cozy, not barren
      P('bed', -colX+0.25, -colZ+0.6); P('bed', colX-0.25, -colZ+0.6);
      P('shelf', colX-0.05, colZ-0.4, Math.PI); P('rug', 0, 0.3, 0, 0x4a3a6a);
      P('candle', -colX+0.3, colZ-0.4); P('crate', -colX, colZ-0.5);
      P('table', 0, -colZ+0.55); P('stool', -0.85, -colZ+0.55); P('bench', 0, colZ-0.35);
      P('barrel', colX-0.15, 0.3); P('rug', -colX+0.6, -colZ+0.6, 0, 0x6a3a34);
    }
  },

  /* ---- the generator: a walkable multi-storey building in one call ----
     Composes makeBuilding (ground shell: walls/door/windows/framing/roof/colliders/
     interiors roof-lift) and adds: upper storey, plane-1 floor, ladder, visibility. */
  house(opts){
    const {x, z} = opts;
    const w=opts.w||6, d=opts.d||6, h=this.STOREY_H, floors=opts.floors||1;
    const color=opts.color!==undefined?opts.color:0xd8cdb4;
    const roofColor=opts.roofColor!==undefined?opts.roofColor:0xb8923e;
    // ground shell (existing generator: proven cottage look, colliders, working door).
    // capture the interiors index FIRST — makeBuilding pushes its entry synchronously,
    // so this is OUR entry no matter what else is building around us.
    const _iIdx=WORLD.interiors.length;
    const g=makeBuilding(x, z, w, d, h, color, roofColor, opts.doorSide||'S',
      Object.assign({roof:opts.roof||'hip'}, opts.shellOpts||{}));
    const baseY=(typeof gy==='function')?Math.min(gy(x-w/2,z-d/2),gy(x+w/2,z-d/2),gy(x-w/2,z+d/2),gy(x+w/2,z+d/2)):0;
    // furnish the ground room
    if(opts.interior) this.furnish(g, w, d, opts.interior, x, z);

    if(floors>=2){
      // ---- storey 2: shell walls + windows, riding ABOVE the ground walls; the
      //      makeBuilding roof group is re-seated on top of the new storey ----
      const s2=new THREE.Group(); s2.position.y=h;
      const wallMat=new THREE.MeshLambertMaterial({color:new THREE.Color(color).multiplyScalar(0.96)});
      const beam=new THREE.MeshLambertMaterial({color:0x46301d});
      const t=0.22;
      const mkw=(wx,wz,ww,wd)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(ww,h,wd), wallMat);
        m.position.set(wx,h/2,wz); m.castShadow=true; s2.add(m); };
      mkw(0, d/2-t/2, w, t); mkw(0, -d/2+t/2, w, t);
      mkw(w/2-t/2, 0, t, d); mkw(-w/2+t/2, 0, t, d);
      for(const sx of [-w/2+0.1, w/2-0.1]) for(const sz of [-d/2+0.1, d/2-0.1]){
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.18,h,0.18), beam);
        b.position.set(sx,h/2,sz); s2.add(b);
      }
      // upper windows (glowing, all four sides)
      for(const side of ['S','N','E','W']){
        const horiz=(side==='S'||side==='N'), sign=(side==='S'||side==='E')?1:-1;
        const face=(horiz?d/2:w/2)*sign + sign*0.05;
        const glass=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.85,0.06),
          new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6a4e16}));
        if(horiz) glass.position.set(0, h*0.55, face); else { glass.position.set(face, h*0.55, 0); glass.rotation.y=Math.PI/2; }
        s2.add(glass);
      }
      // storey-2 floor (the ceiling of the ground room)
      const slab=new THREE.Mesh(new THREE.BoxGeometry(w-0.2, 0.14, d-0.2),
        new THREE.MeshLambertMaterial({color:0x8a6a48}));
      slab.position.y=0.07; slab.receiveShadow=true; s2.add(slab);
      g.add(s2);
      // makeBuilding registered its roof in WORLD.interiors — hoist OUR entry atop storey 2
      const it=WORLD.interiors[_iIdx];
      if(it && it.roof){ it.roof.position.y=(it.roof.position.y||0)+h; if(it.band) it.band.position.y=(it.band.position.y||0)+h; }

      // ---- make it WALKABLE: plane-1 floor + rim + interior wall colliders + ladder ----
      const fy=baseY + h + 0.14;
      const floor=Planes.addFloor({plane:1, x, z, hw:w/2-0.35, hd:d/2-0.35, y:fy});
      Planes.edgeFence(floor);
      // furnish upstairs
      const up=new THREE.Group(); up.position.y=h; g.add(up);
      this.furnish(up, w, d, opts.upstairs||'bedroom', x, z);
      // ladder in a corner, both directions
      const lx=x + (w/2-0.9)*((opts.doorSide==='E')?-1:1), lz=z - d/2 + 0.9;
      // arrival tile steps INWARD (toward the building centre) so it always lands
      // on the registered floor rect, never on the rim
      const ax=lx + (x>lx?0.8:-0.8), az=lz + (z>lz?0.8:-0.8);
      Planes.addClimb({x:lx, z:lz, h:h+0.3, name:'Ladder',
        up:{plane:1, x:ax, z:az}, down:{plane:0, x:ax, z:az}});
      // upper storey + roof visible from outside; when ON plane 1, roof lifts via rule
      Planes.addVisibilityRule(it && it.roof ? it.roof : new THREE.Group(),
        p => p<1 ? true : false);   // hide roof while you're upstairs (or higher)
      g.userData._buildkit={floors, floor};
    }
    return g;
  },

  /* ---- auto-roof: 4-dir erosion (degenerate straight skeleton) over an arbitrary
         tile footprint — handles rectangles, L- and T-shapes. Returns a group of
         slope/hip/valley/ridge pieces. Used for big/odd structures; the cottage
         cone/prism roofs stay for simple rects. ---- */
  autoRoof(tiles, opts){   // tiles: array of [tx,tz] WORLD tile coords
    opts=opts||{};
    const rise=opts.rise||0.8, baseY=opts.y||0;
    const matR=new THREE.MeshLambertMaterial({color:opts.color||0xb8923e});
    const set=new Set(tiles.map(t=>t[0]+','+t[1]));
    const ring={}; let frontier=tiles.filter(t=>[[1,0],[-1,0],[0,1],[0,-1]].some(dv=>!set.has((t[0]+dv[0])+','+(t[1]+dv[1]))));
    let level=0; const assigned=new Set();
    while(frontier.length){
      frontier.forEach(t=>{ ring[t[0]+','+t[1]]=level; assigned.add(t[0]+','+t[1]); });
      frontier=tiles.filter(t=>!assigned.has(t[0]+','+t[1]) &&
        [[1,0],[-1,0],[0,1],[0,-1]].some(dv=>assigned.has((t[0]+dv[0])+','+(t[1]+dv[1]))));
      level++;
    }
    const G=new THREE.Group();
    const lower=(t,dv)=>{ const k2=(t[0]+dv[0])+','+(t[1]+dv[1]); return !set.has(k2) || ring[k2]<ring[t[0]+','+t[1]]; };
    for(const t of tiles){
      const L=ring[t[0]+','+t[1]], y=baseY+L*rise, cx=t[0]+0.5, cz=t[1]+0.5;
      const lows=[[0,-1],[1,0],[0,1],[-1,0]].map(dv=>lower(t,dv));   // N,E,S,W
      const n=lows.filter(Boolean).length;
      let m;
      if(n===1){                     // straight slope facing the low side
        m=new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 1.45), matR);
        m.rotation.x=(lows[0]||lows[2])? (lows[0]?-0.55:0.55) : 0;
        m.rotation.z=(lows[1]||lows[3])? (lows[1]?-0.55:0.55) : 0;
        if(lows[1]||lows[3]){ m.geometry=new THREE.BoxGeometry(1.45, 0.14, 1.02); }
        m.position.set(cx, y+rise*0.5, cz);
      } else if(n===2 && ((lows[0]&&lows[1])||(lows[1]&&lows[2])||(lows[2]&&lows[3])||(lows[3]&&lows[0]))){
        m=new THREE.Mesh(new THREE.ConeGeometry(0.95, rise, 4), matR);   // hip corner
        m.rotation.y=Math.PI/4; m.position.set(cx, y+rise*0.5, cz);
      } else if(n===2){              // opposite lows: ridge
        const alongX=lows[1]&&lows[3];
        m=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.72,1.06,3), matR);
        m.rotation.z=Math.PI/2; m.rotation.x=Math.PI/2+Math.PI/7;
        const hold=new THREE.Group(); hold.add(m);
        if(!alongX) hold.rotation.y=Math.PI/2;
        hold.position.set(cx, y+rise*0.45, cz); G.add(hold); m=null;
      } else if(n>=3){               // stub cap
        m=new THREE.Mesh(new THREE.ConeGeometry(0.85, rise*1.1, 4), matR);
        m.rotation.y=Math.PI/4; m.position.set(cx, y+rise*0.55, cz);
      } else {                       // interior: flat cap or valley — flat is fine low-poly
        m=new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.16, 1.04), matR);
        m.position.set(cx, y+rise*0.5, cz);
      }
      if(m){ m.castShadow=true; G.add(m); }
    }
    return G;
  },
};
