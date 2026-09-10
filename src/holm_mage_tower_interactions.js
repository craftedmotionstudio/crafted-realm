/* ================= MAGE TOWER SERVICES =================
 * NPC-free magic orientation for the eighth complete Tutor's Holm building.
 * The magic trial stays deferred to the modelled practice target (its
 * casting socket is authored in the GLB and the definition), so this module
 * teaches what can be taught without a kill: which runes a wind spell burns
 * at the rune table, how the spellbook is read at the lectern, and the
 * tower's story on the register. Nothing here grants a lesson.
 */
var HolmMageTower=(function(){
  'use strict';
  var BUILDING_ID='holm_mage_tower';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function objective(){
    if(typeof HolmTutorialFlow==='undefined'||typeof Tutorial==='undefined') return 'Study at your own pace.';
    return HolmTutorialFlow.currentObjective(Tutorial);
  }
  function count(id){ try{ return (Player.inv||[]).reduce(function(n,s){ return n+((s&&s.id===id)?(s.qty||1):0); },0); }catch(e){ return 0; } }
  function openSpellsTab(){
    try{ var btn=document.querySelector('.tab-btn[data-tab="spells"]'); if(btn){ btn.click(); return true; } }catch(e){}
    return false;
  }
  function studyTable(){
    if(!onHolm()) return;
    var air=count('air_rune'),mind=count('mind_rune');
    UI.dialogue('The rune table',
      'Two runes lie sorted on the velvet: pale air runes and blue mind runes. Wind Strike burns one of each; the spell will not cast without both in your pack. '+
      (air&&mind?'You carry '+air+' air and '+mind+' mind: enough to try it.':'You carry '+air+' air and '+mind+' mind runes. The practice target will wait until the wardens allow it.')+
      ' Choose the spell on the 🪄 spellbook tab and click a target. Current lesson: '+objective(),
      [{label:'Show me the spellbook.',fn:function(){ openSpellsTab(); }},{label:'I will study later.'}],'🪄');
    openSpellsTab();
    UI.chat('[MAGE TOWER] Wind Strike burns one air rune and one mind rune per cast. Pick it on the 🪄 tab, then click a target.','sys');
  }
  function studyLectern(){
    if(!onHolm()) return;
    UI.dialogue('The spell lectern',
      'The primer lies open at the first page: every spell lists its level, the runes it burns and what it does. A staff that provides a rune saves you carrying that rune at all. Magic experience comes from casts that land, so aim at something that hits back only when you are ready.',
      [{label:'Open the spellbook.',fn:function(){ openSpellsTab(); }},{label:'Bronze first, magic later.'}],'📖');
  }
  function readRegister(){
    if(!onHolm()) return;
    UI.dialogue('The tower register',
      'A parchment under a blue wax seal lists every learner who cast their first wind spell here, and the study upstairs they were allowed into afterwards. The newest line is blank and the ink is fresh: “Whoever surfaces from the Wardens’ hall next, the circle is swept and the runes are counted.”',
      [{label:'The circle is swept.'}],'📜');
  }
  var R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard(BUILDING_ID,tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_rune_table',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:-1.5,z:-1.5},studyTable)});
    Interact.register({target:'kind:holm_spell_lectern',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:3.5,z:0.5},studyLectern)});
    Interact.register({target:'kind:holm_tower_register',option:'Read',primary:true,walkTo:true,reach:2.6,handler:inside({x:3.5,z:-1.5},readRegister)});
  }
  return {studyTable:studyTable,studyLectern:studyLectern,readRegister:readRegister};
})();
if(typeof globalThis!=='undefined') globalThis.HolmMageTower=HolmMageTower;
