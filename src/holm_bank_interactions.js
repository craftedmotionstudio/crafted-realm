/* ================= HOLM BANK SERVICES =================
 * NPC-free banking for the sixth complete Tutor's Holm building. The vault
 * chest (a separate chunk object of kind 'bank') still opens the bank through
 * the engine's own path, and tutorial_ext's UI.openBank wrap still records the
 * required `open_bank` lesson. The teller booths call the same UI.openBank, so
 * the lesson can be earned at the counter the way OSRS teaches it, while the
 * ledger desk and founders' plaque carry the explanation and the story.
 */
var HolmBank=(function(){
  'use strict';
  var BUILDING_ID='holm_bank';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function objective(){
    if(typeof HolmTutorialFlow==='undefined'||typeof Tutorial==='undefined') return 'Bank at your own pace.';
    return HolmTutorialFlow.currentObjective(Tutorial);
  }
  function useBooth(){
    if(!onHolm()) return;
    if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click();
    UI.chat('The teller slides the brass grille aside and opens your account.','plain');
    UI.openBank();
  }
  function studyLedger(){
    if(!onHolm()) return;
    var slots=(typeof Player!=='undefined'&&Player.bank)?Player.bank.filter(Boolean).length:0;
    UI.dialogue('The ledger desk',
      'One ledger, one name, every bank. Whatever you place in the chest here waits for you at every bank booth in the realm, and nothing in a bank can be lost, burned, or dropped. '+
      (slots?'Your page holds '+slots+' kind'+(slots===1?'':'s')+' of thing so far.':'Your page is still blank.')+
      ' Current lesson: '+objective(),
      [{label:'One ledger, every bank.'}],'📒');
    UI.chat('[HOLM BANK] Items in the bank are shared by every bank and can never be lost.','sys');
  }
  function readPlaque(){
    if(!onHolm()) return;
    UI.dialogue('The founders\' plaque',
      'A single coin in relief above four names. Beneath: “The first deposit on this island was twenty-five crowns, and it bought the first skiff. Keep what you earn; the road inland is paid for.”',
      [{label:'Twenty-five crowns.'}],'🪙');
  }
  /* The booths' visible geometry is brass bars and a thin sill: a real pointer
   * click slips between them onto the floor. Give each booth a generous
   * invisible hit volume (the Workyard fishing-edge pattern) once the building
   * streams in; the picker walks up to the booth part, so the hook still fires. */
  var bound=null;
  function bindProxies(){
    var root=typeof scene!=='undefined'?scene.getObjectByName('world-object-'+BUILDING_ID):null;
    if(root===bound) return; bound=root;
    if(!root||typeof WorldV2Buildings==='undefined') return;
    ['bank_booth_w','bank_booth_e','ledger_desk'].forEach(function(id){
      var part=WorldV2Buildings.findPart(root,id); if(!part||part.userData._hitProxy) return;
      var tall=id!=='ledger_desk';
      var proxy=new THREE.Mesh(new THREE.BoxGeometry(tall?1.6:2.0,tall?2.2:1.2,tall?0.8:1.1),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
      proxy.position.set(0,tall?2.0:0.6,0); proxy.name=id+'-hit-proxy'; part.add(proxy); part.userData._hitProxy=true;
    });
  }
  setInterval(function(){ try{ bindProxies(); }catch(e){} },700);
  var R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard(BUILDING_ID,tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_bank_booth',option:'Use',primary:true,walkTo:true,reach:2.6,handler:function(ctx){
      var part=ctx&&ctx.obj&&ctx.obj.userData&&ctx.obj.userData.partId;
      var tile=part==='bank_booth_e'?{x:0,z:1.2}:{x:-3,z:1.2};
      inside(tile,useBooth)(ctx);
    }});
    Interact.register({target:'kind:holm_bank_ledger',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:-3,z:-1.2},studyLedger)});
    Interact.register({target:'kind:holm_bank_plaque',option:'Read',primary:true,walkTo:true,reach:2.6,handler:inside({x:-3.6,z:1.6},readPlaque)});
  }
  return {useBooth:useBooth,studyLedger:studyLedger,readPlaque:readPlaque};
})();
if(typeof globalThis!=='undefined') globalThis.HolmBank=HolmBank;
