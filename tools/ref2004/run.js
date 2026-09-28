/* One command per section for the 2004 reference harness.
 *   bun tools/ref2004/run.js characters|tutorial|ui|scenery|all [--side 2004|ours|both] [--gender m|f|both]
 *   bun tools/ref2004/run.js stop            stops the 2004 stack and the ours server this script started
 * Starts what is missing first: the local 2004 stack (tools/ref2004/stack.js, localhost only) and a static server for
 * our game (tools/serve_static.py on REF_OURS_BASE's port, default 8108, serving this worktree). Then captures, then
 * `python tools/ref2004/analyze.py <section>` (pair sheets with 2004 imagery -> C:\Users\iQwaZ\ref2004_captures\sheets,
 * our-only sheets -> scratchpad/ref2004). The 2004 side never changes, so after a change to our game re-run with
 * --side ours: the 2004 frames already on disk are reused for the pairs. */
'use strict';
const {spawn,spawnSync,execSync}=require('child_process'),fs=require('fs'),path=require('path'),http=require('http');
const C=require('./lib/common');
const BUN=process.env.BUN||'C:/Users/iQwaZ/.bun/bin/bun.exe';
const PY=process.env.PYTHON||'python';
const args=process.argv.slice(2),what=args[0]||'characters',rest=args.slice(1);
const side=(()=>{const i=rest.indexOf('--side');return i>=0?rest[i+1]:'both'})();
const OURS_PID=path.join(C.CAP,'logs','ours_server.json');
const get=u=>new Promise(res=>{const r=http.get(u,x=>{x.resume();res(x.statusCode)});r.on('error',()=>res(0));r.setTimeout(3000,()=>{r.destroy();res(0)})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sh(cmd,argv,opts){C.log('$',cmd,argv.join(' '));const r=spawnSync(cmd,argv,Object.assign({stdio:'inherit',cwd:C.REPO,env:Object.assign({},process.env,{TELEMETRY:'false'})},opts||{}));return r.status}
async function ensure2004(){if(side==='ours')return;if(await get(C.WEB2004+'/')&&await get('http://localhost:7780/status/x'))return;sh(process.execPath.includes('bun')?'node':'node',[path.join(__dirname,'stack.js'),'start'])}
async function ensureOurs(){if(side==='2004')return;if(await get(C.OURS+'/'))return;
  const port=+(new URL(C.OURS).port||80);C.log('starting our static server on',port);
  const p=spawn(PY,[path.join(C.REPO,'tools','serve_static.py'),String(port),C.REPO],{detached:true,stdio:'ignore',windowsHide:true});p.unref();
  fs.writeFileSync(OURS_PID,JSON.stringify({pid:p.pid,port,started:new Date().toISOString()}));
  for(let i=0;i<30&&!await get(C.OURS+'/');i++)await sleep(500)}
const CAPTURE={characters:'capture_characters.js',tutorial:'capture_tutorial.js',ui:'capture_tutorial.js',scenery:'capture_scenery.js'};
(async()=>{
  if(what==='stop'){sh('node',[path.join(__dirname,'stack.js'),'stop']);
    try{const o=JSON.parse(fs.readFileSync(OURS_PID,'utf8'));execSync('taskkill /T /F /PID '+o.pid,{stdio:'ignore'});fs.unlinkSync(OURS_PID);C.log('stopped our server pid',o.pid)}catch(e){}
    return}
  const sections=what==='all'?['characters','tutorial','scenery']:[what];
  await ensure2004();await ensureOurs();
  for(const s of sections){
    if(!CAPTURE[s]){console.log('unknown section',s);process.exitCode=1;return}
    if(s==='ui'&&sections.length===1&&fs.existsSync(path.join(C.CAP,'tutorial','2004','log.json'))&&!rest.includes('--recapture')){C.log('ui: pairs come from the tutorial run (use --recapture to play it again)')}
    else sh(BUN,[path.join(__dirname,CAPTURE[s]),...rest]);
    sh(PY,[path.join(__dirname,'analyze.py'),s]);
    if(s==='tutorial'&&what==='all')sh(PY,[path.join(__dirname,'analyze.py'),'ui']);
  }
  C.log('done:',sections.join(', '),'- sheets in',path.join(C.CAP,'sheets'));
})();
