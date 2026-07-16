/* input_controls.js — player-facing keyboard: WASD movement, arrow-key camera, type-to-chat.
 *
 * The game shipped with only dev/admin keys (` console, B build, Shift+A showcase) — no way to
 * move or talk from the keyboard. This adds the RuneScape-style feel the player expects:
 *   - WASD  → walk the character, camera-relative, collision-aware (slideMove), cancelling any
 *             click-to-move path so the two don't fight.
 *   - Arrows→ rotate / tilt the camera (left/right = yaw, up/down = pitch). (Scroll already zooms.)
 *   - Enter → open a chat line; the message floats over your head as a fading bubble + logs in chat.
 *
 * Self-contained + reversible: it reads the existing globals (player, Player, camCtl, slideMove,
 * groundY, UI, CharCfg) and is driven by two one-line hooks in game5_main's update(). It never
 * touches combat math or shared NPC_TYPES. */
const Controls = {
  keys: {},            // physical keys currently held (e.key lowercased)
  chatting: false,
  _input: null,
  _bubble: null, _bubbleT: 0,

  init(){
    addEventListener('keydown', (e)=>{
      const tag = (e.target && e.target.tagName) || '';
      const inField = /INPUT|TEXTAREA|SELECT/.test(tag);
      // Enter opens the chat line (when not already typing in a field)
      if((e.key==='Enter') && !inField && !this.chatting){ this.openChat(); e.preventDefault(); return; }
      if(inField) return;                              // let fields receive the key
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      // stop the page from scrolling on the movement/camera keys
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e)=>{ this.keys[e.key.toLowerCase()] = false; });
    // dropping focus / tabbing away must not leave a key "stuck on"
    addEventListener('blur', ()=>{ this.keys = {}; });
  },

  /* ---- camera: arrows rotate (yaw) and tilt (pitch). Called each frame. ---- */
  camTick(dt){
    if(this.chatting || typeof camCtl==='undefined') return;
    const k = this.keys, ys = 2.2*dt, ps = 1.3*dt;
    if(k['arrowleft'])  camCtl.yaw   -= ys;
    if(k['arrowright']) camCtl.yaw   += ys;
    if(k['arrowup'])    camCtl.pitch = Math.min(1.45, camCtl.pitch + ps);
    if(k['arrowdown'])  camCtl.pitch = Math.max(0.55, camCtl.pitch - ps);
  },

  /* ---- WASD movement, camera-relative. Returns true if it moved the player this frame. ---- */
  manualMove(dt){
    if(this.chatting || typeof player==='undefined' || typeof camCtl==='undefined') return false;
    if(typeof CharCreator!=='undefined' && CharCreator.active) return false;   // locked during character design
    const k = this.keys;
    const f = (k['w']?1:0) - (k['s']?1:0);     // forward / back
    const r = (k['d']?1:0) - (k['a']?1:0);     // strafe right / left
    if(!f && !r) return false;
    const yaw = camCtl.yaw;
    // "forward" is the direction from the camera toward the player (into the screen)
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const rgtX = -Math.cos(yaw), rgtZ =  Math.sin(yaw);
    let dx = fwdX*f + rgtX*r, dz = fwdZ*f + rgtZ*r;
    const dl = Math.hypot(dx,dz) || 1; dx/=dl; dz/=dl;
    // 4-directional only: snap the camera-relative vector to the dominant world axis so the
    // player leaves a tile by a SIDE (N/E/S/W), never a corner — no diagonal WASD movement.
    if(Math.abs(dx) >= Math.abs(dz)){ dx = Math.sign(dx); dz = 0; }
    else { dz = Math.sign(dz); dx = 0; }
    const spd  = (Player && Player.moveSpeed) ? Player.moveSpeed() : 4.2;
    const step = spd*dt;
    const tx = player.position.x + dx*step, tz = player.position.z + dz*step;
    const pl=(Player&&Player.plane)||0;
    const slid = (typeof slideMove==='function')
      ? slideMove(player.position.x, player.position.z, tx, tz, 0.3, pl)
      : [tx,tz];
    if(slid){
      const y = (pl!==0&&typeof Planes!=='undefined') ? Planes.elevAt(slid[0],slid[1],pl) :
        ((typeof groundY==='function') ? groundY(slid[0],slid[1]) : player.position.y);
      if(y!==null && y!==undefined){
        player.position.set(slid[0], y, slid[1]);
        player.lookAt(slid[0]+dx, y, slid[1]+dz);
      }
    }
    // manual control wins: drop any click-route / queued action so they don't tug the player back
    if(typeof Player!=='undefined'){ Player.moveTo=null; Player.path=[]; Player.action=null; }
    return true;
  },

  /* ---- type-to-chat ---- */
  openChat(){
    if(!this._input){
      const inp = document.createElement('input');
      inp.id = 'chat-line';
      inp.maxLength = 80;
      inp.placeholder = 'Press Enter to chat…';
      inp.style.cssText = 'position:absolute;left:8px;bottom:138px;width:486px;z-index:40;'+
        'padding:5px 8px;font:12px Verdana;color:#ffd24a;background:#1e1a14;'+
        'border:2px solid;border-color:#241f17 #6b5f4a #6b5f4a #241f17;outline:none;box-sizing:border-box;';
      inp.addEventListener('keydown',(e)=>{
        e.stopPropagation();                            // keep game keys from firing while typing
        if(e.key==='Enter'){ this.sendChat(inp.value); inp.value=''; this.closeChat(); }
        else if(e.key==='Escape'){ inp.value=''; this.closeChat(); }
      });
      document.body.appendChild(inp);
      this._input = inp;
    }
    this.keys = {};                                     // release any held movement keys
    this.chatting = true;
    this._input.style.display = 'block';
    this._input.focus();
  },
  closeChat(){ this.chatting = false; if(this._input){ this._input.style.display='none'; this._input.blur(); } },

  sendChat(text){
    text = (text||'').trim();
    if(!text) return;
    const name = (typeof CharCfg!=='undefined' && CharCfg.name) ? CharCfg.name : 'You';
    if(typeof UI!=='undefined' && UI.chat) UI.chat(name + ': ' + text, 'plain');
    this.sayOverhead(text);
  },

  // a speech bubble that rides above the player's head and fades out
  sayOverhead(text){
    if(typeof player==='undefined' || typeof THREE==='undefined') return;
    if(this._bubble && this._bubble.parent) this._bubble.parent.remove(this._bubble);
    const pad=14, font=26;
    const meas=document.createElement('canvas').getContext('2d'); meas.font='bold '+font+'px Verdana';
    const w=Math.min(420, Math.ceil(meas.measureText(text).width)+pad*2);
    const c=document.createElement('canvas'); c.width=w; c.height=46;
    const x=c.getContext('2d');
    x.fillStyle='rgba(255,255,255,0.92)'; if(x.roundRect){ x.beginPath(); x.roundRect(0,0,w,46,8); x.fill(); } else x.fillRect(0,0,w,46);
    x.font='bold '+font+'px Verdana'; x.fillStyle='#0a0a0a'; x.textAlign='center'; x.textBaseline='middle';
    x.fillText(text, w/2, 24);
    const tex=new THREE.CanvasTexture(c);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true}));
    spr.scale.set(w/100*1.4, 0.64, 1); spr.position.y = 2.5;
    player.add(spr);
    this._bubble = spr; this._bubbleT = 4.0;            // seconds on screen
  },

  // fade + expire the overhead bubble; called each frame
  bubbleTick(dt){
    if(!this._bubble) return;
    this._bubbleT -= dt;
    if(this._bubbleT <= 0){ if(this._bubble.parent) this._bubble.parent.remove(this._bubble); this._bubble=null; return; }
    if(this._bubbleT < 1) this._bubble.material.opacity = Math.max(0, this._bubbleT);
  },

  update(dt){ this.camTick(dt); this.bubbleTick(dt); },
};
Controls.init();
