#!/usr/bin/env node
/* Combat feel pass (2026-09-25): static lock that the presentation layer cannot move a combat number.
 *  1. src/combat_fx.js never calls Math.random and never writes hp, XP, cooldowns, inventory or targets.
 *  2. Every Math.random roll line in src/game3_systems.js (accuracy, damage, drops, NPC rolls) is byte-identical,
 *     in the same order, to the commit before the pass (9670a03); so is every roll / bonus / max-hit / cooldown /
 *     hp / XP statement in playerAttack, npcAttack, applyHit and the projectile landing; combat_math.js and
 *     game1_data.js (formulas, XP table) are untouched.
 *  3. The combat call sites roll before any CombatFX call (the FX read the roll, never feed it).
 * The seeded in-game replay (tools/qa_holm_combat_numbers.js) proves the same end to end.
 * Run: node tools/test_combat_fx_static.js */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..'),BASE='9670a03';
let fails=0;const check=(name,cond,detail)=>{if(cond)console.log('  ok  '+name);else{fails++;console.error('  FAIL '+name+(detail?'  '+JSON.stringify(detail).slice(0,400):''))}};
const lf=s=>s.replace(/\r\n/g,'\n');
const now=f=>lf(fs.readFileSync(path.join(ROOT,f),'utf8'));
const then=f=>{try{return lf(cp.execSync('git show '+BASE+':'+f,{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}))}catch(e){return null}};

// 1. the FX layer
const fx=now('src/combat_fx.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
check('combat_fx.js never calls Math.random (its particle scatter uses a private LCG)',!/Math\.random/.test(fx));
const ASSIGN='(?:=(?!=)|\\+=|-=)';
const writes=[new RegExp('\\bPlayer\\.(?:hp|maxHp|xp|attackCd|target|spec|inv|equip|spell)\\s*'+ASSIGN),new RegExp('\\.hp\\s*'+ASSIGN),
  new RegExp('\\battackCd\\s*'+ASSIGN),new RegExp('\\brespawnT\\s*'+ASSIGN),new RegExp('\\.dead\\s*'+ASSIGN),
  /\baddXp\s*\(/,/\b(?:addItem|removeItem|spendRunes)\s*\(/,/\b(?:applyHit|killNpc|playerAttack|npcAttack|makeDrop|dropLoot|playerDeath)\s*\(/];
const hitW=writes.filter(r=>r.test(fx));
check('combat_fx.js writes no hp / XP / cooldown / target / inventory / respawn and calls no combat function',hitW.length===0,hitW.map(String));

// 2. the combat code, against the commit before the pass
const g3=now('src/game3_systems.js'),g3b=then('src/game3_systems.js');
if(g3b===null){console.log('  skip history comparisons: '+BASE+' not in this checkout');}
else{
  const rolls=s=>s.split('\n').filter(l=>/Math\.random\(\)/.test(l)).map(l=>l.trim());
  const a=rolls(g3b),b=rolls(g3);
  check('game3_systems.js: all '+a.length+' Math.random roll lines unchanged and in order',JSON.stringify(a)===JSON.stringify(b),{before:a.length,now:b.length,firstDiff:a.find((l,i)=>l!==b[i])});
  const fn=(s,name)=>{const i=s.indexOf('function '+name+'(');if(i<0)return '';let d=0;const j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}return ''};
  const RX=new RegExp([
    '(?:const|let)\\s+(?:attRoll|defRoll|hitChance|maxHit|dmg|skillLv|atype|range|sizeReach|meleeReach|style|sdef|spellDef|spec)\\s*=[^;]+;',
    'Player\\.addXp\\([^;]*;','give\\(\'[^\']*\',[^)]*\\)','attackCd\\s*=[^;]+;','if\\(spec\\)[^;]+;','if\\(dmg>0 && [^;]+;',
    'if\\(npc\\.t\\.harmless\\) dmg=0;','hp\\s*-=\\s*[^;]+;','spec=SPECIALS[^;]+;','Player\\.spec-=[^;]+;','Player\\.removeItem\\([^;]+;','Player\\.spendRunes\\([^;]+;',
    'killNpc\\([^;]+;','applyHit\\([^;]+;'].join('|'),'g');
  const norm=x=>x.replace(/\s+/g,' ');
  const core=s=>['playerAttack','npcAttack','applyHit','fireBoltAtPlayer','updateProjectiles'].map(n=>(fn(s,n).match(RX)||[]).map(norm).join('\n')).join('\n---\n');
  const cb=core(g3b),cn=core(g3),lb=cb.split('\n'),ln=cn.split('\n');
  check('playerAttack / npcAttack / applyHit / projectile landing: all '+lb.filter(l=>l!=='---').length+' roll, bonus, max-hit, cooldown, hp, rune/arrow and XP statements unchanged',cb===cn,{firstDiff:[lb.find((l,i)=>l!==ln[i]),ln.find((l,i)=>l!==lb[i])]});
  for(const f of ['src/combat_math.js','src/game1_data.js']){const b0=then(f);check(f+' unchanged since '+BASE+' (formulas, XP table)',b0!==null&&b0===now(f))}
  // 3. the FX are handed the roll after it is made
  const pa=fn(g3,'playerAttack'),iRoll=pa.indexOf('const dmg = Math.random()'),iFx=pa.indexOf('CombatFX.');
  check('playerAttack rolls before it calls CombatFX',iRoll>0&&iFx>iRoll,{iRoll,iFx});
  const na=fn(g3,'npcAttack'),nRoll=na.lastIndexOf('let dmg = Math.random()'),nFx=na.indexOf('CombatFX.npcMelee');
  check('npcAttack rolls before it calls CombatFX',nRoll>0&&nFx>nRoll,{nRoll,nFx});
}
if(fails){console.error('\n'+fails+' combat-feel static check(s) failed.');process.exit(1)}
console.log('\nPASS - the combat feel layer cannot move a combat number.');
