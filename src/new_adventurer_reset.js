/* Call only from the existing confirmed New Adventurer action.
 * Deletes one verified profile key, then rebuilds all runtime state by reload.
 * No player/provider mutation or UI registration. Caller displays result.message
 * on failure and must not continue into creation in the old document.
 */
var NewAdventurerReset=(function(){
  'use strict';
  var reloading=false;
  function failure(code,message,deleted){return {ok:false,code:code,message:message,saveDeleted:deleted===undefined?false:deleted};}
  function reset(){
    if(reloading) return failure('reload-pending','The new adventurer is loading. Please wait.',true);
    if(typeof running==='undefined'||running!==false)
      return failure('not-at-login','Return to the welcome screen before starting a new adventurer.');
    if(typeof SaveGame==='undefined'||typeof Persist==='undefined'||!Persist.store||
        typeof SaveGame.available!=='function')
      return failure('storage-unavailable','Your save could not be accessed. Please try again; creation has not started.');
    var key=SaveGame.KEY,store=Persist.store;
    if(typeof key!=='string'||!key||typeof QAProfile==='undefined'||QAProfile.key!==key)
      return failure('profile-mismatch','The selected save could not be verified. Reload the welcome screen and try again.');
    if(typeof store.get!=='function'||typeof store.has!=='function'||typeof store.del!=='function')
      return failure('storage-unavailable','Your save could not be accessed. Please try again; creation has not started.');
    if(typeof location==='undefined'||typeof location.reload!=='function')
      return failure('reload-unavailable','The game cannot reload here. Your save has not been erased.');
    function read(){
      var raw=store.get(key),exists=store.has(key);
      if(typeof exists!=='boolean'||(raw!==null&&typeof raw!=='string')||exists!==(raw!==null))
        throw new Error('Storage readback is unavailable or inconsistent.');
      return {raw:raw,exists:exists};
    }
    try{
      if(SaveGame.available()!==true) return failure('storage-unavailable','Your save could not be accessed. Please try again; creation has not started.');
      read(); // Never delete without a working, consistent readback interface.
    }catch(e){return failure('read-failed','Your save could not be read reliably. It has not been erased. Please try again.');}
    try{store.del(key);}catch(e){
      return failure('delete-failed','The save reset could not be verified. Creation has not started. Please try again.',null);
    }
    try{
      if(read().exists) return failure('delete-refused','Your save is still present. It has not been reset. Please try again.');
    }catch(e){return failure('verify-failed','The save reset could not be verified. Creation has not started. Please try again.',null);}
    reloading=true;
    try{location.reload();}catch(e){
      reloading=false;
      return failure('reload-failed','The selected save was erased, but the game could not reload. Reload this page manually before creating an adventurer.',true);
    }
    return {ok:true,code:'reloading',message:'Starting a fresh adventurer. The game is reloading.',saveDeleted:true};
  }
  return {reset:reset};
})();
if(typeof globalThis!=='undefined') globalThis.NewAdventurerReset=NewAdventurerReset;
