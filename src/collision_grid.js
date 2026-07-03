/* collision_grid.js — per-tile collision bitmask (rsbox/rsmod flag-grid pattern).
 *
 * A Uint8Array over the charted world rect (worldgrid.js bounds), one byte per tile.
 * rebake() samples the EXACT plane-0 predicate computePath's tileWalkable uses today
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
  BLOCK:1, WALL_N:2, WALL_E:4, WALL_S:8, WALL_W:16, PROJECTILE:32,   // PROJECTILE reserved, unset
  enabled:true, baked:false,
  x0:0, z0:0, w:0, h:0, grid:null,

  _idx(tx,tz){ return (tz-this.z0)*this.w + (tx-this.x0); },
  _in(tx,tz){ return tx>=this.x0 && tz>=this.z0 && tx<this.x0+this.w && tz<this.z0+this.h; },
  at(tx,tz){ return this._in(tx,tz) ? this.grid[this._idx(tx,tz)] : 0; },

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

  rebake(){
    const t0=performance.now();
    const r=worldRect();
    this.x0=Math.floor(r.x0); this.z0=Math.floor(r.z0);
    this.w=Math.ceil(r.w); this.h=Math.ceil(r.h);
    this.grid=new Uint8Array(this.w*this.h);
    let blocked=0;
    for(let tz=this.z0; tz<this.z0+this.h; tz++)
      for(let tx=this.x0; tx<this.x0+this.w; tx++)
        if(!this._walkable(tx,tz)){ this.grid[this._idx(tx,tz)]|=this.BLOCK; blocked++; }
    this.baked=true;
    console.log('[collision] baked '+this.w+'x'+this.h+' flag grid in '+
      (performance.now()-t0).toFixed(1)+'ms — '+blocked+' blocked / '+(this.w*this.h)+' tiles');
    return blocked;
  },
  // re-sample a small square of tiles around a world point (doors, editor placements)
  rebakeArea(x,z,r){
    if(!this.baked) return;
    r=r||3;
    const a=Math.max(this.x0, Math.floor(x-r)), b=Math.min(this.x0+this.w-1, Math.floor(x+r));
    const c=Math.max(this.z0, Math.floor(z-r)), d=Math.min(this.z0+this.h-1, Math.floor(z+r));
    for(let tz=c; tz<=d; tz++) for(let tx=a; tx<=b; tx++) this._sample(tx,tz);
  },

  // O(1) step check for the 4-dir BFS: BLOCK on the destination + wall flags on both
  // shared edges (a wall blocks the crossing from either side). Returns null when the
  // destination lies outside the baked bounds — caller must fall back.
  canStep(fx,fz,dx,dz){
    const tx=fx+dx, tz=fz+dz;
    if(!this._in(tx,tz)) return null;
    const dest=this.grid[this._idx(tx,tz)];
    if(dest & this.BLOCK) return false;
    let exitW, enterW;
    if(dx===1){ exitW=this.WALL_E; enterW=this.WALL_W; }
    else if(dx===-1){ exitW=this.WALL_W; enterW=this.WALL_E; }
    else if(dz===1){ exitW=this.WALL_S; enterW=this.WALL_N; }
    else { exitW=this.WALL_N; enterW=this.WALL_S; }
    if(this._in(fx,fz) && (this.grid[this._idx(fx,fz)] & exitW)) return false;
    if(dest & enterW) return false;
    return true;
  }
};
