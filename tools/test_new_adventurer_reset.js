'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/new_adventurer_reset.js'),'utf8');
function setup(key='motionscape_save__qa_reset'){
  const values=new Map([['motionscape_save','owner-bytes'],['motionscape_save__qa_reset','qa-bytes'],['motionscape_save__qa_other','other-bytes']]);
  let reloads=0;const deleted=[];
  const store={get:k=>values.has(k)?values.get(k):null,has:k=>values.has(k),del:k=>{deleted.push(k);values.delete(k);}};
  const c={running:false,SaveGame:{KEY:key,available:()=>true},QAProfile:{key},Persist:{store},
    location:{href:'http://127.0.0.1:8777/?qaProfile=reset',reload(){reloads++;}},
    Player:{inv:[{id:'coins',qty:400}],bank:[]},CRWorldMode:{providerId:'veyhollow-commons-v2'}};
  vm.createContext(c);vm.runInContext(source,c);
  return {c,values,deleted,reloads:()=>reloads,reset:()=>c.NewAdventurerReset.reset()};
}
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('QA reset deletes only selected QA key and keeps current URL/runtime state',()=>{
  const t=setup(),before=JSON.stringify([t.c.Player,t.c.CRWorldMode,t.c.location.href]);
  assert(t.reset().ok);assert.deepStrictEqual(t.deleted,['motionscape_save__qa_reset']);
  assert.strictEqual(t.values.get('motionscape_save'),'owner-bytes');assert.strictEqual(t.values.get('motionscape_save__qa_other'),'other-bytes');
  assert.strictEqual(JSON.stringify([t.c.Player,t.c.CRWorldMode,t.c.location.href]),before);assert.strictEqual(t.reloads(),1);
  assert.strictEqual(t.reset().code,'reload-pending');assert.strictEqual(t.reloads(),1);
});
check('ordinary profile reset preserves every QA key',()=>{
  const t=setup('motionscape_save');assert(t.reset().ok);assert(!t.values.has('motionscape_save'));
  assert.strictEqual(t.values.get('motionscape_save__qa_reset'),'qa-bytes');assert.strictEqual(t.values.get('motionscape_save__qa_other'),'other-bytes');
});
check('delete refusal and throw never reload or start creation',()=>{
  [()=>{},()=>{throw new Error('refused');}].forEach(del=>{
    const t=setup();t.c.Persist.store.del=del;const r=t.reset();assert(!r.ok);assert.strictEqual(t.reloads(),0);
    assert.strictEqual(t.values.get(t.c.SaveGame.KEY),'qa-bytes');
  });
});
check('missing throwing and inconsistent readback fail before deletion',()=>{
  [s=>{delete s.get;},s=>{delete s.has;},s=>{s.get=()=>undefined;},s=>{s.has=()=>undefined;},
    s=>{s.get=()=>{throw new Error('offline');};},s=>{s.has=()=>{throw new Error('offline');};},
    s=>{s.has=()=>false;}].forEach(change=>{
    const t=setup();change(t.c.Persist.store);assert(!t.reset().ok);assert.strictEqual(t.deleted.length,0);assert.strictEqual(t.reloads(),0);
  });
});
check('post-delete readback failure refuses reload without false preservation claim',()=>{
  const t=setup();t.c.Persist.store.del=k=>{t.values.delete(k);t.c.Persist.store.has=()=>undefined;};
  const r=t.reset();assert.strictEqual(r.code,'verify-failed');assert.strictEqual(t.reloads(),0);assert(r.message.includes('could not be verified'));
});
check('key mismatch unavailable store and active gameplay fail closed',()=>{
  [c=>{c.QAProfile.key='other';},c=>{delete c.QAProfile;},c=>{c.SaveGame.available=()=>false;},
    c=>{c.running=true;},c=>{delete c.running;},c=>{delete c.location.reload;}].forEach(change=>{
    const t=setup();change(t.c);assert(!t.reset().ok);assert.strictEqual(t.deleted.length,0);assert.strictEqual(t.reloads(),0);
  });
});
check('reload exception honestly reports deletion and allows manual reload retry',()=>{
  const t=setup();t.c.location.reload=()=>{throw new Error('navigation refused');};
  const r=t.reset();assert.strictEqual(r.code,'reload-failed');assert.strictEqual(r.saveDeleted,true);
  assert(r.message.includes('Reload this page manually'));assert(!t.values.has(t.c.SaveGame.KEY));
  let retry=0;t.c.location.reload=()=>{retry++;};assert(t.reset().ok);assert.strictEqual(retry,1);
});
console.log('[NEW_ADVENTURER_RESET] '+passed+'/'+passed+' checks passed');
