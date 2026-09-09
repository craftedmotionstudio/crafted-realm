/* ================= LOCAL QA PROFILE ISOLATION =================
 * Local testers may append ?qaProfile=<slug> to use a separate durable save.
 * Public hosts always resolve to the ordinary player save key.
 */
(function(global){
  'use strict';
  function isLocal(host){return host==='127.0.0.1'||host==='localhost'||host==='::1';}
  function normalize(value){
    value=String(value||'').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(value)?value:null;
  }
  function resolve(locationLike){
    locationLike=locationLike||{};
    var host=String(locationLike.hostname||'');
    var search=String(locationLike.search||'');
    var raw=null;
    try{raw=new URLSearchParams(search).get('qaProfile');}catch(error){}
    var id=isLocal(host)?normalize(raw):null;
    return {id:id,isolated:!!id,key:id?'motionscape_save__qa_'+id:'motionscape_save'};
  }
  var current=resolve(typeof location!=='undefined'?location:null);
  var api={id:current.id,isolated:current.isolated,key:current.key,resolve:resolve,normalize:normalize};
  global.QAProfile=api;
  if(current.isolated&&typeof document!=='undefined'){
    document.documentElement.setAttribute('data-qa-profile',current.id);
    if(global.console&&console.info)console.info('[QA_PROFILE] isolated save '+current.id);
  }
  // Read-only engine sight for evidence collection. No action or state mutators are exposed.
  if(isLocal(String((typeof location!=='undefined'&&location.hostname)||''))){
    function copy(value){if(value==null)return value;try{return JSON.parse(JSON.stringify(value));}catch(error){return null;}}
    function num(value){return Number.isFinite(Number(value))?Number(value):null;}
    function messages(){
      if(typeof document==='undefined')return [];
      var root=document.querySelector('#chat-log, #chat-messages');
      if(!root)return [];
      return Array.prototype.slice.call(root.children||[],-12).map(function(node){return String(node.textContent||'').trim();}).filter(Boolean);
    }
    function snapshot(){
      var p=global.Player||global.player||{};
      var pos=(p.mesh&&p.mesh.position)||p.position||{};
      var inventory=Array.isArray(p.inventory)?p.inventory.map(function(item,slot){return item?{slot:slot,id:item.id||item.itemId||null,qty:num(item.qty==null?item.quantity:item.qty)}:null;}).filter(Boolean):[];
      return Object.freeze({
        capturedAt:new Date().toISOString(),
        qaProfile:{id:current.id,isolated:current.isolated,key:current.key},
        saveKey:(global.SaveGame&&global.SaveGame.KEY)||current.key,
        position:{x:num(pos.x),y:num(pos.y),z:num(pos.z),plane:num(p.plane)},
        provider:p.provider||p.worldProvider||null,
        zone:p.zone||p.zoneId||null,
        action:copy(p.action?{type:p.action.type||null,target:p.action.targetId||p.action.target||null}:null),
        inventory:inventory,
        bank:copy(p.bank||{}),equipment:copy(p.equipment||{}),xp:copy(p.xp||{}),
        tutorial:{step:p.tutorialStep==null?null:p.tutorialStep,complete:!!p.tutorialComplete,curriculumVersion:p.curriculumVersion||null},
        messages:messages(),smoke:copy(global.SMOKE_RESULT||null),
        uncaughtErrors:Array.isArray(global.SMOKE_ERRORS)?global.SMOKE_ERRORS.length:0
      });
    }
    global.CRAFT_QA_SIGHT=Object.freeze({version:1,snapshot:snapshot});
    if(global.console&&console.info)console.info('[QA_SIGHT] read-only snapshot ready');
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
