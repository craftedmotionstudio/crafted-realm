/* ============ GuideArrow — world-space tutorial guidance pointer ============
 * A pulsing beacon on the current objective tile (cloned TileMarkers Line square
 * + _labelSprite text) PLUS a screen-edge DOM arrow that points toward the target
 * when it's off-screen or behind the camera. Driven per tutorial step via
 * GuideArrow.setTarget(spec, label); also auto-wired to Tutorial.banner so a
 * step's optional {target,arrowLabel} fields Just Work (steps without them = no-op).
 *   spec: {x,z} | {friendlyId:'bram'} | {mesh} | null(clear).  r128 THREE.
 * Self-boots once scene/WORLD/UI/Tutorial exist (setInterval guard, like the towns). */
const GuideArrow = {
  _spec:null, _label:'', _line:null, _sprite:null, _arrow:null, _raf:null, _wrapped:false,

  /* set the current objective, or null to clear everything */
  setTarget(spec, label){
    this._spec = spec || null;
    this._label = label || '';
    if(!this._spec){                                  // clear: hide the world beacon, arrow follows in tick
      if(this._line) this._line.visible=false;
      if(this._sprite) this._sprite.visible=false;
      if(this._arrow) this._arrow.style.display='none';
    }
  },

  /* resolve the live spec to a snapped tile centre {cx,cz} — re-read each frame so
   * mesh/friendly targets track a walking NPC. null when unresolvable. */
  _center(){
    const s=this._spec; if(!s) return null;
    let p=null;
    if(s.mesh && s.mesh.position) p=s.mesh.position;
    else if(s.friendlyId && typeof WORLD!=='undefined' && WORLD.friendlies){
      const f=WORLD.friendlies.find(f=>f.id===s.friendlyId);
      if(f && f.mesh) p=f.mesh.position;
    }
    if(p) return {cx:Math.floor(p.x)+0.5, cz:Math.floor(p.z)+0.5};
    if(typeof s.x==='number' && typeof s.z==='number')
      return {cx:Math.floor(s.x)+0.5, cz:Math.floor(s.z)+0.5};
    return null;                                       // e.g. friendly not spawned yet
  },

  /* floating label — same canvas-sprite trick as TileMarkers._labelSprite / NPC name tags */
  _labelSprite(text){
    const c=document.createElement('canvas');
    let x=c.getContext('2d');
    x.font='bold 13px Verdana';
    const w=Math.min(256, Math.ceil(x.measureText(text).width)+14);
    c.width=w; c.height=20;                            // resizing resets ctx state
    x=c.getContext('2d');
    x.font='bold 13px Verdana'; x.textAlign='center';
    x.fillStyle='#000'; x.fillText(text, w/2+1, 15);
    x.fillStyle='#ffe14d'; x.fillText(text, w/2, 14);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial(
      {map:new THREE.CanvasTexture(c), depthTest:false, transparent:true}));
    spr.scale.set(w/58, 20/58, 1);                     // same px→world ratio as makeNameTag
    spr.renderOrder=995;
    return spr;
  },

  _mkArrow(){
    const a=document.createElement('div');
    a.id='guide-edge-arrow';
    // a pure-CSS triangle (borders) pointing UP by default — no external image (strict CSP)
    a.style.cssText='position:fixed;z-index:75;display:none;pointer-events:none;'+
      'width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;'+
      'border-bottom:22px solid #ffd24a;transform-origin:50% 55%;'+
      'filter:drop-shadow(0 0 4px rgba(0,0,0,.7));opacity:.92;';
    document.body.appendChild(a);
    return a;
  },

  _frame(){
    this._raf=requestAnimationFrame(()=>this._frame());
    if(typeof scene==='undefined' || typeof camera==='undefined' ||
       typeof groundY!=='function' || typeof THREE==='undefined') return;

    // tutorial finished while a target was set → self-clear
    if(this._spec && typeof Tutorial!=='undefined' && Tutorial.complete) this.setTarget(null);

    const ctr = this._center();
    if(!ctr){                                          // nothing (or not yet resolvable) to point at
      if(this._line) this._line.visible=false;
      if(this._sprite) this._sprite.visible=false;
      if(this._arrow) this._arrow.style.display='none';
      return;
    }
    const {cx,cz}=ctr;
    const t=performance.now()*0.005, pulse=0.5+0.5*Math.sin(t);   // 0..1 gentle breathe

    // ---- world beacon: pulsing Line square + floating label -------------------
    if(!this._line && typeof _setSquareGeom==='function'){
      this._line=new THREE.Line(new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({color:0xffd24a, transparent:true, opacity:0.9, depthTest:false}));
      this._line.renderOrder=995; scene.add(this._line);
    }
    if(this._line){
      _setSquareGeom(this._line.geometry, cx, cz, 0.40+pulse*0.08, 0.06);
      this._line.material.opacity=0.55+pulse*0.4;
      this._line.visible=true;
    }
    const gy=(groundY(cx,cz)||0);
    if(this._label){
      if(!this._sprite || this._sprite._txt!==this._label){
        if(this._sprite){ scene.remove(this._sprite);
          if(this._sprite.material.map) this._sprite.material.map.dispose();
          this._sprite.material.dispose(); }
        this._sprite=this._labelSprite(this._label); this._sprite._txt=this._label;
        scene.add(this._sprite);
      }
      this._sprite.position.set(cx, gy+0.9+pulse*0.15, cz);   // gentle float
      this._sprite.visible=true;
    } else if(this._sprite){ this._sprite.visible=false; }

    // ---- screen-edge arrow: only when the beacon is off-screen / behind lens ---
    if(!this._arrow) this._arrow=this._mkArrow();
    const v=new THREE.Vector3(cx, gy+1.2, cz).project(camera);
    let bx=v.x, by=v.y; const behind=v.z>1;
    if(behind){ bx=-bx; by=-by; }                      // fold the point that's behind the lens back to a real direction
    const onScreen = !behind && bx>=-1 && bx<=1 && by>=-1 && by<=1;
    if(onScreen){ this._arrow.style.display='none'; return; }
    // direction from screen-centre toward the target (screen space: y grows downward)
    const ang=Math.atan2(-by, bx);
    const scx=innerWidth/2, scy=innerHeight/2, mx=scx-46, my=scy-46;   // inset half-extents
    const tt=Math.min(mx/Math.max(Math.abs(Math.cos(ang)),1e-4),
                      my/Math.max(Math.abs(Math.sin(ang)),1e-4));
    const px=scx+Math.cos(ang)*tt, py=scy+Math.sin(ang)*tt;
    this._arrow.style.display='block';
    this._arrow.style.left=(px-14)+'px'; this._arrow.style.top=(py-12)+'px';
    this._arrow.style.transform='rotate('+(ang+Math.PI/2)+'rad)';   // CSS triangle points up (-90°) by default
    this._arrow.style.opacity=0.7+pulse*0.25;
  },

  /* auto-hook: wrap Tutorial.banner so a step's optional {target,arrowLabel} drives us.
   * Existing steps have no target → setTarget(null) → harmless clear. */
  _hook(){
    if(this._wrapped || typeof Tutorial==='undefined' || typeof Tutorial.banner!=='function') return;
    const self=this, orig=Tutorial.banner;
    Tutorial.banner=function(){
      orig.apply(this, arguments);                     // may auto-advance this.step first
      const s=(!this.complete && this.steps[this.step]) ? this.steps[this.step] : null;
      self.setTarget(s&&s.target||null, s&&s.arrowLabel);
    };
    this._wrapped=true;
    // sync to whatever step is showing right now
    const s=(!Tutorial.complete && Tutorial.steps[Tutorial.step]) ? Tutorial.steps[Tutorial.step] : null;
    this.setTarget(s&&s.target||null, s&&s.arrowLabel);
  },

  start(){ if(this._raf) return; this._hook(); this._frame(); }
};

/* self-boot: idle until the world + tutorial are live, then start the tick (towns pattern) */
(function(){
  const iv=setInterval(()=>{
    try{
      if(typeof scene==='undefined' || typeof camera==='undefined' ||
         typeof WORLD==='undefined' || typeof UI==='undefined' ||
         typeof Tutorial==='undefined') return;
      GuideArrow.start(); clearInterval(iv);
    }catch(e){ console.error('[ui_guide_arrow]', e); clearInterval(iv); }
  }, 1000);
})();
