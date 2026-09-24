'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('src/world_v2_boot_select.js','utf8');
let passed=0;
function check(name,raw,qa,expected){
  const keys=[],ctx={URLSearchParams,location:{search:'',hostname:'127.0.0.1'},console};
  ctx.window=ctx;
  ctx.CRWorldMode={legacy:false,attachProvider(p){this.provider=p;}};
  ctx.WorldV2={get(id){return ['tutors-holm-v2','veyhollow-commons-v2'].includes(id)?{id}:null;},activate(id){return this.get(id);}};
  ctx.read=k=>{keys.push(k);return raw;};
  if(qa)ctx.QAProfile={key:'motionscape_save__qa_boot'};
  vm.createContext(ctx);
  vm.runInContext('const Persist={store:{get:read}};',ctx);
  assert.strictEqual(ctx.Persist,undefined,'fixture must reproduce lexical Persist');
  vm.runInContext(source,ctx);
  assert.strictEqual(ctx.CRWorldMode.provider.id,expected,name);
  assert.deepStrictEqual(keys,[qa?'motionscape_save__qa_boot':'motionscape_save']);
  passed++;
}
check('mainland restore',JSON.stringify({world:{provider:'veyhollow-commons-v2'}}),false,'veyhollow-commons-v2');
check('isolated mainland restore',JSON.stringify({world:{provider:'veyhollow-commons-v2'}}),true,'veyhollow-commons-v2');
check('new profile',null,true,'tutors-holm-v2');
check('old save','{}',false,'tutors-holm-v2');
check('unknown provider','{"world":{"provider":"missing"}}',false,'tutors-holm-v2');
check('malformed save','{',false,'tutors-holm-v2');
const html=fs.readFileSync('index.html','utf8');
assert(html.indexOf('src/qa_profile.js')<html.indexOf('src/world_v2_boot_select.js'),'profile resolves before boot selector');
assert.strictEqual(html.split('src/qa_profile.js').length-1,1);passed++;
console.log(`[WORLD_BOOT_SAVE] ${passed}/${passed} passed`);
