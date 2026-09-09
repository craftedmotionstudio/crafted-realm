/* collision_grid.js — per-tile collision bitmask (rsbox/rsmod flag-grid pattern).
 *
 * A Uint8Array over the provider bounds, one byte per tile. In world-v2 the array
 * is sparse-by-state: unloaded chunk cells stay BLOCK and resident chunks alone
 * are sampled. rebake() retains the full-world legacy path. Both sample the exact
 * plane-0 predicate computePath's tileWalkable uses today
 * (collides(cx,cz,0.42,true,0) + groundY off-map/water) at every tile centre, so a
 * BLOCK-only grid gives byte-identical pathfinding — the bar is behavior parity, the
 * win is O(1) neighbor checks instead of per-call circle/rect sweeps.
 *
 * WALL_* flags are edge walls (fences, windows, doorframes) for future setters: they
 * block crossing the shared edge from EITHER side without blocking the tile itself.
 * Compass convention: N = -z, S = +z, E = +x, W = -x.
 *
 * Off-grid tiles (the Menagerie pad floats far outside the world rect) and non-zero
 * planes are NOT covered: canStep returns null there and computePath falls back to
 * the analytic predicate. CollisionGrid.enabled=false is the full kill-switch. */
var CollisionGrid = {
  BLOCK:1, WALL_N:2, WALL_E:4, WALL_S:8, WALL_W:16, PROJECTILE:32,
  ALLWALL:2|4|8|16, EDGEALL:2|4|8|16|32,   // masks for clearing on rebakeArea
  enabled:true, baked:false, mode:'full', provider:null,
  x0:0, z0:0, w:0, h:0, grid:null,
  _residentIds:new Set(), loadedChunks:0, unloadedChunks:0, lastBakeMs:0,
  // wall inference: a thin rect collider is a wall when its long axis is ≥ this many
  // times its short axis AND the short axis is small (a fence/wall, not a hut footprint).
  WALL_RATIO:2, WALL_SHORT:0.5,

  _idx(tx,tz){ return (tz-this.z0)*this.w + (tx-this.x0); },
  _in(tx,tz){ return tx>=this.x0 && tz>=this.z0 && tx<this.x0+this.w && tz<this.z0+this.h; },
  at(tx,tz){ return this.grid&&this._in(tx,tz) ? this.grid[this._idx(tx,tz)] : 0; },
  _or(tx,tz,flag){ if(this.grid&&this._in(tx,tz)) this.grid[this._idx(tx,tz)] |= flag; },
  _chunkId(cx,cz){ return cx+','+cz; },
  _tileResident(tx,tz){
    return this.mode!=='resident'||this._residentIds.has(this._chunkId(Math.floor(tx/8),Math.floor(tz/8)));
  },
  _chunkBounds(chunk){
    const x0=Math.max(this.x0,chunk.cx*8), z0=Math.max(this.z0,chunk.cz*8);
    const x1=Math.min(this.x0+this.w,(chunk.cx+1)*8), z1=Math.min(this.z0+this.h,(chunk.cz+1)*8);
    return {x0,z0,x1,z1};
  },

  // the planner predicate, verbatim from tileWalkable (game5_main.js) pinned to plane 0.
  // ignoreDoors=true matches the planner: closed doors never block plans, so door state
  // cannot desync the bake.
  _walkable(tx,tz){
    const cx=tx+0.5, cz=tz+0.5;
    if(collides(cx, cz, 0.42, true, 0)) return false;
    const y=groundY(cx, cz); if(y===null || y<-1.2) return false;
    return true;
  },
  _sample(tx,tz){
    const i=this._idx(tx,tz);
    this.grid[i] = (this.grid[i] & ~this.BLOCK) | (this._walkable(tx,tz) ? 0 : this.BLOCK);
  },

  initResident(provider){
    const r=provider.getWorldRect();
    this.mode='resident'; this.provider=provider;
    this.x0=Math.floor(r.x0); this.z0=Math.floor(r.z0);
    this.w=Math.ceil(r.w); this.h=Math.ceil(r.h);
    this.grid=new Uint8Array(this.w*this.h); this.grid.fill(this.BLOCK);
    this._residentIds=new Set(); this.baked=true;
    this.loadedChunks=0; this.unloadedChunks=0; this.lastBakeMs=0;
  },
  loadChunk(chunk){
    if(!this.grid||this.mode!=='resident'||!chunk) return 0;
    const b=this._chunkBounds(chunk), id=this._chunkId(chunk.cx,chunk.cz);
    if(b.x0>=b.x1||b.z0>=b.z1) return 0;
    this._residentIds.add(id);
    let blocked=0;
    for(let tz=b.z0;tz<b.z1;tz++) for(let tx=b.x0;tx<b.x1;tx++){
      this.grid[this._idx(tx,tz)]=0; this._sample(tx,tz);
      if(this.grid[this._idx(tx,tz)]&this.BLOCK) blocked++;
    }
    if(typeof WORLD!=='undefined'&&WORLD.colliders)
      for(const c of WORLD.colliders) this._bakeWall(c,b.x0,b.z0,b.x1-1,b.z1-1);
    this.loadedChunks++;
    return blocked;
  },
  unloadChunk(chunk){
    if(!this.grid||this.mode!=='resident'||!chunk) return;
    const b=this._chunkBounds(chunk);
    for(let tz=b.z0;tz<b.z1;tz++) for(let tx=b.x0;tx<b.x1;tx++) this.grid[this._idx(tx,tz)]=this.BLOCK;
    this._residentIds.delete(this._chunkId(chunk.cx,chunk.cz)); this.unloadedChunks++;
  },
  rebakeResident(provider){
    provider=provider||this.provider;
    if(!provider) return this.rebake();
    const t0=performance.now();
    if(!this.grid||this.mode!=='resident'||this.provider!==provider) this.initResident(provider);
    this.grid.fill(this.BLOCK); this._residentIds.clear();
    let blocked=0;
    for(const chunk of provider.residentChunks()) blocked+=this.loadChunk(chunk);
    this.baked=true; this.lastBakeMs=+(performance.now()-t0).toFixed(3);
    console.log('[collision] charted '+this._residentIds.size+' resident chunks in '+this.lastBakeMs.toFixed(1)+'ms');
    return blocked;
  },

  // Bake wall-edge + projectile flags from one collider's geometry (game2 never tags
  // walls — we infer from aspect ratio). Optional clip bounds [ax..bx, az..bz] (tile
  // indices) limit which tiles are written, so rebakeArea can touch just a doorway.
  // Compass: N=-z, S=+z, E=+x, W=-x. A wall sits on a tile EDGE (block the crossing from
  // either side) and, when its body covers a tile's centre, marks that tile PROJECTILE
  // (a solid pane arrows can't fly over). A wall exactly on a tile boundary sets only edge
  // flags — you can still shoot ALONG it past the parallel tiles.
  _bakeWall(c, ax,az,bx,bz){
    if(!c || c.plane) return;                 // only ground-plane rects make walls
    if(c.type!=='rect') return;               // circles (posts, rocks) block via BLOCK sampling
    if(c.door) return;                        // closed-door leaves never plan-block (matches _walkable's ignoreDoors)
    const hw=c.hw, hd=c.hd;
    if(ax===undefined){ ax=this.x0; az=this.z0; bx=this.x0+this.w-1; bz=this.z0+this.h-1; }
    const clipX=(t)=> t>=ax && t<=bx, clipZ=(t)=> t>=az && t<=bz;
    if(hw>=hd*this.WALL_RATIO && hd<=this.WALL_SHORT){
      // E–W wall (long along x): blocks N/S crossing at z≈c.z
      const zEdge=Math.round(c.z);            // nearest tile boundary → rows zEdge-1 | zEdge
      const txA=Math.floor(c.x-hw), txB=Math.ceil(c.x+hw)-1;
      const bandA=Math.floor(c.z-hd), bandB=Math.floor(c.z+hd);
      for(let tx=txA; tx<=txB; tx++){
        if(!clipX(tx)) continue;
        if(clipZ(zEdge-1)) this._or(tx, zEdge-1, this.WALL_S);
        if(clipZ(zEdge))   this._or(tx, zEdge,   this.WALL_N);
        for(let tz=bandA; tz<=bandB; tz++)     // PROJECTILE where the pane covers the tile centre
          if(clipZ(tz) && (tz+0.5)>=c.z-hd && (tz+0.5)<=c.z+hd) this._or(tx, tz, this.PROJECTILE);
      }
    } else if(hd>=hw*this.WALL_RATIO && hw<=this.WALL_SHORT){
      // N–S wall (long along z): blocks E/W crossing at x≈c.x
      const xEdge=Math.round(c.x);            // cols xEdge-1 | xEdge
      const tzA=Math.floor(c.z-hd), tzB=Math.ceil(c.z+hd)-1;
      const bandA=Math.floor(c.x-hw), bandB=Math.floor(c.x+hw);
      for(let tz=tzA; tz<=tzB; tz++){
        if(!clipZ(tz)) continue;
        if(clipX(xEdge-1)) this._or(xEdge-1, tz, this.WALL_E);
        if(clipX(xEdge))   this._or(xEdge,   tz, this.WALL_W);
        for(let tx=bandA; tx<=bandB; tx++)
          if(clipX(tx) && (tx+0.5)>=c.x-hw && (tx+0.5)<=c.x+hw) this._or(tx, tz, this.PROJECTILE);
      }
    }
  },

  rebake(){
    const t0=performance.now();
    this.mode='full'; this.provider=null; this._residentIds=new Set();
    const r=worldRect();
    this.x0=Math.floor(r.x0); this.z0=Math.floor(r.z0);
    this.w=Math.ceil(r.w); this.h=Math.ceil(r.h);
    this.grid=new Uint8Array(this.w*this.h);
    let blocked=0;
    for(let tz=this.z0; tz<this.z0+this.h; tz++)
      for(let tx=this.x0; tx<this.x0+this.w; tx++)
        if(!this._walkable(tx,tz)){ this.grid[this._idx(tx,tz)]|=this.BLOCK; blocked++; }
    // second pass: wall/projectile edges inferred from collider geometry
    if(typeof WORLD!=='undefined' && WORLD.colliders)
      for(const c of WORLD.colliders) this._bakeWall(c);
    this.baked=true;
    this.lastBakeMs=+(performance.now()-t0).toFixed(3);
    console.log('[collision] baked '+this.w+'x'+this.h+' flag grid in '+
      (performance.now()-t0).toFixed(1)+'ms — '+blocked+' blocked / '+(this.w*this.h)+' tiles');
    return blocked;
  },
  // re-sample a small square of tiles around a world point (doors, editor placements):
  // clear edge flags, re-sample BLOCK, then re-bake walls from colliders overlapping it.
  rebakeArea(x,z,r){
    if(!this.baked) return;
    r=r||3;
    const a=Math.max(this.x0, Math.floor(x-r)), b=Math.min(this.x0+this.w-1, Math.floor(x+r));
    const c=Math.max(this.z0, Math.floor(z-r)), d=Math.min(this.z0+this.h-1, Math.floor(z+r));
    for(let tz=c; tz<=d; tz++) for(let tx=a; tx<=b; tx++){
      if(!this._tileResident(tx,tz)) continue;
      this.grid[this._idx(tx,tz)] &= ~this.EDGEALL;   // drop stale wall/projectile flags
      this._sample(tx,tz);                             // re-derive BLOCK
    }
    if(typeof WORLD!=='undefined' && WORLD.colliders)
      for(const col of WORLD.colliders){
        if(col.type!=='rect') continue;
        // skip colliders whose bbox can't touch the [a..b, c..d] tile window
        if(col.x+col.hw < a || col.x-col.hw > b+1 || col.z+col.hd < c || col.z-col.hd > d+1) continue;
        this._bakeWall(col, a,c,b,d);
      }
  },

  // shared edge test for a 4-dir step (fx,fz)->(fx+dx,fz+dz): true if a wall blocks the
  // crossing from EITHER side. Used by canStep (movement) and hasLoS (sight).
  _edgeBlocked(fx,fz,dx,dz){
    let exitW, enterW;
    if(dx===1){ exitW=this.WALL_E; enterW=this.WALL_W; }
    else if(dx===-1){ exitW=this.WALL_W; enterW=this.WALL_E; }
    else if(dz===1){ exitW=this.WALL_S; enterW=this.WALL_N; }
    else { exitW=this.WALL_N; enterW=this.WALL_S; }
    if(this._in(fx,fz) && (this.grid[this._idx(fx,fz)] & exitW)) return true;
    if(this._in(fx+dx,fz+dz) && (this.grid[this._idx(fx+dx,fz+dz)] & enterW)) return true;
    return false;
  },

  // O(1) step check for the 4-dir BFS: BLOCK on the destination + wall flags on both
  // shared edges (a wall blocks the crossing from either side). Returns null when the
  // destination lies outside the baked bounds — caller must fall back.
  canStep(fx,fz,dx,dz){
    const tx=fx+dx, tz=fz+dz;
    if(!this._in(tx,tz)) return null;
    if(this.grid[this._idx(tx,tz)] & this.BLOCK) return false;
    if(this._edgeBlocked(fx,fz,dx,dz)) return false;
    return true;
  },

  snapshot(){
    return {mode:this.mode,baked:this.baked,w:this.w,h:this.h,residentChunks:this._residentIds.size,
      loadedChunks:this.loadedChunks,unloadedChunks:this.unloadedChunks,lastBakeMs:this.lastBakeMs};
  },

  // Line-of-sight between two WORLD points (rsbox/rsmod pattern). Walks the tile line
  // source→target one orthogonal step at a time (never diagonal, matching our 4-dir
  // edges). Returns false if an intermediate tile has BLOCK/PROJECTILE, or if a WALL_*
  // edge is crossed between consecutive tiles. Endpoints never block — you may stand
  // adjacent to a wall and shoot along it. O(tile distance). Returns true (no known
  // obstruction) whenever the grid is disabled/unbaked so combat never breaks.
  hasLoS(x0,z0,x1,z1){
    if(!this.enabled || !this.baked) return true;
    let tx=Math.floor(x0), tz=Math.floor(z0);
    const gx=Math.floor(x1), gz=Math.floor(z1);
    if(tx===gx && tz===gz) return true;
    const dx=x1-x0, dz=z1-z0;
    const stepX = dx>0?1:-1, stepZ = dz>0?1:-1;
    const adx=Math.abs(dx), adz=Math.abs(dz);
    const tDeltaX = adx>1e-9 ? 1/adx : Infinity;
    const tDeltaZ = adz>1e-9 ? 1/adz : Infinity;
    // distance (in ray-param t) to the first grid line on each axis
    let tMaxX = adx>1e-9 ? ((stepX>0 ? (tx+1-x0) : (x0-tx)) / adx) : Infinity;
    let tMaxZ = adz>1e-9 ? ((stepZ>0 ? (tz+1-z0) : (z0-tz)) / adz) : Infinity;
    let guard = Math.abs(gx-tx)+Math.abs(gz-tz)+4;
    while(guard-- > 0){
      let sx=0, sz=0;
      if(tMaxX < tMaxZ){ sx=stepX; tMaxX+=tDeltaX; } else { sz=stepZ; tMaxZ+=tDeltaZ; }
      if(this._edgeBlocked(tx,tz,sx,sz)) return false;   // wall on the shared edge
      tx+=sx; tz+=sz;
      if(tx===gx && tz===gz) return true;                // reached target tile (endpoint free)
      if(this._in(tx,tz) && (this.grid[this._idx(tx,tz)] & (this.BLOCK|this.PROJECTILE))) return false;
    }
    return true;
  }
};
