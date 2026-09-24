/* Interactive Studio recipe flow, using the same BreadRecipe planner as the game. */
export function createKitchenRecipeStudy(host,services,{walkTo,currentNode,notify}){
 const items=Object.fromEntries(['bucket','bucket_flour','bucket_water','dough','bread_dough','bread'].map(id=>[id,{stack:false}]));
 const labels={bucket:'Empty bucket',bucket_flour:'Flour bucket',bucket_water:'Water bucket',dough:'Dough',bread_dough:'Bread dough',bread:'Bread'};
 let inventory=Array(28).fill(null),baseXp=0;
 const pack=document.createElement('p');pack.className='note';const buttons=document.createElement('div');host.append(buttons,pack);
 const count=id=>inventory.reduce((n,s)=>n+(s?.id===id?s.qty:0),0);
 function display(){pack.textContent=Object.entries(labels).filter(([id])=>count(id)).map(([id,label])=>label+' × '+count(id)).join(' · ')||'Your study pack is empty.';pack.textContent+=' | Base Cooking XP: '+baseXp;}
 function add(id){const i=inventory.indexOf(null);if(i<0){notify('Your study pack is full.');return false}inventory[i]={id,qty:1};return true}
 function convert(kind){const result=BreadRecipe.plan(inventory,items,kind);if(!result.ok){notify('Missing ingredients or no room for the result.');return false}inventory=result.inventory;baseXp+=result.baseXp;return true}
 function action(id,verb){const station=services.stations.find(s=>s.id===id);if(!station){notify('Station unavailable.');return}
  walkTo(station,()=>{if(currentNode()!==station.nodeId){notify('Reach the station before using it.');return}
   let done=false;
   if(verb==='bucket'){if(count('bucket')+count('bucket_flour')+count('bucket_water')>=2){notify('Two buckets are enough for one loaf.');return}done=add('bucket');}
   if(verb==='flour'||verb==='water'){const i=inventory.findIndex(s=>s?.id==='bucket');if(i<0){notify('Take an empty bucket first.');return}inventory[i]={id:'bucket_'+verb,qty:1};done=true;}
   if(verb==='dough'){if(count('dough')+count('bread_dough')>0){notify('Use the dough already in your pack first.');return}done=add('dough');}
   if(verb==='mix'||verb==='bake')done=convert(verb);
   display();if(done){notify(verb==='bake'?'Baked one loaf in the recipe study.':verb==='mix'?'Kneaded bread dough.':'Collected '+(verb==='bucket'?'an empty bucket':verb)+'.');console.info('[KITCHEN_RECIPE_STUDY]',verb,inventory.filter(Boolean),baseXp);}
  });
 }
 for(const [label,id,verb]of [['Take bucket','buckets','bucket'],['Fill with flour','flour','flour'],['Fill with water','water','water'],['Take dough','dough','dough'],['Knead dough','dough','mix'],['Bake loaf','oven','bake']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>action(id,verb);buttons.append(b)}
 display();return {snapshot(){return {inventory:inventory.map(s=>s?{...s}:null),baseXp}}};
}
