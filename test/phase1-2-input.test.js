import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager, createLogicalInputState, InputBuffer } from '../src/input/InputManager.js';
import { InputController } from '../src/input/InputController.js';

test('Phase 1.2 Input: P1 and P2 bindings have zero conflicting or overlapping keys', () => {
  const inputMgr = new InputManager({ targetElement: null });

  // 1. Verify Player 1 has no duplicate keys across actions
  const p1KeyMap = new Map();
  for (const [action, keys] of Object.entries(inputMgr.bindingsP1)) {
    for (const key of keys) {
      assert.equal(p1KeyMap.has(key), false, `P1 key '${key}' mapped to both '${p1KeyMap.get(key)}' and '${action}'`);
      p1KeyMap.set(key, action);
    }
  }

  // 2. Verify Player 2 has no duplicate keys across actions
  const p2KeyMap = new Map();
  for (const [action, keys] of Object.entries(inputMgr.bindingsP2)) {
    for (const key of keys) {
      assert.equal(p2KeyMap.has(key), false, `P2 key '${key}' mapped to both '${p2KeyMap.get(key)}' and '${action}'`);
      p2KeyMap.set(key, action);
    }
  }

  // 3. Verify Player 1 and Player 2 have zero colliding keys
  for (const [key, p1Action] of p1KeyMap.entries()) {
    assert.equal(p2KeyMap.has(key), false, `Key '${key}' is mapped to both P1 (${p1Action}) and P2 (${p2KeyMap.get(key)})`);
  }

  // 4. Verify specific previously conflicting P2 keys are now fully disambiguated
  // Numpad0 = jump (not block!)
  assert.deepEqual(inputMgr.bindingsP2.jump.includes('Numpad0'), true);
  assert.deepEqual(inputMgr.bindingsP2.block.includes('Numpad0'), false);
  // Numpad4 = punch (not dashBack!)
  assert.deepEqual(inputMgr.bindingsP2.punch.includes('Numpad4'), true);
  assert.deepEqual(inputMgr.bindingsP2.dashBack.includes('Numpad4'), false);
  // Numpad5 = kick (not special!)
  assert.deepEqual(inputMgr.bindingsP2.kick.includes('Numpad5'), true);
  assert.deepEqual(inputMgr.bindingsP2.special.includes('Numpad5'), false);
  // Numpad6 = heavy (not dashForward!)
  assert.deepEqual(inputMgr.bindingsP2.heavy.includes('Numpad6'), true);
  assert.deepEqual(inputMgr.bindingsP2.dashForward.includes('Numpad6'), false);
  // Numpad8 = block
  assert.deepEqual(inputMgr.bindingsP2.block.includes('Numpad8'), true);
  // Numpad9 = special
  assert.deepEqual(inputMgr.bindingsP2.special.includes('Numpad9'), true);

  inputMgr.destroy();
});

test('Phase 1.2 Input: P1 KeyW and KeyS drive depth movement and NEVER trigger jump or crouch', () => {
  const inputMgr = new InputManager({ targetElement: null });

  // Press KeyW (depthUp)
  inputMgr.rawKeys.add('KeyW');
  let state = inputMgr.getPlayer1State();
  assert.ok(state.moveZ < -0.2, 'KeyW must move into depth (negative Z)');
  assert.equal(state.jump, false, 'KeyW must NEVER trigger jump');
  assert.equal(state.crouch, false, 'KeyW must NEVER trigger crouch');
  inputMgr.rawKeys.delete('KeyW');

  // Press KeyS (depthDown)
  inputMgr.rawKeys.add('KeyS');
  state = inputMgr.getPlayer1State();
  assert.ok(state.moveZ > 0.2, 'KeyS must move toward screen (positive Z)');
  assert.equal(state.jump, false, 'KeyS must NEVER trigger jump');
  assert.equal(state.crouch, false, 'KeyS must NEVER trigger crouch');
  inputMgr.rawKeys.delete('KeyS');

  // Press Space (jump)
  inputMgr.rawKeys.add('Space');
  state = inputMgr.getPlayer1State();
  assert.equal(state.jump, true, 'Space must trigger jump');
  assert.equal(state.moveZ, 0, 'Space must not affect moveZ');
  inputMgr.rawKeys.delete('Space');

  // Press KeyC (crouch)
  inputMgr.rawKeys.add('KeyC');
  state = inputMgr.getPlayer1State();
  assert.equal(state.crouch, true, 'KeyC must trigger crouch');
  assert.equal(state.moveZ, 0, 'KeyC must not affect moveZ');
  inputMgr.rawKeys.delete('KeyC');

  inputMgr.destroy();
});

test('Phase 1.2 Input: Keydown and keyup properly set and clear active actions', () => {
  const inputMgr = new InputManager({ targetElement: null });

  // Key down for punch and right
  inputMgr.onKeyDown({ code: 'KeyD', repeat: false });
  inputMgr.onKeyDown({ code: 'KeyJ', repeat: false });

  let state = inputMgr.getPlayer1State();
  assert.ok(state.moveX > 0, 'moveX must be positive when KeyD is down');
  assert.equal(state.punch, true, 'punch must be true when KeyJ is down');

  // Key up
  inputMgr.onKeyUp({ code: 'KeyD' });
  inputMgr.onKeyUp({ code: 'KeyJ' });
  state = inputMgr.getPlayer1State();
  assert.equal(state.moveX, 0, 'moveX must return to 0 when KeyD is released');
  assert.equal(state.punch, false, 'punch must return to false when KeyJ is released');

  inputMgr.destroy();
});

test('Phase 1.2 Input: Double-tap dash registers in input buffer', () => {
  const inputMgr = new InputManager({ targetElement: null });
  const now = performance.now();

  // First tap right occurred 100ms ago
  inputMgr.buffers.p1.clear();
  inputMgr.lastTap.p1Right = now - 100;

  // Second tap within 240ms window
  inputMgr.onKeyDown({ code: 'KeyD', repeat: false });
  // Buffer should contain dashForward
  assert.ok(inputMgr.buffers.p1.has('dashForward', performance.now()));

  inputMgr.destroy();
});

test('Phase 1.2 Input: Gamepad deadzone filters stick jitter and maps actions', () => {
  const inputMgr = new InputManager({ targetElement: null });

  // Mock navigator.getGamepads safely
  const originalGetGamepads = globalThis.navigator?.getGamepads;
  const mockPad = {
    connected: true,
    axes: [0.05, -0.08], // Within 0.18 deadzone
    buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 2 })) // Button 2 = punch
  };

  if (!globalThis.navigator) {
    globalThis.navigator = { getGamepads: () => [mockPad] };
  } else {
    Object.defineProperty(globalThis.navigator, 'getGamepads', {
      value: () => [mockPad],
      configurable: true,
      writable: true
    });
  }

  const state = inputMgr.getPlayer1State();
  assert.equal(state.moveX, 0, 'Sub-deadzone stick drift must be filtered to 0');
  assert.equal(state.moveZ, 0, 'Sub-deadzone stick drift must be filtered to 0');
  assert.equal(state.punch, true, 'Gamepad button 2 must trigger punch');

  if (originalGetGamepads) {
    Object.defineProperty(globalThis.navigator, 'getGamepads', {
      value: originalGetGamepads,
      configurable: true,
      writable: true
    });
  } else {
    delete globalThis.navigator.getGamepads;
  }
  inputMgr.destroy();
});

test('Phase 1.2 Input: Every Player 1 and Player 2 action correctly activates via InputManager', () => {
  const inputMgr = new InputManager({ targetElement: null });

  // P1 actions to test
  const p1Actions = ['punch', 'kick', 'heavy', 'grab', 'special', 'block', 'jump', 'crouch', 'dashForward', 'dashBack'];
  for (const act of p1Actions) {
    const key = inputMgr.bindingsP1[act][0];
    inputMgr.rawKeys.add(key);
    const state = inputMgr.getPlayer1State();
    assert.equal(state[act], true, `P1 action '${act}' failed to activate with key '${key}'`);
    inputMgr.rawKeys.delete(key);
    const stateAfter = inputMgr.getPlayer1State();
    assert.equal(stateAfter[act], false, `P1 action '${act}' failed to deactivate after key '${key}' released`);
  }

  // P2 actions to test
  const p2Actions = ['punch', 'kick', 'heavy', 'grab', 'special', 'block', 'jump', 'crouch', 'dashForward', 'dashBack'];
  for (const act of p2Actions) {
    const key = inputMgr.bindingsP2[act][0];
    inputMgr.rawKeys.add(key);
    const state = inputMgr.getPlayer2State();
    assert.equal(state[act], true, `P2 action '${act}' failed to activate with key '${key}'`);
    inputMgr.rawKeys.delete(key);
    const stateAfter = inputMgr.getPlayer2State();
    assert.equal(stateAfter[act], false, `P2 action '${act}' failed to deactivate after key '${key}' released`);
  }

  inputMgr.destroy();
});

test('Phase 1.2 Input: Match restart and scene clear preserves clean state without stuck keys', () => {
  const controller = new InputController({ localVersus: true });

  controller.inputManager.rawKeys.add('KeyD');
  controller.inputManager.rawKeys.add('ArrowLeft');

  assert.ok(controller.getState().moveX > 0);
  assert.ok(controller.getState2().moveX < 0);

  // Clear simulates scene shutdown or match restart
  controller.clear();

  assert.equal(controller.inputManager.rawKeys.size, 0);
  assert.equal(controller.getState().moveX, 0);
  assert.equal(controller.getState2().moveX, 0);
});
