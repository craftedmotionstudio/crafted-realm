/* ============ Online mode switch (W2 online alpha, docs/rebuild/WORLD_GOAL_2026-09-25.md) ============
 * ?online=1 boots the same client against the authoritative game server (server/, docs/rebuild/NET_PROTOCOL.md):
 * the server's Scarlands test map instead of Tutor's Holm, an account login instead of the local save, and every
 * action sent as an intent. Without ?online=1 this file does nothing at all, so the offline game is unchanged.
 *
 * Loaded early (right after config.js) so the Holm live switch never picks the island and no offline save is read or
 * written: persistence goes to an in-memory store for the whole session. The online scripts themselves are written in
 * just before game5_main.js (CROnline.writeScripts), so they see every game global and register their world provider
 * before the boot reads it.
 *   ?online=1                    connect to ws://<page host>:8200 (the local dev server port)
 *   ?online=1&server=ws://h:p    another server
 */
var CROnline=(function(){
 'use strict';
 var qs=new URLSearchParams(location.search);
 var enabled=qs.get('online')==='1';
 function defaultServer(){
  var host=location.hostname||'127.0.0.1';
  return 'ws://'+host+':'+(qs.get('port')||'8200');
 }
 var SCRIPTS=['shared/combat.js?v=w2c','shared/pvp.js?v=w2c','src/net_client.js?v=w2c','src/online_kit.js?v=w2c','src/online_bestiary.js?v=w2c','src/online_world.js?v=w2c','src/online_actors.js?v=w2c',
  'src/online_fx.js?v=w2c','src/online_ui.js?v=w2c','src/online_menu.js?v=w2c','src/online_main.js?v=w2c'];
 var api={enabled:enabled,server:qs.get('server')||defaultServer(),params:qs,
  writeScripts:function(){
   if(!enabled)return;
   for(var i=0;i<SCRIPTS.length;i++)document.write('<script src="'+SCRIPTS[i]+'"><'+'/script>');
  }};
 if(!enabled)return api;
 // a session-only store: the offline adventurer, settings and overlays are never read or overwritten online
 var mem={};
 var store={get:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null},set:function(k,v){mem[k]=String(v);return true},
  del:function(k){delete mem[k]},has:function(k){return Object.prototype.hasOwnProperty.call(mem,k)}};
 if(typeof Persist!=='undefined'&&Persist.setStore)Persist.setStore(store);
 api.memoryStore=store;
 // the Holm island is the offline tutorial; the online alpha always boots the server's map
 if(typeof GameConfig!=='undefined'){GameConfig.holmIslandLive=false;GameConfig.holmIslandPublished=true}   // published Blender copies (assets/holm_island/)
 document.documentElement.setAttribute('data-online','1');
 return api;
})();
