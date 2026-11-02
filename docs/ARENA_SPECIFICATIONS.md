# Brawl Wars - Neon District Arena Specification

**Document Version:** 1.0  
**Phase:** Phase 0 (Planning & Discovery)  
**Status:** Approved  
**Related Documents:** [MASTER_PRODUCTION_BLUEPRINT.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/MASTER_PRODUCTION_BLUEPRINT.md) | [TECHNICAL_ARCHITECTURE.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/TECHNICAL_ARCHITECTURE.md)

---

## 1. Concept & Visual Identity

**Neon District** is a high-altitude fighting stage situated on the reinforced helipad rooftop of a neo-metropolitan skyscraper.

- **Theme:** Cyberpunk Tokyo / Neo-Shinjuku night skyline.
- **Mood:** Vibrant, high-contrast, electric, dramatic.
- **Atmosphere:** Wet reflective rooftop surface, distant neon holograms, passing flying vehicles in the deep background, and gentle purple/cyan volumetric fog.

---

## 2. Platform Dimensions & Boundaries

The combat arena is a clearly bounded rectangular fighting surface:

```
  -X Wall (-14m)                                        +X Wall (+14m)
      |                                                      |
   ---+------------------------------------------------------+---  -Z Boundary (-6m)
      |                                                      |
      |             Fighter 1             Fighter 2          |
      |             Spawn (-5m, 0, 0)     Spawn (+5m, 0, 0)  |
      |                                                      |
      |                        [ (0,0,0) ]                   |
      |                         Platform                     |
      |                                                      |
   ---+------------------------------------------------------+---  +Z Boundary (+6m)
      |                                                      |
      <-------------------- 28.0 meters --------------------->
                                (Depth: 12.0m)
```

- **X-Axis (Width):** `28.0m` (Bounds: `-14.0m` to `+14.0m`)
- **Z-Axis (Depth):** `12.0m` (Bounds: `-6.0m` to `+6.0m`)
- **Y-Axis (Height Boundary):** Ground at `Y = 0.0m`, ceiling limit at `Y = 8.5m`.
- **Wall Bounce Mechanics:**
  - When a fighter is launched into the X bounds with high horizontal momentum, they trigger a **Wall Bounce**:
    - Takes 40 bounce impact damage.
    - Rebounds 2.5m into the arena, remaining jugglable for 400ms.

---

## 3. Lighting & Atmosphere Configuration

To achieve the anime-toon aesthetic without tanking mobile performance:

1. **Key Directional Light (Moonlight / City Glare):**
   - Direction: `Vector3(-15, 25, 12)`
   - Color: Cool Pale Cyan (`#D0E8FF`)
   - Intensity: `1.8`
   - Shadow Map: `1024x1024` on desktop, `512x512` on mobile, filtered with PCFSoft.
2. **Fill Directional Light:**
   - Direction: `Vector3(12, 10, -10)`
   - Color: Deep Magenta / Violet (`#4A154B`)
   - Intensity: `0.7`
   - Shadows: Disabled (pure diffuse fill to simulate neon ambient reflections).
3. **Stage Accent Point Lights:**
   - Left Neon Pillar: Color `#00F0FF`, Range: `9.0m`, Intensity: `2.0`.
   - Right Neon Pillar: Color `#FF0055`, Range: `9.0m`, Intensity: `2.0`.
4. **Environment Sky & Fog:**
   - Three.js `FogExp2(0x0a0c18, 0.018)` blending distant skyscrapers into a dark gradient.

---

## 4. Stage Assets & Modular Geometry

| Asset Component | Description | Budget / Details |
| :--- | :--- | :--- |
| **Roof Platform** | Beveled octagonal steel deck with yellow warning perimeter lines and central energy ring | 1,200 Triangles |
| **Safety Barriers** | Glowing cybernetic laser railings along the platform edge | 600 Triangles |
| **Left Generator** | Industrial power transformer with pulsing electric coils | 850 Triangles |
| **Right HVAC Tower** | Multi-level ventilation turbine with slowly rotating cooling fan | 950 Triangles |
| **Background City** | 12 low-poly skyline building silhouettes with animated neon window textures | 4,500 Triangles |
| **Holographic Signs** | 3 floating Kanji/cyber advertisements hovering in the far background | 200 Triangles |
| **Total Arena Budget** | **~8,300 Triangles** (Well below the 35,000 mobile budget) |

---

## 5. Camera Tracking Boundaries

The camera system respects hard containment limits to prevent clipping through background structures:
- Camera X Position clamped: `[-8.0m, +8.0m]`
- Camera Y Position clamped: `[2.5m, 6.0m]`
- Camera Z Distance clamped: `[7.0m, 14.5m]`
- Camera LookAt Y offset: `1.2m` (targets fighter chest height)
