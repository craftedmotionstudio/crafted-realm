/* Pure clip-clock controller. Visual interpolation only: no navigation or door authority. */
var HolmArrivalDoorMotion=(function(){
 'use strict';
 var KEYS=['arrival','garden'];
 function need(ok,message){if(!ok)throw Error('[HolmArrivalDoorMotion] '+message)}
 function pair(o,predicate,message){need(o&&typeof o==='object'&&!Array.isArray(o)&&KEYS.every(function(k){return predicate(o[k])}),message)}
 function copy(o){return {arrival:o.arrival,garden:o.garden}}
 function create(durations){
  pair(durations,function(v){return Number.isFinite(v)&&v>0},'positive finite durations required');
  var duration=copy(durations),times={arrival:0,garden:0},target={arrival:false,garden:false};
  function set(state,options){
   pair(state,function(v){return typeof v==='boolean'},'both boolean door states required');
   need(options===undefined||(options&&typeof options==='object'&&!Array.isArray(options)&&(options.instant===undefined||typeof options.instant==='boolean')),'instant must be boolean');
   target=copy(state);
   if(options&&options.instant)KEYS.forEach(function(k){times[k]=target[k]?duration[k]:0});
   return copy(times);
  }
  function update(dt){
   need(Number.isFinite(dt)&&dt>=0,'nonnegative finite dt required');
   var step=Math.min(dt,.1);
   KEYS.forEach(function(k){times[k]=target[k]?Math.min(duration[k],times[k]+step):Math.max(0,times[k]-step)});
   return copy(times);
  }
  function inspect(){
   var moving={arrival:times.arrival!==(target.arrival?duration.arrival:0),garden:times.garden!==(target.garden?duration.garden:0)};
   return {times:copy(times),target:copy(target),durations:copy(duration),moving:moving,anyMoving:moving.arrival||moving.garden};
  }
  return {set:set,update:update,inspect:inspect};
 }
 function selfTest(){
  var c=create({arrival:.3,garden:.2}),n=0;
  need(c.update(0).arrival===0&&!c.inspect().anyMoving,'initial closed');n++;
  c.set({arrival:true,garden:false});need(c.update(1).arrival===.1,'capped opening');n++;
  c.set({arrival:false,garden:true});var t=c.update(.05);need(t.arrival===.05&&t.garden===.05,'independent reversal');n++;
  c.set({arrival:false,garden:true},{instant:true});need(c.inspect().times.garden===.2&&!c.inspect().anyMoving,'instant restore');n++;
  var failed=false;try{c.update(NaN)}catch(e){failed=true}need(failed,'invalid dt rejected');n++;
  var log=typeof module!=='undefined'&&module.exports?'error':'info';
  if(typeof console!=='undefined'&&console[log])console[log]('[HolmArrivalDoorMotion] '+n+'/'+n+' acceptance ok');
 }
 selfTest();
 return {create:create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalDoorMotion;
