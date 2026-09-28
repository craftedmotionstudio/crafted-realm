/* Local 2004 reference stack control (rs-sdk: Lost City engine + bot gateway), LOCALHOST ONLY.
 * The 2004 game content belongs to Jagex: this script only RUNS the local rs-sdk checkout as a private visual/feel
 * reference. It copies nothing from it; captures go to C:\Users\iQwaZ\ref2004_captures (outside our repo, never committed).
 *
 *   node tools/ref2004/stack.js start    engine (:8888 web, :43594) + gateway (ws://localhost:7780), supervised
 *   node tools/ref2004/stack.js status
 *   node tools/ref2004/stack.js stop     kills only the PIDs this script started (recorded in logs/stack_pids.json)
 *
 * Local config (env only, nothing written into rs-sdk): NODE_TICKRATE=600 (the real 2004 tick, so walk/run pace is
 * authentic; rs-sdk defaults to 400) and EASY_STARTUP=true (runs the login/friend/logger workers in-process: without
 * the logger worker the engine's un-gated player-telemetry socket errors and the engine dies on the first logout). */
'use strict';
const {spawn,execSync}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http');
const RS=process.env.RS_SDK||'C:/Users/iQwaZ/rs-sdk';
const BUN=process.env.BUN||'C:/Users/iQwaZ/.bun/bin/bun.exe';
const CAP=process.env.REF2004_CAPTURES||'C:/Users/iQwaZ/ref2004_captures';
const LOGS=path.join(CAP,'logs'),PIDS=path.join(LOGS,'stack_pids.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(LOGS,{recursive:true});

function get(url){return new Promise(res=>{const r=http.get(url,x=>{x.resume();res(x.statusCode)});r.on('error',()=>res(0));r.setTimeout(3000,()=>{r.destroy();res(0)})})}
function alive(pid){try{process.kill(pid,0);return true}catch(e){return false}}
function readPids(){try{return JSON.parse(fs.readFileSync(PIDS,'utf8'))}catch(e){return {}}}

// The supervisor is a tiny detached node loop that restarts the engine if it exits (the engine can still die on odd
// client disconnects); it is the only process whose PID we need to stop - it kills its children on SIGTERM/stop file.
const SUPERVISOR=`
const {spawn}=require('child_process'),fs=require('fs');
const [BUN,RS,LOGS]=process.argv.slice(2);
const env=Object.assign({},process.env,{NODE_TICKRATE:'600',EASY_STARTUP:'true'});
let eng=null,gw=null,stopping=false;
const log=(f)=>fs.openSync(LOGS+'/'+f,'a');
function startEngine(){if(stopping)return;eng=spawn(BUN,['run','src/app.ts'],{cwd:RS+'/server/engine',env,stdio:['ignore',log('engine.log'),log('engine.log')],windowsHide:true});
  fs.writeFileSync(LOGS+'/engine.pid',String(eng.pid));eng.on('exit',c=>{fs.appendFileSync(LOGS+'/engine.log','\\n[supervisor] engine exited '+c+' '+new Date().toISOString()+'\\n');setTimeout(startEngine,3000)})}
function startGateway(){if(stopping)return;gw=spawn(BUN,['server/gateway/gateway.ts'],{cwd:RS,env,stdio:['ignore',log('gateway.log'),log('gateway.log')],windowsHide:true});
  fs.writeFileSync(LOGS+'/gateway.pid',String(gw.pid));gw.on('exit',c=>{fs.appendFileSync(LOGS+'/gateway.log','\\n[supervisor] gateway exited '+c+'\\n');setTimeout(startGateway,3000)})}
startEngine();startGateway();
setInterval(()=>{if(fs.existsSync(LOGS+'/stack.stop')){stopping=true;try{fs.unlinkSync(LOGS+'/stack.stop')}catch(e){}
  for(const p of [eng,gw])if(p&&p.pid)try{require('child_process').execSync('taskkill /T /F /PID '+p.pid,{stdio:'ignore'})}catch(e){}
  process.exit(0)}},1000);
`;

async function start(){
  const p=readPids();
  if(p.supervisor&&alive(p.supervisor)){console.log('[stack] already running (supervisor pid '+p.supervisor+')');return status()}
  if(await get('http://localhost:8888/')){console.log('[stack] something already serves :8888 - not starting a second engine');return status()}
  const supFile=path.join(LOGS,'supervisor.js');fs.writeFileSync(supFile,SUPERVISOR);
  const sup=spawn(process.execPath,[supFile,BUN,RS,LOGS],{detached:true,stdio:'ignore',windowsHide:true});sup.unref();
  fs.writeFileSync(PIDS,JSON.stringify({supervisor:sup.pid,started:new Date().toISOString()},null,1));
  console.log('[stack] supervisor pid '+sup.pid+'; waiting for engine :8888 and gateway :7780 ...');
  for(let i=0;i<180;i++){await sleep(1000);const a=await get('http://localhost:8888/'),b=await get('http://localhost:7780/status/x');if(a&&b){console.log('[stack] up after '+(i+1)+'s');return status()}}
  console.log('[stack] timed out waiting; see '+LOGS);process.exitCode=1;
}
async function status(){
  const p=readPids(),eng=+(fs.existsSync(LOGS+'/engine.pid')?fs.readFileSync(LOGS+'/engine.pid','utf8'):0),gw=+(fs.existsSync(LOGS+'/gateway.pid')?fs.readFileSync(LOGS+'/gateway.pid','utf8'):0);
  console.log(JSON.stringify({supervisor:p.supervisor||null,supervisorAlive:!!(p.supervisor&&alive(p.supervisor)),engine:eng,engineAlive:!!(eng&&alive(eng)),gateway:gw,gatewayAlive:!!(gw&&alive(gw)),
    web8888:await get('http://localhost:8888/'),gateway7780:await get('http://localhost:7780/status/x')}));
}
async function stop(){
  const p=readPids();if(!p.supervisor){console.log('[stack] no recorded supervisor');return}
  fs.writeFileSync(path.join(LOGS,'stack.stop'),'1');
  for(let i=0;i<15&&alive(p.supervisor);i++)await sleep(1000);
  if(alive(p.supervisor))try{execSync('taskkill /T /F /PID '+p.supervisor,{stdio:'ignore'})}catch(e){}
  for(const f of ['engine.pid','gateway.pid']){const pid=+(fs.existsSync(path.join(LOGS,f))?fs.readFileSync(path.join(LOGS,f),'utf8'):0);if(pid&&alive(pid))try{execSync('taskkill /T /F /PID '+pid,{stdio:'ignore'})}catch(e){}}
  fs.writeFileSync(PIDS,'{}');console.log('[stack] stopped');
}
const cmd=process.argv[2]||'status';
({start,stop,status}[cmd]||(()=>console.log('usage: node tools/ref2004/stack.js start|status|stop')))();

