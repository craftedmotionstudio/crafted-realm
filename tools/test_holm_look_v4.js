/* Headless locks for the look v4 options (owner review 5b, 2026-09-28; src/holm_look_v4.js + src/classic_pixels.js):
 *  1 the switch: no option is the default (config '3' = the current look v3); ?look=4a|4b|4c|3 picks one for the tab's
 *    session; anything else falls back to the config;
 *  2 the pixels: 4a draws the 2004 applet's full height (503 lines over 36.13 deg), 4b / 4c 2004's density (334 lines);
 *    whole-number blocks, the floor keeps small windows readable, a phone held upright keeps the density over its wider
 *    view; configure(null) hands the Settings option back;
 *  3 the material pass: 4a leaves materials alone; 4b samples textures texel by texel and mixes the characters' normals
 *    half-way to their faces (shader patch, own program key); 4c turns scenery and characters flat and draws wood /
 *    plaster / roofs / bark in their texture's average colour while stone, leaves and water keep their textures; the
 *    island ground is never re-shaded; 4c pushes the textures it keeps out from their average and raises the grey paths'
 *    and rocks' detail and the water's ripple contrast (never characters); a second sweep changes nothing;
 *  4 the 2004 colour step: the blit shader quantises hue / saturation / lightness to 64 / 8 / 128 steps.
 * Run: node tools/test_holm_look_v4.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let passed=0;const check=(name,f)=>{f();passed++;console.log('PASS '+name)};
const V4=path.join(root,'src/holm_look_v4.js'),CP=path.join(root,'src/classic_pixels.js');
function fresh(file,search,cfg,extra){delete require.cache[require.resolve(file)];global.location={search:search||''};global.GameConfig=cfg;
 const ss={};global.sessionStorage={getItem:k=>ss.hasOwnProperty(k)?ss[k]:null,setItem:(k,v)=>{ss[k]=String(v)}};Object.assign(global,extra||{});
 const m=require(file);delete global.location;delete global.GameConfig;delete global.sessionStorage;return m}

check('1 switch: config default is the current look (3); ?look= picks 4a / 4b / 4c / 3; unknown values fall back',()=>{
 const src=fs.readFileSync(path.join(root,'src/config.js'),'utf8');assert(/holmLookOption:\s*'3'/.test(src),'config default = 3 (the owner picks; no option is the default)');
 assert.strictEqual(fresh(V4,'',{}).option(),'3');assert.strictEqual(fresh(V4,'',{holmLookOption:'3'}).settings(),null,'3 = no changes');
 ['4a','4b','4c','3'].forEach(o=>assert.strictEqual(fresh(V4,'?look='+o,{holmLookOption:'3'}).option(),o));
 assert.strictEqual(fresh(V4,'?look=4B',{}).option(),'4b');assert.strictEqual(fresh(V4,'?look=v4c',{}).option(),'4c');
 assert.strictEqual(fresh(V4,'?look=9z',{holmLookOption:'3'}).option(),'3');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),a=html.indexOf('src/classic_pixels.js'),b=html.indexOf('src/holm_look_v4.js');
 assert(a>0&&b>a,'index.html loads the option module after classic pixels');assert(/holm_look_v4\.js\?v=h[0-9a-f]{8}"/.test(html),'cache-busted');
});

check('2 pixels: 503 / 334 lines over 36.13 deg in whole-number blocks, the floor on small windows, phones upright keep the density',()=>{
 const o=fresh(V4,'',{}).OPTIONS;
 assert(Math.abs(o['4a'].pixels.linesPerDeg*36.13-503)<1e-6&&o['4a'].pixels.palette==='none');
 ['4b','4c'].forEach(k=>assert(Math.abs(o[k].pixels.linesPerDeg*36.13-334)<1e-6&&o[k].pixels.palette==='hsl2004',k));
 const cp=fresh(CP,'',{classicPixels:false},{localStorage:{getItem:()=>null,setItem(){}}});
 assert(!cp.enabled());assert.deepStrictEqual([700,900,1080,1440,2160].map(h=>cp.factorFor(h)),[2,2,2,3,4],'the Settings option as before');
 assert(cp.configure(o['4b'].pixels),'an option turns the pixels on for its session');
 assert.deepStrictEqual([1006,900,1080,1440,2160,720].map(h=>cp.factorFor(h,36.13)),[3,3,3,4,6,2],'4b blocks');
 assert.deepStrictEqual([1006,900,1080,1440,2160].map(h=>h/cp.factorFor(h,36.13)).map(Math.round),[335,300,360,360,360],'4b lines ~ 2004 334');
 assert.strictEqual(cp.factorFor(580,36.13),1,'floor: no fewer than 300 lines (small windows keep their detail)');
 assert.strictEqual(cp.factorFor(1266,55),2,'a phone held upright (55 deg view) keeps the 2004 density: 633 lines');
 cp.configure(o['4a'].pixels);assert.deepStrictEqual([1006,900,1440,720].map(h=>cp.factorFor(h,36.13)),[2,2,3,1],'4a blocks');
 const s=cp.snapshot();assert(s.enabled&&s.look&&s.target===503,'snapshot');
 cp.configure(null);assert(!cp.enabled(),'configure(null): back to the Settings choice (off)');
 global.localStorage=undefined;
});

// a small THREE stand-in for the material pass
function fakeThree(){return {NearestFilter:1003,LinearMipmapLinearFilter:1008,sRGBEncoding:3001,LinearEncoding:3000}}
function tex(name){return {uuid:'t-'+name,name,image:{width:4,height:4},minFilter:1008,magFilter:1003,generateMipmaps:true,anisotropy:4,encoding:3000,userData:{},
 clone(){return Object.assign({},this,{uuid:this.uuid+'-copy',userData:Object.assign({},this.userData)})}}}
function col(r,g,b){return {r,g,b,setRGB(x,y,z){this.r=x;this.g=y;this.b=z}}}
function std(name,map){return {isMeshStandardMaterial:true,type:'MeshStandardMaterial',name,map:map||null,color:col(1,1,1),flatShading:false,userData:{},needsUpdate:false}}
function world(){
 const ground={isMeshBasicMaterial:true,name:'',map:null,color:col(1,1,1),userData:{oldschoolGround:true}};
 const m={planks:std('Weathered oak planks',tex('planks')),plaster:std('Holm flat colour - plaster',tex('plaster')),stone:std('Dressed sandstone (not clipped)',tex('stone')),
  leaf:std('olive-leaves',tex('leaf')),iron:std('Iron fittings'),skin:std('C_SKIN'),torso:std('C_TORSO'),ground};
 const rig={userData:{gmix:{}},parent:null},mesh=(mat,parent,skinned)=>({isMesh:true,isSkinnedMesh:!!skinned,material:mat,parent:parent||null,userData:{}});
 const list=[mesh(m.planks),mesh(m.plaster),mesh(m.stone),mesh(m.leaf),mesh(m.iron),mesh(m.skin,rig,true),mesh(m.torso,rig,false),mesh(m.ground)];
 return {m,scene:{traverse(f){list.forEach(f)}}};
}
// a canvas stand-in: every texel (200, 100, 50)
const doc={createElement:()=>({getContext:()=>({drawImage(){},getImageData:(x,y,w,h)=>{const d=new Uint8ClampedArray(w*h*4);for(let i=0;i<d.length;i+=4){d[i]=200;d[i+1]=100;d[i+2]=50;d[i+3]=255}return {data:d}},putImageData(){}})})};
function run(opt){const w=world();const v=fresh(V4,'?look='+opt,{},{THREE:fakeThree(),scene:w.scene,document:doc,window:undefined});
 global.THREE=fakeThree();global.scene=w.scene;global.document=doc;v.sweep();v.sweep();delete global.scene;delete global.THREE;delete global.document;return {v,m:w.m,scene:w.scene}}

check('3 material pass: 4a untouched; 4b texels + part-flat characters; 4c flat everywhere + plain wood / plaster, textured stone / leaves; ground never re-shaded',()=>{
 const a=run('4a');['planks','stone','leaf'].forEach(k=>{assert(a.m[k].map&&a.m[k].map.minFilter===1008,'4a keeps '+k+' mip-mapped')});
 assert(!a.m.skin.flatShading&&!a.m.skin.onBeforeCompile&&!a.m.planks.flatShading,'4a: shading as v3');
 const b=run('4b');
 ['planks','stone','leaf','plaster'].forEach(k=>{const t=b.m[k].map;assert(t&&t.minFilter===1003&&t.magFilter===1003&&t.anisotropy===1&&t.generateMipmaps!==false,'4b texels on '+k+' (mip chain kept: never incomplete)')});
 assert(!b.m.planks.flatShading&&!b.m.stone.flatShading,'4b: scenery shading as v3');
 [b.m.skin,b.m.torso].forEach(m=>{assert(typeof m.onBeforeCompile==='function'&&!m.flatShading&&m.extensions.derivatives,'4b half-flat character '+m.name);
  const sh={fragmentShader:'a\n#include <normal_fragment_begin>\nb'};m.onBeforeCompile(sh);const K=b.v.OPTIONS['4b'].characterFacet;
  assert(K>0&&K<1&&sh.fragmentShader.indexOf('mix( normal, lv4fn, '+K.toFixed(3)+' )')>0,'normal mixed part-way to the face');
  assert(m.customProgramCacheKey().indexOf('lookv4-facet'+K.toFixed(3))>=0,'own program key')});
 assert.strictEqual(b.v.snapshot().facet,2,'the second sweep patches nothing again');
 // a loader resets a model texture's filter as the model arrives (HolmOldschoolLook.prepareModel): the next sweep sets it again
 b.m.planks.map.minFilter=1008;b.m.planks.map.anisotropy=4;global.THREE=fakeThree();global.scene=b.scene;b.v.sweep();delete global.THREE;delete global.scene;
 assert(b.m.planks.map.minFilter===1003&&b.m.planks.map.anisotropy===1&&b.v.snapshot().refiltered===1,'re-filtered after a loader reset');
 ['planks','stone','leaf','plaster'].forEach(k=>assert(!b.m[k].map.userData.lookV4Boost,'4b keeps '+k+' as authored (texels only)'));
 assert(!b.v.tuneGround({path:{k:1,s:1}},{water:{contrast:1}})&&!a.v.tuneGround({path:{k:1,s:1}},{water:{contrast:1}}),'4a / 4b leave the ground and water');
 const c=run('4c');
 ['skin','torso','planks','stone','leaf','iron'].forEach(k=>assert(c.m[k].flatShading,'4c flat '+k));
 ['planks','plaster'].forEach(k=>{const m=c.m[k];assert(m.map===null&&m.userData.lookV4Map,'4c plain '+k);assert(Math.abs(m.color.r-200/255)<1e-9&&Math.abs(m.color.b-50/255)<1e-9,'average colour kept '+k)});
 ['stone','leaf'].forEach(k=>assert(c.m[k].map&&c.m[k].map.userData.lookV4Boost&&/-copy$/.test(c.m[k].map.uuid)&&c.m[k].map.minFilter===1003,'4c keeps a bolder texture on '+k));
 assert.strictEqual(c.v.snapshot().boosted,2,'one contrast copy per texture (plain ones need none)');assert(!c.m.skin.map,'characters untouched');
 const T={path:{k:.85,s:1.5},rock:{k:.9,s:2},grassA:{k:.2,s:1.6}},L3={water:{contrast:2.4,gain:.82}},X=c.v.CONTRAST;assert(c.v.tuneGround(T,L3));
 assert(Math.abs(T.path.k-.85*X.ground.path)<1e-9&&Math.abs(T.rock.k-.9*X.ground.rock)<1e-9&&T.grassA.k===.2&&Math.abs(L3.water.contrast-2.4*X.water)<1e-9,'4c ground + water contrast');
 assert(!c.v.tuneGround(T,L3)&&Math.abs(T.path.k-.85*X.ground.path)<1e-9,'tuned once');
 [a,b,c].forEach(r=>{assert(!r.m.ground.flatShading&&!r.m.ground.onBeforeCompile,'ground stays gouraud')});
 assert.strictEqual(c.v.snapshot().plain,2,'plain applied once');
 const src=fs.readFileSync(V4,'utf8');assert(/plain:\/[^/]+\/i/.test(src));
 const re=c.v.OPTIONS['4c'].plain;['Oak frame','Crate boards','Holm flat colour - beam','thatch','Keep warm shingles','oak-bark','Hay','Barrel lid boards'].forEach(n=>assert(re.test(n),'plain: '+n));
 ['Dressed sandstone','stone-dark','olive-leaves','Cavern rock','ripple','Iron fittings','Leaded glass pane','Field stone light'].forEach(n=>assert(!re.test(n),'textured: '+n));
});

check('4 the 2004 colour step: hue 64 / saturation 8 / lightness 128 steps in the blit, the fixed palette and no-palette modes kept',()=>{
 const src=fs.readFileSync(CP,'utf8');
 assert(/q\.x \* 64\.0/.test(src)&&/q\.y \* 7\.0/.test(src)&&/q\.z \* 127\.0/.test(src),'hsl quantisation');
 assert(/mode == 0 && palN > 0/.test(src),'fixed palette mode kept');
});
console.log('[HOLM LOOK V4] '+passed+'/4 checks passed');
