/* Skilling animation timing, as the 2004 reference plays it (docs/rebuild/REF2004_FEEL_REPORT.md item 9).
 * Measured on the local 2004 run (how long each action's animation is held in the tutorial captures): a woodcutting
 * swing 0.78 s (looped for as long as you chop), a net cast 1.80 s (looped while you net), cooking a fish 1.77 s,
 * baking bread 2.43 s, smelting a bar 2.42 s, hammering at the anvil 2.28 s, and lighting a fire: a kneel held 4.15 s.
 * Only timing and playback rate live here. The kit clips keep their authored keys (the character agent owns them);
 * the game plays each at the rate that gives the 2004 duration (rate = authored length / 2004 length), so a retimed clip
 * needs no change here. Success rolls stay on the 600 ms game tick with their odds and XP unchanged (woodcutting rolls
 * every tick, fishing every 5); a one-shot action takes the whole number of ticks nearest its 2004 animation: cook 3
 * (1.8 s) at a fire, 4 at a range (2004 cooks there with its 2.43 s range animation), bake 4 (2.4 s), smelt 4, smith 4,
 * and the fire catches 7 ticks (4.2 s) into the kneel. */
var SkillTiming=(function(){
 'use strict';
 var TICK_S=0.6;
 // seconds per stroke / per item in 2004 (keyed by the kit clip; 'bake' / 'cook_range' = at an oven, 2004's range animation)
 var SECONDS={chop:0.78,net:1.80,cook:1.77,bake:2.43,cook_range:2.43,smelt:2.42,smith:2.28};
 // clips the 2004 client repeats (or holds) for as long as the action lasts, rather than once per roll
 var LOOP={chop:true,net:true,firemake:true};
 // ticks a one-shot action takes, from the start of its animation to its product
 var TICKS={cook:3,bake:4,cook_range:4,smelt:4,smith:4,lightfire:7};
 // the playback rate for a clip of `duration` seconds (kind: 'bake' for the cook clip at an oven); 1 = authored pace
 function rateFor(clip,duration,kind){var s=SECONDS[kind||clip];return s&&duration>0?duration/s:1}
 function loops(clip){return !!LOOP[clip]}
 function ticks(kind){return TICKS[kind]||0}
 function seconds(kind){return ticks(kind)*TICK_S}
 function isSkillClip(clip){return !!(SECONDS[clip]||LOOP[clip])}
 function snapshot(){return {tickSeconds:TICK_S,strokeSeconds:Object.assign({},SECONDS),loops:Object.keys(LOOP),actionTicks:Object.assign({},TICKS),
  actionSeconds:Object.keys(TICKS).reduce(function(o,k){o[k]=+(TICKS[k]*TICK_S).toFixed(2);return o},{}),rolls:{woodcutting:'every tick',fishing:'every 5 ticks (Minnow Hollow)'}}}
 return {SECONDS:SECONDS,LOOP:LOOP,TICKS:TICKS,rateFor:rateFor,loops:loops,ticks:ticks,seconds:seconds,isSkillClip:isSkillClip,snapshot:snapshot};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SkillTiming;
