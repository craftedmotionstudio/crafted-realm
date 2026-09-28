/* Cutaway check for a props-pass building (2026-09-28): runs the game's own cutaway rule (src/holm_cutaway_parts.js:
 * pieces() + classify()) on an exported building model, the way HolmIslandExtras prepares it at load - every mesh
 * primitive split into its connected pieces (vertices welded by position), each piece kept whole or moved to the twin
 * the cutaway clips with the walls - and lists the pieces of the named parts that the adventurer would see clipped:
 * cut pieces reaching above their storey + the building's lift (a helm floating over a clipped post, books gone from
 * a shelf). Roles by name as the runtime gives them (roof and shell cut, floors, stairs and services kept whole,
 * animated parts skipped); floor levels from the building's measured graph; the island ground from its terrain stances.
 * Run: node tools/check_holm_cutaway_props.js <model.glb> <navigation.json> <building id> [parts regex] [--json out]
 * Prints JSON {pieces, keep, cut, clipped:[...]}; exit code 1 when a named part has a clipped piece. */
'use strict';
const fs=require('fs'),path=require('path'),C=require('../src/holm_cutaway_parts.js');
const args=process.argv.slice(2),ji=args.indexOf('--json'),jsonOut=ji>=0?args.splice(ji,2)[1]:null;
const [glbPath,navPath,id,partsRe]=args,PARTS=new RegExp(partsRe||'Props');
function read(f){const b=fs.readFileSync(f),len=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+len).toString());return {j,bin:b.slice(20+len+8)}}
function acc(g,i){const a=g.j.accessors[i],bv=g.j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 const T={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];const stride=bv.byteStride||n*T.BYTES_PER_ELEMENT,out=new Array(a.count);
 for(let k=0;k<a.count;k++){const off=(bv.byteOffset||0)+(a.byteOffset||0)+k*stride;out[k]=Array.from(new T(g.bin.buffer.slice(g.bin.byteOffset+off,g.bin.byteOffset+off+n*T.BYTES_PER_ELEMENT)))}return out}
// node matrices (column-major 4x4) from TRS
function mat(n){if(n.matrix)return n.matrix.slice();const t=n.translation||[0,0,0],r=n.rotation||[0,0,0,1],s=n.scale||[1,1,1],[x,y,z,w]=r;
 return [(1-2*(y*y+z*z))*s[0],(2*(x*y+z*w))*s[0],(2*(x*z-y*w))*s[0],0,(2*(x*y-z*w))*s[1],(1-2*(x*x+z*z))*s[1],(2*(y*z+x*w))*s[1],0,(2*(x*z+y*w))*s[2],(2*(y*z-x*w))*s[2],(1-2*(x*x+y*y))*s[2],0,t[0],t[1],t[2],1]}
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
const ap=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
// the runtime's per-building rules (mirrors src/holm_island_extras.js CUTAWAY / SERVICES prefixes)
const P={keep:'Keep',bakehouse:'Kitchen',lodge:'Lodge',survival:'Survival',quarry:'Quarry',bank:'Bank',mage:'Mage',haven:'Haven',lastlight:'Lastlight',cavern:'Cavern',mill:'Mill'}[id];
const CUT={keep:{roof:/^Keep_Roof_/,clip:/^Keep_(Shell|Upper_Shell|GroundFront)_/,lift:1.25},bakehouse:{roof:/^Kitchen_(Roof|Chimney)_/,clip:/^Kitchen_(Shell|UpperShell|GroundFront|Glazing)_/,lift:.5},
 lodge:{roof:/^Lodge_(Roof|Chimney)/,clip:/^Lodge_(GroundShell|UpperShell|Glazing)/,lift:.5},cavern:{roof:/^Cavern_Roof/,clip:/^Cavern_(Shell|UpperShell|Glazing|Timber)/,lift:1.2}}[id]||{roof:new RegExp('^'+P+'_Roof'),clip:new RegExp('^'+P+'_(Shell|UpperShell|Glazing)'),lift:.5};
const src=fs.readFileSync(path.join(__dirname,'..','src','holm_island_extras.js'),'utf8'),svc=[];
{const re=/prefix:'([A-Za-z_]+)'/g;let m;while((m=re.exec(src)))if(m[1].indexOf(P+'_')===0)svc.push(m[1])}
const g=read(glbPath),nav=JSON.parse(fs.readFileSync(navPath,'utf8'));
const anim=new Set();(g.j.animations||[]).forEach(a=>a.channels.forEach(ch=>anim.add(ch.target.node)));
const parent={};g.j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>{parent[c]=i}));
const partRe=/^(Keep|Kitchen|Lodge|Survival|Quarry|Bank|Mage|Haven|Lastlight|Cavern|Mill)_/;
function world(i){let m=mat(g.j.nodes[i]);for(let p=parent[i];p!==undefined;p=parent[p])m=mul(mat(g.j.nodes[p]),m);return m}
function partName(i){for(let q=i;q!==undefined;q=parent[q])if(partRe.test(g.j.nodes[q].name||''))return g.j.nodes[q].name;return ''}
function animated(i){for(let q=i;q!==undefined;q=parent[q])if(anim.has(q))return g.j.nodes[q].name;return null}
function role(i,name){const an=animated(i);if(an&&!/Door/i.test(an))return 'skip';if(!name)return 'skip';
 if(CUT.roof.test(name)||CUT.clip.test(name))return 'cut';if(/Door/i.test(name))return 'cut';
 if(/Floor/.test(name)||/Stair|Step|Tread|Ladder|Deck|Pier|Walk/i.test(name))return 'keep';if(svc.some(p=>name.indexOf(p)===0))return 'keep';return 'process'}
const list=[],recs=[];
g.j.nodes.forEach((n,i)=>{if(n.mesh===undefined)return;const name=partName(i),rl=role(i,name);if(rl==='skip')return;const W=world(i);
 g.j.meshes[n.mesh].primitives.forEach((p,pi)=>{const pos=acc(g,p.attributes.POSITION),idx=p.indices!==undefined?acc(g,p.indices).map(v=>v[0]):null,tc=idx?idx.length/3:pos.length/3;
  const PA={count:pos.length,getX:k=>pos[k][0],getY:k=>pos[k][1],getZ:k=>pos[k][2]},pc=C.pieces(PA,idx,tc);
  const bx=[];for(let k=0;k<pc.count;k++)bx.push({min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9],tris:0});
  for(let t=0;t<tc;t++){const b=bx[pc.ids[t]];b.tris++;for(let j=0;j<3;j++){const v=ap(W,pos[idx?idx[t*3+j]:t*3+j]);for(let q=0;q<3;q++){if(v[q]<b.min[q])b.min[q]=v[q];if(v[q]>b.max[q])b.max[q]=v[q]}}}
  const mname=p.material!==undefined?g.j.materials[p.material].name:'';
  bx.forEach(b=>{b.base=rl==='process'?null:rl;list.push(b);recs.push({part:name,prim:pi,material:mname,box:b})})})});
const lv={};nav.nodes.forEach(n=>{if(!/Terrain$/.test(n.surface)){const k=Math.round(n.y*20)/20;lv[k]=(lv[k]||0)+1}});
const levels=Object.keys(lv).filter(k=>lv[k]>=3).map(Number).sort((a,b)=>a-b);
const terr=nav.nodes.filter(n=>/Terrain$/.test(n.surface));
const ground=p=>{const cx=(p.min[0]+p.max[0])/2,cz=(p.min[2]+p.max[2])/2;let best=null,d=1.2;terr.forEach(n=>{const k=Math.hypot(n.x-cx,n.z-cz);if(k<d){d=k;best=n}});return !!best&&Math.abs(best.y-p.min[1])<.3};
const cls=C.classify(list,levels,ground);
const out={model:glbPath,building:id,lift:CUT.lift,levels,pieces:0,keep:0,cut:0,clipped:[]};
recs.forEach((r,i)=>{if(!PARTS.test(r.part))return;out.pieces++;out[cls[i]]++;
 if(cls[i]==='cut'){const b=r.box,floor=levels.filter(l=>l<=b.min[1]+.1).pop();const f=floor===undefined?levels[0]:floor;
  if(b.max[1]>f+CUT.lift+.01)out.clipped.push({part:r.part,material:r.material,tris:b.tris,min:b.min.map(v=>+v.toFixed(2)),max:b.max.map(v=>+v.toFixed(2)),storey:f})}});
if(jsonOut)fs.writeFileSync(jsonOut,JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify(Object.assign({},out,{clipped:out.clipped.slice(0,40)})));
process.exit(out.clipped.length?1:0);
