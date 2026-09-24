// An isolated interaction proof; no game Player or saved adventurer is touched.
export async function createHouseWalk({THREE,model,animations,host,onSurface,doorsOpen,openDoors,camera,canvas,getHouse,getTrail,getDock,getSkiff}){
 const responses=await Promise.all(['arrival-layout.json','guide-house-collision-envelopes.json','arrival-dock.json'].map(f=>fetch('../docs/rebuild/holm-overhaul/'+f+'?v=3')));
 if(responses.some(r=>!r.ok))throw Error('House walk data unavailable');
 let [layout,envelopes,dock]=await Promise.all(responses.map(r=>r.json()));
 const terrainResponse=await fetch('../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json?v='+Date.now());
 if(!terrainResponse.ok)throw Error('Arrival terrain unavailable');
 const terrain=await terrainResponse.json();
 const provisionResponses=await Promise.all([fetch('../docs/rebuild/holm-overhaul/arrival-provisions.json'),fetch('../.studio-workspaces/holm-provision-rack-v1/candidates/manifest.json')]);
 if(provisionResponses.some(r=>!r.ok))throw Error('Provisions contract unavailable');
 const [placement,manifest]=await Promise.all(provisionResponses.map(r=>r.json()));
 const provisions=HolmArrivalProvisions.compile({layout,envelopes,terrain,dock,placement,manifest});
 layout=provisions.layout;envelopes=provisions.envelopes;
 const nav=HolmArrivalDock.create(layout,envelopes,terrain,dock),doors={arrival:true,garden:true},graph=nav.compile(doors);
 const nodes=Object.fromEntries(graph.nodes.map(n=>[n.id,n]));
 const profile=new URLSearchParams(location.search).get('qaProfile')||'study';
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(profile))throw Error('Invalid house preview profile');
 const saveKey='crafted-realms:studio-house-walk:'+profile;
 const revision=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({layout,envelopes,terrain,dock,graph}))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const offset=model.position.clone().sub(new THREE.Vector3(-2,3.04,42));
 const mixer=new THREE.AnimationMixer(model),actions={};
 for(const name of ['idle','walk']){const clip=animations.find(c=>c.name===name);if(clip){actions[name]=mixer.clipAction(clip);actions[name].play()}}
 const message=document.createElement('p');message.className='note';message.textContent='House walk study · open doors, then select a destination. This uses draft collision envelopes.';host.append(message);
 const landing='exterior:'+Math.floor(layout.landing.x)+','+Math.floor(layout.landing.z);
 for(const goal of ['ground:65,97','upper:65,96',dock.destination])if(!nodes[landing]||!nav.route(graph,landing,goal)||!nav.route(graph,goal,landing))throw Error('Arrival preview has a disconnected required route: '+goal);
 console.info('[HOLM_ARRIVAL_PREVIEW] landing/chart/study return routes connected; '+graph.nodes.length+' stance nodes');
 let current=landing,path=[],progress=0,started=true,initial=true;
 let restored;
 try{const raw=localStorage.getItem(saveKey);if(raw){restored=HolmArrivalCheckpoint.restore(graph,JSON.parse(raw),revision);current=restored.id;started=true;initial=false;openDoors();message.textContent='Preparing saved preview position on '+restored.surface+'.'}}catch(e){message.textContent='Saved preview position could not be restored: '+e.message}
 function place(p){model.position.set(p.x-72+offset.x,p.y+offset.y,p.z-64+offset.z);onSurface(p.surface);}
 function walkTo(target,label){
  if((target.startsWith('dock:')||current.startsWith('dock:'))&&!getDock()){message.textContent='Wait for the dock model to load.';return}
  if(!doorsOpen()){message.textContent='Open the house doors fully before walking.';return}
  if(path.length){message.textContent='Finish the current walk before choosing another destination.';return}
  if(!nodes[target]){message.textContent='That tile has no clear standing space on this floor.';return}
  if(!started){place(nodes[current]);started=true}
  const route=nav.route(graph,current,target);if(!route){message.textContent='No supported route.';return}
  path=route.slice(1);progress=0;message.textContent=path.length?'Walking · '+label:'Already at '+current;
 }
 for(const [label,target] of [['Walk to downstairs chart','ground:65,97'],['Walk to provision rack',provisions.service.stanceNodeId],['Walk upstairs to study','upper:65,96'],['Walk back to landing',landing],['Walk to dock end',dock.destination]]){
  const button=document.createElement('button');button.textContent=label;host.append(button);
  button.onclick=()=>walkTo(target,label.toLowerCase());
 }
 const hint=document.createElement('p');hint.className='note';hint.textContent='Click a visible floor or stair to walk there. Dragging still orbits the camera.';host.append(hint);
 const save=document.createElement('button');save.textContent='Save preview position';host.append(save);
 save.onclick=()=>{
  if(!started||path.length||restored||!doorsOpen()){message.textContent='Reach a destination with the doors open before saving the preview.';return}
  try{localStorage.setItem(saveKey,JSON.stringify(HolmArrivalCheckpoint.encode(graph,current,revision)));message.textContent='Saved '+current+' for this preview profile. Reload to resume.'}catch(e){message.textContent='Preview save failed: '+e.message}
 };
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pressed;
 function visible(obj){for(let p=obj;p;p=p.parent)if(!p.visible)return false;return true}
 function surface(obj){if(obj.name==='ArrivalTrail')return 'exterior';if(/^DockDeck/.test(obj.name))return 'dock';return /^UpperFloor/.test(obj.name)?'upper':/^GroundFloor/.test(obj.name)?'ground':/^StairFlight/.test(obj.name)?'stair':null}
 function down(e){if(e.button===0)pressed={x:e.clientX,y:e.clientY}}
 function up(e){
  const start=pressed;pressed=null;if(!start||e.button!==0||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;
  const house=getHouse();if(!house)return;
  const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  // Raycast all visible house meshes so walls/furniture occlude floors. Hidden
  // upper storeys must never steal a downstairs hit at the same X/Z.
  const targets=[];const trail=getTrail();if(trail)targets.push(trail);house.traverse(o=>{if(o.isMesh&&visible(o))targets.push(o)});const dockModel=getDock();if(dockModel)dockModel.traverse(o=>{if(o.isMesh&&visible(o))targets.push(o)});const skiff=getSkiff();if(skiff)skiff.traverse(o=>{if(o.isMesh&&visible(o))targets.push(o)});
  const hit=raycaster.intersectObjects(targets,false)[0];if(!hit)return;
  for(let o=hit.object;o;o=o.parent){if(o.name==='GroundFurnishingProvisions'){walkTo(provisions.service.stanceNodeId,'to the provision rack');return}if(o.userData.walkTarget){walkTo(o.userData.walkTarget,'to the skiff mooring');return}}
  const kind=surface(hit.object);if(!kind){message.textContent='Click clear floor space or a stair tread.';return}
  const id=kind+':'+Math.floor(hit.point.x+72)+','+Math.floor(hit.point.z+64);
  walkTo(id,'to '+kind+' floor tile');
 }
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);
 return {update(dt){
  if(initial&&getHouse()){place(nodes[current]);initial=false;message.textContent='At the landing. Open the house doors, then click the trail or choose a destination.'}
  if(restored&&getHouse()&&doorsOpen()){place(restored);message.textContent='Restored '+restored.id+' · height '+restored.y.toFixed(2)+' tiles. Preview only.';restored=null}
  const moving=path.length>0&&doorsOpen();
  if(actions.idle)actions.idle.setEffectiveWeight(moving?0:1);
  if(actions.walk)actions.walk.setEffectiveWeight(moving?1:0);
  mixer.update(dt);
  if(!path.length)return;
  // Keep the last supported position if the environment changes mid-edge.
  if(!doorsOpen()){message.textContent='Walk paused while doors are moving or closed.';return}
  const from=nodes[current],to=nodes[path[0]];
  model.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
  progress=Math.min(1,progress+dt*2.2);
  const p=nav.point(from,to,progress,doors);
  if(!p){message.textContent='Unsupported movement stopped.';path=[];return}
  place(p);
  if(progress===1){current=path.shift();progress=0;if(!path.length)message.textContent='Reached '+current+' · height '+p.y.toFixed(2)+' tiles. Preview traversal only.'}
 }};
}
