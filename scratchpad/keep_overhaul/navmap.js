// ASCII tile maps of a keep navigation graph, one per storey: '#' reachable node, 'o' unreachable node, '.' none, 'T' target
const fs=require('fs');const f=process.argv[2];const n=JSON.parse(fs.readFileSync(f,'utf8'));
const seen=new Set([n.startId]),q=[n.startId];while(q.length){const u=q.pop();for(const v of n.links[u]||[])if(!seen.has(v)){seen.add(v);q.push(v)}}
const tg={};n.targets.forEach(t=>{if(t.nodeId)tg[t.nodeId]=t.id});
const bands=[['ground',-1,1.2],['level2',2.6,4.2],['level3',5.8,7.4],['top',9,10.5]];
for(const [name,lo,hi] of bands){let rows=[];for(let zi=-16;zi<=12;zi++){let r=String(zi).padStart(4)+' ';for(let xi=-12;xi<=13;xi++){const ns=n.nodes.filter(m=>m.id.startsWith(xi+':'+zi+':')&&m.y>=lo&&m.y<=hi);
 if(!ns.length){r+=' .';continue}const m=ns[0];r+=' '+(tg[m.id]?'T':(seen.has(m.id)?'#':'o'))}rows.push(r)}
 console.log('== '+name+'  x -12..13 ->');console.log(rows.join('\n'))}
console.log(n.targets.filter(t=>!t.reachable).map(t=>t.id+':'+t.nodeId).join(' '));
