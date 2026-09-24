/* ============ Tutor's Holm extension — all three combat styles + banking (GOAL.md §4) ============
 * The original brief: Tutorial Island teaches melee, RANGED (bow + a few
 * arrows), MAGIC (starter runes), gathering AND banking. The base tutorial
 * covers melee + gathering; this module splices in the missing steps, grants
 * the style kits at the right moment, spawns a bank chest on the Holm, and
 * detects styled kills through the Events bus. Content module — no engine edits.
 */
(function(){
  if(typeof Tutorial==='undefined') return;

  /* 1. splice the new steps in after the melee grubkin kill (index 6), before "return to Bram" */
  const extra=[
    {text:'Prepare your teaching shortbow and arrows. Wield them and fell a grubkin from range.', ev:'killStyle', match:'ranged'},
    {text:'Prepare your teaching runes. Open your spellbook, choose Wind Strike, and blast a grubkin.',  ev:'killStyle', match:'magic'},
    {text:'Stow your spoils: click the bank chest by the rowboat and deposit anything.',          ev:'bank',      match:'open'},
  ];
  const at=Tutorial.steps.findIndex(s=>s.ev==='talk' && s.match==='bram_done');
  if(at>0 && !Tutorial.steps.some(s=>s.ev==='killStyle')) Tutorial.steps.splice(at, 0, ...extra);

  /* 2. grant each kit when its step comes up (once) */
  function grantForStep(){
    if(Tutorial.complete) return;
    const s=Tutorial.steps[Tutorial.step]; if(!s) return;
    if((s.match==='ranged'||s.match==='magic')&&typeof HolmCombatKits!=='undefined')HolmCombatKits.claim(s.match);
  }
  const origBanner=Tutorial.banner.bind(Tutorial);
  Tutorial.banner=function(){ origBanner(); try{ grantForStep(); }catch(e){} };

  /* 3. Use the killing attack's style, retained through projectile travel.
     Administrative or unattributed kills cannot award a styled lesson. */
  Events.on('npcKilled', payload=>{
    if(Tutorial.complete) return;
    const style=payload&&payload.attackStyle;
    if(!['melee','ranged','magic'].includes(style)) return;
    Tutorial.notify('killStyle', style);
  });

  /* 4. a bank chest on the Holm (near Bram's rowboat) + the banking step notifier */
  function spawnChest(){
    if(typeof scene==='undefined' || typeof groundY!=='function' || typeof ZONES==='undefined') return;
    const h=ZONES.holm && ZONES.holm.pos; if(!h) return;
    const x=h[0]+3, z=h[1]-2;
    const y=groundY(x,z); if(y===null||y<-1) return;
    const g=new THREE.Group();
    const box=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.6), new THREE.MeshLambertMaterial({color:0x6a4a26}));
    box.position.y=0.28; box.castShadow=true; g.add(box);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(0.94,0.16,0.64), new THREE.MeshLambertMaterial({color:0x8a6437}));
    lid.position.y=0.62; g.add(lid);
    const band=new THREE.Mesh(new THREE.BoxGeometry(0.96,0.1,0.66), new THREE.MeshLambertMaterial({color:0x3a3a44}));
    band.position.y=0.42; g.add(band);
    g.position.set(x,y,z);
    g.userData={kind:'bank', label:'Use <b>Bank chest</b>'};
    scene.add(g); WORLD.clickables.push(g);
  }
  const boot=setInterval(()=>{
    if(typeof CRWorldMode!=='undefined'&&!CRWorldMode.legacy){ clearInterval(boot); return; }
    if(typeof scene!=='undefined' && typeof WORLD!=='undefined' && WORLD.clickables && typeof groundY==='function'){
      clearInterval(boot); spawnChest();
    }
  }, 1500);
  /* opening any bank advances the banking step */
  const origOpen=UI.openBank.bind(UI);
  UI.openBank=(announce)=>{ const r=origOpen(announce); try{ Tutorial.notify('bank','open'); }catch(e){} return r; };
})();
