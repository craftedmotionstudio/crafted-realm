/* Scarlands bestiary viewer (W2/W3, 2026-09-26): loads each creature GLB the way the game will (three.js r128,
 * GLTFLoader, AnimationMixer, colours as display values, colour maps LinearEncoding + NearestFilter, the game's
 * hemisphere + sun light), and poses any clip at any frame for review sheets.
 * API (captures): bvReady, bvList(), bvShow(ids, opts), bvPose(id, clip, frame), bvView({yaw, pitch, dist, target, fov}),
 * bvStats(). Open: /tools/scarlands_bestiary_view.html[?manifest=<bestiary manifest>] */
(function(){
 'use strict';
 var qs = new URLSearchParams(location.search);
 var MANIFEST = qs.get('manifest') || '../.studio-workspaces/scarlands-bestiary-v1/candidates/manifest.json';
 var REF = qs.get('ref') || '../.studio-workspaces/holm-characters-v30/candidates/bram.glb';
 var hud = document.getElementById('hud'); if (qs.get('clean')) hud.style.display = 'none';
 var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
 renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
 var scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a2622);
 var camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 200);
 scene.add(new THREE.HemisphereLight(0xd8dccf, 0x6f6a58, 0.82));
 var sun = new THREE.DirectionalLight(0xfff0d8, 1.0); sun.position.set(6, 9, 8); scene.add(sun);
 var ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4a4038 }));
 scene.add(ground);
 var grid = new THREE.GridHelper(60, 60, 0x5a5048, 0x5a5048); grid.position.y = 0.002; scene.add(grid);   // 1 tile = 1 unit
 var models = {}, labels = [], view = { yaw: 0.6, pitch: 0.25, dist: 6, target: [0, 1, 0], fov: 30 };

 addEventListener('resize', function(){ renderer.setSize(innerWidth, innerHeight); render(); });
 function load(url){ return new Promise(function(res, rej){ new THREE.GLTFLoader().load(url, res, undefined, rej); }); }
 function prepare(root){ root.traverse(function(o){ if (!o.isMesh) return; o.frustumCulled = false;
   [].concat(o.material).forEach(function(m){ if (!m) return; if (m.map){ m.map.encoding = THREE.LinearEncoding; m.map.magFilter = THREE.NearestFilter; m.map.needsUpdate = true; }
     if ('roughness' in m){ m.roughness = 1; m.metalness = 0; } m.needsUpdate = true; }); }); }
 function add(id, gltf, entry){
   var root = gltf.scene; prepare(root);
   var mixer = new THREE.AnimationMixer(root), clips = {};
   gltf.animations.forEach(function(c){ clips[c.name] = c; });
   models[id] = { id: id, root: root, mixer: mixer, clips: clips, entry: entry, action: null };
   root.visible = false; scene.add(root);
 }
 window.bvList = function(){ return Object.keys(models).map(function(id){ return { id: id, clips: Object.keys(models[id].clips).map(function(n){ return [n, +(models[id].clips[n].duration * 30).toFixed(1)]; }) }; }); };
 // show some models in a row along x (spacing in metres), all others hidden; opts.labels draws their names
 window.bvShow = function(ids, opts){ opts = opts || {}; var x = 0; labels.forEach(function(l){ l.el.remove(); }); labels = [];
   Object.keys(models).forEach(function(id){ models[id].root.visible = false; });
   ids.forEach(function(id, i){ var m = models[id]; if (!m) throw Error('no model ' + id); m.root.visible = true;
     var w = opts.spacing ? opts.spacing[i] : 0; m.root.position.set(x + w / 2, 0, 0); m.root.rotation.y = opts.yaw || 0; x += w;
     if (opts.labels){ var el = document.createElement('div'); el.className = 'tag'; el.textContent = opts.labels[i] || id; document.body.appendChild(el); labels.push({ el: el, m: m }); } });
   return x; };
 window.bvPose = function(id, clip, frame){ var m = models[id]; if (!m) throw Error('no model ' + id); var c = m.clips[clip]; if (!c) throw Error(id + ' has no clip ' + clip);
   m.mixer.stopAllAction(); var a = m.mixer.clipAction(c); a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play(); a.paused = false;
   m.mixer.setTime(Math.min(c.duration - 1e-4, frame / 30)); render(); return c.duration * 30; };
 window.bvYaw = function(id, yaw){ models[id].root.rotation.y = yaw; render(); };
 window.bvSize = function(id){ var b = new THREE.Box3().setFromObject(models[id].root); var s = b.getSize(new THREE.Vector3()); return { x: s.x, y: s.y, z: s.z, minY: b.min.y }; };
 window.bvView = function(v){ Object.assign(view, v || {}); render(); return view; };
 window.bvStats = function(){ render(); var r = renderer.info.render; return { calls: r.calls, triangles: r.triangles }; };
 function render(){
   camera.fov = view.fov; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
   var t = new THREE.Vector3().fromArray(view.target);
   camera.position.set(t.x + view.dist * Math.sin(view.yaw) * Math.cos(view.pitch), t.y + view.dist * Math.sin(view.pitch), t.z + view.dist * Math.cos(view.yaw) * Math.cos(view.pitch));
   camera.lookAt(t); scene.updateMatrixWorld(true); renderer.render(scene, camera);
   labels.forEach(function(l){ var p = l.m.root.position.clone(); p.y = -0.05; p.project(camera); l.el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; l.el.style.top = ((1 - p.y) / 2 * innerHeight + 6) + 'px'; });
 }
 fetch(MANIFEST, { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(man){
   var base = MANIFEST.replace(/[^/]*$/, '');
   var jobs = man.creatures.map(function(c){ return load(base + c.model.file).then(function(g){ add(c.id, g, c); }); });
   jobs.push(load(REF).then(function(g){ add('player_ref', g, { id: 'player_ref', name: 'player-sized human (kit v3.0)' }); }).catch(function(){}));
   return Promise.all(jobs).then(function(){ hud.textContent = 'Scarlands bestiary - ' + man.creatures.length + ' creatures'; render(); window.bvReady = true; });
 }).catch(function(e){ hud.textContent = 'ERROR ' + e.message; window.bvError = String(e); console.error(e); });
})();
