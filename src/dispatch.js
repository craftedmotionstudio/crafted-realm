/* ============ Interact — the central interaction dispatcher (GOAL.md §14.2) ============
 * The RuneJS action-hook pattern: content REGISTERS what it reacts to instead
 * of editing the click/menu code. Every registered hook automatically appears
 * in the right-click menu for matching targets (and is therefore left-clickable
 * when swapped to the top).
 *
 *   Interact.register({
 *     target: 'npc:Wanderer' | 'kind:altar' | ['npc:Guide Bram', 'npc:Warden Maela'] | '*',
 *     option: 'Appraise',            // the menu verb
 *     walkTo: true,                  // path into reach before firing (Sched.walkThen)
 *     handler({hit, obj, npc}){...}  // the content
 *   });
 *
 * Namespaced ids: 'npc:<name>' for NPCs (hostile or friendly), 'kind:<kind>'
 * for world objects (altar, bank, door, drop, resource, ...), '*' for anything.
 * Content modules (quests, clue scrolls, bounties) live in their own files and
 * call register() — zero engine edits per new piece of content.
 */
const Interact = {
  _hooks: [],
  register(h){
    if(!h || !h.option || typeof h.handler!=='function'){ console.error('[Interact] bad hook', h); return; }
    h.target = Array.isArray(h.target) ? h.target : [h.target||'*'];
    this._hooks.push(h);
  },
  keyFor(hit){
    const u = hit && hit.obj && hit.obj.userData;
    if(!u) return null;
    if(u.kind==='npc' && u.npc) return 'npc:'+u.npc.t.name;
    if(u.kind==='friendly')     return 'npc:'+u.name;
    if(u.kind)                  return 'kind:'+u.kind;
    return null;
  },
  entriesFor(hit, e){
    const key=this.keyFor(hit); if(!key) return [];
    const u=hit.obj.userData;
    const ctx={hit, obj:hit.obj, npc:u.npc||null, point:hit.point, e};
    const out=[];
    for(const h of this._hooks){
      if(!h.target.includes('*') && !h.target.includes(key)) continue;
      if(h.when && !h.when(ctx)) continue;          // optional predicate (quest stage etc.)
      const label=u.npc ? u.npc.t.name : (u.name || (u.label ? String(u.label).replace(/<[^>]+>/g,'') : u.kind));
      out.push({html:`${h.option} <b>${label}</b>`, primary:!!h.primary, fn:()=>{
        if(h.walkTo && hit.obj.position && typeof Sched!=='undefined'){
          const target=(typeof THREE!=='undefined'&&hit.obj.getWorldPosition)
            ? hit.obj.getWorldPosition(new THREE.Vector3()) : hit.obj.position;
          Sched.walkThen(target, h.reach||2.2, ()=>h.handler(ctx));
        } else h.handler(ctx);
      }});
    }
    return out;
  },
  /* menu integration: compose with the existing builder (same pattern the QoL wraps use) */
  _wrap(){
    if(this._wrapped || typeof buildCtxEntries!=='function') return;
    const orig=buildCtxEntries;
    const self=this;
    buildCtxEntries=function(hit, e){
      const entries=orig(hit, e);
      try{
        const extra=self.entriesFor(hit, e);
        if(extra.length){
          const primary=extra.filter(function(en){return en.primary;}),secondary=extra.filter(function(en){return !en.primary;});
          if(primary.length) entries.unshift(...primary);
          if(secondary.length) entries.splice(Math.max(0,entries.length-2), 0, ...secondary);
        }
      }catch(err){ console.error('[Interact] menu hook failed:', err); }
      return entries;
    };
    this._wrapped=true;
  },
};
Interact._wrap();
