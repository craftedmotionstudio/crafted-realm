/* Tutor's Holm live switch (finish goal M7.2). One place decides, once per boot, whether this adventurer plays the new
 * Blender island, and under which provider id:
 *  - ?holmIsland=1 : the QA island draft (provider 'tutors-holm-arrival-qa', isolated qaProfile required), as before;
 *  - GameConfig.holmIslandLive : production. A new adventurer, or a save whose provider is on the Holm
 *    ('tutors-holm-v2' / 'tutors-holm-v3'), boots on the island as 'tutors-holm-v3'. Mainland and graduated saves are
 *    never touched. ?holmLegacy=1 forces the old island for one session (support switch).
 * Assets: the island's Blender candidates and data are published by tools/publish_holm_island.js to
 * assets/holm_island/{ws,data}/ (Studio Safe Publish); asset() maps the authoring URLs to the published copies when
 * GameConfig.holmIslandPublished is on (and always in production), so the draft and the live island share one loader.
 * Reversible: turn GameConfig.holmIslandLive off and island saves fall back to the old island at its arrival landmark,
 * keeping items, bank and lesson credit (world_v2_boot_select unknown-provider fallback). */
var HolmIsland=(function(){
 'use strict';
 var qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams('');
 var cfg=typeof GameConfig!=='undefined'?GameConfig:{};
 var qa=qs.get('holmIsland')==='1',legacy=qs.get('holmLegacy')==='1';
 var ID_LIVE='tutors-holm-v3',ID_QA='tutors-holm-arrival-qa';
 function savedProvider(){
  try{var key=typeof QAProfile!=='undefined'&&QAProfile.key?QAProfile.key:null;if(!key)return null;
   var raw=localStorage.getItem(key);if(!raw)return null;var d=JSON.parse(raw);return d&&d.world&&d.world.provider||null}catch(e){return null}
 }
 var saved=savedProvider();
 // production: new adventurers and Holm saves only (never a mainland or graduated save)
 // ?holmLive=1 rehearses production in an isolated QA profile only (never on a public host / real save)
 var rehearse=qs.get('holmLive')==='1'&&typeof QAProfile!=='undefined'&&QAProfile.isolated;
 var prod=!qa&&!legacy&&(!!cfg.holmIslandLive||rehearse)&&(!saved||/^tutors-holm-(v2|v3)$/.test(saved));
 function live(){return qa||prod}
 function isIslandProvider(id){return id===ID_LIVE||id===ID_QA}
 function isHolmProvider(id){return /^tutors-holm-/.test(id||'')}
 var published=prod||!!cfg.holmIslandPublished;
 function asset(url){
  if(!published||typeof url!=='string')return url;
  return url.replace(/^\/?\.studio-workspaces\//,'assets/holm_island/ws/').replace(/^\/?docs\/rebuild\/holm-overhaul\//,'assets/holm_island/data/');
 }
 return {live:live,qa:function(){return qa},production:function(){return prod},ID:qa?ID_QA:ID_LIVE,ID_LIVE:ID_LIVE,ID_QA:ID_QA,
  isIslandProvider:isIslandProvider,isHolmProvider:isHolmProvider,asset:asset,published:function(){return published},savedProvider:function(){return saved}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIsland;
