/* ============ Intents — the transport boundary (GOAL.md §14.3, Apollo pattern) ============
 * Gameplay actions are expressed as PLAIN-DATA intent objects and pass through
 * an encode→decode round trip even locally, so the payloads are guaranteed
 * wire-safe today. The V2 online layer replaces submit()'s delivery with a
 * WebSocket send and runs the same executors server-side — game logic never
 * touches transport.
 *
 *   Intents.submit({type:'walkTo', x:12, z:-4})
 *   Intents.submit({type:'pray', id:'thick_skin'})
 *   Intents.submit({type:'save'})
 *
 * Executors are the ONLY place an intent touches engine functions.
 */
const Intents = {
  encode(i){ return JSON.stringify(i); },
  decode(s){ return JSON.parse(s); },
  submit(intent){
    let wire;
    try{ wire=this.encode(intent); }catch(e){ console.error('[Intents] unserializable intent', intent); return false; }
    return this._deliver(this.decode(wire));      // local transport; V2: socket.send(wire)
  },
  _deliver(i){
    const ex=this._exec[i.type];
    if(!ex){ console.warn('[Intents] unknown intent type:', i.type); return false; }
    try{ return ex(i)!==false; }catch(e){ console.error('[Intents] '+i.type+' failed:', e); return false; }
  },
  _exec: {
    walkTo(i){
      const y=(typeof groundY==='function' && groundY(i.x, i.z));
      if(y===null || y===false || y<-1.2) return false;
      orderWalk(new THREE.Vector3(i.x, y||0, i.z));
    },
    attack(i){   // by npc type name, nearest instance — fully serializable
      const n=(WORLD.npcs||[]).filter(n=>!n.dead && n.t.name===i.name)
        .sort((a,b)=>a.mesh.position.distanceTo(player.position)-b.mesh.position.distanceTo(player.position))[0];
      if(!n) return false;
      Player.target=n;
    },
    pray(i){ return Player.togglePrayer(i.id); },
    castSpell(i){ if(typeof Player.selectSpell==='function') return Player.selectSpell(i.id);
                  Player.spell=i.id; Player.castMode=true; },
    save(){ return SaveGame.save(true); },
    equipSlotClear(i){ if(Player.equip[i.slot]){ Player.addItem(Player.equip[i.slot],1); Player.equip[i.slot]=null;
                        if(typeof refreshPlayerGear==='function') refreshPlayerGear(); UI.refreshEquip(); } },
  },
};
