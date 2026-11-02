import test from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/characters/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { InputManager } from '../src/input/InputManager.js';
import { InputController } from '../src/input/InputController.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { assetLoader } from '../src/core/AssetLoader.js';

test('Integration: InputManager actually drives Fighter movement in 3D', () => {
  const inputMgr = new InputManager({ targetElement: null });
  const fighter = new Fighter({ id: 'hero', x: 0, z: 0, facing: 1 });

  // Simulate touch right + depth down on InputManager
  inputMgr.setTouchState('p1', 'right', true);
  inputMgr.setTouchState('p1', 'down', true);

  const inputState = inputMgr.getPlayer1State();
  assert.equal(inputState.right, true);
  assert.equal(inputState.down, true);
  assert.ok(inputState.moveX > 0);
  assert.ok(inputState.moveZ > 0);

  // Feed this logical input state directly to fighter
  fighter.update(0.1, inputState);

  assert.ok(fighter.x > 0, 'Fighter X position must advance with InputManager right');
  assert.ok(fighter.z > 0, 'Fighter Z depth must advance with InputManager depthDown');
  assert.equal(fighter.state, 'walk');

  inputMgr.destroy();
});

test('Integration: Keyboard and Gamepad state normalization produces clamped values', () => {
  const inputMgr = new InputManager({ targetElement: null });

  // Simulate raw keys for diagonal
  inputMgr.rawKeys.add('KeyD');
  inputMgr.rawKeys.add('KeyS');

  const state = inputMgr.getPlayer1State();
  assert.ok(state.moveX > 0, 'MoveX must be positive for KeyD');
  assert.ok(state.moveZ > 0, 'MoveZ must be positive for KeyS');
  assert.ok(Math.abs(state.moveX) <= 1.0);
  assert.ok(Math.abs(state.moveZ) <= 1.0);

  inputMgr.destroy();
});

test('Integration: Touch input triggers buttons and feeds to logical state', () => {
  const inputMgr = new InputManager({ targetElement: null });

  inputMgr.setTouchState('p1', 'punch', true);
  inputMgr.setTouchState('p1', 'block', true);
  inputMgr.setTouchState('p1', 'jump', true);

  const state = inputMgr.getPlayer1State();
  assert.equal(state.punch, true);
  assert.equal(state.block, true);
  assert.equal(state.jump, true);

  inputMgr.setTouchState('p1', 'punch', false);
  const stateReleased = inputMgr.getPlayer1State();
  assert.equal(stateReleased.punch, false);

  inputMgr.destroy();
});

test('Integration: Diagonal movement speed does not exceed max linear speed', () => {
  const fighterCardinal = new Fighter({ id: 'cardinal', x: 0, z: 0, facing: 1 });
  const fighterDiagonal = new Fighter({ id: 'diagonal', x: 0, z: 0, facing: 1 });

  // 1. Cardinal move right (moveX = 1.0, moveZ = 0)
  fighterCardinal.update(0.1, { moveX: 1.0, moveZ: 0 });
  const cardinalSpeed = Math.hypot(fighterCardinal.vx, fighterCardinal.vz);

  // 2. Diagonal move (moveX = 1.0, moveZ = 1.0)
  fighterDiagonal.update(0.1, { moveX: 1.0, moveZ: 1.0 });
  const diagonalSpeed = Math.hypot(fighterDiagonal.vx, fighterDiagonal.vz);

  // The velocity magnitude of diagonal movement must NOT exceed cardinal speed
  assert.ok(
    Math.abs(diagonalSpeed - cardinalSpeed) < 0.001,
    `Diagonal speed (${diagonalSpeed}) must equal cardinal speed (${cardinalSpeed}) when normalized`
  );
  assert.ok(fighterDiagonal.vx > 0 && fighterDiagonal.vz > 0);
});

test('Integration: Depth boundaries strictly enforced at world limits', () => {
  const fighter = new Fighter({ id: 'boundary_tester', x: 0, z: 0, facing: 1 });

  // Move far into positive Z (foreground)
  for (let i = 0; i < 150; i++) {
    fighter.update(0.033, { moveZ: 1.0 });
  }
  assert.equal(fighter.z, gameConfig.world.maxZ, 'Z must be clamped exactly to gameConfig.world.maxZ');

  // Move far into negative Z (background)
  for (let i = 0; i < 300; i++) {
    fighter.update(0.033, { moveZ: -1.0 });
  }
  assert.equal(fighter.z, gameConfig.world.minZ, 'Z must be clamped exactly to gameConfig.world.minZ');
});

test('Integration: Depth-aware facing updates facing angle at different Z depths', () => {
  const p1 = new Fighter({ id: 'p1', x: 0, z: 0, facing: 1 });
  const p2 = new Fighter({ id: 'p2', x: 2.0, z: 2.0, facing: -1 });

  p1.updateFacing(p2);
  assert.equal(p1.facing, 1, 'P1 faces right (+X)');
  // dx = 2.0, dz = 2.0 -> atan2(2, 2) = PI / 4
  assert.ok(Math.abs(p1.facingAngle - (Math.PI / 4)) < 0.01, 'Facing angle must reflect 3D vector to opponent');

  // Move p2 to depth behind p1
  p2.x = -2.0;
  p2.z = 2.0;
  p1.updateFacing(p2);
  assert.equal(p1.facing, -1, 'P1 faces left (-X)');
  assert.ok(p1.facingAngle < 0, 'Facing angle adjusts for -X depth vector');
});

test('Integration: Attacks hit when within both horizontal range and depth range', () => {
  const hits = [];
  const combat = new CombatSystem(hit => hits.push(hit));

  const attacker = new Fighter({ id: 'atk', x: 0, z: 0, facing: 1 });
  const target = new Fighter({ id: 'tgt', x: 1.2, z: 0.3, facing: -1 }); // dz = 0.3 <= defaultDepthRange (0.85)

  attacker.startAction('punch');
  for (let i = 0; i < 10; i++) {
    attacker.update(0.03, {});
    target.update(0.03, {});
    combat.update([attacker, target]);
  }

  assert.equal(hits.length, 1, 'Punch must connect when target is within horizontal reach and depth range');
  assert.ok(target.health < 100);
});

test('Integration: Attacks miss when target is offset beyond depth range', () => {
  const hits = [];
  const combat = new CombatSystem(hit => hits.push(hit));

  const attacker = new Fighter({ id: 'atk', x: 0, z: 0, facing: 1 });
  // Target is at same X distance (1.2m), but shifted in depth by 1.6m (exceeds punch depth range of 0.85m)
  const target = new Fighter({ id: 'tgt', x: 1.2, z: 1.6, facing: -1 });

  attacker.startAction('punch');
  for (let i = 0; i < 15; i++) {
    attacker.update(0.03, {});
    target.update(0.03, {});
    combat.update([attacker, target]);
  }

  assert.equal(hits.length, 0, 'Punch MUST MISS when target is stepped off in Z depth');
  assert.equal(target.health, 100, 'Target must take 0 damage on depth miss');
});

test('Integration: Blocking reduces frontal damage and applies guard multiplier', () => {
  const p1 = new Fighter({ id: 'p1', x: 0, z: 0, facing: 1 });
  const defender = new Fighter({ id: 'p2', x: 1.0, z: 0, facing: -1 });

  defender.blocking = true;
  defender.blockAge = 1.0;

  const hitResult = defender.takeHit(20, p1.facing, { damage: 20 });
  assert.equal(hitResult.blocked, true, 'Frontal attack must be blocked');
  assert.ok(hitResult.damage < 20, 'Damage must be mitigated by block multiplier');
});

test('Integration: Aerial attacks execute tuned damage, range, and jump elevation', () => {
  const airborne = new Fighter({ id: 'airborne', x: 0, y: 1.2, z: 0, facing: 1 });
  airborne.vy = 2.0;

  assert.equal(airborne.startAction('kick'), true);
  assert.equal(airborne.activeAction.variant, 'air');
  assert.ok(airborne.activeAction.range > gameConfig.combat.kick.range, 'Air kick has tuned aerial reach');
});

test('Integration: Scene cleanup clears all listeners and destroys InputManager', () => {
  const fakeScene = { localVersus: false, input: { keyboard: null } };
  const controller = new InputController(fakeScene);

  assert.ok(controller.inputManager, 'InputManager must be instantiated');
  controller.clear();
  assert.equal(controller.touchListeners.length, 0, 'Touch listeners must be empty after clear()');
});

test('Integration: AssetLoader handles failure gracefully and emits accurate progress', async () => {
  const progressLogs = [];
  const off = assetLoader.on('progress', data => progressLogs.push(data));

  const result = await assetLoader.loadModel('invalid://fake-path.glb');
  assert.equal(result, null, 'Failed model returns null');
  assert.ok(progressLogs.length > 0, 'Progress must be emitted on failure');
  assert.ok(progressLogs[progressLogs.length - 1].failed > 0, 'Failed count must increment');

  off();
});
