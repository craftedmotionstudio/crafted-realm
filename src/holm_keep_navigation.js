/* Renderer-neutral traversal of measured keep navigation. No world registration. */
var HolmKeepNavigation=(function(){
 'use strict';
 function need(ok,m){if(!ok)throw Error('[KeepNavigation] '+m)}
 function finite(p){return p&&['x','y','z','capsuleBase'].every(k=>Number.isFinite(p[k]))&&p.capsuleBase>=p.y-.0001}
 function create(data){
  need(data&&data.schema==='holm-keep-navigation-v1','unsupported graph');
  const nodes=new Map();for(const p of data.nodes||[]){need(typeof p.id==='string'&&!nodes.has(p.id)&&finite(p),'invalid node');nodes.set(p.id,p)}
  need(nodes.has(data.startId),'missing start');
  const profiles=new Map();let count=0;
  for(const [id,neighbors] of Object.entries(data.links||{})){
   need(nodes.has(id)&&Array.isArray(neighbors)&&new Set(neighbors).size===neighbors.length,'invalid adjacency');
   for(const other of neighbors){const a=nodes.get(id),b=nodes.get(other);need(b&&(data.links[other]||[]).includes(id),'asymmetric edge');
    need((Math.abs(a.x-b.x)===1&&a.z===b.z)||(Math.abs(a.z-b.z)===1&&a.x===b.x),'non-cardinal edge');
    let line=data.profiles?.[id+'|'+other];if(!line){const reverse=data.profiles?.[other+'|'+id];if(reverse)line=reverse.slice().reverse()}
    need(Array.isArray(line)&&line.length>=2&&line.every(finite),'missing measured edge profile');
    need(Math.hypot(line[0].x-a.x,line[0].z-a.z)<1e-5&&Math.hypot(line.at(-1).x-b.x,line.at(-1).z-b.z)<1e-5,'profile endpoint mismatch');
    for(let i=1;i<line.length;i++){const p=line[i-1],q=line[i];need((a.x===b.x?p.x===a.x&&q.x===a.x:p.z===a.z&&q.z===a.z),'profile leaves cardinal axis');need(Math.hypot(p.x-q.x,p.z-q.z)<=.10001,'sparse edge profile')}
    profiles.set(id+'|'+other,line);count++;
   }
  }
  function route(start,end){if(!nodes.has(start)||!nodes.has(end))return null;const queue=[start],prev=new Map([[start,null]]);
   for(let i=0;i<queue.length;i++){const id=queue[i];if(id===end){const result=[];for(let p=id;p!==null;p=prev.get(p))result.push(p);return result.reverse()}
    for(const next of data.links[id]||[])if(!prev.has(next)){prev.set(next,id);queue.push(next)}}return null;}
  function point(from,to,t){const line=profiles.get(from+'|'+to);if(!line||!Number.isFinite(t))return null;t=Math.max(0,Math.min(1,t));
   const a=nodes.get(from),b=nodes.get(to),axis=a.x===b.x?'z':'x',value=a[axis]+(b[axis]-a[axis])*t;
   let i=1;while(i<line.length-1&&Math.abs(line[i][axis]-a[axis])<t)i++;
   const p=line[i-1],q=line[i],f=(value-p[axis])/(q[axis]-p[axis]);return {x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f,capsuleBase:p.capsuleBase+(q.capsuleBase-p.capsuleBase)*f,z:p.z+(q.z-p.z)*f,surface:t<.5?a.surface:b.surface};}
  console.info('[KEEP_NAVIGATION] '+nodes.size+' measured stances, '+count+' directed cardinal edges');
  return {nodes,route,point,data};
 }
 return {create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmKeepNavigation;
