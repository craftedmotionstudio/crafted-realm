/* ================= TEACHING KITCHEN SERVICES =================
 * NPC-free bread lesson for the third complete Tutor's Holm building. The
 * building supplies every ingredient the chef would have handed over in the
 * original brief: buckets from the shelf, flour from the bin, water from the
 * butt, dough from the trough. `cooking_bread.js` already owns the mixing
 * (flour + water + dough -> bread dough) and the bake (bread dough on a fire
 * kind); this module only presents an authored range to that chain.
 *
 * The range is a building PART, so its Object3D position is building-local.
 * Cooking hands the legacy cook loop a world-positioned proxy standing on the
 * authored interaction tile instead, so both raw fish and bread dough use the
 * exact paths the Survival Workyard fire already proved.
 */
var HolmTeachingKitchen=(function(){
  'use strict';
  var BUILDING_ID='holm_teaching_kitchen';
  var RANGE_TILE={x:1.35,z:2.75};          // building-local, from the definition
  var BUCKET_LOAN_LIMIT=2;
  var bound=null,flame=null,flameLight=null,flameParts=[],raf=0;

  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function objective(){
    if(typeof HolmTutorialFlow==='undefined'||typeof Tutorial==='undefined') return 'Bake at your own pace.';
    return HolmTutorialFlow.currentObjective(Tutorial);
  }
  function bakedAlready(){ return !!(typeof Tutorial!=='undefined'&&Tutorial.optional&&Tutorial.optional.bake_bread); }
  function buildingRoot(){ return typeof scene!=='undefined'?scene.getObjectByName('world-object-'+BUILDING_ID):null; }
  function worldPoint(lx,lz){
    var root=buildingRoot(); if(!root) return null;
    root.updateMatrixWorld(true);
    return root.localToWorld(new THREE.Vector3(lx,0,lz));
  }
  function rangeProxy(){
    var p=worldPoint(RANGE_TILE.x,RANGE_TILE.z); if(!p) return null;
    var proxy=new THREE.Object3D();
    var y=(typeof groundY==='function')?groundY(p.x,p.z):p.y;
    proxy.position.set(p.x,y===null?p.y:y,p.z);
    proxy.userData={kind:'fire',range:true,label:'Cook on Teaching range',holmKitchenRange:true};
    return proxy;
  }
  function bucketsHeld(){ return Player.count('bucket')+Player.count('bucket_flour')+Player.count('bucket_water'); }
  function hasSpace(){ return !Player.hasSpace||Player.hasSpace(); }

  /* ---- the range: bread dough bakes, raw fish cooks, anything else is explained ---- */
  function cookAtRange(){
    if(!onHolm()) return;
    var proxy=rangeProxy();
    if(!proxy){ UI.chat('The range is still being lit.','plain'); return; }
    if(Player.usingItem==='bread_dough'&&Player.count('bread_dough')>0){ handleClick(proxy,proxy.position); return; }
    if(Player.usingItem){
      UI.chat('The range bakes bread dough and roasts raw fish. It has no opinion about '+((ITEMS[Player.usingItem]||{}).name||'that')+'.','plain');
      Player.usingItem=null; UI.refreshInv(); return;
    }
    if(Player.count('raw_perch')>0){ handleClick(proxy,proxy.position); return; }
    if(Player.count('bread_dough')>0){ UI.chat('Click the bread dough in your pack, then the range, to bake it.','plain'); return; }
    if(Player.count('bucket_flour')>0||Player.count('bucket_water')>0||Player.count('dough')>0){
      UI.chat('Mix first: click the flour, water or dough in your pack to knead bread dough, then bake it here.','plain'); return;
    }
    UI.chat('The range is banked and hot. Fetch a bucket, fill it with flour, fill another with water, and take dough from the trough.','plain');
  }
  function studyRange(){
    if(!onHolm()) return;
    UI.dialogue('The teaching range',
      'Bread oven on the left, iron hob on the right, ash pit below. The Holm bakes its storm ration here: two buckets, one lump of dough, one patient loaf. '+
      (bakedAlready()?'You have already baked one. The rack remembers.':'Current lesson: '+objective()),
      [{label:bakedAlready()?'One more for the road.':'Buckets first, then.'}],'🍞');
  }

  /* ---- ingredient stations ---- */
  function takeBucket(){
    if(!onHolm()) return;
    if(bucketsHeld()>=BUCKET_LOAN_LIMIT){ UI.chat('Two buckets are plenty for one loaf. Return one to the shelf once it is empty.','plain'); return; }
    if(!hasSpace()){ UI.chat('You need a free inventory slot for the bucket.','plain'); return; }
    Player.addItem('bucket',1); if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click();
    UI.chat('You lift a stave bucket from the shelf. The flour bin and the water butt will each fill one.','plain');
  }
  function returnBucket(){
    if(!onHolm()) return;
    if(Player.count('bucket')<1){ UI.chat('You have no empty bucket to hang back on the shelf.','plain'); return; }
    Player.removeItem('bucket',1); UI.refreshInv();
    UI.chat('You hang the empty bucket back on its peg.','plain');
  }
  function fillFrom(id,label,line){
    return function(){
      if(!onHolm()) return;
      if(Player.count('bucket')<1){
        UI.chat(Player.count(id)>0?'Your bucket of '+label+' is already full.':'You need an empty bucket. Two hang on the shelf beside the yard door.','plain');
        return;
      }
      Player.removeItem('bucket',1); Player.addItem(id,1); UI.refreshInv();
      if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click();
      UI.chat(line,'plain');
    };
  }
  var fillFlour=fillFrom('bucket_flour','flour','You scoop pale flour into the bucket until it heaps. Mind the dust.');
  var fillWater=fillFrom('bucket_water','water','You dip the bucket into the butt. Cold, clean and sloshing.');
  function takeDough(){
    if(!onHolm()) return;
    if(Player.count('dough')>0||Player.count('bread_dough')>0){ UI.chat('You already carry dough. Mix it with flour and water before taking more.','plain'); return; }
    if(!hasSpace()){ UI.chat('You need a free inventory slot for the dough.','plain'); return; }
    Player.addItem('dough',1); if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click();
    UI.chat('You lift a cool lump of dough from under the proving cloth. Now knead it into the flour and water.','plain');
  }
  function readRecipe(){
    if(!onHolm()) return;
    UI.dialogue('Storm ration loaf',
      '1. Take a bucket from the shelf. 2. Fill one with flour from the bin, one with water from the butt. 3. Take dough from the trough. 4. Click the flour, water or dough in your pack to knead bread dough. 5. Click the bread dough, then the range. Beneath the rows: “Eleven storm seasons. Eleven times this loaf fed the island. Learn it once and you will never go hungry on Tutor\'s Holm.”',
      [{label:bakedAlready()?'Already learned it.':'A loaf it is.'}],'📜');
  }

  /* ---- optional-lesson ledger: the bake event is optional, but it deserves a mark ---- */
  function markOptional(id,label){
    if(typeof Tutorial==='undefined') return;
    Tutorial.optional=Tutorial.optional||{};
    if(Tutorial.optional[id]) return;
    Tutorial.optional[id]=true;
    UI.chat('Optional lesson complete: '+label+'.','xp');
    try{ if(typeof Sfx!=='undefined'&&Sfx.quest) Sfx.quest(); }catch(e){}
    try{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }catch(e){}
  }
  (function wrapNotify(){
    if(typeof Tutorial==='undefined'||Tutorial._kitchenWrapped) return;
    Tutorial._kitchenWrapped=true;
    var orig=Tutorial.notify.bind(Tutorial);
    Tutorial.notify=function(ev,match){
      try{ if(ev==='bake'&&match==='bread') markOptional('bake_bread','Bake bread in the Teaching Kitchen'); }catch(e){}
      return orig(ev,match);
    };
  })();

  /* ---- range flame: anything that moves in reality ships animated ---- */
  function bindFlame(){
    var root=buildingRoot();
    if(root===bound) return;
    bound=root; flame=null; flameLight=null; flameParts=[];
    if(!root||typeof WorldV2Buildings==='undefined') return;
    flame=WorldV2Buildings.findPart(root,'range_flame');
    if(!flame) return;
    flame.traverse(function(ch){ if(ch.isMesh) flameParts.push({m:ch,sx:ch.scale.x,sy:ch.scale.y,sz:ch.scale.z}); });
    flameLight=new THREE.PointLight(0xff7a28,.85,6.5,2);
    flameLight.position.set(0,.55,0);
    flame.add(flameLight);
  }
  function flicker(){
    if(!flame||!flameParts.length) return;
    var t=performance.now()*.001,pulse=.9+.1*Math.sin(t*7.3)+.06*Math.sin(t*13.1);
    for(var i=0;i<flameParts.length;i++){
      var p=flameParts[i];
      p.m.scale.set(p.sx*(1+.05*Math.sin(t*11+i)),p.sy*(pulse+.05*Math.sin(t*9+i*1.7)),p.sz*(1+.04*Math.cos(t*10+i)));
    }
    if(flameLight) flameLight.intensity=.65+pulse*.4;
  }
  function animate(){ flicker(); raf=requestAnimationFrame(animate); }
  setInterval(function(){ try{ bindFlame(); }catch(e){} },700);
  // Background tabs freeze animation frames; keep the ember alive at a low rate there.
  setInterval(function(){ try{ if(typeof document!=='undefined'&&document.hidden) flicker(); }catch(e){} },80);
  animate();

  // Every station handler first walks the player onto its authored interaction
  // tile (through the real doors), so no wall station can be used from outside.
  var R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard(BUILDING_ID,tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_kitchen_range',option:'Cook',primary:true,walkTo:true,reach:2.2,handler:inside(RANGE_TILE,cookAtRange)});
    Interact.register({target:'kind:holm_kitchen_range',option:'Study',walkTo:true,reach:2.2,handler:inside(RANGE_TILE,studyRange)});
    Interact.register({target:'kind:holm_flour_bin',option:'Fill bucket',primary:true,walkTo:true,reach:2.0,handler:inside({x:4.45,z:-3.95},fillFlour)});
    Interact.register({target:'kind:holm_water_butt',option:'Fill bucket',primary:true,walkTo:true,reach:2.0,handler:inside({x:4.6,z:-0.35},fillWater)});
    Interact.register({target:'kind:holm_dough_trough',option:'Take dough',primary:true,walkTo:true,reach:2.0,handler:inside({x:3.3,z:-3.2},takeDough)});
    Interact.register({target:'kind:holm_bucket_shelf',option:'Take',primary:true,walkTo:true,reach:1.9,handler:inside({x:-5.5,z:-3.5},takeBucket)});
    Interact.register({target:'kind:holm_bucket_shelf',option:'Return bucket',walkTo:true,reach:1.9,handler:inside({x:-5.5,z:-3.5},returnBucket)});
    Interact.register({target:'kind:holm_recipe_board',option:'Read',primary:true,walkTo:true,reach:2.0,handler:inside({x:-5.2,z:-3.75},readRecipe)});
  }
  return {cookAtRange:cookAtRange,studyRange:studyRange,takeBucket:takeBucket,returnBucket:returnBucket,
    fillFlour:fillFlour,fillWater:fillWater,takeDough:takeDough,readRecipe:readRecipe,
    rangeProxy:rangeProxy,status:function(){ return {bound:!!bound,flame:!!flame,baked:bakedAlready()}; }};
})();
if(typeof globalThis!=='undefined') globalThis.HolmTeachingKitchen=HolmTeachingKitchen;
