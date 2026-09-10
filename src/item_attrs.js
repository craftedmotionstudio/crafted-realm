/* ============ ItemAttrs — per-item attribute/charge bags (GOAL.md §15, Kronos pattern) ============
 * Items can carry an open-ended attribute bag with no schema changes:
 *   - DEFINITION level:  ITEMS[id].attrs = {maxCharges:100, ...}   (static, data-driven)
 *   - INSTANCE level:    inventory slot {id, qty, attrs:{charges:37}} (this API)
 * Use for charges, degradation, kill counters, dyes/cosmetic variants.
 *   ItemAttrs.get(slot, 'charges', 0)
 *   ItemAttrs.set(slot, 'charges', 36)
 *   ItemAttrs.consume(slot, 'charges')   // decrement, returns remaining (or -1)
 * Rules: attributed instances should be non-stack items (weapons/armour); the
 * def-level bag is the fallback so fresh items inherit their defaults.
 */
const ItemAttrs = {
  defOf(id){ return (typeof ITEMS!=='undefined' && ITEMS[id] && ITEMS[id].attrs) || {}; },
  get(slot, k, dflt){
    if(!slot) return dflt;
    if(slot.attrs && slot.attrs[k]!==undefined) return slot.attrs[k];
    const d=this.defOf(slot.id);
    return d[k]!==undefined ? d[k] : dflt;
  },
  set(slot, k, v){
    if(!slot) return;
    (slot.attrs = slot.attrs || {})[k]=v;
  },
  has(slot, k){ return this.get(slot, k, undefined)!==undefined; },
  consume(slot, k){
    const cur=this.get(slot, k, 0);
    if(cur<=0) return -1;
    this.set(slot, k, cur-1);
    return cur-1;
  },
};
