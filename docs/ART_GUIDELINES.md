# Brawl Wars - Anime Art Direction & Visual Style Guide

**Document Version:** 1.0  
**Phase:** Phase 0 (Planning & Discovery)  
**Status:** Approved  
**Related Documents:** [MASTER_PRODUCTION_BLUEPRINT.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/MASTER_PRODUCTION_BLUEPRINT.md) | [TECHNICAL_ARCHITECTURE.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/TECHNICAL_ARCHITECTURE.md)

---

## 1. Core Visual Pillar: Anime Fighting Aesthetic

Brawl Wars blends clean anime character proportions, dynamic cel-shading, high-contrast silhouette separation, and vibrant emissive cyberpunk/neon accents. 

### Key Visual Tenets:
1. **Bold Silhouette Readability:** Every fighter and stage prop must have an unmistakable outline readable in under 100ms from wide arena camera angles.
2. **Cel-Shaded Lighting:** Lighting breaks into 2 or 3 distinct color bands (lit, halftone shadow, ambient shadow) rather than soft muddy gradients.
3. **Inverted Hull Outlines:** Models feature crisp dark ink lines on character boundaries that scale inversely with distance to maintain consistent stroke weight.
4. **Emissive Energy Trims:** Neon edges, energy auras, cybernetic joints, and special attack trails cut through dark environments with high luminosity.
5. **No Visual Noise:** Ground textures and background architecture use clean geometric paneling, avoiding muddy noise that obscures fighter feet and shadows.

---

## 2. Character Anatomy & Modeling Proportions

All fighters share a standardized anime proportion scale to ensure consistent hitbox volume, rigging retargeting, and camera framing.

| Feature | Standard Proportion | Notes |
| :--- | :--- | :--- |
| **Total Height** | 1.80m ± 0.15m | 7.5 to 8.0 heads tall (heroic anime standard) |
| **Head Proportion** | Slightly exaggerated (1.1x human) | Ensures facial features and hair silhouettes register on mobile |
| **Torso / Legs Ratio** | 40% torso / 60% legs | Stylized leg length accentuates kicks and ground dashes |
| **Hands / Feet** | 1.15x human scale | Highlights punches, kicks, and guard stances |
| **Hair Silhouettes** | Segmented polygonal clumps | Bold geometric chunks rather than individual alpha hair strands |
| **Poly Budget per Fighter** | 3,500 - 6,000 Triangles | Optimized for mobile WebGL with zero skeletal deformation lag |

---

## 3. Shading & Material Pipeline

### 3.1 Two-Tone Cel-Shading Shader
Materials use a custom Three.js `MeshToonMaterial` or GLSL cel-shading chunk:
- **Direct Lit Band:** 100% diffuse texture albedo.
- **Shadow Band:** Multiplied by 0.58 with a slight cool tint (Hex `#1b1f38` tint) to simulate anime ambient atmospheric bounce.
- **Threshold Step:** Smoothstep across a 0.04 window at $\vec{N} \cdot \vec{L} = 0.28$ to avoid pixelated stepping artifacts.

### 3.2 Inverted Hull Outlines
- Outlines are generated via an extruded back-facing hull with vertex displacement along normals:
  $$\vec{P}_{\text{outline}} = \vec{P} + \vec{N} \times \text{width}$$
- Stroke color: Dark Navy/Charcoal `#10121a` (never pure `#000000` to prevent harsh visual clipping).
- Stroke width: 0.018 world units on desktop, scaled dynamically with camera distance.

### 3.3 Emissive Accents
- Neon strips on armor, weapons, and eyes use `emissiveIntensity = 2.2` with bloom threshold compatibility.

---

## 4. Color Palettes by Fighter & Arena

### Fighter Color Identities:
1. **Atlas (Balanced):**
   - Primary: Cobalt Blue (`#0066FF`), Crisp White (`#F0F4F8`)
   - Accent: Radiant Cyan (`#00E5FF`), Gunmetal Gray (`#2A2F3D`)
2. **Volt (Speed / Agility):**
   - Primary: Electric Yellow (`#FFD700`), Midnight Black (`#12131A`)
   - Accent: Plasma Lime (`#A6FF00`), Chrome Silver (`#C5CAD6`)
3. **Blaze (Power / Brawler):**
   - Primary: Crimson Scarlet (`#FF2A4D`), Obsidian Charcoal (`#1E1E24`)
   - Accent: Solar Flare Amber (`#FF8C00`), Burnished Copper (`#B3541E`)
4. **Cipher (Technical / Zoning):**
   - Primary: Phantom Violet (`#8A2BE2`), Deep Slate (`#1A1726`)
   - Accent: Holographic Magenta (`#FF007F`), Ice Silver (`#D6E2E8`)

### Neon District Arena Palette:
- **Base Ground:** Wet Asphalt (`#141721`), Metallic Steel Grid (`#252C3E`)
- **Neon Glows:** Cyberpunk Cyan (`#00F0FF`), Hot Pink (`#FF0055`), Amber Gold (`#FFAA00`)
- **Atmospheric Skybox:** Deep Twilight Gradient (`#080914` to `#181130`) with distant holographic billboard projections.

---

## 5. Visual Feedback & Combat FX (VFX)

Impact clarity dictates fighting game quality:
1. **Hit Sparks:** 
   - Light hit: 3-5 sharp diamond particles bursting along contact tangent.
   - Heavy hit: Starburst 8-point shockwave ring expanding outward over 120ms.
   - Block: Geometric hexagonal shield flash in front of the defender.
2. **Motion Trails:** 
   - Sword / punch arcs spawn translucent planar ribbon meshes that fade over 80ms.
3. **Hit-Stop (Camera Freeze):**
   - Light attacks: 3 frames (50ms).
   - Heavy attacks / Launchers: 6 frames (100ms).
   - Special Finishers: 12 frames (200ms) with brief directional camera punch.
4. **Floating Combat Text:**
   - Damage numbers pop with spring physics, color-coded by hit type (Yellow for standard, Orange for counter-hit, Blue for blocked).

---

## 6. UI & HUD Aesthetics

- **Typography:** Bold condensed sans-serif with italicized slant (`Teko`, `Orbitron`, `Montserrat 900`).
- **HUD Layout:** Asymmetric top bars with angled health depletion bars that flash white before decaying red.
- **Button Styling:** High-tech angled chamfers with glowing cyan borders and active state tactile squash.

