/* ============ Realm Deeds + Activity Log (GOAL.md §15 — the retention meta-layer) ============
 * Zenyte lesson: achievements + an adventurer's log sit ON TOP of existing
 * systems and multiply engagement for free. Pure content module: listens on
 * the Events bus, persists via Persist, zero engine edits.
 *   - DEEDS: data-driven achievements with crown rewards and TITLES
 *   - Log: a timestamped adventurer's log (kills, levels, deeds, quests)
 *   - UI: 📜 button beside the overlays button / Shift+K
 * Titles decorate the player's name tag ("Adventurer, the Grubslayer").
 */
const Deeds = {
  DEFS: [
    {id:'first_blood',  name:'First Blood',      desc:'Defeat your first monster.',            title:null,              crowns:25,  test:s=>s.kills>=1},
    {id:'grubslayer',   name:'Grubslayer',        desc:'Defeat 25 grubkins.',                   title:'the Grubslayer',  crowns:100, test:s=>(s.killsByType.gnarlgob||0)+(s.killsByType.grubkin||0)>=25},
    {id:'centurion',    name:'Centurion',         desc:'Defeat 100 monsters.',                  title:'the Centurion',   crowns:250, test:s=>s.kills>=100},
    {id:'apprentice',   name:'Apprentice',        desc:'Reach level 10 in any skill.',          title:null,              crowns:50,  test:()=>SKILLS.some(k=>Player.lvl(k)>=10)},
    {id:'journeyman',   name:'Journeyman',        desc:'Reach level 30 in any skill.',          title:'the Journeyman',  crowns:150, test:()=>SKILLS.some(k=>Player.lvl(k)>=30)},
    {id:'master',       name:'Master of One',     desc:'Reach level 50 in any skill.',          title:'the Master',      crowns:500, test:()=>SKILLS.some(k=>Player.lvl(k)>=50)},
    {id:'warrior',      name:'Proven Warrior',    desc:'Reach combat level 25.',                title:null,              crowns:200, test:()=>Player.combatLevel&&Player.combatLevel()>=25},
    {id:'first_quest',  name:'Helping Hand',      desc:'Complete your first quest.',            title:null,              crowns:50,  test:()=>Object.values(Player.quests||{}).some(q=>q&&q.done)},
    {id:'quest_lord',   name:'Friend of the Hollow', desc:'Complete five quests.',              title:'of the Hollow',   crowns:400, test:()=>Object.values(Player.quests||{}).filter(q=>q&&q.done).length>=5},
    {id:'wanderlust',   name:'Wanderlust',        desc:'Visit six different regions.',          title:'the Wayfarer',    crowns:150, test:s=>Object.keys(s.zones).length>=6},
    {id:'moneybags',    name:'Moneybags',         desc:'Pick up 1,000 gp worth of loot.',       title:null,              crowns:100, test:s=>s.lootGp>=1000},
    {id:'bounty_hunter',name:'Bounty Hunter',     desc:'Complete three Warden bounties.',       title:'the Bountiful',   crowns:300, test:s=>s.bounties>=3},
    {id:'cipher_solver',name:'Cipher Solver',     desc:'Solve a Cipher Scroll.',                title:'the Keen-eyed',   crowns:200, test:s=>s.clues>=1},
    {id:'best_friend',  name:'Beast Whisperer',   desc:'Earn a pet companion.',                 title:'the Tamer',       crowns:250, test:s=>s.pets>=1},
    {id:'boss_slayer',  name:'Realm Defender',    desc:'Slay a boss of the realm.',             title:'Realm Defender',  crowns:500, test:s=>s.bossKills>=1},
  ],
  KEY:'cr_deeds',
  state:null, log:[],
  _load(){
    const d=Persist.getJSON(this.KEY, null);
    this.state = d && d.state ? d.state : {kills:0, killsByType:{}, bossKills:0, lootGp:0, zones:{}, bounties:0, clues:0, pets:0, done:{}, title:null};
    this.log = d && d.log ? d.log : [];
  },
  _save(){ Persist.setJSON(this.KEY, {state:this.state, log:this.log.slice(-120)}); },
  addLog(text){
    this.log.push({t:Date.now(), text});
    if(this.log.length>150) this.log=this.log.slice(-120);
    this._save();
  },
  check(){
    for(const d of this.DEFS){
      if(this.state.done[d.id]) continue;
      let ok=false; try{ ok=d.test(this.state); }catch(e){}
      if(!ok) continue;
      this.state.done[d.id]=Date.now();
      Player.addItem('coins', d.crowns);
      UI.chat(`🏅 Deed complete: <b>${d.name}</b> — ${d.crowns} crowns!`,'xp');
      if(typeof Sfx!=='undefined'&&Sfx.quest) Sfx.quest();
      this.addLog(`Deed complete: ${d.name}`);
      if(d.title){
        this.state.title=d.title;
        UI.chat(`You may now bear the title “${d.title}”.`,'xp');
        this.applyTitle();
      }
      if(typeof Events!=='undefined') Events.emit('deed', {id:d.id});
    }
    this._save();
  },
  applyTitle(){
    // decorate the player's name tag with the earned title
    if(!this.state.title || typeof player==='undefined' || typeof makeNameTag!=='function') return;
    let old=null;
    player.traverse(o=>{ if(o.isSprite&&o.userData._nameTag) old=o; });
    if(old){
      const tag=makeNameTag(((typeof CharCfg!=='undefined'&&CharCfg.name)||'Adventurer')+', '+this.state.title);
      tag.position.copy(old.position);
      player.add(tag); old.parent.remove(old);
    }
  },
  openPanel(){
    let m=document.getElementById('deeds-modal');
    if(!m){ m=document.createElement('div'); m.id='deeds-modal'; m.className='modal steel';
      m.style.cssText='display:none;max-width:420px;max-height:70vh;overflow:auto;'; document.body.appendChild(m); }
    const done=Object.keys(this.state.done).length;
    const rows=this.DEFS.map(d=>{
      const ok=!!this.state.done[d.id];
      return `<div style="padding:3px 0;border-bottom:1px solid rgba(93,84,71,.4);${ok?'':'opacity:.55'}">`+
        `${ok?'🏅':'⬜'} <b style="color:${ok?'#ffd24a':'#c0b49a'}">${d.name}</b>`+
        `${d.title?` <span style="color:#8fd0ff">“${d.title}”</span>`:''}`+
        `<br><span style="color:#9a8e78;font-size:10px">${d.desc} · ${d.crowns} crowns</span></div>`;
    }).join('');
    const logRows=this.log.slice(-25).reverse().map(l=>{
      const dte=new Date(l.t);
      return `<div style="font-size:10px;color:#c0b49a;padding:1px 0">`+
        `<span style="color:#7a7265">${dte.getMonth()+1}/${dte.getDate()}</span> ${l.text}</div>`;
    }).join('') || '<i style="color:#9a8e78;font-size:10px">Nothing yet — go make history.</i>';
    m.innerHTML=`<span class="close-x" onclick="this.parentElement.style.display='none'">✕</span>`+
      `<div class="osrs-title" style="text-align:center">Realm Deeds — ${done}/${this.DEFS.length}</div>`+
      `<div style="font-size:11px;margin-top:4px">${rows}</div>`+
      `<div class="osrs-title" style="font-size:11px;margin-top:10px">Adventurer's log</div>${logRows}`;
    m.style.display='block';
  },
};
Deeds._load();

/* event wiring — everything the deeds/log observe */
Events.on('npcKilled', ({npc})=>{
  Deeds.state.kills++;
  const id=npc.typeId||npc.t.name;
  Deeds.state.killsByType[id]=(Deeds.state.killsByType[id]||0)+1;
  if(npc.t.level>=25 || npc.t.boss){ Deeds.state.bossKills++; Deeds.addLog('Slew '+npc.t.name+' (level '+npc.t.level+')'); }
  Deeds.check();
});
Events.on('levelUp', ({skill, level})=>{
  if(level%10===0 || level===99) Deeds.addLog('Reached level '+level+' '+skill);
  Deeds.check();
});
Events.on('itemPickup', ({id, qty})=>{
  Deeds.state.lootGp += ((ITEMS[id]&&ITEMS[id].value)||0)*qty;
  Deeds.check();
});
/* zone visits: UI.zone is the single funnel for region banners */
(function(){
  if(typeof UI==='undefined') return;
  const orig=UI.zone.bind(UI);
  UI.zone=(name)=>{ try{ if(name){ Deeds.state.zones[name]=1; Deeds.check(); } }catch(e){} return orig(name); };
})();
/* launcher: 📜 beside the 📊, plus Shift+K */
addEventListener('DOMContentLoaded', ()=>{
  const wb=document.getElementById('worldmap-btn');
  if(wb && wb.parentElement){
    const b=document.createElement('button');
    b.id='deeds-btn'; b.textContent='\u{1F4DC}'; b.title='Realm Deeds & log (Shift+K)';
    b.style.cssText='position:absolute;left:calc(50% + 68px);transform:translateX(-50%);'+
      'bottom:-30px;width:30px;height:26px;background:#4f483c;color:#ffd24a;'+
      'border:2px outset #6b5f4a;cursor:pointer;font-size:13px;line-height:1;';
    b.onclick=()=>Deeds.openPanel();
    wb.parentElement.appendChild(b);
  }
});
addEventListener('keydown', e=>{
  if((e.key==='K'||e.key==='k') && e.shiftKey &&
     !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault();
    const m=document.getElementById('deeds-modal');
    (m && m.style.display==='block') ? (m.style.display='none') : Deeds.openPanel();
  }
});
/* re-apply the earned title once the avatar exists */
const _deedsBoot=setInterval(()=>{
  if(typeof player!=='undefined' && player && Deeds.state.title){ clearInterval(_deedsBoot); Deeds.applyTitle(); }
  if(typeof player!=='undefined' && player && !Deeds.state.title) clearInterval(_deedsBoot);
}, 2500);
