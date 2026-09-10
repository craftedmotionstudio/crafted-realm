/* ============================================================
   Crafted Realm v2.5 — single-file browser RPG prototype
   ============================================================ */
/* ================= ITEM ICONS (drawn sprites) ================= */
const ICONS = {};
const TIER_CSS = {copper:'#c6794a', bronze:'#b08d57', iron:'#9aa0a8', steel:'#d0d4dc', whitsteel:'#e8ecf2',
  aurel:'#d4a83e', veyrite:'#3ec6b4', undercrag:'#6a5a7a', leather:'#8a5e34', cloth:'#7a86b8', glimmer:'#b48ae0',
  monk:'#8a6a44'};
/* Nano Banana (Gemini) gear sprites — richer painted inventory art generated from
   the actual 3D models (assets/icons/gear/<id>.png). The bronze/leather tier is
   painted from the models; the other 7 metal tiers are per-tier recolours of the
   bronze sprite (tools/recolor_gear_tiers.py — blade/head takes the tier metal, the
   gold guard + leather grip stay). iconFor() returns the path directly (used as an
   <img> src), short-circuiting drawModelIcon. A metal-tiered id is <tier>_<template>;
   every one of the 8 tiers has a file, so the template-suffix rule always resolves. */
const GEAR_SPRITE_TEMPLATES = new Set(['longsword','sabre','battleaxe','kiteshield',
  'helm','mace','warhammer','greatsword','medhelm','sqshield','chainbody','plateskirt']);
const GEAR_SPRITE_SINGLES = new Set(['gale_longbow','leather_chaps','leather_gloves',
  'leather_boots','iron_dagger']);
function _gearSprite(id){
  if(GEAR_SPRITE_SINGLES.has(id)) return true;
  const us=id.indexOf('_');
  return us>0 && GEAR_SPRITE_TEMPLATES.has(id.slice(us+1));
}
function iconFor(id){
  if(ICONS[id]) return ICONS[id];
  if(_gearSprite(id)) return (ICONS[id]='assets/icons/gear/'+id+'.png');
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
      /* top-100 pass 2: piled coin stacks like the wiki read, not flat discs */
      for(const st of [[9,25,3],[23,25,3],[16,27,4],[12,19,2],[20,20,2]]){
        for(let i=0;i<st[2];i++)
          fillS(i===st[2]-1?'#ffe89a':'#e8c45a',()=>ell(st[0],st[1]-i*2.4,4.8,2.1));
      }
      break;
    case 'bones': case 'big_bones': {
      /* top-100 pass 2b: crossed dog-bones as outlined stroke silhouettes
         (dark underlay + light overlay, round caps) — can't dot-cluster */
      const L = id==='big_bones' ? 8.5 : 7, W = id==='big_bones' ? 6 : 4.6;
      const tone = id==='big_bones' ? '#e8e2d0' : '#efe8d8';
      const bone = (fill,w)=>{
        x.strokeStyle=fill; x.lineWidth=w; x.lineCap='round';
        x.beginPath(); x.moveTo(-L,0); x.lineTo(L,0); x.stroke();
        for(const ex of [-L,L]){
          x.beginPath(); x.moveTo(ex,-W*0.62); x.lineTo(ex,W*0.62); x.stroke();
        }
      };
      for(const rot of [0.55,-0.55]){
        x.save(); x.translate(16,16); x.rotate(rot);
        bone(O, W+2.6); bone(tone, W);
        x.restore();
      }
      x.lineCap='round';
      break; }
    case 'logs': case 'oak_logs': case 'willow_logs': {
      /* top-100 pass 2: chunky stacked logs with pale end grain; batch 1 adds
         wood-tone variants (oak warmer/darker, willow grey-green) */
      const tones = id==='oak_logs'    ? ['#5d3a1e','#6e4a26','#c49858']
                  : id==='willow_logs' ? ['#5a6244','#6e7852','#b8bc8a']
                  :                      ['#6b4426','#7a512f','#caa36a'];
      const log=(cx,cy,rot,len,r,body)=>{ x.save(); x.translate(cx,cy); x.rotate(rot);
        fillS(body,()=>x.rect(-len,-r,len*2,r*2));
        fillS(tones[2],()=>ell(len,0,2.6,r*0.9));
        x.strokeStyle='#5d3e20'; x.lineWidth=1;
        x.beginPath(); x.moveTo(-len+2,-r*0.35); x.lineTo(len-3,-r*0.35); x.stroke();
        x.restore(); };
      log(14,22,0.05,10.5,4,tones[0]);
      log(18,13.5,0.12,9.5,3.8,tones[1]);
      break; }
    case 'tin_ore':
      fillS('#7d7568',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#b8bcc0',()=>ell(13,15,2.4,2)); fillS('#b8bcc0',()=>ell(20,19,2,1.8));
      break;
    case 'clay': case 'soft_clay': {
      /* top-100 pass 2: lumpy clay mass; soft clay is smoother and paler */
      const soft = id==='soft_clay';
      fillS(soft?'#c7a47c':'#b08a62',()=>poly([[6,22],[8,14],[14,10],[22,11],[27,17],[24,24],[15,26],[9,26]]));
      if(!soft){ fillS('#c9a67c',()=>ell(13,17,4,3)); fillS('#c9a67c',()=>ell(20,19.5,3,2.4)); }
      else { x.strokeStyle='#a8875f'; x.lineWidth=1.2;
             x.beginPath(); x.moveTo(10,18); x.quadraticCurveTo(16,21,22,18); x.stroke(); }
      fillS(soft?'#ecd6ae':'#e0c294',()=>ell(15.5,13.5,2,1.4));
      break; }
    case 'gold_ore':
      fillS('#7d7568',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#e8c045',()=>ell(13,15,2.4,2)); fillS('#e8c045',()=>ell(20,19,2,1.8));
      fillS('#ffe07a',()=>ell(17,12,1.6,1.5));
      break;
    case 'iron_ore':
      fillS('#7d7568',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#8a4a3a',()=>ell(13,15,2.4,2)); fillS('#8a4a3a',()=>ell(20,19,2,1.8));
      break;
    case 'coal':
      fillS('#3a3a3e',()=>poly([[7,24],[5,15],[12,8],[22,9],[27,18],[21,25]]));
      fillS('#1c1c20',()=>ell(13,15,2.4,2)); fillS('#55555c',()=>ell(19,12,1.5,1.2));
      break;
    case 'bronze_bar': case 'iron_bar': case 'steel_bar': case 'gold_bar': {
      /* top-100 pass 2: chunky stepped ingot (was a flat parallelogram) */
      const bc  = id==='bronze_bar' ? '#b0703c' : id==='iron_bar' ? '#9a948c' : id==='gold_bar' ? '#e0b93e' : '#c8cdd4';
      const top = id==='bronze_bar' ? '#cf8f56' : id==='iron_bar' ? '#b5b0a8' : id==='gold_bar' ? '#f5d76a' : '#e2e6ec';
      const drk = id==='bronze_bar' ? '#8a5630' : id==='iron_bar' ? '#7a756e' : id==='gold_bar' ? '#b8922e' : '#a8adb4';
      fillS(bc,()=>poly([[5,21],[9,13],[25,13],[21,21]]));
      fillS(top,()=>poly([[9,13],[12,8.5],[28,8.5],[25,13]]));
      fillS(drk,()=>poly([[5,21],[21,21],[20.5,24.5],[5.5,24.5]]));
      break; }
    case 'hammer':
      /* top-100 pass 2: angled wooden handle + shaped head (was a plain grey T) */
      x.save(); x.translate(16,17); x.rotate(0.45);
      fillS('#8a6a44',()=>x.rect(-1.8,-3,3.6,15));
      fillS('#7d7568',()=>poly([[-8.5,-9],[8.5,-9],[9.5,-4],[7,-2],[-7,-2],[-9.5,-4]]));
      fillS('#9aa0a8',()=>x.rect(-8.5,-8.6,17,2.4));
      x.restore();
      break;
    case 'tinderbox':
      /* top-100 pass 2: open box with flint + spark (was a closed plain box) */
      fillS('#8a6a44',()=>x.rect(8,15,17,8));
      fillS('#5a4632',()=>x.rect(8,15,17,2.2));
      fillS('#a8845c',()=>poly([[8,15],[6,9],[21,9],[25,15]]));
      fillS('#7d7568',()=>poly([[12,19],[17.5,18],[20,21],[14.5,22.5]]));
      fillS('#ffb24a',()=>ell(22.5,12,1.8,2.2));
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
      /* top-100 pass 2: single scored golden loaf (was reading as stacked buns) */
      fillS('#c9963f',()=>ell(16,18,10.5,6.5));
      fillS('#e0b568',()=>ell(16,15.5,10,5.6));
      x.strokeStyle='#8a6428'; x.lineWidth=1.4;
      for(const dx of [-5,0,5]){
        x.beginPath(); x.moveTo(13+dx,11.5+Math.abs(dx)*0.28); x.lineTo(17+dx,18.5); x.stroke();
      }
      break;
    case 'feathers':
      fillS('#f0ede4',()=>poly([[16,4],[21,12],[19,22],[16,27],[13,22],[11,12]]));
      x.strokeStyle='#b8b2a0'; x.beginPath(); x.moveTo(16,6); x.lineTo(16,26); x.stroke();
      x.beginPath(); x.moveTo(16,11); x.lineTo(12,14); x.moveTo(16,15); x.lineTo(20,17); x.stroke();
      fillS('#d8cfa8',()=>poly([[16,24],[17,29],[15,29]]));
      break;
    /* big_bones is handled together with 'bones' above */
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
    case 'raw_perch': case 'cooked_perch': case 'raw_trout': case 'trout': {
      const body = id==='raw_perch' ? '#9fb6c4' : id==='raw_trout' ? '#c4a8b0' : id==='trout' ? '#d09a6a' : '#c98a4b';
      const fin  = id==='raw_perch' ? '#7e98a8' : id==='raw_trout' ? '#a08890' : id==='trout' ? '#b07d4a' : '#a86b35';
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
    case 'spark_rune': {
      /* OSRS-style: one grey rune stone, per-element symbol (top-100 review fix —
         all runes previously shared a single blue-asterisk glyph) */
      fillS('#c8c0b0',()=>poly([[16,4],[26,12],[22,27],[10,27],[6,12]]));
      switch(id){
        case 'air_rune':   // three wind gusts (blue-grey underlay for contrast on the stone)
          for(const [c,w] of [['#6a94a8',3.4],['#f4fbff',2]]){
            x.strokeStyle=c; x.lineWidth=w; x.lineCap='round';
            for(const dy of [-4.5,0,4.5]){
              x.beginPath(); x.moveTo(10,17+dy); x.quadraticCurveTo(16,12.5+dy,22,17+dy); x.stroke();
            }
          }
          x.lineCap='round';
          break;
        case 'water_rune': // droplet
          fillS('#3a7ec6',()=>poly([[16,9],[21,17],[19.5,22],[12.5,22],[11,17]]));
          fillS('#7ab8e8',()=>ell(14.5,17,1.8,2.4));
          break;
        case 'earth_rune': // earthen diamond
          fillS('#8a6a34',()=>poly([[16,9],[23,16],[16,23],[9,16]]));
          fillS('#b89a5c',()=>poly([[16,12],[20,16],[16,20],[12,16]]));
          break;
        case 'fire_rune':  // flame
          fillS('#c63a2a',()=>poly([[16,7],[21,13],[22,19],[19,23],[13,23],[10,19],[12,13]]));
          fillS('#f0a83e',()=>poly([[16,12],[19,17],[17.5,21],[14.5,21],[13,17]]));
          break;
        case 'mind_rune':  // starburst
          x.strokeStyle='#e88a3a'; x.lineWidth=2;
          for(let i=0;i<6;i++){ const a=i*Math.PI/3;
            x.beginPath(); x.moveTo(16+Math.cos(a)*3,16+Math.sin(a)*3);
            x.lineTo(16+Math.cos(a)*7.5,16+Math.sin(a)*7.5); x.stroke(); }
          fillS('#f0c05a',()=>ell(16,16,2.6,2.6));
          break;
        case 'chaos_rune': // twisted cross
          x.strokeStyle='#d6543a'; x.lineWidth=2.4;
          x.beginPath(); x.moveTo(11,11); x.lineTo(21,21); x.moveTo(21,11); x.lineTo(11,21); x.stroke();
          fillS('#f0a83e',()=>ell(16,16,2.2,2.2));
          break;
        case 'nature_rune': // sprout
          x.strokeStyle='#3a7a3a'; x.lineWidth=2.2;
          x.beginPath(); x.moveTo(16,23); x.lineTo(16,13); x.stroke();
          fillS('#4a9a4a',()=>poly([[16,13],[10,10],[13,16]]));
          fillS('#4a9a4a',()=>poly([[16,13],[22,10],[19,16]]));
          break;
        default:            // spark_rune — jagged bolt
          fillS('#f0d05a',()=>poly([[18,8],[13,16],[16,16],[13,24],[20,15],[17,15]]));
      }
      break; }
    case 'bucket': case 'bucket_water':
      /* top-100 review fix — bucket had no case and fell through to the default square */
      fillS('#8d9298',()=>poly([[9,12],[23,12],[21,26],[11,26]]));
      x.strokeStyle='#5f646a'; x.lineWidth=1.2;
      x.beginPath(); x.moveTo(10,15); x.lineTo(22,15); x.stroke();
      x.strokeStyle='#6d7278'; x.lineWidth=1.6;
      x.beginPath(); x.arc(16,13,7.4,Math.PI,0); x.stroke();
      fillS('#aab0b6',()=>ell(16,12,7,2.2));
      if(id==='bucket_water') fillS('#3a7ec6',()=>ell(16,12,5.4,1.6));
      else fillS('#70767c',()=>ell(16,12,5.4,1.6));
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
      /* top-100 pass 2: draped hanging mesh from a hoop (was a rigid grate) */
      x.strokeStyle='#8a6a3e'; x.lineWidth=2.6;
      x.beginPath(); x.arc(16,10,8.5,Math.PI,0); x.stroke();
      x.strokeStyle='#cfc6b2'; x.lineWidth=1;
      for(let i=0;i<5;i++){ x.beginPath(); x.moveTo(7.5+i*4.25,10);
        x.quadraticCurveTo(6.5+i*4.6,18,10+i*3.2,26.5); x.stroke(); }
      for(let j=0;j<4;j++){ x.beginPath(); x.moveTo(8,11+j*4.4);
        x.quadraticCurveTo(16,14.5+j*4.9,24,11+j*4.4); x.stroke(); }
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

    /* ===== TOP-100 batch 1 icons (2026-07-17) ===== */
    case 'fishing_rod': case 'fly_fishing_rod':
      x.save(); x.translate(16,16); x.rotate(0.65);
      fillS('#8a6a44',()=>x.rect(-1.3,-13,2.6,24));                 // rod
      fillS('#6b4426',()=>x.rect(-1.7,6,3.4,5));                    // grip
      if(id==='fly_fishing_rod') fillS('#9aa0a8',()=>ell(0,4.5,2.4,2.4));  // reel
      x.strokeStyle='#d8ccb4'; x.lineWidth=1;
      x.beginPath(); x.moveTo(0,-13); x.quadraticCurveTo(7,-9,6.5,-3); x.stroke();  // line (icon only)
      fillS('#c8cdd4',()=>ell(6.5,-2,1.2,1.6));                     // hook glint
      x.restore();
      break;
    case 'ashes':
      fillS('#8d8a84',()=>poly([[6,24],[10,18],[16,16],[23,18],[26,24],[20,26],[11,26]]));
      fillS('#b2afa8',()=>ell(13,21,3,2)); fillS('#b2afa8',()=>ell(20,22,2.6,1.8));
      fillS('#6a6862',()=>ell(16,24,2,1.2));
      break;
    case 'chisel':
      x.save(); x.translate(16,16); x.rotate(-0.6);
      fillS('#8a6a44',()=>x.rect(-2.2,-11,4.4,9));
      fillS('#c8cdd4',()=>poly([[-1.6,-2],[1.6,-2],[1.6,8],[0,11],[-1.6,8]]));
      x.restore();
      break;
    case 'rope':
      x.strokeStyle='#a8895e'; x.lineWidth=4;
      x.beginPath(); x.arc(16,16,8,0,7); x.stroke();
      x.strokeStyle=O; x.lineWidth=1;
      x.beginPath(); x.arc(16,16,10,0,7); x.stroke();
      x.beginPath(); x.arc(16,16,6,0,7); x.stroke();
      x.strokeStyle='#8a6a3e'; x.lineWidth=1;
      for(let i=0;i<10;i++){ const a=i*0.63;
        x.beginPath(); x.moveTo(16+Math.cos(a)*6.2,16+Math.sin(a)*6.2);
        x.lineTo(16+Math.cos(a+0.3)*9.8,16+Math.sin(a+0.3)*9.8); x.stroke(); }
      fillS('#a8895e',()=>x.rect(21,14,6,3.4));
      break;
    case 'shears':
      for(const s of [-1,1]){
        x.save(); x.translate(16,15); x.scale(s,1); x.rotate(0.35);
        fillS('#c8cdd4',()=>poly([[-1.2,-11],[1.4,-10],[1.8,2],[-0.6,2]]));
        fillS('#8a6a44',()=>x.rect(-1.4,2,3,8));
        x.restore();
      }
      fillS('#7d7568',()=>ell(16,17,1.8,1.8));
      break;
    case 'spade':
      x.save(); x.translate(16,15); x.rotate(0.35);
      fillS('#8a6a44',()=>x.rect(-1.6,-12,3.2,14));
      fillS('#8a6a44',()=>x.rect(-4,-13,8,2.6));
      fillS('#7d7568',()=>poly([[-5,2],[5,2],[4,8],[0,12],[-4,8]]));
      x.restore();
      break;
    case 'jug': case 'jug_water':
      fillS('#d8d2c4',()=>poly([[12,8],[20,8],[21,12],[24,16],[23,25],[9,25],[8,16],[11,12]]));
      fillS('#c4beb0',()=>x.rect(12,6,8,3));
      if(id==='jug_water') fillS('#3a7ec6',()=>ell(16,7.5,3.4,1.2));
      x.strokeStyle='#a8a294'; x.lineWidth=1.2;
      x.beginPath(); x.moveTo(11,16); x.quadraticCurveTo(16,18,21,16); x.stroke();
      break;
    case 'pot':
      fillS('#b0713e',()=>poly([[10,10],[22,10],[24,14],[23,24],[9,24],[8,14]]));
      fillS('#8a552e',()=>ell(16,10,6,2));
      fillS('#c98a52',()=>ell(12.5,15,1.8,3));
      break;
    case 'pot_of_flour':
      fillS('#b0713e',()=>poly([[10,12],[22,12],[24,16],[23,25],[9,25],[8,16]]));
      fillS('#f0ede4',()=>ell(16,11.5,6.2,2.6));
      fillS('#ffffff',()=>ell(14,10.8,2.6,1.2));
      break;
    case 'bowl':
      fillS('#b0713e',()=>poly([[6,14],[26,14],[24,21],[20,24],[12,24],[8,21]]));
      fillS('#6e4a26',()=>ell(16,14,10,3));
      fillS('#8a552e',()=>ell(16,14,7.5,2));
      break;
    case 'leather':
      fillS('#a8794a',()=>poly([[7,10],[14,7],[22,8],[25,13],[24,22],[18,25],[9,24],[6,17]]));
      x.strokeStyle='#7d5731'; x.lineWidth=1.2;
      x.beginPath(); x.moveTo(9,14); x.quadraticCurveTo(16,11,23,14); x.stroke();
      x.beginPath(); x.moveTo(9,19); x.quadraticCurveTo(16,16,23,19); x.stroke();
      break;
    case 'wool':
      fillS('#efe9dc',()=>ell(16,17,9,7));
      fillS('#f8f4ea',()=>ell(11,14,4,3.4)); fillS('#f8f4ea',()=>ell(19,12.5,4.4,3.6));
      fillS('#f8f4ea',()=>ell(22,18,3.6,3)); fillS('#e2dccc',()=>ell(13,21,3.6,2.8));
      break;
    case 'ball_of_wool':
      fillS('#efe9dc',()=>ell(16,16,9,9));
      x.strokeStyle='#cfc6b2'; x.lineWidth=1.2;
      x.beginPath(); x.arc(16,16,8.6,0.4,2.4); x.stroke();
      x.beginPath(); x.arc(16,16,8.6,3.2,5.4); x.stroke();
      x.beginPath(); x.moveTo(9,12); x.quadraticCurveTo(16,17,23,12); x.stroke();
      x.beginPath(); x.moveTo(9,20); x.quadraticCurveTo(16,15,23,20); x.stroke();
      break;
    case 'flax':
      x.strokeStyle='#5a7a44'; x.lineWidth=1.6;
      for(const [dx,rot] of [[-4,-0.18],[0,0],[4,0.18]]){
        x.beginPath(); x.moveTo(16+dx,26); x.lineTo(16+dx+rot*14,10); x.stroke();
      }
      fillS('#7ab0d8',()=>ell(11.5,9,2.6,2.6)); fillS('#7ab0d8',()=>ell(16,7.5,2.6,2.6));
      fillS('#7ab0d8',()=>ell(20.5,9,2.6,2.6));
      fillS('#a8d0ec',()=>ell(16,7.5,1,1)); fillS('#a8d0ec',()=>ell(11.5,9,1,1));
      fillS('#a8d0ec',()=>ell(20.5,9,1,1));
      break;
    case 'bow_string':
      x.strokeStyle='#d8ccb4'; x.lineWidth=2.2;
      x.beginPath(); x.moveTo(9,6);
      x.quadraticCurveTo(24,10,16,16);
      x.quadraticCurveTo(8,22,23,26); x.stroke();
      x.strokeStyle=O; x.lineWidth=0.8;
      x.beginPath(); x.moveTo(9,6);
      x.quadraticCurveTo(24,10,16,16);
      x.quadraticCurveTo(8,22,23,26); x.stroke();
      break;
    case 'grain':
      for(const [dx,rot] of [[-4,-0.15],[0,0],[4,0.15]]){
        x.save(); x.translate(16+dx,16); x.rotate(rot);
        x.strokeStyle='#b89a4c'; x.lineWidth=1.4;
        x.beginPath(); x.moveTo(0,11); x.lineTo(0,-4); x.stroke();
        for(let j=0;j<4;j++){
          fillS('#d8bc6a',()=>ell(-1.8,-4-j*2.2,1.6,1.2));
          fillS('#d8bc6a',()=>ell(1.8,-5-j*2.2,1.6,1.2));
        }
        fillS('#d8bc6a',()=>ell(0,-13,1.5,1.8));
        x.restore();
      }
      break;
    case 'bread_dough':
      fillS('#e8e0cc',()=>ell(16,18,9.5,7));
      fillS('#f4eee0',()=>ell(14,15.5,5,3.4));
      fillS('#d8d0ba',()=>ell(20,20,3,2));
      break;
    case 'cabbage':
      fillS('#5a8a3c',()=>ell(16,17,10,9));
      fillS('#74a850',()=>{ x.arc(11,14,6,2.4,5.9); });
      fillS('#74a850',()=>{ x.arc(21,14,6,3.5,0.6); });
      fillS('#8cc062',()=>ell(16,15,4.6,4));
      fillS('#a8d47e',()=>ell(16,15,2.4,2));
      break;
    case 'potato':
      fillS('#c9a86a',()=>poly([[8,14],[13,10],[20,10],[25,15],[24,21],[18,24],[11,23],[7,18]]));
      fillS('#a8895e',()=>ell(12,15,1,1)); fillS('#a8895e',()=>ell(19,13,1,1));
      fillS('#a8895e',()=>ell(17,19,1,1));
      break;
    case 'onion':
      fillS('#d8b88a',()=>ell(16,18,8,7.5));
      fillS('#e8d0a8',()=>ell(13,16,3,4));
      x.strokeStyle='#b09468'; x.lineWidth=1.2;
      x.beginPath(); x.moveTo(16,11); x.quadraticCurveTo(17.5,17,16,25); x.stroke();
      fillS('#8a9a4c',()=>poly([[15,10],[14,4],[16.5,8],[18,4],[17,10]]));
      break;
    case 'egg':
      fillS('#f0e8d8',()=>{ x.ellipse(16,17,6.5,8.5,0,0,7); });
      fillS('#fbf6ec',()=>ell(13.5,13,2.6,3.4));
      break;
    case 'cheese':
      fillS('#e8c85a',()=>poly([[5,22],[24,10],[27,14],[27,22],[5,26]]));
      fillS('#f5dc7a',()=>poly([[5,22],[24,10],[27,14],[6,25]]));
      fillS('#c9a83e',()=>ell(13,20,1.8,1.8)); fillS('#c9a83e',()=>ell(20,17,1.4,1.4));
      fillS('#c9a83e',()=>ell(22,21,1.2,1.2));
      break;
    case 'raw_beef': case 'cooked_meat': {
      const meat = id==='raw_beef' ? '#c04038' : '#9a5c30';
      const marb = id==='raw_beef' ? '#e8a8a0' : '#c9925c';
      fillS(meat,()=>poly([[7,12],[15,8],[23,10],[26,16],[23,23],[13,25],[7,20]]));
      fillS(marb,()=>ell(14,15,3.4,2.2)); fillS(marb,()=>ell(20,18,2.4,1.6));
      break; }
    case 'iron_dagger':
      x.save(); x.translate(16,16); x.rotate(-Math.PI/4);
      fillS('#9aa0a8',()=>poly([[0,-13],[2.2,-7],[1.6,6],[-1.6,6],[-2.2,-7]]));
      x.fillStyle='#c8ced6'; x.fillRect(-0.6,-11,1.2,16);
      fillS('#6b5a2a',()=>x.rect(-5,6,10,2.6));
      fillS('#3e2a17',()=>x.rect(-1.6,8.6,3.2,5));
      fillS('#c9a23e',()=>ell(0,14.6,2.2,2.2));
      x.restore();
      break;

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
    case 'sabre': case 'sword':
      if(def && def.template==='sabre'){
        /* top-100 pass 2: sabres get a real curved scimitar blade */
        x.save(); x.translate(16,16); x.rotate(-0.35);
        fillS(col,()=>{ x.moveTo(-11,-9);
          x.quadraticCurveTo(-2,-14,5,-8);   // spine sweeps down-right
          x.quadraticCurveTo(7,-5,6,1);      // to the base of the blade
          x.lineTo(2.6,1);
          x.quadraticCurveTo(2,-5,-2,-8);    // edge curve back
          x.quadraticCurveTo(-7,-11,-11,-9); // broad tip belly
          x.closePath(); });
        fillS('#c9a23e',()=>x.rect(0.6,1,8,2.6));                  // gold disc guard (matches model)
        fillS('#3e2a17',()=>x.rect(2.9,3.6,3.2,5.4));
        fillS('#c9a23e',()=>ell(4.5,10,2,2));
        x.restore(); break;
      }
      x.save(); x.translate(16,16); x.rotate(-0.7);
      fillS(col,()=>poly([[-1.6,-12],[1.6,-12],[1.2,8],[-1.2,8]]));
      fillS('#6b5a2a',()=>x.rect(-5,7,10,2.6));
      fillS('#3e2a17',()=>x.rect(-1.4,9.6,2.8,5));
      x.restore(); break;
    case 'mace': {
      /* set-2 model r8: SPIKED BALL morning-star */
      x.save(); x.translate(16,17); x.rotate(-0.5);
      fillS('#8a6a44',()=>x.rect(-1.5,-1,3,15));                    // haft
      fillS('#c9a23e',()=>ell(0,13,2,2));                          // gold pommel
      const bcy=-8, br=4.4;                                        // ball centre + radius
      for(let i=0;i<8;i++){ const a=i/8*6.283+0.19;                // 8 spikes through the surface
        fillS(col,()=>poly([[Math.cos(a-0.30)*br, bcy+Math.sin(a-0.30)*br],
                            [Math.cos(a)*(br+4), bcy+Math.sin(a)*(br+4)],
                            [Math.cos(a+0.30)*br, bcy+Math.sin(a+0.30)*br]])); }
      fillS(col,()=>ell(0,bcy,br,br));                             // ball core
      fillS('#ffffff22',()=>ell(-1.4,bcy-1.4,1.4,1.4));            // glint
      x.restore(); break; }
    case 'warhammer':
      x.save(); x.translate(16,17); x.rotate(-0.55);
      fillS('#8a6a44',()=>x.rect(-1.6,-3,3.2,15));                  // haft
      fillS(col,()=>x.rect(-7,-12,14,8));                          // block head
      fillS('#00000022',()=>x.rect(-7,-6.4,14,2.4));               // underside shade
      fillS('#c9a23e',()=>ell(0,12.6,2,2));
      x.restore(); break;
    case 'greatsword':
      x.save(); x.translate(16,17); x.rotate(-0.7);
      fillS(col,()=>poly([[-3,-12.5],[0.8,-14.5],[3,-13],[2.2,6],[-2.2,6]]));  // broad blade
      x.strokeStyle='#00000030'; x.lineWidth=1;
      x.beginPath(); x.moveTo(0,-13); x.lineTo(0,5); x.stroke();
      fillS('#c9a23e',()=>x.rect(-7,5,14,2.8));                    // wide gold guard
      fillS('#3e2a17',()=>x.rect(-1.6,7.8,3.2,6.4));               // long two-hand grip
      fillS('#c9a23e',()=>ell(0,15,2.4,2.4));
      x.restore(); break;
    case 'medhelm':
      /* set-2 model r8: open-face dome + BLUE halo band + built-in glasses (eye holes) */
      fillS(col,()=>{ x.arc(16,14,9.5,Math.PI,0); x.lineTo(25.5,19); x.lineTo(6.5,19); });  // dome
      fillS('#3a5aad',()=>x.rect(7,9.5,18,3));                     // blue halo band
      fillS(col,()=>x.rect(6,18,20,4));                            // brow / glasses band
      x.fillStyle='#140d06'; x.fillRect(10.5,19.6,4.6,2.4); x.fillRect(16.9,19.6,4.6,2.4);  // eye holes
      break;
    case 'sqshield':
      /* set-2 model r7/r8: tall CONCAVE riot-shield plate (not a square heater) */
      fillS(col,()=>poly([[9,3],[23,3],[24,7],[24,21],[16,27],[8,21],[8,7]]));   // tall body
      fillS('#00000026',()=>poly([[9,3],[11.5,4],[11.5,25],[8,21],[8,7]]));      // left curl shade
      fillS('#00000018',()=>poly([[20.5,4],[23,3],[24,21],[20.5,25]]));          // right curl shade
      fillS('#ffffff12',()=>poly([[13,5],[19,5],[18.5,25],[13.5,25]]));          // centre highlight
      x.strokeStyle='#00000033'; x.lineWidth=1.2;
      x.beginPath(); x.moveTo(8.5,13.5); x.lineTo(23.5,13.5); x.stroke();        // rib band
      break;
    case 'longsword':
      /* top-100 exemplar: broader blade, slanted clipped tip, wider guard */
      x.save(); x.translate(16,17); x.rotate(-0.7);
      fillS(col,()=>poly([[-2.4,-11.5],[0.6,-14],[2.4,-12.5],[1.8,8],[-1.8,8]]));
      x.strokeStyle='#00000030'; x.lineWidth=1;
      x.beginPath(); x.moveTo(0,-12.5); x.lineTo(0,7); x.stroke();
      fillS('#c9a23e',()=>x.rect(-6,7,12,2.6));                    // gold guard (matches model)
      fillS('#3e2a17',()=>x.rect(-1.5,9.6,3,5));
      fillS('#c9a23e',()=>ell(0,15.6,2.4,2.4));
      x.restore(); break;
    case 'battleaxe': case 'axe':
      if(def && def.template==='battleaxe'){
        /* set-2 model: DOUBLE crescent head + GOLD haft */
        x.save(); x.translate(16,16); x.rotate(0.32);
        fillS('#c9a23e',()=>x.rect(-1.7,-12,3.4,26));                 // gold haft
        fillS(col,()=>poly([[1.4,-12],[8,-13],[13,-8],[12,-2],[6,-2],[1.4,-4]]));   // right crescent
        fillS(col,()=>poly([[-1.4,-12],[-8,-13],[-13,-8],[-12,-2],[-6,-2],[-1.4,-4]])); // left crescent
        x.restore(); break;
      }
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
      /* set-1 model r9: rounded full helm + PURPLE PLUME + VERTICAL eye slits */
      fillS('#5a3a9a',()=>poly([[15,2],[19,3],[20.5,7],[18,10],[14,9],[13,4]]));  // purple plume crest
      fillS(col,()=>poly([[8,13],[9.5,7],[13.5,4.5],[18.5,4.5],[22.5,7],[24,13],[23.5,21],[19.5,25.5],[12.5,25.5],[8.5,21]]));
      fillS('#d8c090',()=>x.rect(9.5,11.5,13,2.2));                // light brow ridge
      x.fillStyle='#140d06';                                       // three vertical eye slits
      for(const px of [12.5,16,19.5]) x.fillRect(px-0.8,14.2,1.6,6);
      break;
    case 'plate':
      /* top-100 pass 2: cuirass with neck + waist (two-panel door-read removed) */
      fillS(col,()=>poly([[7,8],[12,6],[14,8.5],[18,8.5],[20,6],[25,8],[26.5,14],[24,17],[23,26],[9,26],[8,17],[5.5,14]]));
      fillS('#00000028',()=>ell(16,9.5,3.4,2));
      x.strokeStyle='#1a1208'; x.lineWidth=1.2;
      x.beginPath(); x.moveTo(9.5,18); x.lineTo(22.5,18); x.stroke();
      break;
    case 'legs':
      fillS(col,()=>poly([[10,6],[22,6],[23,14],[19,26],[15,26],[16,16],[13,26],[9,26],[9,14]])); break;
    case 'chainbody':
      /* set 3: mail shirt — rounded torso + short sleeves, chain-dot texture */
      fillS(col,()=>poly([[9,7],[13,6],[19,6],[23,7],[24,15],[23,26],[9,26],[8,15]]));
      fillS(col,()=>ell(8,13,3,4)); fillS(col,()=>ell(24,13,3,4));   // sleeve nubs
      x.fillStyle='#00000026';
      for(let yy=10;yy<25;yy+=3) for(let xx=11;xx<22;xx+=3) x.fillRect(xx+((yy/3)%2?1.5:0),yy,1,1);
      break;
    case 'plateskirt':
      /* set 3: flared skirt from a belt */
      fillS('#6b5a2a',()=>x.rect(9,7,14,3));                        // belt
      fillS(col,()=>poly([[9,10],[23,10],[26,26],[6,26]]));         // flare
      x.strokeStyle='#00000026'; x.lineWidth=1;
      x.beginPath(); x.moveTo(13,10); x.lineTo(11,26); x.moveTo(16,10); x.lineTo(16,26); x.moveTo(19,10); x.lineTo(21,26); x.stroke();
      break;
    case 'chaps':
      /* set 3: leather leggings */
      fillS(col,()=>poly([[10,6],[22,6],[22,14],[19,26],[15,26],[16,15],[13,26],[10,26],[10,14]]));
      x.strokeStyle='#00000030'; x.lineWidth=1;
      x.beginPath(); x.moveTo(12,9); x.lineTo(12,24); x.moveTo(20,9); x.lineTo(20,24); x.stroke();
      break;
    case 'gloves':
      /* set 3: a pair of leather gloves */
      for(const dx of [-5,5]){
        fillS(col,()=>poly([[15+dx,10],[19+dx,10],[19+dx,20],[15+dx,20]]));   // palm
        fillS(col,()=>x.rect(15+dx,8,4,3));                                    // cuff
        fillS(col,()=>ell(14+dx,13,1.4,2.2));                                  // thumb
      }
      break;
    case 'boots':
      /* set 3: leather boots */
      for(const dx of [-5,5]){
        fillS(col,()=>poly([[15+dx,8],[19+dx,8],[19+dx,20],[23+dx,20],[23+dx,24],[15+dx,24]]));
        fillS('#00000030',()=>x.rect(15+dx,22,8,2));                          // sole
      }
      break;
    case 'kiteshield': case 'shield':
      if(def && def.template==='kiteshield'){
        /* top-100 pass 2: metal kite silhouette w/ cross ridge */
        fillS(col,()=>poly([[16,4],[26,7.5],[25,16],[16,28],[7,16],[6,7.5]]));
        x.strokeStyle='#1a1208'; x.lineWidth=1.2;
        x.beginPath(); x.moveTo(16,6); x.lineTo(16,26); x.moveTo(8.5,11); x.lineTo(23.5,11); x.stroke();
        break;
      }
      /* legacy wooden round shield keeps its banded wooden look */
      fillS('#8a5e34',()=>ell(16,16,11,12));
      x.strokeStyle='#5d3e20'; x.lineWidth=2; x.beginPath(); ell(16,16,7.5,8.5); x.stroke();
      fillS('#9aa0a8',()=>ell(16,16,3,3));
      break;
    case 'longbow': case 'bow': {
      /* top-100 pass 2: fuller limbs + taller distinct longbow silhouette */
      const isLong = def && (model==='longbow' || /longbow/i.test(def.name||''));
      const R = isLong ? 14.5 : 11, sweep = isLong ? 1.02 : 1.25, cx0 = isLong ? 11.5 : 13;
      const ex = cx0 + Math.cos(sweep)*R, ey = Math.sin(sweep)*R;
      x.strokeStyle='#6b4426'; x.lineWidth=3.4;
      x.beginPath(); x.arc(cx0,16,R,-sweep,sweep); x.stroke();
      x.strokeStyle='#8a6a3e'; x.lineWidth=1.2;
      x.beginPath(); x.arc(cx0,16,R+1.1,-sweep,sweep); x.stroke();
      x.strokeStyle='#d8ccb4'; x.lineWidth=1;
      x.beginPath(); x.moveTo(ex,16-ey); x.lineTo(ex,16+ey); x.stroke();
      x.strokeStyle=O; x.lineWidth=1;
      x.beginPath(); x.arc(cx0,16,R-1.6,-sweep,sweep); x.stroke();
      break; }
    case 'staff':
      x.save(); x.translate(16,16); x.rotate(0.3);
      fillS('#6b4426',()=>x.rect(-1.5,-9,3,22));
      fillS(col,()=>ell(0,-11,4,4));
      x.restore(); break;
    case 'robe': {
      /* top-100 pass 2: tier-aware color (monk robes were rendering wizard-blue) */
      const rc = (def && TIER_CSS[def.tier]) || '#7a86b8';
      fillS(rc,()=>poly([[11,6],[21,6],[25,27],[7,27]]));
      x.strokeStyle='#1a1208'; x.beginPath(); x.moveTo(16,7); x.lineTo(16,26); x.stroke(); break; }
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
