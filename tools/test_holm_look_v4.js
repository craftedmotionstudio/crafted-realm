/* Headless locks for look v4 and its Look panel (owner review 5b 2026-09-28, panel 2026-09-29; src/holm_look_v4.js,
 * src/holm_look_panel.js, src/classic_pixels.js, the ground / water boost uniforms in src/holm_oldschool_look.js and
 * src/holm_arrival_water.js):
 *  1 which values a page uses: the shipped default is look v3 (config holmLookOption '3', holmLook null); ?look=4a|4b|4c|3
 *    for the tab (not saved); the panel's saved values (localStorage) win over the config and an earlier tab choice but
 *    not over the link; GameConfig.holmLook (the copied JSON) becomes the default; reset forgets the saved values;
 *    ?look=panel opens the panel; values are clamped and round-trip through Copy settings;
 *  2 the pixels and colours: lines over a 36.13 deg view at any size, whole-pixel blocks when within a tenth, off below
 *    1.08x; a wider view keeps the density; colour depth 0 full, 1 = the 2004 client's 64 / 8 / 128, 2 = 12 / 3 / 12;
 *  3 the material pass is live and reversible: presets and toggles move texels, facet uniforms, plain colour and bolder
 *    copies; back to v3 restores every map, colour and filter; the character kit's maps and colours are never written;
 *    the ground is never re-shaded; ground / water boosts follow "bolder";
 *  4 the shaders read uniforms (live): the blit's hsl steps, the ground's os_boost, the water's holmWaterBoost, lv4Facet;
 *  5 the panel: pixel slider <-> lines with the 4a / 2004 snaps; the Settings tab has the Look row; scripts in order.
 * Run: node tools/test_holm_look_v4.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let passed=0;const check=(name,f)=>{f();passed++;console.log('PASS '+name)};
const V4=path.join(root,'src/holm_look_v4.js'),CP=path.join(root,'src/classic_pixels.js'),PANEL=path.join(root,'src/holm_look_panel.js');
function store(init){const m=Object.assign({},init||{});return {getItem:k=>m.hasOwnProperty(k)?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]},_m:m}}
function fresh(file,o){o=o||{};delete require.cache[require.resolve(file)];
 const keep={};['location','GameConfig','sessionStorage','localStorage','THREE','scene','document'].forEach(k=>{keep[k]=global[k]});
 global.location={search:o.search||''};global.GameConfig=o.cfg||{};global.sessionStorage=o.session||store();global.localStorage=o.local||store();
 if(o.THREE)global.THREE=o.THREE;if(o.scene)global.scene=o.scene;if(o.document)global.document=o.document;
 const m=require(file);
 m.__env={session:global.sessionStorage,local:global.localStorage};
 m.__restore=()=>Object.keys(keep).forEach(k=>{if(keep[k]===undefined)delete global[k];else global[k]=keep[k]});
 return m}

check('1 values: v3 by default; ?look= for the tab; saved panel values win over the config; the copied JSON as the default; reset; ?look=panel',()=>{
 const cfg=fs.readFileSync(path.join(root,'src/config.js'),'utf8');assert(/holmLookOption:\s*'3'/.test(cfg)&&/holmLook:\s*\{pixelLines:670,colourDepth:0,characterFacets:0\.7,chunkyTexels:true\}/.test(cfg),"shipped default = the owner's pick (2026-09-29: 670 lines, full colour, facets 0.7, chunky texels)");
 let v=fresh(V4,{cfg:{holmLookOption:'3',holmLook:null}});v.__restore();
 assert.deepStrictEqual(v.get(),v.DEFAULTS,'v3 = every control off');assert.strictEqual(v.option(),'3');assert.strictEqual(v.snapshot().source,'default');
 ['4a','4b','4c','3'].forEach(p=>{const x=fresh(V4,{search:'?look='+p});x.__restore();assert.strictEqual(x.option(),p);assert.strictEqual(x.snapshot().source,'url');
  assert.strictEqual(x.__env.local.getItem(x.SAVE_KEY),null,'a link never saves')});
 const b=fresh(V4,{search:'?look=4b'});b.__restore();assert.deepStrictEqual(b.get(),{pixelLines:334,colourDepth:1,characterFacets:.7,plainTextures:false,chunkyTexels:true,flatScenery:false,bolderTextures:false});
 const c=fresh(V4,{search:'?look=4C'});c.__restore();assert.deepStrictEqual(c.get(),{pixelLines:334,colourDepth:1,characterFacets:1,plainTextures:true,chunkyTexels:true,flatScenery:true,bolderTextures:true});
 const a=fresh(V4,{search:'?look=4a'});a.__restore();assert.strictEqual(a.get().pixelLines,503);
 // saved values (the panel) > an earlier ?look= in the tab > the config
 const saved=JSON.stringify({pixelLines:260,colourDepth:.5,characterFacets:.3,plainTextures:true});
 v=fresh(V4,{local:store({cr_look_v4:saved}),session:store({cr_look_option:'4c'}),cfg:{holmLookOption:'3'}});v.__restore();
 assert.deepStrictEqual(v.get(),{pixelLines:260,colourDepth:.5,characterFacets:.3,plainTextures:true,chunkyTexels:false,flatScenery:false,bolderTextures:false});assert.strictEqual(v.snapshot().source,'saved');
 v=fresh(V4,{search:'?look=4a',local:store({cr_look_v4:saved})});v.__restore();assert.strictEqual(v.option(),'4a','the link beats the saved values for that tab');
 v=fresh(V4,{session:store({cr_look_option:'4b'})});v.__restore();assert.strictEqual(v.option(),'4b','an earlier ?look= in this tab');
 v=fresh(V4,{cfg:{holmLookOption:'3',holmLook:{lookV4:1,pixelLines:334,colourDepth:1}}});v.__restore();
 assert.strictEqual(v.get().pixelLines,334,'GameConfig.holmLook = the copied JSON as the shipped default');assert.strictEqual(v.snapshot().source,'default');
 // set / save / reset, clamping, the Copy settings JSON
 const L=store(),w=fresh(V4,{local:L});
 w.set({pixelLines:5000,colourDepth:9,characterFacets:-2,flatScenery:1,bogus:3},true);
 assert.deepStrictEqual(w.get(),{pixelLines:0,colourDepth:2,characterFacets:0,plainTextures:false,chunkyTexels:false,flatScenery:true,bolderTextures:false},'clamped (>= 1006 lines = off)');
 w.set({pixelLines:50},false);assert.strictEqual(w.get().pixelLines,w.MIN_LINES,'no fewer than '+w.MIN_LINES+' lines');
 assert.strictEqual(JSON.parse(L.getItem(w.SAVE_KEY)).pixelLines,0,'set(...,false) does not save');
 w.preset('4b',true);assert.strictEqual(JSON.parse(L.getItem(w.SAVE_KEY)).pixelLines,334,'a preset from the panel is saved');
 const j=JSON.parse(w.exportJSON());assert.strictEqual(j.lookV4,1);assert.deepStrictEqual(w.normalize(j),w.get(),'Copy settings round-trips');
 w.reset();assert.strictEqual(L.getItem(w.SAVE_KEY),null);assert.strictEqual(w.option(),'3','reset: back to the shipped default');w.__restore();
 const p=fresh(V4,{search:'?look=panel'});p.__restore();assert(p.wantPanel()&&p.option()==='3','?look=panel opens the panel over the current values');
 const q=fresh(V4,{search:'?look=4c&lookLines=max&lookColours=2',local:store({cr_look_v4:saved})});q.__restore();
 assert(q.get().pixelLines===201&&q.get().colourDepth===2&&q.get().flatScenery&&q.snapshot().source==='url','?lookLines / ?lookColours on top of a preset (tests, review links)');
 assert.strictEqual(q.__env.local.getItem(q.SAVE_KEY),saved,'never saved');
});

check('2 pixels and colours: any line count, whole-pixel snap, density kept on wide views; colour depth steps',()=>{
 const cp=fresh(CP,{cfg:{classicPixels:false}});cp.__restore();
 assert(!cp.enabled());assert.deepStrictEqual([700,900,1080,1440,2160].map(h=>cp.factorFor(h)),[2,2,2,3,4],'the Settings classic option as before');
 assert(cp.configure({lines:334,colourDepth:1}));
 assert.strictEqual(cp.factorFor(1006,36.13),3,'2004 at 1006 px: exact 3 px blocks');assert.strictEqual(cp.factorFor(2012,36.13),6);
 assert(Math.abs(cp.factorFor(900,36.13)-900/334)<1e-9,'900 px: 2.69 px blocks (any size)');
 assert.strictEqual(cp.factorFor(1006*55/36.13,55),3,'a wider view keeps the density');
 cp.configure({lines:503});assert.strictEqual(cp.factorFor(1006,36.13),2);assert.strictEqual(cp.factorFor(520,36.13),1,'under 1.08x: native');
 cp.configure({lines:0,colourDepth:.5});assert(cp.enabled()&&cp.factorFor(1006,36.13)===1,'colours only: native size');
 assert.strictEqual(cp.levels(0),null);assert.deepStrictEqual(cp.levels(1),[64,8,128],'the 2004 client');assert.deepStrictEqual(cp.levels(2),[12,3,12]);
 const h=cp.levels(.5);assert(h[0]<256&&h[0]>64&&h[1]>8&&h[2]>128,'in between: fewer than full, more than 2004');
 cp.configure({linesPerDeg:334/36.13,palette:'hsl2004'});assert.strictEqual(cp.snapshot().look.lines,334);assert.strictEqual(cp.snapshot().look.colourDepth,1,'the first options\' form still reads');
 cp.configure(null);assert(!cp.enabled(),'null: back to the Settings choice (off)');
});

// a small THREE / scene stand-in for the material pass
const T={NearestFilter:1003,LinearMipmapLinearFilter:1008,LinearFilter:1006,sRGBEncoding:3001,LinearEncoding:3000};
function tex(name){return {uuid:'t-'+name,name,image:{width:4,height:4},minFilter:1008,magFilter:1003,generateMipmaps:true,anisotropy:4,encoding:3000,userData:{},
 clone(){return Object.assign({},this,{uuid:this.uuid+'-copy',userData:Object.assign({},this.userData)})}}}
function col(r,g,b){return {r,g,b,setRGB(x,y,z){this.r=x;this.g=y;this.b=z}}}
function std(name,map,c){return {isMeshStandardMaterial:true,type:'MeshStandardMaterial',name,map:map||null,color:col(...(c||[1,1,1])),flatShading:false,userData:{},needsUpdate:false,onBeforeCompile(){}}}
function world(){
 const ground={isMeshBasicMaterial:true,name:'',map:null,color:col(1,1,1),userData:{oldschoolGround:true}};
 const m={planks:std('Weathered oak planks',tex('planks'),[.9,.8,.7]),plaster:std('Holm flat colour - plaster',tex('plaster')),stone:std('Dressed sandstone (not clipped)',tex('stone')),
  leaf:std('olive-leaves',tex('leaf')),iron:std('Iron fittings'),skin:std('C_SKIN',tex('skin'),[.8,.6,.5]),torso:std('C_TORSO'),ground};
 const rig={userData:{gmix:{}},parent:null},mesh=(mat,parent,skinned)=>({isMesh:true,isSkinnedMesh:!!skinned,material:mat,parent:parent||null,userData:{}});
 const list=[mesh(m.planks),mesh(m.plaster),mesh(m.stone),mesh(m.leaf),mesh(m.iron),mesh(m.skin,rig,true),mesh(m.torso,rig,false),mesh(m.ground)];
 return {m,scene:{traverse(f){list.forEach(f)}}};
}
// a canvas stand-in: every texel (200, 100, 50)
const doc={createElement:()=>({getContext:()=>({drawImage(){},getImageData:(x,y,w,h)=>{const d=new Uint8ClampedArray(w*h*4);for(let i=0;i<d.length;i+=4){d[i]=200;d[i+1]=100;d[i+2]=50;d[i+3]=255}return {data:d}},putImageData(){}})})};
function boot(search){const w=world();const boosts=[];
 const v=fresh(V4,{search,THREE:T,scene:w.scene,document:doc});
 global.HolmOldschoolLook={eachTexture(){},setBoost(o){boosts.push(o)}};v.start();v.stop();return {v,m:w.m,boosts,done(){delete global.HolmOldschoolLook;v.stop();v.__restore()}}}

check('3 material pass: live and reversible; presets and toggles; character maps and colours never written; the ground never re-shaded',()=>{
 const r=boot('?look=4a');const {v,m}=r;
 ['planks','stone','leaf'].forEach(k=>assert(m[k].map.minFilter===1008,'4a keeps '+k+' smooth'));assert(!m.skin.userData.lookV4Facet&&!m.planks.userData.lookV4Facet,'4a: shading as v3');
 v.preset('4b');v.sweep();
 ['planks','stone','leaf','plaster','skin'].forEach(k=>{const t=m[k].map;assert(t&&t.minFilter===1003&&t.magFilter===1003&&t.anisotropy===1&&t.generateMipmaps!==false,'4b texels on '+k)});
 assert(m.skin.userData.lookV4Facet&&m.torso.userData.lookV4Facet&&v.FACET.character.value===.7,'4b: characters patched, 70% to flat');
 assert(!m.planks.userData.lookV4Facet&&v.FACET.scenery.value===0,'4b: scenery shading as v3');
 const sh={fragmentShader:'a\n#include <normal_fragment_begin>\nb',uniforms:{}};m.skin.onBeforeCompile(sh);
 assert(sh.uniforms.lv4Facet===v.FACET.character&&/mix\( normal, lv4fn, lv4Facet \)/.test(sh.fragmentShader)&&/uniform float lv4Facet/.test(sh.fragmentShader),'facets by a shared uniform');
 assert(/lookv4-facet-u1c/.test(m.skin.customProgramCacheKey()),'own program key');
 // a loader resets a model texture's filter as the model arrives: the next sweep sets it again
 m.planks.map.minFilter=1008;m.planks.map.anisotropy=4;global.THREE=T;v.sweep();assert(m.planks.map.minFilter===1003&&v.snapshot().refiltered>=1,'re-filtered after a loader reset');
 v.set({characterFacets:.25});assert.strictEqual(v.FACET.character.value,.25,'the facet slider is live (a uniform)');
 const patched=v.snapshot().patched;
 v.preset('4c');
 assert(m.planks.map===null&&m.plaster.map===null,'4c plain wood / plaster');assert(Math.abs(m.planks.color.r-.9*200/255)<1e-9&&Math.abs(m.planks.color.b-.7*50/255)<1e-9,'the texture average kept');
 assert(m.stone.map.userData.lookV4Boost&&m.leaf.map.userData.lookV4Boost&&m.stone.map.minFilter===1003,'4c bolder stone / leaves, texel by texel');
 assert(v.FACET.scenery.value===1&&v.FACET.character.value===1&&m.planks.userData.lookV4Facet&&m.iron.userData.lookV4Facet,'4c flat scenery + characters');
 assert.deepStrictEqual(r.boosts[r.boosts.length-1],{path:v.CONTRAST.ground.path,rock:v.CONTRAST.ground.rock,water:v.CONTRAST.water},'4c: ground / water bolder');
 assert(!m.skin.map.userData.lookV4Boost&&m.skin.color.r===.8&&m.skin.map.uuid==='t-skin','characters: map and colour untouched');
 m.skin.color.setRGB(.3,.2,.1);   // the character kit recolours live
 v.preset('3');
 assert(m.planks.map&&m.planks.map.uuid==='t-planks'&&m.planks.color.r===.9&&m.plaster.map.uuid==='t-plaster','v3 restores maps and colours');
 assert(m.stone.map.uuid==='t-stone'&&m.stone.map.minFilter===1008&&m.stone.map.anisotropy===4,'v3 restores the original map and filters');
 assert(v.FACET.scenery.value===0&&v.FACET.character.value===0,'facets off (uniforms at 0: as authored)');
 assert(m.skin.color.r===.3,'the kit\'s own recolour is never overwritten');
 assert.deepStrictEqual(r.boosts[r.boosts.length-1],{path:1,rock:1,water:1},'ground / water back to 1');
 assert(!m.ground.userData.lookV4Facet&&m.ground.map===null&&!m.ground.onBeforeCompile,'the ground is never re-shaded');
 assert.strictEqual(v.snapshot().patched,patched+5,'4c patched the 5 lit scenery materials once; nothing patched twice');
 assert(!v.snapshot().sweeping,'v3: no sweep running');
 r.done();
});

check('4 shaders read uniforms: the blit\'s hsl steps, the ground\'s os_boost, the water\'s holmWaterBoost',()=>{
 const cp=fs.readFileSync(CP,'utf8');assert(/uniform vec3 hsl;/.test(cp)&&/q\.x \* hsl\.x/.test(cp)&&/mode == 0 && palN > 0/.test(cp),'blit: hsl steps, fixed palette kept');
 const gl=fs.readFileSync(path.join(root,'src/holm_oldschool_look.js'),'utf8');assert(/uniform vec4 os_boost;/.test(gl)&&/shader\.uniforms\.os_boost=boostUniform\('ground'\)/.test(gl)&&/os_boost\.w/.test(gl),'ground boost');
 const L=require(path.join(root,'src/holm_oldschool_look.js'));assert.deepStrictEqual(L.setBoost({path:1.8,water:2,bogus:5}),{sand:1,rock:1,earth:1,path:1.8,water:2});L.setBoost({path:1,water:1});
 const w=fs.readFileSync(path.join(root,'src/holm_arrival_water.js'),'utf8');assert(/uniform float holmWaterBoost;/.test(w)&&/\* holmWaterBoost\)/.test(w),'water boost');
});

check('5 the panel: pixel slider <-> lines with the 4a / 2004 snaps; the Settings tab opens it; scripts in order',()=>{
 const v=fresh(V4,{});v.__restore();global.HolmLookV4=v;delete require.cache[require.resolve(PANEL)];const P=require(PANEL);
 assert.strictEqual(P.blockToLines(1),0,'1 = off');assert.strictEqual(P.blockToLines(2.01),503,'snaps to 4a');assert.strictEqual(P.blockToLines(3.03),334,'snaps to 2004');
 assert.strictEqual(P.blockToLines(5),201,'5 px blocks at 1006 px');assert(Math.abs(P.linesToBlock(334)-3.012)<.001);
 delete global.HolmLookV4;
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(/<div class="set-row"[^>]*><span>Look<\/span><button class="set-btn" id="look-btn" onclick="HolmLookPanel\.toggle\(\)">Open<\/button><\/div>/.test(html),'Settings tab: Look row');
 const a=html.indexOf('src/classic_pixels.js'),b=html.indexOf('src/holm_look_v4.js'),c=html.indexOf('src/holm_look_panel.js');assert(a>0&&b>a&&c>b,'classic pixels, look v4, panel in order');
 assert(/holm_look_v4\.js\?v=h[0-9a-f]{8}"/.test(html)&&/holm_look_panel\.js\?v=h[0-9a-f]{8}"/.test(html),'cache-busted');
 const src=fs.readFileSync(PANEL,'utf8');assert(/border-radius:0/.test(src)&&/@media \(max-width:600px\)/.test(src)&&/height:28px/.test(src),'square corners, phone layout, touch-sized thumbs');
});
console.log('[HOLM LOOK V4] '+passed+'/5 checks passed');
