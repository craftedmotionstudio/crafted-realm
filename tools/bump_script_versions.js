/* Cache busting for the global scripts in index.html: every named src file's ?v= becomes a short hash of its bytes
 * (so a changed file always reloads and an unchanged one never does). With no arguments it bumps every src/*.js whose
 * working-tree bytes differ from git HEAD. Run: node tools/bump_script_versions.js [src/file.js ...] */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),idx=path.join(root,'index.html');
let files=process.argv.slice(2);
if(!files.length)files=['git diff --name-only HEAD -- src','git ls-files --others --exclude-standard src'].map(c=>cp.execSync(c,{cwd:root,encoding:'utf8'})).join('\n').split(/\r?\n/).filter(f=>/^src\/.*\.js$/.test(f));
let html=fs.readFileSync(idx,'utf8'),n=0;
for(const f of files){const rel=f.replace(/\\/g,'/').replace(/^\.?\//,''),p=path.join(root,rel);if(!fs.existsSync(p))continue;
 const v='h'+crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,8);
 const re=new RegExp('(src="'+rel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=)[^"]*"','g');
 const next=html.replace(re,(m,a)=>a+v+'"');if(next!==html){html=next;n++;console.log(rel,'->',v)}}
fs.writeFileSync(idx,html);console.log('[BUMP] '+n+' script tags updated');
