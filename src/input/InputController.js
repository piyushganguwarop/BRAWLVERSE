export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      left: 'A', right: 'D', up: 'W', down: 'S', punch: 'J', kick: 'K', special: 'L', grab: 'G', block: 'SHIFT',
      leftArrow: 'LEFT', rightArrow: 'RIGHT', upArrow: 'UP', downArrow: 'DOWN', space: 'SPACE', dashForward: 'E', dashBack: 'Q', p2DashForward: 'NUMPAD_SIX', p2DashBack: 'NUMPAD_FOUR',
      p2Punch: 'NUMPAD_ONE', p2Kick: 'NUMPAD_TWO', p2Grab: 'NUMPAD_THREE', p2Block: 'NUMPAD_ZERO',
      p2Special: 'NUMPAD_FIVE', p2Jump: 'NUMPAD_EIGHT', p2Down: 'NUMPAD_TWO',
      p2Left: 'LEFT', p2Right: 'RIGHT'
    });
    this.touch = { left:false,right:false,up:false,down:false,punch:false,kick:false,special:false,grab:false,block:false };
    this.touch2 = { left:false,right:false,up:false,down:false,punch:false,kick:false,special:false,grab:false,block:false };
    this.bindTouch();
  }

  bindTouch() {
    this.touchListeners = [];
    document.querySelectorAll('[data-control]').forEach(button => {
      const action = button.dataset.control;
      const down = event => { event.preventDefault(); this.touch[action] = true; button.classList.add('pressed'); };
      const up = event => { event.preventDefault(); this.touch[action] = false; button.classList.remove('pressed'); };
      const listeners = [['pointerdown', down], ...['pointerup','pointercancel','pointerleave'].map(type => [type, up])];
      listeners.forEach(([type, handler]) => button.addEventListener(type, handler));
      this.touchListeners.push(...listeners.map(([type, handler]) => [button, type, handler]));
    });
    document.querySelectorAll('[data-control-p2]').forEach(button => {
      const action = button.dataset.controlP2;
      const down = event => { event.preventDefault(); this.touch2[action] = true; button.classList.add('pressed'); };
      const up = event => { event.preventDefault(); this.touch2[action] = false; button.classList.remove('pressed'); };
      const listeners = [['pointerdown', down], ...['pointerup','pointercancel','pointerleave'].map(type => [type, up])];
      listeners.forEach(([type, handler]) => button.addEventListener(type, handler));
      this.touchListeners.push(...listeners.map(([type, handler]) => [button, type, handler]));
    });
  }

  clear() {
    for (const [element, type, handler] of this.touchListeners) element.removeEventListener(type, handler);
    this.touchListeners.length = 0;
    for (const state of [this.touch, this.touch2]) for (const key of Object.keys(state)) state[key] = false;
    document.querySelectorAll('#touch-controls button, #p2-touch-controls button').forEach(button => button.classList.remove('pressed'));
  }

  getState() {
    const k=this.keys,t=this.touch;
    return {
      left:k.left.isDown||(!this.scene.localVersus&&k.leftArrow.isDown)||t.left,right:k.right.isDown||(!this.scene.localVersus&&k.rightArrow.isDown)||t.right,
      jump:PhaserKeyDown(k.up)||(!this.scene.localVersus&&PhaserKeyDown(k.upArrow))||PhaserKeyDown(k.space)||t.up, dashForward:k.dashForward.isDown, dashBack:k.dashBack.isDown,
      down:k.down.isDown||(!this.scene.localVersus&&k.downArrow.isDown)||t.down,punch:k.punch.isDown||t.punch,kick:k.kick.isDown||t.kick,
      special:k.special.isDown||t.special,grab:k.grab.isDown||t.grab,block:k.block.isDown||t.block
    };
  }

  getState2() {
    const k=this.keys,t=this.touch2;
    return {
      left:k.leftArrow.isDown||t.left,right:k.rightArrow.isDown||t.right,
      jump:PhaserKeyDown(k.upArrow)||PhaserKeyDown(k.p2Jump)||t.up, dashForward:k.p2DashForward.isDown, dashBack:k.p2DashBack.isDown,
      down:PhaserKeyDown(k.downArrow)||t.down,punch:PhaserKeyDown(k.p2Punch)||t.punch,
      kick:PhaserKeyDown(k.p2Kick)||t.kick,special:PhaserKeyDown(k.p2Special)||t.special,
      grab:PhaserKeyDown(k.p2Grab)||t.grab,block:PhaserKeyDown(k.p2Block)||t.block
    };
  }
}
function PhaserKeyDown(key) { return !!key?.isDown; }
