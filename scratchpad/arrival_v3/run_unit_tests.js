// Runs every tools/test_*.js one at a time (exit code 0 = pass) and prints a summary. Run from the repo root.
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),files=fs.readdirSync(path.join(root,'tools')).filter(f=>/^test_.*\.js$/.test(f)).sort();
const failed=[];let passed=0;
for(const f of files){const t=Date.now();
 const r=cp.spawnSync(process.execPath,['tools/'+f],{cwd:root,encoding:'utf8',timeout:600000,maxBuffer:64*1024*1024,windowsHide:true,env:process.env});
 const ok=r.status===0,last=((r.stdout||'')+(r.stderr||'')).trim().split(/\r?\n/).slice(-1)[0]||'';
 console.log((ok?'PASS ':'FAIL ')+f+' ('+((Date.now()-t)/1000).toFixed(1)+'s) '+last.slice(0,160));
 if(ok)passed++;else{failed.push(f);console.log(((r.stdout||'')+(r.stderr||'')).slice(-3000))}
}
console.log('[UNIT] '+passed+'/'+files.length+' files pass'+(failed.length?'; failed: '+failed.join(', '):''));
process.exit(failed.length?1:0);
