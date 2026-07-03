/* ================= UI: MAP RENDERING =================
   World-map + minimap canvas rendering. Extracted verbatim from
   game4_ui.js (pure move, zero behaviour change). Loads after
   game4_ui.js (which owns UI.openWorldMap / minimapWalkTo) and before
   its consumers (qol_ui.js, map_search.js, game5_main.js). */
/* ---------- minimap ---------- */
const WMAP = {x0:-206, z0:-142, x1:274, z1:178};   // the charted world = the baked map
function drawWorldMap(){
  const c=document.getElementById('worldmap'); if(!c) return;
  const ctx=c.getContext('2d');
  const S=c.width, sx=S/(WMAP.x1-WMAP.x0), sz=S/(WMAP.z1-WMAP.z0);
  const mx=(x,z)=>({x:(x-WMAP.x0)*sx, y:(z-WMAP.z0)*sz});
  // terrain, sampled honestly from the biome grid + heightfield
  const BCOL={water:'#2c4a66', grass:'#4d6b35', autumn:'#a06a28', swamp:'#453655',
    desert:'#c2a862', snow:'#dbe0de', scar:'#54453a', rock:'#8a8276'};
  const step=2.2;
  for(let wx=WMAP.x0; wx<WMAP.x1; wx+=step){
    for(let wz=WMAP.z0; wz<WMAP.z1; wz+=step){
      const cxw=wx+step/2, czw=wz+step/2;
      const y=(typeof groundY==='function')?groundY(cxw,czw):0;
      const b=(typeof gridBiome==='function')?gridBiome(cxw,czw):'grass';
      let col;
      if(y===null) col='#2c4a66';
      else if(typeof DITCH!=='undefined' && y<-1.15 && Math.abs(czw-DITCH.z)<DITCH.half+2) col='#2e261e';  // the Ditch
      else if(y<-1.15) col='#2c4a66';
      else if(y<-0.75) col='#c9b98a';                     // shoreline sand
      else col=BCOL[b]||'#4d6b35';
      ctx.fillStyle=col;
      const p=mx(wx,wz);
      ctx.fillRect(p.x, p.y, step*sx+1, step*sz+1);
    }
  }
  // roads
  ctx.strokeStyle='#c4b696'; ctx.lineWidth=2.4; ctx.lineJoin='round';
  for(const seg of PATHS){
    ctx.beginPath();
    seg.forEach(([ax,az],i)=>{ const p=mx(ax,az); i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); });
    ctx.stroke();
  }
  // buildings: every roofed room, drawn as the surveyor sees it
  ctx.fillStyle='#8a6a44'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=0.8;
  for(const it of WORLD.interiors){
    const p=mx(it.x-it.hw, it.z-it.hd);
    ctx.fillRect(p.x, p.y, it.hw*2*sx, it.hd*2*sz);
    ctx.strokeRect(p.x, p.y, it.hw*2*sx, it.hd*2*sz);
  }
  // Whitmoor's walls
  ctx.strokeStyle='#d8d2c4'; ctx.lineWidth=2.2;
  const wA=mx(-175,-119), wB=mx(-151,-91);
  ctx.strokeRect(wA.x, wA.y, wB.x-wA.x, wB.y-wA.y);
  // place names, the cartographer's hand
  ctx.font='bold 12px Verdana'; ctx.textAlign='center';
  const label=(x,z,t)=>{ const p=mx(x,z);
    ctx.fillStyle='#1a1208'; ctx.fillText(t,p.x+1,p.y+1);
    ctx.fillStyle='#ffe9b0'; ctx.fillText(t,p.x,p.y); };
  label(0,-22,'Veyhollow');
  for(const k in ZONES){ const zn=ZONES[k];
    if(zn.name && k!=='town') label(zn.pos[0], zn.pos[1]-3, zn.name); }
  // you are here: a white arrow that knows your facing
  const pp=mx(player.position.x, player.position.z);
  const fa=player.rotation.y;
  ctx.save(); ctx.translate(pp.x,pp.y); ctx.rotate(-fa);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(4.4,5); ctx.lineTo(0,2.4); ctx.lineTo(-4.4,5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawMinimap(){
  const c=document.getElementById('minimap'), ctx=c.getContext('2d');
  const W=144, R=70;
  const yaw = (typeof camCtl!=='undefined' && camCtl) ? camCtl.yaw : 0;
  ctx.clearRect(0,0,W,W);
  ctx.save();
  ctx.beginPath(); ctx.arc(W/2,W/2,R,0,7); ctx.clip();
  ctx.fillStyle='#2c4a66'; ctx.fillRect(0,0,W,W); // sea
  // the old-school trick: the world turns, you do not
  ctx.translate(W/2,W/2); ctx.rotate(yaw);
  const scale=1.35, px=player.position.x, pz=player.position.z;
  const mx=(x,z)=>({x:(x-px)*scale, y:(z-pz)*scale});
  const land=(cx,cz,half,col)=>{ const p=mx(cx,cz);
    ctx.fillStyle=col; ctx.fillRect(p.x-half*scale,p.y-half*scale,half*2*scale,half*2*scale); };
  // the charted landmass = the whole baked map rect
  (function(){ const g=(typeof WORLDGRID!=='undefined')?WORLDGRID:{x0:-206,z0:-142,w:480,h:320};
    const p=mx(g.x0+g.w/2, g.z0+g.h/2);
    ctx.fillStyle='#4d6b35';
    ctx.fillRect(p.x-g.w/2*scale, p.y-g.h/2*scale, g.w*scale, g.h*scale); })();
  // the Wilderness Ditch, a dark cut across the north
  if(typeof DITCH!=='undefined'){
    const p=mx(34, DITCH.z);
    ctx.fillStyle='#3a3028'; ctx.fillRect(p.x-240*scale, p.y-DITCH.half*scale, 480*scale, DITCH.half*2*scale);
  }
  for(const k in ZONES){ const p=mx(ZONES[k].pos[0],ZONES[k].pos[1]);
    ctx.fillStyle = k==='gloomfen'?'rgba(60,48,84,.55)': k==='quarry'?'rgba(150,140,115,.5)':
      k==='pond'?'rgba(90,160,190,.5)':'rgba(120,170,85,.35)';
    ctx.beginPath(); ctx.arc(p.x,p.y,30,0,7); ctx.fill(); }
  // roads, faint and honest
  ctx.strokeStyle='rgba(196,182,150,0.55)'; ctx.lineWidth=2.2;
  for(const seg of PATHS){
    ctx.beginPath();
    seg.forEach(([sx,sz],i)=>{ const p=mx(sx,sz); i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); });
    ctx.stroke();
  }
  WORLD.resources.forEach(r=>{ if(!r.userData.alive) return; const p=mx(r.position.x,r.position.z);
    ctx.fillStyle = r.userData.rtype==='tree'?'#1f5414': r.userData.rtype==='rock'?'#c4b89f':'#bfe8ff';
    ctx.fillRect(p.x-1.5,p.y-1.5,3,3); });
  // OSRS dot law: yellow for folk, red for spoils on the ground
  WORLD.npcs.forEach(n=>{ if(n.dead) return; const p=mx(n.mesh.position.x,n.mesh.position.z);
    ctx.fillStyle = n.t.boss?'#ff4d4d':'#ffff00'; ctx.fillRect(p.x-2,p.y-2,4,4); });
  WORLD.clickables.forEach(o=>{ if(o.userData && o.userData.kind==='friendly'){
    const p=mx(o.position.x,o.position.z);
    ctx.fillStyle='#ffff00'; ctx.fillRect(p.x-2,p.y-2,4,4); } });
  WORLD.drops.forEach(d=>{ const p=mx(d.position.x,d.position.z);
    ctx.fillStyle='#ff3a2a'; ctx.fillRect(p.x-1.5,p.y-1.5,3,3); });
  // the red destination flag, planted where you clicked
  const dest = (Player.path && Player.path.length) ? Player.path[Player.path.length-1] : Player.moveTo;
  if(dest){
    const p=mx(dest.x,dest.z);
    ctx.strokeStyle='#d8d2c4'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x,p.y-8); ctx.stroke();
    ctx.fillStyle='#e03a2a';
    ctx.beginPath(); ctx.moveTo(p.x,p.y-8); ctx.lineTo(p.x+6,p.y-6); ctx.lineTo(p.x,p.y-4);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // you, dead centre, always
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(W/2,W/2,3.2,0,7); ctx.fill();
  // the compass: N rides the rim, honest to world north
  const na = yaw + Math.PI;   // world north (-z) in rotated screen space
  const nx = W/2 + Math.sin(na)*(R-9)*-1, ny = W/2 + Math.cos(na)*(R-9);
  ctx.fillStyle='#1a1208'; ctx.beginPath(); ctx.arc(nx,ny,7.5,0,7); ctx.fill();
  ctx.fillStyle='#ffd24a'; ctx.font='bold 10px Verdana'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('N', nx, ny+0.5);
}
