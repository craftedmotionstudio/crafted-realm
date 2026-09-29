/* Look v4 options (2026-09-28): our side of the look comparison, the same frames for every look option.
 * For each ?look= option (3 = the current look v3, 4a / 4b / 4c) a fresh profile boots our game and captures, through
 * the 2004 lens (36.13 deg vertical FOV, 22.5 deg elevation, 7.69-tile boom, look point 0.39 tile up; HUD hidden):
 *   scenery/  the harness's matched spots and yaws (town by the lodge / bakehouse, the oak field, the arrival dock and
 *             sea: tools/ref2004/capture_scenery.js picked them; the same tiles and yaws are pinned here), measured
 *             against the 2004 scenery frames by tools/ref2004/look_metrics.py;
 *   scenes/   the review page's scenes: the arrival dock, the Guide House front, the Guide House interior, a field,
 *             water (the creek by the fishing spot);
 *   character/ the adventurer close up, height-matched to the 2004 close-up (front and 3/4), each with a plate (the same
 *             frame without the player) for the silhouette.
 *   bun|node tools/ref2004/capture_look_options.js [--looks 3,4a,4b,4c] [--out DIR]
 * REF_OURS_BASE = the served tree (default http://127.0.0.1:8108). Our own game only; nothing from 2004 is touched. */
'use strict';
const path=require('path'),fs=require('fs');
const C=require('./lib/common');
const O=require('./lib/ours_client');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const LOOKS=arg('looks','3,4a,4b,4c').split(',').filter(Boolean);
const ROOT=arg('out',path.join(C.CAP,'look_options'));
// --only dock,scenery,water,character,guide: re-take just those steps (other frames on disk are kept)
const ONLY=arg('only','')?new Set(arg('only','').split(',')):null;
const want=k=>!ONLY||ONLY.has(k);
const L4=O.LENS2004;
// the harness's scenery spots on Tutor's Holm (tools/ref2004/capture_scenery.js, run 2026-09-28): tile centre + two yaws
// (2048ths of a turn, the 2004 unit) from which the 2004-lens view sees the adventurer
const SCENERY=[['town_holm',39.5,59.5,[256,1280]],['field_holm',38.5,96.5,[1280,256]],['water_holm',61.5,114.5,[512,1536]]];
const lens=y=>({vfov:L4.vfov,elevDeg:22.5,dist:L4.boomTiles(128),lift:L4.lookLift,yaw:Math.PI-y*Math.PI/1024});

async function walk(page,x,z){
  const ok=await page.evaluate((x,z)=>{Player.runOn=true;return orderWalk(new THREE.Vector3(x,0,z))!==false},x,z);if(!ok)return false;
  await page.waitForFunction((x,z)=>Math.hypot(player.position.x-x,player.position.z-z)<.6&&!(Player.path&&Player.path.length)&&!Player.moveTo,{timeout:90000,polling:200},x,z).catch(()=>{});
  const at=await page.evaluate(()=>[player.position.x,player.position.z]);return Math.hypot(at[0]-x,at[1]-z)<1;
}
// world only: every DOM layer hidden but the game canvas (hint labels created later stay hidden too)
// in-world text labels (sprites: tutor names, "Open the door") hidden too: 2004 writes no text into its world
async function hud(page,show){await page.evaluate(show=>{let t=document.getElementById('look4-hud');
  // (by their material: the guide arrow shows its sprites again every frame)
  if(show){(window.__look4Sprites||[]).forEach(m=>{m.visible=true});window.__look4Sprites=null}
  else{window.__look4Sprites=window.__look4Sprites||[];scene.traverse(o=>{if(o.isSprite&&o.material&&o.material.visible){o.material.visible=false;window.__look4Sprites.push(o.material)}})}
  if(show){if(t)t.remove();return}
  if(!t){t=document.createElement('style');t.id='look4-hud';t.textContent='body *{visibility:hidden !important} #game-canvas{visibility:visible !important}';document.head.appendChild(t)}},!!show);await O.waitFrames(page,2)}
// click an object by its userData.kind where the game's pick() hits it (as tools/qa_holm_island_playthrough.js clickKind)
async function clickKind(page,kind,extra){
  const name=await page.evaluate((kind,extra)=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))o=m});if(!o)return null;
    if(!o.name)o.name='look4-'+kind+'-'+Math.random().toString(36).slice(2,7);return o.name},kind,extra||null);
  return name?O.L.clickNamed(page,name):{error:'no '+kind};
}
async function shot(page,file,cam){if(cam)await O.setCam(page,cam);await C.sleep(900);await O.waitFrames(page,3);await page.screenshot({path:file})}

async function one(browser,look){
  const dir=path.join(ROOT,look),sd=path.join(dir,'scenery'),cd=path.join(dir,'scenes'),hd=path.join(dir,'character');
  for(const d of [sd,cd,hd]){fs.mkdirSync(d,{recursive:true});if(!ONLY)for(const f of fs.readdirSync(d))if(/\.png$/.test(f))fs.unlinkSync(path.join(d,f))}
  const page=await O.open(browser,{profile:'look4-'+look+'-'+Date.now().toString(36),query:'&look='+look});
  await page.mouse.move(1525,1000);
  const log={look,at:new Date().toISOString(),frames:[],state:null};
  log.state=await page.evaluate(()=>({look:typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook.snapshot():null,
    v4:typeof HolmLookV4!=='undefined'?HolmLookV4.snapshot():null,classic:typeof ClassicPixels!=='undefined'?ClassicPixels.snapshot():null}));
  C.log('['+look+'] state',JSON.stringify(log.state&&log.state.v4));
  // 1. the arrival dock: where a new adventurer lands (first frame, before walking anywhere)
  if(want('dock')){await hud(page,false);
  const spawn=await page.evaluate(()=>[player.position.x,player.position.z]);
  for(const y of [512,1536]){const f=path.join(cd,'dock_y'+y+'.png');await shot(page,f,lens(y));log.frames.push({scene:'dock',file:path.relative(dir,f),at:spawn,yaw:y})}
  await O.setCam(page,null);await hud(page,true)}
  // 2. the harness's scenery spots (the numbers)
  for(const [name,x,z,yaws] of SCENERY){
    if(!want('scenery'))continue;
    const ok=await walk(page,x,z);await C.sleep(1200);await hud(page,false);
    for(const y of yaws){const f=path.join(sd,name+'_p128_y'+y+'.png');await shot(page,f,lens(y));log.frames.push({scene:name,file:path.relative(dir,f),at:[x,z],yaw:y,reached:ok})}
    if(name==='field_holm'){const f=path.join(cd,'field_y'+yaws[0]+'.png');fs.copyFileSync(path.join(sd,name+'_p128_y'+yaws[0]+'.png'),f);log.frames.push({scene:'field',file:path.relative(dir,f)})}
    await O.setCam(page,null);await hud(page,true);
  }
  // 3. water: the creek by the fishing spot (the harness's water spot is the sea by the dock)
  if(want('water')){let ok=false,at=null;for(const [x,z] of [[44.5,92.5],[42.5,91.5],[46.5,93.5],[43.5,94.5],[41.5,89.5],[47.5,89.5]]){if(await walk(page,x,z)){ok=true;at=[x,z];break}}
    C.log('['+look+'] water spot',JSON.stringify(at));await C.sleep(1200);await hud(page,false);
    for(const y of [0,512,1024,1536]){const f=path.join(cd,'water_y'+y+'.png');await shot(page,f,lens(y));log.frames.push({scene:'water',file:path.relative(dir,f),reached:ok,yaw:y})}
    await O.setCam(page,null);await hud(page,true)}
  // 4. character close-up (height-matched to the 2004 close-up: 430 units from a point at mid-height, 22.5 deg), on the open
  // path by the lodge (the harness's town spot: nothing between the camera and the adventurer). 2004 lights a body from a
  // direction fixed to the body (front-left, above); our sun is fixed to the world, so the numbers are taken with the sun at
  // four sides of the body (front-left, then every quarter turn) and averaged; the page shows the front-left one
  if(want('character')){await walk(page,39.5,59.5);await C.sleep(1200);await hud(page,false);
    for(let k=0;k<4;k++){
      await page.evaluate(k=>{const s=scene.children.find(o=>o.isDirectionalLight);if(!s)return;const rig=player.userData.rigInner||player,q=new THREE.Quaternion();
        rig.getWorldQuaternion(q);const fw=new THREE.Vector3(0,0,1).applyQuaternion(q),d=s.position.clone().sub(s.target?s.target.position:new THREE.Vector3());
        player.rotation.y+=Math.atan2(d.x,d.z)-Math.atan2(fw.x,fw.z)-0.6+k*Math.PI/2;player.updateMatrixWorld(true)},k);await C.sleep(500);
      // the body's own height (meshes only: a name tag or a held item is not the adventurer) and the way the body faces
      const [h,rot]=await page.evaluate(()=>{const rig=player.userData.rigInner||player,b=new THREE.Box3();rig.updateMatrixWorld(true);
        rig.traverse(o=>{if((o.isMesh||o.isSkinnedMesh)&&o.visible&&!o.isSprite)b.expandByObject(o)});
        const q=new THREE.Quaternion();rig.getWorldQuaternion(q);const fw=new THREE.Vector3(0,0,1).applyQuaternion(q);return [b.max.y-b.min.y,Math.atan2(fw.x,fw.z)]});
      const H04=193/128,D04=430/128;
      for(const rel of [0,256]){
        const cam={vfov:L4.vfov,elevDeg:22.5,dist:D04*h/H04,lift:h/2,yaw:rot+rel*Math.PI/1024};
        const f=path.join(hd,'close_f'+k+'_rel'+rel+'.png');await shot(page,f,cam);
        await O.hidePlayer(page,true);await shot(page,path.join(hd,'close_f'+k+'_rel'+rel+'_plate.png'));await O.hidePlayer(page,false);
        if(k===0)for(const x of ['','_plate'])fs.copyFileSync(path.join(hd,'close_f0_rel'+rel+x+'.png'),path.join(hd,'close_rel'+rel+x+'.png'));
        log.frames.push({scene:'character',file:path.relative(dir,f),rel,sun:k,height:h})}}
    await O.setCam(page,null);await hud(page,true)}
  // 5. the Guide House: its front (the adventurer a few tiles south of the door, the camera behind him looking north)
  if(want('guide')){const door=await page.evaluate(()=>{const d=scene.getObjectByName('DoorSouthLeaf');if(!d)return null;const c=new THREE.Box3().setFromObject(d).getCenter(new THREE.Vector3());return [c.x,c.z]});
    if(door){const ok=await walk(page,Math.floor(door[0])+.5,Math.floor(door[1])+3.5);await C.sleep(1200);await hud(page,false);
      for(const [tag,y] of [['front',1024],['front_side',864]]){const f=path.join(cd,'guide_'+tag+'.png');await shot(page,f,lens(y));log.frames.push({scene:'guide_front',file:path.relative(dir,f),reached:ok,yaw:y,door})}
      await O.setCam(page,null);await hud(page,true);
      // 6. inside (the game lifts the upper storey when you walk in)
      const opened=await clickKind(page,'arrival_door',['arrivalDoor','arrival']);
      await page.waitForFunction(()=>{const r=HolmArrivalQA.saveRecord();return r&&r.doors&&r.doors.arrival},{timeout:40000,polling:300}).catch(()=>{});
      const r=await O.L.enterGuideHouse(page);await C.sleep(1500);
      // into the room's middle (the camera then looks over the ground-floor walls, as 2004's does over its rooms)
      const mid=await page.evaluate(()=>{const h=scene.getObjectByName('GuideHouse');if(!h)return null;const c=new THREE.Box3().setFromObject(h).getCenter(new THREE.Vector3());return [Math.floor(c.x)+.5,Math.floor(c.z)+.5]});
      if(mid&&r&&r.ok)await walk(page,mid[0],mid[1]);await C.sleep(2000);await hud(page,false);
      for(const [tag,cam] of [['interior_y1024',lens(1024)],['interior_y0',lens(0)],['interior_p256_y1024',Object.assign(lens(1024),{elevDeg:45,dist:L4.boomTiles(256)})]]){const f=path.join(cd,tag+'.png');await shot(page,f,cam);log.frames.push({scene:'interior',file:path.relative(dir,f),opened:opened,entered:!!(r&&r.ok),tag})}
      await O.setCam(page,null);await hud(page,true)}
    else C.log('['+look+'] no Guide House door found')}
  log.renderer=await page.evaluate(()=>{const i=renderer.info.render;return {calls:i.calls,triangles:i.triangles,canvas:[renderer.domElement.width,renderer.domElement.height]}});
  C.writeJSON(path.join(dir,ONLY?'log_'+[...ONLY].join('_')+'.json':'log.json'),log);
  await page.close();
  C.log('['+look+'] frames',log.frames.length);
}

(async()=>{
  const browser=await C.launch(1530,1006);
  try{for(const look of LOOKS)await one(browser,look).catch(e=>C.log('['+look+'] error',e&&e.stack||e))}
  finally{await browser.close().catch(()=>{})}
  C.log('look options: frames in',ROOT,'- next: python tools/ref2004/look_metrics.py options');
  process.exit(0);
})();
