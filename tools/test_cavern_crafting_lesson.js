/* Contract gate for the complete Tutor's Holm mining/smithing lesson.
 * This deliberately verifies the data, action, animation, and authored-asset seams
 * together so a later visual refactor cannot silently break the playable chain. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=read('src/game1_data.js');
const world=read('src/game2_world.js');
const systems=read('src/game3_systems.js');
const loop=read('src/game5_main.js');
const lesson=read('src/holm_tutorial_flow_data.js');
const dagger=read('src/smith_bronze_dagger.js');
const visuals=read('src/crafting_action_visuals.js');
const cavern=read('tools/blender/build_holm_training_cavern_v1.py');
let failures=0;
function check(name,ok){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failures++;}

check('copper and tin ore are real inventory items',/copper_ore\s*:\s*\{/.test(data)&&/tin_ore\s*:\s*\{/.test(data));
check('copper and tin rocks yield the matching ores',/copper:\s*\{[^}]*item:'copper_ore'/.test(world)&&/tin:\s*\{[^}]*item:'tin_ore'/.test(world));
check('bronze smelting consumes one copper and one tin',/bronze_bar:\s*\{[^}]*needs:\{copper_ore:1,\s*tin_ore:1\}/.test(systems));
check('bronze dagger is a one-bar level-one recipe',/unshift\(\{id:'bronze_dagger',\s*name:'Bronze dagger',\s*req:1,\s*bars:1\}\)/.test(dagger));
check('smithing requires a hammer and consumes the selected bar',/Player\.count\('hammer'\)<1/.test(loop)&&/Player\.removeItem\(a\.bar,\s*it\.bars\)/.test(loop));
check('tall station proxies use horizontal interaction reach',/(?:const|let|var) stationDist=Math\.hypot\(player\.position\.x-a\.obj\.position\.x,player\.position\.z-a\.obj\.position\.z\)/.test(loop)&&
  (loop.match(/if\(stationDist>2\.[46]\)/g)||[]).length===2);
check('mining, smelting, and smithing trigger distinct animations',/swing\(player,'mine'\)/.test(loop)&&/swing\(player,'smelt'\)/.test(loop)&&/swing\(player,'smith'\)/.test(loop));
check('modelled player has distinct mining, smithing, and furnace poses',/kind==='mine'/.test(visuals)&&/kind==='smith'/.test(visuals)&&/poseGLB\(active\.kind,dt\)/.test(visuals));
check('temporary presentation tools cover pick, hammer, and furnace tongs',/bestPick\(\)/.test(visuals)&&/function hammer\(\)/.test(visuals)&&/function tongs\(\)/.test(visuals));
const order=['mine_copper','mine_tin','smelt_bronze','forge_dagger'].map(id=>lesson.indexOf("id:'"+id+"'"));
check('tutorial teaches copper, tin, smelting, then dagger forging in order',order.every(n=>n>=0)&&order.every((n,i)=>i===0||n>order[i-1]));
check('authored station includes a recessed furnace and custom-profile anvil',/FurnaceMouthDepth/.test(cavern)&&/FurnaceEmberBed/.test(cavern)&&/profile_prism\("AnvilBody"/.test(cavern)&&/AnvilQuenchBucket/.test(cavern));
check('authored station includes working-context props',/FurnaceBellows/.test(cavern)&&/AnvilTongs/.test(cavern)&&/AnvilHardyHole/.test(cavern));

if(failures){console.error('\nCAVERN CRAFTING CONTRACT FAILED: '+failures);process.exit(1);}
console.log('\nCAVERN CRAFTING CONTRACT PASS');
