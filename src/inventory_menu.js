/* ============ Inventory right-click: Drop / Examine (2004 old-school) ============
 * Every 2004 inventory slot offered Use / Drop / Examine. Crafted Realm had only colour tags,
 * so a full pack could only be emptied at a bank (a player finishing Tutor's Holm with a full
 * pack was stuck at the ferry). The rows are added by ItemTags' slot menu for #inv-grid slots.
 * Drop places the stack on the player's tile through makeDrop (the loot lifecycle), surface only:
 * ground heights on other planes come from their own floors, not gy(). */
var InvMenu = {
  entries(item){
    if(typeof Player==='undefined' || !item) return [];
    const i=Player.inv.indexOf(item); if(i<0) return [];
    const def=(typeof ITEMS!=='undefined' && ITEMS[item.id]) || {name:item.id};
    return [
      {html:`Drop <b>${def.name}</b>`, fn:()=>InvMenu.drop(i, item)},
      {html:`Examine <b>${def.name}</b>`, fn:()=>InvMenu.examine(item.id)}
    ];
  },
  drop(i, item){
    // the slot must still hold this exact stack (the menu may be stale after a tick)
    if(Player.inv[i]!==item){ UI.chat('That item has moved.','plain'); return false; }
    if((Player.plane||0)!==0 || typeof makeDrop!=='function' || typeof player==='undefined'){
      UI.chat('You cannot drop that here.','plain'); return false;
    }
    const x=Math.floor(player.position.x)+0.5, z=Math.floor(player.position.z)+0.5;
    Player.inv[i]=null;
    if(Player.usingItem===item.id && Player.count(item.id)===0) Player.usingItem=null;
    makeDrop(item.id, item.qty||1, x, z);
    if(typeof Sfx!=='undefined' && Sfx.click) Sfx.click();
    UI.refreshInv();
    return true;
  },
  examine(id){
    const def=(typeof ITEMS!=='undefined' && ITEMS[id]) || null;
    if(def && (def.examine || def.desc)){ UI.chat(def.examine || def.desc,'plain'); return; }
    if(!def){ UI.chat('Nothing interesting happens.','plain'); return; }
    const name=def.name.toLowerCase();
    // plural names ("Crowns", "Arrows") read as a stack; singular take a/an
    UI.chat(/s$/.test(name) ? `A stack of ${name}.` : `It's ${/^[aeiou]/.test(name)?'an':'a'} ${name}.`,'plain');
  }
};
