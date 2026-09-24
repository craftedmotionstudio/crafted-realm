/* Shared bread inventory planning. No rendering, timers, XP grants or persistence. */
var BreadRecipe=(function(){
 'use strict';
 var recipes={mix:{inputs:['bucket_flour','bucket_water','dough'],output:'bread_dough',baseXp:0,event:null},bake:{inputs:['bread_dough'],output:'bread',baseXp:40,event:['bake','bread']}};
 function fail(reason){return {ok:false,reason:reason};}
 function plan(inventory,items,kind){
  var recipe=Object.prototype.hasOwnProperty.call(recipes,kind)?recipes[kind]:null;
  if(!recipe)return fail('unknown-recipe');
  if(!Array.isArray(inventory)||!inventory.length||!items||!items[recipe.output])return fail('invalid-inventory-or-item');
  var next=[];
  for(var i=0;i<inventory.length;i++){
   var slot=inventory[i];
   if(slot===null){next.push(null);continue;}
   if(!slot||typeof slot.id!=='string'||!slot.id||!Object.prototype.hasOwnProperty.call(items,slot.id)||!items[slot.id]||!Number.isSafeInteger(slot.qty)||slot.qty<=0)return fail('invalid-slot');
   next.push(Object.assign({},slot));
  }
  for(var r=0;r<recipe.inputs.length;r++){
   var id=recipe.inputs[r],at=next.findIndex(function(s){return s&&s.id===id;});
   if(at<0)return fail('missing-ingredients');
   if(--next[at].qty===0)next[at]=null;
  }
  var existing=items[recipe.output].stack?next.findIndex(function(s){return s&&s.id===recipe.output;}):-1;
  if(existing>=0){if(!Number.isSafeInteger(next[existing].qty+1))return fail('invalid-quantity');next[existing].qty++;}
  else{var free=next.indexOf(null);if(free<0)return fail('inventory-full');next[free]={id:recipe.output,qty:1};}
  return {ok:true,inventory:next,baseXp:recipe.baseXp,event:recipe.event?recipe.event.slice():null};
 }
 return {plan:plan};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BreadRecipe;
