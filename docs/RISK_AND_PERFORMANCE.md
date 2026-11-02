# Brawl Wars - Risk Register & Performance Budget Matrix

**Document Version:** 1.0  
**Phase:** Phase 0 (Planning & Discovery)  
**Status:** Approved  
**Related Documents:** [MASTER_PRODUCTION_BLUEPRINT.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/MASTER_PRODUCTION_BLUEPRINT.md) | [TECHNICAL_ARCHITECTURE.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/TECHNICAL_ARCHITECTURE.md)

---

## 1. Technical Risk Register

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Mobile WebGL performance drops below 30 FPS on low-tier mobile devices | High | Medium | Implement dynamic resolution scaling (`0.75x` - `1.0x`), disable real-time shadows on mobile tier, cap particle count, and bake ambient lighting. |
| **RSK-02** | Skeletal animation playback causes CPU garbage collection pauses | High | Low | Pool all animation mixer updates and keyframe vector/quaternion allocations. Pre-allocate animation tracks at load time; zero runtime allocations in `update()`. |
| **RSK-03** | 3D hit registration feels sluggish or inconsistent due to depth mismatches | High | Medium | Use capsule-to-capsule or box-to-box volume intersection algorithms with forgiving Z-depth tolerance (`±1.2m` window) so attacks connect naturally. |
| **RSK-04** | Touchscreen controls register false positive gestures or context menus | Medium | Medium | Apply `touch-action: none; user-select: none; -webkit-touch-callout: none;` on all UI overlays. Use pointer capture API. |
| **RSK-05** | Memory leak from switching between game modes and arenas | High | Medium | Enforce strict scene disposal lifecycle: traverse and call `.dispose()` on all geometries, materials, and textures when changing scenes. |
| **RSK-06** | Audio latency on iOS Safari / Web Audio initial click policy | Medium | High | Web Audio Context unlocked on first user tap/click on the title screen with a silent 1-sample buffer playback. |

---

## 2. Quantitative Performance Budget Matrix

| Category | Desktop (Target: 60 FPS) | Mobile (Target: 30-60 FPS) | Measurement Method |
| :--- | :--- | :--- | :--- |
| **Framerate** | 60 FPS (16.6ms frame budget) | 30 - 60 FPS (16-33ms frame) | In-engine FPS counter & Chrome DevTools |
| **Draw Calls per Frame** | $\le 75$ calls | $\le 40$ calls | `renderer.info.render.calls` |
| **Triangles per Scene** | $\le 65,000$ tris | $\le 30,000$ tris | `renderer.info.render.triangles` |
| **Fighter Triangle Budget**| 5,500 tris per character | 3,500 tris per character | Mesh poly count audit |
| **Arena Triangle Budget**  | 25,000 tris total | 12,000 tris total | Mesh poly count audit |
| **Texture VRAM Budget**   | $\le 120$ MB total | $\le 60$ MB total | GPU memory profiler |
| **JavaScript Heap Memory**| $\le 180$ MB | $\le 100$ MB | `performance.memory.usedJSHeapSize` |
| **Time to First Playable**| $\le 2.0$ seconds | $\le 3.5$ seconds | `performance.now()` from app boot to menu |

---

## 3. Continuous Profiling & Quality Gates

To prevent performance degradation during production:
1. Every commit must pass unit tests and bundle size checks.
2. In-game performance monitor overlay (`F3` key toggle) displays:
   - FPS & Frame Time (ms)
   - Draw calls
   - Geometries & Textures in VRAM
   - JS Heap memory
3. Automated test script verifies zero memory leaks across 10 repeated match load/unload cycles.
