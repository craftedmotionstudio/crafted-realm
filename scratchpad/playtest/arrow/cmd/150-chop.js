const nearestMarked = "(function(){let b=null,bd=1e9;for(const o of WORLD.clickables){if(!(o.userData&&o.userData.marked&&o.userData.alive))continue;const w=o.getWorldPosition(new THREE.Vector3());const d=Math.hypot(w.x-player.position.x,w.z-player.position.z);if(d<bd){bd=d;b=o;}}return b;})()";
let c = await p.clickObject(nearestMarked);
out('click marked tree', c);
const got = await p.waitFor("(Player.inv||[]).some(s=>s&&s.id==='logs')", 30000);
out('got logs', got);
await sleep(800);
let v = await look('after-chop');
