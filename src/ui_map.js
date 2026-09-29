/* ================= UI: MAP RENDERING =================
   World-map canvas rendering (the minimap moved to src/ui_minimap.js). Extracted verbatim from
   game4_ui.js (pure move, zero behaviour change). Loads after
   game4_ui.js (which owns UI.openWorldMap / minimapWalkTo) and before
   its consumers (qol_ui.js, map_search.js, game5_main.js). */
/* ---------- world map ---------- */
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
  ctx.font='bold 12px "Realm Small", Verdana'; ctx.textAlign='center';
  const label=(x,z,t)=>{ const p=mx(x,z);
    ctx.fillStyle='#1a1208'; ctx.fillText(t,p.x+1,p.y+1);
    ctx.fillStyle='#ffe9b0'; ctx.fillText(t,p.x,p.y); };
  label(0,-22,'Hearthmere');
  for(const k in ZONES){ const zn=ZONES[k];
    if(zn.name && k!=='town' && k!=='commons') label(zn.pos[0], zn.pos[1]-3, zn.name); }   // the commons zone IS Hearthmere, labelled above
  // you are here: a white arrow that knows your facing
  const pp=mx(player.position.x, player.position.z);
  const fa=player.rotation.y;
  ctx.save(); ctx.translate(pp.x,pp.y); ctx.rotate(-fa);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(4.4,5); ctx.lineTo(0,2.4); ctx.lineTo(-4.4,5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/* The minimap (CRMinimap, drawMinimap) lives in src/ui_minimap.js (holm-minimap-2004): the 2004-style map drawn from the
   island's own tiles, walls and actors, with wheel zoom. */
