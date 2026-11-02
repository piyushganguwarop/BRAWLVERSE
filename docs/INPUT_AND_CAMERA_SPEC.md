# Brawl Wars - Unified Input & Camera Specification

**Document Version:** 1.0  
**Phase:** Phase 0 (Planning & Discovery)  
**Status:** Approved  
**Related Documents:** [MASTER_PRODUCTION_BLUEPRINT.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/MASTER_PRODUCTION_BLUEPRINT.md) | [TECHNICAL_ARCHITECTURE.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/TECHNICAL_ARCHITECTURE.md)

---

## 1. Input Abstraction Architecture

To support Desktop Keyboard, Physical Gamepads, and Mobile Touchscreens identically, all raw hardware inputs feed into a central `InputManager` that produces a normalized `LogicalInputState` for each player:

```
[Hardware Layer]
  - KeyboardEvents (KeyDown / KeyUp)
  - Gamepad API (Standard Gamepad mapping)
  - TouchEvents (Virtual Joystick + HTML Buttons)
         |
         v
[Input Adapter Layer]
  - Normalization & Deadzone filtering (Deadzone = 0.15)
  - Rebindable Key Mapping
         |
         v
[Logical Input State] (Per Fighter)
  {
    axes: { x: [-1.0 .. +1.0], z: [-1.0 .. +1.0] },
    buttons: {
      jump:         { isDown: bool, justPressed: bool, heldTime: ms },
      crouch:       { isDown: bool, justPressed: bool, heldTime: ms },
      dash:         { isDown: bool, justPressed: bool, heldTime: ms },
      punch:        { isDown: bool, justPressed: bool, heldTime: ms },
      kick:         { isDown: bool, justPressed: bool, heldTime: ms },
      heavy:        { isDown: bool, justPressed: bool, heldTime: ms },
      grab:         { isDown: bool, justPressed: bool, heldTime: ms },
      special:      { isDown: bool, justPressed: bool, heldTime: ms },
      block:        { isDown: bool, justPressed: bool, heldTime: ms }
    }
  }
         |
         v
[120ms Input Buffer Queue] -> [Combat State Machine]
```

---

## 2. Default Control Mappings

### 2.1 Desktop Keyboard (Player 1 & Player 2 Split)

| Action | Player 1 (Default) | Player 2 (Local Versus) |
| :--- | :--- | :--- |
| **Move Left / Right (X)** | `A` / `D` | `Left Arrow` / `Right Arrow` |
| **Move Up / Down Depth (Z)** | `W` / `S` | `Up Arrow` / `Down Arrow` |
| **Jump** | `Space` | `Numpad 0` / `Keypad Enter` |
| **Crouch** | `C` or `S` | `Down Arrow` + `Numpad 1` |
| **Dash** | `Shift` (or Double-Tap direction) | `Numpad .` |
| **Light Punch** | `J` | `Numpad 4` |
| **Medium Kick** | `K` | `Numpad 5` |
| **Heavy Strike** | `L` | `Numpad 6` |
| **Guard / Block** | `I` | `Numpad 8` |
| **Grab** | `U` | `Numpad 7` |
| **Special Technique** | `O` | `Numpad 9` |

---

### 2.2 Standard Gamepad Layout (Xbox / PlayStation)

| Action | Xbox Controller | DualShock / DualSense |
| :--- | :--- | :--- |
| **3D Movement** | Left Analog Stick / D-Pad | Left Analog Stick / D-Pad |
| **Light Punch** | `X` Button (Button 2) | `Square` |
| **Medium Kick** | `A` Button (Button 0) | `Cross` |
| **Heavy Strike** | `Y` Button (Button 3) | `Triangle` |
| **Jump** | `B` Button (Button 1) | `Circle` |
| **Block / Guard** | Left Bumper / Trigger (`LB` / `LT`) | `L1` / `L2` |
| **Special Technique**| Right Bumper (`RB`) | `R1` |
| **Grab** | Right Trigger (`RT`) | `R2` |
| **Dash** | Click Left Stick (`L3`) or Double-Tap Stick | Click Left Stick (`L3`) |

---

### 2.3 Mobile Touchscreen Layout

Designed specifically for thumb comfort in landscape mode:

1. **Left Thumb Zone: Floating Dynamic Analog Stick**
   - Active on bottom-left 40% of the screen.
   - Dynamic anchor: Spawns the joystick origin wherever the player first places their thumb.
   - Outer clamp radius: `55px`.
   - Normalizes $(\Delta X, \Delta Y)$ into $(moveX, moveZ)$ depth movement.

2. **Right Thumb Zone: Ergonomic Arc Action Cluster**
   - 4 primary circular buttons arranged along natural thumb sweep radius:
     - `Punch` (Light, cyan glow, bottom center of cluster)
     - `Kick` (Medium, yellow glow, bottom right)
     - `Heavy` (Heavy, red glow, top right)
     - `Jump` (Green glow, top center)
   - Secondary auxiliary buttons:
     - `Block` (Left shoulder trigger pill)
     - `Special` (Prominent diamond button in center when energy meter $\ge 50$)
     - `Dash` (Double tap or swipe)

3. **Multi-Touch & Cancellation:**
   - Multi-touch pointers tracked independently via `event.pointerId`.
   - Prevent default browser zoom, long-press context menus, and scroll gestures (`touch-action: none`).

---

## 3. Input Buffer & Command Queue

To ensure competitive responsiveness without dropped inputs during animations:
- Every button press registers into an **Input Buffer** with timestamp.
- Buffer expiration window: **120ms** (approx. 7 frames at 60 FPS).
- If the fighter is currently in an uncancelable recovery frame, the input remains valid in the buffer. The instant the recovery window finishes, the buffered input immediately fires on the first available action frame.
- **Double-Tap Detection:** Two taps in the same direction within 220ms triggers a rapid evasive Dash.

---

## 4. Angled Third-Person Camera Algorithm

The camera tracks both fighters simultaneously, dynamically zooming and panning to keep both characters in clear cinematic view.

### Camera Update Code Formulation:
```javascript
export class ArenaCamera {
  constructor(camera) {
    this.camera = camera;
    this.targetPos = new THREE.Vector3();
    this.currentPos = new THREE.Vector3(0, 4, 10);
    this.lookAtTarget = new THREE.Vector3(0, 1.2, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.2, 0);
  }

  update(p1Pos, p2Pos, dt) {
    // 1. Calculate midpoint
    const midX = (p1Pos.x + p2Pos.x) * 0.5;
    const midZ = (p1Pos.z + p2Pos.z) * 0.5;
    const midY = (p1Pos.y + p2Pos.y) * 0.5;

    // 2. Calculate separation distance
    const dx = p1Pos.x - p2Pos.x;
    const dz = p1Pos.z - p2Pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // 3. Dynamic distance and elevation
    const targetDist = Math.max(7.5, Math.min(14.0, 7.5 + dist * 0.55));
    const targetHeight = Math.max(3.2, 2.8 + dist * 0.18 + midY * 0.5);

    // 4. Clamped target camera position
    const clampedMidX = Math.max(-6.0, Math.min(6.0, midX));
    const clampedMidZ = Math.max(-3.0, Math.min(3.0, midZ));

    this.targetPos.set(
      clampedMidX,
      targetHeight,
      clampedMidZ + targetDist
    );

    this.lookAtTarget.set(clampedMidX, 1.2 + midY * 0.5, clampedMidZ);

    // 5. Framerate-independent exponential smoothing
    const smoothFactor = 1.0 - Math.exp(-8.5 * dt);
    this.currentPos.lerp(this.targetPos, smoothFactor);
    this.currentLookAt.lerp(this.lookAtTarget, smoothFactor);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
```
