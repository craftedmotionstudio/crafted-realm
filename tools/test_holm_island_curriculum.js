/* Headless contract for the island draft curriculum (finish goal M5.2a): on ?holmIsland=1 the tutorial runs all 18
 * lessons of curriculum v6 in order with the live events, records a ledger, refuses out-of-order credit, restores a
 * saved ledger at the first missing lesson, migrates a v5 save by its known prefix, and stays inert without the flag.
 * Run: node tools/test_holm_island_curriculum.js */
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
function world(search){
 const ctx={console,location:{search},URLSearchParams,Tutorial:null};
 // the engine's own advance rule (game4_ui.js Tutorial.notify), without sound/UI
 ctx.Tutorial={complete:false,step:0,steps:[],finished:0,
  notify(ev,match){if(this.complete)return;const s=this.steps[this.step];if(!s)return;if(s.ev===ev&&s.match===match){this.step++;if(this.step>=this.steps.length){this.complete=true;this.finished++}}},
  banner(){}};
 vm.createContext(ctx);
 ['holm_landscape_data.js','holm_tutorial_flow_data.js','holm_curriculum_progress.js','holm_island_curriculum.js'].forEach(f=>{try{vm.runInContext(src(f),ctx,{filename:f})}catch(e){if(f!=='holm_landscape_data.js')throw e}});
 return ctx;
}
const same=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);   // vm-realm arrays never deepEqual host arrays
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
const W=world('?holmIsland=1'),T=W.Tutorial,ids=W.HolmCurriculumProgress.lessonIds;
check('island flag installs the 18-lesson v6 order with the live events and our own hint text',()=>{
 assert.strictEqual(T.curriculumVersion,6);assert.strictEqual(T.steps.length,18);
 same(T.steps.map(s=>s.id),ids);
 T.steps.forEach(s=>{assert(s.ev&&s.match,s.id+' event');assert(s.text&&s.arrowLabel,s.id+' text');assert(s.island,s.id+' island station')});
 assert.strictEqual(T.steps.find(s=>s.id==='bake_bread').ev,'bake');assert.strictEqual(T.steps.find(s=>s.id==='melee_trial').match,'melee');
});
check('lessons credit only in order; the ledger records each once',()=>{
 T.notify('gather','logs');assert.strictEqual(T.step,0,'chop before the chart is refused');
 T.notify('orient','route');T.notify('orient','route');assert.strictEqual(T.step,1);same(T.completedLessonIds,['study_route']);
});
check('all 18 events in order complete the curriculum with a full ledger',()=>{
 T.steps.slice(1).forEach(s=>T.notify(s.ev,s.match));
 assert.strictEqual(T.complete,true);same(T.completedLessonIds,ids);
});
check('a saved ledger restores at the first missing lesson (reload mid-island)',()=>{
 const R=world('?holmIsland=1');const saved={curriculumVersion:6,completedLessonIds:ids.slice(0,9),step:9};
 assert(R.HolmIslandCurriculum.restore(saved));assert.strictEqual(R.Tutorial.step,9);assert.strictEqual(R.Tutorial.steps[9].id,'mine_copper');
 R.Tutorial.notify('gather','copper_ore');same(R.Tutorial.completedLessonIds,ids.slice(0,10));
});
check('a v5 (live 13-lesson) save migrates by its known prefix; restored lessons stay due',()=>{
 const R=world('?holmIsland=1');R.HolmIslandCurriculum.restore({curriculumVersion:5,lessonId:'descend_cavern',step:6});
 assert.strictEqual(R.Tutorial.steps[R.Tutorial.step].id,'bake_bread','bread became required and is due first');
 assert(R.Tutorial.completedLessonIds.includes('cook_fish')&&!R.Tutorial.completedLessonIds.includes('bake_bread'));
});
check('without the island flag the live curriculum is untouched',()=>{
 const L=world('?qaProfile=x');assert.strictEqual(L.Tutorial.steps.length,0);assert.strictEqual(L.HolmIslandCurriculum.active(),false);assert.strictEqual(L.HolmIslandCurriculum.restore({}),false);
});
console.log('[HOLM_ISLAND_CURRICULUM] '+passed+'/6 checks passed');
