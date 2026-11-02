import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { InputManager } from '../src/input/InputManager.js';
import { InputController } from '../src/input/InputController.js';
import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { AssetLoader } from '../src/core/AssetLoader.js';
import { gameConfig } from '../src/config/gameConfig.js';

test('Regression: No legacy Phaser key registrations or direct key reads in InputController', () => {
  const source = fs.readFileSync(new URL('../src/input/InputController.js', import.meta.url), 'utf8');

  // Verify constructor does not call Phaser's addKeys
  assert.equal(source.includes('scene.input.keyboard.addKeys'), false, 'Must not register Phaser keyboard keys');

  // Verify executable code does not read legacy Phaser key objects in getState or getState2
  const lines = source.split('\n');
  const executableLines = lines.filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
  const executableCode = executableLines.join('\n');

  assert.equal(executableCode.includes('k.dashForward.isDown'), false, 'Executable code must not read k.dashForward.isDown');
  assert.equal(executableCode.includes('k.dashBack.isDown'), false, 'Executable code must not read k.dashBack.isDown');
  assert.equal(executableCode.includes('k.p2DashForward.isDown'), false, 'Executable code must not read k.p2DashForward.isDown');
  assert.equal(executableCode.includes('k.p2DashBack.isDown'), false, 'Executable code must not read k.p2DashBack.isDown');

  const controller = new InputController({});
  assert.equal(controller.keys, undefined, 'InputController.keys must be undefined');

  // getState() must execute cleanly without keys object
  const state1 = controller.getState();
  assert.equal(typeof state1, 'object');
  assert.equal(state1.punch, false);

  const state2 = controller.getState2();
  assert.equal(typeof state2, 'object');
  assert.equal(state2.punch, false);
});

test('Regression: Player 1 dash isolation (KeyE and KeyQ)', () => {
  const mgr = new InputManager();
  const controller = new InputController({});
  controller.inputManager = mgr;

  // Press KeyE -> only P1 dashForward
  mgr.onKeyDown({ code: 'KeyE', repeat: false });
  assert.equal(controller.getState().dashForward, true, 'KeyE must activate P1 dashForward');
  assert.equal(controller.getState().dashBack, false);
  assert.equal(controller.getState2().dashForward, false, 'KeyE must NOT activate P2 dashForward');
  assert.equal(controller.getState2().dashBack, false);

  mgr.onKeyUp({ code: 'KeyE' });
  assert.equal(controller.getState().dashForward, false);

  // Press KeyQ -> only P1 dashBack
  mgr.onKeyDown({ code: 'KeyQ', repeat: false });
  assert.equal(controller.getState().dashBack, true, 'KeyQ must activate P1 dashBack');
  assert.equal(controller.getState().dashForward, false);
  assert.equal(controller.getState2().dashBack, false, 'KeyQ must NOT activate P2 dashBack');

  mgr.onKeyUp({ code: 'KeyQ' });
  assert.equal(controller.getState().dashBack, false);
});

test('Regression: Player 2 dash isolation (Numpad4 only punch, Numpad6 only heavy, no dash collision)', () => {
  const mgr = new InputManager();
  const controller = new InputController({});
  controller.inputManager = mgr;

  // Press Numpad4 -> P2 punch, NEVER P2 dashBack
  mgr.onKeyDown({ code: 'Numpad4', repeat: false });
  const p2State4 = controller.getState2();
  assert.equal(p2State4.punch, true, 'Numpad4 must activate P2 punch');
  assert.equal(p2State4.dashBack, false, 'Numpad4 must NOT activate P2 dashBack');
  assert.equal(p2State4.dashForward, false, 'Numpad4 must NOT activate P2 dashForward');
  assert.equal(p2State4.heavy, false, 'Numpad4 must NOT activate P2 heavy');
  assert.equal(controller.getState().punch, false, 'P2 Numpad4 must NOT bleed to P1');

  mgr.onKeyUp({ code: 'Numpad4' });

  // Press Numpad6 -> P2 heavy, NEVER P2 dashForward
  mgr.onKeyDown({ code: 'Numpad6', repeat: false });
  const p2State6 = controller.getState2();
  assert.equal(p2State6.heavy, true, 'Numpad6 must activate P2 heavy');
  assert.equal(p2State6.kick, false, 'Numpad6 must NOT activate P2 kick');
  assert.equal(p2State6.dashForward, false, 'Numpad6 must NOT activate P2 dashForward');
  assert.equal(p2State6.dashBack, false, 'Numpad6 must NOT activate P2 dashBack');

  mgr.onKeyUp({ code: 'Numpad6' });
});

test('Regression: Kick and heavy attack separation across P1 and P2', () => {
  const mgr = new InputManager();
  const controller = new InputController({});
  controller.inputManager = mgr;

  // P1: KeyK is kick, KeyL is heavy
  mgr.onKeyDown({ code: 'KeyK', repeat: false });
  assert.equal(controller.getState().kick, true, 'KeyK activates kick');
  assert.equal(controller.getState().heavy, false, 'KeyK must NOT activate heavy');
  mgr.onKeyUp({ code: 'KeyK' });

  mgr.onKeyDown({ code: 'KeyL', repeat: false });
  assert.equal(controller.getState().heavy, true, 'KeyL activates heavy');
  assert.equal(controller.getState().kick, false, 'KeyL must NOT activate kick');
  mgr.onKeyUp({ code: 'KeyL' });

  // P2: Numpad5 is kick, Numpad6 is heavy
  mgr.onKeyDown({ code: 'Numpad5', repeat: false });
  assert.equal(controller.getState2().kick, true, 'Numpad5 activates P2 kick');
  assert.equal(controller.getState2().heavy, false, 'Numpad5 must NOT activate P2 heavy');
  mgr.onKeyUp({ code: 'Numpad5' });

  mgr.onKeyDown({ code: 'Numpad6', repeat: false });
  assert.equal(controller.getState2().heavy, true, 'Numpad6 activates P2 heavy');
  assert.equal(controller.getState2().kick, false, 'Numpad6 must NOT activate P2 kick');
  mgr.onKeyUp({ code: 'Numpad6' });
});

test('Regression: Heavy attack execution in Fighter and 3D CombatSystem', () => {
  const p1 = new Fighter({ id: 'p1', x: 0, z: 0, facing: 1 });
  const p2 = new Fighter({ id: 'p2', x: 1.5, z: 0, facing: -1 });
  const combat = new CombatSystem();

  // Fighter starts heavy action
  const started = p1.startAction('heavy');
  assert.equal(started, true, 'Fighter must accept heavy action');
  assert.equal(p1.state, 'heavy');
  assert.equal(p1.activeAction.name, 'heavy');
  assert.equal(p1.activeAction.damage, 16);
  assert.equal(p1.cooldowns.heavy, 0.72);

  // Advance time to active hit frames (active window: 0.18 - 0.35s)
  p1.update(0.20, {});
  p2.update(0.20, {});
  combat.update([p1, p2]);

  assert.ok(p2.health < 100, 'Heavy attack must connect and deal damage');
  assert.equal(p2.state, 'hit', 'Target must enter hitstun from heavy attack');
  assert.ok(p2.knockbackVelocity > 0, 'Heavy attack must apply knockback away from attacker');
});

test('Regression: Active model instance followed by clear() preserves geometry; release after clear cleans up', async () => {
  const loader = new AssetLoader();

  // Create mock model with geometry and material
  const baseScene = new THREE.Group();
  const mockGeo = new THREE.BufferGeometry();
  let geoDisposed = false;
  mockGeo.dispose = () => { geoDisposed = true; };

  const mockMat = new THREE.MeshBasicMaterial();
  let matDisposeCount = 0;
  mockMat.dispose = () => { matDisposeCount++; };

  baseScene.add(new THREE.Mesh(mockGeo, mockMat));

  loader.gltfLoader.load = (url, onLoad) => {
    onLoad({ scene: baseScene, animations: [] });
  };

  // Instantiate active model (fighter in match)
  const inst = await loader.instantiateModel('models/hero.glb');
  assert.ok(inst && inst.scene);
  assert.equal(loader.refCounts.get('model:models/hero.glb'), 1);

  // Call clear() while instance is active (e.g. scene transition request)
  loader.clear();

  // Shared geometry must NOT be disposed because the active fighter is still using it!
  assert.equal(geoDisposed, false, 'Geometry must NOT be disposed while active instance uses it');
  assert.equal(loader.cache.has('model:models/hero.glb'), false, 'Cache entry is cleared from active lookup');
  assert.equal(loader.pendingDisposal.has('model:models/hero.glb'), true, 'Deferred disposal is queued');

  // Now the fighter match ends and instance is released
  inst.release();

  // After the last instance releases, deferred disposal safely frees GPU resources!
  assert.equal(geoDisposed, true, 'Base geometry safely disposed after final instance release');
  assert.equal(loader.pendingDisposal.has('model:models/hero.glb'), false);
});

test('Regression: Repeated release calls are safe and idempotent', async () => {
  const loader = new AssetLoader();
  const baseScene = new THREE.Group();
  const mockGeo = new THREE.BufferGeometry();
  baseScene.add(new THREE.Mesh(mockGeo, new THREE.MeshBasicMaterial()));

  loader.gltfLoader.load = (url, onLoad) => {
    onLoad({ scene: baseScene, animations: [] });
  };

  const inst = await loader.instantiateModel('models/hero2.glb');
  assert.equal(loader.refCounts.get('model:models/hero2.glb'), 1);

  // First release
  inst.release();
  assert.equal(loader.refCounts.get('model:models/hero2.glb'), 0);

  // Second release (repeated)
  assert.doesNotThrow(() => inst.release());
  assert.equal(loader.refCounts.get('model:models/hero2.glb'), 0, 'Ref count must remain 0');

  // Third release directly through releaseInstance
  assert.doesNotThrow(() => loader.releaseInstance(inst.scene));
  assert.equal(loader.refCounts.get('model:models/hero2.glb'), 0);
});

test('Regression: Texture ownership is preserved on disposal of models', async () => {
  const loader = new AssetLoader();

  // Create standalone cached texture
  const sharedTexture = new THREE.Texture();
  let textureDisposed = false;
  sharedTexture.dispose = () => { textureDisposed = true; };

  loader.textureLoader.load = (url, onLoad) => {
    onLoad(sharedTexture);
  };

  const loadedTex = await loader.loadTexture('textures/shared_ui.png');
  assert.equal(loadedTex, sharedTexture);

  // Model that uses the same texture
  const baseScene = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: sharedTexture });
  baseScene.add(new THREE.Mesh(new THREE.BufferGeometry(), mat));

  loader.gltfLoader.load = (url, onLoad) => {
    onLoad({ scene: baseScene, animations: [] });
  };

  await loader.loadModel('models/prop.glb');

  // Dispose model: shared texture must NOT be disposed because it is independently cached
  loader.disposeAsset('models/prop.glb', 'model');
  assert.equal(textureDisposed, false, 'Shared cached texture must NOT be destroyed by model disposal');
});

test('Regression: 3D XZ knockback in frontal, depth, and diagonal directions', () => {
  // 1. Frontal hit (attacker at 0, 0; defender at 1, 0)
  const a1 = new Fighter({ id: 'a1', x: 0, z: 0, facing: 1 });
  const d1 = new Fighter({ id: 'd1', x: 1, z: 0, facing: -1 });
  d1.takeHit(10, a1.facing, { knockback: 0.5 }, a1);
  assert.ok(d1.knockbackVelocity > 0, 'Frontal hit applies positive X knockback');
  assert.equal(d1.knockbackVelocityZ, 0, 'Frontal hit has zero Z knockback');

  // 2. Depth hit (attacker at 0, 0; defender at 0, 1)
  const a2 = new Fighter({ id: 'a2', x: 0, z: 0, facing: 1 });
  const d2 = new Fighter({ id: 'd2', x: 0, z: 1, facing: -1 });
  d2.takeHit(10, a2.facing, { knockback: 0.5 }, a2);
  assert.equal(d2.knockbackVelocity, 0, 'Depth hit has zero X knockback');
  assert.ok(d2.knockbackVelocityZ > 0, 'Depth hit applies positive Z knockback');

  // 3. Diagonal hit (attacker at 0, 0; defender at 1, 1)
  const a3 = new Fighter({ id: 'a3', x: 0, z: 0, facing: 1 });
  const d3 = new Fighter({ id: 'd3', x: 1, z: 1, facing: -1 });
  d3.takeHit(10, a3.facing, { knockback: 0.5 }, a3);
  assert.ok(d3.knockbackVelocity > 0, 'Diagonal hit applies positive X knockback');
  assert.ok(d3.knockbackVelocityZ > 0, 'Diagonal hit applies positive Z knockback');

  // 4. Verification that knockback displaces both X and Z within arena bounds
  d3.update(0.1, {});
  assert.ok(d3.x > 1, 'X increased due to diagonal knockback');
  assert.ok(d3.z > 1, 'Z increased due to diagonal knockback');
  assert.ok(d3.x <= gameConfig.world.maxX, 'X remains within arena bounds');
  assert.ok(d3.z <= gameConfig.world.maxZ, 'Z remains within arena bounds');
});

test('Regression: Diagonal grab displacement follows attacker 3D facing direction', () => {
  const attacker = new Fighter({ id: 'p1', x: 0, z: 0, facing: 1 });
  const target = new Fighter({ id: 'p2', x: 0.5, z: 0.5, facing: -1 });
  const combat = new CombatSystem();

  // Set attacker facing diagonally (45 degrees)
  attacker.facingAngle = Math.PI / 4;
  attacker.facingVector = { x: Math.SQRT1_2, z: Math.SQRT1_2 };

  attacker.activeAction = {
    name: 'grab',
    damage: 15,
    range: 1.5,
    depthRange: 1.5,
    activeStart: 0,
    activeEnd: 1,
    duration: 1,
    breaksGuard: true
  };
  attacker.actionElapsed = 0.1;
  attacker.actionSerial = 10;
  attacker.state = 'grab';

  const x0 = target.x;
  const z0 = target.z;

  combat.update([attacker, target]);

  assert.ok(target.x > x0, 'Target displaced along X in grab direction');
  assert.ok(target.z > z0, 'Target displaced along Z in grab direction');
});
