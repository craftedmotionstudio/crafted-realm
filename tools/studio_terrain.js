/* Terrain-only Studio: inspect the canonical landscape package.
 * Staging and publication belong to the journaled CLI. */
(function(){
  'use strict';
  const api=WorldV2TerrainDistrict,sourcePath='assets/world/authoring/studio-lesson-green-district.json';
  const bundlePath='assets/world/authoring/studio-lesson-green-district.bundle.json';
  const status=document.getElementById('status'),canvas=document.getElementById('map'),ctx=canvas.getContext('2d');
  let bounds=null;
  const say=text=>{status.textContent=text;};
  function draw(bundle){
    const chunks=bundle.chunks;
    bounds={x0:Math.min(...chunks.map(c=>c.cx*8)),z0:Math.min(...chunks.map(c=>c.cz*8)),x1:Math.max(...chunks.map(c=>(c.cx+1)*8)),z1:Math.max(...chunks.map(c=>(c.cz+1)*8))};
    const sx=800/(bounds.x1-bounds.x0),sz=800/(bounds.z1-bounds.z0),px=x=>(x-bounds.x0)*sx,pz=z=>(z-bounds.z0)*sz;
    for(let z=bounds.z0;z<bounds.z1;z++)for(let x=bounds.x0;x<bounds.x1;x++){
      const h=HolmLandscape.heightAt(x+.5,z+.5);ctx.fillStyle=h===null||h< -1.2?'#558ba0':'hsl(94 20% '+(27+Math.max(0,h)*4)+'%)';ctx.fillRect(px(x),pz(z),sx+1,sz+1);
    }
    ctx.save();ctx.strokeStyle='#bdaa74';ctx.lineCap='square';ctx.lineJoin='miter';
    bundle.landscape.routes.forEach(r=>{ctx.lineWidth=r.width*sx;ctx.beginPath();r.points.forEach((p,i)=>i?ctx.lineTo(px(p[0]),pz(p[1])):ctx.moveTo(px(p[0]),pz(p[1])));ctx.stroke();});ctx.restore();
    ctx.strokeStyle='#ffffff28';ctx.lineWidth=1;
    chunks.forEach(c=>ctx.strokeRect(px(c.cx*8),pz(c.cz*8),8*sx,8*sz));
    bundle.landscape.pads.forEach(p=>{ctx.fillStyle='#806c4e';ctx.fillRect(px(p.x-p.w/2),pz(p.z-p.d/2),p.w*sx,p.d*sz);ctx.strokeStyle='#caab80';ctx.lineWidth=2;ctx.strokeRect(px(p.x-p.w/2),pz(p.z-p.d/2),p.w*sx,p.d*sz);ctx.fillStyle='#fff0cf';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText(p.label,px(p.x),pz(p.z)-3);ctx.font='14px system-ui';ctx.fillText('Reserved · '+p.door+' entrance',px(p.x),pz(p.z)+20);});
    const d=bundle.landscape.district;ctx.strokeStyle='#f3e5ba';ctx.setLineDash([8,8]);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px(d.center[0]),pz(d.center[1]),d.radius*sx,d.radius*sz,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.textAlign='left';ctx.font='bold 20px system-ui';ctx.fillStyle='#fff0cf';ctx.fillText('N ↑',20,32);
    const metrics=document.getElementById('metrics');metrics.replaceChildren();
    [['Chunks',chunks.length],['Reserved pads',bundle.landscape.pads.length],['Route contracts',bundle.landscape.routes.length],['New buildings',0]].forEach(([name,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;metrics.append(dt,dd);});
  }
  async function load(){
    bounds=null;ctx.clearRect(0,0,canvas.width,canvas.height);document.getElementById('metrics').replaceChildren();say('Verifying published source and bundle…');
    try{const responses=await Promise.all([sourcePath,bundlePath].map(p=>fetch('../'+p,{cache:'no-store'})));if(responses.some(r=>!r.ok))throw new Error('Published package is missing.');
      const [source,bundle]=await Promise.all(responses.map(r=>r.json()));const check=api.validate(bundle,source);if(!check.ok)throw new Error(check.errors.join('; '));draw(bundle);say('Published package verified against the landscape contract.');
    }catch(e){say('Load refused: '+e.message);}
  }
  canvas.addEventListener('pointermove',event=>{if(!bounds)return;const r=canvas.getBoundingClientRect(),x=Math.floor(bounds.x0+(event.clientX-r.left)/r.width*(bounds.x1-bounds.x0)),z=Math.floor(bounds.z0+(event.clientY-r.top)/r.height*(bounds.z1-bounds.z0)),h=HolmLandscape.heightAt(x+.5,z+.5);document.getElementById('tile').textContent='Tile '+x+', '+z+' · height '+(h===null?'water':h.toFixed(2))+' · chunk '+Math.floor(x/8)+','+Math.floor(z/8);});
  document.getElementById('load').onclick=load;load();
})();
