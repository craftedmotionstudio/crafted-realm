#!/usr/bin/env node
/* Crafted Realm old-school texture kit (world look pass 2026-09-25). Our own procedural pixel textures in the spirit of
 * 2004 RuneScape's small tiled textures (the 2004 client drew 64-128 px textures once per tile, unfiltered): grass
 * speckle, dirt with pebbles, cobbled path, sand, rock, creek mud, water, brick, stone course, plaster, planks, beam
 * grain, thatch and roof tiles. Nothing is traced or sampled from any game: every texel comes from the seeded noise,
 * cell and stroke recipes below, so the kit is fully reproducible (same seeds -> same bytes).
 * Every texture tiles seamlessly (all noise and cells wrap on the texture size).
 * Output: assets/textures/oldschool/<name>.png + kit.json (size, mean colour, use) and a contact sheet in
 * scratchpad/holm_look_v1/kit_sheet.png (via tools/sheet_oldschool_kit.py).
 * Run: node tools/build_oldschool_textures.js */
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const OUT=path.join(__dirname,'..','assets','textures','oldschool');fs.mkdirSync(OUT,{recursive:true});

// ---------- PNG (RGB, 8 bit) ----------
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc(buf){let c=0xffffffff;for(const b of buf)c=CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function chunk(type,data){const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])}
function png(w,h,rgb){
 const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w*3;x++)raw[y*(w*3+1)+1+x]=rgb[y*w*3+x]}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

// ---------- seeded helpers (all periodic on the texture size) ----------
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function lattice(seed,n){const r=rng(seed),g=new Float32Array(n*n);for(let i=0;i<g.length;i++)g[i]=r();return g}
// periodic value noise: `cells` lattice cells across the texture
function vnoise(seed,cells){const g=lattice(seed,cells);return function(u,v){ // u,v in [0,1)
 const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
 const a=(i,j)=>g[((j%cells+cells)%cells)*cells+((i%cells+cells)%cells)];
 return (a(ix,iy)*(1-sx)+a(ix+1,iy)*sx)*(1-sy)+(a(ix,iy+1)*(1-sx)+a(ix+1,iy+1)*sx)*sy}}
function fbm(seed,base,oct){const ns=[];for(let o=0;o<oct;o++)ns.push(vnoise(seed+o*101,base<<o));return function(u,v){let s=0,a=1,t=0;for(const n of ns){s+=n(u,v)*a;t+=a;a*=.5}return s/t}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v,mix=(a,b,t)=>a+(b-a)*t;
function mixc(a,b,t){return [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)]}
function hex(h){return [(h>>16&255)/255,(h>>8&255)/255,(h&255)/255]}
class Tex{
 constructor(n){this.n=n;this.c=new Float32Array(n*n*3)}
 set(x,y,c){const n=this.n;x=((x%n)+n)%n;y=((y%n)+n)%n;const i=(y*n+x)*3;this.c[i]=c[0];this.c[i+1]=c[1];this.c[i+2]=c[2]}
 get(x,y){const n=this.n;x=((x%n)+n)%n;y=((y%n)+n)%n;const i=(y*n+x)*3;return [this.c[i],this.c[i+1],this.c[i+2]]}
 mul(x,y,k){const c=this.get(x,y);this.set(x,y,[c[0]*k,c[1]*k,c[2]*k])}
 blend(x,y,c,t){this.set(x,y,mixc(this.get(x,y),c,t))}
 fill(f){const n=this.n;for(let y=0;y<n;y++)for(let x=0;x<n;x++)this.set(x,y,f(x/n,y/n,x,y))}
 // posterise to a few levels per channel: the flat, banded look of an 8-bit-era palette texture
 quant(levels){for(let i=0;i<this.c.length;i++)this.c[i]=Math.round(clamp(this.c[i],0,1)*levels)/levels}
 bytes(){const b=Buffer.alloc(this.c.length);for(let i=0;i<b.length;i++)b[i]=Math.round(clamp(this.c[i],0,1)*255);return b}
 // detail headroom: building/tree textures are multiplied by a tint = authored colour / texture mean (Blender recipe);
 // lifting the texture so its brightest channel mean is ~.82 (no texel clipped) keeps that tint under 1 for light
 // authored colours, so light wood, plaster and leaves keep their brightness (owner review: darker Guide House floor)
 headroom(target){let mx=0,top=0;const m=this.mean();for(let i=0;i<this.c.length;i++)top=Math.max(top,this.c[i]);mx=Math.max(...m);
  const s=Math.min(target/mx,.999/top);if(s>1)for(let i=0;i<this.c.length;i++)this.c[i]*=s;return this}
 mean(){const m=[0,0,0],n=this.n*this.n;for(let i=0;i<n;i++){m[0]+=clamp(this.c[i*3],0,1);m[1]+=clamp(this.c[i*3+1],0,1);m[2]+=clamp(this.c[i*3+2],0,1)}return m.map(v=>+(v/n).toFixed(4))}
}
// periodic Voronoi: jittered cells on a gx x gy grid; returns nearest/second distance and the cell id
function voronoi(seed,gx,gy,jit){const r=rng(seed),pts=[];for(let j=0;j<gy;j++)for(let i=0;i<gx;i++)pts.push([(i+.5+(r()-.5)*jit)/gx,(j+.5+(r()-.5)*jit)/gy,r()]);
 return function(u,v){let d1=9,d2=9,id=0;for(const p of pts)for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const dx=(p[0]+ox-u)*gx,dy=(p[1]+oy-v)*gy,d=Math.sqrt(dx*dx+dy*dy);if(d<d1){d2=d1;d1=d;id=p[2]}else if(d<d2)d2=d}return {d1,d2,id}}}

// ---------- recipes ----------
// Ground textures are DETAIL textures: the terrain multiplies them by its tile colour and divides by the texture's
// mean, so they add pattern (speckle, pebbles, stones) without changing the ground's authored average colour.
const R={};
R.grass_a=()=>{const t=new Tex(64),n=fbm(11,4,3),r=rng(12);
 t.fill((u,v)=>{const k=.86+(n(u,v)-.5)*.16;return [k*.97,k,k*.9]});
 // short blade dabs: a light tip over a dark root, leaning a little
 for(let i=0;i<260;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),lean=r()<.5?0:1,dark=.78+r()*.06;
  t.mul(x,y+1,dark);t.mul(x+lean,y,dark+.04);t.blend(x+lean,y-1,[1,1,.86],.35)}
 t.quant(24);return t};
R.grass_b=()=>{const t=new Tex(64),n=fbm(21,2,3),m=vnoise(22,8),r=rng(23);
 t.fill((u,v)=>{const k=.87+(n(u,v)-.5)*.2+(m(u,v)-.5)*.06;return [k,k,k*.9]});
 for(let i=0;i<150;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,.8+r()*.08);if(r()<.4)t.mul(x+1,y,.86)}
 for(let i=0;i<22;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.blend(x,y,[1,1,.8],.45)}   // clover / seed heads
 t.quant(24);return t};
R.grass_c=()=>{const t=new Tex(64),n=fbm(31,4,2),r=rng(32);
 t.fill((u,v)=>{const q=n(u,v),k=q<.42?.8:.9;return [k*.96,k,k*.88]});
 for(let i=0;i<120;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,.82);t.mul(x,y-1,.9)}
 t.quant(20);return t};
function pebbles(t,seed,count,light,rMax){const r=rng(seed);
 for(let i=0;i<count;i++){const cx=r()*64,cy=r()*64,rad=.8+r()*rMax,c=mixc(light,[1,1,1],r()*.2),sh=.62+r()*.1;
  for(let y=Math.floor(cy-rad-1);y<=cy+rad+1;y++)for(let x=Math.floor(cx-rad-1);x<=cx+rad+1;x++){const dx=x+.5-cx,dy=y+.5-cy,d=Math.hypot(dx,dy*1.2);
   if(d<rad)t.set(x,y,mixc(c,[c[0]*.82,c[1]*.82,c[2]*.82],clamp((dy+rad)/(2*rad),0,1)));   // lit top, darker base
   else if(d<rad+1&&dy>0)t.mul(x,y,sh)}}}   // a pixel of shadow under each stone
R.dirt=()=>{const t=new Tex(64),n=fbm(41,4,3),m=vnoise(42,16);
 t.fill((u,v)=>{const k=.84+(n(u,v)-.5)*.22+(m(u,v)-.5)*.08;return [k,k*.96,k*.9]});
 pebbles(t,43,34,[.95,.94,.9],1.1);t.quant(22);return t};
R.path=()=>{const t=new Tex(64),vo=voronoi(51,5,5,.85),n=fbm(52,8,2);
 t.fill((u,v)=>{const q=vo(u,v),edge=q.d2-q.d1,k=.78+q.id*.12+(n(u,v)-.5)*.1;
  if(edge<.13)return [.64,.61,.56];   // packed earth between the cobbles
  const lit=clamp((edge-.13)*2.2,0,1)*.08;return [k+lit,k*.98+lit,k*.93+lit]});
 pebbles(t,53,14,[.9,.88,.84],.7);t.quant(22);return t};
R.sand=()=>{const t=new Tex(64),n=fbm(61,4,3),r=rng(62);
 t.fill((u,v)=>{const k=.9+(n(u,v)-.5)*.12;return [k,k*.98,k*.93]});
 for(let i=0;i<420;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.5?.9:1.07)}
 for(let i=0;i<9;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.set(x,y,[1,.98,.95]);t.mul(x,y+1,.85)}
 t.quant(24);return t};
// rough stone surface: granular noise, pits and specks, a few hairline cracks; no cell pattern, so it sits on
// modelled blocks and slabs (walls, quoins, yards) and on rocky ground without drawing a second set of joints
R.rock=()=>{const t=new Tex(64),n=fbm(71,4,4),m=vnoise(72,16),r=rng(73);
 t.fill((u,v)=>{const k=.8+(n(u,v)-.5)*.22+(m(u,v)-.5)*.1;return [k,k,k*.96]});
 for(let i=0;i<260;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.6?.84:1.1)}
 for(let i=0;i<6;i++){let x=r()*64,y=r()*64,dx=r()-.5,dy=r()-.5;for(let s=0;s<5+r()*9;s++){t.mul(Math.floor(x),Math.floor(y),.78);x+=dx+(r()-.5)*.8;y+=dy+(r()-.5)*.8}}
 t.quant(20);return t};
R.mud=()=>{const t=new Tex(64),n=fbm(81,4,3),m=vnoise(82,6);
 t.fill((u,v)=>{const k=.82+(n(u,v)-.5)*.2+(m(u,v)-.5)*.1;return [k,k*.97,k*.9]});
 pebbles(t,83,16,[.86,.85,.82],.8);t.quant(20);return t};
// Water: pale grey-blue with soft lighter swells, as the 2004 lakes and seas read (our own pattern).
R.water=()=>{const t=new Tex(64),n=fbm(91,2,3),w=vnoise(92,4);
 const deep=hex(0x767f94),mid=hex(0x80899e),light=hex(0x939cb0);
 t.fill((u,v)=>{const q=n(u,v)*.7+w((u+v*.5)%1,v)*.3;let c=mixc(deep,mid,clamp((q-.35)*5,0,1));
  const s=Math.sin((u*2+v*3+q*1.6)*Math.PI*2);return s>.86?mixc(c,light,.55):c});
 t.quant(28);return t};
// ---- building textures (full colour; the Blender recipe tints them per material) ----
R.brick=()=>{const t=new Tex(64),n=fbm(101,8,2),r=rng(102),col=[];for(let i=0;i<64;i++)col.push(.82+r()*.2);
 const mortar=[.72,.68,.6];
 t.fill((u,v,x,y)=>{const row=Math.floor(y/8),off=row%2?8:0,bx=Math.floor(((x+off)%64)/16),inRow=y%8,inCol=(x+off)%16;
  if(inRow===7||inCol===15)return mortar;const k=col[row*4+bx]*(.92+n(u,v)*.12);
  const c=[.62*k,.34*k,.24*k];return inRow===0?mixc(c,[1,.8,.7],.12):c});
 t.quant(20);return t};
R.stone_course=()=>{const t=new Tex(64),n=fbm(111,8,2),r=rng(112),mortar=[.46,.46,.43];
 // four courses of dressed blocks in irregular lengths, each block its own grey with a lit top edge and a dark foot
 const rows=[[0,16],[16,32],[32,48],[48,64]];
 rows.forEach(([y0,y1],ri)=>{let x=Math.floor(r()*12);const start=x;const cuts=[];while(x<start+64){cuts.push(x);x+=10+Math.floor(r()*14)}
  cuts.forEach((c0,i)=>{const c1=i+1<cuts.length?cuts[i+1]:start+64,k=.66+r()*.2,tint=r()*.04;
   for(let y=y0;y<y1;y++)for(let xx=c0;xx<c1;xx++){let c;
    if(y===y1-1||xx===c1-1)c=mortar;else{const q=k*(.9+n(xx/64,y/64)*.2);c=[q+tint,q+tint*.5,q*.95];if(y===y0)c=mixc(c,[1,1,1],.18);else if(y===y1-2)c=mixc(c,[0,0,0],.12)}
    t.set(xx,y,c)}})});
 t.quant(20);return t};
R.plaster=()=>{const t=new Tex(64),n=fbm(121,4,3),m=vnoise(122,16),r=rng(123);
 t.fill((u,v)=>{const k=.88+(n(u,v)-.5)*.1+(m(u,v)-.5)*.05;return [k,k*.97,k*.9]});
 for(let i=0;i<5;i++){let x=r()*64,y=r()*64;for(let s=0;s<6+r()*8;s++){t.mul(Math.floor(x),Math.floor(y),.84);x+=r()-.3;y+=1}}   // hairline cracks
 t.quant(24);return t};
R.planks=()=>{const t=new Tex(64),r=rng(131),n=vnoise(132,4),tone=[];for(let i=0;i<4;i++)tone.push(.8+r()*.2);
 // four boards (16 px) running along v, grain streaks, a dark gap and two nail heads per board end
 t.fill((u,v,x,y)=>{const b=Math.floor(x/16),ix=x%16;if(ix===15)return [.3,.21,.14];
  const grain=Math.sin((ix*.9+tone[b]*7)+Math.sin(v*Math.PI*2*2+b)*1.5)*.5+.5,k=tone[b]*(.86+grain*.1+(n(u,v)-.5)*.08);
  const c=[.62*k,.45*k,.29*k];return ix===0?mixc(c,[1,.9,.75],.12):c});
 for(let b=0;b<4;b++){const y=Math.floor(r()*60);t.set(b*16+3,y,[.25,.22,.2]);t.set(b*16+11,y,[.25,.22,.2])}
 t.quant(20);return t};
R.beam=()=>{const t=new Tex(64),n=vnoise(141,2),g=vnoise(142,32),r=rng(143);
 // long grain running along v: streak tone per column band, a gentle wobble, and two dark knots
 const band=[];for(let i=0;i<64;i++)band.push(r());
 t.fill((u,v,x,y)=>{const w=Math.round((n(u,v)-.5)*3),b=band[((x+w)%64+64)%64],k=.8+(b<.18?-.14:b>.85?.08:0)+(g(u,v)-.5)*.08;return [.55*k,.4*k,.27*k]});
 for(let i=0;i<2;i++){const cx=r()*64,cy=r()*64;for(let y=-3;y<=3;y++)for(let x=-2;x<=2;x++){const d=Math.hypot(x/2,y/3);if(d<1)t.mul(Math.floor(cx+x),Math.floor(cy+y),.72+d*.2)}}
 t.quant(20);return t};
R.thatch=()=>{const t=new Tex(64),r=rng(151),n=fbm(152,4,2);
 t.fill((u,v)=>{const k=.72+(n(u,v)-.5)*.2;return [.78*k,.66*k,.4*k]});
 // straw: many short strands running down the slope; each course of thatch ends in a darker shadow line every 16 px
 for(let i=0;i<520;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=3+Math.floor(r()*6),k=.9+r()*.35;
  for(let s=0;s<len;s++)t.set(x+(s>len/2&&r()<.3?1:0),y+s,[.8*k,.68*k,.42*k])}
 for(let c=0;c<4;c++){const y=c*16+15;for(let x=0;x<64;x++){t.mul(x,y,.7);t.mul(x,y-1,.85)}}
 t.quant(20);return t};
R.roof_tiles=()=>{const t=new Tex(64),r=rng(161),n=fbm(162,8,2),tone=[];for(let i=0;i<32;i++)tone.push(.8+r()*.24);
 // overlapping clay tiles: 8 rows of 8 px, each tile 8 px wide with a rounded lower lip and a dark gap under the row above
 t.fill((u,v,x,y)=>{const row=Math.floor(y/8),off=row%2?4:0,col=Math.floor(((x+off)%64)/8),iy=y%8,ix=(x+off)%8,k=tone[(row*8+col)%32]*(.94+n(u,v)*.1);
  let c=[.6*k,.33*k,.24*k];if(iy===0||ix===7)return [.28,.16,.12];if(iy>=6)c=mixc(c,[1,.85,.75],.1);if(iy<=1)c=mixc(c,[0,0,0],.18);return c});
 t.quant(20);return t};
// ---- trees (2004 trees: a leaf texture of lighter leaves over darker clumps and gaps, and a fissured bark) ----
function leafy(seed,base,dabs,gap,clumpScale){const t=new Tex(64),r=rng(seed),cl=fbm(seed+1,clumpScale,2);
 t.fill(()=>gap);
 for(let i=0;i<dabs;i++){const cx=r()*64,cy=r()*64,a=r()*Math.PI,rx=1.4+r()*1.8,ry=.8+r()*1,k=.78+r()*.26,ca=Math.cos(a),sa=Math.sin(a);
  for(let y=Math.floor(cy-3);y<=cy+3;y++)for(let x=Math.floor(cx-3);x<=cx+3;x++){const dx=x+.5-cx,dy=y+.5-cy,u=(dx*ca+dy*sa)/rx,v=(-dx*sa+dy*ca)/ry;
   if(u*u+v*v<=1)t.set(x,y,[base[0]*k,base[1]*k,base[2]*k])}
  t.blend(Math.floor(cx-ca),Math.floor(cy-sa),[1,1,.85],.35)}   // a lit leaf tip
 // darker clumps: whole regions of the crown sit in shade
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=cl(x/64,y/64);if(q<.45)t.mul(x,y,.62+q*.5)}
 return t}
R.leaves=()=>{const t=leafy(171,[.72,.86,.52],640,[.3,.38,.2],4);t.quant(20);return t.headroom(.82)};
R.needles=()=>{const t=new Tex(64),r=rng(181),cl=fbm(182,4,2);t.fill(()=>[.28,.36,.3]);
 for(let i=0;i<700;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=2+Math.floor(r()*4),dx=r()<.5?1:-1,k=.75+r()*.3;
  for(let s=0;s<len;s++)t.set(x+(s*dx>>1),y+s,[.62*k,.8*k,.66*k])}
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=cl(x/64,y/64);if(q<.45)t.mul(x,y,.62+q*.5)}
 t.quant(20);return t.headroom(.82)};
R.bark=()=>{const t=new Tex(64),r=rng(191),n=vnoise(192,4),g=vnoise(193,32);
 // ridges and fissures running up the trunk (v), wobbling; a couple of knots and cross cracks
 t.fill((u,v,x,y)=>{const w=x+(n(u,v)-.5)*6,f=Math.abs(Math.sin(w*Math.PI/5.3)),k=f<.28?.5:.8+(g(u,v)-.5)*.16+(f>.9?.08:0);return [.58*k,.46*k,.34*k]});
 for(let i=0;i<3;i++){const cx=r()*64,cy=r()*64;for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(x*x+y*y<=4)t.mul(Math.floor(cx+x),Math.floor(cy+y),.62)}
 for(let i=0;i<8;i++){const y=Math.floor(r()*64),x0=Math.floor(r()*64);for(let s=0;s<3;s++)t.mul(x0+s,y,.72)}
 t.quant(20);return t.headroom(.82)};
R.bark_birch=()=>{const t=new Tex(64),r=rng(201),n=fbm(202,4,2);
 t.fill((u,v)=>{const k=.9+(n(u,v)-.5)*.1;return [k,k*.98,k*.92]});
 for(let i=0;i<40;i++){const y=Math.floor(r()*64),x=Math.floor(r()*64),len=3+Math.floor(r()*7);for(let s=0;s<len;s++){t.set(x+s,y,[.22,.2,.18]);if(r()<.3)t.set(x+s,y+1,[.4,.38,.34])}}
 for(let i=0;i<5;i++){const cx=r()*64,cy=r()*64;for(let y=-3;y<=3;y++)for(let x=-2;x<=2;x++)if(x*x/4+y*y/9<=1)t.mul(Math.floor(cx+x),Math.floor(cy+y),.55)}
 t.quant(20);return t.headroom(.82)};
// ---- the Scarlands (burned Wilderness north of the Ditch, 2026-09-26): dangerous yet cozy old-school ----
R.scorched_earth=()=>{const t=new Tex(64),n=fbm(211,4,3),m=vnoise(212,16),r=rng(213);
 // dark burnt soil: charcoal flecks, a few dull ember specks, hairline heat cracks
 t.fill((u,v)=>{const k=.8+(n(u,v)-.5)*.24+(m(u,v)-.5)*.1;return [k,k*.93,k*.86]});
 for(let i=0;i<220;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.7?.62:.8)}
 for(let i=0;i<12;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.set(x,y,[1,.62,.34])}
 for(let i=0;i<7;i++){let x=r()*64,y=r()*64,dx=r()-.5,dy=r()-.5;for(let s=0;s<6+r()*10;s++){t.mul(Math.floor(x),Math.floor(y),.7);x+=dx+(r()-.5);y+=dy+(r()-.5)}}
 t.quant(20);return t};
R.ash=()=>{const t=new Tex(64),n=fbm(221,4,3),m=vnoise(222,32),r=rng(223);
 // pale grey drifted ash, soft ripples, dark cinders
 t.fill((u,v)=>{const k=.86+(n(u,v)-.5)*.14+(m(u,v)-.5)*.05+Math.sin((u*3+n(u,v))*Math.PI*2)*.02;return [k,k*.99,k*.96]});
 for(let i=0;i<90;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,.55+r()*.2);if(r()<.4)t.mul(x+1,y,.75)}
 t.quant(24);return t};
R.cracked_mud=()=>{const t=new Tex(64),vo=voronoi(231,6,6,.9),n=fbm(232,8,2);
 // dry baked mud: plates with lighter curled rims and dark cracks between them
 t.fill((u,v)=>{const q=vo(u,v),e=q.d2-q.d1,k=.82+q.id*.1+(n(u,v)-.5)*.08;if(e<.07)return [.46,.42,.37];const rim=e<.13?.06:0;return [k+rim,k*.95+rim,k*.86+rim]});
 t.quant(22);return t};
R.burnt_grass=()=>{const t=new Tex(64),r=rng(241),n=fbm(242,4,2);
 // the burnt edge of a meadow: dead straw-coloured tufts over dark soil, black char patches
 t.fill((u,v)=>{const k=.6+(n(u,v)-.5)*.16;return [k*.9,k*.82,k*.62]});
 for(let i=0;i<300;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=2+Math.floor(r()*3),k=.85+r()*.3;
  for(let s=0;s<len;s++)t.set(x+(s===len-1&&r()<.5?1:0),y-s,[.9*k,.78*k,.46*k])}
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=n(x/64,y/64);if(q<.4)t.mul(x,y,.72+q*.4)}   // soft char patches, not camouflage
 t.quant(20);return t};
R.dark_rock=()=>{const t=new Tex(64),n=fbm(251,4,4),vo=voronoi(252,5,5,.9),r=rng(253);
 // dark volcanic-looking rock: faceted plates, soot, sharp dark fissures
 t.fill((u,v)=>{const q=vo(u,v),e=q.d2-q.d1,k=.62+q.id*.22+(n(u,v)-.5)*.16;return e<.05?[.3,.29,.28]:[k,k*.97,k*.94]});
 for(let i=0;i<140;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.6?.8:1.12)}
 t.quant(20);return t};
R.bone_dirt=()=>{const t=new Tex(64),n=fbm(261,4,3),r=rng(262);
 // brown dirt strewn with small pale bone fragments (short shafts with knobbed ends) and grit
 t.fill((u,v)=>{const k=.72+(n(u,v)-.5)*.2;return [k,k*.9,k*.78]});
 for(let i=0;i<26;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=2+Math.floor(r()*4),hz=r()<.5;
  for(let s=0;s<len;s++){const px=hz?x+s:x,py=hz?y:y+s;t.set(px,py,[.95,.92,.82]);t.mul(hz?px:px+1,hz?py+1:py,.7)}
  t.set(hz?x-1:x,hz?y:y-1,[.98,.95,.86]);t.set(hz?x+len:x,hz?y:y+len,[.98,.95,.86])}
 for(let i=0;i<120;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.5?.8:1.1)}
 t.quant(20);return t};
R.charred_planks=()=>{const t=new Tex(64),r=rng(271),n=vnoise(272,8),tone=[];for(let i=0;i<4;i++)tone.push(.8+r()*.2);
 // burnt boards: irregular charcoal checking along each board (cross splits every 3-7 px, a wandering long split),
 // blocks of slightly different char, dark gaps between the boards
 const rows=[],long=[];for(let b=0;b<4;b++){const cuts=new Set();let y=Math.floor(r()*4);while(y<64){cuts.add(y);y+=3+Math.floor(r()*5)}rows.push(cuts);long.push(3+Math.floor(r()*9))}
 t.fill((u,v,x,y)=>{const b=Math.floor(x/16),ix=x%16;if(ix===15)return [.16,.14,.13];
  const w=long[b]+Math.round(Math.sin(y*.35+b)*1.2),split=rows[b].has(y)||ix===w,seg=[...rows[b]].filter(c=>c<=y).length,k=tone[b]*(.8+((seg*7+b*3)%5)*.03+(n(u,v)-.5)*.1);
  return split?[.28*k,.25*k,.23*k]:[.5*k,.44*k,.38*k]});
 for(let i=0;i<10;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.blend(x,y,[.75,.45,.28],.5)}   // a little unburnt wood showing
 t.quant(20);return t};
R.ruined_stone=()=>{const t=new Tex(64),n=fbm(281,8,2),r=rng(282),mortar=[.42,.41,.39];
 // coursed stone that has been through fire: blocks of uneven length, chipped corners, soot rising from below
 const rows=[[0,13],[13,29],[29,44],[44,64]];
 rows.forEach(([y0,y1])=>{let x=Math.floor(r()*14);const start=x,cuts=[];while(x<start+64){cuts.push(x);x+=9+Math.floor(r()*15)}
  cuts.forEach((c0,i)=>{const c1=i+1<cuts.length?cuts[i+1]:start+64,k=.6+r()*.24,chip=r()<.35;
   for(let y=y0;y<y1;y++)for(let xx=c0;xx<c1;xx++){let c;
    if(y===y1-1||xx===c1-1||(chip&&y<y0+3&&xx<c0+3))c=mortar;else{const q=k*(.9+n(xx/64,y/64)*.2);c=[q,q*.98,q*.94];if(y===y0)c=mixc(c,[1,1,1],.14)}
    t.set(xx,y,c)}})});
 for(let y=0;y<64;y++){const soot=Math.max(0,(y-30)/34)*.35;for(let x=0;x<64;x++)t.mul(x,y,1-soot*(.7+.3*n(x/64,y/64)))}
 t.quant(20);return t};
// ---- Scarlands bestiary (2026-09-26): creature skins ----
R.hide_ash=()=>{const t=new Tex(64),vo=voronoi(291,4,5,.9),n=fbm(292,8,2),r=rng(293);
 // slag-plated hide: dark grey plates of uneven size, soot between them, thin ember-orange cracks in a few seams
 t.fill((u,v)=>{const q=vo(u,v),e=q.d2-q.d1,k=.62+q.id*.18+(n(u,v)-.5)*.1;if(e<.05)return q.id>.72?[.95,.46,.16]:[.22,.2,.19];return e<.1?[k*.8,k*.78,k*.76]:[k,k*.97,k*.95]});
 for(let i=0;i<120;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.5?.82:1.1)}
 t.quant(20);return t};
R.scales_ember=()=>{const t=new Tex(64),n=fbm(301,8,2),r=rng(302),tone=[],glow=[];for(let i=0;i<32;i++){tone.push(.84+r()*.16);glow.push(r()<.09)}
 // bestiary pass 3: big overlapping rounded scales in offset rows (16 px wide, 8 px tall, so they tile), lit at the
 // top, a soft darker rim and shallow gaps (no black checker at the game camera); a few scales have an ember rim
 t.fill((u,v,x,y)=>{const row=Math.floor(y/8),off=row%2?8:0,col=Math.floor(((x+off)%64)/16),iy=y%8,ix=(x+off)%16,id=(row*4+col)%32,k=tone[id]*(.92+n(u,v)*.12);
  const dx=(ix+.5-8)/8,dy=(iy+.5)/8,rr=dx*dx+dy*dy;
  if(rr>1)return [.3*k,.14*k,.1*k];
  if(rr>.8)return glow[id]?[.86,.4,.14]:[.4*k,.18*k,.12*k];
  let c=[.56*k,.25*k,.17*k];if(dy<.4)c=mixc(c,[1,.78,.6],.18*(1-dy/.4));return c});
 t.quant(20);return t};
R.fur_ashen=()=>{const t=new Tex(64),r=rng(311),n=fbm(312,4,2);
 // short coarse fur: dark roots, lighter tips in short strokes laid along v, singed patches
 t.fill((u,v)=>{const k=.66+(n(u,v)-.5)*.2;return [k,k*.93,k*.86]});
 for(let i=0;i<700;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=2+Math.floor(r()*3),k=.8+r()*.35;for(let s=0;s<len;s++)t.set(x,y+s,[.82*k,.76*k,.68*k]);t.mul(x,y+len,.7)}
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=n(x/64,y/64);if(q<.36)t.mul(x,y,.7)}
 t.quant(20);return t};
const USE={grass_a:'terrain grass (large scale)',grass_b:'terrain grass (second scale, breaks repetition)',grass_c:'meadow / worn grass variant',
 dirt:'bare earth, trodden ground, creek banks',path:'cobbled / gravel paths',sand:'beach and sandy shore',rock:'rock outcrops, cliff faces',
 mud:'creek bed and wet ground',water:'sea, creek and pond surface',brick:'fired brick walls, chimneys',stone_course:'fieldstone / ashlar walls and plinths',
 plaster:'limewash plaster panels',planks:'floorboards, doors, decks, board walls',beam:'timber frames, posts, beams, furniture',
 thatch:'straw / reed thatch roofs',roof_tiles:'clay tile and shingle roofs',
 leaves:'tree crowns, shrubs, hazel, tufts (leaves over darker clumps)',needles:'pine crowns',bark:'oak / pine trunks, logs',bark_birch:'birch trunks',
 scorched_earth:'Scarlands burnt soil (ground)',ash:'Scarlands ash drifts (ground)',cracked_mud:'Scarlands baked mud (ground)',
 burnt_grass:'the burnt edge of the meadow (ground)',dark_rock:'Scarlands rock outcrops, dark boulders',bone_dirt:'bone-strewn dirt (ground, bone piles)',
 hide_ash:'ash stalker slag-plated hide',scales_ember:'cinder wyrmling scales',fur_ashen:'cinder rat fur',
 charred_planks:'burnt boards, carts, crossings',ruined_stone:'fire-scarred ruins: walls, pillars, arches'};
// building textures get detail headroom too (see Tex.headroom)
const HEADROOM=['brick','stone_course','plaster','planks','beam','thatch','roof_tiles','dark_rock','charred_planks','ruined_stone','hide_ash','scales_ember','fur_ashen'];
// look pass 2 (2026-09-26): soft variants under new names (tools/oldschool_textures_v2.js); the first kit is unchanged
require('./oldschool_textures_v2')({R,USE,HEADROOM,Tex,rng,vnoise,fbm,mixc});
const kit={schema:'crafted-realm-oldschool-texture-kit-v1',generator:'tools/build_oldschool_textures.js',textures:{}};
for(const [name,make] of Object.entries(R)){
 const t=make(),file=name+'.png';if(HEADROOM.includes(name))t.headroom(.82);fs.writeFileSync(path.join(OUT,file),png(t.n,t.n,t.bytes()));
 kit.textures[name]={file:'assets/textures/oldschool/'+file,size:t.n,mean:t.mean(),use:USE[name]};
 console.log(name.padEnd(13),t.n+'px','mean',t.mean().join(','));
}
fs.writeFileSync(path.join(OUT,'kit.json'),JSON.stringify(kit,null,1)+'\n');
console.log('[OLDSCHOOL KIT] '+Object.keys(R).length+' textures -> assets/textures/oldschool/');
