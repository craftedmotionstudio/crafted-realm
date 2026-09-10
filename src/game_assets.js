/* ============================================================================
   CRAFTED REALM — ASSET PIPELINE
   ----------------------------------------------------------------------------
   A data-driven, Blockbench-compatible model pipeline. Every asset is authored
   as a plain object of cubes ("elements") with per-face atlas UVs plus a list
   of "bones" (animation pivots). A code-painted texture atlas supplies colour
   and baked shading — no external image files, no GUI tool required, and it
   keeps recolouring (character creation, NPC variants) fully programmatic.

   THE WORKFLOW (see ASSET_PIPELINE.md):
     1. Author a model def     -> CR_registerAsset(name, def, texFn)
     2. Paint its atlas in code -> a texFn(colors) returning a CanvasTexture
     3. Build it at runtime     -> CR_buildAsset(name, colors) -> THREE.Group
     4. Wire it to gameplay     -> NPC_TYPES { assetModel:'name' }, spawnNpc(...)

   The model def IS Blockbench format (resolution + elements with from/to/faces),
   so any def here can be pasted into a .bbmodel and edited visually in
   Blockbench (blockbench.net), then pasted back. Bones are our lightweight rig.
   ========================================================================== */

const CR_ASSETS = {};                       // name -> { def, texFn }
function CR_registerAsset(name, def, texFn){ CR_ASSETS[name] = {def, texFn}; }

/* BoxGeometry face order is +x,-x,+y,-y,+z,-z. We map Blockbench's named faces
   onto it and negate Z so a model's "north" face becomes our +z (the forward
   direction characters face). Identical convention to the legacy bb loader. */
const CR_FACE_ORDER = ['west','east','up','down','north','south'];
const CR_UNIT = 0.0605;                      // 1 Blockbench unit -> world units

function CR_cube(el, tex, scale, res){
  const sx=el.to[0]-el.from[0], sy=el.to[1]-el.from[1], sz=el.to[2]-el.from[2];
  const geo=new THREE.BoxGeometry(sx*scale, sy*scale, sz*scale);
  if(tex && el.faces){
    const uv=geo.attributes.uv;
    CR_FACE_ORDER.forEach((fk,fi)=>{
      const f=el.faces[fk]; if(!f||!f.uv) return;
      const [x1,y1,x2,y2]=f.uv;
      const u1=x1/res, u2=x2/res, v1=1-y2/res, v2=1-y1/res;
      const o=fi*4;
      uv.setXY(o, u1,v2); uv.setXY(o+1, u2,v2);
      uv.setXY(o+2, u1,v1); uv.setXY(o+3, u2,v1);
    });
  }
  const material = tex ? new THREE.MeshLambertMaterial({map:tex})
    : new THREE.MeshLambertMaterial({color: el.color!==undefined?el.color:0xffffff});   // no flatShading on Lambert (r128)
  const m=new THREE.Mesh(geo, material);
  m.castShadow=true;
  m.position.set((el.from[0]+el.to[0])/2*scale,
                 (el.from[1]+el.to[1])/2*scale,
                -(el.from[2]+el.to[2])/2*scale);
  return m;
}

/* Build a registered asset into a rigged THREE.Group. The returned group carries
   userData.parts keyed by every element name AND every bone name, plus hand grips
   for any armL/armR bones — so it plugs straight into walkAnim / tickSwing /
   refreshPlayerGear, exactly like the procedural humanoid(). */
function CR_buildAsset(name, colors){
  const entry = CR_ASSETS[name];
  if(!entry){ console.warn('[assets] unknown asset:', name); return null; }
  const def   = entry.def;
  const scale = def.scale || CR_UNIT;
  const res   = (def.resolution && def.resolution.width) || 64;
  const tex   = entry.texFn ? entry.texFn(colors||{}) : null;

  const g = new THREE.Group();
  const parts = {};
  const P = (x,y,z)=>new THREE.Vector3(x*scale, y*scale, -z*scale);

  // bone pivots first, so cubes can parent onto them
  const bones = def.bones || [];
  bones.forEach(b=>{ const pv=new THREE.Group(); pv.position.copy(P(b.pivot[0],b.pivot[1],b.pivot[2]));
    g.add(pv); parts[b.name]=pv; });

  // cubes: parent each to the first bone whose `match` regex accepts its name
  def.elements.forEach(el=>{
    const m = CR_cube(el, tex, scale, res);
    let parent = g;
    for(const b of bones){ if(b.match && new RegExp(b.match).test(el.name)){ parent = parts[b.name]; break; } }
    if(parent!==g) m.position.sub(parent.position);
    parent.add(m);
    parts[el.name] = m;
  });

  // hand grips at the end of each arm bone (for held weapons & the swing anim)
  for(const side of ['L','R']){
    const arm = parts['arm'+side];
    if(arm){ const grip=new THREE.Group();
      grip.position.set(0, (def.handY!==undefined?def.handY:-6.6)*scale, 0.12);
      arm.add(grip); parts['hand'+side]=grip; }
  }
  // a head-mount point for hats/helms, if the model named a 'head' element
  if(parts.head){ const top=new THREE.Group();
    top.position.copy(parts.head.position).y += (def.headTopOff||0.18);
    g.add(top); parts.headTop=top; }

  // standard-name aliases (e.g. map 'body' -> 'torso') so shared code finds hooks
  const al = def.aliases||{};
  for(const k in al){ if(parts[al[k]]) parts[k]=parts[al[k]]; }

  g.userData.parts = parts;
  g.userData.walkT = 0;
  g.userData.asset = name;
  return g;
}

/* ---- atlas painting helpers (reuse game2's paintedTex cache + _shadeHex) ---- */
/* fill a rectangular atlas region with a top-lit vertical gradient of `hex` */
function CR_fillRegion(x, x0,y0,w,h, hex, topLit){
  const lit = topLit===undefined?0.14:topLit;
  for(let r=0;r<h;r++){ x.fillStyle=_shadeHex(hex, (1+lit)-(r/h)*(lit+0.2)); x.fillRect(x0,y0+r,w,1); }
}
/* a faceset() pointing every face of a cube at one inset atlas region [x,y,w,h] */
function CR_faceset(region, overrides){
  const [rx,ry,rw,rh]=region;
  const uv=[rx+1, ry+1, rx+rw-1, ry+rh-1];
  const f={}; CR_FACE_ORDER.forEach(k=>{ f[k]={uv:uv.slice()}; });
  if(overrides) for(const k in overrides){ const o=overrides[k];
    f[k]={uv:[o[0]+1,o[1]+1,o[0]+o[2]-1,o[1]+o[3]-1]}; }
  return f;
}

/* ============================================================================
   ASSET #1 — "Bogling": a small, surly swamp creature. First model authored
   entirely through the pipeline (geometry-as-data + code-painted atlas).
   Demonstrates: rigged bipedal limbs, a painted face, tusks, and recolouring.
   ========================================================================== */
(function(){
  // atlas regions (px in the 64x64 atlas)
  const SKIN=[0,0,16,16], FACE=[16,0,16,16], CLOTH=[0,16,16,16],
        BELLY=[32,0,16,16], WHITE=[48,0,8,8];

  const def = {
    resolution:{width:64,height:64},
    scale: CR_UNIT,
    handY:-6.4,
    bones:[
      {name:'legL', pivot:[-1.3,7,0], match:'leg_L|foot_L'},
      {name:'legR', pivot:[ 1.3,7,0], match:'leg_R|foot_R'},
      {name:'armL', pivot:[-4.3,14.2,0], match:'arm_L'},
      {name:'armR', pivot:[ 4.3,14.2,0], match:'arm_R'},
    ],
    elements:[
      // legs + flat feet
      {name:'leg_L',  from:[-2.4,0,-1.4], to:[-0.3,7.2,1.4], faces:CR_faceset(SKIN)},
      {name:'leg_R',  from:[ 0.3,0,-1.4], to:[ 2.4,7.2,1.4], faces:CR_faceset(SKIN)},
      {name:'foot_L', from:[-2.6,0,-2.6], to:[-0.2,1.3,1.6], faces:CR_faceset(CLOTH)},
      {name:'foot_R', from:[ 0.2,0,-2.6], to:[ 2.6,1.3,1.6], faces:CR_faceset(CLOTH)},
      // loincloth + pot-belly torso
      {name:'loin',   from:[-3.4,5.6,-2.4], to:[3.4,9,2.4],  faces:CR_faceset(CLOTH)},
      {name:'torso',  from:[-3.3,8.4,-2.5], to:[3.3,15,2.5], faces:CR_faceset(BELLY,{north:BELLY})},
      // arms
      {name:'arm_L',  from:[-5.4,7.6,-1.3], to:[-3.3,14.6,1.3], faces:CR_faceset(SKIN)},
      {name:'arm_R',  from:[ 3.3,7.6,-1.3], to:[ 5.4,14.6,1.3], faces:CR_faceset(SKIN)},
      // big head with a painted face on the front (+z / north)
      {name:'head',   from:[-3.5,15,-2.9], to:[3.5,21.6,2.7], faces:CR_faceset(SKIN,{north:FACE})},
      // ears + lower tusks
      {name:'ear_L',  from:[-4.8,18,-0.6], to:[-3.5,20.4,0.7], faces:CR_faceset(SKIN)},
      {name:'ear_R',  from:[ 3.5,18,-0.6], to:[ 4.8,20.4,0.7], faces:CR_faceset(SKIN)},
      {name:'tusk_L', from:[-1.9,15.0,2.5], to:[-1.1,16.4,3.2], faces:CR_faceset(WHITE)},
      {name:'tusk_R', from:[ 1.1,15.0,2.5], to:[ 1.9,16.4,3.2], faces:CR_faceset(WHITE)},
    ],
  };

  function tex(c){
    const skin = c.skin  || 0x6f9a4a;
    const cloth= c.cloth || 0x6b4a2f;
    const belly= c.belly || 0x9ab86a;
    const eye  = c.eye   || 0xe6e23a;
    const eyeHex = '#'+(eye>>>0).toString(16).padStart(6,'0');
    return paintedTex('bogling_'+skin+'_'+cloth+'_'+belly+'_'+eye, x=>{
      CR_fillRegion(x, 0,0,16,16, skin);     // SKIN
      CR_fillRegion(x, 16,0,16,16, skin);    // FACE base
      CR_fillRegion(x, 0,16,16,16, cloth);   // CLOTH
      CR_fillRegion(x, 32,0,16,16, belly);   // BELLY (lighter front)
      CR_fillRegion(x, 48,0,8,8, 0xe8e2d0, 0.05); // WHITE tusks
      // ---- face details, drawn inside the FACE region (16,0 .. 32,16) ----
      // sunken angry brow
      x.fillStyle=_shadeHex(skin,0.5); x.fillRect(18,5,5,1); x.fillRect(25,5,5,1);
      // glaring eyes: bright sclera + dark pupil
      x.fillStyle=eyeHex;     x.fillRect(18,6,4,3); x.fillRect(26,6,4,3);
      x.fillStyle='#100f08';  x.fillRect(20,7,2,2); x.fillRect(26,7,2,2);
      // broad flat nose shadow
      x.fillStyle=_shadeHex(skin,0.7); x.fillRect(22,9,4,2);
      // snarling mouth
      x.fillStyle=_shadeHex(skin,0.38); x.fillRect(19,12,10,1);
      x.fillStyle=_shadeHex(skin,0.6);  x.fillRect(19,13,10,1);
    });
  }

  CR_registerAsset('bogling', def, tex);
})();
