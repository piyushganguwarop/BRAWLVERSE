# Brawl Wars - Known Issues & Technical Limitations Register

**Document Version:** 1.0  
**Phase Milestone:** Phase 1.1 Complete  
**Last Updated:** 2026-11-02  

---

## 1. Current System Limitations

The following items are intentional scope boundaries or work-in-progress components currently scheduled for subsequent phases:

### 1.1 Character Models & Visual Rigs (Scheduled for Phase 3 & 6)
- **Current State:** The rendering layer employs high-fidelity procedural anime models composed of segmented geometric parts (torso, head, hair clumps, arms, legs, accessories) styled with cel-shading (`MeshToonMaterial`).
- **Limitation:** Skeletal bone rigs and 23 full animation clips from external GLTF/GLB files are not yet in production; the procedural model acts as the quality baseline until Phase 3 (Atlas slice) and Phase 6 (Volt, Blaze, Cipher).

### 1.2 Neon District Arena Assets (Scheduled for Phase 2)
- **Current State:** Basic rooftop arena bounds, floor grid, neon pillars, and background plane exist to define boundaries and camera framing.
- **Limitation:** Detailed cyberpunk skyscrapers, animated neon signage, and modular props are scheduled for Phase 2.

### 1.3 Online Multiplayer (Deferred to Phase 10)
- **Current State:** The input-relay multiplayer code is present from the prototype but disabled for competitive play.
- **Limitation:** Client-authoritative rollback netcode and server physics validation will be constructed in Phase 10 once all offline combat systems are finalized.

### 1.4 Audio Synthesis (Scheduled for Phase 7)
- **Current State:** Web Audio engine synthesizes tones, impact bursts, and round start sweeps.
- **Limitation:** Recorded voice clips, anime impact SFX stems, and soundtrack streaming will be integrated during Phase 7 (UI & Polish).

### 1.5 Rollup Chunk Size Warning
- **Current State:** Vite production build issues a non-blocking chunk warning (`(!) Some chunks are larger than 500 kB after minification`).
- **Limitation:** Phaser and Three.js are currently bundled into a single primary chunk (`~2.2 MB`). Dynamic `import()` splitting or `build.rollupOptions.output.manualChunks` is scheduled for Phase 8 (Mobile & Desktop Optimization).

---

## 2. Resolved in Phase 1.1

- [x] **Z-Depth Hit Registration Gap:** CombatSystem now performs true 3D volumetric checks ($X, Y, Z$) with configurable `depthRange`.
- [x] **Diagonal Movement Speed Boost:** Normalization now caps diagonal velocity to ensure diagonal speed equals cardinal linear speed.
- [x] **Uncoordinated Asset Loading:** `ThreeStage` and UI components now route all GLTF/texture loading through the centralized `AssetLoader`.
- [x] **Contradictory Arena Bounds:** All modules (`Fighter`, `ArenaCamera`, `ThreeStage`) now reference `gameConfig.world` as the single authoritative source of truth.
- [x] **InputManager Disconnection:** `InputManager` is now fully integrated into `InputController` and actively drives `FightScene` in the browser.

## 3. Resolved in Phase 1.2
- [x] **Player 2 Input Conflicts:** Eliminated all overlapping keys for Player 2 (Numpad actions 0, 1, 3, Decimal, 4, 5, 6, 7, 8, 9 with distinct navigation cluster fallback).
- [x] **Player 1 W/S Motion vs Jump/Crouch Collision:** `KeyW` and `KeyS` strictly modulate depth movement (`moveZ`) and never trigger jump or crouch.
- [x] **Duplicate Input Processing:** `InputManager` established as the single authoritative logical input source.
- [x] **1D Facing in 3D Space:** Implemented 3D vector dot product alignment for directional attacks and blocking; rear attacks cleanly bypass guard.
- [x] **Close-Contact Facing Jitter:** Added contact hysteresis deadzone (< 0.18m) preventing erratic flipping when fighters are in close quarters.
- [x] **Shared GLTF Resource Disposals:** Hardened `AssetLoader` with in-flight request deduplication, typed caching, reference-counted instances with isolated material clones, and safe GPU memory release.
