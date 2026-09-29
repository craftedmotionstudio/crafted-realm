/* Owner review 5 (2026-09-28) ground texture for the island's purposeful grey paths, registered by
 * tools/build_oldschool_textures.js under a NEW name (the first kit and the look v2 variants are unchanged: additive).
 * Owner: "I like that old school RuneScape has like the purposeful gray paths. Ours are just like a heavy marker of
 * shaded paths." The 2004 idea of a grey path, in our own recipe: small set stones and gravel in close neutral greys,
 * joints of darker grit a few shades down (not black), a lit top edge on each stone and a few loose pebbles, posterised
 * like the rest of the kit. Seeded and tileable (every cell and noise wraps on 64 px). Nothing is traced or sampled from
 * any game. The ground shader divides a detail texture by its mean, so only the pattern matters; the path's grey comes
 * from the underlay (src/holm_overhaul_ground.js GREY_PATH). */
'use strict';
module.exports=function registerPaths(k){
 const {R,USE,Tex,rng,vnoise,fbm,voronoi,clamp}=k;
 R.path_grey=()=>{const t=new Tex(64),vo=voronoi(611,7,7,.9),n=fbm(612,8,2),m=vnoise(613,16),r=rng(614);
  t.fill((u,v)=>{const q=vo(u,v),edge=q.d2-q.d1,g=(m(u,v)-.5)*.06;
   if(edge<.16)return [.58+g,.58+g,.56+g];                                  // grit between the stones
   const k=.74+q.id*.12+(n(u,v)-.5)*.08,lit=clamp((edge-.16)*1.8,0,1)*.07,  // each stone its own grey, a lit face
    warm=(q.id-.5)*.02;return [k+lit+warm,k+lit,k*.97+lit-warm]});
  // loose gravel in the joints: a light pixel over a darker one
  for(let i=0;i<70;i++){const x=Math.floor(r()*64),y=Math.floor(r()*64);t.mul(x,y,1.12);t.mul(x,y+1,.86)}
  t.quant(22);return t};
 USE.path_grey='purposeful grey paths on Tutor\'s Holm (set stones and gravel)';
};
