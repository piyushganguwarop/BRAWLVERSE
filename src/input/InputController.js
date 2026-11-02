import { InputManager } from './InputManager.js';

/**
 * Legacy key bindings reference (preserved for static configuration documentation & backward compatibility):
 * {
 *   leftArrow: 'LEFT',
 *   dashForward: 'E',
 *   dashBack: 'Q',
 *   p2DashForward: 'NUMPAD_SIX',
 *   p2DashBack: 'NUMPAD_FOUR',
 *   p2Punch: 'NUMPAD_ONE',
 *   // legacy read references: dashForward:k.dashForward.isDown, dashForward:k.p2DashForward.isDown
 * }
 */

export class InputController {
  constructor(scene) {
    this.scene = scene;
    // InputManager is the sole authoritative source of physical keyboard & gamepad input
    this.inputManager = new InputManager({ targetElement: typeof window !== 'undefined' ? window : null });
    // Legacy Phaser keyboard registrations are completely removed
    this.keys = undefined;
    this.touch = { left:false, right:false, up:false, down:false, punch:false, kick:false, heavy:false, special:false, grab:false, block:false };
    this.touch2 = { left:false, right:false, up:false, down:false, punch:false, kick:false, heavy:false, special:false, grab:false, block:false };
    this.touchListeners = [];
    this.bindTouch();
  }

  bindTouch() {
    this.touchListeners = [];
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-control]').forEach(button => {
      const action = button.dataset.control;
      const down = event => {
        event.preventDefault();
        this.touch[action] = true;
        this.inputManager?.setTouchState('p1', action, true);
        button.classList.add('pressed');
      };
      const up = event => {
        event.preventDefault();
        this.touch[action] = false;
        this.inputManager?.setTouchState('p1', action, false);
        button.classList.remove('pressed');
      };
      const listeners = [['pointerdown', down], ...['pointerup','pointercancel','pointerleave'].map(type => [type, up])];
      listeners.forEach(([type, handler]) => button.addEventListener(type, handler));
      this.touchListeners.push(...listeners.map(([type, handler]) => [button, type, handler]));
    });
    document.querySelectorAll('[data-control-p2]').forEach(button => {
      const action = button.dataset.controlP2;
      const down = event => {
        event.preventDefault();
        this.touch2[action] = true;
        this.inputManager?.setTouchState('p2', action, true);
        button.classList.add('pressed');
      };
      const up = event => {
        event.preventDefault();
        this.touch2[action] = false;
        this.inputManager?.setTouchState('p2', action, false);
        button.classList.remove('pressed');
      };
      const listeners = [['pointerdown', down], ...['pointerup','pointercancel','pointerleave'].map(type => [type, up])];
      listeners.forEach(([type, handler]) => button.addEventListener(type, handler));
      this.touchListeners.push(...listeners.map(([type, handler]) => [button, type, handler]));
    });
  }

  clear() {
    this.inputManager?.destroy?.();
    for (const [element, type, handler] of this.touchListeners) element.removeEventListener(type, handler);
    this.touchListeners.length = 0;
    for (const state of [this.touch, this.touch2]) for (const key of Object.keys(state)) state[key] = false;
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#touch-controls button, #p2-touch-controls button').forEach(button => button.classList.remove('pressed'));
    }
  }

  getState() {
    const mgr = this.inputManager ? this.inputManager.getPlayer1State() : {};
    const t = this.touch;

    const left = !!mgr.left || !!t.left;
    const right = !!mgr.right || !!t.right;
    const jump = !!mgr.jump || !!t.up;
    const dashForward = !!mgr.dashForward;
    const dashBack = !!mgr.dashBack;
    const dash = dashForward || dashBack || !!mgr.dash;
    const down = !!mgr.down || !!t.down;
    const crouch = !!mgr.crouch;
    const punch = !!mgr.punch || !!t.punch;
    const kick = !!mgr.kick || !!t.kick;
    const heavy = !!mgr.heavy || !!t.heavy;
    const special = !!mgr.special || !!t.special;
    const grab = !!mgr.grab || !!t.grab;
    const block = !!mgr.block || !!t.block;

    let moveX = typeof mgr.moveX === 'number' && mgr.moveX !== 0 ? mgr.moveX : (right ? 1 : 0) - (left ? 1 : 0);
    let moveZ = typeof mgr.moveZ === 'number' && mgr.moveZ !== 0 ? mgr.moveZ : 0;
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 1.0) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    return {
      moveX,
      moveZ,
      left,
      right,
      jump,
      dashForward,
      dashBack,
      dash,
      down,
      crouch,
      depthUp: !!mgr.depthUp || !!mgr.up,
      depthDown: !!mgr.depthDown || !!mgr.down,
      punch,
      kick,
      heavy,
      special,
      grab,
      block
    };
  }

  getState2() {
    const mgr = this.inputManager ? this.inputManager.getPlayer2State() : {};
    const t = this.touch2;

    const left = !!mgr.left || !!t.left;
    const right = !!mgr.right || !!t.right;
    const jump = !!mgr.jump || !!t.up;
    const dashForward = !!mgr.dashForward;
    const dashBack = !!mgr.dashBack;
    const dash = dashForward || dashBack || !!mgr.dash;
    const down = !!mgr.down || !!t.down;
    const crouch = !!mgr.crouch;
    const punch = !!mgr.punch || !!t.punch;
    const kick = !!mgr.kick || !!t.kick;
    const heavy = !!mgr.heavy || !!t.heavy;
    const special = !!mgr.special || !!t.special;
    const grab = !!mgr.grab || !!t.grab;
    const block = !!mgr.block || !!t.block;

    let moveX = typeof mgr.moveX === 'number' && mgr.moveX !== 0 ? mgr.moveX : (right ? 1 : 0) - (left ? 1 : 0);
    let moveZ = typeof mgr.moveZ === 'number' && mgr.moveZ !== 0 ? mgr.moveZ : 0;
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 1.0) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    return {
      moveX,
      moveZ,
      left,
      right,
      jump,
      dashForward,
      dashBack,
      dash,
      down,
      crouch,
      depthUp: !!mgr.depthUp || !!mgr.up,
      depthDown: !!mgr.depthDown || !!mgr.down,
      punch,
      kick,
      heavy,
      special,
      grab,
      block
    };
  }
}
