/* Scarlands kit proof renderer (W2/W3, 2026-09-26): the kit placed from a placement list over its ground grid, drawn
 * the way the game draws the old-school island (three.js r128, linear output, colour maps as display values):
 *  - ground: one colour per tile from its kind (placement.ground.kindColours), gouraud light baked per vertex from the
 *    corner heights, the kit's ground texture for its kind multiplied in as detail (divided by the texture mean);
 *    carved tiles (the Ditch) drawn with their own lowered corners so the banks stay vertical;
 *  - props: one InstancedMesh per kit mesh primitive (draw calls = primitives of the pieces in use, not pieces placed);
 *  - two looks: 'day' (the game's classic sky and distant fog) and 'void' (old-school black past the draw distance).
 * It is also the reference for how the online client can consume the kit (see docs/rebuild/scarlands/README.md).
 * API for captures: proofView({x, z, yaw, pitch, dist, mode}), proofCatalog(on), proofStats(); window.proofReady.
 * Open: /tools/scarlands_proof.html[?kit=<manifest>&placement=<placement>] */
(function(){
 'use strict';
 var qs = new URLSearchParams(location.search);
 // the published copies (tools/publish_scarlands_kit.js); ?kit= / ?placement= point at candidates or another layout
 var KIT = qs.get('kit') || '../assets/scarlands/kit-v2/manifest.json';
 var PLACE = qs.get('placement') || '../assets/scarlands/proof/placement.json';
 var TEX = '../assets/textures/oldschool/';
 var hud = document.getElementById('hud');
 var renderer = new THREE.WebGLRenderer({ antialias: true });
 renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
 var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 600);
 scene.fog = new THREE.Fog(0x000000, 50, 60); scene.background = new THREE.Color(0x000000);
 var hemi = new THREE.HemisphereLight(0xd8dccf, 0x6f6a58, 0.82), sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
 sun.position.set(60, 60, 52); scene.add(hemi, sun);
 var world = new THREE.Group(), catalog = new THREE.Group(); scene.add(world, catalog); catalog.visible = false;
 var G = null, heights = null, kit = null, place = null, labels = [];

 function json(u){ return fetch(u, { cache: 'no-store' }).then(function(r){ if (!r.ok) throw Error(u + ' ' + r.status); return r.json(); }); }
 function texture(name){ return new Promise(function(res, rej){ new THREE.TextureLoader().load(TEX + name + '.png', function(t){
   t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
   t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); t.encoding = THREE.LinearEncoding; res(t); }, undefined, rej); }); }

 // ---------- ground ----------
 var KIND_TEX = { grass: 'grass_a', dirt: 'dirt', burnt_grass: 'burnt_grass', scorched_earth: 'scorched_earth', ash: 'ash', cracked_mud: 'cracked_mud', dark_rock: 'dark_rock', bone_dirt: 'bone_dirt' };
 var LOOK = { light: [.52, .62, .58], ambient: .55, diffuse: .72, min: .55, max: 1.32, scale: .76, patch: .13, jitter: .07 };
 function rnd(x, z, k){ var s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }
 function patch(x, z){ var fx = x / 5, fz = z / 5, ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, w = fz - iz; u = u * u * (3 - 2 * u); w = w * w * (3 - 2 * w);
   function q(a, b){ return rnd(a, b, 9) * 2 - 1; } return (q(ix, iz) * (1 - u) + q(ix + 1, iz) * u) * (1 - w) + (q(ix, iz + 1) * (1 - u) + q(ix + 1, iz + 1) * u) * w; }
 function cornerH(cx, cz){ cx = Math.max(0, Math.min(G.width, cx)); cz = Math.max(0, Math.min(G.depth, cz)); return G.cornerHeights[cz * (G.width + 1) + cx]; }
 // ground height at a map point (tile units, server x/z), bilinear over the tile corners (uncut ground)
 function groundY(x, z){ var lx = x - G.x1, lz = z - G.z1, ix = Math.floor(lx), iz = Math.floor(lz), fx = lx - ix, fz = lz - iz;
   return (cornerH(ix, iz) * (1 - fx) + cornerH(ix + 1, iz) * fx) * (1 - fz) + (cornerH(ix, iz + 1) * (1 - fx) + cornerH(ix + 1, iz + 1) * fx) * fz; }
 function light(cx, cz){ var L = LOOK.light, ll = Math.hypot(L[0], L[1], L[2]), dx = (cornerH(cx + 1, cz) - cornerH(cx - 1, cz)) / 2, dz = (cornerH(cx, cz + 1) - cornerH(cx, cz - 1)) / 2;
   // three.js frame: x east, z = -north, so the slope along -z is -dz
   var n = Math.hypot(dx, 1, dz), flat = LOOK.ambient + LOOK.diffuse * L[1] / ll, v = (LOOK.ambient + LOOK.diffuse * ((-dx * L[0] + L[1] + dz * L[2]) / ll / n)) / flat;
   return Math.max(LOOK.min, Math.min(LOOK.max, v)); }
 function buildGround(texs, means){
   var cut = {}, W = G.width, D = G.depth, over = G.overlays || []; (G.cut || []).forEach(function(c){ cut[c[0] + ',' + c[1]] = c[2]; });
   var pos = [], col = [], mixA = [], mixB = [];
   function kindAt(x, z){ x = Math.max(0, Math.min(W - 1, x)); z = Math.max(0, Math.min(D - 1, z)); return G.kindNames[G.kinds[z * W + x]]; }
   // 2004-style underlay blend: a corner takes the mean colour and texture weights of the underlay tiles around it
   // (4x4 tiles, the inner 2x2 doubled; overlays such as paths skipped), so burnt ground melts into ash over a tile or two
   var cornerCache = {};
   function underlayAt(cx, cz){ var key = cx + ',' + cz; if (cornerCache[key]) return cornerCache[key];
     var c = [0, 0, 0], w = [0, 0, 0, 0, 0, 0, 0, 0], n = 0;
     for (var dz = -2; dz <= 1; dz++) for (var dx = -2; dx <= 1; dx++) { var kd = kindAt(cx + dx, cz + dz); if (over.indexOf(kd) >= 0) continue;
       var wt = (dx >= -1 && dx <= 0 && dz >= -1 && dz <= 0) ? 2 : 1, b = G.kindColours[kd]; c[0] += b[0] * wt; c[1] += b[1] * wt; c[2] += b[2] * wt; w[G.kindNames.indexOf(kd)] += wt; n += wt; }
     if (!n){ var kd2 = kindAt(cx, cz), b2 = G.kindColours[kd2]; c = b2.slice(); w[G.kindNames.indexOf(kd2)] = 1; n = 1; }
     return cornerCache[key] = { c: [c[0] / n, c[1] / n, c[2] / n], w: w.map(function(v){ return v / n; }) }; }
   for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
     var tx = G.x1 + x, tz = G.z1 + z, kind = kindAt(x, z), depth = cut[tx + ',' + tz] || 0, isOver = over.indexOf(kind) >= 0;
     var k = LOOK.scale * (1 + patch(tx, tz) * LOOK.patch + (rnd(tx, tz, 1) - .5) * LOOK.jitter) / 255;
     var own = { c: G.kindColours[kind], w: G.kindNames.map(function(nm){ return nm === kind ? 1 : 0; }) };
     var corners = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]].map(function(c){ var h = depth ? -depth - 0.05 : cornerH(c[0], c[1]), li = depth ? 0.35 : light(c[0], c[1]);   // under the piece's own floor
       var u = isOver || depth ? own : underlayAt(c[0], c[1]);
       return { p: [G.x1 + c[0], h, -(G.z1 + c[1])], c: [Math.min(1, u.c[0] * k * li), Math.min(1, u.c[1] * k * li), Math.min(1, u.c[2] * k * li)], w: u.w }; });
     var tri = ((tx + tz) & 1) ? [0, 1, 2, 0, 2, 3] : [0, 1, 3, 1, 2, 3];
     tri.forEach(function(i){ pos.push.apply(pos, corners[i].p); col.push.apply(col, corners[i].c); mixA.push.apply(mixA, corners[i].w.slice(0, 4)); mixB.push.apply(mixB, corners[i].w.slice(4, 8)); });
   }
   var g = new THREE.BufferGeometry();
   g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
   g.setAttribute('mixA', new THREE.Float32BufferAttribute(mixA, 4)); g.setAttribute('mixB', new THREE.Float32BufferAttribute(mixB, 4)); g.computeVertexNormals();
   var m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), names = G.kindNames;
   m.onBeforeCompile = function(sh){
     names.forEach(function(n, i){ sh.uniforms['gt' + i] = { value: texs[n] }; });
     sh.vertexShader = 'attribute vec4 mixA;\nattribute vec4 mixB;\nvarying vec4 vA;\nvarying vec4 vB;\nvarying vec2 vXZ;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvA = mixA; vB = mixB; vXZ = position.xz;');
     var decl = 'varying vec4 vA;\nvarying vec4 vB;\nvarying vec2 vXZ;\n' + names.map(function(n, i){ return 'uniform sampler2D gt' + i + ';'; }).join('\n') + '\n';
     var sum = names.map(function(n, i){ var mu = means[KIND_TEX[n]], s = n === 'grass' ? 1.6 : 1.5;
       return '(texture2D(gt' + i + ', vXZ / ' + s.toFixed(2) + ').rgb / vec3(' + mu.map(function(v){ return v.toFixed(4); }).join(',') + ')) * ' + (i < 4 ? 'vA.' + 'xyzw'[i] : 'vB.' + 'xyzw'[i - 4]); }).join(' + ');
     sh.fragmentShader = decl + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), ' + sum + ', 0.9);');
   };
   m.customProgramCacheKey = function(){ return 'scarlands-ground-v1'; };
   var mesh = new THREE.Mesh(g, m); mesh.name = 'scarlands-ground'; world.add(mesh);
 }
 function buildWater(tex){
   // extra water rectangles of the layout that have no piece (the Scarlands pool): a dark, still pool
   (place.water || []).forEach(function(r){ var g = new THREE.PlaneGeometry(r[2] - r[0] + 1, r[3] - r[1] + 1); g.rotateX(-Math.PI / 2);
     var m = new THREE.MeshBasicMaterial({ map: tex, color: 0x6b707a }); tex.repeat.set(1, 1);
     var mesh = new THREE.Mesh(g, m); mesh.position.set((r[0] + r[2] + 1) / 2, groundY((r[0] + r[2] + 1) / 2, (r[1] + r[3] + 1) / 2) - 0.12, -(r[1] + r[3] + 1) / 2); world.add(mesh); });
 }

 // ---------- props: one InstancedMesh per kit primitive ----------
 function prepare(root){ root.traverse(function(o){ if (!o.isMesh) return; [].concat(o.material).forEach(function(m){ if (!m) return;
   if (m.map){ m.map.encoding = THREE.LinearEncoding; m.map.magFilter = THREE.NearestFilter; m.map.minFilter = THREE.LinearMipmapLinearFilter; m.map.anisotropy = 4; m.map.needsUpdate = true; }
   if ('roughness' in m){ m.roughness = 1; m.metalness = 0; } m.needsUpdate = true; }); }); }
 var drawn = { instancedMeshes: 0, instances: 0 };
 function instance(gltf, group, rows, yOf){
   var byPiece = {}; rows.forEach(function(r){ (byPiece[r.node] = byPiece[r.node] || []).push(r); });
   Object.keys(byPiece).forEach(function(node){
     var root = gltf.scene.getObjectByName(node); if (!root) throw Error('kit has no ' + node);
     root.updateMatrixWorld(true);
     var inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), list = byPiece[node];
     root.traverse(function(o){ if (!o.isMesh) return;
       var local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), im = new THREE.InstancedMesh(o.geometry, o.material, list.length);
       list.forEach(function(r, i){ var m = new THREE.Matrix4().compose(new THREE.Vector3(r.cx, yOf(r), -r.cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.yaw), new THREE.Vector3(1, 1, 1));
         im.setMatrixAt(i, m.multiply(local)); });
       im.instanceMatrix.needsUpdate = true; im.name = node; group.add(im); drawn.instancedMeshes++; drawn.instances += list.length; });
   });
 }

 // ---------- looks and camera (the game's follow camera: 30 deg lens, yaw/pitch/dist, looking 1.2 over the focus) ----------
 var view = { x: 32, z: 60, yaw: 0, pitch: 1.08, dist: 33, mode: 'void' };
 function applyView(){
   var fy = catalog.visible ? 0 : groundY(view.x, view.z), f = new THREE.Vector3(view.x, fy, -view.z);
   camera.position.set(f.x + view.dist * Math.sin(view.yaw) * Math.cos(view.pitch * 0.6), f.y + view.dist * Math.sin(view.pitch), f.z + view.dist * Math.cos(view.yaw) * Math.cos(view.pitch * 0.6));
   camera.lookAt(f.x, f.y + 1.2, f.z);
   if (view.mode === 'day'){ scene.background = new THREE.Color(0xa8c4d8); scene.fog.color.setHex(0xb4c6cc); scene.fog.near = 65; scene.fog.far = 205; }
   else { scene.background = new THREE.Color(0x000000); scene.fog.color.setHex(0x000000); scene.fog.near = view.dist + 24; scene.fog.far = view.dist + 32; }
   renderer.render(scene, camera); placeLabels();
 }
 function placeLabels(){ labels.forEach(function(l){ var p = l.at.clone().project(camera); l.el.style.display = catalog.visible && p.z < 1 ? 'block' : 'none';
   l.el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; l.el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px'; }); }
 window.proofView = function(v){ Object.assign(view, v || {}); applyView(); return { camera: camera.position.toArray(), mode: view.mode }; };
 window.proofCatalog = function(on){ catalog.visible = !!on; world.visible = !on; applyView(); return on; };
 window.proofStats = function(){ renderer.render(scene, camera); var r = renderer.info.render; return { calls: r.calls, triangles: r.triangles, textures: renderer.info.memory.textures, programs: renderer.info.programs.length, drawn: drawn }; };
 addEventListener('resize', function(){ camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); applyView(); });

 Promise.all([json(KIT), json(PLACE), json(TEX + 'kit.json')]).then(function(r){
   kit = r[0]; place = r[1]; G = place.ground; var kj = r[2], means = {};
   Object.keys(kj.textures).forEach(function(n){ means[n] = kj.textures[n].mean; });
   var names = Object.keys(KIND_TEX).map(function(k){ return KIND_TEX[k]; }).concat(['water']);
   return Promise.all(names.map(texture)).then(function(ts){ var texs = {}; Object.keys(KIND_TEX).forEach(function(k, i){ texs[k] = ts[i]; });
     buildGround(texs, means); buildWater(ts[ts.length - 1]);
     return new Promise(function(res, rej){ new THREE.GLTFLoader().load(KIT.replace(/manifest\.json$/, kit.glb.file), res, undefined, rej); });
   });
 }).then(function(gltf){
   prepare(gltf.scene);
   instance(gltf, world, place.pieces, function(r){ var cut = r.node.indexOf('scar_ditch') === 0; return cut ? 0 : groundY(r.cx, r.cz); });
   // the catalog: every piece once, in rows of six on a flat patch, labelled
   var rows = kit.pieces.map(function(p, i){ var col = i % 7, row = Math.floor(i / 7); return { node: p.node, cx: 200 + col * 6 + 3, cz: 200 + row * 6 + 3, yaw: 0, id: p.id }; });
   instance(gltf, catalog, rows, function(r){ return r.node.indexOf('scar_ditch') === 0 ? 1.62 : 0; });   // trench pieces raised so their bed sits on the floor
   var floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a312a })); floor.position.set(221, 0, -215); catalog.add(floor);
   rows.forEach(function(r){ var el = document.createElement('div'); el.className = 'label'; el.textContent = r.id; document.body.appendChild(el);
     labels.push({ el: el, at: new THREE.Vector3(r.cx, 0, -r.cz + 2.1) }); });
   hud.textContent = 'Scarlands kit proof - ' + place.pieces.length + ' pieces, ' + kit.pieces.length + ' kinds';
   applyView(); window.proofReady = true;
 }).catch(function(e){ hud.textContent = 'ERROR ' + e.message; console.error(e); window.proofError = String(e); });
})();
