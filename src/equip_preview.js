/* equip_preview.js — live character paper-doll render for the Worn Equipment tab.
 *
 * Alora shows your actually-equipped character inside the equipment interface; this
 * gives Crafted Realm the same detail. Instead of cloning the rig (fragile for GLB
 * avatars), we render the LIVE `player` object with a second camera on a dedicated
 * THREE layer, so it always reflects real worn gear with zero duplication.
 *
 * How the isolation works (no `.layers` used anywhere else in the project):
 *   - PREVIEW_LAYER (1) is enabled on the whole player subtree every frame, so newly
 *     equipped gear is picked up automatically.
 *   - The preview camera is set to ONLY see layer 1 -> it renders the character alone,
 *     none of the surrounding world.
 *   - Three dedicated lights live on layer 1 only, so they light the portrait but are
 *     excluded from the main world render (a light contributes only if its layers meet
 *     the rendering camera's layers).
 *   - scene.background / scene.fog are nulled for the duration of the portrait render so
 *     the world sky/fog doesn't fill the panel, then restored — the alpha renderer keeps
 *     the panel background (a warm vignette from CSS) showing through.
 */
const EquipPreview = {
  PREVIEW_LAYER: 1,
  renderer: null, cam: null, canvas: null, lights: null,
  raf: 0, angle: 0.35, dragging: false, _lastX: 0, _auto: true,

  init(){
    if(this.renderer) return;
    if(typeof THREE==='undefined' || typeof scene==='undefined' || !scene) return;
    const c = document.createElement('canvas');
    c.className = 'equip-portrait-canvas';
    this.canvas = c;
    const r = new THREE.WebGLRenderer({ canvas:c, antialias:true, alpha:true });
    r.setPixelRatio(Math.min(devicePixelRatio||1, 2));
    r.setClearColor(0x000000, 0);
    r.setSize(190, 208, false);
    this.renderer = r;
    const cam = new THREE.PerspectiveCamera(30, 190/208, 0.1, 200);
    cam.layers.set(this.PREVIEW_LAYER);          // see ONLY the character layer
    this.cam = cam;
    const amb = new THREE.AmbientLight(0xffffff, 0.95);
    const key = new THREE.DirectionalLight(0xfff2d8, 1.15); key.position.set(2.5, 4, 3.5);
    const rim = new THREE.DirectionalLight(0x9fb8ff, 0.45); rim.position.set(-3, 2.5, -3);
    this.lights = [amb, key, rim];
    this.lights.forEach(l=>{ l.layers.set(this.PREVIEW_LAYER); scene.add(l); });

    // drag-to-rotate (matches the feel of spinning a character preview)
    c.style.cursor = 'grab';
    c.addEventListener('pointerdown', e=>{ this.dragging=true; this._auto=false; this._lastX=e.clientX; c.style.cursor='grabbing'; c.setPointerCapture&&c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e=>{ if(!this.dragging) return; this.angle -= (e.clientX-this._lastX)*0.01; this._lastX=e.clientX; });
    const up=()=>{ this.dragging=false; c.style.cursor='grab'; };
    c.addEventListener('pointerup', up); c.addEventListener('pointerleave', up);
    c.addEventListener('dblclick', ()=>{ this._auto=true; });   // resume auto-spin
  },

  enablePlayerLayer(){
    if(typeof player==='undefined' || !player) return;
    const L=this.PREVIEW_LAYER;
    player.traverse(o=>o.layers.enable(L));
  },

  frameAndRender(){
    if(typeof player==='undefined' || !player || !this.renderer) return;
    this.enablePlayerLayer();
    const box = new THREE.Box3().setFromObject(player);
    if(box.isEmpty()) return;
    const ctr = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const h = Math.max(size.y, 1.4);
    if(this._auto && !this.dragging) this.angle += 0.006;
    const dist = h * 2.05;
    const a = this.angle;
    // frame full body, camera a touch above the mid-point looking slightly down
    this.cam.position.set(ctr.x + Math.sin(a)*dist, ctr.y + h*0.10, ctr.z + Math.cos(a)*dist);
    this.cam.lookAt(ctr.x, ctr.y - h*0.02, ctr.z);
    const bg = scene.background, fog = scene.fog;
    scene.background = null; scene.fog = null;
    this.renderer.render(scene, this.cam);
    scene.background = bg; scene.fog = fog;
  },

  loop(){
    this.raf = requestAnimationFrame(()=>this.loop());
    // only pay the render cost while the portrait is actually visible on screen
    if(!this.canvas || this.canvas.offsetParent === null) return;
    this.frameAndRender();
  },

  mount(container){
    this.init();
    if(!this.canvas) return false;
    container.appendChild(this.canvas);
    this.enablePlayerLayer();
    if(!this.raf) this.loop();
    return true;
  }
};
window.EquipPreview = EquipPreview;
