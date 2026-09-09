/* Read-only acceptance gate for the recovered Fable side-work bundle.
 *
 * Keeps the useful tiered gear-icon family reproducible while preventing the
 * visually rejected, source-less avatar prototype from silently replacing the
 * previously accepted player.glb again.
 */
'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;
function check(name,ok,detail){
  if(ok){pass++;console.log('ok  ',name);}
  else{fail++;console.error('FAIL',name+(detail?' — '+detail:''));}
}
function read(rel){return fs.readFileSync(path.join(ROOT,rel));}
function sha(rel){return crypto.createHash('sha256').update(read(rel)).digest('hex');}
function pngSize(rel){
  const b=read(rel);
  if(b.length<24||b.toString('hex',0,8)!=='89504e470d0a1a0a')return null;
  return [b.readUInt32BE(16),b.readUInt32BE(20)];
}
function glbJson(rel){
  const b=read(rel);
  if(b.length<20||b.toString('ascii',0,4)!=='glTF'||b.readUInt32LE(4)!==2)return null;
  const jsonLength=b.readUInt32LE(12);
  return JSON.parse(b.toString('utf8',20,20+jsonLength));
}

const tiers=['copper','bronze','iron','steel','whitsteel','aurel','veyrite','undercrag'];
const templates=['longsword','sabre','battleaxe','kiteshield','helm','mace','warhammer',
  'greatsword','medhelm','sqshield','chainbody','plateskirt'];
const singles=['gale_longbow','leather_chaps','leather_gloves','leather_boots','iron_dagger'];
const expected=[...tiers.flatMap(t=>templates.map(x=>`${t}_${x}.png`)),...singles.map(x=>`${x}.png`)].sort();
const iconDir=path.join(ROOT,'assets','icons','gear');
const actual=fs.readdirSync(iconDir).filter(n=>n.endsWith('.png')).sort();
check('tiered gear family contains exactly 101 declared sprites',
  actual.length===101&&JSON.stringify(actual)===JSON.stringify(expected),
  `expected 101, found ${actual.length}`);
const badPng=expected.filter(name=>{
  const rel=path.join('assets','icons','gear',name),size=pngSize(rel);
  return !size||size[0]!==128||size[1]!==128;
});
check('every gear sprite is a valid 128x128 PNG',badPng.length===0,badPng.join(', '));

const iconSource=read('src/game0_icons.js').toString('utf8');
check('runtime declares every tiered template',templates.every(x=>iconSource.includes(`'${x}'`)));
check('runtime declares every single sprite',singles.every(x=>iconSource.includes(`'${x}'`)));
check('runtime resolves accepted gear sprites from assets/icons/gear',
  /assets\/icons\/gear\//.test(iconSource)&&/_gearSprite\(id\)/.test(iconSource));

const generator=read('tools/gen_gear_icons.js').toString('utf8');
check('image generator reads the API key only from the environment',
  /process\.env\.GEMINI_API_KEY/.test(generator)&&!/AIza[0-9A-Za-z_-]{20,}/.test(generator));
check('tier recolor script is banked',fs.existsSync(path.join(ROOT,'tools','recolor_gear_tiers.py')));

const canonical='assets/models/player.glb';
const backup='assets/models/player_prev_20260718.glb.bak';
const experimental='assets/models/male_default.glb';
const canonicalJson=glbJson(canonical),experimentalJson=glbJson(experimental);
check('canonical player is restored byte-identical to the accepted backup',sha(canonical)===sha(backup));
check('Fable avatar remains separate from the canonical player',sha(experimental)!==sha(canonical));
check('canonical player remains a skinned four-clip GLB',canonicalJson&&
  (canonicalJson.skins||[]).length===1&&['idle','walk','attack','block'].every(n=>(canonicalJson.animations||[]).some(a=>a.name===n)));
check('experimental avatar remains inspectable but unpromoted',experimentalJson&&
  (experimentalJson.skins||[]).length===1&&['idle','walk','attack','block'].every(n=>(experimentalJson.animations||[]).some(a=>a.name===n)));

const html=read('index.html');
const htmlText=html.toString('utf8');
const mojibake=['â€”','ðŸ','Ã—','â€¦','ï¸','Â·'];
check('index.html has no UTF-8 byte-order marker',!(html[0]===0xef&&html[1]===0xbb&&html[2]===0xbf));
check('index.html contains no known mojibake markers',!mojibake.some(s=>htmlText.includes(s)),
  mojibake.filter(s=>htmlText.includes(s)).join(', '));

console.log(`\nFable side-work recovery: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
