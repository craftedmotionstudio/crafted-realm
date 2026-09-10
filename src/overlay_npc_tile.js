/* ============ NPC tile outline (GOAL.md §15 — RuneLite "NPC indicators") ============
 * Draws a colored square outline on the tile under an NPC:
 *   red  — your current combat target (Player.target)
 *   cyan — the attackable NPC under your cursor (_hoverNpc, set in game4_ui.js)
 * Exactly TWO Line meshes exist, repositioned every frame via the shared
 * _setSquareGeom helper (game4_ui.js) — zero per-NPC allocation. Toggle with
 * 📊 / Shift+L (Overlays panel, id: npc-tile-outline). */

const NpcTileOutline = {
  _target:null, _hover:null, _raf:null, _on:false,
  _mkLine(color){
    const l=new THREE.Line(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({color, transparent:true, opacity:0.95, depthTest:false}));
    l.renderOrder=999; l.visible=false;
    scene.add(l);
    return l;
  },
  _place(line, npc, half, lift){
    const p=npc.mesh.position;
    _setSquareGeom(line.geometry, Math.floor(p.x)+0.5, Math.floor(p.z)+0.5, half, lift);
    line.visible=true;
  },
  _frame(){
    if(!this._on) return;
    this._raf=requestAnimationFrame(()=>this._frame());
    // the scene doesn't exist until the game boots — idle until it does
    if(typeof scene==='undefined' || typeof groundY!=='function' ||
       typeof Player==='undefined' || typeof _setSquareGeom!=='function') return;
    if(!this._target){ this._target=this._mkLine(0xff5040); this._hover=this._mkLine(0x30d8ff); }
    const tgt=Player.target;
    if(tgt && !tgt.dead && tgt.mesh) this._place(this._target, tgt, 0.47, 0.08);
    else this._target.visible=false;
    const hov=(typeof _hoverNpc!=='undefined') ? _hoverNpc : null;
    if(hov && !hov.dead && hov.mesh && hov!==tgt) this._place(this._hover, hov, 0.42, 0.07);
    else this._hover.visible=false;
  },
  start(){ if(this._on) return; this._on=true; this._frame(); },
  stop(){
    this._on=false;
    if(this._raf){ cancelAnimationFrame(this._raf); this._raf=null; }
    if(this._target) this._target.visible=false;
    if(this._hover) this._hover.visible=false;
  }
};
Overlays.register({ id:'npc-tile-outline', name:'NPC tile outline',
  desc:'RuneLite-style NPC indicators: red tile outline under your combat target, cyan under the attackable NPC you hover.',
  defaultOn:true,
  start:()=>NpcTileOutline.start(), stop:()=>NpcTileOutline.stop() });
