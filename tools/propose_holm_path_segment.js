/* Design aid for the authored grey paths of Tutor's Holm (path tiles pass, 2026-09-29): proposes a segment's centre line
 * between two points the way a 2004 map maker would draw it: straight runs along x or z, a 45-degree run only where it
 * saves real distance, few bends, every tile of the lane on open dry ground with nothing standing on it and no ground
 * decor, a step clear of tree trunks where it can, gentle slopes preferred (the terrain's graded ramps). It prints the
 * `line` to paste into src/holm_island_grey_paths_data.js; the human edits from there. Proposals are never used at
 * runtime or by the tests (the data file is the authored layout).
 * The line runs through tile corners for a 2-wide lane (w 2) and through tile centres for a 1-wide lane (w 1), the same
 * rule the data file expands (HolmIslandGreyPaths.expand).
 * Run: node tools/propose_holm_path_segment.js <x,z> <x,z> [--w 2] [--turn 5] [--via x,z ...] [--allow x,z;x,z] [--decor cost]
 *   the points are the line's ends (corners for w 2, tile centres for w 1) */
'use strict';
const F=require('./holm_path_tiles_facts');
const Paths=require('../src/holm_island_grey_paths_data.js');
const {key}=F;
const DIRS=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
class Heap{constructor(){this.a=[]}push(p,v){const a=this.a;a.push([p,v]);let i=a.length-1;while(i>0){const j=(i-1)>>1;if(a[j][0]<=a[i][0])break;[a[i],a[j]]=[a[j],a[i]];i=j}}
 pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;[a[i],a[m]]=[a[m],a[i]];i=m}}return top}get size(){return this.a.length}}
function propose(A,B,opts){
 opts=opts||{};const w=opts.w||2,turn=opts.turn==null?5:opts.turn,allow=new Set(opts.allow||[]);
 const decorCost=opts.decor==null?null:+opts.decor;   // ground decor: forbidden unless a cost is given (it would have to be taken up)
 const ok=(x,z)=>allow.has(key(x,z))||(F.free(x,z)&&(decorCost!==null||!F.decorAt.has(key(x,z))));
 // the lane tiles a centre-line point covers: w 2 -> the 2x2 round a corner; w 1 -> the tile under a centre
 const cover=(px,pz)=>w===2?[[px-1,pz-1],[px,pz-1],[px-1,pz],[px,pz]]:[[Math.floor(px),Math.floor(pz)]];
 // every tile free, and no cliff inside the lane (each pair of neighbouring lane tiles joined by the walk graph or only a
 // small step apart: HolmPathTilesFacts.smooth)
 const fits=(px,pz)=>{const c=cover(px,pz);if(!c.every(([x,z])=>ok(x,z)))return false;if(c.length<4)return true;
  return F.smooth(c[0][0],c[0][1],c[1][0],c[1][1])&&F.smooth(c[2][0],c[2][1],c[3][0],c[3][1])&&F.smooth(c[0][0],c[0][1],c[2][0],c[2][1])&&F.smooth(c[1][0],c[1][1],c[3][0],c[3][1])};
 const H=F.T.heights,S=F.T.width+1,hAt=(px,pz)=>w===2?H[pz*S+px]:(H[Math.floor(pz)*S+Math.floor(px)]+H[Math.ceil(pz)*S+Math.ceil(px)])/2;
 const soft=(px,pz)=>cover(px,pz).reduce((a,[x,z])=>a+(F.nearTrunk.has(key(x,z))?.4:0)+(decorCost&&F.decorAt.has(key(x,z))&&!allow.has(key(x,z))?decorCost:0),0);
 const off=w===2?0:.5,sk=(px,pz,d)=>px+','+pz+','+d;
 const start=[A[0],A[1]],goal=[B[0],B[1]];
 if(!fits(...start))console.warn('start does not fit: '+start);if(!fits(...goal))console.warn('goal does not fit: '+goal);
 const dist=new Map(),prev=new Map(),h=new Heap();
 for(let d=0;d<8;d++){dist.set(sk(start[0],start[1],d),0);h.push(0,[start[0],start[1],d,true])}
 let end=null;
 while(h.size){const [c,[px,pz,d,first]]=h.pop();const k=sk(px,pz,d);if(c>dist.get(k))continue;
  if(Math.abs(px-goal[0])<1e-9&&Math.abs(pz-goal[1])<1e-9){end=k;break}
  DIRS.forEach(([dx,dz],nd)=>{const nx=px+dx,nz=pz+dz;if(!fits(nx,nz))return;const diag=dx&&dz;
   // a 45-degree step also covers the tiles between (the band is 3 tiles a row)
   if(diag&&!(fits(px+dx,pz)||fits(px,pz+dz)))return;
   if(w===1&&!(diag?false:F.smooth(Math.floor(px),Math.floor(pz),Math.floor(nx),Math.floor(nz))))return;   // a 1-wide lane steps along joined edges only
   let step=(diag?1.5:1)+soft(nx,nz)+3*Math.abs(hAt(nx,nz)-hAt(px,pz));
   if(!first&&nd!==d){const a=Math.abs(nd-d)%8,right=(d<4)===(nd<4);step+=turn*(right&&a===2?1.4:1)}
   const nk=sk(nx,nz,nd),t=c+step;if(!dist.has(nk)||t<dist.get(nk)){dist.set(nk,t);prev.set(nk,k);h.push(t,[nx,nz,nd,false])}})}
 if(!end)return null;
 const pts=[];for(let k=end;k!==undefined;k=prev.get(k)){const [x,z]=k.split(',').map(Number);if(!pts.length||pts[pts.length-1][0]!==x||pts[pts.length-1][1]!==z)pts.push([x,z])}
 pts.reverse();
 // keep the bends only
 let line=[pts[0]];for(let i=1;i<pts.length-1;i++){const a=pts[i-1],b=pts[i],c=pts[i+1];if((b[0]-a[0])!==(c[0]-b[0])||(b[1]-a[1])!==(c[1]-b[1]))line.push(b)}line.push(pts[pts.length-1]);
 // the lane's ends reach the end cells' outer tiles: each end point steps out one along its run where those tiles fit
 const Paths=require('../src/holm_island_grey_paths_data.js');
 const fitsAll=l=>Paths.expand({w,line:l}).every(([x,z])=>ok(x,z));
 const ext=opts.extend===false?{first:false,last:false}:Object.assign({first:true,last:true},opts.extend||{});
 if(line.length>=2){
  const out=(a,b)=>[a[0]+Math.sign(a[0]-b[0]),a[1]+Math.sign(a[1]-b[1])];
  let l=[out(line[0],line[1])].concat(line.slice(1));if(ext.first&&fitsAll(l))line=l;
  l=line.slice(0,-1).concat([out(line[line.length-1],line[line.length-2])]);if(ext.last&&fitsAll(l))line=l}
 return {line,cost:+dist.get(end).toFixed(2),steps:pts.length-1};
}
module.exports={propose};
if(require.main===module){
 const a=process.argv.slice(2),pt=s=>s.split(',').map(Number),opt=(n,d)=>a.includes(n)?a[a.indexOf(n)+1]:d;
 const w=+opt('--w',2),turn=+opt('--turn',5),decor=opt('--decor',null),allow=(opt('--allow','')||'').split(';').filter(Boolean);
 const vias=[];a.forEach((v,i)=>{if(v==='--via')vias.push(pt(a[i+1]))});
 const stops=[pt(a[0])].concat(vias,[pt(a[1])]);let line=[];
 for(let i=1;i<stops.length;i++){const r=propose(stops[i-1],stops[i],{w,turn,allow,decor,extend:{first:i===1,last:i===stops.length-1}});if(!r){console.log('no lane fits from '+stops[i-1]+' to '+stops[i]);process.exit(1)}line=line.length?line.concat(r.line.slice(1)):r.line}
 const tiles=Paths.expand({w,line});
 const dec=tiles.filter(([x,z])=>F.decorAt.has(key(x,z))),bad=tiles.filter(([x,z])=>!F.free(x,z)&&!allow.includes(key(x,z)));
 console.log(JSON.stringify(line)+'   // '+tiles.length+' tiles'+(dec.length?', decor on '+dec.map(t=>t.join(',')).join(' '):'')+(bad.length?', NOT FREE '+bad.map(t=>t.join(',')).join(' '):''));
}
