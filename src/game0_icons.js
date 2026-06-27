/* ============================================================
   Crafted Realm v2.5 — single-file browser RPG prototype
   ============================================================ */
/* ================= ITEM ICONS (drawn sprites) ================= */
const ICONS = {};
const TIER_CSS = {bronze:'#b08d57', iron:'#9aa0a8', steel:'#d0d4dc', aurel:'#d4a83e',
  veyrite:'#3ec6b4', leather:'#8a5e34', cloth:'#7a86b8', glimmer:'#b48ae0'};
function iconFor(id){
  if(ICONS[id]) return ICONS[id];
  const c=document.createElement('canvas'); c.width=32; c.height=32;
  const x=c.getContext('2d');
  x.lineWidth=1.5; x.lineJoin='round'; x.lineCap='round';
  const O='#1a1208'; // outline
  const fillS=(color,fn)=>{ x.fillStyle=color; x.strokeStyle=O; x.beginPath(); fn(); x.fill(); x.stroke(); };
  const poly=(pts)=>{ x.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) x.lineTo(pts[i][0],pts[i][1]); x.closePath(); };
  const ell=(cx,cy,rx,ry)=>x.ellipse(cx,cy,rx,ry,0,0,7);

  const def = ITEMS[id]||{};
  const tcol = TIER_CSS[def.tier] || '#b08d57';
  if(def.model && !['coins','bones'].includes(id)){
    drawModelIcon(x, def.model, tcol, def);
    ICONS[id]=c.toDataURL();
    return ICONS[id];
  }
  switch(id){
    case 'coins':
      fillS('#e8c45a',()=>ell(16,22,9,4)); fillS('#f5d978',()=>ell(16,18,9,4));
      fillS('#ffe89a',()=>ell(16,14,9,4));
      x.fillStyle='#9a7820'; x.font='bold 8px Verdana'; x.fillText('c',14,17);
      break;
    case 'bones':
      x.save(); x.translate(16,16); x.rotate(0.6);
      fillS('#efe8d8',()=>{ x.rect(-9,-2,18,4); });
      fillS('#efe8d8',()=>{ ell(-9,-3,3,3); }); fillS('#efe8d8',()=>{ ell(-9,3,3,3); });
      fillS('#efe8d8',()=>{ ell(9,-3,3,3); });  fillS('#efe8d8',()=>{ ell(9,3,3,3); });
      x.restore();
      break;
    case 'logs':
      x.save(); x.translate(16,13); x.rotate(0.18);
      fillS('#7a512f',()=>x.rect(-11,-3,22,6)); fillS('#caa36a',()=>ell(11,0,2.4,3));
      x.restore();
      x.save(); x.translate(15,21); x.rotate(-0.12);
      fillS('#6b4426',()=>x.rect(-11,-3,22,6)); fillS('#caa36a',()=>ell(11,0,2.4,3));
      x.restore();
      break;
    case 'tin_ore':
      fillS('#7d7568',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#b8bcc0',()=>ell(13,15,2.4,2)); fillS('#b8bcc0',()=>ell(20,19,2,1.8));
      break;
    case 'iron_ore':
      fillS('#7d7568',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#8a4a3a',()=>ell(13,15,2.4,2)); fillS('#8a4a3a',()=>ell(20,19,2,1.8));
      break;
    case 'coal':
      fillS('#3a3a3e',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#1c1c20',()=>ell(13,15,2.4,2)); fillS('#55555c',()=>ell(19,12,1.5,1.2));
      break;
    case 'bronze_bar': case 'iron_bar': case 'steel_bar': {
      const bc = id==='bronze_bar' ? '#b0703c' : id==='iron_bar' ? '#9a948c' : '#c8cdd4';
      fillS(bc,()=>poly([[5,20],[10,12],[27,12],[22,20]]));
      fillS('#00000033',()=>poly([[5,20],[22,20],[22,23],[5,23]]));
      break; }
    case 'hammer':
      fillS('#6b4a2f',()=>x.rect(14,10,3,16));
      fillS('#7d7568',()=>x.rect(8,6,16,7));
      break;
    case 'tinderbox':
      fillS('#8a6a44',()=>x.rect(7,12,18,10));
      fillS('#5a4632',()=>x.rect(7,12,18,3));
      fillS('#ffb24a',()=>ell(22,11,2.2,2.6));
      break;
    case 'knife':
      fillS('#c8cdd4',()=>poly([[8,22],[20,8],[24,12],[12,24]]));
      fillS('#6b4a2f',()=>poly([[6,26],[10,20],[13,23],[9,28]]));
      break;
    case 'arrow_shafts':
      for(let i=0;i<3;i++) fillS('#a8895e',()=>x.rect(8+i*4,6,1.6,20));
      break;
    case 'bronze_tips': case 'iron_tips':
      fillS(id==='bronze_tips'?'#b0703c':'#9a948c',()=>poly([[16,6],[20,14],[16,12],[12,14]]));
      fillS(id==='bronze_tips'?'#b0703c':'#9a948c',()=>poly([[10,16],[14,24],[10,22],[6,24]]));
      fillS(id==='bronze_tips'?'#b0703c':'#9a948c',()=>poly([[22,16],[26,24],[22,22],[18,24]]));
      break;
    case 'silver_trinket':
      fillS('#c8cdd4',()=>ell(16,16,7,7)); fillS('#e8ecf0',()=>ell(14,13,2.4,2.4));
      fillS('#00000022',()=>ell(16,16,4,4));
      break;
    case 'bread':
      fillS('#c9963f',()=>ell(16,17,9,6));
      fillS('#e0b568',()=>ell(16,14,8.5,5));
      fillS('#f0d29a',()=>ell(13,12,2,1.2)); fillS('#f0d29a',()=>ell(18,13,2,1.2));
      x.strokeStyle='#8a6428'; x.beginPath(); x.moveTo(10,14); x.lineTo(14,12); x.stroke();
      break;
    case 'feathers':
      fillS('#f0ede4',()=>poly([[16,4],[21,12],[19,22],[16,27],[13,22],[11,12]]));
      x.strokeStyle='#b8b2a0'; x.beginPath(); x.moveTo(16,6); x.lineTo(16,26); x.stroke();
      x.beginPath(); x.moveTo(16,11); x.lineTo(12,14); x.moveTo(16,15); x.lineTo(20,17); x.stroke();
      fillS('#d8cfa8',()=>poly([[16,24],[17,29],[15,29]]));
      break;
    case 'big_bones':
      fillS('#e8e2d0',()=>poly([[6,23],[20,9],[24,5],[27,8],[23,12],[9,26]]));
      fillS('#e8e2d0',()=>ell(7,24,3.4,3.4)); fillS('#e8e2d0',()=>ell(10,27,3.4,3.4));
      fillS('#e8e2d0',()=>ell(24,5,3.4,3.4)); fillS('#e8e2d0',()=>ell(27,9,3.4,3.4));
      break;
    case 'body_rune':
      fillS('#c8c0b0',()=>poly([[16,4],[26,12],[22,27],[10,27],[6,12]]));
      fillS('#b03a5a',()=>ell(16,16,4.5,5.5));
      fillS('#d8607a',()=>ell(16,13,2,2));
      break;
    case 'burnt_perch':
      fillS('#3a3632',()=>poly([[6,18],[12,12],[22,12],[27,16],[22,21],[12,22]]));
      fillS('#3a3632',()=>poly([[26,16],[30,12],[30,20]]));
      fillS('#55504a',()=>ell(11,16,1.4,1.4));
      break;
    case 'copper_ore':
      fillS('#7d7568',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#c77b4a',()=>ell(13,15,2.4,2)); fillS('#c77b4a',()=>ell(20,19,2,1.8));
      fillS('#d99262',()=>ell(17,12,1.6,1.5));
      break;
    case 'raw_perch': case 'cooked_perch': {
      const body = id==='raw_perch' ? '#9fb6c4' : '#c98a4b';
      const fin  = id==='raw_perch' ? '#7e98a8' : '#a86b35';
      fillS(fin,()=>poly([[5,16],[1,10],[1,22]]));
      fillS(body,()=>ell(17,16,11,6));
      fillS(fin,()=>poly([[14,11],[18,6],[20,11]]));
      x.fillStyle=O; x.beginPath(); x.arc(24,14,1.3,0,7); x.fill();
      break; }
    case 'bronze_sword': case 'iron_sword': {
      const blade = id==='bronze_sword' ? '#b08d57' : '#9aa0a8';
      const hilite= id==='bronze_sword' ? '#d8b87e' : '#c8ced6';
      x.save(); x.translate(16,16); x.rotate(-Math.PI/4);
      fillS(blade,()=>poly([[-2.6,-13],[2.6,-13],[1.6,8],[-1.6,8]]));
      x.fillStyle=hilite; x.fillRect(-0.7,-12,1.4,19);
      fillS('#6b5a2a',()=>x.rect(-6,8,12,3));
      fillS('#3e2a17',()=>x.rect(-1.8,11,3.6,7));
      fillS('#c9a23e',()=>ell(0,19,2.6,2.6));
      x.restore();
      break; }
    case 'worn_bow':
      x.strokeStyle='#6b4426'; x.lineWidth=3; x.beginPath();
      x.arc(10,16,12,-1.15,1.15); x.stroke();
      x.strokeStyle='#d8ccb4'; x.lineWidth=1; x.beginPath();
      x.moveTo(15,5.5); x.lineTo(15,26.5); x.stroke();
      x.strokeStyle=O; x.lineWidth=1; x.beginPath(); x.arc(10,16,13.5,-1.15,1.15); x.stroke();
      break;
    case 'arrows':
      for(const off of [-5,0,5]){
        x.save(); x.translate(16+off,16); x.rotate(-Math.PI/4);
        x.strokeStyle='#8a6a3e'; x.lineWidth=2; x.beginPath(); x.moveTo(0,-10); x.lineTo(0,10); x.stroke();
        fillS('#9aa0a8',()=>poly([[0,-13],[-2.5,-8],[2.5,-8]]));
        fillS('#c44',()=>poly([[0,7],[-2.5,12],[0,10]])); fillS('#c44',()=>poly([[0,7],[2.5,12],[0,10]]));
        x.restore();
      }
      break;
    case 'air_rune': case 'water_rune': case 'earth_rune': case 'fire_rune':
    case 'mind_rune': case 'chaos_rune': case 'nature_rune':
    case 'spark_rune':
      fillS('#b9b2a4',()=>{ x.rect(7,7,18,18); });
      x.strokeStyle='#3ec6ff'; x.lineWidth=2.4;
      x.beginPath(); x.moveTo(16,9.5); x.lineTo(16,22.5); x.moveTo(9.5,16); x.lineTo(22.5,16);
      x.moveTo(11.5,11.5); x.lineTo(20.5,20.5); x.moveTo(20.5,11.5); x.lineTo(11.5,20.5); x.stroke();
      break;
    case 'wood_shield':
      fillS('#8a5e34',()=>ell(16,16,11,12));
      x.strokeStyle='#5d3e20'; x.lineWidth=2; x.beginPath(); ell(16,16,7.5,8.5); x.stroke();
      fillS('#9aa0a8',()=>ell(16,16,3,3));
      break;
    case 'bronze_helm':
      fillS('#b08d57',()=>{ x.arc(16,17,10,Math.PI,0); x.lineTo(26,22); x.lineTo(6,22); });
      fillS('#8a6a3e',()=>x.rect(5,21,22,4));
      x.fillStyle='#d8b87e'; x.fillRect(14,8,4,12);
      break;
    case 'bronze_plate':
      fillS('#b08d57',()=>poly([[9,6],[23,6],[26,12],[24,26],[8,26],[6,12]]));
      x.strokeStyle='#7d6238'; x.beginPath(); x.moveTo(16,7); x.lineTo(16,25); x.stroke();
      fillS('#d8b87e',()=>ell(12,11,2,2)); fillS('#d8b87e',()=>ell(20,11,2,2));
      break;
    case 'leather_body':
      fillS('#8a5e34',()=>poly([[10,7],[22,7],[25,13],[23,26],[9,26],[7,13]]));
      x.strokeStyle='#5d3e20'; x.beginPath(); x.moveTo(16,8); x.lineTo(16,25);
      x.moveTo(10,14); x.lineTo(22,14); x.stroke();
      break;
    case 'bronze_legs':
      fillS('#b08d57',()=>poly([[10,6],[22,6],[23,14],[19,26],[15,26],[16,16],[13,26],[9,26],[9,14]]));
      break;
    case 'hatchet': case 'iron_hatchet': {
      const m = id==='iron_hatchet' ? '#9aa0a8' : '#b08d57';
      x.save(); x.translate(16,16); x.rotate(0.5);
      fillS('#6b4426',()=>x.rect(-1.6,-11,3.2,22));
      fillS(m,()=>poly([[1,-11],[10,-9],[11,-2],[1,-3]]));
      x.restore();
      break; }
    case 'pickaxe': case 'iron_pickaxe': {
      const m = id==='iron_pickaxe' ? '#9aa0a8' : '#b08d57';
      x.save(); x.translate(16,17); x.rotate(0.4);
      fillS('#6b4426',()=>x.rect(-1.6,-10,3.2,21));
      fillS(m,()=>poly([[-10,-10],[0,-13],[10,-10],[9,-7],[0,-10],[-9,-7]]));
      x.restore();
      break; }
    case 'fishing_net':
      x.strokeStyle='#8a6a3e'; x.lineWidth=2.4; x.beginPath(); ell(15,14,9,8); x.stroke();
      x.strokeStyle='#cfc6b2'; x.lineWidth=1;
      for(let i=-2;i<=2;i++){ x.beginPath(); x.moveTo(8+i*3.4+3,8); x.lineTo(10+i*3.4,26); x.stroke(); }
      for(let j=0;j<3;j++){ x.beginPath(); x.moveTo(7,12+j*5); x.lineTo(24,12+j*5); x.stroke(); }
      x.strokeStyle=O; x.beginPath(); ell(15,14,9,8); x.stroke();
      break;
    case 'fen_charm':
      x.strokeStyle='#caa36a'; x.lineWidth=1.6; x.beginPath(); x.arc(16,10,6,3.5,5.9); x.stroke();
      fillS('#7a3da8',()=>poly([[16,12],[22,18],[16,27],[10,18]]));
      x.fillStyle='#c9a0ee'; x.fillRect(14.5,15,2,5);
      break;
    case 'guild_sigil':
      fillS('#c9a23e',()=>{ for(let i=0;i<8;i++){ const a=i*Math.PI/4;
        x.lineTo(16+Math.cos(a)*11,16+Math.sin(a)*11);
        x.lineTo(16+Math.cos(a+0.39)*6,16+Math.sin(a+0.39)*6); } x.closePath(); });
      fillS('#7f1f1f',()=>ell(16,16,4,4));
      break;
    case 'beast_hide':
      fillS('#9a8468',()=>poly([[8,8],[14,5],[20,7],[25,12],[23,20],[24,26],[17,23],[10,26],[10,18],[6,13]])); break;
    case 'hollow_ale':
      fillS('#c8a45a',()=>x.rect(11,10,10,16));
      fillS('#f0e6c8',()=>ell(16,10,5,3));
      fillS('#8a6a3e',()=>x.rect(21,14,3,7)); break;
    default:
      fillS('#b9b2a4',()=>x.rect(8,8,16,16));
  }
  ICONS[id]=c.toDataURL();
  return ICONS[id];
}

function drawModelIcon(x, model, col, def){
  x.lineWidth=1.5; x.lineJoin='round'; x.lineCap='round';
  const O='#1a1208';
  const fillS=(color,fn)=>{ x.fillStyle=color; x.strokeStyle=O; x.beginPath(); fn(); x.fill(); x.stroke(); };
  const poly=(pts)=>{ x.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) x.lineTo(pts[i][0],pts[i][1]); x.closePath(); };
  const ell=(cx,cy,rx,ry)=>x.ellipse(cx,cy,rx,ry,0,0,7);
  switch(model){
    case 'sword':
      x.save(); x.translate(16,16); x.rotate(-0.7);
      fillS(col,()=>poly([[-1.6,-12],[1.6,-12],[1.2,8],[-1.2,8]]));
      fillS('#6b5a2a',()=>x.rect(-5,7,10,2.6));
      fillS('#3e2a17',()=>x.rect(-1.4,9.6,2.8,5));
      x.restore(); break;
    case 'axe':
      x.save(); x.translate(16,16); x.rotate(0.5);
      fillS('#6b4426',()=>x.rect(-1.6,-11,3.2,22));
      fillS(col,()=>poly([[1,-11],[10,-9],[11,-2],[1,-3]]));
      x.restore(); break;
    case 'pick':
      x.save(); x.translate(16,17); x.rotate(0.4);
      fillS('#6b4426',()=>x.rect(-1.6,-10,3.2,21));
      fillS(col,()=>poly([[-10,-10],[0,-13],[10,-10],[9,-7],[0,-10],[-9,-7]]));
      x.restore(); break;
    case 'helm':
      fillS(col,()=>{x.arc(16,16,8,Math.PI,0); x.lineTo(24,19); x.lineTo(8,19);});
      fillS('#6b5a2a',()=>x.rect(7,18,18,3)); break;
    case 'plate':
      fillS(col,()=>poly([[9,6],[23,6],[26,12],[24,26],[8,26],[6,12]]));
      x.strokeStyle='#1a1208'; x.beginPath(); x.moveTo(16,7); x.lineTo(16,25); x.stroke(); break;
    case 'legs':
      fillS(col,()=>poly([[10,6],[22,6],[23,14],[19,26],[15,26],[16,16],[13,26],[9,26],[9,14]])); break;
    case 'shield':
      fillS(col,()=>poly([[16,4],[26,8],[25,18],[16,28],[7,18],[6,8]]));
      fillS('#6b5a2a',()=>ell(16,14,3,3)); break;
    case 'bow':
      x.strokeStyle='#6b4426'; x.lineWidth=3;
      x.beginPath(); x.arc(13,16,10,-1.2,1.2); x.stroke();
      x.strokeStyle='#d8ccb4'; x.lineWidth=1;
      x.beginPath(); x.moveTo(17,7); x.lineTo(17,25); x.stroke();
      x.strokeStyle=O; x.lineWidth=1.2;
      x.beginPath(); x.arc(13,16,10,-1.2,1.2); x.stroke(); break;
    case 'staff':
      x.save(); x.translate(16,16); x.rotate(0.3);
      fillS('#6b4426',()=>x.rect(-1.5,-9,3,22));
      fillS(col,()=>ell(0,-11,4,4));
      x.restore(); break;
    case 'robe':
      fillS(def&&def.tier==='glimmer'?'#b48ae0':'#7a86b8',()=>poly([[11,6],[21,6],[25,27],[7,27]]));
      x.strokeStyle='#1a1208'; x.beginPath(); x.moveTo(16,7); x.lineTo(16,26); x.stroke(); break;
    case 'hat':
      fillS(def&&def.tier==='glimmer'?'#b48ae0':'#7a86b8',()=>poly([[16,4],[23,22],[9,22]]));
      fillS(def&&def.tier==='glimmer'?'#9a6ec8':'#5a66a0',()=>ell(16,22,10,3)); break;
    case 'amulet':
      x.strokeStyle='#caa36a'; x.lineWidth=1.6;
      x.beginPath(); x.arc(16,12,7,2.6,0.5+Math.PI*2); x.stroke();
      fillS(def&&def.sBonus?'#c84a4a':def&&def.aBonus?'#4a9ac8':'#4ac86a',()=>ell(16,21,4,5)); break;
    case 'cape':
      { const cc = def&&def.capeColor!==undefined ? '#'+def.capeColor.toString(16).padStart(6,'0') : '#a83232';
        fillS(cc,()=>poly([[10,5],[22,5],[26,27],[16,23],[6,27]])); } break;
    default:
      fillS('#b9b2a4',()=>x.rect(8,8,16,16));
  }
}
