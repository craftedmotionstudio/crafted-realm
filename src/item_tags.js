/* ============ Item tags — RuneLite-style per-item color tags (GOAL.md §15) ============
 * Right-click any item slot (inventory, bank, or your bags at a shop) → Tag →
 * pick one of 4 preset colors, or clear. Tagged item ids get a colored inner
 * border on EVERY slot render: `slotEl` (the one slot builder every grid uses)
 * is wrapped once, so the inventory tab, the bank grids and the shop grids all
 * inherit the border with zero core edits — the MenuQoL/BankQoL wrap pattern.
 * Tags persist on this device through Persist (`cr_item_tags`), like tile
 * markers and overlay toggles.
 */
var ItemTags = {
  KEY: 'cr_item_tags',
  COLORS: [
    {id:'red',    name:'Red',    css:'#e04a3f'},
    {id:'green',  name:'Green',  css:'#3fd35a'},
    {id:'blue',   name:'Blue',   css:'#4a9de0'},
    {id:'yellow', name:'Yellow', css:'#ffd24a'},
  ],
  _tags: (typeof Persist!=='undefined') ? Persist.getJSON('cr_item_tags', {}) : {},
  _save(){ if(typeof Persist!=='undefined') Persist.setJSON(this.KEY, this._tags); },
  /* color id ('red'…) for an item id, or null */
  get(id){ return this._tags[id] || null; },
  /* css color for an item id, or null when untagged */
  color(id){
    const c=this.COLORS.find(c=>c.id===this._tags[id]);
    return c ? c.css : null;
  },
  /* set colorId ('red'|'green'|'blue'|'yellow'), or falsy to clear */
  set(id, colorId){
    if(colorId) this._tags[id]=colorId; else delete this._tags[id];
    this._save();
    // refreshInv also re-renders the bank / shop grids when those modals are open
    if(typeof UI!=='undefined' && UI.refreshInv) UI.refreshInv();
  },
  clear(id){ this.set(id, null); },
  /* render helper: colored inner border on a slot element (icons are 2D sprites —
   * the tag is pure CSS on the slot, never a texture edit) */
  decorate(el, itemId){
    const css=this.color(itemId);
    if(css) el.style.boxShadow='inset 0 0 0 2px '+css;
  },
  /* context-menu rows for one item — Ctx is a flat menu, so the "submenu" is
   * one row per color + a clear row when tagged */
  ctxEntries(itemId){
    const def=(typeof ITEMS!=='undefined') && ITEMS[itemId];
    const name=def ? def.name : itemId;
    const cur=this.get(itemId);
    const entries=this.COLORS.filter(c=>c.id!==cur).map(c=>({
      html:`<span style="color:${c.css}">&#9632;</span> Tag <b>${name}</b> — ${c.name.toLowerCase()}`,
      fn:()=>{ ItemTags.set(itemId, c.id);
        UI.chat(`${name} tagged ${c.name.toLowerCase()}.`,'sys'); }
    }));
    if(cur) entries.push({html:`Clear tag <b>${name}</b>`,
      fn:()=>{ ItemTags.clear(itemId); UI.chat(`Tag cleared from ${name}.`,'sys'); }});
    entries.push({html:'Cancel', fn:null});
    return entries;
  }
};

/* ---- wrap slotEl once: border + right-click menu on every item grid ---- */
(function(){
  if(typeof slotEl!=='function') return;
  const orig=slotEl;
  slotEl=function(item, onclick, price, showQty){
    const el=orig(item, onclick, price, showQty);
    if(item && el){
      ItemTags.decorate(el, item.id);
      el.addEventListener('contextmenu', e=>{
        e.preventDefault(); e.stopPropagation();
        Ctx.show(e, ItemTags.ctxEntries(item.id));
      });
    }
    return el;
  };
})();

/* the world menu closes on canvas mousedown; slot menus live inside modals, so
 * close on any mousedown that lands outside the menu itself */
document.addEventListener('mousedown', e=>{
  if(typeof Ctx!=='undefined' && Ctx.open &&
     !(e.target && e.target.closest && e.target.closest('#ctx-menu'))) Ctx.hide();
});
