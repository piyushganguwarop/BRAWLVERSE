# Brawl Wars - Technical Architecture Specification

**Document Version:** 2.0  
**Status:** Phase 0 Approved  
**Related Documents:** [MASTER_PRODUCTION_BLUEPRINT.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/MASTER_PRODUCTION_BLUEPRINT.md) | [PRODUCTION_TRACKER.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/PRODUCTION_TRACKER.md)

---

## 1. High-Level Architectural Layers

The architecture strictly decouples rendering, gameplay simulation, user interface, audio, and data persistence.

```
+--------------------------------------------------------------------------+
|                            APPLICATION LAYER                             |
|  - Boot & Asset Preloader  - Scene / State Machine  - App Lifecycle      |
+--------------------------------------------------------------------------+
      |                                              |
      v                                              v
+-----------------------------+        +-----------------------------------+
|       INTERFACE LAYER       |        |          GAMEPLAY LAYER           |
|  - HTML5 / CSS3 Responsive  |        |  - Fighter Kinematics & States    |
|  - HUD & Damage Float Text  | <-----+|  - 3D Combat & Hitbox Engine      |
|  - Virtual Touch Joystick   | (State)|  - AI Decision Tree               |
|  - Desktop / Gamepad Input  |        |  - Round & Mode Rules (Arcade/PvP)|
+-----------------------------+        +-----------------------------------+
      |                                              |
      | (Logical Input Actions)                      | (Transforms & VFX Events)
      v                                              v
+-----------------------------+        +-----------------------------------+
|      INPUT ABSTRACTION      |        |          RENDERING LAYER          |
|  - Action Vector (X, Z)     |        |  - Three.js WebGL / WebGPU Context|
|  - Button Edge Detectors    |        |  - Angled Third-Person Camera     |
|  - Deadzone & Normalization |        |  - Dynamic Lighting & Shadows     |
+-----------------------------+        |  - Procedural / GLTF Anime Meshes |
                                       |  - Particle & Impact Sparks VFX   |
                                       +-----------------------------------+
                                                     |
                                       +-----------------------------------+
                                       |            AUDIO LAYER            |
                                       |  - Web Audio Context & Gain Buses |
                                       |  - Procedural & Synthesized SFX   |
                                       +-----------------------------------+
```

---

## 2. Technology Stack & Framework Evaluation

### Decision on Phaser vs Three.js + DOM
In the original prototype, Phaser was used as a 2D engine wrapper over a Three.js WebGL background canvas. This introduced coordinate space mismatches between 2D screen positions and 3D arena depth.

**Production Reconstruction Standard:**
1. **Three.js** is the primary 3D engine:
   - Owns the 3D scene graph, lighting, shadows, arena meshes, character rigs, animation mixers, and 3D particle systems.
2. **DOM / CSS3** for UI & HUD:
   - High-DPI crisp vector typography, health bars, combo counters, virtual touch joystick, and modal dialogues render cleanly in standard CSS without 2D canvas texture uploads.
3. **Pure JavaScript Core Game Loop:**
   - A deterministic, decoupled game loop `update(dt)` runs the combat engine and physics independently of frame render rates, facilitating future server-side rollback netcode.

---

## 3. World Coordinate Space & Kinematics

The arena uses standard 3D Cartesian coordinates:

```
        +Y (Up / Jump)
         |
         |   -Z (Arena Deep / Away from camera)
         |  /
         | /
---------+-------- +X (Arena Right)
        /|
       / |
      /  |
    +Z   -Y (Ground / Down)
(Camera Front)
```

- **X Axis:** Lateral positioning across the fighting platform (`gameConfig.world.minX` = `-5.4m` to `maxX` = `+5.4m`).
- **Z Axis:** Depth positioning across the arena floor (`gameConfig.world.minZ` = `-2.2m` to `maxZ` = `+2.2m`).
- **Y Axis:** Vertical elevation (`floorY` = `0.0m` ground contact, `ceilingY` = `7.5m`, `> 0` = jump / juggle elevation).

### Kinematics Equations
- **Ground Movement (Normalized Diagonal Motion):**  
  $$\vec{V}_{\text{input}} = \begin{pmatrix} \text{dirX} \\ \text{dirZ} \end{pmatrix}, \quad L = \|\vec{V}_{\text{input}}\|$$  
  $$\vec{V}_{\text{ground}} = \begin{cases} \frac{\vec{V}_{\text{input}}}{L} \times \text{speed} & \text{if } L > 1.0 \\ \vec{V}_{\text{input}} \times \text{speed} & \text{otherwise} \end{cases}$$  
  This prevents diagonal movement speed from exceeding maximum linear speed.
- **Jump & Gravity:**  
  $$Y(t + \Delta t) = Y(t) + V_y \cdot \Delta t$$  
  $$V_y(t + \Delta t) = V_y(t) - g \cdot \Delta t \quad (g = 22\,\text{m/s}^2)$$
- **Facing Vector & Angle:**  
  $$\vec{F}_{\text{target}} = \vec{Pos}_{\text{opponent}} - \vec{Pos}_{\text{self}}$$  
  $$\text{facing} = \begin{cases} +1 & \text{if } \Delta X \ge 0 \\ -1 & \text{if } \Delta X < 0 \end{cases}, \quad \theta_{\text{facing}} = \text{atan2}(\Delta X, \Delta Z)$$  
  Characters smoothly rotate around $Y$ to face their opponent in full 3D space.

---

## 4. Angled Third-Person Arena Camera

The camera provides a dynamic, cinematic perspective that frames both fighters while highlighting the 3D depth of the arena.

### Mathematical Formulation
1. **Midpoint Tracking:**  
   $$\vec{P}_{\text{mid}} = \frac{\vec{Pos}_{\text{fighter1}} + \vec{Pos}_{\text{fighter2}}}{2}$$
2. **Fighter Separation Distance:**  
   $$D_{\text{sep}} = \|\vec{Pos}_{\text{fighter1}} - \vec{Pos}_{\text{fighter2}}\|$$
3. **Dynamic Zoom & Height:**  
   $$\text{Zoom} = \text{clamp}(D_{\text{base}} + D_{\text{sep}} \times 0.65,\, D_{\text{min}},\, D_{\text{max}})$$  
   $$\text{Height} = H_{\text{base}} + D_{\text{sep}} \times 0.22$$
4. **Camera Target Position:**  
   $$\vec{P}_{\text{cam}} = \vec{P}_{\text{mid}} + \begin{pmatrix} 0 \\ \text{Height} \\ \text{Zoom} \end{pmatrix}$$
5. **Smoothing (Framerate-independent Exponential Decay):**  
   $$\vec{P}(t + \Delta t) = \vec{P}_{\text{target}} + (\vec{P}(t) - \vec{P}_{\text{target}}) \times e^{-\lambda \cdot \Delta t} \quad (\lambda = 8.5)$$
6. **Look-At:**  
   $$\text{LookAt} = \vec{P}_{\text{mid}} + \begin{pmatrix} 0 \\ 1.25 \\ 0 \end{pmatrix}$$

---

## 5. Input Abstraction Pipeline

Input events from keyboard, physical gamepads, and mobile touchscreens map into a unified `LogicalInputState`:

```typescript
interface LogicalInputState {
  moveX: number;       // -1.0 (Left) to +1.0 (Right)
  moveZ: number;       // -1.0 (Toward Camera) to +1.0 (Deep Arena)
  jump: boolean;       // Ground jump / Air double-jump
  crouch: boolean;     // Low stance
  dash: boolean;       // Quick evasive burst
  punch: boolean;      // Light attack
  kick: boolean;       // Medium attack / Launcher
  heavy: boolean;      // Heavy strike
  grab: boolean;       // Guard-break close grab
  special: boolean;    // Energy special technique
  block: boolean;      // Frontal guard
}
```

### Edge Triggering & Buffer Window
- Combat inputs register both `isDown` (continuous state) and `justPressed` (rising edge within a 120ms buffer window) to ensure attack commands execute reliably during cancel and recovery frames.

---

## 6. Depth-Aware Combat & 3D Hitbox System

Hits are evaluated in full 3D space using volumetric bounding boxes/spheres, rather than 1D distance checks:

```
[Attacker Hurtbox] ----(Attack Active Window)----> [Hitbox Volume (Center, HalfExtents)]
                                                           |
                                                    (Overlap Check)
                                                           v
                                                  [Target Hurtbox]
                                                           |
                                      +--------------------+--------------------+
                                      |                                         |
                               [Direct Hit]                                [Blocked]
                           - Full Damage                            - Chip Damage (15%)
                           - Hit-stop (60ms)                        - Block Sound & Spark
                           - Knockback vector                       - Pushback vector
                           - Juggle lift if airborne                - Stun (120ms)
```

- **Depth Tolerance:** Attacks have a lateral reach ($X$), vertical reach ($Y$), and depth reach ($Z$). An attack connects if and only if all three spatial conditions are satisfied:
  $$|x_{\text{target}} - x_{\text{attacker}}| \le \text{range}_X$$
  $$|z_{\text{target}} - z_{\text{attacker}}| \le \text{depthRange}_Z \quad (\text{default } 0.85\text{m})$$
  $$|y_{\text{target}} - y_{\text{attacker}}| \le \text{height}_Y \quad (\text{default } 1.5\text{m})$$
  $$\text{sign}(x_{\text{target}} - x_{\text{attacker}}) = \text{facing}_{\text{attacker}} \lor (\Delta X < 0.25\text{m} \land \Delta Z < 0.35\text{m})$$
- **Cancel Windows:** Light attacks feature cancellation windows into medium strikes, which cancel into special techniques.

---

## 7. Performance Targets & Asset Budgets

| Metric | Desktop Target | Mobile Target |
| :--- | :--- | :--- |
| **Framerate** | 60 FPS rock-solid | 30 - 60 FPS stable |
| **Max Draw Calls** | < 80 calls/frame | < 45 calls/frame |
| **Max Triangles (Arena + Fighters)** | < 65,000 tris | < 35,000 tris |
| **Texture VRAM Budget** | < 120 MB | < 65 MB |
| **Heap Memory Usage** | < 180 MB | < 110 MB |
| **Load Time to First Input** | < 2.0s | < 3.5s |

---

## 8. Development Workflow & Git Strategy

- **`main`**: Protected release branch. Only verified, production-ready code is merged here.
- **`v1`**: Archived milestone branch containing the completed starter game.
- **`v2-reconstruction`**: Active feature branch where all 10 phases of the reconstruction take place.

