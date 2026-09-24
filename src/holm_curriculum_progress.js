/* Staged full-curriculum progress contract. Not installed in index.html yet.
 * Pure data: no rewards, inventory writes, runtime activation or save writes. */
var HolmCurriculumProgress=(function(){
  'use strict';
  var ids=['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish',
    'bake_bread','learn_quests','descend_cavern','mine_copper','mine_tin','smelt_bronze',
    'forge_dagger','melee_trial','ranged_trial','open_bank','magic_trial','relight_lastlight'];
  var v4=['equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','bake_bread',
    'descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger','open_bank'];
  var omitted=['bake_bread','learn_quests','melee_trial','ranged_trial','magic_trial'];
  var v5=ids.filter(function(id){return omitted.indexOf(id)<0;});
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function normalize(saved){
    saved=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
    var out=clone(saved), done={}, version=Number(saved.curriculumVersion);
    // Only known historical sequences prove a completed prefix. Unknown versions
    // must not infer completion from a coincidentally matching index or lesson ID.
    var old=version===4?v4:version===5?v5:null;
    if(old){
      var cursor=old.indexOf(saved.lessonId);
      if(cursor<0&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<old.length)cursor=saved.step;
      if(cursor>=0)old.slice(0,cursor).forEach(function(id){done[id]=true;});
      omitted.forEach(function(id){if(saved.optional&&saved.optional[id]===true)done[id]=true;});
    }
    if(version===6&&Array.isArray(saved.completedLessonIds)){
      saved.completedLessonIds.forEach(function(id){if(ids.indexOf(id)>=0)done[id]=true;});
    }
    out.curriculumVersion=6;
    out.completedLessonIds=ids.filter(function(id){return done[id];});
    // Graduation is a durable privilege; do not fabricate missing lesson evidence.
    out.complete=saved.complete===true;
    out.step=out.complete?ids.length:ids.findIndex(function(id){return !done[id];});
    if(out.step<0){out.complete=true;out.step=ids.length;}
    out.lessonId=out.complete?null:ids[out.step];
    return out;
  }
  function completeLesson(saved,id){
    var out=normalize(saved);
    if(out.complete||out.lessonId!==id)return {advanced:false,progress:out};
    out.completedLessonIds.push(id);
    out=normalize(out);
    return {advanced:true,progress:out};
  }
  return {version:6,lessonIds:ids.slice(),normalize:normalize,completeLesson:completeLesson};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmCurriculumProgress;
