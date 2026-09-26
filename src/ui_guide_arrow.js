/* ============ GuideArrow — world-space tutorial guidance pointer ============
 * 2026-09-25 (owner: "I can't say I love the appearance of the arrow"): the marker is now the old-school hint arrow,
 * a chunky yellow downward arrow with a dark outline bobbing just above the exact target, and its label sits on a
 * small parchment tag above it. Both are canvas-drawn (our own art). The screen-edge pointer uses the same arrow.
 * UI round 3 (owner: "less polished, more old-school"): the arrow is now the pixel sprite rendered from our own
 * Blender arrow (assets/icons/ui/v3/misc/hint_arrow*.png, drawn 2x with nearest sampling; the vector drawing stays
 * as the fallback until the image has loaded) and the label is square parchment lettered in our bitmap font.
 * A pulsing beacon on the current objective tile (cloned TileMarkers Line square
 * + _labelSprite text) PLUS a screen-edge DOM arrow that points toward the target
 * when it's off-screen or behind the camera. Driven per tutorial step via
 * GuideArrow.setTarget(spec, label); also auto-wired to Tutorial.banner so a
 * step's optional {target,arrowLabel} fields Just Work (steps without them = no-op).
 *   spec: {x,z} | {friendlyId:'bram'} | {mesh} | null(clear).  r128 THREE.
 * Self-boots once scene/WORLD/UI/Tutorial exist (setInterval guard, like the towns). */
const GUIDE_ARROW_IMG=(function(){try{const im=new Image();im.src='assets/icons/ui/v3/misc/hint_arrow.png?v=2';return im}catch(e){return null}})();
const GuideArrow = {
  _spec:null, _label:'', _line:null, _sprite:null, _arrow:null, _raf:null, _wrapped:false,
  /* content hooks: fn(spec,label) -> {spec?,label?} | null, evaluated every frame so a hint can
   * follow the player (inside a building -> its exit door; underground -> the exit ladder;
   * cooking -> the live fire). spec:null from a hook hides the beacon for that frame. */
  _redirects:[], keepAfterComplete:false, _shown:null, _hint:null,
  drawsHintArrow:true,   // tells the island's Blender marker to stand down (holm_island_fx)
  addRedirect(fn){ if(typeof fn==='function' && this._redirects.indexOf(fn)<0) this._redirects.push(fn); },
  _resolve(){
    let spec=this._spec, label=this._label;
    for(const fn of this._redirects){
      try{ const r=fn(spec,label); if(r){ if('spec' in r) spec=r.spec; if('label' in r) label=r.label; } }
      catch(e){ if(!this._redirectWarned){ this._redirectWarned=true; console.error('[ui_guide_arrow] redirect failed', e); } }
    }
    return {spec, label};
  },

  /* set the current objective, or null to clear everything */
  setTarget(spec, label){
    this._spec = spec || null;
    this._label = label || '';
    if(!this._spec){                                  // clear: hide the world beacon, arrow follows in tick
      if(this._line) this._line.visible=false;
      if(this._sprite) this._sprite.visible=false;
      if(this._hint) this._hint.visible=false;
      if(this._arrow) this._arrow.style.display='none';
    }
  },

  /* resolve the live spec to a snapped tile centre {cx,cz} — re-read each frame so
   * mesh/friendly targets track a walking NPC. null when unresolvable. */
  _center(spec){
    const s=spec===undefined?this._spec:spec; if(!s) return null;
    let p=null;
    if(s.mesh && s.mesh.position) p=s.mesh.position;
    else if(s.friendlyId && typeof WORLD!=='undefined' && WORLD.friendlies){
      const f=WORLD.friendlies.find(f=>f.id===s.friendlyId);
      if(f && f.mesh) p=f.mesh.position;
    }
    if(p) return {cx:Math.floor(p.x)+0.5, cz:Math.floor(p.z)+0.5};
    // an exact target (the island guide aims at the object itself, not its tile)
    if(s.exact && typeof s.x==='number' && typeof s.z==='number') return {cx:s.x, cz:s.z};
    if(typeof s.x==='number' && typeof s.z==='number')
      return {cx:Math.floor(s.x)+0.5, cz:Math.floor(s.z)+0.5};
    return null;                                       // e.g. friendly not spawned yet
  },

  /* the hint arrow itself: drawn once on a canvas, a billboard whose tip sits on the target */
  _arrowCanvas(){
    const c=document.createElement('canvas'); c.width=128; c.height=160;
    const x=c.getContext('2d');
    const im=GUIDE_ARROW_IMG;
    if(im && im.complete && im.naturalWidth){               // the rendered sprite, doubled pixel for pixel; its tip sits on the bottom edge
      x.imageSmoothingEnabled=false; x.drawImage(im, 0, 0, im.naturalWidth*2, im.naturalHeight*2); return c;
    }
    const shape=()=>{ x.beginPath(); x.moveTo(42,10); x.lineTo(86,10); x.lineTo(86,74); x.lineTo(114,74); x.lineTo(64,148);
      x.lineTo(14,74); x.lineTo(42,74); x.closePath(); };
    x.save(); x.translate(4,5); shape(); x.fillStyle='rgba(0,0,0,.45)'; x.fill(); x.restore();        // drop shadow
    shape(); x.lineJoin='round'; x.lineWidth=10; x.strokeStyle='#140e04'; x.stroke();                  // dark outline
    const g=x.createLinearGradient(14,0,114,0);
    g.addColorStop(0,'#ffe25a'); g.addColorStop(.45,'#ffd21e'); g.addColorStop(.55,'#f2b60c'); g.addColorStop(1,'#c98a00');
    shape(); x.fillStyle=g; x.fill();
    x.lineWidth=3; x.strokeStyle='rgba(255,250,200,.85)';                                              // lit left edges
    x.beginPath(); x.moveTo(46,14); x.lineTo(46,78); x.moveTo(22,79); x.lineTo(62,138); x.stroke();
    x.strokeStyle='rgba(120,70,0,.55)';                                                                 // shaded right edges
    x.beginPath(); x.moveTo(82,14); x.lineTo(82,78); x.moveTo(106,79); x.lineTo(67,138); x.stroke();
    return c;
  },
  _arrowSpriteMake(){
    const tex=new THREE.CanvasTexture(this._arrowCanvas());
    if(THREE.NearestFilter){ tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.LinearFilter; }
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true}));
    spr.center.set(0.5,0);                                                    // the tip is the sprite's anchor
    spr.scale.set(0.72,0.9,1); spr.renderOrder=996; spr.name='guide-hint-arrow';
    return spr;
  },
  /* the label: a small parchment tag with dark lettering, hung above the arrow */
  _labelSprite(text){
    // square parchment tag, a hard dark border, lettering in our bitmap font drawn at 2x (24 px = 12 px pixels doubled)
    const FONT='bold 24px "Realm Small", Verdana';
    const c=document.createElement('canvas');
    let x=c.getContext('2d');
    x.font=FONT;
    const w=Math.min(560, Math.ceil(x.measureText(text).width)+28), h=36;
    c.width=w+4; c.height=h+4;                                               // resizing resets ctx state
    x=c.getContext('2d'); x.imageSmoothingEnabled=false;
    x.fillStyle='rgba(0,0,0,.45)'; x.fillRect(4,4,w,h);                    // hard drop shadow
    x.fillStyle='#140e04'; x.fillRect(0,0,w,h);                             // 2 px ink border
    x.fillStyle='#dccfa4'; x.fillRect(2,2,w-4,h-4);                         // parchment
    x.fillStyle='#f0e6c4'; x.fillRect(2,2,w-4,2); x.fillRect(2,2,2,h-4);    // lit top / left edge
    x.fillStyle='#a8946c'; x.fillRect(2,h-4,w-4,2); x.fillRect(w-4,2,2,h-4);// shaded bottom / right edge
    x.font=FONT; x.textAlign='center'; x.textBaseline='middle';
    x.fillStyle='#2a1a08'; x.fillText(text, Math.round(w/2), Math.round(h/2)+1);
    const tex=new THREE.CanvasTexture(c);
    if(THREE.NearestFilter){ tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.LinearFilter; }
    const spr=new THREE.Sprite(new THREE.SpriteMaterial(
      {map:tex, depthTest:false, transparent:true}));
    spr.center.set(0.5,0);
    spr.scale.set(c.width/80, c.height/80, 1);
    spr.renderOrder=997;
    return spr;
  },
  /* the same arrow for the screen-edge pointer (points UP; the tick rotates it) */
  _edgeArrowUrl(){
    if(GUIDE_ARROW_IMG) return 'url("assets/icons/ui/v3/misc/hint_arrow_up.png?v=2")';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 3 L36 22 L27 22 L27 37 L13 37 L13 22 L4 22 Z" fill="#ffd21e" stroke="#140e04" stroke-width="3" stroke-linejoin="round"/><path d="M15 23 V35 M7.5 21 L19 7.5" stroke="rgba(255,250,200,.85)" stroke-width="1.6" fill="none"/></svg>';
    return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
  },

  _mkArrow(){
    const a=document.createElement('div');
    a.id='guide-edge-arrow';
    // the hint arrow in miniature, pointing UP by default (the tick rotates it toward the target)
    a.style.cssText='position:fixed;z-index:75;display:none;pointer-events:none;width:34px;height:34px;'+
      'background:center/contain no-repeat '+this._edgeArrowUrl()+';transform-origin:50% 50%;'+
      'image-rendering:pixelated;';
    document.body.appendChild(a);
    return a;
  },

  _frame(){
    this._raf=requestAnimationFrame(()=>this._frame());
    if(typeof scene==='undefined' || typeof camera==='undefined' ||
       typeof groundY!=='function' || typeof THREE==='undefined') return;

    // tutorial finished while a target was set → self-clear
    if(this._spec && typeof Tutorial!=='undefined' && Tutorial.complete && !this.keepAfterComplete) this.setTarget(null);

    const live=this._resolve();
    this._shown=live;
    const ctr = this._center(live.spec);
    if(!ctr){                                          // nothing (or not yet resolvable) to point at
      if(this._line) this._line.visible=false;
      if(this._sprite) this._sprite.visible=false;
      if(this._hint) this._hint.visible=false;
      if(this._arrow) this._arrow.style.display='none';
      return;
    }
    const {cx,cz}=ctr;
    const t=performance.now()*0.005, pulse=0.5+0.5*Math.sin(t);   // 0..1 gentle breathe

    // ---- world hint: the yellow arrow bobbing just above the exact target, its label on a parchment tag ----
    // over the object when its height is known (interiors, upper floors, the cavern), else above the ground
    const gy=(live.spec&&typeof live.spec.y==='number')?live.spec.y-0.4:(groundY(cx,cz)||0);
    const bob=0.5+0.5*Math.sin(performance.now()*0.0042);          // a slow, gentle bob
    const tipY=(live.spec&&typeof live.spec.y==='number')?live.spec.y-0.25:gy+1.5;
    if(!this._hint){ this._hint=this._arrowSpriteMake(); scene.add(this._hint); }
    if(this._hint.parent!==scene) scene.add(this._hint);
    this._hint.position.set(cx, tipY+bob*0.28, cz);
    this._hint.visible=true;
    if(live.label){
      if(!this._sprite || this._sprite._txt!==live.label){
        if(this._sprite){ scene.remove(this._sprite);
          if(this._sprite.material.map) this._sprite.material.map.dispose();
          this._sprite.material.dispose(); }
        this._sprite=this._labelSprite(live.label); this._sprite._txt=live.label;
        scene.add(this._sprite);
      }
      const lift=(live.spec&&typeof live.spec.labelLift==='number')?live.spec.labelLift:0;   // e.g. a door label above a dais
      this._sprite.position.set(cx, tipY+bob*0.28+this._hint.scale.y+0.08+lift, cz);
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
      if(this.complete && self.keepAfterComplete) return;   // a completion target (Holm departure) stays
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
