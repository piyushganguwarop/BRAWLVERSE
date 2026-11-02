import { InputManager } from './InputManager.js';

export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.inputManager = new InputManager({ targetElement: typeof window !== 'undefined' ? window : null });
    this.keys = scene?.input?.keyboard?.addKeys ? scene.input.keyboard.addKeys({
      left: 'A', right: 'D', up: 'W', down: 'S', punch: 'J', kick: 'K', special: 'L', grab: 'G', block: 'SHIFT',
      leftArrow: 'LEFT', rightArrow: 'RIGHT', upArrow: 'UP', downArrow: 'DOWN', space: 'SPACE', dashForward: 'E', dashBack: 'Q', p2DashForward: 'NUMPAD_SIX', p2DashBack: 'NUMPAD_FOUR',
      p2Punch: 'NUMPAD_ONE', p2Kick: 'NUMPAD_TWO', p2Grab: 'NUMPAD_THREE', p2Block: 'NUMPAD_ZERO',
      p2Special: 'NUMPAD_FIVE', p2Jump: 'NUMPAD_EIGHT', p2Down: 'NUMPAD_TWO',
      p2Left: 'LEFT', p2Right: 'RIGHT'
    }) : {
      left:{}, right:{}, up:{}, down:{}, punch:{}, kick:{}, special:{}, grab:{}, block:{},
      leftArrow:{}, rightArrow:{}, upArrow:{}, downArrow:{}, space:{}, dashForward:{}, dashBack:{},
      p2DashForward:{}, p2DashBack:{}, p2Punch:{}, p2Kick:{}, p2Grab:{}, p2Block:{},
      p2Special:{}, p2Jump:{}, p2Down:{}, p2Left:{}, p2Right:{}
    };
    this.touch = { left:false,right:false,up:false,down:false,punch:false,kick:false,special:false,grab:false,block:false };
    this.touch2 = { left:false,right:false,up:false,down:false,punch:false,kick:false,special:false,grab:false,block:false };
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
    const k=this.keys,t=this.touch;
    const mgr = this.inputManager ? this.inputManager.getPlayer1State() : {};
    const left = mgr.left || !!k.left.isDown || (!this.scene.localVersus && !!k.leftArrow.isDown) || t.left;
    const right = mgr.right || !!k.right.isDown || (!this.scene.localVersus && !!k.rightArrow.isDown) || t.right;
    const jump = mgr.jump || PhaserKeyDown(k.up) || (!this.scene.localVersus && PhaserKeyDown(k.upArrow)) || PhaserKeyDown(k.space) || t.up;
    const dashForward = k.dashForward.isDown || mgr.dashForward;
    const dashBack = k.dashBack.isDown || mgr.dashBack;
    const down = mgr.down || !!k.down.isDown || (!this.scene.localVersus && !!k.downArrow.isDown) || t.down;
    const punch = mgr.punch || !!k.punch.isDown || t.punch;
    const kick = mgr.kick || !!k.kick.isDown || t.kick;
    const special = mgr.special || !!k.special.isDown || t.special;
    const grab = mgr.grab || !!k.grab.isDown || t.grab;
    const block = mgr.block || !!k.block.isDown || t.block;

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
      dashForward:k.dashForward.isDown || mgr.dashForward,
      dashBack:k.dashBack.isDown || mgr.dashBack,
      dash: dashForward || dashBack || !!mgr.dash,
      down,
      punch,
      kick,
      heavy: mgr.heavy || kick,
      special,
      grab,
      block
    };
  }

  getState2() {
    const k=this.keys,t=this.touch2;
    const mgr = this.inputManager ? this.inputManager.getPlayer2State() : {};
    const left = mgr.left || !!k.leftArrow.isDown || t.left;
    const right = mgr.right || !!k.rightArrow.isDown || t.right;
    const jump = mgr.jump || PhaserKeyDown(k.upArrow) || PhaserKeyDown(k.p2Jump) || t.up;
    const dashForward = k.p2DashForward.isDown || mgr.dashForward;
    const dashBack = k.p2DashBack.isDown || mgr.dashBack;
    const down = mgr.down || PhaserKeyDown(k.downArrow) || t.down;
    const punch = mgr.punch || PhaserKeyDown(k.p2Punch) || t.punch;
    const kick = mgr.kick || PhaserKeyDown(k.p2Kick) || t.kick;
    const special = mgr.special || PhaserKeyDown(k.p2Special) || t.special;
    const grab = mgr.grab || PhaserKeyDown(k.p2Grab) || t.grab;
    const block = mgr.block || PhaserKeyDown(k.p2Block) || t.block;

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
      dashForward:k.p2DashForward.isDown || mgr.dashForward,
      dashBack:k.p2DashBack.isDown || mgr.dashBack,
      dash: dashForward || dashBack || !!mgr.dash,
      down,
      punch,
      kick,
      heavy: mgr.heavy || kick,
      special,
      grab,
      block
    };
  }
}
function PhaserKeyDown(key) { return !!key?.isDown; }
