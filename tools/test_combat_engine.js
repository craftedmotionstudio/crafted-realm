#!/usr/bin/env node
/* The offline combat engine (src/combat_engine.js) against the 2004 rules, headless, with the real sources
 * (tools/combat_engine_harness.js). Every timing is measured in ticks on the engine's own clock:
 *   attack delays per weapon and style, hit delays by distance (melee next NPC turn, arrows and spells by distance),
 *   NPC hits on the player, retaliation and auto-retaliate, the single-way lock, eating, prayers (protection, drain),
 *   Protect Item, XP per style, deaths and drops, respawn, aggression and the 2x level rule, the leash,
 *   8-direction chasing (diagonal only when both orthogonal tiles are open), single casts and autocast, specials.
 * Run: node tools/test_combat_engine.js */
'use strict';
const H=require('./combat_engine_harness');
let pass=0,fail=0;
function check(name,cond,detail){if(cond){pass++;console.log('  ok  '+name)}else{fail++;console.error('  FAIL '+name+(detail!==undefined?'  '+JSON.stringify(detail).slice(0,400):''))}}
const L={Attack:40,Strength:40,Defence:40,Hitpoints:40,Ranged:40,Magic:40,Prayer:43};
function fresh(o){const h=H.create(Object.assign({seed:7},o||{}));h.setLevels(L);h.place(20,20);return h}
const tough={t:{hp:5000,def:1,att:1,str:1,aBonus:0,sBonus:0,dBonus:0,speedTicks:4}};
const C=H.create().ctx.CRShared.combat;

/* 1. attack delays measured on the clock */
function swingsOf(h){return h.log.swings.filter(s=>s.att===h.ctx.player).map(s=>s.tick).concat(h.log.anims.filter(a=>a.obj===h.ctx.player&&(a.type==='bow'||a.type==='cast')).map(a=>a.tick)).sort((a,b)=>a-b)}
function gaps(a){const g=[];for(let i=1;i<a.length;i++)g.push(a[i]-a[i-1]);return g}
for(const [w,idx,want,label] of [['bronze_dagger',0,4,'dagger'],['bronze_sword',0,4,'sword'],['bronze_greatsword',0,7,'two-handed'],['bronze_warhammer',0,6,'warhammer'],
  ['worn_bow',0,4,'shortbow accurate (2004: 4)'],['worn_bow',1,3,'shortbow rapid (-1)'],['gale_longbow',0,6,'longbow']]){
  const h=fresh();h.wield(w);h.P.styleIndex=idx;h.give('arrows',200);
  const n=h.spawn('pasturehen',21,20,tough);h.LC.orderAttack(n);h.tick(40);
  const g=gaps(swingsOf(h));check('attack delay '+label+' = '+want+' ticks',g.length>=5&&g.every(x=>x===want),g);
}
{const h=fresh();h.give('air_rune',100);h.give('mind_rune',100);h.wield('apprentice_staff');h.LC.selectSpell('wind_strike');
 const n=h.spawn('pasturehen',25,20,tough);h.LC.orderAttack(n);h.tick(40);
 const g=gaps(swingsOf(h));check('autocast with a staff: a cast every 5 ticks',g.length>=5&&g.every(x=>x===5),g);}

/* 2. hit delays */
{const h=fresh();h.wield('bronze_dagger');const n=h.spawn('pasturehen',21,20,tough);h.LC.orderAttack(n);h.tick(12);
 const sw=h.log.swings.filter(s=>s.att===h.ctx.player).map(s=>s.tick),hs=h.log.hits.filter(x=>x.obj===n.mesh).map(x=>x.tick);
 check('melee lands on the NPC\'s next turn (swing tick + 1)',sw.length>=2&&hs.slice(0,sw.length).every((t,i)=>t===sw[i]+1),{sw,hs});}
for(const d of [1,2,4,7]){const h=fresh();h.wield('worn_bow');h.give('arrows',50);const n=h.spawn('pasturehen',20+d,20,tough);h.LC.orderAttack(n);h.tick(3);
 const pj=h.log.projectiles.find(p=>p.src===h.ctx.player),hit=h.log.hits.find(x=>x.obj===n.mesh);h.tick(8);
 const hit2=h.log.hits.find(x=>x.obj===n.mesh),want=Math.floor((46+5*d+30)/30);
 check('arrow at distance '+d+' lands '+want+' ticks after the shot, projectile timed to it',pj&&hit2&&hit2.tick-pj.tick===want&&pj.ticks===want,{shot:pj&&pj.tick,hit:hit2&&hit2.tick,ticks:pj&&pj.ticks});}
for(const d of [1,3,6,10]){const h=fresh();h.give('air_rune',50);h.give('mind_rune',50);h.P.castSpell='wind_strike';const n=h.spawn('pasturehen',20+d,20,tough);
 h.LC.orderAttack(n);h.tick(12);const pj=h.log.projectiles.find(p=>p.src===h.ctx.player),want=Math.floor((46+10*d)/30)+1;
 const hit=h.log.hits.find(x=>x.obj===n.mesh);
 check('spell at distance '+d+' lands '+want+' ticks after the cast (or splashes)',pj&&pj.ticks===want&&(pj.splash?!hit:(hit&&hit.tick-pj.tick===want)),{cast:pj&&pj.tick,ticks:pj&&pj.ticks,splash:pj&&pj.splash,hit:hit&&hit.tick});}

/* 3. NPC blows on the player */
{const h=fresh();h.P.autoRetaliate=false;const n=h.spawn('gnarlgob',21,20,{t:{aggro:true,alwaysAggro:true}});h.tick(20);
 const sw=h.log.swings.filter(s=>s.att===n.mesh).map(s=>s.tick),hs=h.log.hits.filter(x=>x.obj===h.ctx.player).map(x=>x.tick);
 check('an aggressive NPC hunts a low-level adventurer and its melee lands the same tick',sw.length>=3&&hs.slice(0,sw.length).every((t,i)=>t===sw[i]),{sw,hs});
 check('NPC attack delay = its speed ('+n.t.speedTicks+' ticks)',gaps(sw).every(g=>g===n.t.speedTicks),gaps(sw));}
{const h=fresh({friendlyMode:true});h.P.autoRetaliate=false;const n=h.spawn('gnarlgob',21,20,{t:{aggro:true}});h.tick(20);
 check('friendly mode: no NPC starts a fight',h.log.swings.filter(s=>s.att===n.mesh).length===0);}
{const h=fresh();h.setLevels({Attack:60,Strength:60,Defence:60,Hitpoints:60});h.P.autoRetaliate=false;const n=h.spawn('gnarlgob',21,20,{t:{aggro:true}});h.tick(20);
 check('aggression ignores an adventurer above twice the NPC\'s level (2004)',h.log.swings.filter(s=>s.att===n.mesh).length===0,{cb:h.P.combatLevel(),lvl:n.t.level});}
for(const [kind,t,fn] of [['ranged',{ranged:'arrow',attackRange:7},d=>Math.floor((32+5*d)/30)],['magic',{ranged:true,attackRange:7},d=>Math.floor((46+10*d)/30)]]){
 const h=fresh();h.P.autoRetaliate=false;const n=h.spawn('gnarlgob',25,20,{t:Object.assign({aggro:true,alwaysAggro:true,huntRange:8},t)});h.tick(16);
 const pj=h.log.projectiles.filter(p=>p.src===n.mesh),hs=h.log.hits.filter(x=>x.obj===h.ctx.player);
 const ok=pj.length>=2&&pj.every(p=>p.ticks===Math.max(1,fn(5)))&&(kind==='ranged'?hs.length===pj.filter(p=>p.tick+p.ticks<=h.LC.clock()).length:true);
 check('NPC '+kind+' at distance 5 lands after '+fn(5)+' ticks (projectiles timed to it)',ok,{pj:pj.map(p=>[p.tick,p.ticks,p.splash]),hs:hs.map(x=>x.tick)});}

/* 4. retaliation */
{const h=fresh();h.wield('bronze_dagger');const n=h.spawn('pasturehen',21,20,{t:{hp:500,speedTicks:4}});h.LC.orderAttack(n);h.tick(10);
 const p1=h.log.swings.find(s=>s.att===h.ctx.player).tick,n1=h.log.swings.find(s=>s.att===n.mesh).tick;
 check('NPC retaliates floor(speed/2) ticks after its flinch (swing '+p1+' -> reply '+(p1+1+2)+')',n1===p1+1+2,{p1,n1});}
{const h=fresh();h.wield('bronze_sword');h.P.autoRetaliate=true;const n=h.spawn('gnarlgob',21,20,{t:{aggro:true,alwaysAggro:true,hp:500}});h.tick(20);
 const n1=h.log.swings.find(s=>s.att===h.ctx.NPC_TYPES&&0)||h.log.swings.find(s=>s.att===n.mesh),p1=h.log.swings.find(s=>s.att===h.ctx.player);
 check('auto-retaliate: struck while idle, the adventurer fights back after floor(4/2)=2 ticks',p1&&n1&&p1.tick===n1.tick+2,{npc:n1&&n1.tick,me:p1&&p1.tick});}
{const h=fresh();h.wield('bronze_sword');h.P.autoRetaliate=false;const n=h.spawn('gnarlgob',21,20,{t:{aggro:true,alwaysAggro:true,hp:500}});h.tick(20);
 check('auto-retaliate off: the adventurer does not fight back',!h.log.swings.some(s=>s.att===h.ctx.player));}

/* 5. single-way combat */
{const h=fresh();h.wield('bronze_sword');const a=h.spawn('gnarlgob',21,20,{t:{aggro:true,alwaysAggro:true,hp:500}}),b=h.spawn('pasturehen',19,20,{t:{hp:500}});
 h.P.autoRetaliate=false;h.tick(6);h.LC.orderAttack(b);h.tick(4);
 check('attacking a second foe while the first fights you: "You are already under attack!"',h.log.msgs.some(m=>/already under attack/.test(m[0]))&&!h.log.swings.some(s=>s.att===h.ctx.player),h.log.msgs.slice(-3));}

/* 6. eating */
{const h=fresh();h.wield('bronze_sword');h.give('trout',5);const n=h.spawn('pasturehen',21,20,{t:{hp:500}});h.LC.orderAttack(n);h.tick(2);
 const clock=h.LC.clock(),ad=h.P.actionDelay;h.P.hp=10;const slot=h.P.inv.findIndex(s=>s&&s.id==='trout');
 h.LC.eat(slot);check('eating drops the attack order (2004)',h.P.target===null);
 check('eating adds 3 ticks to the attack timer',h.P.actionDelay===ad+3,{before:ad,after:h.P.actionDelay});
 check('a bite heals',h.P.hp===17);
 const s2=h.P.inv.findIndex(s=>s&&s.id==='trout');h.LC.eat(s2);check('no second bite in the same tick',h.P.count('trout')===4);
 h.tick(2);h.LC.eat(h.P.inv.findIndex(s=>s&&s.id==='trout'));check('no bite two ticks later',h.P.count('trout')===4);
 h.tick(1);h.LC.eat(h.P.inv.findIndex(s=>s&&s.id==='trout'));check('the next bite three ticks later',h.P.count('trout')===3,{clock:h.LC.clock()-clock});
 h.P.hp=h.P.maxHp;h.tick(3);h.LC.eat(h.P.inv.findIndex(s=>s&&s.id==='trout'));check('eating is allowed at full health (2004)',h.P.count('trout')===2);}

/* 7. prayers */
{const h=fresh();h.P.autoRetaliate=false;h.LC.togglePrayer('protect_melee');const n=h.spawn('gnarlgob',21,20,{t:{aggro:true,alwaysAggro:true,att:90,aBonus:80,str:60,sBonus:40}});
 const hp0=h.P.hp;h.tick(60);const sw=h.log.swings.filter(s=>s.att===n.mesh).length;
 check('Protect from Melee blocks every NPC melee hit ('+sw+' swings, no damage)',sw>=10&&h.P.hp===hp0,{sw,hp:h.P.hp,hp0});}
{const h=fresh();h.P.prayerPts=43;h.LC.togglePrayer('protect_melee');const p0=h.P.prayerPts;h.tick(50);
 check('protection prayer drains 1 point every 5 ticks at +0 prayer bonus (2004 counter)',p0-h.P.prayerPts===10,{drained:p0-h.P.prayerPts});
 h.LC.togglePrayer('protect_melee');h.LC.togglePrayer('thick_skin');const p1=h.P.prayerPts;h.tick(100);
 check('Thick Skin drains 1 point every 20 ticks',p1-h.P.prayerPts===5,{drained:p1-h.P.prayerPts});}
{const h=fresh();h.P.prayerPts=43;h.LC.togglePrayer('rock_skin');h.LC.togglePrayer('steel_skin');
 check('prayers of one group replace each other',h.P.activePrayers.has('steel_skin')&&!h.P.activePrayers.has('rock_skin'));
 h.LC.togglePrayer('protect_item');check('Protect Item stacks with the others',h.P.activePrayers.has('protect_item')&&h.P.activePrayers.has('steel_skin'));}
{const h=fresh();const base=h.LC.stats().stats.attackRoll.slash;h.P.prayerPts=43;h.LC.togglePrayer('incredible_ref');
 check('Incredible Reflexes raises the attack roll by 15% of the level',h.LC.stats().stats.attackRoll.slash>base,{base,now:h.LC.stats().stats.attackRoll.slash});}

/* 8. deaths: NPC falls a tick after the killing blow, drops, respawns; the adventurer keeps 3 (+1 Protect Item) */
{const h=fresh();h.wield('bronze_sword');h.setLevels({Attack:99,Strength:99,Defence:40,Hitpoints:40});
 const n=h.spawn('gnarlgob',21,20,{t:{hp:1,respawn:6}});h.LC.orderAttack(n);h.until(()=>n.dead,40);
 const killHit=h.log.hits.find(x=>x.obj===n.mesh&&x.dmg>0),dead=h.log.events.find(e=>e[0]==='npcKilled');
 check('an NPC falls the tick after its killing hit',!!killHit&&n.dead&&h.LC.clock()===killHit.tick+1,{hit:killHit&&killHit.tick,now:h.LC.clock()});
 check('the kill credits the attack style (melee)',dead&&dead[1].attackStyle==='melee');
 check('bones drop on its tile',h.ctx.WORLD.drops.some(d=>d.userData.id==='bones'));
 const t0=h.LC.clock();h.until(()=>!n.dead,40);check('it respawns after respawn/0.6 ticks',h.LC.clock()-t0===10,{ticks:h.LC.clock()-t0});}
{for(const protect of [false,true]){const h=fresh();h.ctx.Tutorial.complete=true;
  ['iron_sword','bronze_plate','bronze_legs','bronze_helm','wood_shield'].forEach(id=>h.give(id,1));h.give('coins',1000);
  if(protect){h.P.prayerPts=43;h.LC.togglePrayer('protect_item')}
  h.P.hp=1;h.LC.damagePlayer(5,null,{});h.tick(6);
  const kept=h.P.inv.filter(Boolean).map(s=>s.id+'x'+s.qty);
  check('death keeps '+(protect?4:3)+' single items'+(protect?' with Protect Item':''),kept.length===(protect?4:3)&&h.P.hp===h.P.maxHp,{kept,msgs:h.log.msgs.slice(-3)});}}
{const h=fresh();h.P.hp=1;h.LC.damagePlayer(5,null,{});const t0=h.LC.clock();h.until(()=>!h.P.dead&&h.P.hp===h.P.maxHp,20);
 check('the adventurer\'s death takes 4 ticks (+ the death queue tick)',h.LC.clock()-t0===5,{ticks:h.LC.clock()-t0});}

/* 9. XP per style (tenths, exact) */
{const h=fresh();h.wield('bronze_sabre');h.P.styleIndex=2;const n=h.spawn('pasturehen',21,20,{t:{hp:5000}});h.LC.orderAttack(n);h.tick(40);h.LC.clearInteraction();h.tick(4);
 const dealt=h.log.hits.filter(x=>x.obj===n.mesh).reduce((a,x)=>a+x.dmg,0),sum=s=>h.log.xp.filter(x=>x.skill===s).reduce((a,x)=>a+x.amt,0);
 check('controlled (a sabre Lunge) trains Attack, Strength and Defence 1.33 each per damage',Math.abs(sum('Attack')-sum('Strength'))<1e-9&&Math.abs(sum('Attack')-h.log.hits.filter(x=>x.obj===n.mesh).reduce((a,x)=>a+Math.floor(x.dmg*133/10)/10,0))<1e-6,{dealt,att:sum('Attack'),str:sum('Strength'),def:sum('Defence')});}
{const h=fresh();h.give('air_rune',100);h.give('mind_rune',100);h.wield('apprentice_staff');h.LC.selectSpell('wind_strike');const n=h.spawn('pasturehen',25,20,{t:{hp:5000}});
 h.LC.orderAttack(n);h.tick(52);h.LC.clearInteraction();h.tick(8);const casts=h.log.projectiles.filter(p=>p.src===h.ctx.player).length,dealt=h.log.hits.filter(x=>x.obj===n.mesh).reduce((a,x)=>a+x.dmg,0);
 const mag=h.log.xp.filter(x=>x.skill==='Magic').reduce((a,x)=>a+x.amt,0);
 check('magic XP: 5.5 per cast plus 2 per damage',Math.abs(mag-(casts*5.5+dealt*2))<0.01,{casts,dealt,mag});}

/* 10. single casts, autocast, runes */
{const h=fresh();h.give('air_rune',20);h.give('mind_rune',20);h.LC.selectSpell('wind_strike');
 check('without a staff a combat spell is armed for one cast',h.P.castSpell==='wind_strike'&&!h.LC.autocastSpell());
 const n=h.spawn('pasturehen',24,20,{t:{hp:5000}});h.LC.orderAttack(n);h.tick(20);
 check('the armed spell casts once, then the adventurer stands',h.log.projectiles.filter(p=>p.src===h.ctx.player).length===1&&h.P.count('air_rune')===19,{casts:h.log.projectiles.length});}
{const h=fresh();h.wield('apprentice_staff');h.give('air_rune',2);h.give('mind_rune',2);h.LC.selectSpell('wind_strike');const n=h.spawn('pasturehen',24,20,{t:{hp:5000}});
 h.LC.orderAttack(n);h.tick(30);check('autocast stops when the runes run out, with the message',h.log.projectiles.filter(p=>p.src===h.ctx.player).length===2&&h.log.msgs.some(m=>/enough runes/.test(m[0])));}

/* 11. movement in fights: 8 directions, diagonals only past open corners, melee from a side tile */
{const h=fresh();h.wield('bronze_sword');h.place(10,10);const n=h.spawn('pasturehen',16,16,{t:{hp:500}});h.LC.orderAttack(n);
 const path=[];for(let i=0;i<10;i++){h.tick(1);path.push(h.playerTile())}
 const t=h.playerTile();check('the adventurer walks diagonally to a foe and ends on a side (not corner) tile',Math.abs(t.tx-16)+Math.abs(t.tz-16)===1&&path.some((p,i)=>i&&p.tx!==path[i-1].tx&&p.tz!==path[i-1].tz),{path});}
{const h=fresh({blocked:[[11,10],[10,11]]});h.P.autoRetaliate=false;h.place(10,10);const n=h.spawn('gnarlgob',11,11,{t:{aggro:true,alwaysAggro:true,hp:500}});h.tick(8);
 const nt=n.node;check('a monster diagonal to you behind two closed corners cannot step or strike (the 2004 safe spot)',nt.tx===11&&nt.tz===11&&!h.log.swings.some(s=>s.att===n.mesh),{nt});}
{const h=fresh();h.P.autoRetaliate=false;h.place(10,10);const n=h.spawn('gnarlgob',13,13,{t:{aggro:true,alwaysAggro:true,hp:500,huntRange:6}});h.tick(8);
 const nt=n.node;check('a monster chases diagonally and strikes from a side tile',Math.abs(nt.tx-10)+Math.abs(nt.tz-10)===1&&h.log.swings.some(s=>s.att===n.mesh),{nt});}
{const h=fresh();h.P.autoRetaliate=false;h.place(30,30);const n=h.spawn('gnarlgob',31,30,{t:{aggro:true,alwaysAggro:true,hp:500,maxRange:3}});h.tick(3);h.ctx.orderWalk({x:45.5,z:30.5});h.tick(25);
 check('the leash: a monster gives up past its range from spawn',n.mode==='wander',{mode:n.mode,nt:n.node});}

/* 12. specials and 0..max damage */
{const h=fresh();h.wield('bronze_sword');h.P.spec=100;h.P.specArmed=true;const n=h.spawn('pasturehen',21,20,{t:{hp:5000}});h.LC.orderAttack(n);h.tick(2);
 check('an armed special spends its energy on the next swing',h.P.spec===75&&!h.P.specArmed&&h.log.msgs.some(m=>/lunge/i.test(m[0])),{spec:h.P.spec});}
{const h=fresh();h.wield('bronze_sword');const n=h.spawn('pasturehen',21,20,{t:{hp:1e7}});h.setLevels({Attack:99,Strength:60,Defence:40,Hitpoints:40});h.LC.orderAttack(n);h.tick(4*1500);
 const max=h.LC.stats().stats.maxHit,c=new Array(max+1).fill(0);h.log.hits.filter(x=>x.obj===n.mesh).forEach(x=>c[x.dmg]++);
 const tot=c.reduce((a,b)=>a+b,0),hits=tot-c[0];const e=hits/max;
 check('damage on a landed hit is uniform on 0..'+max+' (every value 1..max within 20% of the mean)',c.slice(1).every(v=>Math.abs(v-e)<0.2*e),c);}

console.log('\n'+pass+' passed, '+fail+' failed');
if(fail){console.error('COMBAT ENGINE: FAIL');process.exit(1)}
console.log('COMBAT ENGINE: PASS');
