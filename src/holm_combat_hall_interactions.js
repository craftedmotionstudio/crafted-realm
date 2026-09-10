/* ================= COMBAT HALL SERVICES =================
 * NPC-free combat orientation for the seventh complete Tutor's Holm building.
 * The melee and ranged trials stay deferred to the modelled practice enemies
 * (their standing sockets are authored in the GLB and the definition), so this
 * module teaches what can be taught without a kill: attack styles at the pell,
 * equipment and ammunition at the rack of arms, and the story on the roll.
 * The Training Cavern's exit stair surfaces inside the drill tower; nothing
 * here grants a lesson.
 */
var HolmCombatHall=(function(){
  'use strict';
  var BUILDING_ID='holm_combat_hall';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function objective(){
    if(typeof HolmTutorialFlow==='undefined'||typeof Tutorial==='undefined') return 'Train at your own pace.';
    return HolmTutorialFlow.currentObjective(Tutorial);
  }
  function weapon(){ try{ return Player.equip&&Player.equip.weapon?((ITEMS[Player.equip.weapon]||{}).name||Player.equip.weapon):null; }catch(e){ return null; } }
  function openCombatTab(){
    try{ var btn=document.querySelector('.tab-btn[data-tab="combat"]'); if(btn){ btn.click(); return true; } }catch(e){}
    return false;
  }
  function openEquipmentTab(){
    try{ var btn=document.querySelector('.tab-btn[data-tab="equipment"], .tab-btn[data-tab="equip"]'); if(btn){ btn.click(); return true; } }catch(e){}
    return false;
  }
  function studyPell(){
    if(!onHolm()) return;
    var w=weapon();
    UI.dialogue('The training pell',
      'Every swing at this post is one of three: Accurate to land more blows, Aggressive to hit harder, Defensive to take fewer. Pick a style on the ⚔ combat tab and the pell does not care which, but the grubkin beyond the Ditch will. '+
      (w?'You are wielding '+w+'; that is what you will swing.':'You are not wielding anything. Open your pack and click a weapon to wield it.')+
      ' The practice sparring partner will stand in the yard once the wardens allow it. Current lesson: '+objective(),
      [{label:'Show me the styles.',fn:function(){ openCombatTab(); }},{label:'I will spar later.'}],'⚔');
    openCombatTab();
    UI.chat('[COMBAT HALL] Attack styles: Accurate, Aggressive, Defensive. Wield a weapon from your pack; choose a style on the ⚔ tab.','sys');
  }
  function studyRack(){
    if(!onHolm()) return;
    UI.dialogue('The rack of arms',
      'One peg per slot: head, body, legs, hands, feet, cape, neck, ring, and the two that matter first, weapon and shield. A bow needs arrows in the ammunition slot; a staff needs runes in your pack. Bronze for now; the ore under this hall decides the rest.',
      [{label:'Show my equipment.',fn:function(){ openEquipmentTab(); }},{label:'Bronze for now.'}],'🛡');
  }
  function readRoll(){
    if(!onHolm()) return;
    UI.dialogue('The Wardens\' roll of honour',
      'Names cut into brass under a small steel helm, the first miners to climb the cavern stair into this hall. The last line is fresh: “Whoever surfaces next, the pell is waiting and the bank is across the ridge.”',
      [{label:'The pell is waiting.'}],'🪖');
  }
  var R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard(BUILDING_ID,tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_training_post',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:-1,z:2.2},studyPell)});
    Interact.register({target:'kind:holm_arms_rack',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:-2,z:-3.4},studyRack)});
    Interact.register({target:'kind:holm_warden_roll',option:'Read',primary:true,walkTo:true,reach:2.6,handler:inside({x:-4.6,z:-2.5},readRoll)});
  }
  return {studyPell:studyPell,studyRack:studyRack,readRoll:readRoll};
})();
if(typeof globalThis!=='undefined') globalThis.HolmCombatHall=HolmCombatHall;
