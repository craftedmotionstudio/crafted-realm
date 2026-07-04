/* ================= BANK OF VEYHOLLOW — INTERIOR FURNISHINGS =================
 * Self-booting IIFE (Claude Fable 5). Dresses the Bank of Veyhollow hall to the
 * two reference plates:
 *   Bible_References/Bank.jpg         — the bank hall: a long teller counter run
 *      with wooden booth partitions + gold grille bars, ledger/coin-bag shelving
 *      flush on the far wall behind the tellers, a big braided blue rug by the door.
 *   Bible_References/Bank Basement.jpg — the vault: stacked rounded-lid chests,
 *      a bank of small deposit boxes, coin spill.
 *
 * OWNS ONLY this file. Adds NEW low-poly flat-shaded builders for the furnishings
 * the base game lacks (a divided counter RUN, chest stacks, a deposit-box bank,
 * ledger/coin-bag shelving, a braided rug) and hand-places them INSIDE the existing
 * bank hall centred at world (13,-12.5) (w10 x d7, door W). Uses only globals from
 * game2_world.js: THREE, scene, WORLD, gy(), mat(), collides(). Every solid piece
 * is guarded by collides() (skips if it would clip the teller booth or a wall) and
 * a clear lane is left from the west door through to the bank booth at (11,-12.5).
 * Loaded AFTER world_scatter.js; polls until the hall is placed, then builds once.
 * ========================================================================== */
(function(){
  'use strict';

  /* -------- palette (warm cozy OSRS wood + brass + ledgers) -------- */
  const C = {
    darkWood:0x6b4a2f, midWood:0x7a5838, litWood:0x8a6a44, deepWood:0x5a3f28,
    brass:0xc9b870, gold:0xe8c45a, iron:0x3a3630,
    rugField:0x2f4a6a, rugField2:0x3f5f86, rugBorder:0xcabb90, rugBraid:0xb89a52,
    sack:0x9a8a5a, sackTie:0x6a5a34,
    ledger:[0x8a3a30,0x3a5a8a,0x4a7a3a,0x8a7a3a,0x6a3a6a,0x9a5a2a]
  };
  const M = c => mat(c);                                   // flat-shaded phong (global)
  const box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c));
  const cyl=(rt,rb,h,s,c)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s), M(c));
  function seat(g,x,z,rot){ g.position.set(x, (typeof gy==='function'?gy(x,z):0), z); if(rot) g.rotation.y=rot;
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } }); scene.add(g); return g; }

  /* -------- 1) TELLER COUNTER RUN — long counter, booth partitions, gold grille ---
     Built along local X (length), open customer face toward -Z. `stations` teller
     bays split by full-height wooden dividers; brass bars rise over each bay. */
  function bankCounterRun(x,z,rot,stations){
    stations=stations||3;
    const g=new THREE.Group();
    const unit=1.05, total=stations*unit;
    // counter body + overhanging top
    const body=box(total,1.0,0.75,C.darkWood); body.position.y=0.5; g.add(body);
    const kick=box(total+0.04,0.16,0.82,C.deepWood); kick.position.y=0.08; g.add(kick);
    const top=box(total+0.18,0.12,0.94,C.litWood); top.position.y=1.02; g.add(top);
    // booth partition posts between + at the ends of every bay
    for(let i=0;i<=stations;i++){
      const px=-total/2 + i*unit;
      const post=box(0.12,1.95,0.9,C.deepWood); post.position.set(px,0.97,0); g.add(post);
      const cap=box(0.2,0.1,0.98,C.midWood); cap.position.set(px,1.98,0); g.add(cap);
    }
    // brass grille bars + top rail over each teller bay, and a little ledger + coin stack
    for(let s=0;s<stations;s++){
      const cx=-total/2 + (s+0.5)*unit;
      for(const bx of [-0.32,0,0.32]){
        const bar=cyl(0.035,0.035,0.9,6,C.brass); bar.position.set(cx+bx,1.55,0.02); g.add(bar);
      }
      const led=box(0.34,0.06,0.26,0xefe6cf); led.position.set(cx,1.11,0.22); led.rotation.y=(s-1)*0.2; g.add(led);
      const coins=cyl(0.09,0.1,0.09,8,C.gold); coins.position.set(cx+0.34,1.13,0.16); g.add(coins);
    }
    const rail=box(total+0.16,0.08,0.09,C.brass); rail.position.set(0,1.99,0.02); g.add(rail);
    return seat(g,x,z,rot);
  }

  /* -------- 2) LEDGER + COIN-BAG SHELVING — tall case flush behind the tellers ---
     Open front toward +Z; rows of leaning ledgers and plump coin sacks. */
  function ledgerShelf(x,z,rot){
    const g=new THREE.Group();
    const cab=box(1.15,1.7,0.4,C.deepWood); cab.position.y=0.85; g.add(cab);
    const shelfY=[0.42,0.86,1.28,1.62];
    shelfY.forEach((sy,row)=>{
      const sh=box(1.0,0.05,0.3,C.litWood); sh.position.set(0,sy,0.06); g.add(sh);
      if(row<3){                                     // ledgers leaning in a row
        for(let i=0;i<5;i++){
          const led=box(0.12,0.3,0.2,C.ledger[(row*5+i)%C.ledger.length]);
          led.position.set(-0.42+i*0.2, sy+0.18, 0.06);
          led.rotation.z=((i+row)%2?1:-1)*0.08; g.add(led);
        }
      } else {                                       // coin sacks on the low shelf
        for(let i=0;i<3;i++){
          const bag=new THREE.Mesh(new THREE.SphereGeometry(0.13,7,6), M(C.sack));
          bag.scale.set(1,0.85,1); bag.position.set(-0.34+i*0.34, sy+0.12, 0.06); g.add(bag);
          const tie=cyl(0.05,0.07,0.06,6,C.sackTie); tie.position.set(-0.34+i*0.34, sy+0.24, 0.06); g.add(tie);
          const c1=cyl(0.05,0.05,0.04,6,C.gold); c1.position.set(-0.34+i*0.34+0.14, sy+0.03, 0.14); g.add(c1);
        }
      }
    });
    return seat(g,x,z,rot);
  }

  /* -------- 3) DEPOSIT CHEST STACK — vault chests with rounded iron-banded lids -- */
  function chest(cw,ch,cd,c){
    const g=new THREE.Group();
    const bodyH=ch*0.62;
    const b=box(cw,bodyH,cd,c); b.position.y=bodyH/2; g.add(b);
    // rounded lid: a shallow half-cylinder along the chest's width
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(ch*0.4,ch*0.4,cw,8,1,false,0,Math.PI), M(C.deepWood));
    lid.rotation.z=Math.PI/2; lid.position.y=bodyH; g.add(lid);
    for(const bx of [-cw*0.34,cw*0.34]){                     // iron straps
      const s=box(0.05,ch*0.95,cd+0.02,C.iron); s.position.set(bx,ch*0.42,0); g.add(s);
    }
    const lock=box(0.14,0.16,0.05,C.brass); lock.position.set(0,bodyH*0.7,cd/2+0.01); g.add(lock);
    return g;
  }
  function depositChestStack(x,z,rot){
    const g=new THREE.Group();
    const a=chest(0.92,0.62,0.6,C.darkWood); a.position.set(-0.28,0,0.1); g.add(a);
    const b=chest(0.82,0.56,0.54,C.midWood); b.position.set(0.42,0,-0.14); g.add(b);
    const c=chest(0.7,0.5,0.5,C.darkWood);  c.position.set(0.0,0.62,0.02); g.add(c);   // stacked atop
    // a small coin spill on the floor
    for(let i=0;i<5;i++){ const co=cyl(0.06,0.06,0.03,7,C.gold);
      co.position.set(-0.6+Math.sin(i*2.1)*0.28, 0.015, 0.42+Math.cos(i*1.7)*0.2); co.rotation.x=Math.PI/2*Math.random(); g.add(co); }
    return seat(g,x,z,rot);
  }

  /* -------- 4) DEPOSIT-BOX BANK — a cabinet grid of little numbered boxes -------- */
  function depositBoxes(x,z,rot){
    const g=new THREE.Group();
    const cab=box(1.05,1.5,0.42,C.deepWood); cab.position.y=0.75; g.add(cab);
    for(let r=0;r<4;r++) for(let cc=0;cc<3;cc++){
      const fx=(cc-1)*0.32, fy=0.28+r*0.34;
      const front=box(0.28,0.28,0.05,C.darkWood); front.position.set(fx,fy,0.22); g.add(front);
      const knob=new THREE.Mesh(new THREE.SphereGeometry(0.03,6,5), M(C.brass)); knob.position.set(fx,fy,0.26); g.add(knob);
    }
    return seat(g,x,z,rot);
  }

  /* -------- 5) BRAIDED BANK RUG — big blue rug with a woven cream border -------- */
  function bankRug(x,z,rot,wid,len){
    wid=wid||1.4; len=len||2.0;
    const g=new THREE.Group();
    const border=box(wid+0.2,0.02,len+0.2,C.rugBorder); border.position.y=0.045; g.add(border);
    const braid =box(wid+0.08,0.024,len+0.08,C.rugBraid); braid.position.y=0.05; g.add(braid);
    const field =box(wid,0.028,len,C.rugField); field.position.y=0.055; g.add(field);
    const inner =box(wid-0.34,0.03,len-0.5,C.rugField2); inner.position.y=0.058; g.add(inner);
    // central medallion
    const med=box(0.34,0.032,0.34,C.rugBorder); med.rotation.y=Math.PI/4; med.position.y=0.06; g.add(med);
    // corner tassels
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      const t=box(0.1,0.02,0.14,C.rugBraid); t.position.set(sx*(wid/2+0.12),0.045,sz*(len/2+0.12)); g.add(t);
    }
    return seat(g,x,z,rot);   // rugs are flat — no collider
  }

  /* -------- collider helper: rotate half-extents, guard, register -------- */
  function addColl(x,z,ex,ez,rot){
    const swap = Math.abs(Math.abs(((rot||0)%Math.PI))-Math.PI/2) < 0.35;
    const hw = swap?ez:ex, hd = swap?ex:ez;
    WORLD.colliders.push({type:'rect', x, z, hw:hw+0.06, hd:hd+0.06});
  }
  /* solid piece: skip entirely if its centre would clip the booth / a wall */
  const skipped=[];
  function solid(builder,x,z,rot,ex,ez,arg){
    if(collides(x,z,0.3)){ skipped.push([x.toFixed(1),z.toFixed(1)]); return null; }
    const g=builder(x,z,rot,arg); addColl(x,z,ex,ez,rot); return g;
  }

  /* -------- placement inside the Bank of Veyhollow hall (centre 13,-12.5) --------
     Interior world box x[8.3..17.7] z[-15.7..-9.3]; door W at (8,-12.5); teller
     booth at (11,-12.5); ladder base ~ (17.1,-15.1). All furniture on the EAST
     half so the west door -> booth lane stays clear. */
  function furnishBank(){
    // teller counter run down the east-centre, facing the customers (west)
    solid(bankCounterRun, 15.2, -12.5, Math.PI/2, 1.68, 0.47, 3);   // ex=len/2, ez=depth/2 (pre-rotate)
    // ledger + coin-bag shelving flush on the far (east) wall, behind the tellers
    solid(ledgerShelf, 17.35, -11.3, -Math.PI/2, 0.58, 0.22);
    solid(ledgerShelf, 17.35, -13.7, -Math.PI/2, 0.58, 0.22);
    // vault chest stack in the north-east back corner (clear of the ladder at 17.1,-15.1)
    solid(depositChestStack, 15.9, -15.0, 0.15, 0.62, 0.46);
    // a bank of deposit boxes against the south wall, opening into the room
    solid(depositBoxes, 16.3, -9.75, Math.PI, 0.55, 0.24);
    // the big braided blue rug just inside the west door (customer side, no collider)
    bankRug(9.7, -12.5, Math.PI/2, 1.4, 2.0);

    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[BANK] The Bank of Veyhollow is furnished — teller counter, ledgers, vault chests, deposit boxes.','sys');
    if(skipped.length) console.warn('[prop_bank_interior] skipped (would clip):', skipped);
  }

  /* -------- boot: wait until the hall (its teller booth) is placed, build once -- */
  function bankHallReady(){
    if(typeof WORLD==='undefined' || !WORLD.colliders) return false;
    return WORLD.colliders.some(c=>c && c.type==='rect' &&
      Math.abs(c.x-11)<0.6 && Math.abs(c.z+12.5)<0.6 && Math.abs((c.hw||0)-1.05)<0.25);
  }
  function ready(){
    return typeof THREE!=='undefined' && typeof scene!=='undefined' && typeof WORLD!=='undefined'
      && typeof gy==='function' && typeof mat==='function' && typeof collides==='function'
      && typeof running!=='undefined' && running && bankHallReady();
  }
  const iv=setInterval(()=>{
    try{ if(ready()){ furnishBank(); clearInterval(iv); } }
    catch(e){ console.error('[prop_bank_interior]', e); clearInterval(iv); }
  }, 1000);
})();
