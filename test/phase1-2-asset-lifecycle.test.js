import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AssetLoader } from '../src/core/AssetLoader.js';

test('Phase 1.2 Asset Lifecycle: Concurrent requests for same URL share in-flight promise', async () => {
  const loader = new AssetLoader();
  let networkLoadCount = 0;

  // Mock gltfLoader.load to simulate async network latency
  loader.gltfLoader.load = (url, onLoad) => {
    networkLoadCount++;
    setTimeout(() => {
      onLoad({
        scene: new THREE.Group(),
        animations: [{ name: 'idle' }]
      });
    }, 20);
  };

  // Launch two concurrent requests for the identical URL
  const p1 = loader.loadModel('models/fighter1.glb');
  const p2 = loader.loadModel('models/fighter1.glb');

  const [res1, res2] = await Promise.all([p1, p2]);

  assert.equal(networkLoadCount, 1, 'Only one network load should be initiated for concurrent requests');
  assert.equal(res1, res2, 'Both concurrent callers must receive identical cached result');
  assert.equal(loader.cache.has('model:models/fighter1.glb'), true, 'Model must be cached');
});

test('Phase 1.2 Asset Lifecycle: Failed request does not permanently poison cache; retry works', async () => {
  const loader = new AssetLoader();
  let attempt = 0;

  loader.gltfLoader.load = (url, onLoad, onProgress, onError) => {
    attempt++;
    if (attempt === 1) {
      setTimeout(() => onError(new Error('Network failure')), 10);
    } else {
      setTimeout(() => onLoad({ scene: new THREE.Group(), animations: [] }), 10);
    }
  };

  // First request fails
  const firstResult = await loader.loadModel('models/retry-fighter.glb');
  assert.equal(firstResult, null, 'First attempt returns null fallback on error');
  assert.equal(loader.cache.has('model:models/retry-fighter.glb'), false, 'Failed asset must NOT be stored in cache');
  assert.equal(loader.loadingPromises.has('model:models/retry-fighter.glb'), false, 'In-flight promise must be cleared');

  // Retry the exact same URL
  const retryResult = await loader.loadModel('models/retry-fighter.glb');
  assert.ok(retryResult !== null, 'Retry must initiate fresh load and succeed');
  assert.equal(loader.cache.has('model:models/retry-fighter.glb'), true, 'Successful retry must be cached');
});

test('Phase 1.2 Asset Lifecycle: Different asset types (model vs texture) with same path do not collide', async () => {
  const loader = new AssetLoader();

  loader.gltfLoader.load = (url, onLoad) => {
    onLoad({ scene: new THREE.Group(), type: 'gltf_model' });
  };
  loader.textureLoader.load = (url, onLoad) => {
    onLoad({ isTexture: true, type: 'three_texture' });
  };

  const model = await loader.loadModel('assets/character.data');
  const texture = await loader.loadTexture('assets/character.data');

  assert.equal(model.type, 'gltf_model');
  assert.equal(texture.type, 'three_texture');
  assert.equal(loader.cache.has('model:assets/character.data'), true);
  assert.equal(loader.cache.has('texture:assets/character.data'), true);
});

test('Phase 1.2 Asset Lifecycle: Model cloning reference counting and safe independent release', async () => {
  const loader = new AssetLoader();

  // Create mock base GLTF with a mesh and geometry
  const baseScene = new THREE.Group();
  const mockGeo = new THREE.BufferGeometry();
  let geoDisposed = false;
  mockGeo.dispose = () => { geoDisposed = true; };

  const mockMat = new THREE.MeshBasicMaterial();
  let matDisposeCount = 0;
  mockMat.dispose = () => { matDisposeCount++; };

  const mesh = new THREE.Mesh(mockGeo, mockMat);
  baseScene.add(mesh);

  loader.gltfLoader.load = (url, onLoad) => {
    onLoad({ scene: baseScene, animations: [] });
  };

  // Instantiate instance 1 (e.g. Player 1)
  const inst1 = await loader.instantiateModel('models/brawler.glb');
  assert.ok(inst1 && inst1.scene);
  assert.equal(loader.refCounts.get('model:models/brawler.glb'), 1);

  // Instantiate instance 2 (e.g. Player 2 mirror match)
  const inst2 = await loader.instantiateModel('models/brawler.glb');
  assert.ok(inst2 && inst2.scene);
  assert.equal(loader.refCounts.get('model:models/brawler.glb'), 2);

  // Release instance 1 (Player 1 destroyed on round switch)
  inst1.release();
  assert.equal(loader.refCounts.get('model:models/brawler.glb'), 1, 'Ref count must decrement to 1');
  assert.equal(geoDisposed, false, 'Shared geometry must NOT be disposed while instance 2 is still active');

  // Attempting to dispose base asset while instance 2 is active must be prevented
  const disposedEarly = loader.disposeAsset('models/brawler.glb', 'model');
  assert.equal(disposedEarly, false, 'disposeAsset must refuse disposal while active reference count > 0');
  assert.equal(geoDisposed, false, 'Geometry remains intact');

  // Release instance 2
  inst2.release();
  assert.equal(loader.refCounts.get('model:models/brawler.glb'), 0, 'Ref count drops to 0');
  assert.equal(geoDisposed, false, 'Base geometry remains cached until explicit asset disposal or clear()');

  // Now dispose unreferenced asset
  const disposedFinal = loader.disposeAsset('models/brawler.glb', 'model');
  assert.equal(disposedFinal, true, 'disposeAsset succeeds once ref count reaches 0');
  assert.equal(geoDisposed, true, 'Base geometry safely freed from GPU');
});

test('Phase 1.2 Asset Lifecycle: Progress and error events accurately report loading ratio', async () => {
  const loader = new AssetLoader();
  const progressLogs = [];
  const errorLogs = [];

  const un1 = loader.on('progress', e => progressLogs.push(e));
  const un2 = loader.on('error', e => errorLogs.push(e));

  loader.gltfLoader.load = (url, onLoad) => {
    onLoad({ scene: new THREE.Group() });
  };
  loader.textureLoader.load = (url, onLoad, onProgress, onError) => {
    onError(new Error('Texture 404'));
  };

  await loader.loadModel('models/m1.glb');
  await loader.loadTexture('textures/t1.png');

  assert.equal(progressLogs.length, 2);
  assert.equal(progressLogs[1].loaded, 2);
  assert.equal(progressLogs[1].failed, 1);
  assert.equal(progressLogs[1].ratio, 1.0);

  assert.equal(errorLogs.length, 1);
  assert.equal(errorLogs[0].url, 'textures/t1.png');

  un1();
  un2();
});
