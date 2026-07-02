/* ============ Persist — pluggable persistence boundary (GOAL.md §14.9) ============
 * Every durable byte flows through Persist.store. Today that's localStorage;
 * the V2 online layer swaps ONE object (Persist.setStore) for a server-backed
 * store and every consumer — SaveGame, overlays, presets, markers — migrates
 * for free. Consumers must never touch localStorage directly again.
 */
const Persist = {
  store: {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} },
    has(k){ try{ return localStorage.getItem(k)!==null; }catch(e){ return false; } },
  },
  setStore(s){ this.store=s; },
  /* convenience for JSON blobs */
  getJSON(k, dflt){ try{ const r=this.store.get(k); return r===null?dflt:JSON.parse(r); }catch(e){ return dflt; } },
  setJSON(k, obj){ return this.store.set(k, JSON.stringify(obj)); },
};
