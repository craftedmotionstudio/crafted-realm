// Isolated Studio candidate loader. Coordinates and habitat selection belong to the caller.
export const HABITAT_ASSETS = Object.freeze(['oak', 'birch', 'coastal-pine', 'meadow-tuft', 'creek-reeds']);
// v3 (owner review 6, 2026-09-24): the oak's limbs now show between separate crowns; other assets unchanged.
const assetRoot = '../.studio-workspaces/holm-tree-family-v3/candidates/';

export function validatePlacements(placements) {
  if (!Array.isArray(placements)) throw new TypeError('Habitat placements must be an array');
  const ids = new Set();
  return placements.map((p, i) => {
    if (!p || typeof p.id !== 'string' || !p.id.trim() || ids.has(p.id))
      throw new TypeError(`Habitat placement ${i}: missing or duplicate id`);
    if (!HABITAT_ASSETS.includes(p.asset)) throw new TypeError(`Habitat ${p.id}: unknown asset`);
    for (const key of ['x', 'z', 'scale', 'yaw'])
      if (!Number.isFinite(p[key])) throw new TypeError(`Habitat ${p.id}: nonfinite ${key}`);
    if (p.scale <= 0) throw new RangeError(`Habitat ${p.id}: scale must be positive`);
    ids.add(p.id);
    return {id: p.id, asset: p.asset, x: p.x, z: p.z, scale: p.scale, yaw: p.yaw};
  });
}

// No fetch or scene construction at module load; these assertions exercise the pure DATA boundary.
{
  const p = {id: 'test', asset: 'oak', x: 0, z: 0, scale: 1, yaw: 0};
  const rejects = value => { try { validatePlacements(value); return false; } catch { return true; } };
  const checks = [validatePlacements([p]).length === 1, rejects([{...p, asset: 'unknown'}]),
    rejects([p, {...p}]), rejects([{...p, x: NaN}]), rejects([{...p, scale: 0}]),
    rejects([{...p, yaw: Infinity}])];
  if (checks.some(ok => !ok)) throw new Error('[HOLM_HABITAT] DATA acceptance failed');
  console.info(`[HOLM_HABITAT] ${checks.length}/${checks.length} DATA acceptance ok`);
}

export async function buildHolmHabitat({THREE, GLTFLoader, placements, sample, offset = {x: -72, z: -64}}) {
  const rows = validatePlacements(placements);
  if (typeof sample !== 'function') throw new TypeError('Habitat requires sample(worldX, worldZ)');
  if (!offset || !Number.isFinite(offset.x) || !Number.isFinite(offset.z))
    throw new TypeError('Habitat offset must have finite x and z');
  const heights = rows.map(p => {
    const y = sample(p.x, p.z);
    if (!Number.isFinite(y)) throw new TypeError(`Habitat ${p.id}: unsupported ground sample`);
    return y;
  });
  const group = new THREE.Group();
  group.name = 'HolmHabitatCandidate';
  const geometries = new Set(), materials = new Set(), textures = new Set(), mixers = [];
  let disposed = false;
  const collect = root => root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const mat of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!mat) continue;
      materials.add(mat);
      for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    }
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const {mixer, root} of mixers) { mixer.stopAllAction(); mixer.uncacheRoot(root); }
    group.removeFromParent();
    group.clear();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  }
  try {
    const loader = new GLTFLoader();
    const names = [...new Set(rows.map(p => p.asset))];
    // All requests settle before cleanup, including successes that arrive after an earlier failure.
    const results = await Promise.allSettled(names.map(async name => loader.loadAsync(assetRoot + name + '.glb')));
    for (const result of results) if (result.status === 'fulfilled')
      for (const root of new Set([result.value.scene, ...(result.value.scenes || [])])) if (root) collect(root);
    const failed = results.findIndex(r => r.status === 'rejected');
    if (failed >= 0) throw new Error(`Habitat ${names[failed]} failed to load`, {cause: results[failed].reason});
    const sources = new Map();
    results.forEach((result, i) => {
      const gltf = result.value;
      let skinned = false;
      gltf.scene.traverse(o => { if (o.isSkinnedMesh) skinned = true; });
      if (skinned) throw new Error(`Habitat ${names[i]} needs a skeleton-aware loader`);
      const breeze = gltf.animations.find(clip => clip.name === 'Breeze');
      if (!breeze || !(breeze.duration > 0)) throw new Error(`Habitat ${names[i]} is missing Breeze`);
      gltf.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
      if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite))
        throw new Error(`Habitat ${names[i]} has invalid bounds`);
      sources.set(names[i], {gltf, breeze, minY: bounds.min.y});
    });
    let meshes = 0, triangles = 0;
    const perAsset = {}, supports = [];
    rows.forEach((p, i) => {
      const source = sources.get(p.asset), root = source.gltf.scene.clone(true);
      // The wrapper owns placement, so clip tracks cannot overwrite terrain support or yaw.
      const wrapper = new THREE.Group();
      wrapper.name = p.id;
      wrapper.position.set(p.x + offset.x, heights[i] - source.minY * p.scale, p.z + offset.z);
      wrapper.rotation.y = p.yaw;
      wrapper.scale.setScalar(p.scale);
      wrapper.add(root);
      group.add(wrapper);
      root.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        meshes++;
        triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      });
      const mixer = new THREE.AnimationMixer(root);
      mixers.push({mixer, root});
      mixer.clipAction(source.breeze).setLoop(THREE.LoopRepeat, Infinity).play();
      mixer.update((i * 0.371) % source.breeze.duration);
      perAsset[p.asset] = (perAsset[p.asset] || 0) + 1;
      supports.push({id: p.id, asset: p.asset, x: p.x, z: p.z, groundY: heights[i],
        sourceMinY: source.minY, rootY: wrapper.position.y, scale: p.scale});
    });
    group.updateMatrixWorld(true);
    const counts = {instances: rows.length, assets: sources.size, meshes, triangles,
      geometries: geometries.size, materials: materials.size, textures: textures.size, mixers: mixers.length,
      perAsset, supports};
    console.info('[HOLM_HABITAT] candidate loaded', JSON.stringify({...counts, supports: undefined}));
    return {group, report: counts, dispose, update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Habitat dt must be finite and nonnegative');
      if (!disposed) for (const {mixer} of mixers) mixer.update(Math.min(dt, 0.1));
    }};
  } catch (error) { dispose(); throw error; }
}
