/* Look pass 2 (2026-09-26) soft texture variants for the old-school kit (tools/build_oldschool_textures.js registers
 * them; nothing in the first kit changes: every recipe here writes a NEW texture name, so the kit stays additive).
 * Owner, 2026-09-26: "the overall feel is a little bit too polished; it needs to feel more like old school and follow
 * more like the Bible references style". Measured against the references (tools/measure_look_vs_refs.py), the first
 * kit read as modern digital noise: speckled grass, camouflage-blotched leaves (dark gaps at 40% of the leaf tone),
 * high-contrast tile gaps, mortar and straw. The references show soft, close-toned surfaces: small leaves in nearly
 * the same olive with only shallow shade pockets, dirt and sand with faint grain, tiles/stones/straw whose joints are
 * a few shades darker, not black. Each recipe below keeps its first-kit counterpart's layout (so UVs authored for
 * the first kit still fit) and lowers the tone spread; all are seeded and tileable like the first kit.
 * The runtime swaps them in (src/holm_oldschool_look.js, look v2); tools/blender/apply_oldschool_textures.py can bake
 * them into re-exported candidates (spec "rules" naming the *_soft textures). */
'use strict';
module.exports=function registerV2(k){
 const {R,USE,HEADROOM,Tex,rng,vnoise,fbm,mixc}=k;
 // ---- ground detail (the terrain divides by the mean, so only the pattern matters) ----
 // worn earth: soft low-frequency tone, a few faint pebbles (a lighter pixel over a darker one)
 R.dirt_soft=()=>{const t=new Tex(64),n=fbm(301,2,3),m=vnoise(302,8),r=rng(303);
  t.fill((u,v)=>{const q=.85+(n(u,v)-.5)*.1+(m(u,v)-.5)*.04;return [q,q*.965,q*.9]});
  for(let i=0;i<22;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,1.05);t.mul(x,y+1,.95)}
  t.quant(40);return t};
 // sand: a whisper of grain and ripple
 R.sand_soft=()=>{const t=new Tex(64),n=fbm(306,2,3),r=rng(307);
  t.fill((u,v)=>{const q=.9+(n(u,v)-.5)*.07;return [q,q*.98,q*.93]});
  for(let i=0;i<160;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,r()<.5?.97:1.03)}
  t.quant(40);return t};
 // ---- foliage: many small leaves in close olive tones, shallow shade pockets, no dark camouflage patches ----
 function softLeaves(seed,base,count,rMax,pocket){const t=new Tex(64),r=rng(seed),sh=fbm(seed+1,2,3),fine=vnoise(seed+2,16);
  t.fill((u,v)=>{const q=.9+(sh(u,v)-.5)*.14;return [base[0]*q,base[1]*q,base[2]*q]});
  for(let i=0;i<count;i++){const cx=r()*64,cy=r()*64,a=r()*Math.PI,rx=1+r()*rMax,ry=.6+r()*.7,q=.78+r()*.42,ca=Math.cos(a),sa=Math.sin(a);
   const c=[base[0]*q*(1+(r()-.5)*.06),base[1]*q,base[2]*q*(1+(r()-.5)*.12)];
   for(let y=Math.floor(cy-3);y<=cy+3;y++)for(let x=Math.floor(cx-3);x<=cx+3;x++){const dx=x+.5-cx,dy=y+.5-cy,uu=(dx*ca+dy*sa)/rx,vv=(-dx*sa+dy*ca)/ry;
    if(uu*uu+vv*vv<=1)t.set(x,y,c)}}
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=fine(x/64,y/64);if(q<.32)t.mul(x,y,pocket+q*(1-pocket)/.32)}
  // a lit edge on some leaves: the small light flecks the reference crowns show up close
  for(let i=0;i<260;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.blend(x,y,[1,1,.8],.22)}
  return t}
 R.leaves_soft=()=>{const t=softLeaves(311,[.5,.6,.31],900,1.5,.62);t.quant(28);return t.headroom(.82)};
 R.needles_soft=()=>{const t=new Tex(64),r=rng(321),sh=fbm(322,2,3),base=[.4,.54,.44];
  t.fill((u,v)=>{const q=.9+(sh(u,v)-.5)*.14;return [base[0]*q,base[1]*q,base[2]*q]});
  for(let i=0;i<800;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=2+Math.floor(r()*4),dx=r()<.5?1:-1,q=.88+r()*.22;
   for(let s=0;s<len;s++)t.set(x+(s*dx>>1),y+s,[base[0]*q,base[1]*q,base[2]*q])}
  t.quant(28);return t.headroom(.82)};
 R.bark_soft=()=>{const t=new Tex(64),r=rng(331),n=vnoise(332,4),g=vnoise(333,32);
  t.fill((u,v,x)=>{const w=x+(n(u,v)-.5)*6,f=Math.abs(Math.sin(w*Math.PI/5.3)),q=f<.28?.68:.8+(g(u,v)-.5)*.08+(f>.9?.03:0);return [.58*q,.46*q,.34*q]});
  for(let i=0;i<3;i++){const cx=r()*64,cy=r()*64;for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(x*x+y*y<=4)t.mul(Math.floor(cx+x),Math.floor(cy+y),.82)}
  t.quant(28);return t.headroom(.82)};
 // ---- buildings: joints a few shades darker, close block/tile/straw tones ----
 R.roof_tiles_soft=()=>{const t=new Tex(64),r=rng(341),n=fbm(342,8,2),tone=[];for(let i=0;i<32;i++)tone.push(.91+r()*.1);
  t.fill((u,v,x,y)=>{const row=Math.floor(y/8),off=row%2?4:0,col=Math.floor(((x+off)%64)/8),iy=y%8,ix=(x+off)%8,q=tone[(row*8+col)%32]*(.97+n(u,v)*.05);
   let c=[.6*q,.36*q,.26*q];if(iy===0)return mixc(c,[0,0,0],.26);if(ix===7)c=mixc(c,[0,0,0],.14);if(iy===1)c=mixc(c,[0,0,0],.07);if(iy>=6)c=mixc(c,[1,.9,.8],.05);return c});
  t.quant(28);return t};
 R.thatch_soft=()=>{const t=new Tex(64),r=rng(351),n=fbm(352,4,2);
  t.fill((u,v)=>{const q=.8+(n(u,v)-.5)*.1;return [.78*q,.66*q,.4*q]});
  for(let i=0;i<520;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64),len=3+Math.floor(r()*6),q=.92+r()*.16;
   for(let s=0;s<len;s++)t.set(x+(s>len/2&&r()<.3?1:0),y+s,[.78*q*.8,.66*q*.8,.4*q*.8])}
  for(let c=0;c<4;c++){const y=c*16+15;for(let x=0;x<64;x++){t.mul(x,y,.86);t.mul(x,y-1,.94)}}
  t.quant(28);return t};
 R.stone_course_soft=()=>{const t=new Tex(64),n=fbm(361,8,2),r=rng(362);
  const rows=[[0,16],[16,32],[32,48],[48,64]];
  rows.forEach(([y0,y1])=>{let x=Math.floor(r()*12);const start=x,cuts=[];while(x<start+64){cuts.push(x);x+=10+Math.floor(r()*14)}
   cuts.forEach((c0,i)=>{const c1=i+1<cuts.length?cuts[i+1]:start+64,q0=.74+r()*.08,tint=r()*.02;
    for(let y=y0;y<y1;y++)for(let xx=c0;xx<c1;xx++){const q=q0*(.95+n(xx/64,y/64)*.1);let c=[q+tint,q+tint*.5,q*.96];
     if(y===y1-1||xx===c1-1)c=mixc(c,[0,0,0],.2);else if(y===y0)c=mixc(c,[1,1,1],.06);else if(y===y1-2)c=mixc(c,[0,0,0],.05);
     t.set(xx,y,c)}})});
  t.quant(28);return t};
 // timber: the same boards and grain bands as the first kit at about half the tone spread, gaps a few shades darker
 R.planks_soft=()=>{const t=new Tex(64),r=rng(381),n=vnoise(382,4),tone=[];for(let i=0;i<4;i++)tone.push(.9+r()*.1);
  t.fill((u,v,x)=>{const b=Math.floor(x/16),ix=x%16,grain=Math.sin((ix*.9+tone[b]*7)+Math.sin(v*Math.PI*2*2+b)*1.5)*.5+.5,q=tone[b]*(.93+grain*.05+(n(u,v)-.5)*.04);
   const c=[.62*q,.45*q,.29*q];return ix===15?mixc(c,[0,0,0],.3):ix===0?mixc(c,[1,.9,.75],.06):c});
  t.quant(28);return t};
 R.beam_soft=()=>{const t=new Tex(64),n=vnoise(391,2),g=vnoise(392,32),r=rng(393),band=[];for(let i=0;i<64;i++)band.push(r());
  t.fill((u,v,x)=>{const w=Math.round((n(u,v)-.5)*3),b=band[((x+w)%64+64)%64],q=.8+(b<.18?-.06:b>.85?.035:0)+(g(u,v)-.5)*.04;return [.55*q,.4*q,.27*q]});
  t.quant(28);return t};
 R.plaster_soft=()=>{const t=new Tex(64),n=fbm(371,2,3),m=vnoise(372,8);
  t.fill((u,v)=>{const q=.88+(n(u,v)-.5)*.05+(m(u,v)-.5)*.03;return [q,q*.975,q*.93]});
  t.quant(40);return t};
 Object.assign(USE,{dirt_soft:'look v2: worn earth paths (soft, faint pebbles)',sand_soft:'look v2: beach sand (soft grain)',
  leaves_soft:'look v2: tree crowns, shrubs, hazel, tufts (small close-toned leaves)',needles_soft:'look v2: pine crowns (soft)',
  bark_soft:'look v2: oak / pine trunks (shallow fissures)',roof_tiles_soft:'look v2: clay tile / shingle roofs (soft joints)',
  thatch_soft:'look v2: thatch roofs (close straw tones)',stone_course_soft:'look v2: coursed stone walls (soft mortar)',
  plaster_soft:'look v2: limewash plaster (smooth)',planks_soft:'look v2: boards, decks, doors (soft grain)',beam_soft:'look v2: timber frames, posts (soft grain)'});
 HEADROOM.push('roof_tiles_soft','thatch_soft','stone_course_soft','plaster_soft','planks_soft','beam_soft');
 // first-kit texture -> its look v2 variant (read by the runtime swap and the Blender recipe)
 return {v2:{dirt:'dirt_soft',sand:'sand_soft',leaves:'leaves_soft',needles:'needles_soft',bark:'bark_soft',roof_tiles:'roof_tiles_soft',
  thatch:'thatch_soft',stone_course:'stone_course_soft',plaster:'plaster_soft',planks:'planks_soft',beam:'beam_soft'}};
};
