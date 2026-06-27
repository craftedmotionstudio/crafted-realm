/* ================= GAME LOOP ================= */
let curZone='holm';
let _runUiT=0;

/* ---------- pathfinding: BFS on a local grid, the old way ---------- */
function computePath(sx, sz, tx, tz){
  const RES=0.6, MARGIN=5;
  let x0=Math.min(sx,tx)-MARGIN, x1=Math.max(sx,tx)+MARGIN;
  let z0=Math.min(sz,tz)-MARGIN, z1=Math.max(sz,tz)+MARGIN;
  // clamp very long hauls: path to the grid edge, the follower re-paths on arrival
  const MAXSPAN=90;   // one window spans the marsh and its causeway — BFS solves it globally
  if(x1-x0>MAXSPAN){ if(tx>sx){ x1=sx+MAXSPAN; } else { x0=sx-MAXSPAN; } }
  if(z1-z0>MAXSPAN){ if(tz>sz){ z1=sz+MAXSPAN; } else { z0=sz-MAXSPAN; } }
  const nx=Math.ceil((x1-x0)/RES), nz=Math.ceil((z1-z0)/RES);
  const idx=(i,j)=>i*(nz+1)+j;
  const blocked=new Uint8Array((nx+1)*(nz+1));
  const tgtRoom = WORLD.interiors.find(it=>Math.abs(tx-it.x)<it.hw+0.6 && Math.abs(tz-it.z)<it.hd+0.6) || null;
  const startRoom = WORLD.interiors.find(it=>Math.abs(sx-it.x)<it.hw+0.3 && Math.abs(sz-it.z)<it.hd+0.3) || null;
  for(let i=0;i<=nx;i++) for(let j=0;j<=nz;j++){
    const cx=x0+i*RES, cz=z0+j*RES;
    let b = collides(cx,cz,0.45,true);   // plan with clearance; closed doors don't block plans
    if(!b){ const y=groundY(cx,cz); if(y===null || y<-1.2) b=true; }
    if(!b){
      const room=WORLD.interiors.find(it=>Math.abs(cx-it.x)<it.hw && Math.abs(cz-it.z)<it.hd);
      if(room && room!==tgtRoom && room!==startRoom) b=true;   // strangers' rooms are not corridors — but you may leave your own
    }
    blocked[idx(i,j)]=b?1:0;
  }
  const ci=(v,lo,res)=>Math.max(0,Math.round((v-lo)/res));
  let si=Math.min(nx,ci(sx,x0,RES)), sj=Math.min(nz,ci(sz,z0,RES));
  let ti=Math.min(nx,ci(tx,x0,RES)), tj=Math.min(nz,ci(tz,z0,RES));
  // free the start cell if we're brushing a wall
  if(blocked[idx(si,sj)]){
    outer: for(let r=1;r<9;r++) for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++){
      if(Math.max(Math.abs(a),Math.abs(b))!==r) continue;   // ring search, nearest first
      const ii=si+a, jj=sj+b;
      if(ii>=0&&jj>=0&&ii<=nx&&jj<=nz&&!blocked[idx(ii,jj)]){ si=ii; sj=jj; break outer; }
    }
  }
  const prev=new Int32Array((nx+1)*(nz+1)).fill(-1);
  const seen=new Uint8Array((nx+1)*(nz+1));
  let q=[idx(si,sj)]; seen[idx(si,sj)]=1;
  let bestCell=idx(si,sj), bestD=Math.hypot(si-ti, sj-tj);
  let found=false;
  while(q.length && !found){
    const next=[];
    for(const c of q){
      const i=Math.floor(c/(nz+1)), j=c%(nz+1);
      if(i===ti && j===tj){ found=true; bestCell=c; break; }
      const d=Math.hypot(i-ti, j-tj);
      if(d<bestD){ bestD=d; bestCell=c; }
      for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const ii=i+di, jj=j+dj;
        if(ii<0||jj<0||ii>nx||jj>nz) continue;
        const cc=idx(ii,jj);
        if(seen[cc]||blocked[cc]) continue;
        if(di&&dj && (blocked[idx(i+di,j)]||blocked[idx(i,j+dj)])) continue;   // no corner cutting
        seen[cc]=1; prev[cc]=c; next.push(cc);
      }
    }
    q=next;
  }
  // walk back from the goal (or the closest approach, like a true click)
  const cells=[];
  let c=bestCell;
  while(c>=0){ cells.push(c); c=prev[c]; }
  cells.reverse();
  let pts=cells.map(cc=>{
    const i=Math.floor(cc/(nz+1)), j=cc%(nz+1);
    return [x0+i*RES, z0+j*RES];
  });
  // string-pulling: drop waypoints we can see straight past
  const clear=(ax,az,bx,bz)=>{
    const L=Math.hypot(bx-ax,bz-az), steps=Math.ceil(L/0.45);
    for(let s=1;s<steps;s++){
      const px=ax+(bx-ax)*s/steps, pz=az+(bz-az)*s/steps;
      if(collides(px,pz,0.45)) return false;
      const y=groundY(px,pz); if(y===null||y<-1.2) return false;
      const room=WORLD.interiors.find(it=>Math.abs(px-it.x)<it.hw && Math.abs(pz-it.z)<it.hd);
      if(room && room!==tgtRoom && room!==startRoom) return false;
    }
    return true;
  };
  const out=[];
  let a=0;
  while(a<pts.length-1){
    let b=pts.length-1;
    while(b>a+1 && !clear(pts[a][0],pts[a][1],pts[b][0],pts[b][1])) b--;
    out.push(pts[b]); a=b;
  }
  return {pts:out, reached:found};
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
  if(Player.stunT>0){ Player.moveTo=null; Player.path=[]; Player.target=null; if(Player.action&&Player.action.type==='pickpocket')Player.action=null; }
  if(Player.moveTo){
    Player._navAge=(Player._navAge||0)+dt;
    if(Player._navAge>20 && !(Player.path && Player.path.length)){
      const rem=Math.hypot(Player.moveTo.x-player.position.x, Player.moveTo.z-player.position.z);
      if(rem<12){ Player.moveTo=null; Player._navAge=0; Player._navTries=0; Player._navBest=1e9; Player._navStall=0; }
      else Player._navAge=10;   // long hauls get more rope, but never forever
    }
    // if we've stopped getting closer for a couple of seconds, sidestep around the wedge
    // (the pathfinder owns routing while a path is live — these heuristics only govern the last direct leg)
    if(Player.moveTo && !(Player.path && Player.path.length)){
    const trueD = Player.moveTo.clone().sub(player.position); trueD.y=0;
    // oscillation watchdog: pacing in a loop without net travel counts as stalled
    Player._oscT=(Player._oscT||0)+dt;
    if(Player._oscT>2.5){
      const op=Player._oscPos;
      const moved = op ? Math.hypot(player.position.x-op.x, player.position.z-op.z) : 99;
      Player._oscPos={x:player.position.x, z:player.position.z};
      Player._oscT=0;
      if(moved<1.0 && trueD.length()>2.5 && !Player._navDetour) Player._navStall=Math.max(Player._navStall||0, 2.3);
    }
    if(Player._navDetour){
      Player._navDetourT = (Player._navDetourT||0)+dt;
      const dd = Player._navDetour.clone().sub(player.position); dd.y=0;
      if(dd.length()<1.4 || Player._navDetourT>3){
        Player._navDetour = Player._navDetour2 || null;
        Player._navDetour2 = null;
        Player._navDetourT=0; Player._navBest=1e9; Player._navStall=0;
        if(!Player._navDetour) Player._navDetourT=0;
      }
    } else {
      if(trueD.length() < (Player._navBest||1e9)-0.35){ Player._navBest=trueD.length(); Player._navStall=0; }
      else Player._navStall=(Player._navStall||0)+dt;
      if(Player._navStall>2.2 && trueD.length()>2.5){
        // stalled inside a building with the goal outside? leave by the door first
        const room = WORLD.interiors.find(it=>
          Math.abs(player.position.x-it.x)<it.hw && Math.abs(player.position.z-it.z)<it.hd);
        if(room && Player.moveTo &&
           (Math.abs(Player.moveTo.x-room.x)>room.hw || Math.abs(Player.moveTo.z-room.z)>room.hd)){
          Player._navDetour=new THREE.Vector3(room.door.x, groundY(room.door.x,room.door.z)||0, room.door.z);
          // and after the door, swing wide around the corner nearest the goal
          let best=null, bd=1e9;
          for(const cx of [room.x-room.hw-1.4, room.x+room.hw+1.4])
            for(const cz of [room.z-room.hd-1.4, room.z+room.hd+1.4]){
              const dd=Math.hypot(Player.moveTo.x-cx, Player.moveTo.z-cz);
              if(dd<bd && !collides(cx,cz,0.3)){ bd=dd; best=[cx,cz]; }
            }
          Player._navDetour2 = best ? new THREE.Vector3(best[0], groundY(best[0],best[1])||0, best[1]) : null;
          Player._navDetourT=0; Player._navStall=0; Player._navBest=1e9;
          // fallthrough skipped — the door detour takes priority
        }
        else {
        Player._navTries=(Player._navTries||0)+1;
        if(Player._navTries>=6 && trueD.length()<9){
          // the spot is up against something — we've walked as close as the world allows (OSRS-style stop)
          Player.moveTo=null; Player._navDetour=null; Player._navTries=0; Player._navBest=1e9; Player._navStall=0;
        }
        else {
        const dir=trueD.clone().normalize();
        for(const a of [1.57,-1.57,2.2,-2.2,2.8,-2.8]){
          const ca=Math.cos(a), sa=Math.sin(a);
          const px=player.position.x+(dir.x*ca-dir.z*sa)*7, pz=player.position.z+(dir.x*sa+dir.z*ca)*7;
          const y=groundY(px,pz);
          if(y!==null && y>-1.2 && !collides(px,pz,0.3)){
            Player._navDetour=new THREE.Vector3(px,y,pz); Player._navDetourT=0; break;
          }
        }
        Player._navStall=0; Player._navBest=1e9;
        }
        }
      }
    }
    }
    if(!Player.moveTo){ walkAnim(player, false, dt); }
    else {
    // follow the computed path first; the raw click point is the last waypoint
    if(Player.path && Player.path.length &&
       Math.hypot(Player.path[0].x-player.position.x, Player.path[0].z-player.position.z)>25){
      Player.path=[];   // stale path from before a teleport — replan
      orderWalk(Player.moveTo);
    }
    if(Player.path && Player.path.length){
      const wp=Player.path[0];
      Player._wpT=(Player._wpT||0)+dt;
      const wpD=Math.hypot(wp.x-player.position.x, wp.z-player.position.z);
      if(Player._wpT>3 && wpD>0.6){ Player._wpT=0; orderWalk(Player.moveTo); }   // snagged: replan
      else if(wpD<0.5){ Player._wpT=0; }
      if(Math.hypot(wp.x-player.position.x, wp.z-player.position.z)<0.5){
        Player.path.shift();
        if(!Player.path.length && Player._pathPartial){
          // we reached the grid edge or closest approach — path again toward the goal
          const rem=Math.hypot(Player.moveTo.x-player.position.x, Player.moveTo.z-player.position.z);
          if(rem>1.4){
            const before=rem;
            const keepGoal=Player.moveTo;
            orderWalk(keepGoal);
            const gained = Player.path.length ? before - Math.hypot(
              Player.path[Player.path.length-1].x-keepGoal.x,
              Player.path[Player.path.length-1].z-keepGoal.z) : 0;
            if(Player._pathPartial && gained<0.01){
              if(rem<=8){ Player.path=[]; }   // close enough: finish with direct steering
              else { Player.path=[]; Player.moveTo=null; }   // truly unreachable — stop, OSRS-style
            }
          } else { Player.moveTo=null; }
        }
      }
    }
    if(!Player.moveTo){ walkAnim(player, false, dt); playerMovedThisFrame=false; }
    else {
    const navT = (Player.path && Player.path.length ? Player.path[0] : null) || Player._navDetour || Player.moveTo;
    const d = navT.clone().sub(player.position); d.y=0;
    if(d.length()<0.25){
      if(Player._navDetour) Player._navDetour=null;
      else { Player.moveTo=null; Player._navBest=1e9; Player._navStall=0; }
    }
    else {
      const step=d.normalize().multiplyScalar(Player.moveSpeed()*dt);
      // walls AND water both block; steer around either
      const inRoom=(px,pz,it,pad)=>Math.abs(px-it.x)<it.hw+(pad||0) && Math.abs(pz-it.z)<it.hd+(pad||0);
      const tryStep=(sx,sz)=>{
        const t=slideMove(player.position.x, player.position.z,
          player.position.x+sx, player.position.z+sz);
        if(!t) return null;
        const y=groundY(t[0],t[1]);
        if(y===null || y<-1.2) return null;
        // never wander into a building unless the destination is inside it (OSRS routes around)
        const tgt = Player._navDetour || Player.moveTo;
        if(tgt) for(const it of WORLD.interiors){
          if(inRoom(t[0],t[1],it) && !inRoom(player.position.x,player.position.z,it,0.3) && !inRoom(tgt.x,tgt.z,it,0.6))
            return null;
        }
        return [t[0],t[1],y];
      };
      let mv = tryStep(step.x, step.z);
      if(!mv){
        // rounding a corner: of all open sidesteps, take the one that makes real progress
        let best=null, bestScore=-1e9;
        for(const a of [0.7,-0.7,1.3,-1.3,1.9,-1.9,2.5,-2.5,3.1]){
          const ca=Math.cos(a), sa=Math.sin(a);
          const cand = tryStep(step.x*ca-step.z*sa, step.x*sa+step.z*ca);
          if(!cand) continue;
          const remain = Math.hypot(navT.x-cand[0], navT.z-cand[1]);
          const score = -remain - Math.abs(a)*0.12;   // progress first, gentle turns as tiebreak
          if(score>bestScore){ bestScore=score; best=cand; }
        }
        mv=best;
      }
      if(!mv){
        Player._blocked=(Player._blocked||0)+1;
        if(Player._blocked===8){
          // wedged in geometry — squeeze out toward any open ground nearby
          for(let r=0.5; r<=1.6 && !mv; r+=0.55){
            for(let k=0;k<8;k++){
              const a=k*Math.PI/4;
              const ex=player.position.x+Math.cos(a)*r, ez=player.position.z+Math.sin(a)*r;
              const y=groundY(ex,ez);
              if(y!==null && y>-1.2 && !collides(ex,ez,0.3)){ mv=[ex,ez,y]; break; }
            }
          }
          if(mv) Player._blocked=0;
        }
        if(!mv && Player._blocked>20){ Player._blocked=0; Player.moveTo=null; UI.chat('You cannot find a way through.','plain'); }
      }
      else {
        Player._blocked=0;
        player.position.set(mv[0],mv[2],mv[1]);
        player.lookAt(mv[0]+step.x, mv[2], mv[1]+step.z);
        walkAnim(player, true, dt, Player.moveSpeed()/4.2);
        playerMovedThisFrame = true;
      }
    }
    }
    }
  } else {
    walkAnim(player, false, dt);
  }
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
        const p=ZONES.commons.pos;
        player.position.set(p[0]+2, gy(p[0]+2, p[1]+2), p[1]+2);
        player.rotation.y=0;
        Player.teleCd=60;
        Player.action=null;
        Sfx.magicCast();
        UI.chat('The world folds, and Veyhollow rises to meet you.','sys');
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

  WORLD.npcs.forEach(n=>{
    if(n.dead){
      n.respawnT-=dt;
      if(n.respawnT<=0){ n.dead=false; n.hp=n.t.hp; n.mesh.visible=true;
        n.mesh.position.set(n.home.x, gy(n.home.x,n.home.z), n.home.z);
        n.hpbar.spr.visible=false;
        WORLD.clickables.push(n.mesh); n.target=null; }
      return;
    }
    const distP = n.mesh.position.distanceTo(player.position);
    // OSRS aggression: monsters ignore players above twice their level,
    // and grow tolerant after ~10 minutes near them — except the Scarlands,
    // whose horrors (like the Wilderness) never relent.
    let wantsAggro = n.t.aggro && distP < 7;
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
    } else {
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
    if(n.t.humanoid || n.t.model==='goblin') walkAnim(n.mesh, n.moving, dt);
    else beastAnim(n.mesh, n.moving, dt);
    n.moving = false;
  });

  Bots.update(dt);

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
  // roofs lift away while you stand inside
  for(const it of WORLD.interiors){
    const inside = Math.abs(player.position.x-it.x)<it.hw && Math.abs(player.position.z-it.z)<it.hd;
    if(it.roof.visible===inside){ it.roof.visible=!inside; if(it.band) it.band.visible=!inside; }
  }
  _runUiT=(_runUiT||0)+dt; if(_runUiT>0.5){ _runUiT=0; UI.refreshRun();
    if(Player.activePrayers.size){ UI.refreshHud(); const pane=document.getElementById('pane-prayers');
      if(pane && pane.classList.contains('active') && UI.refreshPrayers) UI.refreshPrayers(); } }
  SaveGame.tick(dt);

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
  [65, 'Populating Veyhollow',        ()=>{ populateMainland(); }],
  [80, 'Preparing Tutor\'s Holm',     ()=>{ populateBrynholt(); populateDunes(); populateScarlands(); populateArena(); populateHolm(); Bots.spawn(); }],
  [95, 'Waking the adventurer',       ()=>{
      player = humanoid(CharCfg.shirt, {skin:CharCfg.skin, beard:false, emblem:true});
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
  try{ Music.start(); }catch(e){}
  Sfx.ensure(); Sfx.quest();
  document.getElementById('welcome-screen').style.display='none';
  running=true;
  UI.zone(ZONES.holm.name);
  Tutorial.banner();
  UI.chat('Welcome to Crafted Realm.','sys');
  UI.chat('You wash ashore on Tutor\'s Holm. Talk to Guide Bram by the rowboat.','plain');
  UI.chat('Press ` (backquote) at any time for the Administrator Console.','sys');
};
boot();
animate();

