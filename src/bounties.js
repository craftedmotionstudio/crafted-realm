/* ============ Warden Bounties — the Slayer analogue (GOAL.md §5) ============
 * Warden Maela assigns monster-culling contracts scaled to your combat level.
 * Complete them for crowns + a streak bonus. Pure content module: registers
 * its dialogue through the Interact dispatcher, tracks kills on the Events
 * bus, persists via Persist. STORY_BIBLE §2: the Wardens' Guild bounty board.
 */
const Bounties = {
  KEY:'cr_bounty',
  cur:null, streak:0,
  _load(){ const d=Persist.getJSON(this.KEY,null); if(d){ this.cur=d.cur; this.streak=d.streak||0; } },
  _save(){ Persist.setJSON(this.KEY, {cur:this.cur, streak:this.streak}); },
  eligible(){
    const cl=Math.max(3, Player.combatLevel?Player.combatLevel():5);
    return Object.keys(NPC_TYPES).filter(k=>{
      const t=NPC_TYPES[k];
      return t.level>=2 && t.level<=cl*1.4 && t.drops && !t.glb && t.level<25;   // no bosses in bounties
    });
  },
  assign(){
    const pool=this.eligible();
    if(!pool.length){ UI.chat('Maela has no contracts fit for you yet.','plain'); return; }
    const key=pool[Math.floor(Math.random()*pool.length)];
    const t=NPC_TYPES[key];
    const count=5+Math.floor(Math.random()*8);
    this.cur={type:key, name:t.name, need:count, done:0};
    this._save();
    UI.dialogue('Warden Maela',
      `The Guild posts a bounty: <b>${count}× ${t.name}</b>. Bring word when it's done — the Hollow pays well for order.`,
      [{label:'Consider it done.'}], '🛡️');
    UI.chat(`Bounty accepted: slay ${count}× ${t.name}.`,'sys');
  },
  turnIn(){
    if(!this.cur || this.cur.done<this.cur.need) return false;
    const base=this.cur.need*12 + Math.floor(Math.random()*40);
    this.streak++;
    const bonus=Math.min(this.streak,10)*10;
    Player.addItem('coins', base+bonus);
    Player.addXp('Defence', this.cur.need*8);
    UI.chat(`Bounty complete! ${base+bonus} crowns (streak ${this.streak}, +${bonus}).`,'xp');
    if(typeof Deeds!=='undefined'){ Deeds.state.bounties++; Deeds.addLog(`Bounty complete: ${this.cur.need}× ${this.cur.name}`); Deeds.check(); }
    this.cur=null; this._save();
    return true;
  },
  status(){
    if(!this.cur){ UI.chat('No active bounty. Warden Maela has contracts.','plain'); return; }
    UI.chat(`Bounty: ${this.cur.name} — ${this.cur.done}/${this.cur.need}.`,'sys');
  },
};
Bounties._load();

Events.on('npcKilled', ({npc})=>{
  const b=Bounties.cur;
  if(!b || (npc.typeId!==b.type && npc.t.name!==b.name)) return;
  b.done++;
  Bounties._save();
  if(b.done>=b.need) UI.chat(`Bounty filled! Return to Warden Maela. (${b.done}/${b.need})`,'xp');
  else UI.chat(`Bounty: ${b.done}/${b.need} ${b.name}.`,'sys');
});

/* dialogue hooks on Maela herself — the dispatcher adds these to her menu */
Interact.register({
  target:'npc:Warden Maela', option:'Bounty', walkTo:true, reach:2.6,
  handler(){
    if(Bounties.cur){
      if(Bounties.cur.done>=Bounties.cur.need){
        UI.dialogue('Warden Maela', 'The Guild thanks you. Here is your pay — and there is always more work.',
          [{label:'Collect the bounty.', fn:()=>Bounties.turnIn()},
           {label:'Later.'}], '🛡️');
      } else {
        UI.dialogue('Warden Maela',
          `Your contract stands: <b>${Bounties.cur.need}× ${Bounties.cur.name}</b> (${Bounties.cur.done} so far). Abandon it?`,
          [{label:'Keep hunting.'},
           {label:'Abandon the bounty.', fn:()=>{ Bounties.cur=null; Bounties.streak=0; Bounties._save(); UI.chat('Bounty abandoned; your streak resets.','plain'); }}], '🛡️');
      }
    } else {
      UI.dialogue('Warden Maela',
        'The Wardens’ Guild posts culling contracts — steady crowns for steady blades. Take one?',
        [{label:'Give me a bounty.', fn:()=>Bounties.assign()},
         {label:'Not today.'}], '🛡️');
    }
  }
});
