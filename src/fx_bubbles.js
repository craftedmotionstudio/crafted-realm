/* ============ fx_bubbles — overhead chat text + ambient village chatter ============
 * The OSRS overhead-text renderer (yellow, floats above the head, fades) plus
 * ambient life: nearby villagers occasionally mutter Veyhollow flavor lines.
 * `sayOverhead(mesh, text, secs)` is public — the future type-to-chat feature
 * renders through the same function.
 */
function sayOverhead(mesh, text, secs){
  if(!mesh || typeof THREE==='undefined') return null;
  const c=document.createElement('canvas'); c.width=512; c.height=56;
  const x=c.getContext('2d');
  x.font='bold 26px Verdana'; x.textAlign='center';
  x.fillStyle='#000'; x.fillText(text, 257, 37);
  x.fillStyle='#ffff00'; x.fillText(text, 256, 36);
  const tex=new THREE.CanvasTexture(c);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true}));
  const w=Math.min(6.4, Math.max(2.2, text.length*0.24));
  spr.scale.set(w, w*56/512, 1);
  spr.position.y=2.55;
  spr.renderOrder=999;
  mesh.add(spr);
  const t0=performance.now(), dur=(secs||3.4)*1000;
  const iv=setInterval(()=>{
    const f=(performance.now()-t0)/dur;
    if(f>=1){ clearInterval(iv); if(spr.parent) spr.parent.remove(spr); spr.material.map.dispose(); spr.material.dispose(); return; }
    spr.material.opacity = f>0.75 ? 1-(f-0.75)/0.25 : 1;
  }, 120);
  return spr;
}

const VillageChatter = {
  LINES:[
    'Fine weather over the Hollow today.',
    'Mind the grubkins by the east fence…',
    'The Well never runs dry, they say.',
    'Ferra’s forge has been roaring all week.',
    'They say the fen lights walk at dusk.',
    'A pint at the Grub after this, I think.',
    'Wardens took another bounty this morning.',
    'The old stones hum if you stand close.',
    'Bram’s rowed three newcomers in this week.',
    'Smells like rain off the Mirrorpond.',
    'Keep clear of the Scarlands, friend.',
    'These hens lay better since the spring.',
  ],
  _iv:null,
  start(){
    this._iv=setInterval(()=>{
      if(typeof WORLD==='undefined' || typeof player==='undefined' || (typeof running!=='undefined' && !running)) return;
      if(Math.random()<0.45) return;                       // not on every beat — sporadic
      // candidates: living friendlies/bots near the player, on the player's plane
      const near=[];
      const consider=(m)=>{ if(!m) return;
        const d=Math.hypot(m.position.x-player.position.x, m.position.z-player.position.z);
        if(d<24 && m.visible) near.push(m); };
      (WORLD.clickables||[]).forEach(o=>{ if(o.userData && o.userData.kind==='friendly') consider(o); });
      (typeof Bots!=='undefined' && Bots.list ? Bots.list : []).forEach(b=>consider(b.mesh||b.g||null));
      if(!near.length) return;
      const m=near[Math.floor(Math.random()*near.length)];
      if(m.userData._chatCd && performance.now()<m.userData._chatCd) return;
      m.userData._chatCd=performance.now()+30000;          // one line per villager per 30s
      sayOverhead(m, this.LINES[Math.floor(Math.random()*this.LINES.length)]);
    }, 6500);
  },
  stop(){ clearInterval(this._iv); this._iv=null; },
};
if(typeof Overlays!=='undefined'){
  Overlays.register({ id:'village-chatter', name:'Village chatter',
    desc:'Nearby townsfolk occasionally speak overhead, OSRS-style.', defaultOn:true,
    start:()=>VillageChatter.start(), stop:()=>VillageChatter.stop() });
} else VillageChatter.start();
