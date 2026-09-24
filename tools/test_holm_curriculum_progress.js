'use strict';
const assert=require('node:assert/strict');
const flow=require('../src/holm_curriculum_progress.js');
let count=0;
function test(name,fn){try{fn();count++;}catch(e){e.message=name+': '+e.message;throw e;}}
test('fresh profile requires every recorded lesson',()=>{
  let p=flow.normalize(null);assert.equal(p.lessonId,'study_route');
  const seen=[];
  while(!p.complete){seen.push(p.lessonId);p=flow.completeLesson(p,p.lessonId).progress;}
  assert.deepEqual(seen,flow.lessonIds);assert.equal(seen.length,18);assert.equal(p.step,18);
});
test('v5 restores earliest omitted lesson without losing later work',()=>{
  let p=flow.normalize({curriculumVersion:5,lessonId:'open_bank',step:11});
  assert.equal(p.lessonId,'bake_bread');assert(p.completedLessonIds.includes('forge_dagger'));
  p=flow.completeLesson(p,'bake_bread').progress;assert.equal(p.lessonId,'learn_quests');
  p=flow.completeLesson(p,'learn_quests').progress;assert.equal(p.lessonId,'melee_trial');
});
test('stable ID overrides stale numeric index',()=>assert.equal(flow.normalize({curriculumVersion:5,lessonId:'cook_fish',step:0}).lessonId,'cook_fish'));
test('v4 missing orientation is restored and bread is retained',()=>{
  const p=flow.normalize({curriculumVersion:4,step:6});
  assert.equal(p.lessonId,'study_route');assert(p.completedLessonIds.includes('bake_bread'));
});
test('historical optional evidence counts only literal true',()=>{
  const p=flow.normalize({curriculumVersion:5,lessonId:'open_bank',optional:{bake_bread:true,learn_quests:'true'}});
  assert.equal(p.lessonId,'learn_quests');assert(!p.completedLessonIds.includes('learn_quests'));
});
test('graduates retain privileges without invented completion evidence',()=>{
  const p=flow.normalize({curriculumVersion:5,complete:true,departurePackClaimed:true});
  assert(p.complete);assert.equal(p.lessonId,null);assert.equal(p.completedLessonIds.length,0);assert(p.departurePackClaimed);
});
test('unknown version cannot guess a completed prefix',()=>{
  assert.equal(flow.normalize({curriculumVersion:99,step:17,lessonId:'relight_lastlight'}).lessonId,'study_route');
});
test('invalid historical indices do not grant progress',()=>{
  for(const step of [-1,1.5,99,'7',NaN])assert.equal(flow.normalize({curriculumVersion:5,step}).completedLessonIds.length,0);
});
test('v6 ledger deduplicates and ignores unknown IDs',()=>{
  const p=flow.normalize({curriculumVersion:6,completedLessonIds:['study_route','study_route','bogus']});
  assert.deepEqual(p.completedLessonIds,['study_route']);assert.equal(p.lessonId,'equip_hatchet');
});
test('out of order and repeated events cannot advance',()=>{
  const p=flow.normalize(null);assert.equal(flow.completeLesson(p,'bake_bread').advanced,false);
  const q=flow.completeLesson(p,'study_route');assert(q.advanced);assert.equal(flow.completeLesson(q.progress,'study_route').advanced,false);
});
test('migration and event planning never mutate input or nested recovery flags',()=>{
  const p={curriculumVersion:5,step:11,optional:{bake_bread:true},cellarRationClaimed:true,custom:{a:[1]}};
  const before=JSON.stringify(p),q=flow.normalize(p);q.custom.a.push(2);flow.completeLesson(p,'learn_quests');
  assert.equal(JSON.stringify(p),before);
});
test('save round trip is idempotent at every full curriculum step',()=>{
  let p=flow.normalize(null);
  for(let i=0;i<=18;i++){
    assert.deepEqual(flow.normalize(JSON.parse(JSON.stringify(p))),p);
    if(!p.complete)p=flow.completeLesson(p,p.lessonId).progress;
  }
});
test('classic browser global has CommonJS parity',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),ctx={};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/holm_curriculum_progress.js'),'utf8'),ctx);
  const input={curriculumVersion:5,lessonId:'open_bank',optional:{bake_bread:true}};
  assert.equal(JSON.stringify(ctx.HolmCurriculumProgress.normalize(input)),JSON.stringify(flow.normalize(input)));
});
console.log('[HOLM_CURRICULUM_PROGRESS] '+count+'/'+count+' tests passed');
