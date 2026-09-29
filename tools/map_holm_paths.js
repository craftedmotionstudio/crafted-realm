/* Top-down tile map of Tutor's Holm (v2 land) for path reviews (owner review 5, 2026-09-28): one square per tile,
 * ground by its terrain material (grass, sand, rock, creek bed, sea floor; shaded by slope), water, building floors,
 * trees and the path tiles of a paths data module (src/holm_island_paths_data.js by default, or another file given).
 * Presentation only (reads the terrain bundle, the composed walk graph and the paths data; writes one PNG).
 * Run: node tools/map_holm_paths.js <out.png> [paths module] [--px 6] [--rock-rule]
 *   --rock-rule  draw rock tiles the way the ground renderer's rock-bank rule (HolmOverhaulGround.rockTile) decides */
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'..');
const args=process.argv.slice(2),out=args[0]||'holm_paths_map.png';
const pxI=args.indexOf('--px'),PX=pxI>=0?+args[pxI+1]:6;
const pathsFile=args[1]&&!/^--/.test(args[1])?path.resolve(args[1]):path.join(ROOT,'src/holm_island_paths_data.js');
const Nav=require('../src/holm_island_nav'),Ground=require('../src/holm_overhaul_ground');
const I=require('./holm_v2_land_inputs').load();
const T=I.terrain,W=T.width,D=T.depth,S=W+1,H=T.heights,M=T.materials;
const P=require(pathsFile),tiles=P.tiles||{};
const nav=Nav.create({terrain:T,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.navBridges,arrivalFootprints:I.arrivalFootprints});
const g=nav.compile({arrival:true,garden:true});
const open=n=>n.owner==='land'||(/^b:/.test(n.owner)&&/Terrain$/.test(n.surface));
const tileKind={};g.nodes.forEach(n=>{const k=n.tx+','+n.tz;const o=open(n)?'open':n.surface==='deck'?'deck':n.owner==='arrival'?'arrival':'floor';if(!tileKind[k]||o!=='open')tileKind[k]=o});
if(args.includes('--rock-rule')){Ground.setTerrain(T);Ground.setRockBanks(true)}
const COL={0:[196,180,124],1:[112,146,62],2:[128,124,112],3:[122,106,74],4:[128,138,112]};
const img=Buffer.alloc(W*PX*D*PX*3);
function put(x,z,c){for(let j=0;j<PX;j++)for(let i=0;i<PX;i++){const o=((z*PX+j)*W*PX+(x*PX+i))*3;img[o]=c[0];img[o+1]=c[1];img[o+2]=c[2]}}
function dot(x,z,c,r){const cx=x*PX,cz=z*PX;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const X=Math.round(cx+i),Z=Math.round(cz+j);if(X<0||Z<0||X>=W*PX||Z>=D*PX)continue;const o=(Z*W*PX+X)*3;img[o]=c[0];img[o+1]=c[1];img[o+2]=c[2]}}
for(let z=0;z<D;z++)for(let x=0;x<W;x++){
 const c4=[M[z*S+x],M[z*S+x+1],M[(z+1)*S+x],M[(z+1)*S+x+1]],h4=[H[z*S+x],H[z*S+x+1],H[(z+1)*S+x],H[(z+1)*S+x+1]];
 let rockN=c4.filter(m=>m===2).length;
 if(args.includes('--rock-rule')&&Ground.rockCorner)rockN=[[x,z],[x+1,z],[x,z+1],[x+1,z+1]].filter(([a,b],i)=>c4[i]===2&&Ground.rockCorner(a,b)).length;
 let c=[0,0,0];c4.forEach((m,i)=>{const p=(m===2&&args.includes('--rock-rule')&&!(Ground.rockCorner&&Ground.rockCorner([x,x+1,x,x+1][i],[z,z,z+1,z+1][i])))?COL[1]:COL[m]||COL[1];c[0]+=p[0]/4;c[1]+=p[1]/4;c[2]+=p[2]/4});
 const sl=Math.max(...h4)-Math.min(...h4),shade=Math.max(.55,1-sl*.18);c=c.map(v=>v*shade);
 if(T.water[z*W+x])c=[52,86,140];
 const k=x+','+z,kind=tileKind[k];
 if(kind==='floor')c=[92,70,56];else if(kind==='deck')c=[150,110,70];else if(kind==='arrival')c=c.map(v=>v*.85);
 const w=tiles[k];if(w&&!T.water[z*W+x]){const pc=P.schema&&/grey/.test(P.schema)?[176,176,170]:[170,120,64];c=w>=.99?pc:c.map((v,i)=>v*.5+pc[i]*.5)}
 put(x,z,c.map(v=>Math.max(0,Math.min(255,Math.round(v)))));
 if(rockN>=2&&!w&&!T.water[z*W+x]&&!kind||(rockN>=2&&kind==='open'&&!w))dot(x+.5,z+.5,[70,70,70],Math.max(1,PX/4|0));
}
I.blockers.forEach(b=>{if(/tree|oak|pine|birch/i.test(b.id+' '+(b.asset||'')))dot(b.x,b.z,[20,60,20],Math.max(1,PX/3|0))});
// minimal PNG writer (RGB, 8 bit)
function crc32(buf){let c,crc=0xffffffff;for(let n=0;n<buf.length;n++){c=(crc^buf[n])&0xff;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crc=(crc>>>8)^c}return (crc^0xffffffff)>>>0}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([len,td,cr])}
const w=W*PX,h=D*PX,raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;img.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3)}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
fs.writeFileSync(out,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
const n=Object.keys(tiles).length,full=Object.values(tiles).filter(v=>v>=.99).length;
console.log('[HOLM PATHS MAP] '+out+' '+w+'x'+h+' path tiles '+n+' (full '+full+')');
