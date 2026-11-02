import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ArenaCamera } from '../src/three/ArenaCamera.js';
import { InputManager, InputBuffer, createLogicalInputState } from '../src/input/InputManager.js';
import { Fighter } from '../src/characters/Fighter.js';
import { PerformanceMonitor } from '../src/core/PerformanceMonitor.js';
import { assetLoader } from '../src/core/AssetLoader.js';

test('ArenaCamera: tracks midpoint of fighters and applies exponential smoothing', () => {
  const camera = new ArenaCamera({
    baseDistance: 8.0,
    minDistance: 6.0,
    maxDistance: 14.0,
    baseHeight: 3.0,
    smoothing: 8.5
  });

  const p1 = { x: -3.0, y: 0, z: 1.0 };
  const p2 = { x: 3.0, y: 0, z: -1.0 };

  // Initial step with small delta time
  camera.update(p1, p2, 0.016);
  assert.ok(camera.camera.position.z > 0, 'Camera should be positioned along +Z in front of arena');
  assert.ok(camera.camera.position.y > 0, 'Camera elevation should be above ground');

  // After substantial simulation time, camera position should converge close to target
  camera.update(p1, p2, 2.0);
  assert.ok(Math.abs(camera.currentPos.x - 0) < 0.1, 'Camera X should center at midpoint (0)');
  assert.ok(Math.abs(camera.currentPos.z - (8.0 + Math.sqrt(36 + 4) * 0.52)) < 0.5, 'Camera Z should reflect dynamic separation');
});

test('ArenaCamera: clamps within stage boundaries and handles camera shake', () => {
  const camera = new ArenaCamera({
    bounds: { minX: -6.0, maxX: 6.0, minZ: -3.0, maxZ: 3.0, minHeight: 2.0, maxHeight: 6.0 }
  });

  // Position fighters far beyond bounds
  const p1 = { x: -20.0, y: 15.0, z: -10.0 };
  const p2 = { x: -18.0, y: 15.0, z: -10.0 };

  camera.update(p1, p2, 1.0);
  assert.ok(camera.targetPos.x >= -6.0 && camera.targetPos.x <= 6.0, 'Target X must remain clamped within bounds');
  assert.ok(camera.targetPos.y <= 6.0, 'Target Y must not exceed maxHeight');

  // Trigger impact shake
  camera.shake(0.5, 0.2);
  assert.equal(camera.shakeIntensity, 0.5);
  assert.equal(camera.shakeDuration, 0.2);
  camera.update(p1, p2, 0.05);
  assert.ok(camera.shakeOffset.length() > 0, 'Shake offset should apply during active shake');
});

test('InputBuffer: stores commands within 120ms window and prunes expired inputs', () => {
  const buffer = new InputBuffer(120);
  const t0 = 1000;

  buffer.push('punch', t0);
  buffer.push('kick', t0 + 50);

  assert.equal(buffer.has('punch', t0 + 60), true);
  assert.equal(buffer.has('kick', t0 + 60), true);

  // At t0 + 130, 'punch' (inserted at t0) has expired (> 120ms)
  assert.equal(buffer.has('punch', t0 + 130), false);
  // 'kick' (inserted at t0 + 50) is still valid (80ms elapsed)
  assert.equal(buffer.has('kick', t0 + 130), true);

  // Consume should remove entry and return true
  assert.equal(buffer.consume('kick', t0 + 130), true);
  assert.equal(buffer.has('kick', t0 + 130), false);
});

test('InputManager: provides normalized LogicalInputState with touch & buffer support', () => {
  const inputMgr = new InputManager({ targetElement: null });

  const initialP1 = inputMgr.getPlayer1State();
  assert.equal(initialP1.moveX, 0);
  assert.equal(initialP1.moveZ, 0);
  assert.equal(initialP1.punch, false);

  // Set virtual touch inputs
  inputMgr.setTouchState('p1', 'punch', true);
  inputMgr.setTouchState('p1', 'right', true);

  const activeP1 = inputMgr.getPlayer1State();
  assert.equal(activeP1.right, true);
  assert.equal(activeP1.moveX, 1.0);
  assert.equal(activeP1.punch, true);

  inputMgr.destroy();
});

test('Fighter: full 3D ground motion, depth bounds, and jump elevation', () => {
  const fighter = new Fighter({ id: 'test_fighter', x: 0, z: 0, facing: 1 });

  assert.equal(fighter.z, 0);
  assert.equal(fighter.vz, 0);

  // 1. Lateral movement (X)
  fighter.update(0.1, { right: true });
  assert.ok(fighter.x > 0, 'Fighter moves +X with right input');

  // 2. Depth movement (Z) via moveZ vector
  fighter.update(0.1, { moveZ: 1.0 });
  assert.ok(fighter.z > 0, 'Fighter moves +Z depth with positive moveZ');

  fighter.update(0.1, { moveZ: -1.0 });
  const previousZ = fighter.z;
  fighter.update(0.1, { moveZ: -1.0 });
  assert.ok(fighter.z < previousZ, 'Fighter moves -Z depth with negative moveZ');

  // 3. Jump (Y)
  fighter.update(0.016, { jump: true });
  assert.ok(fighter.vy > 0, 'Jump gives positive vertical velocity');
  assert.equal(fighter.state, 'jump');

  // 4. Boundary enforcement (minX, maxX, minZ, maxZ)
  for (let i = 0; i < 200; i++) {
    fighter.update(0.033, { moveX: 1.0, moveZ: 1.0 });
  }
  assert.ok(fighter.x <= 5.4, 'Fighter X clamped to maxX');
  assert.ok(fighter.z <= 3.5, 'Fighter Z clamped to maxZ');
});

test('PerformanceMonitor: tracks framerate and frame delta times accurately', () => {
  const monitor = new PerformanceMonitor({ updateIntervalMs: 50 });

  let time = 1000;
  // Simulate 10 frames at 60 FPS (16.6ms intervals)
  for (let i = 0; i < 10; i++) {
    time += 16.6;
    monitor.tick(time);
  }

  const metrics = monitor.getMetrics();
  assert.ok(metrics.fps > 0, 'FPS metric should be non-zero');
  assert.ok(metrics.frameTimeMs > 0, 'Frame time should be recorded');
});

test('AssetLoader: lifecycle, progress notification, and graceful fallback', async () => {
  const progressEvents = [];
  const unsubscribe = assetLoader.on('progress', (e) => progressEvents.push(e));

  // Non-existent model test (must not crash, must return null and record progress)
  const result = await assetLoader.loadModel('invalid://models/missing.glb');
  assert.equal(result, null, 'Corrupt or missing model must resolve to null as fallback');
  assert.ok(progressEvents.length > 0, 'Progress events must be dispatched');

  unsubscribe();
});
