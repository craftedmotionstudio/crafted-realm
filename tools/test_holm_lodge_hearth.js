const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const source=fs.readFileSync('tools/studio_holm_lodge_hearth.js','utf8');
 const {validateHearth}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const data=JSON.parse(fs.readFileSync('.studio-workspaces/holm-quest-hearth-v1/candidates/hearth.json','utf8'));
 assert.equal(validateHearth(data,data.lodgeSha256),data);
 for(const mutation of [{schema:'bad'},{lodgeSha256:'bad'},{fireSha256:'bad'},{position:[NaN,0,0]},{position:[0,0]},{rotationY:Infinity},{scale:0},{scale:3},{clipNames:[]},{durationSeconds:0},{fireUrl:'unmeasured.glb'}])assert.throws(()=>validateHearth({...data,...mutation},data.lodgeSha256));
 console.log('[LODGE_HEARTH_CONTRACT] 12/12 checks pass: matched data accepted; drift and malformed transforms/animation rejected');
})().catch(e=>{console.error(e);process.exitCode=1});
