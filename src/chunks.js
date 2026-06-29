/* ================= CHUNK WORLD DATA MODEL =================
   The authoring substrate for a hand-designed, chunk-based map (see VEYHOLLOW_DESIGN.md,
   ROADMAP.md §A). A chunk is an 8×8-tile cell holding three independent layers:
     terrain  — underlay/overlay/height/flags
     objects  — sparse placements that only REFERENCE a definition id (def-vs-placement split)
     spawns   — npc spawn points with a wander radius
   Standalone: this file defines globals and touches nothing else, so it's safe to load
   alongside the running game. The editor (Build Mode) and the world builder consume it.

   World tile (tx,tz) ↔ chunk (cx,cz) + local (lx,lz):  cx=floor(tx/8), lx=((tx%8)+8)%8. */
(function(global){
  const CHUNK = 8;                 // tiles per chunk edge
  const OBJECT_DEFS = {};          // id -> {label, build?(THREE,mat), model?, footprint?, tags?}
  const NPC_DEFS    = {};          // id -> NPC_TYPES key (or inline stat block)

  /* register a placeable object definition; placements reference it by id */
  function defineObject(id, def){ OBJECT_DEFS[id] = Object.assign({id}, def); return id; }
  function defineNpc(id, def){ NPC_DEFS[id] = def; return id; }

  function makeChunk(cx, cz){
    return { cx, cz,
      terrain: { underlay:'grass', overlay:null, height:null, flags:null },
      objects: [],     // {def, lx, lz, rot, level}
      spawns:  [] };   // {npc, lx, lz, radius}
  }
  const _loc = v => ((v % CHUNK) + CHUNK) % CHUNK;   // world tile -> local 0..7

  const WorldChunks = {
    map: new Map(),
    _key(cx, cz){ return cx + ',' + cz; },
    chunkOf(tx, tz){ return [Math.floor(tx / CHUNK), Math.floor(tz / CHUNK)]; },
    get(cx, cz){ return this.map.get(this._key(cx, cz)); },
    ensure(cx, cz){ let c = this.get(cx, cz); if(!c){ c = makeChunk(cx, cz); this.map.set(this._key(cx, cz), c); } return c; },

    /* place / remove / query, all in WORLD tile coordinates */
    placeObject(def, tx, tz, rot, level){
      const [cx, cz] = this.chunkOf(tx, tz);
      const o = { def, lx:_loc(tx), lz:_loc(tz), rot:rot||0, level:level||0 };
      this.ensure(cx, cz).objects.push(o); return o;
    },
    removeObject(o){
      for(const c of this.map.values()){ const i = c.objects.indexOf(o); if(i >= 0){ c.objects.splice(i, 1); return true; } }
      return false;
    },
    objectsAt(tx, tz){
      const [cx, cz] = this.chunkOf(tx, tz), c = this.get(cx, cz); if(!c) return [];
      const lx=_loc(tx), lz=_loc(tz);
      return c.objects.filter(o => o.lx === lx && o.lz === lz);
    },
    addSpawn(npc, tx, tz, radius){
      const [cx, cz] = this.chunkOf(tx, tz);
      const s = { npc, lx:_loc(tx), lz:_loc(tz), radius:radius||2 };
      this.ensure(cx, cz).spawns.push(s); return s;
    },
    worldTile(c, p){ return [c.cx * CHUNK + p.lx, c.cz * CHUNK + p.lz]; },

    /* iterate every placement / spawn in world space */
    forEachObject(fn){ for(const c of this.map.values()) for(const o of c.objects){ const t = this.worldTile(c, o); fn(o.def, t[0], t[1], o.rot, o, c); } },
    forEachSpawn(fn){ for(const c of this.map.values()) for(const s of c.spawns){ const t = this.worldTile(c, s); fn(s.npc, t[0], t[1], s.radius, s, c); } },

    /* persistence (chunks with no content are dropped from the save) */
    serialize(){
      const out = { v:1, chunkSize:CHUNK, chunks:[] };
      for(const c of this.map.values()){
        if(!c.objects.length && !c.spawns.length && !c.terrain.overlay) continue;
        out.chunks.push({ cx:c.cx, cz:c.cz, terrain:c.terrain, objects:c.objects, spawns:c.spawns });
      }
      return out;
    },
    load(data){
      this.map.clear();
      if(!data || !data.chunks) return this;
      for(const cd of data.chunks){
        const c = this.ensure(cd.cx, cd.cz);
        if(cd.terrain) c.terrain = cd.terrain;
        c.objects = cd.objects || [];
        c.spawns  = cd.spawns  || [];
      }
      return this;
    },
    count(){ let o = 0, s = 0; for(const c of this.map.values()){ o += c.objects.length; s += c.spawns.length; } return { chunks:this.map.size, objects:o, spawns:s }; },
    clear(){ this.map.clear(); return this; },
  };

  // expose on window so the editor, tools, and the smoke-test can reach it
  global.CHUNK = CHUNK;
  global.OBJECT_DEFS = OBJECT_DEFS;
  global.NPC_DEFS = NPC_DEFS;
  global.defineObject = defineObject;
  global.defineNpc = defineNpc;
  global.WorldChunks = WorldChunks;
})(window);
