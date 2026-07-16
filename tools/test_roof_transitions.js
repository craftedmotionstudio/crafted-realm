#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
let failures=0;
function check(label,condition){
  if(condition) console.log('  ok  '+label);
  else { failures++; console.error('  FAIL '+label); }
}
function material(){
  return {opacity:1,transparent:false,depthWrite:true,needsUpdate:false,
    clone(){ return Object.assign({},this,{clone:this.clone}); }};
}
const original=material(),mesh={isMesh:true,material:original};
const root={visible:true,traverse(fn){fn(this);fn(mesh);}};
const ctx={console,Set,WeakMap,Map,Math}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','roof_transitions.js'),'utf8'),ctx);
const roofs=ctx.RoofTransitions;
check('shared transition API is exported',roofs&&typeof roofs.set==='function'&&typeof roofs.update==='function');
check('transition duration is quick but visible',roofs.duration===.22);
roofs.set(root,false);
roofs.update(.08);
check('fade-out keeps roof present during transition',root.visible&&mesh.material.opacity>0&&mesh.material.opacity<1);
roofs.update(.08); roofs.update(.08);
check('fade-out hides roof only after opacity reaches zero',root.visible===false&&mesh.material.opacity===0);
roofs.set(root,true);
check('fade-in restores Object3D visibility before painting',root.visible===true);
roofs.update(.08);
check('fade-in begins at partial opacity',mesh.material.opacity>0&&mesh.material.opacity<1);
roofs.update(.08); roofs.update(.08);
check('fade-in restores opaque material state',mesh.material.opacity===1&&mesh.material.transparent===false&&mesh.material.depthWrite===true);
check('roof owns a cloned material and leaves the source untouched',mesh.material!==original&&original.opacity===1);
// Same-frame arbitration: two authorities write each roof per frame; a hide
// request must hold until the next update() so a later show cannot win.
roofs.set(root,false);
roofs.set(root,true);
check('same-frame show after hide is ignored (hide wins)',roofs.status(root).target===0);
roofs.update(.08); roofs.update(.08); roofs.update(.08);
check('hide-wins transition still reaches fully hidden',root.visible===false&&mesh.material.opacity===0);
roofs.set(root,true);
check('next-frame show alone restores visibility before painting',root.visible===true&&roofs.status(root).target===1);
roofs.update(.08); roofs.update(.08); roofs.update(.08);
check('next-frame show restores opacity exactly 1',mesh.material.opacity===1&&mesh.material.transparent===false&&mesh.material.depthWrite===true);
const ownedMaterial=mesh.material;
roofs.set(root,false);
roofs.update(.08);
const midOpacity=mesh.material.opacity,midValue=roofs.status(root).value;
check('mid-fade snapshot sits between hidden and shown',midOpacity>0&&midOpacity<1);
roofs.set(root,true);
check('mid-fade reversal keeps the eased value continuous (no snap)',roofs.status(root).value===midValue&&roofs.status(root).target===1);
roofs.update(.04);
check('reversal resumes upward from the mid-fade point',mesh.material.opacity>midOpacity&&mesh.material.opacity<1);
roofs.update(.08); roofs.update(.08);
check('mid-fade reversal reuses the same cloned material (no reallocation)',mesh.material===ownedMaterial&&mesh.material.opacity===1);
// ================= updateRoofs camera-footprint locks =================
// These execute the REAL updateRoofs() from src/game2_world.js — extracted
// verbatim by brace-matching and run in the same VM context as the real
// RoofTransitions above — so they break if the production algorithm changes.
function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  if(start<0) return null;
  let depth=0;
  for(let j=source.indexOf('{',start);j<source.length;j++){
    if(source[j]==='{') depth++;
    else if(source[j]==='}'&&--depth===0) return source.slice(start,j+1);
  }
  return null;
}
const worldSrc=fs.readFileSync(path.join(__dirname,'..','src','game2_world.js'),'utf8');
const updateRoofsSrc=extractFunction(worldSrc,'updateRoofs');
check('real updateRoofs extracted and delegates to RoofTransitions',
  !!updateRoofsSrc&&updateRoofsSrc.includes('RoofTransitions.set'));
if(updateRoofsSrc) vm.runInContext(updateRoofsSrc,ctx);
check('updateRoofs is callable inside the harness context',typeof ctx.updateRoofs==='function');
function makeRoofRoot(){
  const leaf={isMesh:true,material:material()};
  return {visible:true,leaf,traverse(fn){fn(this);fn(leaf);}};
}
function settle(){ for(let i=0;i<4;i++) roofs.update(.08); }
function frame(px,pz,cx,cz,roofList,off){
  ctx.player={position:{x:px,z:pz}};
  ctx.camera={position:{x:cx,z:cz}};
  ctx.WORLD={roofs:roofList,roofsOff:!!off};
  ctx.updateRoofs();
}
// -- exact Guide Hall live-acceptance geometry: the roof footprint crosses the
//    camera->player sight line at 14 tiles (past the 7.5 proximity ring) -> hide
const hall={mesh:makeRoofRoot(),x:151,z:155,hw:13,hd:12};
frame(151,169,169.604,150.395,[hall]);
check('Guide Hall acceptance geometry targets hidden',roofs.status(hall.mesh).target===0);
settle();
check('Guide Hall acceptance geometry fully fades out',
  roofs.status(hall.mesh).value===0&&hall.mesh.visible===false&&hall.mesh.leaf.material.opacity===0);
// -- same 14-tile centre distance, but off the sight line -> shows again
frame(165,155,169.604,150.395,[hall]);
check('same-distance off-axis geometry targets shown',roofs.status(hall.mesh).target===1);
settle();
check('same-distance off-axis geometry restores opacity 1',
  roofs.status(hall.mesh).value===1&&hall.mesh.leaf.material.opacity===1);
// -- slab clip is a SEGMENT test: footprints behind the camera or beyond the
//    player never occlude; one between them does (positive control)
const behind={mesh:makeRoofRoot(),x:-10,z:0,hw:2,hd:2};
frame(10,0,0,0,[behind]);
check('footprint fully behind the camera stays shown',roofs.status(behind.mesh).target===1);
const beyond={mesh:makeRoofRoot(),x:20,z:0,hw:2,hd:2};
frame(10,0,0,0,[beyond]);
check('footprint beyond the player stays shown',roofs.status(beyond.mesh).target===1);
const between={mesh:makeRoofRoot(),x:15,z:0,hw:2,hd:2};
frame(30,0,0,0,[between]);
check('footprint crossing the sight line hides (positive control)',roofs.status(between.mesh).target===0);
// -- dimensionless legacy roofs keep the 5-tile projected-distance fallback
const legacyNear={mesh:makeRoofRoot(),x:10,z:3};
const legacyFar={mesh:makeRoofRoot(),x:10,z:6};
frame(20,0,0,0,[legacyNear,legacyFar]);
check('legacy roof within 5 tiles of the sight line hides',roofs.status(legacyNear.mesh).target===0);
check('legacy roof beyond the 5-tile fallback stays shown',roofs.status(legacyFar.mesh).target===1);
// -- the global toggle still wins over every geometric rule
settle();
frame(165,155,169.604,150.395,[hall],true);
check('roofsOff hides even a non-occluding roof',roofs.status(hall.mesh).target===0);
if(failures){ console.error('\nroof transitions: '+failures+' failure(s)'); process.exit(1); }
console.log('\nroof transitions: all locks pass');
