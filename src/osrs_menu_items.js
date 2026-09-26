/* ============ OsrsMenuItems: pack, worn equipment, bank and shop slots on the old-school menu (owner 2026-09-26) ============
 * The item half of the one menu model (src/osrs_menu.js). Every item slot the game draws goes through slotEl() (wrapped in
 * src/item_tags.js), which hands it here: a right click opens the slot's menu, a left click runs its TOP row.
 *  - Pack: Wield / Wear, Eat / Drink, Bury (by item type), then Use, Drop, Examine, Cancel. "Use" picks the item up:
 *    the top-left line reads "Use <item> -> <target>", every world entity and every other pack item offers that row
 *    (item-on-object and item-on-item: tinderbox on logs, knife on logs, flour and water on dough), and a right click's
 *    Cancel or Escape puts it away. A few items keep the click the lessons teach (Knead the dough, Break a teleport tab).
 *  - Worn equipment: Remove, Examine.  - Bank: Withdraw-1/5/10/All/X on the vault, Deposit-1/5/10/All/X on the pack.
 *  - Shop: Value, Buy-1/5/10 on the stock, Value, Sell-1/5/10 on the pack.
 * Shift + right click adds the RuneLite-style colour tags (ItemTags) to any slot. */
var OsrsMenuItems=(function(){
 'use strict';
 var M=OsrsMenu;
 function def(id){return (typeof ITEMS!=='undefined'&&ITEMS[id])||{name:id}}
 function nameOf(id){return def(id).name||id}
 function chat(t){if(typeof UI!=='undefined'&&UI.chat)UI.chat(t,'plain')}
 // the click the lessons teach for these items (their own game handler), ahead of Use
 var SPECIAL={dough:'Knead',home_tab:'Break',spark_rune:'Channel'};
 var WIELD={weapon:1,shield:1,ammo:1};
 function drinkable(id,d){return !!d.drink||/(^|_)(ale|potion|brew|wine|beer|tea|milk|juice)(_|$)/.test(id)}

 /* ---------- which grid a slot lives in ---------- */
 function gridOf(el){
  if(!el||!el.closest)return null;
  if(el.closest('#inv-grid'))return 'pack';
  if(el.closest('#bank-grid'))return 'bank';
  if(el.closest('#bank-inv-grid'))return 'bank-pack';
  if(el.closest('#shop-grid'))return 'shop';
  if(el.closest('#shop-inv-grid'))return 'shop-pack';
  return null;
 }
 function slotEntity(el,item,onclick){
  var g=gridOf(el);if(!g||!item)return null;
  var idx=g==='bank'?Player.bank.indexOf(item):g==='shop'?-1:Player.inv.indexOf(item);
  return {kind:g,item:item,id:item.id,index:idx,el:el,onclick:onclick,key:el};
 }

 /* ---------- pack ---------- */
 function legacyUse(i){return function(){UI.useItem(i)}}
 function packEntries(ent){
  var i=ent.index,id=ent.id,d=def(id),out=[];if(i<0)return out;
  if(SPECIAL[id])out.push({option:SPECIAL[id],priority:200,fn:legacyUse(i)});
  if(d.equip)out.push({option:WIELD[d.equip]?'Wield':'Wear',priority:150,fn:legacyUse(i)});   // the one equip path: UI.useItem
  else if(d.heal)out.push({option:drinkable(id,d)?'Drink':'Eat',priority:150,fn:legacyUse(i)});
  else if(d.bury)out.push({option:'Bury',priority:150,fn:legacyUse(i)});
  out.push({option:'Use',priority:100,fn:function(){M.startUse(id,i)}});
  out.push({option:'Drop',priority:50,fn:function(){InvMenu.drop(i,ent.item)}});
  out.push({option:'Examine',examine:true,fn:function(){InvMenu.examine(id)}});
  return out;
 }
 /* item on item: the pairs the game knows; anything else is "Nothing interesting happens." */
 function slotOf(id,prefer){if(prefer>=0&&Player.inv[prefer]&&Player.inv[prefer].id===id)return prefer;return Player.inv.findIndex(function(s){return s&&s.id===id})}
 var BREAD={bucket_flour:1,bucket_water:1,dough:1};
 function itemOnItem(fromSlot,toSlot){
  var a=Player.inv[fromSlot]&&Player.inv[fromSlot].id||M.using(),b=Player.inv[toSlot]&&Player.inv[toSlot].id;
  M.endUse();if(!a||!b)return false;
  var pair=function(x,y){return (a===x&&b===y)||(a===y&&b===x)};
  var logsAt=function(){return a==='logs'?slotOf('logs',fromSlot):slotOf('logs',toSlot)};
  if(pair('tinderbox','logs'))return startFiremaking(logsAt())!==false;
  if(a==='knife'&&/logs$/.test(b))return !!openFletching(toSlot);
  if(b==='knife'&&/logs$/.test(a))return !!openFletching(slotOf(a,fromSlot));
  // flour, water and dough knead together (cooking_bread.js owns the recipe; it answers the dough's click)
  if(BREAD[a]&&BREAD[b]){var at=slotOf('dough',a==='dough'?fromSlot:toSlot);UI.useItem(at>=0?at:toSlot);return true}
  if(pair('feather','arrow_shafts')&&typeof fletchArrows==='function'){fletchArrows(slotOf('arrow_shafts',a==='arrow_shafts'?fromSlot:toSlot));return true}
  chat('Nothing interesting happens.');return false;
 }
 function useRows(ent,desc){
  var id=M.using();if(!id)return [];
  if(ent.kind!=='pack')return [];
  var from=M.useSlot();if(from<0)from=slotOf(id,-1);
  if(ent.index===from)return [];
  return [{option:'Use',item:M.itemName(id),target:desc.name,targetType:'item',priority:100,fn:function(){itemOnItem(from,ent.index)}}];
 }

 /* ---------- bank ---------- */
 function amounts(verb,fn){return [1,5,10,'All','X'].map(function(n,k){return {option:verb+'-'+n,priority:100-k,fn:function(){if(n==='X')askAmount(function(q){fn(q)});else fn(n==='All'?Infinity:n)}}})}
 function bankEntries(ent){var i=ent.index;if(i<0)return [];return amounts('Withdraw',function(n){UI.bankWithdraw(Player.bank.indexOf(ent.item),n)})}
 function depositEntries(ent){var i=ent.index;if(i<0)return [];return amounts('Deposit',function(n){UI.bankDeposit(Player.inv.indexOf(ent.item)>=0?Player.inv.indexOf(ent.item):i,n)})}
 /* ---------- shop ---------- */
 function shopEntries(ent){
  var id=ent.id;
  return [{option:'Value',priority:120,fn:function(){UI.shopValue(id)}}].concat([1,5,10].map(function(n,k){return {option:'Buy-'+n,priority:100-k,fn:function(){UI.shopBuy(id,n)}}}));
 }
 function sellEntries(ent){
  var id=ent.id;if(id==='coins')return [];
  return [{option:'Value',priority:120,fn:function(){UI.shopSellValue(id)}}].concat([1,5,10].map(function(n,k){return {option:'Sell-'+n,priority:100-k,fn:function(){UI.shopSell(Player.inv.indexOf(ent.item)>=0?Player.inv.indexOf(ent.item):ent.index,n)}}}));
 }
 /* ---------- worn equipment ---------- */
 function wornEntries(ent){
  var k=ent.slot;
  return [{option:'Remove',priority:100,fn:function(){var v=Player.equip[k];if(!v)return;if(Player.addItem(v,1)){Player.equip[k]=null;if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
   if(typeof refreshPlayerGear==='function')refreshPlayerGear();UI.refreshEquip();if(UI.refreshInv)UI.refreshInv()}}}];
 }

 var SLOT_KINDS=['pack','bank','bank-pack','shop','shop-pack','worn'];
 M.registerProvider({id:'items',order:10,kinds:SLOT_KINDS,
  describe:function(ent){var d=def(ent.id);return {name:d.name||ent.id,type:'item',examine:d.examine||d.desc||null}},
  entries:function(ent,ctx){
   var rows=ent.kind==='pack'?packEntries(ent):ent.kind==='bank'?bankEntries(ent):ent.kind==='bank-pack'?depositEntries(ent):
    ent.kind==='shop'?shopEntries(ent):ent.kind==='shop-pack'?sellEntries(ent):ent.kind==='worn'?wornEntries(ent):[];
   if(ent.kind!=='pack')rows.push({option:'Examine',examine:true,fn:function(){InvMenu.examine(ent.id)}});
   // shift: the colour tags (RuneLite-style), kept off the plain 2004 menu
   if(ctx&&ctx.shift&&typeof ItemTags!=='undefined'){var cur=ItemTags.get(ent.id);
    ItemTags.COLORS.forEach(function(c){if(c.id!==cur)rows.push({option:'Tag-'+c.id,priority:-10,below:true,fn:function(){ItemTags.set(ent.id,c.id);UI.chat(nameOf(ent.id)+' tagged '+c.name.toLowerCase()+'.','sys')}})});
    if(cur)rows.push({option:'Clear-tag',priority:-11,below:true,fn:function(){ItemTags.clear(ent.id);UI.chat('Tag cleared from '+nameOf(ent.id)+'.','sys')}})}
   return rows;
  }});

 function menuFor(ent,shift){
  var ctx={shift:!!shift,walk:null,cancel:null};
  if(M.using()&&ent.kind==='pack'){ctx.use=M.using();ctx.useEntries=useRows;ctx.cancel=function(){M.endUse()}}
  return M.build([ent],ctx);
 }
 // left click: the top row (in use-mode: the item goes on this one; the selected item itself puts it away)
 function leftClick(ent,ev){
  if(ent.kind==='pack'){
   if(Player.alchMode){UI.useItem(ent.index);return}            // an alchemy spell waiting for its item keeps its click
   if(M.using()){var from=M.useSlot();if(from<0)from=slotOf(M.using(),-1);if(from===ent.index||(from<0&&M.using()===ent.id)){M.endUse();return}
    itemOnItem(from,ent.index);return}
  }
  var rows=menuFor(ent,false),top=rows[0];if(top&&typeof top.fn==='function')top.fn();
 }
 function hover(ent){
  var rows=menuFor(ent,false),top=rows[0];
  if(top&&top.option!=='Cancel')UI.action(M.rowHtml(top),M.moreCount(rows));else UI.action(null);
 }
 // slotEl() hands every drawn item slot here (item_tags.js wrapper)
 function bindSlot(el,item,onclick){
  el.addEventListener('contextmenu',function(e){
   e.preventDefault();e.stopPropagation();
   var ent=slotEntity(el,item,onclick);
   if(!ent){var rows=typeof ItemTags!=='undefined'?ItemTags.ctxEntries(item.id):[{html:'Cancel',fn:null}];M.show(e.clientX,e.clientY,rows,{source:'slot'});return}
   M.show(e.clientX,e.clientY,menuFor(ent,e.shiftKey),{source:'slot'});
  });
  if(onclick){var orig=onclick;el.onclick=function(ev){var ent=slotEntity(el,item,orig);if(!ent)return orig.call(this,ev);leftClick(ent,ev)}}
  el.addEventListener('mouseenter',function(){var ent=slotEntity(el,item,onclick);if(ent)hover(ent)});
  el.addEventListener('mouseleave',function(){if(typeof UI!=='undefined'&&UI.action)UI.action(null)});
  return el;
 }

 /* ---------- worn equipment (the paper doll's filled slots) ---------- */
 function wornKey(el){
  var t=String(el.title||'').split('\n')[0];if(!t)return null;
  for(var k in Player.equip){var v=Player.equip[k];if(v&&def(v).name===t)return k}
  return null;
 }
 if(typeof document!=='undefined')document.addEventListener('contextmenu',function(e){
  var el=e.target&&e.target.closest&&e.target.closest('#equip-doll .doll-slot.filled, #equip-list .equip-row');if(!el)return;
  var k=wornKey(el);if(!k)return;e.preventDefault();e.stopPropagation();
  M.show(e.clientX,e.clientY,menuFor({kind:'worn',slot:k,id:Player.equip[k],key:el},e.shiftKey),{source:'slot'});
 });

 /* ---------- "Enter amount:" (Withdraw-X, Deposit-X) ---------- */
 function parseAmount(s){var m=/^\s*(\d+(?:\.\d+)?)\s*([km]?)\s*$/i.exec(String(s||''));if(!m)return 0;var n=parseFloat(m[1])*(m[2].toLowerCase()==='k'?1e3:m[2].toLowerCase()==='m'?1e6:1);return Math.max(0,Math.floor(n))}
 function askAmount(cb){
  var old=document.getElementById('om-amount');if(old)old.remove();
  var box=document.createElement('div');box.id='om-amount';box.className='om-amount';
  box.innerHTML='<span>Enter amount:</span> <input type="text" inputmode="numeric" maxlength="9" autocomplete="off">';
  var host=document.getElementById('chatbox-frame')||document.body;host.appendChild(box);
  var inp=box.querySelector('input');inp.focus();
  function done(ok){var v=parseAmount(inp.value);box.remove();if(ok&&v>0)cb(v)}
  inp.addEventListener('keydown',function(e){e.stopPropagation();if(e.key==='Enter'){e.preventDefault();done(true)}else if(e.key==='Escape'){e.preventDefault();done(false)}});
  inp.addEventListener('blur',function(){setTimeout(function(){if(box.parentNode)box.remove()},150)});
 }
 return {bindSlot:bindSlot,menuFor:menuFor,leftClick:leftClick,itemOnItem:itemOnItem,slotEntity:slotEntity,gridOf:gridOf,parseAmount:parseAmount,askAmount:askAmount,packEntries:packEntries};
})();
