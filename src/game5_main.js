/* ================= GAME LOOP ================= */
let curZone='holm';
let _runUiT=0;
/* fixed 600ms world-tick accumulator. The player's combat / skilling / vitals run inside this
   tick (deterministic, OSRS-style); movement, NPCs, FX, animation and camera stay per-frame. */
let worldTickAcc=0, worldTickCount=0;

/* ---------- pathfinding: TRUE tile BFS, OSRS-style ----------
   One world unit = one tile. Movement is 4-directional only (N/S/E/W) — never diagonal,
   exactly like Old School. We return EVERY tile centre along the route (no string-pulling)
   so the path is a strict orthogonal staircase the follower walks tile by tile. */
const TILE_SZ = 1;
function tileWalkable(i, j){
  const cx=i+0.5, cz=j+0.5;
  if(collides(cx, cz, 0.42, true)) return false;     // props/walls (closed doors don't block plans)
  const y=groundY(cx, cz); if(y===null || y<-1.2) return false;   // off-map / water
  return true;
}
function computePath(sx, sz, tx, tz){
  const sti=Math.floor(sx), stj=Math.floor(sz);
  const tti=Math.floor(tx), ttj=Math.floor(tz);
  const center=(i,j)=>[i+0.5, j+0.5];
  const roomOf=(i,j)=>{ const cx=i+0.5, cz=j+0.5;
    return WORLD.interiors.find(it=>Math.abs(cx-it.x)<it.hw && Math.abs(cz-it.z)<it.hd) || null; };
  const tgtRoom=roomOf(tti,ttj), startRoom=roomOf(sti,stj);
  const MAX=64;                       // search radius in tiles (re-paths on arrival for long hauls)
  const key=(i,j)=>(i+512)*4096+(j+512);
  const prev=new Map(), seen=new Set();
  let q=[[sti,stj]]; seen.add(key(sti,stj));
  let best=[sti,stj], bestD=Math.abs(sti-tti)+Math.abs(stj-ttj), found=false, guard=0;
  while(q.length && !found && guard++<30000){
    const nq=[];
    for(const cell of q){
      const i=cell[0], j=cell[1];
      if(i===tti && j===ttj){ found=true; best=cell; break; }
      const d=Math.abs(i-tti)+Math.abs(j-ttj);
      if(d<bestD){ bestD=d; best=cell; }
      for(let dir=0; dir<4; dir++){
        const ii=i+(dir===0?1:dir===1?-1:0), jj=j+(dir===2?1:dir===3?-1:0);
        if(Math.abs(ii-sti)>MAX || Math.abs(jj-stj)>MAX) continue;
        const k=key(ii,jj);
        if(seen.has(k)) continue;
        if(!tileWalkable(ii,jj)){ seen.add(k); continue; }
        const r=roomOf(ii,jj);
        if(r && r!==tgtRoom && r!==startRoom){ seen.add(k); continue; }   // don't cut through buildings
        seen.add(k); prev.set(k,[i,j]); nq.push([ii,jj]);
      }
    }
    q=nq;
  }
  // reconstruct from the goal, or the closest tile we reached (a true OSRS "walk as near as you can")
  const tiles=[]; let cur=best;
  while(cur){ tiles.push(cur); cur=prev.get(key(cur[0],cur[1])); }
  tiles.reverse();
  const pts=tiles.map(t=>center(t[0],t[1]));
  return {pts, reached:found};
}
function orderWalk(point){
  Player.moveTo=point.clone ? point.clone() : new THREE.Vector3(point.x, point.y||0, point.z);
  Player._navAge=0; Player._navTries=0; Player._navBest=1e9; Player._navStall=0;
  Player._navDetour=null; Player._navDetour2=null;
  const r=computePath(player.position.x, player.position.z, Player.moveTo.x, Player.moveTo.z);
  Player.path = r.pts.map(p=>new THREE.Vector3(p[0], groundY(p[0],p[1])||0, p[1]));
  Player._pathPartial = !r.reached || (Player.path.length &&
    Math.hypot(Player.path[Player.path.length-1].x-Player.moveTo.x,
               Player.path[Player.path.length-1].z-Player.moveTo.z) > 1.2);
}

function update(dt){
  let playerMovedThisFrame = false;
  // drives the combat-ready stance in walkAnim — idle-while-fighting reads as a guard, not a stroll
  player.userData.inCombat = !!(Player.target && !Player.target.dead);
  if(Player.stunT>0){ Player.moveTo=null; Player.path=[]; Player.target=null; if(Player.action&&Player.action.type==='pickpocket')Player.action=null; }
  // WASD manual control takes priority over click-to-move (it cancels the click route itself)
  const _manual = (Player.stunT<=0 && typeof Controls!=='undefined' && Controls.manualMove) ? Controls.manualMove(dt) : false;
  if(_manual){
    playerMovedThisFrame = true;
    walkAnim(player, true, dt, (Player.moveSpeed?Player.moveSpeed():4.2)/4.2);
  } else if(Player.moveTo){
    // ensure we have a live tile route to the goal
    if(!Player.path || !Player.path.length){
      const rem=Math.hypot(Player.moveTo.x-player.position.x, Player.moveTo.z-player.position.z);
      if(rem>0.6) orderWalk(Player.moveTo);
    }
    // stale path from before a teleport — replan from here
    if(Player.path && Player.path.length &&
       Math.hypot(Player.path[0].x-player.position.x, Player.path[0].z-player.position.z)>25){
      orderWalk(Player.moveTo);
    }
    if(Player.path && Player.path.length){
      // walk along the orthogonal tile route. Between two adjacent tile centres only one axis
      // changes, so motion is strictly N/S/E/W — never diagonal — and corners are crisp because
      // we land on each centre before turning toward the next.
      let budget=Player.moveSpeed()*dt;
      let guard=0;
      while(budget>1e-4 && Player.path.length && guard++<64){
        const wp=Player.path[0];
        const dx=wp.x-player.position.x, dz=wp.z-player.position.z;
        const dd=Math.hypot(dx,dz);
        if(dd<=budget+1e-4){
          player.position.set(wp.x, wp.y, wp.z);
          if(dd>1e-5) player.lookAt(wp.x+dx, wp.y, wp.z+dz);
          budget-=dd; Player.path.shift(); playerMovedThisFrame=true;
        } else {
          const nx=player.position.x+dx/dd*budget, nz=player.position.z+dz/dd*budget;
          const ny=groundY(nx,nz);
          player.position.set(nx, ny===null?player.position.y:ny, nz);
          player.lookAt(wp.x, player.position.y, wp.z);
          budget=0; playerMovedThisFrame=true;
        }
      }
      walkAnim(player, playerMovedThisFrame, dt, Player.moveSpeed()/4.2);
      if(!Player.path.length){
        // reached the end of the known route
        if(Player._pathPartial &&
           Math.hypot(Player.moveTo.x-player.position.x, Player.moveTo.z-player.position.z)>1.2){
          orderWalk(Player.moveTo);                       // long haul / closest-approach: try to continue
          if(Player.path.length<=1){ Player.path=[]; Player.moveTo=null; }   // no further progress — stop
        } else {
          Player.moveTo=null;                              // arrived
        }
      }
    } else {
      Player.moveTo=null;                                  // nowhere to go
      walkAnim(player, false, dt);
    }
  } else {
    walkAnim(player, false, dt);
  }
  // ── fixed-tick player sim: combat/skilling/vitals advance in 600ms steps (wall-clock unchanged) ──
  worldTickAcc += dt;
  let _nTicks = Math.floor(worldTickAcc / TICK);
  if(_nTicks > 5){ _nTicks = 5; worldTickAcc = 0; }   // drop backlog after a tab stall (no spiral of death)
  else { worldTickAcc -= _nTicks * TICK; }
  for(let _ti=0; _ti<_nTicks; _ti++){ const dt = TICK; worldTickCount++;   // dt shadowed to TICK
  Player.tickVitals(dt, playerMovedThisFrame);
  Player.regen(dt);
  if(Player.target && !Player.target.dead) playerAttack(Player.target, dt);

  // arrive early: once in range of the action target, stop pathing and act
  if(Player.action && Player.moveTo && Player.action.obj){
    const reach = Player.action.type==='gather' ? 2.6 : 2.2;
    if(player.position.distanceTo(Player.action.obj.position) <= reach) Player.moveTo=null;
  }
  if(Player.action && !Player.moveTo){
    const a=Player.action;
    if(a.type==='pickup'){
      if(player.position.distanceTo(a.obj.position)>2.3){ orderWalk(a.obj.position); return; }
      const u=a.obj.userData;
      if(Player.addItem(u.id, u.qty)){
        UI.chat(`You pick up the ${ITEMS[u.id].name.toLowerCase()}${u.qty>1?' ('+u.qty+')':''}.`,'plain');
        scene.remove(a.obj); removeClickable(a.obj);
        const di=WORLD.drops.indexOf(a.obj); if(di>=0) WORLD.drops.splice(di,1);
        if(u.id==='coins') Sfx.coin();
      }
      Player.action=null;
    }
    else if(a.type==='talk'){
      const u=a.obj.userData;
      if(player.position.distanceTo(a.obj.position)<3.2){ talkTo(u.id, u.name, u.face); Player.action=null; }
      else orderWalk(a.obj.position);
    }
    else if(a.type==='gather'){
      const u=a.obj.userData;
      if(player.position.distanceTo(a.obj.position)>2.65){ orderWalk(a.obj.position); }
      else {
        if(!u.alive){ Player.action=null; return; }
        let power;
        if(u.rtype==='tree')      power = Player.wieldedToolPower('woodcutting');
        else if(u.rtype==='rock') power = Player.bestToolPower('mining');
        else                      power = Player.bestToolPower('fishing');
        if(power<=0){ UI.chat(GATHER_RATES[u.rtype].toolMsg,'plain'); Player.action=null; return; }
        player.lookAt(a.obj.position.x, player.position.y, a.obj.position.z);
        // one action roll per game tick, like OSRS
        a.tick=(a.tick||0)+dt;
        if(a.tick>=TICK){
          a.tick-=TICK;
          swing(player);
          if(u.rtype==='tree') Sfx.chop(); else if(u.rtype==='rock') Sfx.mine(); else Sfx.splash();
          const rate = u.mat || GATHER_RATES[u.rtype];
          if(u.mat && Player.lvl(u.skill)<u.mat.req){
            UI.chat(`You need a Mining level of ${u.mat.req} to mine this rock.`,'plain');
            Player.action=null; return;
          }
          if(Math.random() < gatherChance(u.rtype, Player.lvl(u.skill), power)){
            if(Player.addItem(rate.item,1)){
              if(u.rtype==='tree') UI.chat('You get some emberwood logs.','plain');
              else if(u.rtype==='rock') UI.chat('You manage to mine '+(u.mat?u.mat.chat:'some copper')+'.','plain');
              else UI.chat('You catch a mirrorperch.','plain');
              Player.addXp(u.skill, rate.xp);
              Tutorial.notify('gather', rate.item);
              if(Math.random()<0.35){
                u.alive=false; u.respawnT=u.respawn;
                if(u.rtype==='tree'){ Sfx.treeFall();
                  a.obj.children.forEach((ch,ci)=>{ if(ci>0) ch.visible=false; }); }
                else a.obj.visible=false;
                Player.action=null;
              }
            } else Player.action=null;
          }
        }
      }
    }
    else if(a.type==='door'){
      if(player.position.distanceTo(a.obj.position)>2.3){ if(!Player.moveTo) orderWalk(a.obj.position); }
      else { toggleDoor(a.obj); Player.action=null; }
    }
    else if(a.type==='smelt'){
      if(player.position.distanceTo(a.obj.position)>2.6){ if(!Player.moveTo) orderWalk(a.obj.position); }
      else {
        Player.moveTo=null; Player.path=[];
        a.t+=dt;
        if(a.t>=1.8){
          a.t=0;
          const s=SMELTS[a.bar];
          const have=Object.keys(s.needs).every(n=>Player.count(n)>=s.needs[n]);
          if(!have){ Player.action=null; }
          else {
            for(const n in s.needs) Player.removeItem(n, s.needs[n]);
            Player.addItem(a.bar,1);
            Player.addXp('Smithing', s.xp);
            UI.chat('You smelt a '+s.name.toLowerCase()+'.','xp');
            Sfx.mine(); swing(player); UI.refreshInv();
            const again=Object.keys(s.needs).every(n=>Player.count(n)>=s.needs[n]);
            if(!again) Player.action=null;
          }
        }
      }
    }
    else if(a.type==='smith'){
      if(player.position.distanceTo(a.obj.position)>2.4){ if(!Player.moveTo) orderWalk(a.obj.position); }
      else {
        Player.moveTo=null; Player.path=[];
        a.t+=dt;
        if(a.t>=1.8){
          a.t=0;
          const it=a.make;
          if(Player.count('hammer')<1 || Player.count(a.bar)<it.bars){ Player.action=null; }
          else {
            Player.removeItem(a.bar, it.bars);
            Player.addItem(it.id, it.qty||1);
            Player.addXp('Smithing', SMITH_XP[a.bar]*it.bars);
            UI.chat('You hammer out '+(it.qty?'a set of ':'a ')+it.name.toLowerCase().replace(/ \(x\d+\)/,'')+'.','xp');
            Sfx.mine(); swing(player); UI.refreshInv();
            if(Player.count(a.bar)<it.bars) Player.action=null;
          }
        }
      }
    }
    else if(a.type==='lightfire'){
      a.t+=dt;
      swing(player);
      if(a.t>=1.5){
        const s=Player.inv[a.slot];
        if(s && s.id==='logs'){
          Player.inv[a.slot]=null;
          const fx=player.position.x, fz=player.position.z;
          const fire=makeCampfire(fx,fz);
          fire.userData.ttl=65;
          Player.addXp('Firemaking', 40);
          UI.chat('The fire catches and the logs begin to burn.','xp');
          UI.refreshInv();
          // the firemaker steps west, as tradition demands
          const wx=fx-1.1;
          if(!collides(wx,fz,0.3) && (groundY(wx,fz)||-9)>-1.2) player.position.set(wx, groundY(wx,fz), fz);
        }
        Player.action=null;
      }
    }
    else if(a.type==='fletch'){
      a.t+=dt;
      if(a.t>=1.2){
        const s=Player.inv[a.slot];
        if(s && s.id==='logs'){
          Player.inv[a.slot]=null;
          Player.addItem(a.make.id, a.make.qty);
          Player.addXp('Fletching', a.make.xp);
          UI.chat('You carefully carve the emberwood.','xp');
          Sfx.click(); UI.refreshInv();
        }
        Player.action=null;
      }
    }
    else if(a.type==='pickpocket'){
      if(a.npc.dead){ Player.action=null; }
      else if(player.position.distanceTo(a.npc.mesh.position)>1.6){ if(!Player.moveTo) orderWalk(a.npc.mesh.position); }
      else {
        Player.moveTo=null; Player.path=[];
        a.t+=dt;
        if(a.t>=1.4){
          const data=PICKPOCKETS[a.npc.typeId];
          const lvl=Player.lvl('Thieving');
          const failP=Math.max(0.05, data.fail - (lvl-data.req)*0.01);
          if(Math.random()<failP){
            Player.stunT=data.stun;
            Player.hp=Math.max(1, Player.hp-1);
            UI.floatDmg(player, 1);
            UI.chat('You fumble — and catch a sharp elbow for your trouble.','combat');
            Sfx.takeHit();
          } else {
            const c=data.coins[0]+Math.floor(Math.random()*(data.coins[1]-data.coins[0]+1));
            Player.addItem('coins', c);
            Player.addXp('Thieving', data.xp);
            UI.chat(`You pick the ${data.name}'s pocket.`,'xp');
            Sfx.coin();
          }
          Player.action=null;
        }
      }
    }
    else if(a.type==='stealstall'){
      if(player.position.distanceTo(a.obj.position)>2.2){ if(!Player.moveTo) orderWalk(a.obj.position); }
      else {
        Player.moveTo=null; Player.path=[];
        const u=a.obj.userData;
        if(u.restock>0){ UI.chat('The stall has nothing worth taking yet.','plain'); Player.action=null; }
        else {
          a.t+=dt;
          if(a.t>=1.3){
            const data=STALL_KINDS[u.stall];
            for(const [id,q] of data.loot) Player.addItem(id,q);
            Player.addXp('Thieving', data.xp);
            u.restock=data.respawn;
            UI.chat('You swipe goods from the '+data.label.toLowerCase()+'.','xp');
            Sfx.coin(); UI.refreshInv();
            Player.action=null;
          }
        }
      }
    }
    else if(a.type==='cavetravel'){
      if(player.position.distanceTo(a.obj.position)>2.4){ orderWalk(a.obj.position); }
      else {
        Player.action=null;
        const dest = a.obj.userData.target==='undercrag'
          ? [ZONES.undercrag.pos[0], ZONES.undercrag.pos[1]+13]
          : [54.5,-71.2];
        player.position.set(dest[0], gy(dest[0],dest[1]), dest[1]);
        Player.moveTo=null; Player.target=null;
        Sfx.click();
        UI.chat(a.obj.userData.target==='undercrag'
          ? 'You climb down into the dark. Something below stops breathing to listen.'
          : 'You haul yourself back into the daylight of Whitmoor Hold.','sys');
      }
    }
    else if(a.type==='usebank'){
      if(player.position.distanceTo(a.obj.position)>2.6){ orderWalk(a.obj.position); }
      else { Player.action=null; UI.openBank(); }
    }
    else if(a.type==='teleport'){
      a.t+=dt;
      player.rotation.y += dt*9;   // the rite spins the caster
      if(a.t>=2.2){
        const zk=a.dest||'commons', p=ZONES[zk].pos;
        player.position.set(p[0]+2, gy(p[0]+2, p[1]+2), p[1]+2);
        player.rotation.y=0;
        Player.teleCd=a.cd||60;
        Player.action=null;
        Sfx.magicCast();
        UI.chat(`The world folds, and ${ZONES[zk].name} rises to meet you.`,'sys');
      }
    }
    else if(a.type==='bury'){
      a.t+=dt;
      const k=Math.min(1, a.t/1.2);
      // bow forward, hold a beat, rise — the old rite
      const bow = k<0.4 ? k/0.4 : k>0.75 ? (1-k)/0.25 : 1;
      player.rotation.x = bow*0.62;
      if(k>=1){
        player.rotation.x=0;
        const s=Player.inv[a.slot];
        if(s && ITEMS[s.id] && ITEMS[s.id].bury){
          const xp = ITEMS[s.id].big ? 12 : 5;
          Player.inv[a.slot]=null;
          Player.addXp('Prayer', xp);
          UI.chat('You dig a small hole and bury the bones.','xp');
          Sfx.click();
          UI.refreshInv();
        }
        Player.action=null;
      }
    }
    else if(a.type==='pray'){
      if(player.position.distanceTo(a.obj.position)>2.5){ orderWalk(a.obj.position); }
      else {
        a.t+=dt;
        const k=Math.min(1, a.t/1.4);
        const bow = k<0.35 ? k/0.35 : k>0.8 ? (1-k)/0.2 : 1;
        player.rotation.x = bow*0.62;
        if(k>=1){
          player.rotation.x=0;
          if(Player.prayerPts < Player.maxPrayer()){
            Player.prayerPts = Player.maxPrayer();
            UI.chat('You pray to the Dawn. Your prayer points are restored.','plain');
          } else UI.chat('You feel at peace.','plain');
          UI.refreshHud(); if(UI.refreshPrayers) UI.refreshPrayers();
          Player.action=null;
        }
      }
    }
    else if(a.type==='offer'){
      if(player.position.distanceTo(a.obj.position)>2.5){ orderWalk(a.obj.position); }
      else {
        const hasBig=Player.count('big_bones')>0, hasSmall=Player.count('bones')>0;
        if(!hasBig && !hasSmall){ UI.chat('You have no bones to offer.','plain'); Player.action=null; return; }
        a.t+=dt;
        if(a.t>=1.2){
          a.t=0;
          const big=Player.count('big_bones')>0;
          Player.removeItem(big?'big_bones':'bones',1);
          Player.addXp('Prayer', big?36:15);   // thrice a graveside burial — the Dawn is generous
          UI.chat('You lay the bones upon the altar. The candles flare.','plain');
          if(Player.count('bones')<1 && Player.count('big_bones')<1) Player.action=null;
        }
      }
    }
    else if(a.type==='cook'){
      if(player.position.distanceTo(a.obj.position)>2.4){ orderWalk(a.obj.position); }
      else {
        if(Player.count('raw_perch')<1){ UI.chat('You have nothing raw to cook.','plain'); Player.action=null; return; }
        a.t+=dt;
        if(a.t>=2){
          a.t=0;
          // never destroy a fish the pack can't hold — check space before the raw leaves the slot
          if(!Player.hasSpace || Player.hasSpace()){
            Player.removeItem('raw_perch',1);
            const rangeBonus = a.obj.userData.range ? 0.08 : 0;   // a proper range burns less than a campfire
            if(Math.random()<Math.min(0.97, 0.6+rangeBonus+Player.lvl('Cooking')*0.02)){
              Player.addItem('cooked_perch',1); Player.addXp('Cooking',32);
              UI.chat('You roast a mirrorperch.','plain');
              Tutorial.notify('cook','cooked_perch');
            } else {
              Player.addItem('burnt_perch',1);
              UI.chat('You accidentally burn the fish.','plain');
            }
          } else { UI.chat('Your pack is too full to cook anything.','plain'); Player.action=null; return; }
          if(Player.count('raw_perch')<1) Player.action=null;
        }
      }
    }
  }
  }   // ── end fixed-tick player-sim loop ──

  WORLD.npcs.forEach(n=>{
    if(n.dead){
      if(n.dying){                                  // play the death topple, then hide the corpse
        if(typeof tickDeath!=='function' || !tickDeath(n.mesh, dt)){ n.dying=false; n.mesh.visible=false; }
      }
      n.respawnT-=dt;
      if(n.respawnT<=0){ n.dead=false; n.dying=false; n.hp=n.t.hp; n.mesh.visible=true;
        n.mesh.rotation.set(0,0,0);                 // undo the topple
        if(n.mesh.userData._baseScale!==undefined) n.mesh.scale.setScalar(n.mesh.userData._baseScale);
        n.mesh.position.set(n.home.x, gy(n.home.x,n.home.z), n.home.z);
        n.hpbar.spr.visible=false;
        WORLD.clickables.push(n.mesh); n.target=null; }
      return;
    }
    if(n.t.script && !n.exhibit && typeof BOSS_SCRIPTS!=='undefined' && BOSS_SCRIPTS[n.t.script]) BOSS_SCRIPTS[n.t.script](n, dt);
    const distP = n.mesh.position.distanceTo(player.position);
    // OSRS aggression: monsters ignore players above twice their level,
    // and grow tolerant after ~10 minutes near them — except the Scarlands,
    // whose horrors (like the Wilderness) never relent.
    let wantsAggro = n.t.aggro && distP < 7 && !n.exhibit;   // penned exhibits never chase
    if(wantsAggro && n.target!=='player'){
      const fearless = n.t.alwaysAggro || curZone==='scarlands';
      if(!fearless){
        if(Player.combatLevel() > n.t.level*2) wantsAggro=false;
        else {
          n.aggroT = (n.aggroT||0) + dt;
          if(n.aggroT > 600) wantsAggro=false;   // tolerant after 10 minutes
        }
        // single-combat (OSRS): if the player is already fighting, others hold back.
        // Only the Scarlands is multi-combat, like the Wilderness.
        if(wantsAggro){
          const busy = (Player.target && !Player.target.dead && Player.target!==n) ||
            WORLD.npcs.some(o=>o!==n && !o.dead && o.target==='player');
          if(busy) wantsAggro=false;
        }
      }
    }
    if(distP > 26) n.aggroT = 0;   // leaving the area resets tolerance
    if(n.target==='player' || wantsAggro){
      n.target='player';
      // OSRS leash: monsters won't be dragged far from their patch — they give up and head home
      if(distP>16 || n.mesh.position.distanceTo(n.home)>14){ n.target=null; n.returning=true; }
      else npcAttack(n, dt);
    } else if(n.returning){
      const dh=n.home.clone().sub(n.mesh.position); dh.y=0;
      if(dh.length()<1.2){ n.returning=false; }
      else {
        const st=dh.normalize().multiplyScalar(2.6*dt);
        const slid=slideMove(n.mesh.position.x,n.mesh.position.z,
          n.mesh.position.x+st.x,n.mesh.position.z+st.z,0.2);
        if(slid){ const y=groundY(slid[0],slid[1]);
          if(y!==null){ n.mesh.position.set(slid[0],y,slid[1]); n.moving=true;
            n.mesh.lookAt(n.home.x,y,n.home.z); } }
        else n.returning=false;
      }
    } else if(!n.penStatic) {                     // penStatic exhibits idle in place (no pacing)
      n.wanderT-=dt;
      if(n.wanderT<=0){ n.wanderT=3+Math.random()*4;
        n.wDir = new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize(); }
      if(n.wDir){
        if(n.mesh.position.distanceTo(n.home)>=10)
          n.wDir = n.home.clone().sub(n.mesh.position).setY(0).normalize();
        const nx=n.mesh.position.x+n.wDir.x*dt*0.7, nz=n.mesh.position.z+n.wDir.z*dt*0.7;
        if(collides(nx,nz,0.2)){ n.wanderT=0.1; }
        else { const y=groundY(nx,nz);
          if(y!==null && y>-1){ n.mesh.position.set(nx,y,nz); n.moving=true;
            n.mesh.lookAt(nx+n.wDir.x, y, nz+n.wDir.z); } }
      }
    }
    const _P=n.mesh.userData.parts;
    n.mesh.userData.inCombat = (n.target==='player' && !n.dead);   // raise a combat stance while engaged
    if(_P && _P.legL) walkAnim(n.mesh, n.moving, dt);   // any rigged biped
    else beastAnim(n.mesh, n.moving, dt);
    if(n.t.glb && typeof glbCreatureAnim==='function') glbCreatureAnim(n, dt);   // GLB-body life (breathing/huff)
    if(n.t.skinnedRig && typeof riggedDragonAnim==='function') riggedDragonAnim(n, dt, n.moving);   // bone drive: legs/wings/tail
    n.moving = false;
  });

  Bots.update(dt);
  if(typeof updateRoofs==='function') updateRoofs();

  WORLD.resources.forEach(r=>{
    const u=r.userData;
    if(!u.alive){ u.respawnT-=dt;
      if(u.respawnT<=0){ u.alive=true; r.visible=true;
        r.children.forEach(ch=>ch.visible=true); } }
    if(u.rtype==='fish' && u.alive){ u.bob+=dt*2; r.scale.setScalar(1+Math.sin(u.bob)*0.15); }
  });
  if(WORLD.fires) WORLD.fires.forEach(f=>{
    if(f.userData.flame) f.userData.flame.scale.y = 1+Math.sin(performance.now()*0.02)*0.25; });

  updateProjectiles(dt);
  if(typeof updateDragonFX==='function') updateDragonFX(dt);   // dragonfire / smoke particles
  animateWater(dt);
  separateEntities();
  updateSparring(dt);
  // doors open for the determined walker, as they always did
  if(WORLD.doors && (Player.moveTo || (Player.path && Player.path.length))){
    for(const dr of WORLD.doors){
      const u=dr.userData;
      if(!u.open && Math.hypot(player.position.x-u.col.x, player.position.z-u.col.z)<1.8) toggleDoor(dr);
    }
  }
  // windmill sails turn with patient purpose
  if(WORLD.windmills) for(const h of WORLD.windmills) h.rotation.z += dt*0.55;
  // butterflies stitch the meadow air
  if(WORLD.butterflies) for(const b of WORLD.butterflies){
    const u=b.userData; u.t+=dt;
    b.position.x = u.cx + Math.sin(u.t*0.7)*2.2 + Math.sin(u.t*1.9)*0.5;
    b.position.z = u.cz + Math.cos(u.t*0.5)*2.2;
    b.position.y = (groundY(b.position.x,b.position.z)||0) + 1.1 + Math.sin(u.t*2.3)*0.25;
    const flap=Math.abs(Math.sin(u.t*9));
    b.children.forEach(w=>{ w.rotation.y = w.userData.side*(0.3+flap*1.0); });
  }
  // chimney smoke climbs and thins
  if(WORLD.smokes){
    WORLD._smokeT=(WORLD._smokeT||0)+dt;
    for(const p of WORLD.smokes){
      const k=((WORLD._smokeT*0.22)+p.userData.phase)%1;
      p.position.y = p.userData.baseY + k*2.6;
      p.material.opacity = 0.5*(1-k);
      const s=0.6+k*1.1; p.scale.setScalar(s);
    }
  }
  // stalls restock; player-lit fires burn down
  if(WORLD.stalls) for(const st of WORLD.stalls){ if(st.userData.restock>0) st.userData.restock-=dt; }
  // shops drift their stock back toward the default quantity over time (OSRS restock)
  WORLD._shopT=(WORLD._shopT||0)+dt;
  if(WORLD._shopT>=20){ WORLD._shopT=0;
    for(const k in SHOPS){ const sh=SHOPS[k]; if(!sh._q) continue;
      for(const id in sh._q){ if(sh._q[id]<10) sh._q[id]++; else if(sh._q[id]>10) sh._q[id]--; } }
  }
  for(let i=WORLD.fires.length-1;i>=0;i--){
    const f=WORLD.fires[i];
    if(f.userData && f.userData.ttl!==undefined){
      f.userData.ttl-=dt;
      if(f.userData.ttl<=0){
        scene.remove(f);
        const ci=WORLD.clickables.indexOf(f); if(ci>=0) WORLD.clickables.splice(ci,1);
        WORLD.fires.splice(i,1);
        continue;
      }
    }
  }
  // dropped items age out (OSRS owner→public→despawn). Single-player: always visible to you;
  // the owner/publicAt fields are stored ready for the MMO. ~3 min lifetime, blinking near the end.
  if(WORLD.drops) for(let i=WORLD.drops.length-1;i>=0;i--){
    const dm=WORLD.drops[i], u=dm.userData;
    if(!u || u.age===undefined) continue;
    u.age+=dt;
    dm.visible = (u.life-u.age < 12) ? (Math.floor(u.age*4)%2===0) : true;
    if(u.age>=u.life){
      scene.remove(dm);
      const ci=WORLD.clickables.indexOf(dm); if(ci>=0) WORLD.clickables.splice(ci,1);
      WORLD.drops.splice(i,1);
    }
  }
  // roofs lift away while you stand inside
  for(const it of WORLD.interiors){
    const inside = Math.abs(player.position.x-it.x)<it.hw && Math.abs(player.position.z-it.z)<it.hd;
    if(it.roof.visible===inside){ it.roof.visible=!inside; if(it.band) it.band.visible=!inside; }
  }
  _runUiT=(_runUiT||0)+dt; if(_runUiT>0.5){ _runUiT=0; UI.refreshRun();
    if(Player.activePrayers.size){ UI.refreshHud(); const pane=document.getElementById('pane-prayers');
      if(pane && pane.classList.contains('active') && UI.refreshPrayers) UI.refreshPrayers(); } }
  SaveGame.tick(dt);
  if(typeof AnimShowcase!=='undefined' && AnimShowcase.active) AnimShowcase.tick(dt);
  if(typeof Controls!=='undefined' && Controls.update) Controls.update(dt);   // arrow camera + chat bubble
  if(typeof CharCreator!=='undefined' && CharCreator.active) CharCreator.tick(dt);   // design-panel turntable

  const z = zoneAt(player.position.x, player.position.z);
  if(z!==curZone){
    curZone=z; UI.zone(ZONES[z].name);
    UI.chat(`Now entering: ${ZONES[z].name}.`,'sys');
    Music.onZone(z);
    if(z==='scarlands') UI.chat('The Scarlands are lawless. The deeper you wander, the deadlier the threat.','combat');
  }
  if(curZone==='scarlands'){
    const t=scarThreat(player.position.z);
    UI.zone(`The Scarlands — Threat ${Math.max(1,t)}`);
  }
  const targetFog = new THREE.Color(ZONES[curZone].fog);
  scene.fog.color.lerp(targetFog, dt*1.5);
  scene.background.lerp(targetFog, dt*1.5);

  const cx = player.position.x + camCtl.dist*Math.sin(camCtl.yaw)*Math.cos(camCtl.pitch*0.6);
  const cz = player.position.z + camCtl.dist*Math.cos(camCtl.yaw)*Math.cos(camCtl.pitch*0.6);
  const cy = player.position.y + camCtl.dist*Math.sin(camCtl.pitch);
  camera.position.lerp(new THREE.Vector3(cx,cy,cz), 0.15);
  camera.lookAt(player.position.x, player.position.y+1.2, player.position.z);
}

let running=false;
function animate(){
  requestAnimationFrame(animate);
  if(!running) return;
  const dt=Math.min(0.05, clock.getDelta());
  update(dt);
  drawMinimap();
  renderer.render(scene, camera);
}

/* ================= LOADING SEQUENCE ================= */
function setLoad(pct, msg){
  document.getElementById('loading-bar').style.width=pct+'%';
  document.getElementById('loading-step').textContent=msg;
}
const BOOT_STEPS = [
  [10, 'Connecting to update server', ()=>{ initEngine(); }],
  [25, 'Loading textures',            ()=>{ for(const id in ITEMS) iconFor(id); }],
  [45, 'Generating world map',        ()=>{ buildTextures(); buildSea(); buildGround(); }],
  [65, 'Populating Veyhollow',        ()=>{ populateMainland(); if(typeof buildVeyhollowKeep==='function') buildVeyhollowKeep(); }],
  [80, 'Preparing Tutor\'s Holm',     ()=>{ populateBrynholt(); populateDunes(); populateScarlands(); populateArena(); populateHolm(); if(typeof buildMenagerie==='function') buildMenagerie(); Bots.spawn(); }],
  [95, 'Waking the adventurer',       ()=>{
      player = humanoid(CharCfg.shirt, {skin:CharCfg.skin, gender:CharCfg.gender, hair:CharCfg.hair,
        hairStyle:CharCfg.hairStyle, beard:CharCfg.beard, legs:CharCfg.legs, emblem:true});
      const h=ZONES.holm.pos;
      player.position.set(h[0], gy(h[0],h[1]), h[1]);
      player.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
      scene.add(player);
      Player.init();
      refreshPlayerGear();
      fillAdminSelects();
      UI.refreshInv(); UI.refreshSkills(); UI.refreshQuests(); UI.refreshEquip(); UI.refreshHud(); UI.refreshDrops('');
      if(SaveGame.exists()){
        const note=document.getElementById('login-note');
        if(note) note.textContent='A saved adventurer was found on this device.';
      }
  }],
  [100,'Done loading',                ()=>{}],
];
function boot(i=0){
  if(i>=BOOT_STEPS.length){
    setTimeout(()=>{
      document.getElementById('loading-screen').style.display='none';
      document.getElementById('welcome-screen').style.display='flex';
    }, 350);
    return;
  }
  const [pct,msg,fn]=BOOT_STEPS[i];
  setLoad(pct,msg);
  setTimeout(()=>{ fn(); boot(i+1); }, 220);
}
document.getElementById('play-btn').onclick = ()=>{
  // music is opt-in: only resume if the player turned it on before (keeps debug loads silent)
  try{ Sfx.ensure(); if(localStorage.getItem('cr_music_on')==='1') Music.start(); }catch(e){}
  document.getElementById('welcome-screen').style.display='none';
  running=true;
  UI.zone(ZONES.holm.name);
  Tutorial.banner();
  UI.chat('Welcome to Crafted Realm.','sys');
  UI.chat('You wash ashore on Tutor\'s Holm. Talk to Guide Bram by the rowboat.','plain');
  UI.chat('Press ` (backquote) at any time for the Administrator Console.','sys');
  // a NEW adventurer designs their look right here on the Holm (or keeps the default)
  if(CharCfg._new){ CharCfg._new=false;
    setTimeout(()=>{ if(typeof CharCreator!=='undefined') CharCreator.open(); }, 500); }
};
boot();
animate();

