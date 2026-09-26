#!/usr/bin/env node
/* Combat presentation can never move a combat number (re-based 2026-09-26 on the 2004 engine; the earlier version
 * compared game3_systems.js's old per-frame formulas with commit 9670a03, which the owner's "exact 2004 rules" decision
 * replaced). Static locks:
 *  1. src/combat_fx.js and src/combat_hooks.js never call Math.random and never write hitpoints, XP, cooldowns,
 *     targets, inventory or respawns, nor call a combat function;
 *  2. src/combat_engine.js rolls only through CRShared (no Math.random, no local accuracy / max-hit arithmetic):
 *     every formula is shared/combat.js;
 *  3. src/game3_systems.js keeps no combat roll: its remaining Math.random lines are the known non-rule uses
 *     (spawn nudges, drop scatter, the legacy inline-drop fallback, the mainland boss scripts' own specials, the
 *     Appraise simulation);
 *  4. in every engine attack the roll happens before the first CombatHooks call (presentation reads the roll).
 * Run: node tools/test_combat_fx_static.js */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
let fails=0;const check=(name,cond,detail)=>{if(cond)console.log('  ok  '+name);else{fails++;console.error('  FAIL '+name+(detail?'  '+JSON.stringify(detail).slice(0,400):''))}};
const strip=s=>s.replace(/\r\n/g,'\n').replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"\\])\/\/[^\n]*/g,'$1');
const src=f=>strip(fs.readFileSync(path.join(ROOT,f),'utf8'));
const ASSIGN='(?:=(?!=)|\\+=|-=)';
const writes=[new RegExp('\\bPlayer\\.(?:hp|maxHp|xp|actionDelay|eatDelay|target|spec|inv|equip|spell|prayerPts)\\s*'+ASSIGN),new RegExp('[^.\\w]hp\\s*'+ASSIGN),new RegExp('\\.hp\\s*'+ASSIGN),
  new RegExp('\\bactionDelay\\s*'+ASSIGN),new RegExp('\\brespawnAt\\s*'+ASSIGN),new RegExp('\\.dead\\s*'+ASSIGN),
  /\baddXp\s*\(/,/\b(?:addItem|removeItem|spendRunes)\s*\(/,/\b(?:applyHit|killNpc|makeDrop|dropLoot|playerDeath|npcDamage|damagePlayer)\s*\(/];
for(const f of ['src/combat_fx.js','src/combat_hooks.js']){
  const s=src(f);
  check(f+' never calls Math.random',!/Math\.random/.test(s));
  const hit=writes.filter(r=>r.test(s));
  check(f+' writes no hitpoints / XP / timers / targets / items and calls no combat function',hit.length===0,hit.map(String));
}
const eng=src('src/combat_engine.js');
check('combat_engine.js never calls Math.random (combat rolls use the seedable CRShared.rng stream)',!/Math\.random/.test(eng));
check('combat_engine.js has no local formula arithmetic (+64 rolls, /640 max hits, accuracy branches)',!/\+\s*64\b|\/\s*640\b|rollAccuracy|osrsMaxHit/.test(eng));
check('combat_engine.js rolls hits and damage only through CRShared (C.hitRoll / C.damageRoll)',(eng.match(/C\.hitRoll\(/g)||[]).length>=4&&(eng.match(/C\.damageRoll\(/g)||[]).length>=4);
const g3=src('src/game3_systems.js');
const rnd=g3.split('\n').filter(l=>/Math\.random\(\)/.test(l)).map(l=>l.trim());
const allowed=[/collides\(x,z,0\.4\)|const a=Math\.random\(\)\*6\.28/,/Math\.random\(\)<d\.p|d\.q\[0\]\+Math\.floor\(Math\.random\(\)/,/m\.rotation\.y = Math\.random\(\)\*6/,/mesh\.rotation\.y = Math\.random\(\)\*6/,
  /Math\.ceil\(\(n\._enraged\?(14|7):(9|4)\)\+Math\.random\(\)\*(12|8)\)/,/tx\+0\.5\+\(Math\.random\(\)-0\.5\)\*0\.4/,/R=\(n\)=>Math\.floor\(Math\.random\(\)\*\(n\+1\)\)/,/if\(Math\.random\(\)<a\.(acc|nAcc)\)/,
  /wanderT:Math\.random\(\)\*4/,/Math\.random\(\)<Math\.min\(0\.97/,/d\[i\]=Math\.random\(\)\*2-1/];
const odd=rnd.filter(l=>!allowed.some(r=>r.test(l)));
check('game3_systems.js: every remaining Math.random line is a known non-rule use ('+rnd.length+' lines)',odd.length===0,odd);
check('game3_systems.js keeps no combat formula (no rollAccuracy / osrsMaxHit / (x+8)*(bonus+64))',!/rollAccuracy|osrsMaxHit|\+8\)\s*\*\s*\(/.test(g3));
const fn=(s,name)=>{const i=s.indexOf('function '+name+'(');if(i<0)return '';let d=0;const j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}return ''};
for(const name of ['meleeOnNpc','rangedOnNpc','magicOnNpc','npcAttack']){
  const b=fn(eng,name),iRoll=b.indexOf('C.hitRoll('),iFx=b.indexOf('CombatHooks.');
  check(name+' rolls before its first presentation call',iRoll>0&&iFx>iRoll,{iRoll,iFx});
}
if(fails){console.error('\n'+fails+' combat presentation static check(s) failed.');process.exit(1)}
console.log('\nPASS - presentation cannot move a combat number; the engine rolls only through shared/combat.js.');
