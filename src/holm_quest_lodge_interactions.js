/* ================= QUEST LODGE SERVICES =================
 * Existing board service: successful journal opening emits orient/quests.
 * The current installed curriculum still records this as optional. Full
 * curriculum restoration and the required modelled guide remain unfinished;
 * the board is not a substitute for that guide or completed island acceptance.
 */
var HolmQuestLodge=(function(){
  'use strict';
  // the live island, or the Sept 13 island draft (?holmIsland=1, M4.2) where the same services sit in the Blender buildings
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&(CRWorldMode.providerId==='tutors-holm-v2'||(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive())); }
  function learned(){ return !!(typeof Tutorial!=='undefined'&&Tutorial.optional&&Tutorial.optional.learn_quests); }
  function questCount(){
    try{ return Object.keys(typeof QUESTS!=='undefined'?QUESTS:{}).length; }catch(e){ return 0; }
  }
  function openJournal(){
    try{
      var btn=document.querySelector('#side-panel .tab-btn[data-tab="quests"], .tab-btn[data-tab="quests"]');
      if(btn){
        btn.click();
        var pane=document.getElementById('pane-quests');
        return !!(pane&&pane.classList.contains('active'));
      }
    }catch(e){}
    return false;
  }
  function markOptional(id,label){
    if(typeof Tutorial==='undefined') return;
    Tutorial.optional=Tutorial.optional||{};
    if(Tutorial.optional[id]) return;
    Tutorial.optional[id]=true;
    UI.chat('Optional lesson complete: '+label+'.','xp');
    try{ if(typeof Sfx!=='undefined'&&Sfx.quest) Sfx.quest(); }catch(e){}
  }
  (function wrapNotify(){
    if(typeof Tutorial==='undefined'||Tutorial._lodgeWrapped) return;
    Tutorial._lodgeWrapped=true;
    var orig=Tutorial.notify.bind(Tutorial);
    Tutorial.notify=function(ev,match){
      var result=orig(ev,match);
      if(onHolm()&&ev==='orient'&&match==='quests'){
        markOptional('learn_quests','Study the Quest Lodge board');
        try{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }
        catch(e){ console.error('[QUEST LODGE] Could not save lesson progress',e); }
      }
      return result;
    };
  })();

  function openStudiedJournal(){
    if(!onHolm()) return false;
    if(!openJournal()){
      UI.chat('Your journal could not open. Try the board again when the side panel is ready.','sys');
      return false;
    }
    if(typeof Tutorial!=='undefined') Tutorial.notify('orient','quests');
    return true;
  }
  function studyBoard(){
    if(!onHolm()) return;
    var n=questCount();
    UI.dialogue('The great quest board',
      'Every notice here is a story someone in the realm needs finished: a lost tool, a stubborn beast, a road that wants opening. None of them is the story. Pick the ones you like, in the order you like; the journal remembers the rest. '+
      (n?''+n+' quests are known to the journal today. ':'')+
      'The ⭐ tab on your side panel is your journal: it lists every quest, its stages, requirements and rewards.',
      [{label:'Open my journal.',fn:openStudiedJournal},{label:'I will choose my own road.'}],'📜');
    UI.chat('[QUEST LODGE] Quests are optional stories, not a single rail. Track one from the ⭐ journal tab.','sys');
    openStudiedJournal();
  }
  function studyChart(){
    if(!onHolm()) return;
    UI.dialogue('Chart of the four roads',
      'Red wax: Veyhollow Commons, safe civic life beyond the ferry. Brass: Emberwood and Stonereach, the production road of timber and ore. Brass again: Mirrorpond and Gloomfen, mystery and marsh. Iron: the Scarlands, where the Ditch ends and the danger begins. Four roads from one square, walked in any order.',
      [{label:'Four roads, no rails.'}],'🗺');
  }
  function readLedger(){
    if(!onHolm()) return;
    UI.dialogue('The Ledger of Choices',
      'Names in one column, first quests in the next. No two rows match. Beneath the last entry, in the keeper\'s hand: “No newcomer to the Holm was ever given one road to walk. Do not start now.”'+
      (learned()?' Your own row is marked: you studied the board.':''),
      [{label:learned()?'My row is written.':'I will write my row.'}],'📖');
  }
  // Every station handler first walks the player onto its authored interaction
  // tile (through the real doors), so nothing can be studied through a wall.
  var B='holm_quest_lodge',R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard(B,tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_quest_board',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:0.6,z:-2.6},studyBoard)});
    Interact.register({target:'kind:holm_quest_board',option:'Open journal',walkTo:false,handler:function(){ openJournal(); }});
    Interact.register({target:'kind:holm_region_map',option:'Study',primary:true,walkTo:true,reach:2.2,handler:inside({x:-2.4,z:-2.4},studyChart)});
    Interact.register({target:'kind:holm_story_ledger',option:'Read',primary:true,walkTo:true,reach:2.0,handler:inside({x:-1.9,z:2.7},readLedger)});
  }
  return {studyBoard:studyBoard,studyChart:studyChart,readLedger:readLedger,openJournal:openJournal,
    status:function(){ return {learned:learned(),quests:questCount()}; }};
})();
if(typeof globalThis!=='undefined') globalThis.HolmQuestLodge=HolmQuestLodge;
