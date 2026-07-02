/* ============ World QoL overlays (GOAL.md §15 — RuneLite-inspired suite) ============
 * Every feature here is a self-registering module on the OverlayManager
 * (src/overlays.js) and listens on the Events bus (src/events.js) instead of
 * patching the game loop. Toggle any of them with 📊 / Shift+L.
 *   1. opponent-info    — target name + HP bar + HP% while fighting
 *   2. respawn-timers   — countdown over dead NPC spawn spots
 *   3. ground-items     — value-tiered labels over drops (junk faded)
 *   4. loot-tracker     — kills + picked-up loot value + gp/hr panel
 *   5. buff-timers      — active prayers / spec / stun / teleport cooldown chips
 *   6. notifications    — level-up banner, low-HP vignette, idle alert
 *   7. tile-markers     — right-click "Mark tile" persistent colored squares
 *   8. declutter        — hide name tags / shadows / tile grid / xp drops
 */

/* ---------- small shared helpers ---------- */
function _ovDiv(id, css){
  let e=document.getElementById(id);
  if(!e){ e=document.createElement('div'); e.id=id; document.body.appendChild(e); }
  e.style.cssText=css;
  return e;
}
const _OV_STEEL='background:rgba(43,37,28,.88);border:2px solid;'+
  'border-color:#7a7265 #241f17 #241f17 #7a7265;color:#d8ccb4;font-size:11px;';

/* ============ 1. Opponent info ============ */
const OpponentInfo = {
  _iv:null, _el:null,
  start(){
    this._el=_ovDiv('opp-info','position:absolute;top:8px;left:50%;transform:translateX(-50%);'+
      'min-width:170px;padding:4px 10px;z-index:26;text-align:center;display:none;pointer-events:none;'+_OV_STEEL);
    this._iv=setInterval(()=>{
      const t=(typeof Player!=='undefined')&&Player.target;
      if(!t || t.dead || !t.t){ this._el.style.display='none'; return; }
      const pct=Math.max(0, Math.round(t.hp/t.t.hp*100));
      const col=pct>60?'#00e000':pct>25?'#e0c000':'#e03030';
      this._el.innerHTML=`<b style="color:#ffd24a">${t.t.name}</b> <span style="color:#c0b49a">(level ${t.t.level})</span>`+
        `<div style="background:#241f17;height:8px;margin:3px 0 1px;border:1px solid #5d5447">`+
        `<div style="background:${col};height:100%;width:${pct}%"></div></div>`+
        `<span style="color:${col}">${Math.max(0,t.hp)} / ${t.t.hp} (${pct}%)</span>`;
      this._el.style.display='block';
    }, 200);
  },
  stop(){ clearInterval(this._iv); if(this._el) this._el.style.display='none'; }
};
Overlays.register({ id:'opponent-info', name:'Opponent info',
  desc:'Your target’s name, HP bar and HP% while you fight.', defaultOn:true,
  start:()=>OpponentInfo.start(), stop:()=>OpponentInfo.stop() });

/* ============ 2. NPC respawn timers ============ */
const RespawnTimers = {
  _iv:null, _pool:[],
  start(){
    this._iv=setInterval(()=>{
      let used=0;
      if(typeof WORLD!=='undefined' && WORLD.npcs && typeof UI!=='undefined'){
        for(const n of WORLD.npcs){
          if(!n.dead || !(n.respawnT>0) || n.dying) continue;
          const p=UI.worldToScreen(n.mesh, 0.6);
          if(!isFinite(p.x)||!isFinite(p.y)||p.x<0||p.x>innerWidth||p.y<0||p.y>innerHeight) continue;
          const el=this._pool[used] || (this._pool[used]=_ovDiv('respawn-t-'+used,''));
          el.style.cssText='position:absolute;z-index:24;padding:1px 5px;font-size:10px;'+
            'transform:translate(-50%,-50%);pointer-events:none;border-radius:6px;'+
            'background:rgba(20,16,10,.75);color:#8fd0ff;';
          el.style.left=p.x+'px'; el.style.top=p.y+'px';
          el.textContent='⟳ '+Math.ceil(n.respawnT)+'s';
          el.style.display='block';
          used++;
          if(used>=24) break;
        }
      }
      for(let i=used;i<this._pool.length;i++) this._pool[i].style.display='none';
    }, 400);
  },
  stop(){ clearInterval(this._iv); this._pool.forEach(e=>e.style.display='none'); }
};
Overlays.register({ id:'respawn-timers', name:'NPC respawn timers',
  desc:'Countdown over defeated monsters until they return.', defaultOn:true,
  start:()=>RespawnTimers.start(), stop:()=>RespawnTimers.stop() });

/* ============ 3. Ground-item labels (value tiers) ============ */
const GroundItems = {
  _iv:null, _pool:[],
  tier(v){ return v>=10000 ? ['#ff9040','insane'] : v>=1000 ? ['#ffd83a','high']
         : v>=100 ? ['#00e000','med'] : v>=20 ? ['#ffffff','low'] : ['#9a8e78','junk']; },
  start(){
    this._iv=setInterval(()=>{
      let used=0;
      if(typeof WORLD!=='undefined' && WORLD.drops && typeof UI!=='undefined' && typeof ITEMS!=='undefined'){
        // stack labels that share a tile (OSRS piles) — group by rounded tile
        const byTile={};
        for(const d of WORLD.drops){
          const u=d.userData; if(!u) continue;
          const k=Math.floor(d.position.x)+','+Math.floor(d.position.z);
          (byTile[k]=byTile[k]||{mesh:d, items:[]}).items.push(u);
        }
        for(const k in byTile){
          const g=byTile[k];
          const p=UI.worldToScreen(g.mesh, 0.55);
          if(!isFinite(p.x)||!isFinite(p.y)||p.x<0||p.x>innerWidth||p.y<0||p.y>innerHeight) continue;
          const lines=g.items.slice(0,4).map(u=>{
            const def=ITEMS[u.id]||{name:u.id, value:0};
            const val=(def.value||0)*(u.qty||1);
            const [col]=this.tier(val);
            return `<div style="color:${col}">${def.name}${u.qty>1?' ('+u.qty+')':''}`+
                   (val>=20?` <span style="opacity:.75">${val} gp</span>`:'')+`</div>`;
          });
          const el=this._pool[used] || (this._pool[used]=_ovDiv('gitem-'+used,''));
          el.style.cssText='position:absolute;z-index:23;padding:1px 5px;font-size:10px;'+
            'transform:translate(-50%,-100%);pointer-events:none;text-align:center;'+
            'background:rgba(20,16,10,.62);border-radius:4px;line-height:1.25;';
          el.style.left=p.x+'px'; el.style.top=p.y+'px';
          el.innerHTML=lines.join('')+(g.items.length>4?`<div style="color:#9a8e78">+${g.items.length-4} more</div>`:'');
          el.style.display='block';
          used++;
          if(used>=18) break;
        }
      }
      for(let i=used;i<this._pool.length;i++) this._pool[i].style.display='none';
    }, 350);
  },
  stop(){ clearInterval(this._iv); this._pool.forEach(e=>e.style.display='none'); }
};
Overlays.register({ id:'ground-items', name:'Ground item labels',
  desc:'Names over dropped items, colored by value tier (junk faded).', defaultOn:true,
  start:()=>GroundItems.start(), stop:()=>GroundItems.stop() });

/* ============ 4. Loot tracker (kills + pickups + gp/hr) ============ */
const LootTracker = {
  kills:{}, loot:{}, gp:0, t0:null, _el:null, _iv:null, _offs:[],
  start(){
    this._el=_ovDiv('loot-tracker','position:absolute;top:64px;left:200px;width:185px;z-index:26;'+
      'padding:5px 7px;display:none;pointer-events:none;'+_OV_STEEL);
    this._offs.push(Events.on('npcKilled', ({npc})=>{
      if(!this.t0) this.t0=performance.now();
      const n=npc.t.name; this.kills[n]=(this.kills[n]||0)+1; this.render();
    }));
    this._offs.push(Events.on('itemPickup', ({id, qty})=>{
      if(!this.t0) this.t0=performance.now();
      const def=(typeof ITEMS!=='undefined')&&ITEMS[id];
      this.loot[id]=(this.loot[id]||0)+qty;
      this.gp += ((def&&def.value)||0)*qty;
      this.render();
    }));
    this._iv=setInterval(()=>this.render(), 5000);   // keep gp/hr live
    this.render();
  },
  render(){
    if(!this._el) return;
    const ks=Object.keys(this.kills), ls=Object.keys(this.loot);
    if(!ks.length && !ls.length){ this._el.style.display='none'; return; }
    const hrs=this.t0?(performance.now()-this.t0)/3600000:0;
    const rate=hrs>0.0003?Math.round(this.gp/hrs):0;
    const kills=ks.sort((a,b)=>this.kills[b]-this.kills[a]).slice(0,5)
      .map(n=>`<div>${n} <span style="color:#c0b49a">×${this.kills[n]}</span></div>`).join('');
    this._el.innerHTML=`<div class="osrs-title" style="font-size:11px;margin-bottom:2px">Loot this session</div>`+
      `<div><span style="color:#ffd24a">${this.gp.toLocaleString()} gp</span>`+
      ` <span style="color:#c0b49a">(${rate.toLocaleString()}/hr)</span></div>`+
      (kills?`<div style="border-top:1px solid rgba(93,84,71,.5);margin-top:3px;padding-top:2px">${kills}</div>`:'');
    this._el.style.display='block';
  },
  stop(){ this._offs.forEach(off=>off()); this._offs=[];
    clearInterval(this._iv); if(this._el) this._el.style.display='none'; }
};
Overlays.register({ id:'loot-tracker', name:'Loot tracker',
  desc:'Session kills, picked-up loot value and gp/hr.', defaultOn:true,
  start:()=>LootTracker.start(), stop:()=>LootTracker.stop() });

/* ============ 5. Timers & buffs chips ============ */
const BuffTimers = {
  _iv:null, _el:null,
  start(){
    this._el=_ovDiv('buff-chips','position:absolute;top:8px;left:8px;z-index:26;display:none;'+
      'pointer-events:none;font-size:10px;max-width:330px;');
    this._iv=setInterval(()=>{
      if(typeof Player==='undefined'){ this._el.style.display='none'; return; }
      const chips=[];
      const chip=(txt,col)=>chips.push(`<span style="display:inline-block;margin:2px 3px 0 0;`+
        `padding:1px 6px;border-radius:8px;background:rgba(20,16,10,.78);color:${col};`+
        `border:1px solid #5d5447">${txt}</span>`);
      (Player.activePrayers||new Set()).forEach(id=>{
        const p=(typeof PRAYERS!=='undefined')&&PRAYERS[id];
        if(p) chip('\u{1F64F} '+p.name, '#8fd0ff');
      });
      if(Player.specArmed) chip('⚡ SPEC ARMED', '#ffd83a');
      else if(Player.spec<100) chip('⚡ '+Math.floor(Player.spec)+'%', '#c0b49a');
      if(Player.stunT>0) chip('\u{1F4AB} Stunned '+Player.stunT.toFixed(1)+'s', '#e08080');
      if(Player.teleCd>0) chip('\u{1F3E0} Home tele '+Math.ceil(Player.teleCd)+'s', '#c0b49a');
      if(Player.energy<25) chip('\u{1F3C3} Energy '+Math.floor(Player.energy)+'%', '#e0c000');
      this._el.innerHTML=chips.join('');
      this._el.style.display=chips.length?'block':'none';
    }, 250);
    // sits under the zone label; nudge the XP tracker down so they never overlap
    const xp=document.getElementById('xp-tracker'); if(xp) xp.style.top='96px';
    this._el.style.top='64px';
  },
  stop(){ clearInterval(this._iv); if(this._el) this._el.style.display='none';
    const xp=document.getElementById('xp-tracker'); if(xp) xp.style.top='64px'; }
};
Overlays.register({ id:'buff-timers', name:'Timers & buffs',
  desc:'Chips for active prayers, special attack, stun, run energy and teleport cooldowns.',
  defaultOn:true, start:()=>BuffTimers.start(), stop:()=>BuffTimers.stop() });

/* ============ 6. Notifications (level-up banner, low-HP vignette, idle) ============ */
const Notifier = {
  _offs:[], _iv:null, _lastInput:0, _lowWarned:false, _idleWarned:false,
  _flash(col){
    const f=_ovDiv('notif-flash','position:absolute;inset:0;z-index:60;pointer-events:none;'+
      `background:${col};opacity:0;transition:opacity .18s;`);
    requestAnimationFrame(()=>{ f.style.opacity=0.38;
      setTimeout(()=>{ f.style.opacity=0; }, 320); });
  },
  _banner(html){
    const b=_ovDiv('notif-banner','position:absolute;top:16%;left:50%;transform:translateX(-50%);'+
      'z-index:61;padding:10px 26px;font-size:17px;font-weight:bold;text-align:center;'+
      'pointer-events:none;color:#ffd24a;text-shadow:2px 2px 0 #000;opacity:0;transition:opacity .3s;'+_OV_STEEL);
    b.innerHTML=html; b.style.opacity=1;
    clearTimeout(this._bt); this._bt=setTimeout(()=>{ b.style.opacity=0; }, 2600);
  },
  start(){
    this._lastInput=performance.now();
    this._onInput=()=>{ this._lastInput=performance.now(); this._idleWarned=false; };
    addEventListener('mousedown', this._onInput); addEventListener('keydown', this._onInput);
    this._offs.push(Events.on('levelUp', ({skill, level})=>{
      this._flash('radial-gradient(circle, rgba(255,210,74,.25), rgba(255,210,74,.5))');
      this._banner(`✨ Level ${level} ${skill}! ✨`);
    }));
    this._iv=setInterval(()=>{
      if(typeof Player==='undefined') return;
      const frac=Player.hp/Player.maxHp;
      const vg=_ovDiv('notif-vignette','position:absolute;inset:0;z-index:22;pointer-events:none;'+
        'box-shadow:inset 0 0 120px 40px rgba(200,20,20,.55);opacity:0;transition:opacity .5s;');
      if(frac<=0.25 && Player.hp>0){
        vg.style.opacity=0.4+0.35*Math.abs(Math.sin(performance.now()*0.004));
        if(!this._lowWarned){ UI.chat('⚠ Your hitpoints are running low!','combat'); this._lowWarned=true; }
      } else { vg.style.opacity=0; this._lowWarned=false; }
      if(performance.now()-this._lastInput > 4*60000 && !this._idleWarned){
        this._idleWarned=true;
        this._flash('rgba(120,160,255,.4)');
        this._banner('\u{1F4A4} You have been idle for 4 minutes');
      }
    }, 500);
  },
  stop(){
    this._offs.forEach(off=>off()); this._offs=[];
    clearInterval(this._iv);
    removeEventListener('mousedown', this._onInput); removeEventListener('keydown', this._onInput);
    ['notif-vignette','notif-banner','notif-flash'].forEach(id=>{
      const e=document.getElementById(id); if(e) e.style.opacity=0; });
  }
};
Overlays.register({ id:'notifications', name:'Notifications',
  desc:'Level-up banner + flash, low-HP warning vignette, idle alert.', defaultOn:true,
  start:()=>Notifier.start(), stop:()=>Notifier.stop() });

/* ============ 7. Tile markers (persisted, right-click "Mark tile") ============ */
const TileMarkers = {
  COLORS:[0xffe14d, 0x50d0ff, 0xff6060, 0x60ff80, 0xd080ff],
  list:(()=>{ try{ return JSON.parse(localStorage.getItem('cr_tile_markers')||'[]'); }
              catch(e){ return []; } })(),
  _objs:[], _wrapped:false,
  save(){ try{ localStorage.setItem('cr_tile_markers', JSON.stringify(this.list)); }catch(e){} },
  at(tx,tz){ return this.list.findIndex(m=>m.x===tx && m.z===tz); },
  toggleAt(pt){
    const tx=Math.floor(pt.x), tz=Math.floor(pt.z);
    const i=this.at(tx,tz);
    if(i>=0){ this.list.splice(i,1); UI.chat('Tile unmarked.','plain'); }
    else{
      const color=this.COLORS[this.list.length % this.COLORS.length];
      this.list.push({x:tx, z:tz, color});
      UI.chat('Tile marked.','plain');
    }
    this.save(); this.rebuild();
  },
  rebuild(){
    this._objs.forEach(o=>{ scene.remove(o); o.geometry.dispose(); });
    this._objs=[];
    if(!this._on || typeof scene==='undefined' || typeof groundY==='undefined') return;
    for(const m of this.list){
      const cx=m.x+0.5, cz=m.z+0.5, h=0.44;
      const c=[[cx-h,cz-h],[cx+h,cz-h],[cx+h,cz+h],[cx-h,cz+h],[cx-h,cz-h]];
      const v=new Float32Array(15);
      for(let i=0;i<5;i++){ v[i*3]=c[i][0]; v[i*3+1]=(groundY(c[i][0],c[i][1])||0)+0.05; v[i*3+2]=c[i][1]; }
      const line=new THREE.Line(new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({color:m.color, transparent:true, opacity:0.95}));
      line.geometry.setAttribute('position', new THREE.BufferAttribute(v,3));
      line.renderOrder=992;
      scene.add(line); this._objs.push(line);
    }
  },
  wrapMenu(){
    if(this._wrapped || typeof buildCtxEntries!=='function') return;
    const orig=buildCtxEntries;
    const self=this;
    buildCtxEntries=function(hit, e){
      const entries=orig(hit, e);
      if(self._on && e && typeof groundPick==='function'){
        const gp=groundPick(e);
        if(gp){
          const tx=Math.floor(gp.x), tz=Math.floor(gp.z);
          const marked=self.at(tx,tz)>=0;
          // insert above "Walk here" (which sits just before Cancel)
          entries.splice(Math.max(0,entries.length-2), 0,
            {html:(marked?'Unmark':'Mark')+' <b>Tile</b>', fn:()=>self.toggleAt(gp)});
        }
      }
      return entries;
    };
    this._wrapped=true;
  },
  start(){ this._on=true; this.wrapMenu(); this.rebuild(); },
  stop(){ this._on=false; this.rebuild(); }
};
Overlays.register({ id:'tile-markers', name:'Tile markers',
  desc:'Right-click the ground → "Mark Tile". Colored squares persist on this device.',
  defaultOn:true, start:()=>TileMarkers.start(), stop:()=>TileMarkers.stop() });

/* ============ 8. Declutter / performance toggles ============ */
const Declutter = {
  hideTags(on){
    if(typeof scene==='undefined') return;
    scene.traverse(o=>{ if(o.isSprite && o.userData && o.userData._nameTag) o.visible=!on; });
  },
  _shadowed:null,
  hideShadows(on){
    if(typeof scene==='undefined') return;
    if(on){
      this._shadowed=[];
      scene.traverse(o=>{ if(o.isMesh && o.castShadow){ this._shadowed.push(o); o.castShadow=false; } });
    } else if(this._shadowed){
      this._shadowed.forEach(o=>{ o.castShadow=true; });
      this._shadowed=null;
    }
  },
  hideGrid(on){
    if(typeof scene==='undefined') return;
    scene.children.forEach(o=>{ if(o.isLineSegments && o.renderOrder===990) o.visible=!on; });
  },
  hideXpDrops(on){
    let st=document.getElementById('declutter-style');
    if(!st){ st=document.createElement('style'); st.id='declutter-style'; document.head.appendChild(st); }
    st.textContent = on ? '#xp-drops{display:none !important}' : '';
  }
};
Overlays.register({ id:'hide-nametags', name:'Hide name tags',
  desc:'Declutter: hide the floating yellow names over NPCs and bots.', defaultOn:false,
  start:()=>Declutter.hideTags(true), stop:()=>Declutter.hideTags(false) });
Overlays.register({ id:'hide-shadows', name:'Low detail (no shadows)',
  desc:'Performance: turn off shadow casting for every mesh.', defaultOn:false,
  start:()=>Declutter.hideShadows(true), stop:()=>Declutter.hideShadows(false) });
Overlays.register({ id:'hide-grid', name:'Hide tile grid',
  desc:'Declutter: hide the faint ground grid around the player.', defaultOn:false,
  start:()=>Declutter.hideGrid(true), stop:()=>Declutter.hideGrid(false) });
Overlays.register({ id:'hide-xpdrops', name:'Hide XP drops',
  desc:'Declutter: suppress the floating +XP numbers.', defaultOn:false,
  start:()=>Declutter.hideXpDrops(true), stop:()=>Declutter.hideXpDrops(false) });

/* new NPCs / bots spawn after a toggle: re-apply tag hiding on a slow beat */
setInterval(()=>{ if(Overlays.enabled('hide-nametags')) Declutter.hideTags(true); }, 4000);

/* the scene doesn't exist until the game boots — draw persisted tile markers once it does */
const _tmBoot=setInterval(()=>{
  if(typeof scene!=='undefined' && typeof groundY==='function'){
    clearInterval(_tmBoot);
    if(TileMarkers._on) TileMarkers.rebuild();
  }
}, 1200);
