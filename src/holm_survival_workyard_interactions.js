/* ================= SURVIVAL WORKYARD SERVICES =================
 * NPC-free teaching and story interactions for the second complete Tutor's
 * Holm building. These keep the environment useful before modelled tutors are
 * introduced and make every authored interior anchor explain its placement.
 */
var HolmSurvivalWorkyard=(function(){
  'use strict';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function currentObjective(){
    if(typeof HolmTutorialFlow==='undefined'||typeof Tutorial==='undefined') return 'Learn the survival circuit at your own pace.';
    return HolmTutorialFlow.currentObjective(Tutorial);
  }
  function inspectTools(){
    if(!onHolm()) return;
    UI.dialogue('The survival tool bench',
      'Every tool has a place because every lesson has an order: sharpen the hatchet, cut one marked tree, light a controlled fire, then carry the net to the pond. Current lesson: '+currentObjective(),
      [{label:'Tools first. Heroics later.'}],'🪓');
    UI.chat('[SURVIVAL WOOD] Work bench → marked trees → teaching fire → pond shore.','sys');
  }
  function readFireBoard(){
    if(!onHolm()) return;
    UI.dialogue('Firemaking without eyebrow loss',
      'The chalk marks show a dry base, crossed kindling, and a clear windward side. A final note reads: “If the smoke follows you, move. The smoke has made its decision.”',
      [{label:'Sound island wisdom.'}],'🔥');
  }
  function inspectStormTally(){
    if(!onHolm()) return;
    UI.dialogue('The storm tally',
      'Eleven deep cuts mark the seasons when supply boats could not reach the Holm. The last cut is crossed through. Beneath it: “We stopped teaching tricks and began teaching survival.”',
      [{label:'So the lessons have a reason.'}],'⛈');
  }
  function inspectNetRack(){
    if(!onHolm()) return;
    UI.chat('The net is mended, weighted, and hung to dry. Cork floats mark the safe teaching line; the deeper water is deliberately left alone.','plain');
  }
  function studyHearth(){
    if(!onHolm()) return;
    UI.dialogue('The many-sided teaching hearth',
      'The octagonal room keeps every learner in sight of the fire. The kettle crane demonstrates cooking; the stone back and clear floor demonstrate how to keep one useful flame from becoming an island-wide lesson.',
      [{label:'Useful fire. Contained fire.'}],'Fire');
  }
  function takeBucket(ctx){
    if(!onHolm()||!ctx||!ctx.obj)return;
    if(ctx.obj.userData.bucketTaken){UI.chat('The bucket shelf is empty. Another lesson bucket will be returned shortly.','plain');return;}
    if(!Player.addItem('bucket',1)){UI.chat('You need a free inventory slot for the bucket.','plain');return;}
    ctx.obj.userData.bucketTaken=true;ctx.obj.visible=false;UI.refreshInv();
    UI.chat('You take the empty lesson bucket. The pond pulley can fill it with water.','plain');
    setTimeout(function(){
      if(!ctx.obj)return;ctx.obj.userData.bucketTaken=false;ctx.obj.visible=true;
    },30000);
  }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_survival_tools',option:'Inspect',primary:true,walkTo:true,reach:2.1,handler:inspectTools});
    Interact.register({target:'kind:holm_firemaking_board',option:'Read',primary:true,walkTo:true,reach:2.0,handler:readFireBoard});
    Interact.register({target:'kind:holm_storm_tally',option:'Inspect',primary:true,walkTo:true,reach:2.0,handler:inspectStormTally});
    Interact.register({target:'kind:holm_net_rack',option:'Inspect',primary:true,walkTo:true,reach:2.1,handler:inspectNetRack});
    Interact.register({target:'kind:holm_teaching_hearth',option:'Study',primary:true,walkTo:true,reach:2.1,handler:studyHearth});
    Interact.register({target:'kind:holm_empty_bucket',option:'Take',primary:true,walkTo:true,reach:1.8,handler:takeBucket});
  }
  return {inspectTools:inspectTools,readFireBoard:readFireBoard,
    inspectStormTally:inspectStormTally,inspectNetRack:inspectNetRack,
    studyHearth:studyHearth,takeBucket:takeBucket};
})();
