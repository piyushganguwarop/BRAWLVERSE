/**
 * LogicalInputState - Normalized input state representation for a single fighter.
 */
export function createLogicalInputState() {
  return {
    moveX: 0,            // -1.0 (Left) to +1.0 (Right)
    moveZ: 0,            // -1.0 (Depth Up / Away) to +1.0 (Depth Down / Forward)
    left: false,
    right: false,
    up: false,           // Depth Up
    down: false,         // Depth Down
    depthUp: false,      // Explicit 3D Depth Up
    depthDown: false,    // Explicit 3D Depth Down
    jump: false,         // Ground jump / Air jump
    crouch: false,       // Low stance
    dash: false,         // Evasive dash
    dashForward: false,
    dashBack: false,
    punch: false,        // Light attack
    kick: false,         // Medium attack / Launcher
    heavy: false,        // Heavy strike
    grab: false,         // Guard-break grab
    special: false,      // Super technique
    block: false         // Guard stance
  };
}

/**
 * InputBuffer - 120ms input command queue
 * Holds recent button press timestamps so moves trigger reliably on recovery frames.
 */
export class InputBuffer {
  constructor(windowMs = 120) {
    this.windowMs = windowMs;
    this.buffer = [];
  }

  push(action, timestamp = performance.now()) {
    this.buffer.push({ action, timestamp });
    this.prune(timestamp);
  }

  prune(now = performance.now()) {
    const cutoff = now - this.windowMs;
    this.buffer = this.buffer.filter(entry => entry.timestamp >= cutoff);
  }

  has(action, now = performance.now()) {
    this.prune(now);
    return this.buffer.some(entry => entry.action === action);
  }

  consume(action, now = performance.now()) {
    this.prune(now);
    const index = this.buffer.findIndex(entry => entry.action === action);
    if (index !== -1) {
      this.buffer.splice(index, 1);
      return true;
    }
    return false;
  }

  clear() {
    this.buffer.length = 0;
  }
}

/**
 * InputManager - Unified hardware input abstraction for Brawl Wars.
 * Coordinates Keyboard, Gamepad API, and Touch controls.
 */
export class InputManager {
  constructor({ targetElement = (typeof window !== 'undefined' ? window : null) } = {}) {
    this.targetElement = targetElement;
    this.rawKeys = new Set();
    this.touchP1 = {};
    this.touchP2 = {};
    this.buffers = {
      p1: new InputBuffer(120),
      p2: new InputBuffer(120)
    };

    // Tap timing tracking for double-tap dash
    this.lastTap = {
      p1Left: 0,
      p1Right: 0,
      p2Left: 0,
      p2Right: 0
    };

    // Default Keyboard Bindings
    this.bindingsP1 = {
      left: ['KeyA'],
      right: ['KeyD'],
      depthUp: ['KeyW'],
      depthDown: ['KeyS'],
      jump: ['Space'],
      crouch: ['KeyC'],
      dashForward: ['KeyE'],
      dashBack: ['KeyQ'],
      punch: ['KeyJ'],
      kick: ['KeyK'],
      heavy: ['KeyL'],
      grab: ['KeyU', 'KeyG'],
      special: ['KeyO', 'Semicolon'],
      block: ['ShiftLeft']
    };

    // Player 2 Bindings: Completely disambiguated layout
    // Primary: Standard Numpad + Arrow keys (No overlapping actions!)
    // Fallback: Navigation cluster for keyboards without a numeric keypad
    this.bindingsP2 = {
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      depthUp: ['ArrowUp'],
      depthDown: ['ArrowDown'],
      jump: ['Numpad0', 'ControlRight', 'NumpadEnter'],
      crouch: ['Numpad1', 'ShiftRight'],
      dashForward: ['Numpad3', 'PageDown'],
      dashBack: ['NumpadDecimal', 'Delete'],
      punch: ['Numpad4', 'Insert'],
      kick: ['Numpad5', 'Home'],
      heavy: ['Numpad6', 'PageUp'],
      grab: ['Numpad7', 'End'],
      block: ['Numpad8', 'Backslash'],
      special: ['Numpad9', 'Enter']
    };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    if (this.targetElement && typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }
  }

  onKeyDown(event) {
    if (event.repeat) return;
    this.rawKeys.add(event.code);

    const now = performance.now();
    // Check P1 bindings
    for (const [action, keys] of Object.entries(this.bindingsP1)) {
      if (keys.includes(event.code)) {
        this.buffers.p1.push(action, now);
        // Double-tap dash detection
        if (action === 'left') {
          if (now - this.lastTap.p1Left < 240) this.buffers.p1.push('dashBack', now);
          this.lastTap.p1Left = now;
        } else if (action === 'right') {
          if (now - this.lastTap.p1Right < 240) this.buffers.p1.push('dashForward', now);
          this.lastTap.p1Right = now;
        }
      }
    }

    // Check P2 bindings
    for (const [action, keys] of Object.entries(this.bindingsP2)) {
      if (keys.includes(event.code)) {
        this.buffers.p2.push(action, now);
        if (action === 'left') {
          if (now - this.lastTap.p2Left < 240) this.buffers.p2.push('dashBack', now);
          this.lastTap.p2Left = now;
        } else if (action === 'right') {
          if (now - this.lastTap.p2Right < 240) this.buffers.p2.push('dashForward', now);
          this.lastTap.p2Right = now;
        }
      }
    }
  }

  onKeyUp(event) {
    this.rawKeys.delete(event.code);
  }

  isKeyPressed(keys) {
    return keys.some(code => this.rawKeys.has(code));
  }

  /**
   * Poll Gamepad API for controller inputs
   * @param {number} padIndex Index in navigator.getGamepads()
   */
  pollGamepad(padIndex = 0) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    const pad = gamepads[padIndex];
    if (!pad || !pad.connected) return null;

    const deadzone = 0.18;
    const rawX = pad.axes[0] || 0;
    const rawZ = pad.axes[1] || 0;

    const stickX = Math.abs(rawX) > deadzone ? (rawX - Math.sign(rawX) * deadzone) / (1 - deadzone) : 0;
    const stickZ = Math.abs(rawZ) > deadzone ? (rawZ - Math.sign(rawZ) * deadzone) / (1 - deadzone) : 0;

    // Standard Gamepad button indices
    // 0: A/Cross, 1: B/Circle, 2: X/Square, 3: Y/Triangle, 4: LB, 5: RB, 6: LT, 7: RT, 8: Select, 9: Start, 10: L3, 11: R3, 12: Up, 13: Down, 14: Left, 15: Right
    const btn = idx => !!pad.buttons[idx]?.pressed;

    return {
      stickX,
      stickZ,
      dpadLeft: btn(14),
      dpadRight: btn(15),
      dpadUp: btn(12),
      dpadDown: btn(13),
      punch: btn(2),     // X / Square
      kick: btn(0),      // A / Cross
      heavy: btn(3),     // Y / Triangle
      jump: btn(1),      // B / Circle
      block: btn(4) || btn(6), // LB or LT
      special: btn(5),   // RB
      grab: btn(7),      // RT
      dash: btn(10)      // L3 click
    };
  }

  /**
   * Set virtual touch state
   */
  setTouchState(player = 'p1', action, isDown) {
    const target = player === 'p2' ? this.touchP2 : this.touchP1;
    target[action] = !!isDown;
    if (isDown) {
      this.buffers[player].push(action);
    } else {
      this.buffers[player].consume(action);
    }
  }

  /**
   * Get logical input state for Player 1
   */
  getPlayer1State() {
    const state = createLogicalInputState();
    const pad = this.pollGamepad(0);
    const k = action => this.isKeyPressed(this.bindingsP1[action] || []);
    const t = this.touchP1;

    // Movement X
    let moveX = 0;
    if (k('right') || t.right) moveX += 1.0;
    if (k('left') || t.left) moveX -= 1.0;
    if (pad) {
      if (pad.dpadRight) moveX += 1.0;
      if (pad.dpadLeft) moveX -= 1.0;
      if (Math.abs(pad.stickX) > 0.05) moveX = pad.stickX;
    }
    state.moveX = Math.max(-1.0, Math.min(1.0, moveX));
    state.left = state.moveX < -0.2;
    state.right = state.moveX > 0.2;

    // Movement Z (Depth)
    let moveZ = 0;
    if (k('depthDown') || t.depthDown || t.down) moveZ += 1.0;
    if (k('depthUp') || t.depthUp || t.up) moveZ -= 1.0;
    if (pad) {
      if (pad.dpadDown) moveZ += 1.0;
      if (pad.dpadUp) moveZ -= 1.0;
      if (Math.abs(pad.stickZ) > 0.05) moveZ = pad.stickZ;
    }
    state.moveZ = Math.max(-1.0, Math.min(1.0, moveZ));
    state.up = state.moveZ < -0.2;
    state.down = state.moveZ > 0.2;
    state.depthUp = state.up;
    state.depthDown = state.down;

    // Actions
    const act = action => {
      const active = k(action) || !!t[action] || !!pad?.[action];
      if (active) {
        this.buffers.p1.consume(action);
        return true;
      }
      return this.buffers.p1.consume(action);
    };

    state.jump = act('jump');
    state.crouch = k('crouch') || !!t.crouch || !!pad?.crouch;
    state.dashForward = act('dashForward');
    state.dashBack = act('dashBack');
    state.dash = state.dashForward || state.dashBack || !!pad?.dash || !!t.dash;

    state.punch = act('punch');
    state.kick = act('kick');
    state.heavy = act('heavy');
    state.grab = act('grab');
    state.special = act('special');
    state.block = k('block') || !!t.block || !!pad?.block;

    return state;
  }

  /**
   * Get logical input state for Player 2 (Local Versus)
   */
  getPlayer2State() {
    const state = createLogicalInputState();
    const pad = this.pollGamepad(1);
    const k = action => this.isKeyPressed(this.bindingsP2[action] || []);
    const t = this.touchP2;

    // Movement X
    let moveX = 0;
    if (k('right') || t.right) moveX += 1.0;
    if (k('left') || t.left) moveX -= 1.0;
    if (pad) {
      if (pad.dpadRight) moveX += 1.0;
      if (pad.dpadLeft) moveX -= 1.0;
      if (Math.abs(pad.stickX) > 0.05) moveX = pad.stickX;
    }
    state.moveX = Math.max(-1.0, Math.min(1.0, moveX));
    state.left = state.moveX < -0.2;
    state.right = state.moveX > 0.2;

    // Movement Z (Depth)
    let moveZ = 0;
    if (k('depthDown') || t.depthDown || t.down) moveZ += 1.0;
    if (k('depthUp') || t.depthUp || t.up) moveZ -= 1.0;
    if (pad) {
      if (pad.dpadDown) moveZ += 1.0;
      if (pad.dpadUp) moveZ -= 1.0;
      if (Math.abs(pad.stickZ) > 0.05) moveZ = pad.stickZ;
    }
    state.moveZ = Math.max(-1.0, Math.min(1.0, moveZ));
    state.up = state.moveZ < -0.2;
    state.down = state.moveZ > 0.2;
    state.depthUp = state.up;
    state.depthDown = state.down;

    // Actions
    const act = action => {
      const active = k(action) || !!t[action] || !!pad?.[action];
      if (active) {
        this.buffers.p2.consume(action);
        return true;
      }
      return this.buffers.p2.consume(action);
    };

    state.jump = act('jump');
    state.crouch = k('crouch') || !!t.crouch || !!pad?.crouch;
    state.dashForward = act('dashForward');
    state.dashBack = act('dashBack');
    state.dash = state.dashForward || state.dashBack || !!pad?.dash || !!t.dash;

    state.punch = act('punch');
    state.kick = act('kick');
    state.heavy = act('heavy');
    state.grab = act('grab');
    state.special = act('special');
    state.block = k('block') || !!t.block || !!pad?.block;

    return state;
  }

  destroy() {
    if (this.targetElement && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
    }
    this.rawKeys.clear();
    this.buffers.p1.clear();
    this.buffers.p2.clear();
  }
}

